import type { AuditResult } from './seoAuditEngine';

const auditCache = new Map<string, { result: AuditResult; timestamp: number }>();

export function setCachedAudit(id: string, result: AuditResult) {
  auditCache.set(id, { result, timestamp: Date.now() });
  // Clean up cache older than 1 hour
  const oneHourAgo = Date.now() - 3600000;
  auditCache.forEach((val, key) => {
    if (val.timestamp < oneHourAgo) {
      auditCache.delete(key);
    }
  });
}

export function getCachedAudit(id: string): AuditResult | undefined {
  return auditCache.get(id)?.result;
}
