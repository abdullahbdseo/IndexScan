import React from 'react';
import { Project, SeoHealthScore, SeoIssue } from '../../server/types/index.js';
import { ScoreRing } from '../components/ScoreRing.js';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Wrench, 
  TrendingUp, 
  FileSearch,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  project: Project | null;
  score: SeoHealthScore | null;
  issues: SeoIssue[];
  onStartAutonomous: () => void;
  onFixAllSafe: () => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({
  project,
  score,
  issues,
  onStartAutonomous,
  onFixAllSafe
}) => {
  if (!project) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <h3>No project selected</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Please create or select a website project to view SEO diagnostics.</p>
      </div>
    );
  }

  const overallScore = score?.overallScore ?? 0;
  const initialScore = score?.initialScore;
  const fixedCount = issues.filter(i => i.status === 'FIXED').length;
  const criticalCount = issues.filter(i => i.severity === 'CRITICAL' && i.status !== 'FIXED').length;
  const highCount = issues.filter(i => i.severity === 'HIGH' && i.status !== 'FIXED').length;
  const medCount = issues.filter(i => i.severity === 'MEDIUM' && i.status !== 'FIXED').length;
  const safeFixableCount = issues.filter(i => i.autoFixSupported && i.status !== 'FIXED').length;

  const topIssues = issues.filter(i => i.status !== 'FIXED').slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner / Hero Overview */}
      <div className="glass-panel" style={{
        padding: 32,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 32,
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(18, 26, 43, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)'
      }}>
        <ScoreRing score={overallScore} initialScore={initialScore} size={150} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {project.name}
            </h1>
            <a
              href={project.domain}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}
            >
              <ExternalLink size={14} />
            </a>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 650 }}>
            Autonomous SEO Engine is continuously inspecting site architecture, indexability, metadata, structured schema, and Core Web Vitals.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <span className="badge badge-medium">CMS: {project.cmsType || 'Auto-Detecting'}</span>
            <span className="badge badge-low">Depth: {project.crawlDepth} Levels</span>
            <span className="badge badge-success">Confidence Threshold: {project.autoFixThreshold}%</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
          <button className="btn btn-emerald" onClick={onStartAutonomous}>
            <Sparkles size={16} />
            <span>Autonomous Repair</span>
          </button>
          {safeFixableCount > 0 && (
            <button className="btn btn-primary" onClick={onFixAllSafe}>
              <Wrench size={16} />
              <span>Fix {safeFixableCount} Safe Issues</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-rose)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Critical Issues</span>
            <AlertOctagon size={20} />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>{criticalCount}</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Requires urgent resolution</span>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-amber)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>High Priority</span>
            <AlertTriangle size={20} />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>{highCount}</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Ranking factor risks</span>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-emerald)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Verified Fixed</span>
            <CheckCircle2 size={20} />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>{fixedCount}</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Re-crawled & confirmed clean</span>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-cyan)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Auto-Fix Available</span>
            <Wrench size={20} />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>{safeFixableCount}</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>High-confidence safe patches</span>
        </div>
      </div>

      {/* Main Grid: Priority Issues & Category Health Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* Priority Issues Table */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              Detected SEO Issues
            </h3>
            <Link to="/issues" className="btn btn-secondary btn-sm">
              <span>View All ({issues.length})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {topIssues.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontWeight: 700 }}>All SEO checks are clean!</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No active critical or high issues detected.</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td>
                        <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-critical' : issue.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{issue.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{issue.rootCauseSummary}</div>
                      </td>
                      <td>
                        <span className="badge badge-low">{issue.category}</span>
                      </td>
                      <td>
                        {issue.autoFixSupported ? (
                          <Link to="/autofix" className="btn btn-emerald btn-sm">
                            <Wrench size={12} />
                            <span>Auto-Fix</span>
                          </Link>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Manual</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category Health Scores */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={18} color="var(--accent-cyan)" />
            Category Score Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
            {score && Object.values(score.breakdown).map((cat) => (
              <div key={cat.category} style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{cat.category.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 800, color: cat.score >= 90 ? 'var(--accent-emerald)' : cat.score >= 70 ? 'var(--accent-cyan)' : 'var(--accent-rose)' }}>
                    {cat.score}/100
                  </span>
                </div>
                <div style={{ width: '100%', height: 5, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${cat.score}%`,
                    height: '100%',
                    background: cat.score >= 90 ? 'var(--accent-emerald)' : cat.score >= 70 ? 'var(--accent-cyan)' : 'var(--accent-rose)',
                    borderRadius: 3
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
