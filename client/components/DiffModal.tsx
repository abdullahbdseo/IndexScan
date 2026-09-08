import React from 'react';
import { FixPlan } from '../../server/types/index.js';
import { X, Check, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface DiffModalProps {
  plan: FixPlan | null;
  onClose: () => void;
  onApply: (plan: FixPlan) => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({ plan, onClose, onApply }) => {
  if (!plan) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 8, 15, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 20
    }}>
      <div className="glass-panel" style={{
        maxWidth: 800,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0d1322',
        border: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`badge ${plan.classification === 'SAFE_AUTO_FIX' ? 'badge-success' : 'badge-high'}`}>
                {plan.classification}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target: {plan.targetPath}</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>
              Fix Plan: {plan.ruleId}
            </h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* AI Explanation */}
          <div style={{ marginBottom: 20, padding: 14, background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Zap size={14} /> AI Diagnostic & Rationale
            </h5>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              {plan.explanation}
            </p>
          </div>

          {/* Scores Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: 12, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{plan.confidenceScore}%</p>
            </div>
            <div style={{ padding: 12, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>SEO Impact</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>+{plan.impactScore}</p>
            </div>
            <div style={{ padding: 12, background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Risk Score</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: plan.riskScore < 10 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>{plan.riskScore}%</p>
            </div>
          </div>

          {/* Diff Box */}
          <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)' }}>
            Code / DOM Modification Diff
          </h5>
          <div className="diff-box">
            <span style={{ color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>--- Original State ({plan.targetPath})</span>
            <div className="diff-del">- {plan.beforeContent}</div>
            <span style={{ color: 'var(--text-dim)', display: 'block', margin: '8px 0 6px 0' }}>+++ Proposed Automated Patch</span>
            <div className="diff-add">+ {plan.afterContent}</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-emerald" onClick={() => onApply(plan)}>
            <ShieldCheck size={16} />
            <span>Apply & Verify Fix Immediately</span>
          </button>
        </div>
      </div>
    </div>
  );
};
