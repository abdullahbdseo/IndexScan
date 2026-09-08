import { BackupSnapshot, ConnectionConfig } from '../types/index.js';

export interface FileModificationPayload {
  targetPath: string;
  beforeContent: string;
  afterContent: string;
  diffSummary?: string;
  selectorOrField?: string;
}

export interface ModificationResult {
  success: boolean;
  backupId?: string;
  contentHash: string;
  appliedContent: string;
  message: string;
  error?: string;
}

export interface WebsiteAccessProvider {
  adapterType: string;
  authenticate(config: ConnectionConfig): Promise<{ success: boolean; message: string }>;
  verifyPermissions(config: ConnectionConfig): Promise<{ canRead: boolean; canWrite: boolean; message: string }>;
  createSnapshot(config: ConnectionConfig, targetPath: string): Promise<BackupSnapshot>;
  readTarget(config: ConnectionConfig, targetPath: string): Promise<string>;
  applyFix(config: ConnectionConfig, modification: FileModificationPayload): Promise<ModificationResult>;
  rollback(config: ConnectionConfig, backup: BackupSnapshot): Promise<{ success: boolean; message: string }>;
}
