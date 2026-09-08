import React from 'react';
import { Project } from '../../server/types/index.js';
import { Play, RotateCcw, Globe, Sparkles } from 'lucide-react';
import { api } from '../api.js';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  isRunningAutonomous: boolean;
  onStartAutonomous: () => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  isRunningAutonomous,
  onStartAutonomous,
  onRefreshData
}) => {
  const handleResetSandbox = async () => {
    if (confirm('Reset the built-in sandbox website files to their initial flawed state?')) {
      await api.resetSandbox();
      alert('Sandbox reset to initial state with test SEO flaws! You can now run the autonomous cycle to watch it fix everything again.');
      onRefreshData();
    }
  };

  return (
    <header className="topbar glass-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Project Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} color="var(--accent-cyan)" />
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: 260, padding: '6px 12px', fontWeight: 600 }}
            value={activeProject?.id || ''}
            onChange={(e) => {
              const selected = projects.find(p => p.id === e.target.value);
              if (selected) onSelectProject(selected);
            }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.domain})
              </option>
            ))}
          </select>
        </div>

        {activeProject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-medium">
              Mode: {activeProject.mode}
            </span>
            {activeProject.cmsType && (
              <span className="badge badge-low">
                {activeProject.cmsType}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Reset Sandbox button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleResetSandbox}
          title="Reset test website files to default state with SEO errors"
        >
          <RotateCcw size={14} />
          <span>Reset Sandbox</span>
        </button>

        {/* Start Autonomous Loop Button */}
        <button
          className={`btn ${isRunningAutonomous ? 'btn-secondary' : 'btn-emerald'}`}
          onClick={onStartAutonomous}
          disabled={isRunningAutonomous || !activeProject}
          style={{ position: 'relative' }}
        >
          {isRunningAutonomous ? (
            <>
              <div style={{
                width: 14,
                height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Optimizing Website...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Run Autonomous Optimization</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};
