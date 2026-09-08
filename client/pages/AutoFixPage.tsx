import React, { useState } from 'react';
import { SeoIssue, IssueInstance, FixPlan, Project } from '../../server/types/index.js';
import { 
  Wrench, 
  ShieldCheck, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  Zap, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DiffModal } from '../components/DiffModal.js';
import { api } from '../api.js';

interface AutoFixPageProps {
  project: Project | null;
  issues: (SeoIssue & { instances: IssueInstance[]; fixPlan?: FixPlan })[];
  onRefresh: () => void;
}

export const AutoFixPage: React.FC<AutoFixPageProps> = ({ project, issues, onRefresh }) => {
  const [selectedPlan, setSelectedPlan] = useState<FixPlan | null>(null);
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const safeFixableIssues = issues.filter(i => i.autoFixSupported && i.status !== 'FIXED');
  const fixedIssues = issues.filter(i => i.status === 'FIXED');
  const reviewRequiredIssues = issues.filter(i => i.status === 'AWAITING_APPROVAL');

  const handleFixAllSafe = async () => {
    if (!project) return;
    if (!confirm(`Apply and verify all ${safeFixableIssues.length} safe auto-fixes? Pre-modification backups will be created automatically.`)) return;

    setIsFixingAll(true);
    try {
      const res = await api.fixAllSafe(project.id);
      alert(`Auto-fix batch complete! Verified clean: ${res.verifiedCount}, Failed: ${res.failedCount}`);
      onRefresh();
    } catch (e) {
      alert(`Auto-fix batch error: ${(e as Error).message}`);
    } finally {
      setIsFixingAll(false);
    }
  };

  const handleRollbackSession = async () => {
    if (!project) return;
    if (!confirm('Revert all automated fixes applied in this session back to their original state?')) return;

    setIsRollingBack(true);
    try {
      const res = await api.rollbackSession(project.id);
      alert(`Session rollback completed! ${res.revertedCount} fixes cleanly reverted.`);
      onRefresh();
    } catch (e) {
      alert(`Rollback error: ${(e as Error).message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleApplySingle = async (plan: FixPlan) => {
    setSelectedPlan(null);
    try {
      const res = await api.applyFix(plan.issueId);
      if (res.success) {
        alert('Fix applied and verified successfully!');
        onRefresh();
      } else {
        alert(`Fix failed: ${res.message}`);
      }
    } catch (e) {
      alert(`Fix execution error: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Command Center Banner */}
      <div className="glass-panel" style={{
        padding: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(18, 26, 43, 0.85) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Sparkles size={22} color="var(--accent-emerald)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Auto-Fix & Autonomous Repair Command Center
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 650 }}>
            Every automated patch undergoes syntax validation, pre-modification snapshot creation, atomic adapter execution, and live re-crawl verification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {fixedIssues.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleRollbackSession}
              disabled={isRollingBack}
            >
              <RotateCcw size={16} />
              <span>{isRollingBack ? 'Reverting...' : 'Rollback Session'}</span>
            </button>
          )}

          <button
            className="btn btn-emerald"
            onClick={handleFixAllSafe}
            disabled={isFixingAll || safeFixableIssues.length === 0}
          >
            <ShieldCheck size={18} />
            <span>{isFixingAll ? 'Applying & Verifying...' : `Fix All ${safeFixableIssues.length} Safe Issues`}</span>
          </button>
        </div>
      </div>

      {/* Grid: Fixable vs Fixed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Available Safe Fixes */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wrench size={18} color="var(--accent-cyan)" />
              Ready for Auto-Fix ({safeFixableIssues.length})
            </h3>
            <span className="badge badge-success">High Confidence</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 450, overflowY: 'auto' }}>
            {safeFixableIssues.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)' }}>
                <CheckCircle2 size={32} color="var(--accent-emerald)" style={{ margin: '0 auto 8px auto' }} />
                <p>No unapplied safe fixes remaining!</p>
              </div>
            ) : (
              safeFixableIssues.map(issue => (
                <div key={issue.id} style={{
                  padding: 16,
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="badge badge-medium">{issue.category}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                        {issue.confidenceScore}% Confidence
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>{issue.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Affected URLs: {issue.affectedCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        const plan = await api.getFixPlan(issue.id);
                        setSelectedPlan(plan);
                      }}
                    >
                      <FileCode size={12} />
                      <span>Preview</span>
                    </button>
                    <button
                      className="btn btn-emerald btn-sm"
                      onClick={async () => {
                        await api.applyFix(issue.id);
                        onRefresh();
                      }}
                    >
                      <Wrench size={12} />
                      <span>Apply</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verified Fixed History */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
              Verified Fixed ({fixedIssues.length})
            </h3>
            <span className="badge badge-success">Live Confirmed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 450, overflowY: 'auto' }}>
            {fixedIssues.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)' }}>
                <span>No fixes applied in current session yet.</span>
              </div>
            ) : (
              fixedIssues.map(issue => (
                <div key={issue.id} style={{
                  padding: 16,
                  background: 'rgba(16, 185, 129, 0.04)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="badge badge-success">Verified Clean</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{issue.category}</span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>{issue.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {issue.rootCauseSummary}
                    </span>
                  </div>

                  <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={16} /> Re-Crawled & Passed
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Diff Preview Modal */}
      <DiffModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onApply={handleApplySingle}
      />
    </div>
  );
};
