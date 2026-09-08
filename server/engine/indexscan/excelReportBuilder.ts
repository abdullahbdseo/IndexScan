// ============================================================
//  IndexScan — Professional Excel Report Builder (7 Sheets)
//  Uses exceljs
// ============================================================
import ExcelJS from 'exceljs';
import type { AuditResult, SeoCheck } from './seoAuditEngine.js';

const C = {
  maroon    : 'FF700D18',
  maroonDk  : 'FF56141D',
  gold      : 'FFC6923E',
  ivory     : 'FFFAF7F1',
  white     : 'FFFFFFFF',
  black     : 'FF1F2937',
  gray      : 'FF6B7280',
  grayBg    : 'FFF9FAFB',
  red       : 'FFEF4444',
  redBg     : 'FFFEF2F2',
  yellow    : 'FFCA8A04',
  yellowBg  : 'FFFEFCE8',
  green     : 'FF16A34A',
  greenBg   : 'FFF0FDF4',
  indigo    : 'FF4F46E5',
  indigoBg  : 'FFEEF2FF',
  headerBg  : 'FF1E293B',
  subHdrBg  : 'FF334155',
  slate     : 'FF475569',
};

type CellStyle = {
  bold?: boolean; italic?: boolean; fontSize?: number; color?: string;
  bg?: string; align?: 'left'|'center'|'right'; valign?: 'top'|'middle'|'bottom';
  wrap?: boolean; border?: boolean;
};

function s(cell: ExcelJS.Cell, o: CellStyle = {}) {
  const { bold=false, italic=false, fontSize=10, color=C.black, bg, align='left',
    valign='middle', wrap=true, border=true } = o;
  cell.font = { bold, italic, size: fontSize, color: { argb: color } };
  cell.alignment = { horizontal: align, vertical: valign, wrapText: wrap };
  if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  if (border) {
    const bs: ExcelJS.Border = { style: 'thin', color: { argb: 'FFE5E7EB' } };
    cell.border = { top: bs, left: bs, bottom: bs, right: bs };
  }
}

function titleRow(ws: ExcelJS.Worksheet, text: string, r: number, cols: number, bg = C.maroon) {
  const end = String.fromCharCode(64 + cols);
  ws.mergeCells(`A${r}:${end}${r}`);
  const cell = ws.getCell(`A${r}`);
  cell.value = text;
  s(cell, { bold: true, fontSize: 14, color: C.white, bg, align: 'center' });
  ws.getRow(r).height = 36;
}

function subHdrRow(ws: ExcelJS.Worksheet, cols: string[], r: number) {
  ws.getRow(r).height = 22;
  cols.forEach((col, i) => {
    const cell = ws.getCell(`${String.fromCharCode(65+i)}${r}`);
    cell.value = col;
    s(cell, { bold: true, fontSize: 9, color: C.white, bg: C.subHdrBg, align: 'center' });
  });
}

function statusOf(status: string): { label: string; color: string; bg: string } {
  if (status === 'PASS') return { label: '✅ PASS',  color: C.green,  bg: C.greenBg  };
  if (status === 'WARN') return { label: '⚠️ WARN',  color: C.yellow, bg: C.yellowBg };
  if (status === 'FAIL') return { label: '❌ FAIL',  color: C.red,    bg: C.redBg    };
  return { label: status, color: C.gray, bg: C.grayBg };
}

function scoreColor(n: number): { color: string; bg: string } {
  if (n >= 75) return { color: C.green,  bg: C.greenBg  };
  if (n >= 50) return { color: C.yellow, bg: C.yellowBg };
  return         { color: C.red,    bg: C.redBg    };
}

function priorityStyle(p: string): { color: string; bg: string } {
  if (p === 'CRITICAL') return { color: C.red,    bg: C.redBg    };
  if (p === 'HIGH')     return { color: C.yellow, bg: C.yellowBg };
  if (p === 'MEDIUM')   return { color: C.indigo, bg: C.indigoBg };
  return                       { color: C.green,  bg: C.greenBg  };
}

// ── Sheet 1: Executive Summary ─────────────────────────────────
function sheetSummary(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('📊 Executive Summary', { properties: { tabColor: { argb: C.maroon } } });
  ws.columns = [
    { width: 3 },{ width: 26 },{ width: 16 },{ width: 14 },{ width: 46 },{ width: 14 },
  ];

  // Title block
  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = `🔍  SEO AUDIT REPORT — ${a.domain.toUpperCase()}`;
  s(t, { bold: true, fontSize: 18, color: C.white, bg: C.maroon, align: 'center' });
  ws.getRow(1).height = 50;

  ws.mergeCells('A2:F2');
  const sub = ws.getCell('A2');
  sub.value = `URL: ${a.url}   |   Audited: ${new Date(a.auditedAt).toLocaleString()}   |   By IndexScan AI`;
  s(sub, { italic: true, fontSize: 10, color: C.gray, bg: C.ivory, align: 'center' });
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 8;
  titleRow(ws, '📈  OVERALL SEO SCORE CARD', 4, 6);
  subHdrRow(ws, ['#', 'Category', 'Score', 'Rating', 'Key Finding', 'Priority'], 5);

  const cats = [
    [1, 'On-Page SEO',            a.scores.onPage,    a.scores.onPage >= 75 ? 'PASS' : a.scores.onPage >= 50 ? 'WARN' : 'FAIL', 'Title, description, headings, meta', 'HIGH'],
    [2, 'Technical SEO',          a.scores.technical, a.scores.technical >= 75 ? 'PASS' : 'WARN', 'Canonical, HTTPS, robots.txt, sitemap', 'HIGH'],
    [3, 'Social (OG & Twitter)',  a.scores.social,    a.scores.social >= 75 ? 'PASS' : a.scores.social === 0 ? 'FAIL' : 'WARN', 'Open Graph & Twitter Card tags', 'CRITICAL'],
    [4, 'Schema / Structured Data', a.scores.schema,  a.scores.schema > 0 ? 'WARN' : 'FAIL', 'JSON-LD LocalBusiness, Service schemas', 'CRITICAL'],
    [5, 'Images & Media',         a.scores.images,    a.scores.images >= 75 ? 'PASS' : 'WARN', `${a.meta.imagesMissingAlt} images missing alt text`, 'MEDIUM'],
    [6, 'Performance',            a.scores.performance, a.scores.performance >= 75 ? 'PASS' : 'WARN', 'Preload, DNS prefetch, CDN usage', 'MEDIUM'],
    [7, 'OVERALL SCORE',          a.scores.overall,   a.scores.overall >= 75 ? 'PASS' : a.scores.overall >= 50 ? 'WARN' : 'FAIL', `${a.checks.filter(c => c.status === 'FAIL').length} FAIL, ${a.checks.filter(c => c.status === 'WARN').length} WARN, ${a.checks.filter(c => c.status === 'PASS').length} PASS`, '—'],
  ];

  cats.forEach(([num, cat, score, rating, finding, priority], i) => {
    const r = 6 + i;
    ws.getRow(r).height = 24;
    const even = r % 2 === 0;
    const sc = scoreColor(score as number);
    const st = statusOf(rating as string);

    ['A','B','C','D','E','F'].forEach((L, j) => {
      const cell = ws.getCell(`${L}${r}`);
      if (j === 0) { cell.value = num; s(cell, { bold: true, fontSize: 10, align: 'center', bg: even ? C.ivory : C.white }); }
      else if (j === 1) { cell.value = cat; s(cell, { bold: i === 6, fontSize: 10, bg: even ? C.ivory : C.white }); }
      else if (j === 2) {
        cell.value = `${score}/100`;
        s(cell, { bold: true, fontSize: 11, color: sc.color, bg: sc.bg, align: 'center' });
      }
      else if (j === 3) { cell.value = st.label; s(cell, { bold: true, fontSize: 9, color: st.color, bg: st.bg, align: 'center' }); }
      else if (j === 4) { cell.value = finding; s(cell, { fontSize: 9, bg: even ? C.ivory : C.white }); }
      else { cell.value = priority; const ps = priorityStyle(priority as string); s(cell, { bold: true, fontSize: 9, color: ps.color, bg: ps.bg, align: 'center' }); }
    });
  });

  // Quick Stats
  let r = 6 + cats.length + 2;
  titleRow(ws, '📌  QUICK STATS', r, 6);
  r++;

  const stats: [string, string, string, string][] = [
    ['🌐 Domain',           a.domain,                       '🔒 HTTPS',        a.isHttps ? '✅ Secure' : '❌ Not Secure'],
    ['📞 Phone',            a.meta.phone || '(not found)',  '📧 Email',        a.meta.email || '(not found)'],
    ['🏷️ OG Tags',          a.meta.ogTitle ? '✅ Present' : '❌ MISSING',       '🐦 Twitter Card', a.meta.twitterCard ? '✅ Present' : '❌ MISSING'],
    ['🔗 Canonical',        a.meta.canonical ? '✅ Present' : '❌ MISSING',     '🧩 Schema',       a.meta.schemaTypes.length > 0 ? `✅ ${a.meta.schemaTypes.join(', ')}` : '❌ MISSING'],
    ['🤖 Robots.txt',       a.robotsTxt.exists ? '✅ Exists' : '❌ Missing',   '🗺️ Sitemap',       a.sitemap.exists ? `✅ ${a.sitemap.urlCount} URLs` : '❌ Missing'],
    ['📊 Analytics',        a.meta.hasGA ? '✅ GA4 Active' : '❌ Not detected', '🖼️ Images Alt',   `${a.meta.imagesTotal - a.meta.imagesMissingAlt}/${a.meta.imagesTotal} have alt`],
    ['🔗 Internal Links',   `${a.meta.internalLinks}`,     '🌍 External Links', `${a.meta.externalLinks}`],
    ['📱 Social Profiles',  `${a.meta.socialLinks.length} found`,            '🔍 Google Verified', a.meta.googleVerification ? '✅ Yes' : '❌ No'],
  ];

  stats.forEach(([k1, v1, k2, v2]) => {
    ws.getRow(r).height = 22;
    const even = r % 2 === 0;
    (['A','B','C','D'] as const).forEach((L, j) => {
      const cell = ws.getCell(`${L}${r}`);
      const val  = [k1, v1, k2, v2][j];
      const isKey = j === 0 || j === 2;
      cell.value  = val;
      if (isKey) s(cell, { bold: true, fontSize: 10, color: C.maroon, bg: C.ivory });
      else {
        const miss = String(val).includes('MISSING') || String(val).includes('❌');
        s(cell, { fontSize: 10, bold: miss, color: miss ? C.red : C.black, bg: even ? C.grayBg : C.white });
      }
    });
    r++;
  });
}

// ── Sheet 2: All Checks ────────────────────────────────────────
function sheetAllChecks(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('📋 All SEO Checks', { properties: { tabColor: { argb: 'FF6366F1' } } });
  ws.columns = [
    { width: 22 }, { width: 14 }, { width: 12 }, { width: 42 }, { width: 42 }, { width: 12 },
  ];
  titleRow(ws, '📋  ALL SEO CHECKS — ' + a.domain, 1, 6);
  subHdrRow(ws, ['Check Name', 'Category', 'Status', 'Current State', 'Recommendation', 'Effort'], 2);

  a.checks.forEach((c, i) => {
    const r = 3 + i;
    ws.getRow(r).height = 44;
    const even = r % 2 === 0;
    const st = statusOf(c.status);
    const catColors: Record<string, string> = {
      ON_PAGE: C.indigo, TECHNICAL: C.slate, SOCIAL: C.gold,
      SCHEMA: 'FF8B5CF6', IMAGES: 'FF0EA5E9', ANALYTICS: C.green, PERFORMANCE: C.yellow, LINKS: 'FF14B8A6',
    };

    ['A','B','C','D','E','F'].forEach((L, j) => {
      const cell = ws.getCell(`${L}${r}`);
      const vals = [c.name, c.category.replace('_', ' '), c.status, c.current, c.recommended, c.effort];
      cell.value = vals[j];
      if (j === 0) s(cell, { bold: true, fontSize: 9, bg: even ? C.ivory : C.white });
      else if (j === 1) s(cell, { bold: true, fontSize: 9, color: catColors[c.category] ?? C.slate, bg: even ? C.ivory : C.white, align: 'center' });
      else if (j === 2) { s(cell, { bold: true, fontSize: 9, color: st.color, bg: st.bg, align: 'center' }); }
      else s(cell, { fontSize: 9, bg: even ? C.ivory : C.white });
    });
  });
}

// ── Sheet 3: Critical Issues ───────────────────────────────────
function sheetCritical(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('🔴 Critical Issues', { properties: { tabColor: { argb: 'FFEF4444' } } });
  ws.columns = [{ width: 26 },{ width: 12 },{ width: 14 },{ width: 40 },{ width: 44 },{ width: 12 }];
  titleRow(ws, '🔴  CRITICAL & HIGH PRIORITY ISSUES', 1, 6, 'FFDC2626');
  subHdrRow(ws, ['Issue', 'Severity', 'Category', 'Current State', 'Fix Required', 'Effort'], 2);

  const critical = a.checks.filter(c => c.status === 'FAIL' || (c.status === 'WARN' && c.severity === 'CRITICAL'))
    .sort((x, y) => { const o = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 }; return (o[x.severity]??9) - (o[y.severity]??9); });

  if (critical.length === 0) {
    ws.mergeCells('A3:F3');
    const cell = ws.getCell('A3');
    cell.value = '🎉 No critical issues found! Site is well optimized.';
    s(cell, { bold: true, fontSize: 12, color: C.green, bg: C.greenBg, align: 'center' });
    ws.getRow(3).height = 40;
    return;
  }

  critical.forEach((c, i) => {
    const r = 3 + i;
    ws.getRow(r).height = 52;
    const even = r % 2 === 0;
    const ps = priorityStyle(c.severity);

    ['A','B','C','D','E','F'].forEach((L, j) => {
      const cell = ws.getCell(`${L}${r}`);
      const vals = [c.name, c.severity, c.category.replace('_',' '), c.current, c.recommended, c.effort];
      cell.value = vals[j];
      if (j === 1) s(cell, { bold:true, fontSize:9, color: ps.color, bg: ps.bg, align:'center' });
      else if (j === 2) s(cell, { bold:true, fontSize:9, color: C.slate, align:'center', bg: even ? C.ivory : C.white });
      else s(cell, { fontSize:9, bg: even ? C.ivory : C.white });
    });
  });
}

// ── Sheet 4: Schema Code ───────────────────────────────────────
function sheetSchema(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('🧩 Schema Code', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  ws.columns = [{ width: 110 }];
  titleRow(ws, '🧩  RECOMMENDED SCHEMA MARKUP — Copy & Paste into <head>', 1, 1);

  const schemaCode = `<!-- 1. LocalBusiness Schema — Add to Homepage <head> -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${a.domain}",
  "description": "${a.meta.description.slice(0, 120) || 'Professional services'}",
  "url": "${a.url}",
  "telephone": "${a.meta.phone || '+880XXXXXXXXXX'}",
  "email": "${a.meta.email || 'contact@' + a.domain}",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "BD"
  },
  "areaServed": "Bangladesh"
}
</script>

<!-- 2. Open Graph Tags — Add to EVERY page <head> -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="${a.domain}">
<meta property="og:title"       content="${a.meta.title || a.domain}">
<meta property="og:description" content="${a.meta.description.slice(0, 155) || 'Professional services'}">
<meta property="og:image"       content="${a.url}og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height"content="630">
<meta property="og:url"         content="${a.url}">

<!-- 3. Twitter Card Tags — Add to EVERY page <head> -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${a.meta.title || a.domain}">
<meta name="twitter:description" content="${a.meta.description.slice(0, 155) || 'Professional services'}">
<meta name="twitter:image"       content="${a.url}og-image.jpg">

<!-- 4. Canonical URL — Unique per page -->
<link rel="canonical" href="${a.url}">

<!-- 5. Google Analytics 4 — Replace G-XXXXXXXX -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXX');
</script>`;

  let r = 2;
  schemaCode.split('\n').forEach(line => {
    ws.getRow(r).height = 15;
    const cell = ws.getCell(`A${r}`);
    cell.value = line;
    const isComment = line.trim().startsWith('<!--') || line.trim().startsWith('#');
    s(cell, {
      fontSize: 9,
      bold: isComment,
      color: isComment ? C.maroon : C.black,
      bg: isComment ? C.ivory : C.grayBg,
      wrap: false,
      border: false,
    });
    r++;
  });
}

// ── Sheet 5: Action Plan ───────────────────────────────────────
function sheetActionPlan(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('🚀 Action Plan', { properties: { tabColor: { argb: C.green } } });
  ws.columns = [
    { width: 3 },{ width: 30 },{ width: 14 },{ width: 12 },{ width: 12 },{ width: 42 },{ width: 12 },
  ];
  titleRow(ws, '🚀  PRIORITIZED SEO ACTION PLAN — ' + a.domain, 1, 7);

  const weekGroup = (label: string, bg: string, r: number) => {
    titleRow(ws, label, r, 7, bg);
    subHdrRow(ws, ['#', 'Task', 'Category', 'Effort', 'Impact', 'How To Fix', 'Status'], r + 1);
    return r + 2;
  };

  const addRows = (ws: ExcelJS.Worksheet, items: any[][], startR: number) => {
    items.forEach(([num, task, cat, effort, impact, fix, status], i) => {
      const r = startR + i;
      ws.getRow(r).height = 40;
      const even = r % 2 === 0;
      const ps = priorityStyle(impact.replace('🔴 ','').replace('🟡 ','').replace('🟢 ',''));
      ['A','B','C','D','E','F','G'].forEach((L, j) => {
        const cell = ws.getCell(`${L}${r}`);
        const vals = [num, task, cat, effort, impact, fix, status];
        cell.value = vals[j];
        if (j === 4) s(cell, { bold:true, fontSize:9, color: ps.color, bg: ps.bg, align:'center' });
        else if (j === 6) s(cell, { bold:true, fontSize:9, color: C.maroon, bg: C.ivory, align:'center' });
        else s(cell, { fontSize:9, bg: even ? C.ivory : C.white });
      });
    });
    return startR + items.length + 1;
  };

  // Build week 1 from FAIL checks
  const fails = a.checks.filter(c => c.status === 'FAIL').slice(0, 7);
  const week1Items = fails.map((c, i) => [
    i+1, c.name, c.category.replace('_',' '), c.effort, '🔴 CRITICAL', c.recommended, '☐ TODO',
  ]);
  if (week1Items.length === 0) week1Items.push([1, 'No critical fails found — maintain current SEO!', 'ALL', '—', '🟢 LOW', 'Continue monitoring and expanding content', '✅ Done']);

  let r = weekGroup('🔴  WEEK 1 — Fix Critical Issues Now', 'FFDC2626', 2);
  r = addRows(ws, week1Items, r);

  // Week 2 from WARN checks
  const warns = a.checks.filter(c => c.status === 'WARN').slice(0, 6);
  const week2Items = warns.map((c, i) => [
    i+1, c.name, c.category.replace('_',' '), c.effort, '🟡 HIGH', c.recommended, '☐ TODO',
  ]);
  if (week2Items.length === 0) week2Items.push([1, 'No warnings found', 'ALL', '—', '🟢 LOW', 'Site is performing well!', '✅ Done']);

  r = weekGroup('🟡  WEEK 2 — Fix Warnings', 'FFCA8A04', r + 1);
  r = addRows(ws, week2Items, r);

  // Month 1
  const month1: any[][] = [
    [1, 'Complete XML Sitemap with all pages', 'Technical', '2 hrs', '🟢 MEDIUM', 'Add all service, blog, product URLs to sitemap.xml', '☐ TODO'],
    [2, 'Add FAQ Schema to FAQ sections', 'Schema', '2 hrs', '🟢 MEDIUM', 'FAQPage JSON-LD for rich results in Google', '☐ TODO'],
    [3, 'Add Review/AggregateRating Schema', 'Schema', '2 hrs', '🟢 MEDIUM', 'Enable star ratings in SERP for higher CTR', '☐ TODO'],
    [4, 'Add BreadcrumbList Schema', 'Schema', '1 hr', '🟢 LOW', 'Better navigation display in search results', '☐ TODO'],
    [5, 'Create location-specific landing pages', 'Content', '10 hrs', '🟢 MEDIUM', 'Separate pages for each city/area served', '☐ TODO'],
    [6, 'Internal linking strategy', 'Links', '4 hrs', '🟢 MEDIUM', 'Cross-link service, blog, location pages', '☐ TODO'],
    [7, 'Optimize image sizes and lazy loading', 'Performance', '2 hrs', '🟢 LOW', 'Add loading="lazy" to below-fold images', '☐ TODO'],
    [8, 'Submit sitemap to Google Search Console', 'Technical', '30 min', '🟢 HIGH', 'GSC → Sitemaps → Submit sitemap.xml', '☐ TODO'],
  ];
  r = weekGroup('🟢  MONTH 1 — Long-term Growth', C.subHdrBg, r + 1);
  addRows(ws, month1, r);
}

// ── Sheet 6: Sitemap Analysis ──────────────────────────────────
function sheetSitemap(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('🗺️ Sitemap & Links', { properties: { tabColor: { argb: '  FF0EA5E9' } } });
  ws.columns = [{ width: 6 },{ width: 70 },{ width: 16 }];
  titleRow(ws, '🗺️  SITEMAP URLS & LINK ANALYSIS — ' + a.domain, 1, 3);

  ws.mergeCells('A2:C2');
  const info = ws.getCell('A2');
  info.value = `Sitemap: ${a.sitemap.exists ? `✅ Found — ${a.sitemap.urlCount} URLs` : '❌ Not found at /sitemap.xml'}   |   Internal Links: ${a.meta.internalLinks}   |   External Links: ${a.meta.externalLinks}`;
  s(info, { bold: true, fontSize: 10, color: C.maroon, bg: C.ivory, align: 'center' });
  ws.getRow(2).height = 24;

  subHdrRow(ws, ['#', 'URL Found in Sitemap', 'Notes'], 3);

  if (a.sitemap.urls.length === 0) {
    ws.mergeCells('A4:C4');
    const cell = ws.getCell('A4');
    cell.value = a.sitemap.exists ? 'Sitemap exists but no <loc> URLs could be parsed' : 'Sitemap not found — create and submit sitemap.xml to Google Search Console';
    s(cell, { bold: true, fontSize: 10, color: C.red, bg: C.redBg, align: 'center' });
    ws.getRow(4).height = 30;
  } else {
    a.sitemap.urls.forEach((url, i) => {
      const r = 4 + i;
      ws.getRow(r).height = 20;
      const even = r % 2 === 0;
      [['A', i+1],['B', url],['C', url === a.url ? '🏠 Homepage' : url.includes('blog') ? '📝 Blog' : url.includes('service') ? '🔧 Service' : '📄 Page']].forEach(([L, v]) => {
        const cell = ws.getCell(`${L}${r}`);
        cell.value = v;
        s(cell, { fontSize: 9, align: L === 'A' ? 'center' : 'left', bg: even ? C.ivory : C.white });
      });
    });
  }
}

// ── Sheet 7: Keyword Plan ──────────────────────────────────────
function sheetKeywords(wb: ExcelJS.Workbook, a: AuditResult) {
  const ws = wb.addWorksheet('🔑 Keyword Plan', { properties: { tabColor: { argb: C.gold } } });
  ws.columns = [{ width: 40 },{ width: 14 },{ width: 14 },{ width: 14 },{ width: 30 }];
  titleRow(ws, '🔑  TARGET KEYWORD PLAN — ' + a.domain, 1, 5);
  subHdrRow(ws, ['Keyword', 'Type', 'Intent', 'Competition', 'Target Page'], 2);

  const allKw = [
    ...a.keywords.primary.map(k => [k, '🔴 Primary', 'Commercial', 'HIGH', 'Homepage']),
    ...a.keywords.secondary.map(k => [k, '🟡 Secondary', 'Commercial', 'MED', 'Service Pages']),
    ...a.keywords.longtail.map(k => [k, '🟢 Long-tail', 'Local', 'LOW', 'Location Pages']),
    // Generic suggestions
    [a.domain + ' review', '🟢 Brand', 'Navigational', 'LOW', 'Homepage'],
    ['best ' + a.domain.replace(/\.(com|net|org|bd)$/, ''), '🟡 Secondary', 'Commercial', 'MED', 'Homepage'],
    [a.domain.replace(/\.(com|net|org|bd)$/, '') + ' near me', '🟢 Local', 'Local', 'LOW', 'Location Pages'],
  ];

  allKw.forEach((row, i) => {
    const r = 3 + i;
    ws.getRow(r).height = 22;
    const even = r % 2 === 0;
    const type = String(row[1]);
    const typeCl = type.includes('Primary') ? { color: C.red, bg: C.redBg }
                 : type.includes('Secondary') ? { color: C.yellow, bg: C.yellowBg }
                 : { color: C.green, bg: C.greenBg };

    row.forEach((v, j) => {
      const cell = ws.getCell(`${String.fromCharCode(65+j)}${r}`);
      cell.value = v;
      if (j === 1) s(cell, { bold: true, fontSize: 9, color: typeCl.color, bg: typeCl.bg, align: 'center' });
      else if (j === 3) {
        const comp = String(v);
        const cc = comp === 'HIGH' ? { color: C.red, bg: C.redBg }
                 : comp === 'MED'  ? { color: C.yellow, bg: C.yellowBg }
                 : { color: C.green, bg: C.greenBg };
        s(cell, { bold: true, fontSize: 9, color: cc.color, bg: cc.bg, align: 'center' });
      } else s(cell, { fontSize: 9, bg: even ? C.ivory : C.white });
    });
  });
}

// ── Main export ────────────────────────────────────────────────
export async function buildExcelReport(audit: AuditResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IndexScan AI';
  wb.created = new Date();
  wb.title = `SEO Audit — ${audit.domain}`;

  sheetSummary(wb, audit);
  sheetAllChecks(wb, audit);
  sheetCritical(wb, audit);
  sheetSchema(wb, audit);
  sheetActionPlan(wb, audit);
  sheetSitemap(wb, audit);
  sheetKeywords(wb, audit);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
