import crypto from 'crypto';
import { db } from '../../db/database.js';
import { IssueCategory, IssueSeverity } from '../../types/index.js';

/**
 * SEO Task Queue — Persistent prioritized task queue for the autonomous agent.
 * 
 * Every SEO action the agent can take is modeled as a Task with:
 * - Clear lifecycle states
 * - Priority scoring based on impact, confidence, and risk
 * - Tracking of execution time, outcomes, and verification
 */

export type TaskState =
  | 'DISCOVERED'
  | 'ANALYZING'
  | 'PLANNED'
  | 'APPROVED'
  | 'QUEUED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'BLOCKED'
  | 'MANUAL_REQUIRED'
  | 'REJECTED';

export type TaskType =
  | 'TECHNICAL_FIX'       // Fix a technical SEO issue
  | 'METADATA_FIX'        // Fix title/description/canonical
  | 'CONTENT_OPTIMIZATION' // Optimize page content
  | 'INTERNAL_LINKING'    // Add/fix internal links
  | 'SCHEMA_FIX'          // Fix/add structured data
  | 'IMAGE_OPTIMIZATION'  // Fix image attributes
  | 'REDIRECT_FIX'        // Fix redirect issues
  | 'SITEMAP_FIX'         // Fix sitemap issues
  | 'ROBOTS_FIX'          // Fix robots.txt issues
  | 'PERFORMANCE_FIX'     // Fix performance issues
  | 'SECURITY_FIX'        // Fix security-related SEO issues
  | 'CONTENT_CREATION'    // Create new content
  | 'KEYWORD_MAPPING'     // Map keywords to pages
  | 'AUDIT'               // Run audit/re-audit
  | 'MONITORING';         // Health monitoring check

export interface SeoTask {
  id: string;
  projectId: string;
  issueId?: string;         // Link to SeoIssue if applicable
  fixPlanId?: string;       // Link to FixPlan if applicable
  taskType: TaskType;
  state: TaskState;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;

  // Priority scoring
  seoImpactScore: number;     // 0-100: How much does this affect SEO?
  businessImpactScore: number; // 0-100: How much does this affect the business?
  confidenceScore: number;     // 0-100: How confident are we in the fix?
  riskScore: number;           // 0-100: How risky is this change?
  priorityScore: number;       // Calculated composite score

  // Execution metadata
  affectedUrls: string[];
  affectedCount: number;
  rootCause?: string;
  isAutoExecutable: boolean;
  requiresApproval: boolean;

  // Tracking
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  executionTimeMs?: number;
  verificationResult?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class TaskQueue {
  // ==========================================
  // PRIORITY CALCULATION
  // ==========================================
  private static calculatePriority(
    seoImpact: number,
    businessImpact: number,
    confidence: number,
    risk: number
  ): number {
    // Formula: (SEO Impact × 0.35 + Business Impact × 0.25 + Confidence × 0.25) × (1 - Risk × 0.15)
    const impactScore = (seoImpact * 0.35) + (businessImpact * 0.25) + (confidence * 0.25);
    const riskPenalty = 1 - (risk * 0.0015);
    return Math.round(Math.max(0, Math.min(100, impactScore * riskPenalty)));
  }

  // ==========================================
  // CREATE TASK — Add a new task to the queue
  // ==========================================
  public static createTask(params: {
    projectId: string;
    issueId?: string;
    fixPlanId?: string;
    taskType: TaskType;
    title: string;
    description: string;
    category: IssueCategory;
    severity: IssueSeverity;
    seoImpactScore: number;
    businessImpactScore: number;
    confidenceScore: number;
    riskScore: number;
    affectedUrls: string[];
    rootCause?: string;
    isAutoExecutable: boolean;
    requiresApproval?: boolean;
  }): SeoTask {
    const priorityScore = this.calculatePriority(
      params.seoImpactScore,
      params.businessImpactScore,
      params.confidenceScore,
      params.riskScore
    );

    const task: SeoTask = {
      id: crypto.randomUUID(),
      projectId: params.projectId,
      issueId: params.issueId,
      fixPlanId: params.fixPlanId,
      taskType: params.taskType,
      state: 'DISCOVERED',
      title: params.title,
      description: params.description,
      category: params.category,
      severity: params.severity,
      seoImpactScore: params.seoImpactScore,
      businessImpactScore: params.businessImpactScore,
      confidenceScore: params.confidenceScore,
      riskScore: params.riskScore,
      priorityScore,
      affectedUrls: params.affectedUrls,
      affectedCount: params.affectedUrls.length,
      rootCause: params.rootCause,
      isAutoExecutable: params.isAutoExecutable,
      requiresApproval: params.requiresApproval ?? !params.isAutoExecutable,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.insert('seo_tasks', task);
    return task;
  }

  // ==========================================
  // TRANSITION STATE — Move task through lifecycle
  // ==========================================
  public static transitionState(
    taskId: string,
    newState: TaskState,
    details?: { error?: string; executionTimeMs?: number; verificationResult?: string }
  ): SeoTask | null {
    const task = db.findById('seo_tasks', taskId) as SeoTask | null;
    if (!task) return null;

    const updates: Partial<SeoTask> = {
      state: newState,
      updatedAt: new Date().toISOString()
    };

    if (newState === 'EXECUTING') {
      updates.startedAt = new Date().toISOString();
      updates.attemptCount = (task.attemptCount || 0) + 1;
      updates.lastAttemptAt = new Date().toISOString();
    }

    if (newState === 'COMPLETED' || newState === 'FAILED' || newState === 'ROLLED_BACK') {
      updates.completedAt = new Date().toISOString();
    }

    if (details?.error) {
      updates.lastError = details.error;
    }
    if (details?.executionTimeMs !== undefined) {
      updates.executionTimeMs = details.executionTimeMs;
    }
    if (details?.verificationResult) {
      updates.verificationResult = details.verificationResult;
    }

    db.update('seo_tasks', taskId, updates);
    return { ...task, ...updates };
  }

  // ==========================================
  // GET NEXT — Get the highest-priority executable task
  // ==========================================
  public static getNextTask(projectId: string): SeoTask | null {
    const allTasks = this.getQueue(projectId);
    const executable = allTasks.filter(t =>
      (t.state === 'APPROVED' || t.state === 'QUEUED') &&
      t.isAutoExecutable &&
      t.attemptCount < 3
    );

    if (executable.length === 0) return null;
    return executable[0]; // Already sorted by priority
  }

  // ==========================================
  // GET QUEUE — Get all tasks sorted by priority
  // ==========================================
  public static getQueue(projectId: string): SeoTask[] {
    const tasks = db.find('seo_tasks', { projectId }) as SeoTask[];

    // Sort: by state priority (active first), then by priority score descending
    const stateOrder: Record<string, number> = {
      'EXECUTING': 0,
      'VERIFYING': 1,
      'APPROVED': 2,
      'QUEUED': 3,
      'PLANNED': 4,
      'ANALYZING': 5,
      'DISCOVERED': 6,
      'MANUAL_REQUIRED': 7,
      'BLOCKED': 8,
      'COMPLETED': 9,
      'FAILED': 10,
      'ROLLED_BACK': 11,
      'REJECTED': 12
    };

    return tasks.sort((a, b) => {
      const stateA = stateOrder[a.state] ?? 99;
      const stateB = stateOrder[b.state] ?? 99;
      if (stateA !== stateB) return stateA - stateB;
      return b.priorityScore - a.priorityScore;
    });
  }

  // ==========================================
  // GET STATS — Queue statistics
  // ==========================================
  public static getStats(projectId: string): {
    total: number;
    byState: Record<string, number>;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    completed: number;
    failed: number;
    pending: number;
    autoExecutable: number;
    manualRequired: number;
    avgPriority: number;
  } {
    const tasks = db.find('seo_tasks', { projectId }) as SeoTask[];

    const byState: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalPriority = 0;

    for (const t of tasks) {
      byState[t.state] = (byState[t.state] || 0) + 1;
      bySeverity[t.severity] = (bySeverity[t.severity] || 0) + 1;
      byType[t.taskType] = (byType[t.taskType] || 0) + 1;
      totalPriority += t.priorityScore;
    }

    const active = ['DISCOVERED', 'ANALYZING', 'PLANNED', 'APPROVED', 'QUEUED', 'EXECUTING', 'VERIFYING'];

    return {
      total: tasks.length,
      byState,
      bySeverity,
      byType,
      completed: byState['COMPLETED'] || 0,
      failed: (byState['FAILED'] || 0) + (byState['ROLLED_BACK'] || 0),
      pending: tasks.filter(t => active.includes(t.state)).length,
      autoExecutable: tasks.filter(t => t.isAutoExecutable && active.includes(t.state)).length,
      manualRequired: byState['MANUAL_REQUIRED'] || 0,
      avgPriority: tasks.length > 0 ? Math.round(totalPriority / tasks.length) : 0
    };
  }

  // ==========================================
  // AUTO-APPROVE — Approve high-confidence low-risk tasks
  // ==========================================
  public static autoApproveEligibleTasks(projectId: string, threshold: number = 85): number {
    const tasks = db.find('seo_tasks', { projectId }) as SeoTask[];
    let approved = 0;

    for (const task of tasks) {
      if (
        task.state === 'PLANNED' &&
        task.isAutoExecutable &&
        !task.requiresApproval &&
        task.confidenceScore >= threshold &&
        task.riskScore <= 20
      ) {
        this.transitionState(task.id, 'APPROVED');
        approved++;
      }
    }

    return approved;
  }

  // ==========================================
  // CLEAR COMPLETED — Remove completed tasks older than N days
  // ==========================================
  public static clearCompleted(projectId: string, olderThanDays: number = 30): number {
    const tasks = db.find('seo_tasks', { projectId }) as SeoTask[];
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let cleared = 0;

    for (const task of tasks) {
      if (
        task.state === 'COMPLETED' &&
        task.completedAt &&
        new Date(task.completedAt) < cutoff
      ) {
        db.delete('seo_tasks', task.id);
        cleared++;
      }
    }

    return cleared;
  }
}
