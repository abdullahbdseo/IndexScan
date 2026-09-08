import React from 'react';
import { CrawledPageData } from '../../server/types/index.js';
import { Network, FileSearch, Link2, AlertCircle } from 'lucide-react';

interface KnowledgeGraphPageProps {
  pages: CrawledPageData[];
}

export const KnowledgeGraphPage: React.FC<KnowledgeGraphPageProps> = ({ pages }) => {
  // Count inbound links
  const inboundMap = new Map<string, number>();
  for (const page of pages) {
    for (const link of page.internalLinks) {
      inboundMap.set(link.href, (inboundMap.get(link.href) || 0) + 1);
    }
  }

  const orphanPages = pages.filter(p => p.depth > 0 && (inboundMap.get(p.url) || 0) === 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Network size={22} color="var(--accent-cyan)" />
          Website Knowledge Graph & Link Equity Model
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Graph modeling maps all internal link connections, discovers orphan pages, and analyzes crawl depth distribution.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Indexed Nodes</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 4 }}>{pages.length}</p>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Internal Edges</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 4 }}>
            {pages.reduce((acc, p) => acc + p.internalLinks.length, 0)}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Orphan Pages</span>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: orphanPages.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginTop: 4 }}>
            {orphanPages.length}
          </p>
        </div>
      </div>

      {/* Pages and Inbound Link Distribution */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>
          Site Nodes & Internal Inbound Link Equity
        </h3>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Page URL</th>
              <th>Crawl Depth</th>
              <th>Inbound Links</th>
              <th>Outbound Links</th>
              <th>Template Cluster</th>
              <th>Orphan State</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const inbounds = inboundMap.get(page.url) || 0;
              const isOrphan = page.depth > 0 && inbounds === 0;

              return (
                <tr key={page.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                    {page.pathname}
                  </td>
                  <td>
                    <span className="badge badge-low">Depth {page.depth}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: inbounds > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                      {inbounds} inbound
                    </span>
                  </td>
                  <td>
                    <span>{page.internalLinks.length} outbound</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {page.detectedTemplateId?.slice(0, 8) || 'default'}
                    </span>
                  </td>
                  <td>
                    {isOrphan ? (
                      <span className="badge badge-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={12} /> Orphan (0 Inbounds)
                      </span>
                    ) : (
                      <span className="badge badge-success">Connected</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
