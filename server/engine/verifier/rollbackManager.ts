import crypto from 'crypto';
import { Project, ConnectionConfig, AppliedFix, BackupSnapshot } from '../../types/index.js';
import { AdapterFactory } from '../../adapters/adapterFactory.js';
import { db } from '../../db/database.js';

export class RollbackManager {
  public static async rollbackFix(
    fixId: string,
    project: Project,
    connectionConfig?: ConnectionConfig
  ): Promise<{ success: boolean; message: string }> {
    const fix: AppliedFix | null = db.findById('applied_fixes', fixId);
    if (!fix || !fix.backupId) {
      return { success: false, message: 'Fix or backup snapshot not found.' };
    }

    const backup: BackupSnapshot | null = db.findById('backup_snapshots', fix.backupId);
    if (!backup) {
      return { success: false, message: 'Backup snapshot missing.' };
    }

    const adapter = AdapterFactory.getAdapter(fix.adapterType);
    const activeConfig: ConnectionConfig = connectionConfig || {
      id: 'default-local',
      projectId: project.id,
      adapterType: fix.adapterType,
      baseDirectory: process.cwd(),
      isActive: true
    };

    try {
      const rollbackResult = await adapter.rollback(activeConfig, backup);
      if (rollbackResult.success) {
        db.update('applied_fixes', fixId, { status: 'ROLLED_BACK' });
        db.update('seo_issues', fix.issueId, { status: 'ROLLED_BACK' });

        const instances = db.find('issue_instances', { issueId: fix.issueId });
        for (const inst of instances) {
          db.update('issue_instances', inst.id, { status: 'ROLLED_BACK' });
        }

        db.insert('audit_logs', {
          id: crypto.randomUUID(),
          projectId: project.id,
          action: 'ROLLBACK_FIX',
          category: 'ROLLBACK',
          details: `Reverted fix ${fixId} for target ${backup.targetPath}`,
          severity: 'WARNING',
          timestamp: new Date().toISOString()
        });

        return { success: true, message: `Rollback completed for ${backup.targetPath}` };
      } else {
        return { success: false, message: rollbackResult.message };
      }
    } catch (err) {
      return { success: false, message: `Rollback exception: ${(err as Error).message}` };
    }
  }

  public static async rollbackSession(
    projectId: string,
    connectionConfig?: ConnectionConfig
  ): Promise<{ revertedCount: number; errors: string[] }> {
    const fixes: AppliedFix[] = db.find('applied_fixes', { projectId, status: 'VERIFIED' });
    let revertedCount = 0;
    const errors: string[] = [];

    const project = db.findById('projects', projectId);
    if (!project) return { revertedCount: 0, errors: ['Project not found'] };

    for (const fix of fixes) {
      const res = await this.rollbackFix(fix.id, project, connectionConfig);
      if (res.success) {
        revertedCount++;
      } else {
        errors.push(res.message);
      }
    }

    return { revertedCount, errors };
  }
}
