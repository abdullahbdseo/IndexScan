// ============================================================
//  IndexScan SEO Audit Engine
//  Fetches any URL and runs 26+ SEO checks + Image URL Extraction
// ============================================================
import * as cheerio from 'cheerio';

export interface SeoCheck {
  id: string;
  category: 'ON_PAGE' | 'TECHNICAL' | 'SOCIAL' | 'SCHEMA' | 'IMAGES' | 'LINKS' | 'ANALYTICS' | 'PERFORMANCE';
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  current: string;
  recommended: string;
  effort: string;
  impact: string;
}

export interface ImageAuditItem {
  src: string;
  alt: string;
  hasAlt: boolean;
  suggestedAlt: string;
  isNextGen: boolean;
}

export interface PageMeta {
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  keywords: string;
  h1: string[];
  h2: string[];
  h3: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterImage: string;
  canonical: string;
  lang: string;
  viewport: string;
  favicon: string;
  faviconType: string;
  schemaTypes: string[];
  schemaRaw: string[];
  imagesMissingAlt: number;
  imagesTotal: number;
  imagesList: ImageAuditItem[];
  missingAltUrls: string[];
  internalLinks: number;
  externalLinks: number;
  hasGA: boolean;
  hasGTM: boolean;
  hasPreload: boolean;
  hasDnsPrefetch: boolean;
  hasTailwindCDN: boolean;
  hasHeroAsBg: boolean;
  robotsMeta: string;
  fbVerification: string;
  googleVerification: string;
  socialLinks: string[];
  phone: string;
  email: string;
}

export interface AuditResult {
  id: string;
  url: string;
  auditedAt: string;
  domain: string;
  isHttps: boolean;
  robotsTxt: { exists: boolean; content: string; sitemapLinked: boolean; adminBlocked: boolean };
  sitemap: { exists: boolean; urlCount: number; urls: string[] };
  meta: PageMeta;
  checks: SeoCheck[];
  imagesList: ImageAuditItem[];
  missingAltUrls: string[];
  scores: {
    overall: number;
    onPage: number;
    technical: number;
    social: number;
    schema: number;
    images: number;
    performance: number;
  };
  keywords: { primary: string[]; secondary: string[]; longtail: string[] };
}

// ── Fetch helpers ──────────────────────────────────────────
async function fetchUrl(url: string, timeout = 12000): Promise<{ html: string; finalUrl: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IndexScanBot/1.0; +https://indexscan.io)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const html = await res.text();
    return { html, finalUrl: res.url, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string): Promise<{ text: string; ok: boolean }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IndexScanBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    return { text: await res.text(), ok: res.ok };
  } catch {
    return { text: '', ok: false };
  }
}

// ── Score calculation ───────────────────────────────────────
function calcScore(checks: SeoCheck[], category?: SeoCheck['category']): number {
  const filtered = category ? checks.filter(c => c.category === category) : checks;
  if (filtered.length === 0) return 100;
  const weights = { CRITICAL: 25, HIGH: 12, MEDIUM: 6, LOW: 2 };
  let maxPossible = 0;
  let earned = 0;
  for (const c of filtered) {
    const w = weights[c.severity] ?? 4;
    maxPossible += w;
    if (c.status === 'PASS') earned += w;
    else if (c.status === 'WARN') earned += w * 0.5;
  }
  return maxPossible === 0 ? 100 : Math.round((earned / maxPossible) * 100);
}

// ── Main audit function ─────────────────────────────────────
export async function runSeoAudit(inputUrl: string): Promise<AuditResult> {
  // Normalize URL
  if (!inputUrl.startsWith('http')) inputUrl = 'https://' + inputUrl;
  const urlObj = new URL(inputUrl);
  const baseUrl = urlObj.origin;
  const domain = urlObj.hostname.replace('www.', '');

  // Fetch homepage
  const { html, finalUrl } = await fetchUrl(inputUrl);
  const $ = cheerio.load(html);

  // robots.txt
  const robotsRes = await fetchText(`${baseUrl}/robots.txt`);
  const robotsText = robotsRes.text;
  const sitemapInRobots = /sitemap:/i.test(robotsText);
  const adminBlocked = /disallow:\s*\/admin|disallow:\s*\/wp-admin|disallow:\s*\/panel/i.test(robotsText);

  // sitemap.xml
  const sitemapRes = await fetchText(`${baseUrl}/sitemap.xml`);
  const sitemapText = sitemapRes.text;
  const sitemapUrls = (sitemapText.match(/<loc>(.*?)<\/loc>/g) || [])
    .map(s => s.replace(/<\/?loc>/g, '').trim());

  // ── Parse meta ──────────────────────────────────────────
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() ?? '';
  const keywords = $('meta[name="keywords"]').attr('content')?.trim() ?? '';
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? '';
  const lang = $('html').attr('lang')?.trim() ?? '';
  const viewport = $('meta[name="viewport"]').attr('content')?.trim() ?? '';
  const robotsMeta = $('meta[name="robots"]').attr('content')?.trim() ?? '';
  const googleVerification = $('meta[name="google-site-verification"]').attr('content')?.trim() ?? '';
  const fbVerification = $('meta[name="facebook-domain-verification"]').attr('content')?.trim() ?? '';

  const faviconEl = $('link[rel="icon"], link[rel="shortcut icon"]').first();
  const favicon = faviconEl.attr('href')?.trim() ?? '';
  const faviconType = faviconEl.attr('type')?.trim() ?? '';

  // OG
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() ?? '';
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() ?? '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() ?? '';
  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() ?? '';
  const ogType = $('meta[property="og:type"]').attr('content')?.trim() ?? '';

  // Twitter
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() ?? '';
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() ?? '';
  const twitterImage = $('meta[name="twitter:image"]').attr('content')?.trim() ?? '';

  // Headings
  const h1: string[] = [];
  const h2: string[] = [];
  const h3: string[] = [];
  $('h1').each((_, el) => { h1.push($(el).text().trim().slice(0, 120)); });
  $('h2').each((_, el) => { h2.push($(el).text().trim().slice(0, 120)); });
  $('h3').each((_, el) => { h3.push($(el).text().trim().slice(0, 120)); });

  // Schema
  const schemaRaw: string[] = [];
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()?.trim() ?? '';
    schemaRaw.push(raw);
    try {
      const parsed = JSON.parse(raw);
      const t = parsed['@type'];
      if (t) schemaTypes.push(Array.isArray(t) ? t.join(', ') : t);
    } catch { /* skip */ }
  });

  // ── Images with Full URL Extraction ──────────────────────
  const imagesList: ImageAuditItem[] = [];
  const missingAltUrls: string[] = [];
  let webpCount = 0;

  $('img').each((_, el) => {
    let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
    if (!src && $(el).attr('srcset')) {
      src = $(el).attr('srcset')!.split(',')[0].trim().split(' ')[0];
    }
    src = (src || '').trim();
    if (!src || src.startsWith('data:image/svg') || src.length < 5) return;

    // Resolve relative URL to absolute URL
    if (src.startsWith('//')) {
      src = 'https:' + src;
    } else if (src.startsWith('/')) {
      try {
        const origin = new URL(finalUrl).origin;
        src = origin + src;
      } catch { /* skip */ }
    } else if (!src.startsWith('http://') && !src.startsWith('https://')) {
      try {
        src = new URL(src, finalUrl).href;
      } catch { /* skip */ }
    }

    const alt = $(el).attr('alt')?.trim() ?? '';
    const hasAlt = alt.length > 0;
    const isNextGen = /\.webp|\.avif/i.test(src);
    if (isNextGen) webpCount++;

    // Smart suggested Alt Text based on filename and page title
    let suggestedAlt = '';
    try {
      const pathname = new URL(src).pathname;
      const rawName = pathname.split('/').pop()?.split('.')[0] || '';
      const cleanName = decodeURIComponent(rawName)
        .replace(/[-_]/g, ' ')
        .replace(/\b\d+x\d+\b/g, '')
        .replace(/\d+/g, '')
        .trim();
      if (cleanName.length >= 3) {
        suggestedAlt = `${cleanName} - ${title.slice(0, 30)}`.trim();
      } else {
        suggestedAlt = `${title.slice(0, 40)} image`.trim();
      }
    } catch {
      suggestedAlt = `${title.slice(0, 40)} image`.trim();
    }

    if (!hasAlt) {
      missingAltUrls.push(src);
    }

    imagesList.push({ src, alt, hasAlt, suggestedAlt, isNextGen });
  });

  const imagesTotal = imagesList.length;
  const imagesMissingAlt = missingAltUrls.length;

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('http') && !href.includes(domain)) externalLinks++;
    else if (href.startsWith('/') || href.includes(domain)) internalLinks++;
  });

  // Analytics
  const rawHtml = html.toLowerCase();
  const hasGA = /gtag\(|google-analytics\.com|_ga|ga\.js|analytics\.js|googletagmanager\.com\/gtag/.test(rawHtml)
    && /g-[a-z0-9]{8,}|ua-\d{7,}/i.test(html);
  const hasGTM = /googletagmanager\.com\/gtm\.js/.test(rawHtml);
  const hasPreload = /<link[^>]+rel=["']preload["']/.test(html);
  const hasDnsPrefetch = /<link[^>]+rel=["']dns-prefetch["']/.test(html);
  const hasTailwindCDN = /cdn\.tailwindcss\.com/.test(html);
  const hasHeroAsBg = /background-image\s*:\s*url\(/i.test(html) && imagesTotal < 3;

  // Social links
  const socialPlatforms = ['facebook.com/', 'instagram.com/', 'twitter.com/', 'youtube.com/', 'linkedin.com/', 'wa.me/', 'whatsapp.com/'];
  const socialLinks: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (socialPlatforms.some(p => href.includes(p)) && !socialLinks.includes(href)) {
      socialLinks.push(href);
    }
  });

  // Contact
  const phoneMatch = html.match(/(?:\+?880|0)[\s-]?1[3-9]\d{8}/);
  const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phone = phoneMatch?.[0] ?? '';
  const email = emailMatch?.[0] ?? '';

  const meta: PageMeta = {
    title, titleLength: title.length, description, descriptionLength: description.length,
    keywords, h1, h2, h3, ogTitle, ogDescription, ogImage, ogUrl, ogType,
    twitterCard, twitterTitle, twitterImage, canonical, lang, viewport,
    favicon, faviconType, schemaTypes, schemaRaw, imagesMissingAlt, imagesTotal,
    imagesList, missingAltUrls,
    internalLinks, externalLinks, hasGA, hasGTM, hasPreload, hasDnsPrefetch,
    hasTailwindCDN, hasHeroAsBg, robotsMeta, fbVerification, googleVerification,
    socialLinks, phone, email,
  };

  // ── Build checks ──────────────────────────────────────────
  const checks: SeoCheck[] = [];

  const addCheck = (
    id: string, category: SeoCheck['category'], name: string,
    status: SeoCheck['status'], severity: SeoCheck['severity'],
    current: string, recommended: string, effort: string, impact: string,
  ) => checks.push({ id, category, name, status, severity, current, recommended, effort, impact });

  // ON_PAGE
  addCheck('title_exists', 'ON_PAGE', 'Title Tag', title ? 'PASS' : 'FAIL', 'CRITICAL',
    title ? `"${title.slice(0, 70)}" (${title.length} chars)` : 'MISSING',
    'Descriptive title 50–65 characters with primary keyword', '30 min', 'Directly affects Google ranking and CTR');

  addCheck('title_length', 'ON_PAGE', 'Title Length (50–65 chars)',
    title.length >= 50 && title.length <= 65 ? 'PASS' : title.length > 0 && title.length < 75 ? 'WARN' : 'FAIL',
    'HIGH', `${title.length} characters`, '50–65 characters', '15 min', 'Longer titles get truncated in SERP');

  addCheck('meta_desc_exists', 'ON_PAGE', 'Meta Description',
    description ? (description.length >= 120 ? 'PASS' : 'WARN') : 'FAIL', 'CRITICAL',
    description ? `${description.length} chars` : 'MISSING',
    '140–160 keyword-rich characters with CTA', '30 min', 'Affects CTR from search results');

  addCheck('keywords_meta', 'ON_PAGE', 'Meta Keywords Tag',
    keywords ? 'WARN' : 'FAIL', 'LOW',
    keywords ? keywords.slice(0, 80) : 'MISSING',
    'Page-specific keywords (low priority—Google ignores this)', '15 min', 'Minor');

  addCheck('h1_exists', 'ON_PAGE', 'H1 Tag Exists',
    h1.length === 1 ? 'PASS' : h1.length > 1 ? 'WARN' : 'FAIL', 'CRITICAL',
    h1.length === 0 ? 'No H1 found' : `${h1.length} H1 tag(s): "${h1[0]?.slice(0, 60)}"`,
    'Exactly one H1 per page with primary keyword', '15 min', 'Major ranking signal');

  addCheck('h2_structure', 'ON_PAGE', 'H2 Heading Structure',
    h2.length >= 2 ? 'PASS' : h2.length === 1 ? 'WARN' : 'FAIL', 'MEDIUM',
    `${h2.length} H2 tags found`, '2+ H2 tags for clear content sections', '30 min', 'Helps content structure and crawling');

  // SOCIAL
  addCheck('og_title', 'SOCIAL', 'OG Title Tag', ogTitle ? 'PASS' : 'FAIL', 'CRITICAL',
    ogTitle || 'MISSING', 'Add <meta property="og:title" content="..."> to all pages', '1 hr',
    'Social media shares show no title without this');

  addCheck('og_description', 'SOCIAL', 'OG Description Tag', ogDescription ? 'PASS' : 'FAIL', 'CRITICAL',
    ogDescription || 'MISSING', 'Add <meta property="og:description" content="..."> to all pages', '1 hr',
    'Facebook/LinkedIn previews show no description');

  addCheck('og_image', 'SOCIAL', 'OG Image Tag', ogImage ? 'PASS' : 'FAIL', 'CRITICAL',
    ogImage ? ogImage.slice(0, 60) + '...' : 'MISSING',
    'Add og:image (1200×630px) for rich social previews', '1 hr', 'No thumbnail on social share');

  addCheck('og_url', 'SOCIAL', 'OG URL Tag', ogUrl ? 'PASS' : 'FAIL', 'HIGH',
    ogUrl || 'MISSING', 'Add <meta property="og:url" content="canonical-url">', '30 min', 'Prevents URL mismatch on shares');

  addCheck('twitter_card', 'SOCIAL', 'Twitter Card Tag', twitterCard ? 'PASS' : 'FAIL', 'CRITICAL',
    twitterCard || 'MISSING', 'Add twitter:card, twitter:title, twitter:image tags', '1 hr',
    'No card shown when shared on X/Twitter');

  // TECHNICAL
  addCheck('canonical', 'TECHNICAL', 'Canonical URL Tag', canonical ? 'PASS' : 'FAIL', 'CRITICAL',
    canonical || 'MISSING', 'Add <link rel="canonical" href="..."> to every page', '1 hr',
    'Duplicate content risk — ranking dilution');

  addCheck('https', 'TECHNICAL', 'HTTPS / SSL', finalUrl.startsWith('https') ? 'PASS' : 'FAIL', 'CRITICAL',
    finalUrl.startsWith('https') ? 'Secure ✓' : 'HTTP only — NOT secure', 'Migrate to HTTPS with valid SSL certificate', '4 hrs',
    'Google penalizes non-HTTPS sites');

  addCheck('lang', 'TECHNICAL', 'HTML Lang Attribute',
    lang ? 'PASS' : 'WARN', 'MEDIUM', lang || 'MISSING',
    'Set lang="en" or appropriate language code', '15 min', 'Helps search engines serve correct language');

  addCheck('viewport', 'TECHNICAL', 'Viewport Meta Tag',
    viewport ? 'PASS' : 'FAIL', 'HIGH', viewport || 'MISSING',
    'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">', '5 min',
    'Without this, mobile experience breaks — Google penalizes');

  addCheck('favicon', 'TECHNICAL', 'Favicon',
    favicon ? (faviconType && favicon.endsWith('.webp') && faviconType.includes('svg') ? 'WARN' : 'PASS') : 'FAIL',
    'LOW', favicon ? `${favicon.slice(0, 50)} (type: ${faviconType || 'unset'})` : 'MISSING',
    'Use correct MIME type. PNG/ICO recommended. Add apple-touch-icon.', '30 min', 'Branding and user experience');

  addCheck('robots_txt', 'TECHNICAL', 'robots.txt File',
    robotsRes.ok ? 'PASS' : 'FAIL', 'HIGH',
    robotsRes.ok ? `Exists (${robotsText.split('\n').length} lines, sitemap: ${sitemapInRobots ? 'linked ✓' : 'not linked ✗'})` : 'Not found or error',
    'robots.txt should exist with Sitemap: directive', '30 min', 'Controls crawler access');

  addCheck('sitemap', 'TECHNICAL', 'XML Sitemap',
    sitemapRes.ok ? (sitemapUrls.length > 5 ? 'PASS' : 'WARN') : 'FAIL', 'HIGH',
    sitemapRes.ok ? `Exists — ${sitemapUrls.length} URL(s) found` : 'Not found at /sitemap.xml',
    'Complete sitemap with all pages. Submit to Google Search Console.', '1 hr',
    'Helps Google discover and index all pages');

  // SCHEMA
  addCheck('schema_any', 'SCHEMA', 'Schema / JSON-LD Markup',
    schemaTypes.length > 0 ? 'PASS' : 'FAIL', 'CRITICAL',
    schemaTypes.length > 0 ? `Found: ${schemaTypes.join(', ')}` : 'No structured data found',
    'Add LocalBusiness, Service, FAQ, Review schemas for rich results', '4 hrs',
    'Rich results (stars, FAQ) boost CTR 30-40%');

  addCheck('schema_local_biz', 'SCHEMA', 'LocalBusiness Schema',
    schemaTypes.some(t => t.includes('LocalBusiness')) ? 'PASS' : 'FAIL', 'HIGH',
    schemaTypes.some(t => t.includes('LocalBusiness')) ? 'Present ✓' : 'Missing',
    'Add @type:LocalBusiness with name, address, phone, rating', '2 hrs',
    'Enables Google Knowledge Panel and map listing');

  // IMAGES (With Exact URL Reporting)
  const sampleMissing = missingAltUrls.slice(0, 6).map((u, i) => `${i + 1}. ${u}`).join('\n');
  const moreText = missingAltUrls.length > 6 
    ? `\n...and ${missingAltUrls.length - 6} more URLs (see "Images & Alt Texts" sheet in Excel for all ${imagesMissingAlt} URLs)` 
    : '';
  const altCoverage = imagesTotal > 0 ? Math.round(((imagesTotal - imagesMissingAlt) / imagesTotal) * 100) : 100;

  addCheck('image_alts', 'IMAGES', 'Image Alt Texts',
    imagesMissingAlt === 0 ? 'PASS' : altCoverage >= 80 ? 'WARN' : 'FAIL',
    imagesMissingAlt === 0 ? 'LOW' : imagesMissingAlt > 10 ? 'HIGH' : 'MEDIUM',
    imagesMissingAlt === 0
      ? `All ${imagesTotal} images have descriptive alt attributes.`
      : `${imagesMissingAlt} of ${imagesTotal} images missing alt text (${altCoverage}% coverage).\n\nMissing Image URLs:\n${sampleMissing}${moreText}`,
    `Add descriptive alt attributes describing each image. (See "Images & Alt Texts" sheet in Excel for complete list of all ${imagesMissingAlt} image URLs).`,
    '1 hr',
    'Directly impacts Google Image Search ranking, SEO score, and accessibility');

  addCheck('image_formats', 'IMAGES', 'Next-Gen Image Formats (WebP / AVIF)',
    webpCount > 0 ? (webpCount >= imagesTotal * 0.5 ? 'PASS' : 'WARN') : (imagesTotal === 0 ? 'PASS' : 'WARN'),
    'LOW',
    `${webpCount} of ${imagesTotal} images use modern formats (WebP/AVIF)`,
    'Convert JPEG/PNG images to modern WebP or AVIF format for faster loading.',
    '2 hrs',
    'Reduces image file size by 30-50% improving Largest Contentful Paint (LCP)');

  // ANALYTICS
  addCheck('analytics', 'ANALYTICS', 'Google Analytics / GA4',
    hasGA ? 'PASS' : hasGTM ? 'WARN' : 'FAIL', 'HIGH',
    hasGA ? 'GA4 tracking active ✓' : hasGTM ? 'GTM found but verify GA4 is connected' : 'No analytics tracking found',
    'Add GA4 measurement ID via gtag() or GTM', '1 hr', 'Without analytics, no traffic data');

  // PERFORMANCE
  addCheck('tailwind_cdn', 'PERFORMANCE', 'Tailwind CSS CDN in Production',
    hasTailwindCDN ? 'FAIL' : 'PASS', 'HIGH',
    hasTailwindCDN ? 'cdn.tailwindcss.com detected — runtime CSS bloat!' : 'No CDN Tailwind detected',
    'Use compiled/purged Tailwind CSS build for production', '4 hrs',
    'CDN Tailwind adds ~300KB+ and blocks rendering');

  addCheck('preload', 'PERFORMANCE', 'Resource Preload Hints',
    hasPreload ? 'PASS' : 'WARN', 'MEDIUM',
    hasPreload ? 'Preload links found ✓' : 'No preload hints found',
    'Add <link rel="preload"> for hero images and critical fonts', '30 min',
    'Improves LCP and Core Web Vitals score');

  addCheck('dns_prefetch', 'PERFORMANCE', 'DNS Prefetch',
    hasDnsPrefetch ? 'PASS' : 'WARN', 'LOW',
    hasDnsPrefetch ? 'DNS prefetch configured ✓' : 'No dns-prefetch hints',
    'Add dns-prefetch for external resources (fonts, CDN, analytics)', '15 min',
    'Reduces DNS lookup time for 3rd party resources');

  // LINKS
  addCheck('internal_links', 'LINKS', 'Internal Links Count',
    internalLinks >= 5 ? 'PASS' : internalLinks >= 2 ? 'WARN' : 'FAIL', 'MEDIUM',
    `${internalLinks} internal links found`,
    'At least 5-10 internal links for content discovery', '1 hr',
    'Helps Google crawl site structure and distributes PageRank');

  // ── Scores ────────────────────────────────────────────────
  const rawImageScore = calcScore(checks, 'IMAGES');
  // Proportional alt coverage blending so 30/56 isn't punished to 0
  const adjustedImageScore = imagesTotal > 0
    ? Math.round((altCoverage * 0.7) + (rawImageScore * 0.3))
    : 100;

  const scores = {
    onPage: calcScore(checks, 'ON_PAGE'),
    technical: calcScore(checks, 'TECHNICAL'),
    social: calcScore(checks, 'SOCIAL'),
    schema: calcScore(checks, 'SCHEMA'),
    images: adjustedImageScore,
    performance: calcScore(checks, 'PERFORMANCE'),
    overall: 0,
  };
  scores.overall = Math.round(
    (scores.onPage * 0.25 + scores.technical * 0.25 + scores.social * 0.2 +
     scores.schema * 0.15 + scores.images * 0.05 + scores.performance * 0.1)
  );

  // ── Keyword suggestions (based on domain/title) ───────────
  const titleWords = (title + ' ' + description).toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4);
  const uniqueWords = titleWords.filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 5);

  const keywords_ = {
    primary: uniqueWords.slice(0, 3).map(w => `${w} ${domain}`),
    secondary: uniqueWords.map(w => `best ${w} service`),
    longtail: uniqueWords.map(w => `professional ${w} near me`),
  };

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    url: finalUrl,
    auditedAt: new Date().toISOString(),
    domain,
    isHttps: finalUrl.startsWith('https'),
    robotsTxt: { exists: robotsRes.ok, content: robotsText, sitemapLinked: sitemapInRobots, adminBlocked },
    sitemap: { exists: sitemapRes.ok, urlCount: sitemapUrls.length, urls: sitemapUrls.slice(0, 20) },
    meta,
    checks,
    imagesList,
    missingAltUrls,
    scores,
    keywords: keywords_,
  };
}
