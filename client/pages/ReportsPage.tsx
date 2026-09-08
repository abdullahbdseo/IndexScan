import React, { useState, useEffect } from 'react';
import { Project } from '../../server/types/index.js';
import { FileText, Download, Printer, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { api } from '../api.js';

interface ReportsPageProps {
  project: Project | null;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ project }) => {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setLoading(true);
      api.getLatestReport(project.id)
        .then(r => setReport(r))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [project]);

  const handleExportCsv = () => {
    if (!project) return;
    window.location.href = `/api/projects/${project.id}/reports/export-csv`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!project) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Actions */}
      <div className="glass-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={22} color="var(--accent-cyan)" />
            Executive SEO Audit & Auto-Fix Report
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Verified documentation of organic health, autonomous repairs, and category scores.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {report && (
        <div className="glass-panel" style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 28, background: '#0a0f1d' }}>
          {/* Executive Header */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: 8 }}>Executive SEO Verification</span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{report.projectName}</h1>
              <p style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: 4 }}>
                {report.domain}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Generated Date</span>
              <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Executive Score Summary Banner */}
          <div style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 24,
            alignItems: 'center'
          }}>
            <div style={{
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
            }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{report.overallScore}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Score</span>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="var(--accent-emerald)" />
                Executive Summary & Health Delta
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                {report.summaryText}
              </p>
            </div>
          </div>

          {/* Verified Fixes Section */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              Verified Automated Fixes ({report.fixedIssues.length})
            </h4>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Resolved Issue</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Root Cause</th>
                  <th>Affected</th>
                </tr>
              </thead>
              <tbody>
                {report.fixedIssues.map((f: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{f.title}</td>
                    <td><span className="badge badge-low">{f.category}</span></td>
                    <td><span className="badge badge-medium">{f.severity}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{f.rootCause}</td>
                    <td><span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{f.affectedCount}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unresolved / Manual Section */}
          {report.unresolvedIssues.length > 0 && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--accent-amber)' }}>
                Pending Manual Action Items ({report.unresolvedIssues.length})
              </h4>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unresolvedIssues.map((u: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{u.title}</td>
                      <td><span className="badge badge-low">{u.category}</span></td>
                      <td><span className="badge badge-high">{u.status}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
