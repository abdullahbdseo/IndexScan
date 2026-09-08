import crypto from 'crypto';
import { FixPlan, Project, AppliedFix, ConnectionConfig } from '../../types/index.js';
import { AdapterFactory } from '../../adapters/adapterFactory.js';
import { SafetyGuard } from './safetyGuard.js';
import { db } from '../../db/database.js';

export interface FixExecutionResult {
  success: boolean;
  appliedFix?: AppliedFix;
  error?: string;
}

export class AutoFixEngine {
  public static async executeFix(
    plan: FixPlan,
    project: Project,
    connectionConfig?: ConnectionConfig
  ): Promise<FixExecutionResult> {
    // 1. Run Safety Guard validation
    const safety = SafetyGuard.validate(plan, project);
    if (!safety.isSafe) {
      db.update('seo_issues', plan.issueId, { status: 'MANUAL_REQUIRED' });
      return {
        success: false,
        error: `Safety check rejected fix: ${safety.reasons.join('; ')}`
      };
    }

    // 2. Select appropriate connection adapter
    const adapterType = connectionConfig?.adapterType || 'local_fs';
    const adapter = AdapterFactory.getAdapter(adapterType);

    const activeConfig: ConnectionConfig = connectionConfig || {
      id: 'default-local',
      projectId: project.id,
      adapterType: 'local_fs',
      baseDirectory: process.cwd(),
      isActive: true
    };

    try {
      db.update('seo_issues', plan.issueId, { status: 'FIXING' });

      // Read current file content to apply precise string/regex replacement if needed
      let targetContent = '';
      try {
        targetContent = await adapter.readTarget(activeConfig, plan.targetPath);
      } catch {
        targetContent = plan.beforeContent;
      }

      let updatedContent = targetContent;
      if (targetContent.includes(plan.beforeContent)) {
        updatedContent = targetContent.replace(plan.beforeContent, plan.afterContent);
      } else {
        updatedContent = plan.afterContent;
      }

      // Apply fix via adapter
      const modResult = await adapter.applyFix(activeConfig, {
        targetPath: plan.targetPath,
        beforeContent: targetContent,
        afterContent: updatedContent,
        diffSummary: plan.diffSummary,
        selectorOrField: plan.selectorOrField
      });

      if (!modResult.success) {
        db.update('seo_issues', plan.issueId, { status: 'MANUAL_REQUIRED' });
        return { success: false, error: modResult.error || modResult.message };
      }

      const appliedFix: AppliedFix = {
        id: crypto.randomUUID(),
        fixPlanId: plan.id,
        issueId: plan.issueId,
        projectId: project.id,
        adapterType,
        backupId: modResult.backupId,
        appliedContentHash: modResult.contentHash,
        appliedAt: new Date().toISOString(),
        status: 'APPLIED',
        executionLog: modResult.message
      };

      db.insert('applied_fixes', appliedFix);

      db.update('seo_issues', plan.issueId, { status: 'VERIFYING' });
      db.update('issue_instances', plan.issueId, { status: 'VERIFYING' });

      // Record in audit log
      db.insert('audit_logs', {
        id: crypto.randomUUID(),
        projectId: project.id,
        action: 'APPLY_AUTO_FIX',
        category: 'AUTO_FIX',
        details: `Applied fix [${plan.ruleId}] to ${plan.targetPath}: ${plan.diffSummary}`,
        severity: 'INFO',
        timestamp: new Date().toISOString()
      });

      return { success: true, appliedFix };
    } catch (err) {
      db.update('seo_issues', plan.issueId, { status: 'MANUAL_REQUIRED' });
      return { success: false, error: (err as Error).message };
    }
  }
}
