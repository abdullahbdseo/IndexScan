import React, { useState } from 'react';
import { SeoIssue, IssueInstance, FixPlan } from '../../server/types/index.js';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Wrench, 
  CheckCircle2, 
  ShieldAlert, 
  FileCode,
  Zap
} from 'lucide-react';
import { DiffModal } from '../components/DiffModal.js';
import { api } from '../api.js';

interface IssueExplorerProps {
  issues: (SeoIssue & { instances: IssueInstance[]; fixPlan?: FixPlan })[];
  onRefresh: () => void;
}

export const IssueExplorerPage: React.FC<IssueExplorerProps> = ({ issues, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [autoFixFilter, setAutoFixFilter] = useState('ALL');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [selectedPlan, setSelectedPlan] = useState<FixPlan | null>(null);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIssues);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIssues(next);
  };

  const filteredIssues = issues.filter(issue => {
    if (categoryFilter !== 'ALL' && issue.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (autoFixFilter === 'AUTO_FIX' && !issue.autoFixSupported) return false;
    if (autoFixFilter === 'MANUAL' && issue.autoFixSupported) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return issue.title.toLowerCase().includes(q) || issue.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handlePreviewPlan = async (issue: SeoIssue) => {
    try {
      const plan = await api.getFixPlan(issue.id);
      setSelectedPlan(plan);
    } catch (e) {
      alert(`Could not load fix plan: ${(e as Error).message}`);
    }
  };

  const handleApplyFix = async (plan: FixPlan) => {
    setFixingIssueId(plan.issueId);
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
    } finally {
      setFixingIssueId(null);
    }
  };

  const categories = Array.from(new Set(issues.map(i => i.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={18} color="var(--text-dim)" />
          <input
            type="text"
            className="input-field"
            placeholder="Search issues by keyword, title, or rule..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select
            className="input-field"
            style={{ width: 'auto' }}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            className="input-field"
            style={{ width: 'auto' }}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="input-field"
            style={{ width: 'auto' }}
            value={autoFixFilter}
            onChange={e => setAutoFixFilter(e.target.value)}
          >
            <option value="ALL">All Fix Types</option>
            <option value="AUTO_FIX">Auto-Fix Supported</option>
            <option value="MANUAL">Manual Action</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Severity</th>
              <th>Issue & Diagnosis</th>
              <th>Category</th>
              <th>Affected URLs</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No issues found matching selected filters.
                </td>
              </tr>
            ) : (
              filteredIssues.map(issue => {
                const isExpanded = expandedIssues.has(issue.id);
                const isFixing = fixingIssueId === issue.id;

                return (
                  <React.Fragment key={issue.id}>
                    <tr>
                      <td>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          onClick={() => toggleExpand(issue.id)}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-critical' : issue.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{issue.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 450 }}>
                          {issue.rootCauseSummary}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-low">{issue.category}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {issue.affectedCount} page{issue.affectedCount > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${issue.status === 'FIXED' ? 'badge-success' : issue.status === 'FIXING' ? 'badge-medium' : 'badge-low'}`}>
                          {issue.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {issue.status === 'FIXED' ? (
                          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={14} /> Verified Fixed
                          </span>
                        ) : issue.autoFixSupported ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handlePreviewPlan(issue)}
                            >
                              <FileCode size={12} />
                              <span>Diff</span>
                            </button>
                            <button
                              className="btn btn-emerald btn-sm"
                              disabled={isFixing}
                              onClick={async () => {
                                setFixingIssueId(issue.id);
                                await api.applyFix(issue.id);
                                onRefresh();
                                setFixingIssueId(null);
                              }}
                            >
                              <Wrench size={12} />
                              <span>{isFixing ? 'Fixing...' : 'Fix'}</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Manual Review</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Instances & Diagnostic Details */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(11, 17, 33, 0.6)' }}>
                        <td colSpan={7} style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <div style={{ flex: 1, padding: 12, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <h5 style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                                  Root Cause Analysis
                                </h5>
                                <p style={{ fontSize: '0.825rem', color: 'var(--text-main)' }}>
                                  {issue.description}
                                </p>
                              </div>

                              <div style={{ width: 220, padding: 12, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                <h5 style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                                  Confidence Rating
                                </h5>
                                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                                  {issue.confidenceScore}%
                                </p>
                              </div>
                            </div>

                            {/* Affected Instances List */}
                            <div>
                              <h5 style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
                                Affected URLs & Evidence ({issue.instances.length})
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {issue.instances.map(inst => (
                                  <div key={inst.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{inst.url}</span>
                                    <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{inst.evidence}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Diff Preview Modal */}
      <DiffModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onApply={handleApplyFix}
      />
    </div>
  );
};
