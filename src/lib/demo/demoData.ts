import { CheckSummary, UrlCheckResult } from '../types';

export function getDemoResults(): { summary: CheckSummary; results: UrlCheckResult[] } {
  const categories = [
    'blog', 'products', 'docs', 'features', 'solutions', 'pricing', 'about',
    'guides', 'case-studies', 'resources', 'templates', 'integrations', 'news'
  ];

  const slugs = [
    'getting-started', 'advanced-seo-guide', 'technical-audit-best-practices',
    'sitemap-optimization', 'canonical-tags-explained', 'robots-txt-directives',
    'core-web-vitals-guide', 'page-speed-optimization', 'structured-data-schema',
    'internal-linking-strategy', 'keyword-research-tools', 'backlink-analysis',
    'ecommerce-seo-checklist', 'local-seo-strategies', 'mobile-first-indexing',
    'duplicate-content-issues', 'redirect-301-vs-302', 'meta-description-tips',
    'h1-heading-hierarchy', 'image-alt-text-seo', 'xml-sitemap-index-tips',
    'https-migration-guide', 'faceted-navigation-seo', 'international-seo-hreflang',
    'crawl-budget-optimization', 'log-file-analysis-seo', 'indexation-rate-calculator',
    'search-visibility-audit', 'organic-traffic-growth', 'serp-feature-optimization'
  ];

  const results: UrlCheckResult[] = [];
  const total = 500;
  const targetFound = 342;
  const targetNotFound = 158;

  let foundCount = 0;
  let notFoundCount = 0;

  const now = new Date();
  const checkedAtStr = 'May 24, 2025, 10:30 AM';

  // Specific high-profile pages
  const basePages = [
    { path: '/', found: true },
    { path: '/about', found: true },
    { path: '/blog', found: false },
    { path: '/contact', found: true },
    { path: '/services', found: false },
    { path: '/pricing', found: true },
    { path: '/features', found: true },
    { path: '/privacy-policy', found: true },
    { path: '/terms-of-service', found: false },
    { path: '/docs', found: true },
  ];

  for (let i = 0; i < basePages.length; i++) {
    const page = basePages[i];
    const isFound = page.found;
    if (isFound) foundCount++;
    else notFoundCount++;

    const date = new Date(now.getTime() - (i * 24 * 3600 * 1000 + 86400000));
    results.push({
      id: `demo-${i + 1}`,
      url: `https://example.com${page.path}`,
      normalizedUrl: `https://example.com${page.path === '/' ? '/' : page.path}`,
      googleStatus: isFound ? 'FOUND' : 'NOT FOUND',
      googleResultSnippet: isFound
        ? `Official ${page.path.replace('/', '') || 'homepage'} page for example.com. Discover key features, guides, and technical insights.`
        : undefined,
      httpStatus: 200,
      canonicalUrl: `https://example.com${page.path}`,
      canonicalStatus: 'SELF',
      robotsPermission: 'ALLOWED',
      metaRobots: 'index, follow',
      sitemapSource: 'https://example.com/sitemap.xml',
      lastModified: date.toISOString().split('T')[0],
      checkedAt: checkedAtStr,
      durationMs: 240 + (i * 15) % 180,
    });
  }

  // Generate remaining 490 URLs
  for (let i = basePages.length; i < total; i++) {
    const remainingSlots = total - i;
    const remainingFoundNeeded = targetFound - foundCount;
    const isFound = remainingFoundNeeded > 0 && (remainingFoundNeeded >= remainingSlots || Math.random() < 0.68);

    if (isFound) foundCount++;
    else notFoundCount++;

    const cat = categories[i % categories.length];
    const slug = slugs[i % slugs.length];
    const itemNum = Math.floor(i / categories.length) + 1;
    const path = `/${cat}/${slug}-${itemNum}`;

    const date = new Date(now.getTime() - (i * 12 * 3600 * 1000 + 1000000));
    const sitemapFile = i % 3 === 0 ? 'sitemap-posts.xml' : i % 3 === 1 ? 'sitemap-pages.xml' : 'sitemap-products.xml';

    results.push({
      id: `demo-${i + 1}`,
      url: `https://example.com${path}`,
      normalizedUrl: `https://example.com${path}`,
      googleStatus: isFound ? 'FOUND' : 'NOT FOUND',
      googleResultSnippet: isFound
        ? `Learn all about ${slug.replace(/-/g, ' ')} in this comprehensive resource guide from example.com.`
        : undefined,
      httpStatus: 200,
      canonicalUrl: `https://example.com${path}`,
      canonicalStatus: 'SELF',
      robotsPermission: 'ALLOWED',
      metaRobots: 'index, follow',
      sitemapSource: `https://example.com/${sitemapFile}`,
      lastModified: date.toISOString().split('T')[0],
      checkedAt: checkedAtStr,
      durationMs: 220 + (i * 7) % 250,
    });
  }

  const summary: CheckSummary = {
    websiteUrl: 'https://example.com',
    totalUrls: 500,
    foundCount: 342,
    notFoundCount: 158,
    unknownCount: 0,
    errorCount: 0,
    observableRate: 68.4,
    sitemapsFound: [
      'https://example.com/sitemap.xml',
      'https://example.com/sitemap-posts.xml',
      'https://example.com/sitemap-pages.xml',
      'https://example.com/sitemap-products.xml',
    ],
    robotsFound: true,
    startedAt: 'May 24, 2025, 10:28 AM',
    completedAt: checkedAtStr,
    isDemo: true,
  };

  return { summary, results };
}
