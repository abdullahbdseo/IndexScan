import React, { useState } from 'react';
import { Project, CrawledPageData } from '../../server/types/index.js';
import { Search, Globe, CheckCircle2, AlertTriangle, FileText, Image, Link2, Code } from 'lucide-react';
import { api } from '../api.js';

interface UrlInspectorPageProps {
  project: Project | null;
}

export const UrlInspectorPage: React.FC<UrlInspectorPageProps> = ({ project }) => {
  const [urlInput, setUrlInput] = useState(project ? `${project.domain}/` : '');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectedPage, setInspectedPage] = useState<CrawledPageData | null>(null);
  const [inspectedIssues, setInspectedIssues] = useState<any[]>([]);

  const handleInspect = async () => {
    if (!project || !urlInput) return;
    setIsInspecting(true);
    try {
      const res = await api.inspectUrl(project.id, urlInput);
      if (res.success) {
        setInspectedPage(res.page);
        setInspectedIssues(res.issues);
      } else {
        alert(`Inspection failed: ${res.message}`);
      }
    } catch (e) {
      alert(`Error during inspection: ${(e as Error).message}`);
    } finally {
      setIsInspecting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Search / URL Entry Bar */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Search size={22} color="var(--accent-cyan)" />
          URL-Level Deep Inspector & Live Diagnostic
        </h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Enter full URL to inspect (e.g. http://localhost:4001/ or https://example.com/page)"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={handleInspect}
            disabled={isInspecting || !urlInput}
          >
            <span>{isInspecting ? 'Inspecting DOM...' : 'Inspect URL'}</span>
          </button>
        </div>
      </div>

      {inspectedPage && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Metadata & Core Signals */}
          <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--accent-cyan)" />
              Metadata & On-Page Signals
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>HTTP Status</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: inspectedPage.statusCode === 200 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  {inspectedPage.statusCode} OK
                </p>
              </div>

              <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Response Time</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {inspectedPage.responseTimeMs} ms
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Title Tag:</span>
                <p style={{ color: '#ffffff', fontWeight: 700, marginTop: 2 }}>{inspectedPage.title || '(Missing <title> tag)'}</p>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Meta Description:</span>
                <p style={{ color: 'var(--text-muted)', marginTop: 2 }}>{inspectedPage.metaDescription || '(Missing meta description)'}</p>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Canonical URL:</span>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.8rem', marginTop: 2 }}>
                  {inspectedPage.canonicalUrl || '(Missing rel canonical)'}
                </p>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Primary H1:</span>
                <p style={{ color: '#ffffff', fontWeight: 600, marginTop: 2 }}>
                  {inspectedPage.headings.h1[0] || '(No <h1> tag found)'}
                </p>
              </div>
            </div>

            {/* Images & Links summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
              <div style={{ padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <Image size={16} color="var(--accent-purple)" style={{ margin: '0 auto 4px auto' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Images</span>
                <p style={{ fontWeight: 800 }}>{inspectedPage.images.length}</p>
              </div>
              <div style={{ padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <Link2 size={16} color="var(--accent-cyan)" style={{ margin: '0 auto 4px auto' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Internal Links</span>
                <p style={{ fontWeight: 800 }}>{inspectedPage.internalLinks.length}</p>
              </div>
              <div style={{ padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <Code size={16} color="var(--accent-emerald)" style={{ margin: '0 auto 4px auto' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>JSON-LD Schema</span>
                <p style={{ fontWeight: 800 }}>{inspectedPage.jsonLdSchemas.length}</p>
              </div>
            </div>
          </div>

          {/* Detected Issues on this URL */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              Detected Issues on this URL ({inspectedIssues.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {inspectedIssues.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--accent-emerald)' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontWeight: 700 }}>This URL passes all SEO rules!</p>
                </div>
              ) : (
                inspectedIssues.map((issue, idx) => (
                  <div key={idx} style={{
                    padding: 14,
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className={`badge ${issue.severity === 'CRITICAL' ? 'badge-critical' : issue.severity === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                        {issue.severity}
                      </span>
                      <span className="badge badge-low">{issue.category}</span>
                    </div>
                    <h5 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>{issue.title}</h5>
                    <p style={{ fontSize: '0.775rem', color: 'var(--text-dim)', marginTop: 2 }}>{issue.evidence}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
