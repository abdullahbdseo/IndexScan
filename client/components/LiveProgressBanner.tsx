import React from 'react';
import { AutonomousLoopState } from '../../server/types/index.js';
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface LiveProgressBannerProps {
  state: AutonomousLoopState | null;
}

export const LiveProgressBanner: React.FC<LiveProgressBannerProps> = ({ state }) => {
  if (!state || state.status === 'IDLE') return null;

  const isRunning = state.status === 'RUNNING';
  const isComplete = state.status === 'STABILIZED';

  return (
    <div className="glass-panel" style={{
      marginBottom: 24,
      padding: '20px 24px',
      borderLeft: `4px solid ${isRunning ? 'var(--primary)' : isComplete ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
      background: isRunning 
        ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(18, 26, 43, 0.8) 100%)'
        : 'rgba(18, 26, 43, 0.85)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isRunning ? (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={18} color="#ffffff" style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
          ) : isComplete ? (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
            </div>
          ) : (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(244, 63, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={18} color="var(--accent-rose)" />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {isRunning ? `Autonomous Optimization Active (Cycle ${state.cycleNumber}/${state.maxCycles})` : 'Optimization Session Finished'}
              </h4>
              <span className={`badge ${isRunning ? 'badge-medium' : isComplete ? 'badge-success' : 'badge-critical'}`}>
                {state.currentPhase}
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {state.phaseDetails}
            </p>
          </div>
        </div>

        {/* Real-time stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, textAlign: 'right' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Fixes Applied
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {state.fixedTotal}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Verified Clean
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {state.verifiedTotal}
            </span>
          </div>

          {state.failedTotal > 0 && (
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Reverted / Failed
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                {state.failedTotal}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${state.progressPercentage}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #6366f1, #06b6d4, #10b981)',
          borderRadius: 3,
          transition: 'width 0.4s ease'
        }} />
      </div>
    </div>
  );
};
