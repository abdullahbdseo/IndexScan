import React from 'react';
import { AuditLog } from '../../server/types/index.js';
import { ShieldCheck, Terminal } from 'lucide-react';

interface LogsPageProps {
  logs: AuditLog[];
}

export const LogsPage: React.FC<LogsPageProps> = ({ logs }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={22} color="var(--accent-emerald)" />
          Audit Logs & Immutable Security Trail
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Complete tamper-evident log of all crawler executions, snapshot creations, auto-fix mutations, and verification checks.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Category</th>
              <th>Details</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#ffffff' }}>{log.action}</span>
                  </td>
                  <td>
                    <span className="badge badge-low">{log.category}</span>
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: 500 }}>
                    {log.details}
                  </td>
                  <td>
                    <span className={`badge ${log.severity === 'SUCCESS' ? 'badge-success' : log.severity === 'ERROR' ? 'badge-critical' : log.severity === 'WARNING' ? 'badge-high' : 'badge-medium'}`}>
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
