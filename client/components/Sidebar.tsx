import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  AlertTriangle, 
  Wrench, 
  Search, 
  Network, 
  FileText, 
  FolderKanban, 
  ShieldCheck,
  Zap,
  ClipboardList,
  ScanSearch
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/audit', label: 'Site Audit & Progress', icon: Activity },
    { to: '/tasks', label: 'Task Queue & Agent', icon: ClipboardList },
    { to: '/issues', label: 'Issue Explorer', icon: AlertTriangle },
    { to: '/autofix', label: 'Auto-Fix Center', icon: Wrench },
    { to: '/inspector', label: 'URL Inspector', icon: Search },
    { to: '/graph', label: 'Knowledge Graph', icon: Network },
    { to: '/reports', label: 'Executive Reports', icon: FileText },
    { to: '/projects', label: 'Projects & Adapters', icon: FolderKanban },
    { to: '/logs', label: 'Audit Logs & History', icon: ShieldCheck },
  ];

  const indexScanItem = { to: '/indexscan', label: 'IndexScan', icon: ScanSearch };

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 24px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)'
        }}>
          <Zap size={22} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ApexSEO
          </h2>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Autonomous Engine
          </span>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* IndexScan — standalone tool */}
        <div style={{ margin: '12px 0 8px', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 14px', display: 'block', marginBottom: 6 }}>
            Quick Tools
          </span>
          <NavLink
            to={indexScanItem.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.08) 0%, transparent 100%)' }}
          >
            <indexScanItem.icon size={18} />
            <span>{indexScanItem.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#6366f1',
              background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: 10 }}>NEW</span>
          </NavLink>
        </div>
      </nav>

      <div style={{
        marginTop: 'auto',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.75rem',
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 6px var(--accent-emerald)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Engine v1.0 Production</span>
        </div>
        <span>Safe Reversible Autonomous Repairs</span>
      </div>
    </aside>
  );
};
