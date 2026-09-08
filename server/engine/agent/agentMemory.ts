import crypto from 'crypto';
import { db } from '../../db/database.js';

/**
 * AgentMemory — Persistent memory system for the autonomous SEO agent.
 * 
 * Remembers:
 * - Previous audit results and scores (audit history)
 * - Fix outcomes (which fixes succeeded/failed/were rolled back)
 * - User-rejected or ignored fixes (so agent doesn't re-suggest them)
 * - Learned policies and preferences
 * - Known intentional configurations (things the user said "leave as-is")
 * - Website architecture understanding (CMS, templates, important pages)
 */

export interface MemoryEntry {
  id: string;
  projectId: string;
  memoryType: MemoryType;
  key: string;
  value: string;
  metadata?: Record<string, any>;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export type MemoryType =
  | 'AUDIT_SNAPSHOT'       // Historical audit scores
  | 'FIX_OUTCOME'          // What happened when a fix was applied
  | 'REJECTED_FIX'         // User rejected this fix — don't re-suggest
  | 'IGNORED_ISSUE'        // User marked issue as intentional
  | 'LEARNED_POLICY'       // Agent learned a user preference
  | 'SITE_ARCHITECTURE'    // CMS, templates, important pages
  | 'KNOWN_CONFIG'         // Intentional configuration (e.g. noindex on staging)
  | 'STRATEGY_NOTE'        // Strategic decision or observation
  | 'FAILED_APPROACH';     // Something that was tried and failed

export class AgentMemory {
  // ==========================================
  // REMEMBER — Store a new memory
  // ==========================================
  public static remember(
    projectId: string,
    type: MemoryType,
    key: string,
    value: string,
    metadata?: Record<string, any>,
    confidence: number = 90,
    ttlHours?: number
  ): MemoryEntry {
    const existing = this.recall(projectId, type, key);

    const entry: MemoryEntry = {
      id: existing?.id || crypto.randomUUID(),
      projectId,
      memoryType: type,
      key,
      value,
      metadata: metadata || {},
      confidence,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: ttlHours
        ? new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
        : undefined
    };

    // Upsert: if exists, update; if not, insert
    if (existing) {
      db.update('agent_memory', entry.id, entry);
    } else {
      db.insert('agent_memory', entry);
    }

    return entry;
  }

  // ==========================================
  // RECALL — Retrieve a specific memory
  // ==========================================
  public static recall(
    projectId: string,
    type: MemoryType,
    key: string
  ): MemoryEntry | null {
    const memories = db.find('agent_memory', { projectId, memoryType: type, key });
    if (memories.length === 0) return null;

    const mem = memories[0] as MemoryEntry;

    // Check expiration
    if (mem.expiresAt && new Date(mem.expiresAt) < new Date()) {
      db.delete('agent_memory', mem.id);
      return null;
    }

    return mem;
  }

  // ==========================================
  // RECALL ALL — Get all memories of a type
  // ==========================================
  public static recallAll(
    projectId: string,
    type?: MemoryType
  ): MemoryEntry[] {
    const filter: Record<string, any> = { projectId };
    if (type) filter.memoryType = type;

    const memories = db.find('agent_memory', filter) as MemoryEntry[];

    // Filter out expired entries
    const now = new Date();
    return memories.filter(m => {
      if (m.expiresAt && new Date(m.expiresAt) < now) {
        db.delete('agent_memory', m.id);
        return false;
      }
      return true;
    });
  }

  // ==========================================
  // FORGET — Remove a specific memory
  // ==========================================
  public static forget(
    projectId: string,
    type: MemoryType,
    key: string
  ): boolean {
    const mem = this.recall(projectId, type, key);
    if (mem) {
      db.delete('agent_memory', mem.id);
      return true;
    }
    return false;
  }

  // ==========================================
  // SHOULD SKIP ISSUE — Check if agent should skip an issue
  // ==========================================
  public static shouldSkipIssue(projectId: string, ruleId: string, url?: string): boolean {
    // Check if the user rejected this fix before
    const rejectedKey = url ? `${ruleId}::${url}` : ruleId;
    const rejected = this.recall(projectId, 'REJECTED_FIX', rejectedKey);
    if (rejected) return true;

    // Check if the user marked this issue as intentional
    const ignored = this.recall(projectId, 'IGNORED_ISSUE', rejectedKey);
    if (ignored) return true;

    return false;
  }

  // ==========================================
  // RECORD FIX OUTCOME — Remember what happened
  // ==========================================
  public static recordFixOutcome(
    projectId: string,
    ruleId: string,
    targetPath: string,
    outcome: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK',
    details: string
  ): void {
    this.remember(
      projectId,
      'FIX_OUTCOME',
      `${ruleId}::${targetPath}`,
      outcome,
      { details, ruleId, targetPath, timestamp: new Date().toISOString() },
      outcome === 'SUCCESS' ? 95 : 80
    );
  }

  // ==========================================
  // RECORD AUDIT SNAPSHOT — Save historical score
  // ==========================================
  public static recordAuditSnapshot(
    projectId: string,
    overallScore: number,
    totalIssues: number,
    fixedIssues: number,
    crawledPages: number
  ): void {
    const snapshotKey = `audit_${new Date().toISOString().split('T')[0]}`;
    this.remember(
      projectId,
      'AUDIT_SNAPSHOT',
      snapshotKey,
      JSON.stringify({ overallScore, totalIssues, fixedIssues, crawledPages }),
      { overallScore, totalIssues, fixedIssues, crawledPages },
      100
    );
  }

  // ==========================================
  // GET AUDIT HISTORY — Retrieve score trend
  // ==========================================
  public static getAuditHistory(projectId: string): Array<{
    date: string;
    overallScore: number;
    totalIssues: number;
    fixedIssues: number;
    crawledPages: number;
  }> {
    const snapshots = this.recallAll(projectId, 'AUDIT_SNAPSHOT');
    return snapshots
      .map(s => {
        try {
          const data = JSON.parse(s.value);
          return {
            date: s.updatedAt,
            overallScore: data.overallScore,
            totalIssues: data.totalIssues,
            fixedIssues: data.fixedIssues,
            crawledPages: data.crawledPages
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime()) as any[];
  }

  // ==========================================
  // GET FAILED APPROACHES — What didn't work
  // ==========================================
  public static getFailedApproaches(projectId: string, ruleId: string): MemoryEntry[] {
    return this.recallAll(projectId, 'FAILED_APPROACH')
      .filter(m => m.key.startsWith(ruleId));
  }

  // ==========================================
  // LEARN POLICY — Store a user preference
  // ==========================================
  public static learnPolicy(
    projectId: string,
    policyKey: string,
    policyValue: string
  ): void {
    this.remember(projectId, 'LEARNED_POLICY', policyKey, policyValue, {}, 100);
  }

  // ==========================================
  // GET POLICY — Retrieve a learned preference
  // ==========================================
  public static getPolicy(projectId: string, policyKey: string): string | null {
    const mem = this.recall(projectId, 'LEARNED_POLICY', policyKey);
    return mem ? mem.value : null;
  }

  // ==========================================
  // STORE SITE ARCHITECTURE — Remember site structure
  // ==========================================
  public static storeSiteArchitecture(
    projectId: string,
    key: string,
    data: Record<string, any>
  ): void {
    this.remember(projectId, 'SITE_ARCHITECTURE', key, JSON.stringify(data), data, 95, 24 * 30); // 30 day TTL
  }

  // ==========================================
  // SUMMARY — Get memory summary for project
  // ==========================================
  public static getSummary(projectId: string): {
    totalMemories: number;
    byType: Record<string, number>;
    auditSnapshots: number;
    fixOutcomes: { success: number; failed: number; rolledBack: number };
    rejectedFixes: number;
    ignoredIssues: number;
    learnedPolicies: number;
  } {
    const all = this.recallAll(projectId);
    const byType: Record<string, number> = {};

    for (const m of all) {
      byType[m.memoryType] = (byType[m.memoryType] || 0) + 1;
    }

    const fixOutcomes = all.filter(m => m.memoryType === 'FIX_OUTCOME');

    return {
      totalMemories: all.length,
      byType,
      auditSnapshots: byType['AUDIT_SNAPSHOT'] || 0,
      fixOutcomes: {
        success: fixOutcomes.filter(f => f.value === 'SUCCESS').length,
        failed: fixOutcomes.filter(f => f.value === 'FAILED').length,
        rolledBack: fixOutcomes.filter(f => f.value === 'ROLLED_BACK').length
      },
      rejectedFixes: byType['REJECTED_FIX'] || 0,
      ignoredIssues: byType['IGNORED_ISSUE'] || 0,
      learnedPolicies: byType['LEARNED_POLICY'] || 0
    };
  }
}
