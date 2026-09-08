import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { WebsiteAccessProvider, FileModificationPayload, ModificationResult } from './WebsiteAccessProvider.js';
import { ConnectionConfig, BackupSnapshot } from '../types/index.js';
import { db } from '../db/database.js';

export class LocalFsAdapter implements WebsiteAccessProvider {
  public adapterType = 'local_fs';

  private resolvePath(baseDir: string | undefined, targetPath: string): string {
    const root = baseDir ? path.resolve(baseDir) : path.resolve(process.cwd(), 'server/sandbox/site');
    const cleanTarget = targetPath.replace(/^[/\\]+/, '');
    const resolved = path.resolve(root, cleanTarget);
    
    // Protect ApexSEO platform files from accidental mutation
    const appRoot = process.cwd();
    if (
      resolved === path.join(appRoot, 'index.html') ||
      resolved.startsWith(path.join(appRoot, 'client')) ||
      (resolved.startsWith(path.join(appRoot, 'server')) && !resolved.startsWith(path.join(appRoot, 'server', 'sandbox', 'site')))
    ) {
      throw new Error(`Security Violation: Cannot modify platform source file: ${resolved}`);
    }

    if (!resolved.startsWith(root)) {
      throw new Error(`Security Violation: Path traversal detected outside root ${root}`);
    }
    return resolved;
  }

  public async authenticate(config: ConnectionConfig): Promise<{ success: boolean; message: string }> {
    try {
      const root = config.baseDirectory ? path.resolve(config.baseDirectory) : process.cwd();
      if (!fs.existsSync(root)) {
        return { success: false, message: `Directory does not exist: ${root}` };
      }
      return { success: true, message: `Successfully connected to local path: ${root}` };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  public async verifyPermissions(config: ConnectionConfig): Promise<{ canRead: boolean; canWrite: boolean; message: string }> {
    try {
      const root = config.baseDirectory ? path.resolve(config.baseDirectory) : process.cwd();
      fs.accessSync(root, fs.constants.R_OK | fs.constants.W_OK);
      return { canRead: true, canWrite: true, message: 'Read and write permissions confirmed.' };
    } catch (err) {
      return { canRead: false, canWrite: false, message: `Permission error: ${(err as Error).message}` };
    }
  }

  public async createSnapshot(config: ConnectionConfig, targetPath: string): Promise<BackupSnapshot> {
    const fullPath = this.resolvePath(config.baseDirectory, targetPath);
    let originalContent = '';
    if (fs.existsSync(fullPath)) {
      originalContent = fs.readFileSync(fullPath, 'utf-8');
    }
    const contentHash = crypto.createHash('sha256').update(originalContent).digest('hex');
    const snapshot: BackupSnapshot = {
      id: crypto.randomUUID(),
      projectId: config.projectId,
      targetPath,
      originalContent,
      contentHash,
      createdAt: new Date().toISOString(),
      isRestored: false
    };
    db.insert('backup_snapshots', snapshot);
    return snapshot;
  }

  public async readTarget(config: ConnectionConfig, targetPath: string): Promise<string> {
    const fullPath = this.resolvePath(config.baseDirectory, targetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Target file not found: ${targetPath}`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  public async applyFix(config: ConnectionConfig, modification: FileModificationPayload): Promise<ModificationResult> {
    try {
      const fullPath = this.resolvePath(config.baseDirectory, modification.targetPath);
      const snapshot = await this.createSnapshot(config, modification.targetPath);
      
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, modification.afterContent, 'utf-8');
      const newHash = crypto.createHash('sha256').update(modification.afterContent).digest('hex');

      return {
        success: true,
        backupId: snapshot.id,
        contentHash: newHash,
        appliedContent: modification.afterContent,
        message: `Successfully applied fix to ${modification.targetPath}`
      };
    } catch (err) {
      return {
        success: false,
        contentHash: '',
        appliedContent: '',
        message: 'Failed to apply local file system fix',
        error: (err as Error).message
      };
    }
  }

  public async rollback(config: ConnectionConfig, backup: BackupSnapshot): Promise<{ success: boolean; message: string }> {
    try {
      const fullPath = this.resolvePath(config.baseDirectory, backup.targetPath);
      fs.writeFileSync(fullPath, backup.originalContent, 'utf-8');
      db.update('backup_snapshots', backup.id, {
        isRestored: true,
        restoredAt: new Date().toISOString()
      });
      return { success: true, message: `Rollback successful for ${backup.targetPath}` };
    } catch (err) {
      return { success: false, message: `Rollback failed: ${(err as Error).message}` };
    }
  }
}
