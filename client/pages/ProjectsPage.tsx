import React, { useState } from 'react';
import { Project, ConnectionConfig } from '../../server/types/index.js';
import { FolderKanban, Plus, CheckCircle2, AlertCircle, Shield, Server, Globe } from 'lucide-react';
import { api } from '../api.js';

interface ProjectsPageProps {
  projects: Project[];
  activeProject: Project | null;
  onRefresh: () => void;
  onSelectProject: (p: Project) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  activeProject,
  onRefresh,
  onSelectProject
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [adapterType, setAdapterType] = useState('wordpress');
  const [baseDirectory, setBaseDirectory] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testingConn, setTestingConn] = useState(false);
  const [savingConn, setSavingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentConnection, setCurrentConnection] = useState<ConnectionConfig | null>(null);

  // Fetch connection config for active project
  React.useEffect(() => {
    if (activeProject) {
      api.getConnection(activeProject.id).then(conn => {
        setCurrentConnection(conn);
        if (conn) {
          setAdapterType(conn.adapterType || 'wordpress');
          setApiUrl(conn.apiUrl || `${activeProject.domain.replace(/\/+$/, '')}/wp-json`);
          setUsername(conn.username || '');
          setApiKey(conn.apiKey || '');
        } else {
          setApiUrl(`${activeProject.domain.replace(/\/+$/, '')}/wp-json`);
        }
      }).catch(console.error);
    }
  }, [activeProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !domain) return;

    try {
      const created = await api.createProject({
        name,
        domain,
        mode: 'AUTONOMOUS',
        connection: {
          adapterType: adapterType as any,
          baseDirectory: baseDirectory || undefined,
          apiUrl: apiUrl || undefined,
          username: username || undefined,
          apiKey: apiKey || undefined
        }
      });
      alert('Project created successfully!');
      setShowAddModal(false);
      setName('');
      setDomain('');
      onRefresh();
      onSelectProject(created);
    } catch (err) {
      alert(`Error creating project: ${(err as Error).message}`);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setSavingConn(true);
    setTestResult(null);

    try {
      const saved = await api.saveConnection(activeProject.id, {
        adapterType: adapterType as any,
        apiUrl: apiUrl || `${activeProject.domain.replace(/\/+$/, '')}/wp-json`,
        username: username || undefined,
        apiKey: apiKey || undefined,
        baseDirectory: baseDirectory || undefined,
        isActive: true
      });
      setCurrentConnection(saved);
      
      // Auto test after saving
      const test = await api.testConnection(activeProject.id);
      setTestResult(test);
      if (test.success) {
        alert('WordPress connection saved and verified successfully!');
        setShowConfigModal(false);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setSavingConn(false);
    }
  };

  const handleTestConnection = async () => {
    if (!activeProject) return;
    setTestingConn(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(activeProject.id);
      setTestResult(res);
    } catch (e) {
      setTestResult({ success: false, message: (e as Error).message });
    } finally {
      setTestingConn(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderKanban size={22} color="var(--accent-cyan)" />
            Websites & Connection Adapters Manager
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Configure website domains, CMS adapters (WordPress, Git, SFTP, File System), and autonomous safety policies.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>Add Website Project</span>
        </button>
      </div>

      {/* Active Project Adapter Config */}
      {activeProject && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span className="badge badge-medium">Active Website Adapter: {currentConnection?.adapterType?.toUpperCase() || 'NOT CONFIGURED'}</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>
                {activeProject.name} ({activeProject.domain})
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>
                {currentConnection?.username ? `Authenticated user: ${currentConnection.username}` : 'Currently operating in read-only audit mode.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-emerald"
                onClick={() => setShowConfigModal(true)}
              >
                <Shield size={16} />
                <span>Configure WordPress Live Access</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={testingConn}
              >
                <Server size={16} />
                <span>{testingConn ? 'Testing Access...' : 'Verify Access'}</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              color: testResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Autonomous Safety Policy</span>
              <p style={{ fontWeight: 700, color: '#ffffff', marginTop: 4 }}>Threshold: {activeProject.autoFixThreshold}%</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Atomic Rollbacks: Enabled</span>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Crawl Depth & Limits</span>
              <p style={{ fontWeight: 700, color: '#ffffff', marginTop: 4 }}>Max {activeProject.maxCrawlUrls} URLs</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Depth: {activeProject.crawlDepth} Levels</span>
            </div>

            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Live Connection Status</span>
              <p style={{ fontWeight: 700, color: currentConnection?.apiKey ? 'var(--accent-emerald)' : 'var(--accent-amber)', marginTop: 4 }}>
                {currentConnection?.apiKey ? 'Write Access Active' : 'Read-Only / Staged'}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentConnection?.apiUrl || 'No API URL configured'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
          All Connected Websites ({projects.length})
        </h3>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Website Name</th>
              <th>Domain</th>
              <th>Mode</th>
              <th>CMS / Stack</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700, color: '#ffffff' }}>{p.name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{p.domain}</td>
                <td><span className="badge badge-medium">{p.mode}</span></td>
                <td><span className="badge badge-low">{p.cmsType || 'Generic'}</span></td>
                <td>
                  <button
                    className={`btn btn-sm ${p.id === activeProject?.id ? 'btn-emerald' : 'btn-secondary'}`}
                    onClick={() => onSelectProject(p)}
                  >
                    {p.id === activeProject?.id ? 'Selected' : 'Select'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div className="glass-panel" style={{ maxWidth: 540, width: '100%', padding: 28, background: '#0d1322' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>
              Connect New Website
            </h3>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Website Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. My SaaS Platform"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Domain / URL</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. http://localhost:4001 or https://example.com"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Connection Adapter</label>
                <select
                  className="input-field"
                  value={adapterType}
                  onChange={e => setAdapterType(e.target.value)}
                >
                  <option value="local_fs">Local File System / Sandbox Site</option>
                  <option value="wordpress">WordPress REST API / Plugin</option>
                  <option value="git">Git Repository / PR Engine</option>
                  <option value="sftp">SFTP / Remote Server</option>
                  <option value="shopify">Shopify Theme & Admin API</option>
                  <option value="generic_api">Generic Deployment Webhook</option>
                </select>
              </div>

              {adapterType === 'local_fs' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Local Directory Path</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. server/sandbox/site"
                    value={baseDirectory}
                    onChange={e => setBaseDirectory(e.target.value)}
                  />
                </div>
              )}

              {adapterType === 'wordpress' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>WordPress REST Endpoint</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://example.com/wp-json"
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-emerald">
                  Create & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Active Website Connection Modal */}
      {showConfigModal && activeProject && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div className="glass-panel" style={{ maxWidth: 580, width: '100%', padding: 28, background: '#0d1322' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="var(--primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Configure WordPress Live Access
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeProject.name} — {activeProject.domain}
                </span>
              </div>
            </div>

            <div style={{
              padding: 14,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: 'var(--text-muted)',
              marginBottom: 16
            }}>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: 4 }}>💡 How to generate a WordPress Application Password:</strong>
              1. Log in to your WordPress Admin dashboard.<br />
              2. Go to <strong>Users → Profile</strong> (or Edit User).<br />
              3. Scroll down to the <strong>"Application Passwords"</strong> section.<br />
              4. Enter name (e.g. <code>ApexSEO</code>) and click <strong>"Add New Application Password"</strong>.<br />
              5. Copy the generated 24-character password and paste it below.
            </div>

            <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Connection Adapter</label>
                <select
                  className="input-field"
                  value={adapterType}
                  onChange={e => setAdapterType(e.target.value)}
                >
                  <option value="wordpress">WordPress REST API (Recommended for Fabric Ghar)</option>
                  <option value="local_fs">Local File System / Sandbox Site</option>
                  <option value="shopify">Shopify Theme & Admin API</option>
                  <option value="git">Git Repository</option>
                  <option value="sftp">SFTP / SSH</option>
                </select>
              </div>

              {adapterType === 'wordpress' && (
                <>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>WordPress REST Endpoint URL</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="https://fabricghar.com/wp-json"
                      value={apiUrl}
                      onChange={e => setApiUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>WordPress Username</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. admin or your_wp_username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>WordPress Application Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {testResult && (
                <div style={{
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  color: testResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  fontSize: '0.85rem'
                }}>
                  {testResult.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-emerald" disabled={savingConn}>
                  {savingConn ? 'Verifying & Saving...' : 'Save & Verify Live Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
