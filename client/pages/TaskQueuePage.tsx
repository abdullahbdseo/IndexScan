import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

interface SeoTask {
  id: string;
  projectId: string;
  issueId?: string;
  taskType: string;
  state: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  seoImpactScore: number;
  businessImpactScore: number;
  confidenceScore: number;
  riskScore: number;
  priorityScore: number;
  affectedUrls: string[];
  affectedCount: number;
  rootCause?: string;
  isAutoExecutable: boolean;
  requiresApproval: boolean;
  attemptCount: number;
  lastError?: string;
  executionTimeMs?: number;
  createdAt: string;
  completedAt?: string;
}

interface TaskStats {
  total: number;
  byState: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  completed: number;
  failed: number;
  pending: number;
  autoExecutable: number;
  manualRequired: number;
  avgPriority: number;
}

const STATE_COLORS: Record<string, string> = {
  'DISCOVERED': '#64748b',
  'ANALYZING': '#3b82f6',
  'PLANNED': '#8b5cf6',
  'APPROVED': '#06b6d4',
  'QUEUED': '#0ea5e9',
  'EXECUTING': '#f59e0b',
  'VERIFYING': '#a855f7',
  'COMPLETED': '#10b981',
  'FAILED': '#ef4444',
  'ROLLED_BACK': '#f97316',
  'BLOCKED': '#6b7280',
  'MANUAL_REQUIRED': '#ec4899',
  'REJECTED': '#9ca3af'
};

const SEVERITY_COLORS: Record<string, string> = {
  'CRITICAL': '#ef4444',
  'HIGH': '#f97316',
  'MEDIUM': '#eab308',
  'LOW': '#3b82f6',
  'INFO': '#6b7280'
};

const TASK_TYPE_ICONS: Record<string, string> = {
  'TECHNICAL_FIX': '🔧',
  'METADATA_FIX': '📝',
  'CONTENT_OPTIMIZATION': '📄',
  'INTERNAL_LINKING': '🔗',
  'SCHEMA_FIX': '📊',
  'IMAGE_OPTIMIZATION': '🖼️',
  'REDIRECT_FIX': '↪️',
  'SITEMAP_FIX': '🗺️',
  'ROBOTS_FIX': '🤖',
  'PERFORMANCE_FIX': '⚡',
  'SECURITY_FIX': '🛡️',
  'CONTENT_CREATION': '✍️',
  'KEYWORD_MAPPING': '🔑',
  'AUDIT': '🔍',
  'MONITORING': '📡'
};

export function TaskQueuePage({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<SeoTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadData = async () => {
    try {
      const [taskData, statusData] = await Promise.all([
        api.getTasks(projectId),
        api.getAgentStatus(projectId)
      ]);
      setTasks(taskData.tasks || []);
      setStats(taskData.stats || null);
      setAgentStatus(statusData);
    } catch (err) {
      console.error('Failed to load task data:', err);
    }
    setLoading(false);
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => t.state === filter);

  const handleApprove = async (taskId: string) => {
    await api.transitionTask(projectId, taskId, 'APPROVED');
    loadData();
  };

  const handleReject = async (taskId: string) => {
    await api.transitionTask(projectId, taskId, 'REJECTED', 'Manually rejected by user');
    loadData();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Stats Overview */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <StatCard label="Total Tasks" value={stats.total} color="#3b82f6" />
          <StatCard label="Pending" value={stats.pending} color="#f59e0b" />
          <StatCard label="Completed" value={stats.completed} color="#10b981" />
          <StatCard label="Failed" value={stats.failed} color="#ef4444" />
          <StatCard label="Auto-Executable" value={stats.autoExecutable} color="#8b5cf6" />
          <StatCard label="Manual Required" value={stats.manualRequired} color="#ec4899" />
          <StatCard label="Avg Priority" value={stats.avgPriority} color="#06b6d4" />
        </div>
      )}

      {/* Agent Memory Summary */}
      {agentStatus?.memory && (
        <div style={{
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 600 }}>🧠 Agent Memory</span>
          <span style={{ fontSize: '13px', color: '#c4b5fd' }}>
            {agentStatus.memory.totalMemories} memories •
            {agentStatus.memory.fixOutcomes.success} fixes succeeded •
            {agentStatus.memory.fixOutcomes.failed} failed •
            {agentStatus.memory.rejectedFixes} rejected •
            {agentStatus.memory.learnedPolicies} policies learned
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
          All ({tasks.length})
        </FilterTab>
        {Object.entries(stats?.byState || {}).map(([state, count]) => (
          <FilterTab
            key={state}
            active={filter === state}
            onClick={() => setFilter(state)}
            color={STATE_COLORS[state]}
          >
            {state.replace(/_/g, ' ')} ({count})
          </FilterTab>
        ))}
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#64748b',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            No tasks {filter !== 'all' ? `in "${filter.replace(/_/g, ' ')}" state` : 'yet'}. Run an autonomous audit to populate the task queue.
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onApprove={() => handleApprove(task.id)}
              onReject={() => handleReject(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: `rgba(${hexToRgb(color)}, 0.06)`,
      border: `1px solid rgba(${hexToRgb(color)}, 0.15)`,
      borderRadius: '12px',
      padding: '14px 16px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}

function FilterTab({ active, onClick, children, color }: {
  active: boolean; onClick: () => void; children: React.ReactNode; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '20px',
        border: active ? `1px solid ${color || '#3b82f6'}` : '1px solid rgba(148, 163, 184, 0.2)',
        background: active ? `rgba(${hexToRgb(color || '#3b82f6')}, 0.15)` : 'rgba(30, 41, 59, 0.5)',
        color: active ? (color || '#3b82f6') : '#94a3b8',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </button>
  );
}

function TaskCard({ task, onApprove, onReject }: {
  task: SeoTask; onApprove: () => void; onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const stateColor = STATE_COLORS[task.state] || '#64748b';
  const sevColor = SEVERITY_COLORS[task.severity] || '#64748b';
  const icon = TASK_TYPE_ICONS[task.taskType] || '📌';

  return (
    <div
      style={{
        background: 'rgba(30, 41, 59, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '10px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeft: `3px solid ${stateColor}`
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: expanded ? '10px' : '0' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{task.title}</span>
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: `rgba(${hexToRgb(stateColor)}, 0.15)`,
              color: stateColor,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {task.state.replace(/_/g, ' ')}
            </span>
            <span style={{
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: `rgba(${hexToRgb(sevColor)}, 0.15)`,
              color: sevColor,
              fontWeight: 600
            }}>
              {task.severity}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {task.category.replace(/_/g, ' ')} • {task.affectedCount} URL(s) • Priority: {task.priorityScore}/100
          </div>
        </div>
        <div style={{
          background: `conic-gradient(${stateColor} ${task.priorityScore * 3.6}deg, rgba(100,116,139,0.2) 0deg)`,
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: stateColor
        }}>
          {task.priorityScore}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{
          marginTop: '8px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(148, 163, 184, 0.1)'
        }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            {task.description}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
            <MiniStat label="SEO Impact" value={task.seoImpactScore} />
            <MiniStat label="Business" value={task.businessImpactScore} />
            <MiniStat label="Confidence" value={task.confidenceScore} />
            <MiniStat label="Risk" value={task.riskScore} />
          </div>
          {task.rootCause && (
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
              <strong>Root Cause:</strong> {task.rootCause}
            </div>
          )}
          {task.lastError && (
            <div style={{
              fontSize: '11px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '6px 10px',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              ⚠️ {task.lastError}
            </div>
          )}
          {task.affectedUrls && task.affectedUrls.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Affected URLs:</div>
              {(Array.isArray(task.affectedUrls) ? task.affectedUrls : []).slice(0, 5).map((url: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {url}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {(task.state === 'PLANNED' || task.state === 'DISCOVERED') && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(); }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✅ Approve
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(); }}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ❌ Reject
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
