import React, { useState } from 'react';
import { Project, AutonomousLoopState, AuditLog } from '../../server/types/index.js';
import { Activity, Play, CheckCircle2, Clock, Terminal, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api.js';

interface AuditProgressPageProps {
  project: Project | null;
  loopState: AutonomousLoopState | null;
  logs: AuditLog[];
  onStartAutonomous: () => void;
}

export const AuditProgressPage: React.FC<AuditProgressPageProps> = ({
  project,
  loopState,
  logs,
  onStartAutonomous
}) => {
  const [isCrawling, setIsCrawling] = useState(false);

  const handleManualCrawl = async () => {
    if (!project) return;
    setIsCrawling(true);
    try {
      await api.startCrawl(project.id);
      alert('Crawl and audit completed successfully!');
    } catch (e) {
      alert(`Crawl failed: ${(e as Error).message}`);
    } finally {
      setIsCrawling(false);
    }
  };

  const phases = [
    { key: 'CRAWLING', label: '1. Website Crawling & Discovery' },
    { key: 'AUDITING', label: '2. SEO Rules & Knowledge Graph' },
    { key: 'PLANNING_FIXES', label: '3. Root-Cause Diagnostics & Fix Planning' },
    { key: 'APPLYING_FIXES', label: '4. Safe Auto-Fix Execution' },
    { key: 'VERIFYING', label: '5. Re-Crawl & Verification' },
    { key: 'REPORTING', label: '6. Final Score & Executive Report' }
  ];

  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const currentPhaseIdx = phases.findIndex(p => p.key === loopState?.currentPhase);
  const isLoopActive = loopState?.status === 'RUNNING';
  const isStabilized = loopState?.status === 'STABILIZED' || loopState?.status === 'MAX_CYCLES_REACHED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Controls */}
      <div className="glass-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={22} color="var(--accent-cyan)" />
            Live Audit & Orchestration Monitor
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Monitor real-time crawling metrics, rule execution pipelines, and auto-fix status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={handleManualCrawl}
            disabled={isCrawling || isLoopActive}
          >
            <Play size={16} />
            <span>{isCrawling ? 'Crawling...' : 'Run Crawl Only'}</span>
          </button>
          <button
            className="btn btn-emerald"
            onClick={onStartAutonomous}
            disabled={isLoopActive}
          >
            <RefreshCw size={16} className={isLoopActive ? 'spin' : ''} />
            <span>{isLoopActive ? `Running Cycle ${loopState?.currentCycle || 1}...` : 'Start Full Autonomous Loop'}</span>
          </button>
        </div>
      </div>

      {/* Progress Steps Overview */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Optimization Pipeline Workflow
          </h3>
          {isLoopActive && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              ● ACTIVE STAGE: {phases[currentPhaseIdx]?.label || loopState?.currentPhase}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {phases.map((p, idx) => {
            const isActive = isLoopActive && currentPhaseIdx === idx;
            const isCompleted = isStabilized || (isLoopActive && currentPhaseIdx > idx);

            return (
              <div
                key={p.key}
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: isActive
                    ? 'rgba(99, 102, 241, 0.22)'
                    : isCompleted
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isActive ? 'var(--primary)' : isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}`,
                  textAlign: 'center',
                  transition: 'all 0.3s',
                  boxShadow: isActive ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isCompleted ? 'var(--accent-emerald)' : isActive ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  margin: '0 auto 8px auto',
                  boxShadow: isCompleted ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
                }}>
                  {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? '#ffffff' : isCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Terminal / Action Stream */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="var(--accent-emerald)" />
            Real-Time Audit & Fix Stream
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {logs.length} logged events
          </span>
        </div>

        <div 
          ref={terminalRef}
          style={{
          background: '#070a12',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          maxHeight: 400,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          {logs.length === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>No live events recorded yet. Run an audit to view execution logs.</span>
          ) : (
            logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, lineHeight: 1.4 }}>
                <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                <span style={{
                  color: log.severity === 'SUCCESS' ? 'var(--accent-emerald)' : log.severity === 'ERROR' ? 'var(--accent-rose)' : log.severity === 'WARNING' ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {log.action}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {log.details}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
