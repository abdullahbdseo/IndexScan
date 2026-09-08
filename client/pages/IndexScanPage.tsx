import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Download, AlertCircle, CheckCircle, AlertTriangle,
  Globe, Shield, Share2, Code2, Image, Zap, Link2,
  BarChart3, ChevronDown, ChevronUp, Loader2, FileSpreadsheet,
  ExternalLink, Info,
} from 'lucide-react';

// ── Types (mirrors server) ─────────────────────────────────────
interface SeoCheck {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  current: string;
  recommended: string;
  effort: string;
  impact: string;
}

interface AuditResult {
  id: string;
  url: string;
  domain: string;
  auditedAt: string;
  isHttps: boolean;
  meta: {
    title: string; titleLength: number; description: string; descriptionLength: number;
    h1: string[]; h2: string[]; ogTitle: string; ogImage: string; twitterCard: string;
    canonical: string; schemaTypes: string[]; imagesTotal: number; imagesMissingAlt: number;
    internalLinks: number; externalLinks: number; hasGA: boolean; socialLinks: string[];
    phone: string; email: string; hasTailwindCDN: boolean;
  };
  checks: SeoCheck[];
  scores: { overall: number; onPage: number; technical: number; social: number; schema: number; images: number; performance: number };
  sitemap: { exists: boolean; urlCount: number };
  robotsTxt: { exists: boolean; sitemapLinked: boolean };
}

// ── Helpers ────────────────────────────────────────────────────
const CATEGORY_INFO: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  ON_PAGE:     { label: 'On-Page SEO',  icon: FileSpreadsheet, color: '#6366f1' },
  TECHNICAL:   { label: 'Technical',    icon: Shield,          color: '#06b6d4' },
  SOCIAL:      { label: 'Social & OG',  icon: Share2,          color: '#f59e0b' },
  SCHEMA:      { label: 'Schema',       icon: Code2,           color: '#a855f7' },
  IMAGES:      { label: 'Images',       icon: Image,           color: '#0ea5e9' },
  ANALYTICS:   { label: 'Analytics',    icon: BarChart3,       color: '#10b981' },
  PERFORMANCE: { label: 'Performance',  icon: Zap,             color: '#f43f5e' },
  LINKS:       { label: 'Links',        icon: Link2,           color: '#14b8a6' },
};

function scoreColor(n: number) {
  if (n >= 75) return { text: '#22c55e', bg: 'rgba(34,197,94,0.1)',  ring: '#22c55e' };
  if (n >= 50) return { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)', ring: '#f59e0b' };
  return               { text: '#ef4444', bg: 'rgba(239,68,68,0.1)',  ring: '#ef4444' };
}

function StatusBadge({ status }: { status: 'PASS'|'WARN'|'FAIL' }) {
  const cfg = {
    PASS: { icon: CheckCircle,    label: 'PASS', color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
    WARN: { icon: AlertTriangle,  label: 'WARN', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    FAIL: { icon: AlertCircle,    label: 'FAIL', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  }[status];
  const Icon = cfg.icon;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px',
      borderRadius:6, background:cfg.bg, color:cfg.color, fontWeight:700, fontSize:11 }}>
      <Icon size={11} />{cfg.label}
    </span>
  );
}

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const c = scoreColor(score);
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={c.ring} strokeWidth={7}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition:'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column' }}>
          <span style={{ fontSize: size > 70 ? 18 : 13, fontWeight:800, color:c.text, lineHeight:1 }}>{score}</span>
          {size > 70 && <span style={{ fontSize:9, color:'#94a3b8' }}>/100</span>}
        </div>
      </div>
      <span style={{ fontSize:11, color:'#94a3b8', textAlign:'center', maxWidth:80 }}>{label}</span>
    </div>
  );
}

// ── Scanning animation steps ───────────────────────────────────
const SCAN_STEPS = [
  'Connecting to website...',
  'Fetching HTML source...',
  'Parsing meta tags...',
  'Checking Open Graph tags...',
  'Analyzing heading structure...',
  'Checking robots.txt...',
  'Fetching sitemap.xml...',
  'Analyzing schema markup...',
  'Checking image alt texts...',
  'Analyzing links...',
  'Checking analytics setup...',
  'Calculating SEO scores...',
  'Building audit report...',
];

// ── Main Component ─────────────────────────────────────────────
export const IndexScanPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['ON_PAGE','TECHNICAL','SOCIAL','SCHEMA']));
  const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (stepInterval.current) clearInterval(stepInterval.current); }, []);

  const startAudit = async () => {
    if (!url.trim()) return;
    setError('');
    setAudit(null);
    setLoading(true);
    setScanStep(0);

    // Animate steps
    let step = 0;
    stepInterval.current = setInterval(() => {
      step = Math.min(step + 1, SCAN_STEPS.length - 1);
      setScanStep(step);
    }, 900);

    try {
      const res = await fetch('/api/indexscan/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setAudit(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (stepInterval.current) clearInterval(stepInterval.current);
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!audit) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/indexscan/download/${audit.id}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const burl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = burl;
      a.download = `SEO_Audit_${audit.domain}_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(burl);
    } catch (e: any) {
      setError('Download failed: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
  };

  // Group checks by category
  const grouped = audit ? audit.checks.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, SeoCheck[]>) : {};

  const failCount = audit?.checks.filter(c => c.status === 'FAIL').length ?? 0;
  const warnCount = audit?.checks.filter(c => c.status === 'WARN').length ?? 0;
  const passCount = audit?.checks.filter(c => c.status === 'PASS').length ?? 0;

  return (
    <div className="page-body" style={{ maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:12,
          background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)',
          borderRadius:24, padding:'6px 16px' }}>
          <Search size={14} color="#6366f1" />
          <span style={{ fontSize:12, color:'#a5b4fc', fontWeight:600, letterSpacing:2, textTransform:'uppercase' }}>IndexScan</span>
        </div>
        <h1 style={{ fontSize:36, fontWeight:800, background:'linear-gradient(135deg,#f8fafc 0%,#94a3b8 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1.2, marginBottom:10 }}>
          Full SEO Audit Tool
        </h1>
        <p style={{ color:'#64748b', fontSize:15, maxWidth:560, margin:'0 auto' }}>
          যেকোনো website URL দিন — 26+ SEO checks করব এবং professional Excel report download করুন
        </p>
      </div>

      {/* ── Search Box ── */}
      <div className="glass-panel" style={{ padding:28, marginBottom:28 }}>
        <div style={{ display:'flex', gap:12 }}>
          <div style={{ flex:1, position:'relative' }}>
            <Globe size={18} color="#6366f1" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }} />
            <input
              className="input-field"
              style={{ paddingLeft:44, fontSize:15, height:52 }}
              placeholder="https://www.example.com — যেকোনো website URL দিন"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && startAudit()}
              disabled={loading}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ height:52, padding:'0 28px', fontSize:14, minWidth:160, flexShrink:0 }}
            onClick={startAudit}
            disabled={loading || !url.trim()}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Scanning...</> : <><Search size={16} /> Run Audit</>}
          </button>
        </div>

        {/* Sample URLs */}
        <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:'#475569' }}>Try:</span>
          {['https://www.primemovebd.com', 'https://www.google.com', 'https://www.shopify.com'].map(u => (
            <button key={u} onClick={() => setUrl(u)} disabled={loading}
              style={{ fontSize:11, color:'#6366f1', background:'rgba(99,102,241,0.08)',
                border:'1px solid rgba(99,102,241,0.2)', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}>
              {u.replace('https://www.', '')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scanning Animation ── */}
      {loading && (
        <div className="glass-panel" style={{ padding:36, textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
            <div style={{ position:'relative', width:80, height:80 }}>
              <svg width={80} height={80} style={{ position:'absolute', inset:0, animation:'spin 1.5s linear infinite' }}>
                <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth={6} />
                <circle cx={40} cy={40} r={34} fill="none" stroke="#6366f1" strokeWidth={6}
                  strokeDasharray="60 150" strokeLinecap="round" />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Search size={22} color="#6366f1" />
              </div>
            </div>
          </div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Auditing {url}</div>
          <div style={{ color:'#6366f1', fontSize:14, marginBottom:20 }}>
            {SCAN_STEPS[scanStep]}
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap', maxWidth:600, margin:'0 auto' }}>
            {SCAN_STEPS.map((step, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius:'50%',
                background: i <= scanStep ? '#6366f1' : 'rgba(255,255,255,0.1)',
                transition:'background 0.3s',
              }} />
            ))}
          </div>
          <div style={{ marginTop:16, fontSize:12, color:'#475569' }}>
            Checking 26+ SEO factors... Usually takes 10–20 seconds
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ padding:16, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
          borderRadius:12, marginBottom:24, display:'flex', gap:10, alignItems:'flex-start' }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink:0, marginTop:2 }} />
          <div>
            <div style={{ fontWeight:700, color:'#fca5a5', marginBottom:4 }}>Audit Failed</div>
            <div style={{ fontSize:13, color:'#94a3b8' }}>{error}</div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {audit && (
        <div ref={resultRef}>

          {/* Site header + download */}
          <div className="glass-panel" style={{ padding:24, marginBottom:20,
            background:'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.08) 100%)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'rgba(99,102,241,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Globe size={16} color="#6366f1" />
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:18 }}>{audit.domain}</div>
                    <a href={audit.url} target="_blank" rel="noreferrer"
                      style={{ fontSize:12, color:'#6366f1', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                      {audit.url} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, marginTop:8 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>Audited: {new Date(audit.auditedAt).toLocaleString()}</span>
                  <span style={{ fontSize:12, display:'flex', alignItems:'center', gap:4,
                    color: failCount > 0 ? '#ef4444' : '#22c55e' }}>
                    <AlertCircle size={12} /> {failCount} FAIL
                  </span>
                  <span style={{ fontSize:12, color:'#f59e0b' }}>⚠️ {warnCount} WARN</span>
                  <span style={{ fontSize:12, color:'#22c55e' }}>✅ {passCount} PASS</span>
                </div>
              </div>

              <button className="btn btn-emerald" style={{ gap:8, fontSize:14, padding:'12px 24px' }}
                onClick={downloadExcel} disabled={downloading}>
                {downloading
                  ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
                  : <><Download size={16} /> Download Excel Report</>}
              </button>
            </div>
          </div>

          {/* Score rings */}
          <div className="glass-panel" style={{ padding:24, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#94a3b8', textTransform:'uppercase',
              letterSpacing:1, marginBottom:20 }}>SEO Score Overview</div>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', justifyContent:'center' }}>
              <ScoreRing score={audit.scores.overall} label="Overall Score" size={100} />
              <div style={{ width:1, background:'rgba(255,255,255,0.07)' }} />
              {[
                { key: 'onPage', label: 'On-Page' },
                { key: 'technical', label: 'Technical' },
                { key: 'social', label: 'Social/OG' },
                { key: 'schema', label: 'Schema' },
                { key: 'images', label: 'Images' },
                { key: 'performance', label: 'Performance' },
              ].map(({ key, label }) => (
                <ScoreRing key={key} score={(audit.scores as any)[key]} label={label} size={68} />
              ))}
            </div>
          </div>

          {/* Quick stats bar */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12, marginBottom:20 }}>
            {[
              { icon: Shield, label: 'HTTPS', val: audit.isHttps ? '✅ Secure' : '❌ Not Secure', ok: audit.isHttps },
              { icon: Code2, label: 'Schema Types', val: audit.meta.schemaTypes.length > 0 ? audit.meta.schemaTypes[0] : '❌ None', ok: audit.meta.schemaTypes.length > 0 },
              { icon: Share2, label: 'Open Graph', val: audit.meta.ogTitle ? '✅ Present' : '❌ Missing', ok: !!audit.meta.ogTitle },
              { icon: Link2, label: 'Canonical', val: audit.meta.canonical ? '✅ Set' : '❌ Missing', ok: !!audit.meta.canonical },
              { icon: Globe, label: 'Sitemap', val: audit.sitemap.exists ? `✅ ${audit.sitemap.urlCount} URLs` : '❌ Missing', ok: audit.sitemap.exists },
              { icon: BarChart3, label: 'Analytics', val: audit.meta.hasGA ? '✅ Active' : '❌ Missing', ok: audit.meta.hasGA },
            ].map(({ icon: Icon, label, val, ok }) => (
              <div key={label} className="glass-panel" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                  background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={15} color={ok ? '#22c55e' : '#ef4444'} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:12, fontWeight:600, color: ok ? '#22c55e' : '#ef4444' }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Checks by category */}
          <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8', textTransform:'uppercase',
            letterSpacing:1, marginBottom:14 }}>Detailed Check Results</div>

          {Object.entries(CATEGORY_INFO).map(([cat, info]) => {
            const catChecks = grouped[cat] ?? [];
            if (catChecks.length === 0) return null;
            const Icon = info.icon;
            const expanded = expandedCats.has(cat);
            const fails = catChecks.filter(c => c.status === 'FAIL').length;
            const warns = catChecks.filter(c => c.status === 'WARN').length;

            return (
              <div key={cat} className="glass-panel" style={{ marginBottom:12, overflow:'hidden' }}>
                {/* Category header */}
                <button onClick={() => toggleCat(cat)} style={{
                  width:'100%', padding:'14px 20px', display:'flex', alignItems:'center',
                  gap:12, background:'none', border:'none', color:'inherit', cursor:'pointer',
                  borderBottom: expanded ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                    background:`${info.color}18`, border:`1px solid ${info.color}35`,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={17} color={info.color} />
                  </div>
                  <div style={{ flex:1, textAlign:'left' }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{info.label}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>
                      {catChecks.length} checks — {fails > 0 && <span style={{ color:'#ef4444' }}>{fails} fail </span>}
                      {warns > 0 && <span style={{ color:'#f59e0b' }}>{warns} warn </span>}
                      <span style={{ color:'#22c55e' }}>{catChecks.filter(c=>c.status==='PASS').length} pass</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {fails > 0 && <span style={{ fontSize:11, fontWeight:700, color:'#ef4444',
                      background:'rgba(239,68,68,0.1)', padding:'2px 8px', borderRadius:20 }}>
                      {fails} ❌
                    </span>}
                    {warns > 0 && <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b',
                      background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:20 }}>
                      {warns} ⚠️
                    </span>}
                    {expanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                  </div>
                </button>

                {/* Check rows */}
                {expanded && catChecks.map((check) => (
                  <div key={check.id} style={{
                    padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.04)',
                    display:'grid', gridTemplateColumns:'1fr auto', gap:16, alignItems:'start',
                    background: check.status === 'FAIL' ? 'rgba(239,68,68,0.03)'
                              : check.status === 'WARN' ? 'rgba(245,158,11,0.03)' : 'transparent',
                  }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <StatusBadge status={check.status} />
                        <span style={{ fontWeight:600, fontSize:13 }}>{check.name}</span>
                        <span style={{ fontSize:10, color:'#475569', background:'rgba(255,255,255,0.04)',
                          padding:'2px 6px', borderRadius:4 }}>{check.severity}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#94a3b8', marginBottom: check.status !== 'PASS' ? 6 : 0 }}>
                        <span style={{ color:'#475569' }}>Current: </span>{check.current}
                      </div>
                      {check.status !== 'PASS' && (
                        <div style={{ fontSize:12, color:'#6366f1', display:'flex', gap:6, alignItems:'flex-start' }}>
                          <Info size={12} style={{ flexShrink:0, marginTop:1 }} />
                          <span>{check.recommended}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span style={{ fontSize:11, color:'#64748b', background:'rgba(255,255,255,0.04)',
                        padding:'3px 8px', borderRadius:6, whiteSpace:'nowrap' }}>
                        ⏱ {check.effort}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Download CTA */}
          <div className="glass-panel" style={{ padding:28, textAlign:'center', marginTop:12,
            background:'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 100%)' }}>
            <FileSpreadsheet size={32} color="#10b981" style={{ marginBottom:12 }} />
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Professional Excel Report Ready</div>
            <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>
              7 sheets: Executive Summary, Critical Issues, All Checks, Schema Code, Action Plan, Sitemap, Keywords
            </div>
            <button className="btn btn-emerald" style={{ padding:'14px 32px', fontSize:15 }}
              onClick={downloadExcel} disabled={downloading}>
              {downloading
                ? <><Loader2 size={18} className="animate-spin" /> Generating Excel...</>
                : <><Download size={18} /> Download Excel Report (.xlsx)</>}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default IndexScanPage;
