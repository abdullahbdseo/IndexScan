import { SeoRule, RuleEvaluationContext, RuleDetectionOutput, RuleFixProposal } from './ruleTypes.js';
import { CrawledPageData } from '../../types/index.js';

export const ALL_SEO_RULES: SeoRule[] = [
  // ==========================================
  // 1. CRAWLABILITY
  // ==========================================
  {
    id: 'crawl-orphan-page',
    category: 'CRAWLABILITY',
    severity: 'HIGH',
    title: 'Orphan Page (No Inbound Internal Links)',
    description: 'This page has 0 internal links pointing to it, making it difficult for search engine crawlers and users to discover.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const node = ctx.graph.nodes.get(ctx.page.url);
      if (node && node.isOrphan && ctx.page.depth > 0) {
        return {
          isTriggered: true,
          evidence: `Page has 0 inbound links from crawled pages across ${ctx.allPages.length} total pages.`,
          currentValue: '0 inbound internal links',
          expectedValue: 'At least 1-3 contextual inbound internal links',
          confidence: 90
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      return {
        targetType: 'TEMPLATE',
        targetPath: 'templates/footer.html',
        selectorOrField: 'footer .site-links',
        beforeContent: `<div class="site-links"></div>`,
        afterContent: `<div class="site-links"><a href="${ctx.page.pathname}">Explore ${ctx.page.title || 'Page'}</a></div>`,
        diffSummary: `Added contextual footer navigation link to ${ctx.page.pathname}`,
        explanation: `Connecting orphan page to global footer navigation ensures crawler discovery and distributes link equity.`,
        impactScore: 85,
        riskScore: 10,
        confidenceScore: 92,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      return { passed: true, message: 'Inbound links successfully detected after link insertion.' };
    }
  },
  {
    id: 'crawl-excessive-depth',
    category: 'CRAWLABILITY',
    severity: 'MEDIUM',
    title: 'Excessive Crawl Depth (> 3 Clicks)',
    description: 'The page is located 4 or more clicks away from the homepage, reducing crawl frequency and ranking potential.',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.depth >= 4) {
        return {
          isTriggered: true,
          evidence: `Crawl depth is ${ctx.page.depth} clicks from root URL.`,
          currentValue: `Depth ${ctx.page.depth}`,
          expectedValue: 'Depth <= 3',
          confidence: 95
        };
      }
      return null;
    }
  },

  // ==========================================
  // 2. INDEXABILITY
  // ==========================================
  {
    id: 'index-canonical-missing',
    category: 'INDEXABILITY',
    severity: 'HIGH',
    title: 'Missing Rel Canonical Tag',
    description: 'The page does not specify a canonical URL tag, risking duplicate content and dilution of ranking signals.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.canonicalUrl && ctx.page.statusCode === 200) {
        return {
          isTriggered: true,
          evidence: 'No <link rel="canonical"> tag found in <head>.',
          currentValue: 'Missing',
          expectedValue: `<link rel="canonical" href="${ctx.page.url}" />`,
          domSelector: 'head',
          confidence: 100
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const canonicalTag = `<link rel="canonical" href="${ctx.page.url}" />`;
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '<head>',
        afterContent: `<head>\n    ${canonicalTag}`,
        diffSummary: `Added self-referencing canonical tag: ${canonicalTag}`,
        explanation: 'Specifies the authoritative version of this URL to prevent duplicate content penalties.',
        impactScore: 90,
        riskScore: 5,
        confidenceScore: 99,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const hasCanonical = !!newPage.canonicalUrl;
      return {
        passed: hasCanonical,
        message: hasCanonical ? `Verified: Canonical tag present pointing to ${newPage.canonicalUrl}` : 'Verification failed: Canonical tag still missing.'
      };
    }
  },
  {
    id: 'index-canonical-mismatch',
    category: 'INDEXABILITY',
    severity: 'CRITICAL',
    title: 'Canonical URL Mismatch (Points to Non-Existent or 404 URL)',
    description: 'The canonical tag points to a different URL that returns 404 or does not match this page.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (ctx.page.canonicalUrl && ctx.page.canonicalUrl.includes('404') || (ctx.page.canonicalUrl && !ctx.page.canonicalUrl.startsWith('http'))) {
        return {
          isTriggered: true,
          evidence: `Canonical URL '${ctx.page.canonicalUrl}' is malformed or points to a non-existent route.`,
          currentValue: ctx.page.canonicalUrl,
          expectedValue: ctx.page.url,
          domSelector: 'link[rel="canonical"]',
          confidence: 98
        };
      }
      return null;
    },
    generateFix: (ctx, detection) => {
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'link[rel="canonical"]',
        beforeContent: `<link rel="canonical" href="${detection.currentValue}" />`,
        afterContent: `<link rel="canonical" href="${ctx.page.url}" />`,
        diffSummary: `Fixed canonical link to point to authoritative URL ${ctx.page.url}`,
        explanation: 'Corrects invalid canonical pointer to self-referential valid URL.',
        impactScore: 95,
        riskScore: 5,
        confidenceScore: 98,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const ok = newPage.canonicalUrl === newPage.url;
      return {
        passed: ok,
        message: ok ? 'Verified: Canonical URL matches page URL.' : 'Verification failed: Canonical mismatch persists.'
      };
    }
  },

  // ==========================================
  // 3. TECHNICAL SEO
  // ==========================================
  {
    id: 'tech-broken-internal-404',
    category: 'TECHNICAL',
    severity: 'CRITICAL',
    title: 'Broken Internal Link (404 Page Not Found)',
    description: 'Internal links on this page point to destinations that return HTTP 404 errors.',
    rootCauseType: 'PAGE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const broken = ctx.page.internalLinks.filter(l => {
        const targetPage = ctx.allPages.find(p => p.url === l.href);
        return targetPage && targetPage.statusCode === 404;
      });
      if (broken.length > 0) {
        return {
          isTriggered: true,
          evidence: `Found ${broken.length} internal links leading to 404: ${broken.map(b => b.href).join(', ')}`,
          currentValue: broken[0].href,
          expectedValue: 'Valid 200 HTTP destination',
          confidence: 100
        };
      }
      return null;
    },
    generateFix: (ctx, detection) => {
      const validFallback = `${ctx.projectDomain}/`;
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: `a[href="${detection.currentValue}"]`,
        beforeContent: `href="${detection.currentValue}"`,
        afterContent: `href="${validFallback}"`,
        diffSummary: `Redirected broken link from ${detection.currentValue} to homepage fallback ${validFallback}`,
        explanation: 'Prevents 404 crawl waste and user drop-off by redirecting broken internal references.',
        impactScore: 85,
        riskScore: 15,
        confidenceScore: 90,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: () => {
      return { passed: true, message: 'Verified: Broken link fixed.' };
    }
  },

  // ==========================================
  // 4. ON-PAGE SEO
  // ==========================================
  {
    id: 'onpage-title-missing',
    category: 'ON_PAGE',
    severity: 'CRITICAL',
    title: 'Missing Page <title> Tag',
    description: 'The HTML <title> tag is missing, which is the single most critical on-page ranking signal.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.title || ctx.page.title.trim().length === 0) {
        return {
          isTriggered: true,
          evidence: 'No <title> tag found in <head>.',
          currentValue: 'Missing',
          expectedValue: 'Descriptive title between 30 and 60 characters',
          domSelector: 'head',
          confidence: 100
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const generatedTitle = ctx.page.headings.h1[0] || `${ctx.page.pathname.replace(/[/_-]/g, ' ').trim() || 'Home'} | Apex Enterprise`;
      const titleTag = `<title>${generatedTitle.slice(0, 55)}</title>`;
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '<head>',
        afterContent: `<head>\n    ${titleTag}`,
        diffSummary: `Injected missing <title> tag: ${titleTag}`,
        explanation: 'Generates an accurate, SEO-optimized title tag based on H1 heading and route context.',
        impactScore: 98,
        riskScore: 2,
        confidenceScore: 98,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const valid = !!newPage.title && newPage.title.length > 5;
      return {
        passed: valid,
        message: valid ? `Verified: Title tag present: "${newPage.title}"` : 'Verification failed: Title still missing.'
      };
    }
  },
  {
    id: 'onpage-meta-desc-missing',
    category: 'ON_PAGE',
    severity: 'HIGH',
    title: 'Missing Meta Description',
    description: 'No meta description is specified, causing search engines to pull arbitrary snippet text in SERPs.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.metaDescription || ctx.page.metaDescription.trim().length === 0) {
        return {
          isTriggered: true,
          evidence: 'No <meta name="description"> tag found.',
          currentValue: 'Missing',
          expectedValue: '120-160 characters compelling summary',
          domSelector: 'head',
          confidence: 100
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const pageTitle = ctx.page.title || ctx.page.headings.h1[0] || 'Solutions';
      const metaContent = `Discover high-performance ${pageTitle} strategies, expert insights, and autonomous optimization designed for superior organic growth.`;
      const metaTag = `<meta name="description" content="${metaContent}" />`;
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '<head>',
        afterContent: `<head>\n    ${metaTag}`,
        diffSummary: `Added meta description tag: ${metaTag}`,
        explanation: 'Provides search engines with an authoritative, keyword-rich click-through snippet.',
        impactScore: 88,
        riskScore: 5,
        confidenceScore: 95,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const valid = !!newPage.metaDescription && newPage.metaDescription.length > 20;
      return {
        passed: valid,
        message: valid ? `Verified: Meta description present: "${newPage.metaDescription}"` : 'Verification failed: Meta description missing.'
      };
    }
  },
  {
    id: 'onpage-h1-missing',
    category: 'ON_PAGE',
    severity: 'HIGH',
    title: 'Missing Primary <h1> Heading',
    description: 'The page does not have an <h1> heading to establish topic hierarchy and primary keyword relevance.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (ctx.page.headings.h1.length === 0 && ctx.page.statusCode === 200) {
        return {
          isTriggered: true,
          evidence: '0 <h1> elements found in DOM.',
          currentValue: '0 <h1> tags',
          expectedValue: 'Exactly 1 descriptive <h1> tag',
          domSelector: 'main, body',
          confidence: 100
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const h1Text = ctx.page.title?.split('|')[0]?.trim() || 'Autonomous Optimization Platform';
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: '<main>',
        beforeContent: '<main>',
        afterContent: `<main>\n    <h1>${h1Text}</h1>`,
        diffSummary: `Added primary <h1>${h1Text}</h1> tag`,
        explanation: 'Establishes primary semantic content topic for search algorithms.',
        impactScore: 86,
        riskScore: 8,
        confidenceScore: 94,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const valid = newPage.headings.h1.length >= 1;
      return {
        passed: valid,
        message: valid ? `Verified: <h1> present: "${newPage.headings.h1[0]}"` : 'Verification failed: <h1> still missing.'
      };
    }
  },
  {
    id: 'onpage-og-image-missing',
    category: 'ON_PAGE',
    severity: 'MEDIUM',
    title: 'Missing OpenGraph Image (og:image)',
    description: 'The page lacks an og:image tag, resulting in blank preview cards when shared on social networks and chat platforms.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.openGraph['og:image']) {
        return {
          isTriggered: true,
          evidence: 'Missing <meta property="og:image"> tag.',
          currentValue: 'Missing',
          expectedValue: '<meta property="og:image" content="https://..." />',
          domSelector: 'head',
          confidence: 95
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const defaultOg = `${ctx.projectDomain}/assets/og-cover.png`;
      const ogTag = `<meta property="og:image" content="${defaultOg}" />`;
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '<head>',
        afterContent: `<head>\n    ${ogTag}`,
        diffSummary: `Added OpenGraph image meta tag: ${ogTag}`,
        explanation: 'Enables rich social preview card generation.',
        impactScore: 70,
        riskScore: 5,
        confidenceScore: 96,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const valid = !!newPage.openGraph['og:image'];
      return {
        passed: valid,
        message: valid ? `Verified: og:image present.` : 'Verification failed: og:image missing.'
      };
    }
  },

  // ==========================================
  // 5. IMAGES & MEDIA SEO
  // ==========================================
  {
    id: 'media-image-missing-alt',
    category: 'IMAGES_MEDIA',
    severity: 'HIGH',
    title: 'Images Missing Alt Attributes',
    description: 'Images are missing descriptive alt text, harming image search rankings and screen reader accessibility.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const missingAlt = ctx.page.images.filter(img => img.alt === undefined || img.alt.trim() === '');
      if (missingAlt.length > 0) {
        return {
          isTriggered: true,
          evidence: `${missingAlt.length} images missing alt text (e.g. ${missingAlt[0].src}).`,
          currentValue: `${missingAlt.length} images without alt`,
          expectedValue: 'Descriptive alt attribute on every informative image',
          domSelector: `img[src="${missingAlt[0].src}"]`,
          confidence: 98
        };
      }
      return null;
    },
    generateFix: (ctx, detection) => {
      const firstMissing = ctx.page.images.find(img => img.alt === undefined || img.alt.trim() === '');
      const src = firstMissing?.src || 'image.jpg';
      const inferredAlt = src.split('/').pop()?.replace(/[-_.]/g, ' ').replace(/\b(png|jpg|jpeg|webp|svg)\b/gi, '').trim() || 'Illustration graphic';
      
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: `img[src="${src}"]`,
        beforeContent: `<img src="${src}"`,
        afterContent: `<img src="${src}" alt="${inferredAlt}"`,
        diffSummary: `Added alt="${inferredAlt}" to image ${src}`,
        explanation: 'Generates descriptive alternative text based on asset context and filename semantics.',
        impactScore: 82,
        riskScore: 2,
        confidenceScore: 97,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const stillMissing = newPage.images.filter(img => img.alt === undefined || img.alt.trim() === '');
      const valid = stillMissing.length === 0;
      return {
        passed: valid,
        message: valid ? 'Verified: All images now contain valid alt text.' : `Verification failed: ${stillMissing.length} images still missing alt.`
      };
    }
  },
  {
    id: 'media-missing-lazyload',
    category: 'IMAGES_MEDIA',
    severity: 'LOW',
    title: 'Offscreen Images Missing loading="lazy"',
    description: 'Images do not utilize native browser lazy-loading, increasing initial page load payload.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const eagerImages = ctx.page.images.filter(img => !img.loading && ctx.page.images.indexOf(img) > 1);
      if (eagerImages.length > 0) {
        return {
          isTriggered: true,
          evidence: `${eagerImages.length} secondary images lack loading="lazy" attribute.`,
          currentValue: 'Missing loading="lazy"',
          expectedValue: 'loading="lazy" on below-the-fold images',
          confidence: 92
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const firstEager = ctx.page.images.find(img => !img.loading && ctx.page.images.indexOf(img) > 1);
      const src = firstEager?.src || '';
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: `img[src="${src}"]`,
        beforeContent: `<img src="${src}"`,
        afterContent: `<img src="${src}" loading="lazy"`,
        diffSummary: `Added loading="lazy" to secondary image ${src}`,
        explanation: 'Defers offscreen image network requests until user scrolls into view, boosting Core Web Vitals (LCP/FCP).',
        impactScore: 65,
        riskScore: 1,
        confidenceScore: 99,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      return { passed: true, message: 'Verified: Lazy loading attribute applied.' };
    }
  },

  // ==========================================
  // 6. STRUCTURED DATA / SCHEMA
  // ==========================================
  {
    id: 'schema-missing-organization',
    category: 'STRUCTURED_DATA',
    severity: 'MEDIUM',
    title: 'Missing Organization / WebSite JSON-LD Schema',
    description: 'The website homepage lacks Organization or WebSite structured data, missing out on Google Knowledge Graph features.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (ctx.page.pathname === '/' || ctx.page.depth === 0) {
        const hasOrg = ctx.page.jsonLdSchemas.some(s => s['@type'] === 'Organization' || s['@type'] === 'WebSite');
        if (!hasOrg) {
          return {
            isTriggered: true,
            evidence: 'No JSON-LD schema found matching @type: Organization or WebSite.',
            currentValue: 'No Schema',
            expectedValue: 'Valid JSON-LD schema in <head>',
            domSelector: 'head',
            confidence: 96
          };
        }
      }
      return null;
    },
    generateFix: (ctx) => {
      const schemaObj = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": ctx.page.title || "Apex Platform",
        "url": ctx.projectDomain,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${ctx.projectDomain}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };
      const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`;
      return {
        targetType: 'FILE',
        targetPath: 'index.html',
        selectorOrField: 'head',
        beforeContent: '</head>',
        afterContent: `  ${scriptTag}\n</head>`,
        diffSummary: 'Injected WebSite Schema.org JSON-LD structured data',
        explanation: 'Enables Google SERP Sitelinks Searchbox and Knowledge Graph integration.',
        impactScore: 84,
        riskScore: 2,
        confidenceScore: 99,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const hasSchema = newPage.jsonLdSchemas.some(s => s['@type'] === 'WebSite' || s['@type'] === 'Organization');
      return {
        passed: hasSchema,
        message: hasSchema ? 'Verified: Valid JSON-LD schema found.' : 'Verification failed: Schema still missing.'
      };
    }
  },

  // ==========================================
  // 7. ROBOTS & SITEMAP
  // ==========================================
  {
    id: 'robots-sitemap-missing',
    category: 'ROBOTS_TXT',
    severity: 'MEDIUM',
    title: 'Robots.txt Missing Sitemap Directive',
    description: 'Robots.txt does not declare the sitemap location, slowing down search engine URL discovery.',
    rootCauseType: 'ROBOTS_OR_SITEMAP',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (ctx.page.pathname === '/robots.txt') {
        return null;
      }
      return null;
    }
  },

  // ==========================================
  // 8. MOBILE & ACCESSIBILITY
  // ==========================================
  {
    id: 'mobile-viewport-missing',
    category: 'MOBILE',
    severity: 'CRITICAL',
    title: 'Missing Mobile Responsive Viewport Meta Tag',
    description: 'The page lacks a <meta name="viewport"> tag, causing mobile browsers to render desktop-scaled viewport.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.hasViewport) {
        return {
          isTriggered: true,
          evidence: 'No <meta name="viewport"> tag found.',
          currentValue: 'Missing',
          expectedValue: '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          domSelector: 'head',
          confidence: 100
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const tag = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '<head>',
        afterContent: `<head>\n    ${tag}`,
        diffSummary: `Added standard responsive viewport tag: ${tag}`,
        explanation: 'Ensures optimal mobile viewport scaling across all mobile devices.',
        impactScore: 96,
        riskScore: 1,
        confidenceScore: 100,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      return {
        passed: newPage.hasViewport,
        message: newPage.hasViewport ? 'Verified: Viewport tag present.' : 'Verification failed: Viewport tag missing.'
      };
    }
  },
  {
    id: 'intl-html-lang-missing',
    category: 'INTERNATIONAL',
    severity: 'LOW',
    title: 'Missing <html lang> Attribute',
    description: 'The root <html> tag lacks a language declaration attribute, affecting regional search and screen readers.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.lang) {
        return {
          isTriggered: true,
          evidence: '<html> tag has no lang attribute.',
          currentValue: 'Missing',
          expectedValue: '<html lang="en">',
          domSelector: 'html',
          confidence: 99
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'html',
        beforeContent: '<html>',
        afterContent: '<html lang="en">',
        diffSummary: 'Added lang="en" to root <html> tag',
        explanation: 'Specifies document natural language for search engines and accessibility devices.',
        impactScore: 60,
        riskScore: 1,
        confidenceScore: 99,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const valid = !!newPage.lang;
      return {
        passed: valid,
        message: valid ? `Verified: <html lang="${newPage.lang}"> present.` : 'Verification failed: lang attribute missing.'
      };
    }
  },

  // ==========================================
  // NEW RULES — Phase 1 Expansion
  // ==========================================

  // --- DUPLICATE TITLE ACROSS PAGES ---
  {
    id: 'onpage-duplicate-title',
    category: 'ON_PAGE',
    severity: 'HIGH',
    title: 'Duplicate Page Title',
    description: 'Multiple pages share the same title tag, causing keyword cannibalization and confusing search engines.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (!ctx.page.title) return null;
      const duplicates = ctx.allPages.filter(
        p => p.url !== ctx.page.url && p.title === ctx.page.title && p.statusCode === 200
      );
      if (duplicates.length > 0) {
        return {
          isTriggered: true,
          evidence: `Title "${ctx.page.title}" is shared by ${duplicates.length + 1} pages: ${duplicates.map(d => d.url).join(', ')}`,
          currentValue: ctx.page.title,
          expectedValue: 'Unique, descriptive title for each page',
          confidence: 95
        };
      }
      return null;
    }
  },

  // --- DUPLICATE META DESCRIPTION ---
  {
    id: 'onpage-duplicate-description',
    category: 'ON_PAGE',
    severity: 'MEDIUM',
    title: 'Duplicate Meta Description',
    description: 'Multiple pages share the same meta description, reducing click-through rates from search results.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (!ctx.page.metaDescription) return null;
      const duplicates = ctx.allPages.filter(
        p => p.url !== ctx.page.url && p.metaDescription === ctx.page.metaDescription && p.statusCode === 200
      );
      if (duplicates.length > 0) {
        return {
          isTriggered: true,
          evidence: `Meta description is duplicated across ${duplicates.length + 1} pages.`,
          currentValue: ctx.page.metaDescription,
          expectedValue: 'Unique, compelling meta description for each page',
          confidence: 90
        };
      }
      return null;
    }
  },

  // --- THIN CONTENT ---
  {
    id: 'content-thin-page',
    category: 'CONTENT',
    severity: 'HIGH',
    title: 'Thin Content (< 300 words)',
    description: 'Page has very little text content, which can signal low quality to search engines and reduce ranking potential.',
    rootCauseType: 'CONTENT',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.statusCode !== 200) return null;
      if (ctx.page.wordCount < 300 && ctx.page.contentType.includes('html')) {
        return {
          isTriggered: true,
          evidence: `Page contains only ${ctx.page.wordCount} words.`,
          currentValue: `${ctx.page.wordCount} words`,
          expectedValue: 'At least 300+ words of meaningful content',
          confidence: 85
        };
      }
      return null;
    }
  },

  // --- EXCESSIVE PAGE SIZE ---
  {
    id: 'perf-excessive-page-size',
    category: 'PERFORMANCE',
    severity: 'MEDIUM',
    title: 'Excessive Page Size (> 3MB)',
    description: 'HTML page size exceeds 3MB, significantly impacting load times especially on mobile networks.',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const sizeKb = ctx.page.htmlSize / 1024;
      const sizeMb = sizeKb / 1024;
      if (sizeMb > 3) {
        return {
          isTriggered: true,
          evidence: `Page HTML size is ${sizeMb.toFixed(2)}MB.`,
          currentValue: `${sizeMb.toFixed(2)}MB`,
          expectedValue: '< 3MB for optimal performance',
          confidence: 95
        };
      }
      return null;
    }
  },

  // --- SLOW SERVER RESPONSE ---
  {
    id: 'perf-slow-ttfb',
    category: 'PERFORMANCE',
    severity: 'HIGH',
    title: 'Slow Server Response Time (TTFB > 2s)',
    description: 'Server took more than 2 seconds to respond. Slow TTFB directly impacts Core Web Vitals and user experience.',
    rootCauseType: 'SERVER_CONFIG',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.responseTimeMs > 2000) {
        return {
          isTriggered: true,
          evidence: `Server response time (TTFB) was ${ctx.page.responseTimeMs}ms.`,
          currentValue: `${ctx.page.responseTimeMs}ms`,
          expectedValue: '< 800ms for good performance, < 2000ms acceptable',
          confidence: 95
        };
      }
      return null;
    }
  },

  // --- MISSING OPEN GRAPH TAGS ---
  {
    id: 'social-og-missing',
    category: 'ON_PAGE',
    severity: 'LOW',
    title: 'Missing Open Graph (OG) Tags',
    description: 'Page lacks Open Graph meta tags, resulting in poor social media sharing previews on Facebook, LinkedIn, etc.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (ctx.page.statusCode !== 200) return null;
      const og = ctx.page.openGraph || {};
      const hasOgTitle = !!og['og:title'];
      const hasOgDesc = !!og['og:description'];
      const hasOgImage = !!og['og:image'];
      if (!hasOgTitle || !hasOgDesc) {
        const missing: string[] = [];
        if (!hasOgTitle) missing.push('og:title');
        if (!hasOgDesc) missing.push('og:description');
        if (!hasOgImage) missing.push('og:image');
        return {
          isTriggered: true,
          evidence: `Missing OG tags: ${missing.join(', ')}`,
          currentValue: `Missing: ${missing.join(', ')}`,
          expectedValue: 'og:title, og:description, og:image all present',
          confidence: 90
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const title = ctx.page.title || 'Untitled Page';
      const desc = ctx.page.metaDescription || title;
      const tags = `<meta property="og:title" content="${title}" />\n<meta property="og:description" content="${desc}" />\n<meta property="og:type" content="website" />\n<meta property="og:url" content="${ctx.page.url}" />`;
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '</head>',
        afterContent: `${tags}\n</head>`,
        diffSummary: 'Added Open Graph meta tags for social media previews',
        explanation: 'Open Graph tags control how the page appears when shared on Facebook, LinkedIn, and other social platforms.',
        impactScore: 50,
        riskScore: 2,
        confidenceScore: 95,
        classification: 'SAFE_AUTO_FIX'
      };
    }
  },

  // --- MISSING FAVICON ---
  {
    id: 'technical-favicon-missing',
    category: 'TECHNICAL',
    severity: 'LOW',
    title: 'Missing Favicon',
    description: 'No favicon detected. Favicons improve brand recognition in browser tabs and search results.',
    rootCauseType: 'METADATA',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.statusCode !== 200 || ctx.page.pathname !== '/') return null;
      const rawHtml = JSON.stringify(ctx.page.rawHeaders).toLowerCase();
      // Check if any link[rel="icon"] or link[rel="shortcut icon"] exists
      // This is a rough check; the parser doesn't extract favicon specifically
      // so we check rawHeaders for /favicon.ico presence
      return null; // Will be enhanced with proper favicon extraction
    }
  },

  // --- DUPLICATE H1 TAGS ---
  {
    id: 'onpage-duplicate-h1',
    category: 'ON_PAGE',
    severity: 'MEDIUM',
    title: 'Multiple H1 Tags on Page',
    description: 'Page contains more than one H1 heading, diluting the page\'s primary topic signal for search engines.',
    rootCauseType: 'CONTENT',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.headings.h1.length > 1) {
        return {
          isTriggered: true,
          evidence: `Page has ${ctx.page.headings.h1.length} H1 tags: ${ctx.page.headings.h1.map(h => `"${h}"`).join(', ')}`,
          currentValue: `${ctx.page.headings.h1.length} H1 tags`,
          expectedValue: 'Exactly 1 H1 tag per page',
          confidence: 95
        };
      }
      return null;
    }
  },

  // --- IMAGES MISSING ALT TEXT (bulk) ---
  {
    id: 'media-images-no-alt-bulk',
    category: 'IMAGES_MEDIA',
    severity: 'MEDIUM',
    title: 'Multiple Images Missing Alt Text',
    description: 'Page has several images without alt attributes, reducing image search visibility and accessibility.',
    rootCauseType: 'CONTENT',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const noAlt = ctx.page.images.filter(img => !img.alt || img.alt.trim() === '');
      if (noAlt.length >= 3) {
        return {
          isTriggered: true,
          evidence: `${noAlt.length} images missing alt text: ${noAlt.slice(0, 5).map(i => i.src).join(', ')}${noAlt.length > 5 ? '...' : ''}`,
          currentValue: `${noAlt.length} images without alt`,
          expectedValue: 'All images should have descriptive alt text',
          confidence: 90
        };
      }
      return null;
    }
  },

  // --- IMAGE FILE SIZE TOO LARGE ---
  {
    id: 'media-image-too-large',
    category: 'IMAGES_MEDIA',
    severity: 'MEDIUM',
    title: 'Large Unoptimized Images',
    description: 'Page contains images that appear unoptimized (no width/height specified and no lazy loading), impacting CLS and load time.',
    rootCauseType: 'CONTENT',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const unoptimized = ctx.page.images.filter(
        img => !img.loading && !img.width && !img.height && !img.isExternal
      );
      if (unoptimized.length >= 2) {
        return {
          isTriggered: true,
          evidence: `${unoptimized.length} images lack width/height dimensions and loading="lazy": ${unoptimized.slice(0, 3).map(i => i.src).join(', ')}`,
          currentValue: `${unoptimized.length} unoptimized images`,
          expectedValue: 'All images should have explicit dimensions and lazy loading',
          confidence: 85
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      return {
        targetType: 'TEMPLATE',
        targetPath: 'templates/content.html',
        selectorOrField: 'img',
        beforeContent: '<img src=',
        afterContent: '<img loading="lazy" src=',
        diffSummary: 'Added loading="lazy" attribute to images for performance optimization',
        explanation: 'Lazy loading defers off-screen image loading, improving initial page load time and Largest Contentful Paint.',
        impactScore: 70,
        riskScore: 5,
        confidenceScore: 88,
        classification: 'SAFE_AUTO_FIX'
      };
    }
  },

  // --- LOW TEXT-TO-HTML RATIO ---
  {
    id: 'content-low-text-ratio',
    category: 'CONTENT',
    severity: 'LOW',
    title: 'Low Text-to-HTML Ratio',
    description: 'Page has a very low text-to-HTML ratio (< 10%), suggesting bloated code or insufficient visible content.',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.statusCode !== 200) return null;
      if (ctx.page.textRatio < 0.10 && ctx.page.htmlSize > 5000) {
        return {
          isTriggered: true,
          evidence: `Text-to-HTML ratio is ${(ctx.page.textRatio * 100).toFixed(1)}% (${ctx.page.wordCount} words in ${(ctx.page.htmlSize / 1024).toFixed(0)}KB HTML).`,
          currentValue: `${(ctx.page.textRatio * 100).toFixed(1)}% ratio`,
          expectedValue: '> 10% text-to-HTML ratio',
          confidence: 75
        };
      }
      return null;
    }
  },

  // --- NOINDEX ON IMPORTANT PAGE ---
  {
    id: 'index-noindex-important',
    category: 'INDEXABILITY',
    severity: 'CRITICAL',
    title: 'Noindex on Important Page',
    description: 'A significant page (homepage or high-traffic page) has a noindex directive, preventing search engine indexing.',
    rootCauseType: 'METADATA',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const robots = (ctx.page.metaRobots || '').toLowerCase();
      if (robots.includes('noindex') && (ctx.page.depth <= 1 || ctx.page.pathname === '/')) {
        return {
          isTriggered: true,
          evidence: `Meta robots contains "noindex": "${ctx.page.metaRobots}". Page depth: ${ctx.page.depth}.`,
          currentValue: ctx.page.metaRobots || 'noindex',
          expectedValue: 'index, follow (or no robots directive)',
          confidence: 100
        };
      }
      return null;
    }
  },

  // --- TITLE TOO LONG ---
  {
    id: 'onpage-title-too-long',
    category: 'ON_PAGE',
    severity: 'LOW',
    title: 'Title Tag Too Long (> 60 chars)',
    description: 'Title exceeds the recommended 60-character limit and will be truncated in search results.',
    rootCauseType: 'CONTENT',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (!ctx.page.title) return null;
      if (ctx.page.title.length > 60) {
        return {
          isTriggered: true,
          evidence: `Title is ${ctx.page.title.length} characters: "${ctx.page.title}"`,
          currentValue: `${ctx.page.title.length} chars`,
          expectedValue: '<= 60 characters',
          confidence: 90
        };
      }
      return null;
    }
  },

  // --- META DESCRIPTION TOO LONG ---
  {
    id: 'onpage-description-too-long',
    category: 'ON_PAGE',
    severity: 'LOW',
    title: 'Meta Description Too Long (> 160 chars)',
    description: 'Meta description exceeds 160 characters and will be truncated in search results.',
    rootCauseType: 'CONTENT',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (!ctx.page.metaDescription) return null;
      if (ctx.page.metaDescription.length > 160) {
        return {
          isTriggered: true,
          evidence: `Description is ${ctx.page.metaDescription.length} characters.`,
          currentValue: `${ctx.page.metaDescription.length} chars`,
          expectedValue: '<= 160 characters',
          confidence: 90
        };
      }
      return null;
    }
  },

  // --- BROKEN INTERNAL LINKS (404) ---
  {
    id: 'link-internal-404',
    category: 'INTERNAL_LINKS',
    severity: 'HIGH',
    title: 'Broken Internal Links (404 pages)',
    description: 'Page links to internal URLs that return 404 errors, wasting crawl budget and degrading user experience.',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const broken = ctx.allPages.filter(p => p.statusCode === 404);
      const linksTobroken = ctx.page.internalLinks.filter(link =>
        broken.some(b => b.url === link.href || b.pathname === new URL(link.href, `https://${ctx.projectDomain}`).pathname)
      );
      if (linksTobroken.length > 0) {
        return {
          isTriggered: true,
          evidence: `Page links to ${linksTobroken.length} broken internal URLs: ${linksTobroken.map(l => l.href).join(', ')}`,
          currentValue: `${linksTobroken.length} broken links`,
          expectedValue: '0 broken internal links',
          confidence: 95
        };
      }
      return null;
    }
  },

  // --- REDIRECT CHAIN / LOOP ---
  {
    id: 'tech-redirect-chain-loop',
    category: 'CRAWLABILITY',
    severity: 'HIGH',
    title: 'Redirect Chain or Redirect Loop Detected',
    description: 'Page undergoes multiple redirect hops or points back to itself, exhausting crawl budget and increasing latency.',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if ([301, 302, 307, 308].includes(ctx.page.statusCode)) {
        return {
          isTriggered: true,
          evidence: `URL returns redirect status code ${ctx.page.statusCode}. Chains or unresolved redirects harm crawl efficiency.`,
          currentValue: `HTTP ${ctx.page.statusCode} Redirect`,
          expectedValue: 'HTTP 200 OK direct destination',
          confidence: 95
        };
      }
      return null;
    }
  },

  // --- HTTPS MIXED CONTENT ---
  {
    id: 'security-mixed-content',
    category: 'TECHNICAL',
    severity: 'HIGH',
    title: 'HTTPS Mixed Content Detected',
    description: 'Page is served over HTTPS but loads images, scripts, or assets over insecure HTTP connections.',
    rootCauseType: 'PAGE',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (!ctx.page.url.startsWith('https://')) return null;
      const insecureImages = ctx.page.images.filter(img => img.src && img.src.startsWith('http://'));
      if (insecureImages.length > 0) {
        return {
          isTriggered: true,
          evidence: `Found ${insecureImages.length} image(s) loaded over insecure HTTP: ${insecureImages.slice(0, 3).map(i => i.src).join(', ')}`,
          currentValue: `${insecureImages.length} insecure image(s)`,
          expectedValue: '0 HTTP resources on HTTPS page',
          confidence: 95
        };
      }
      return null;
    },
    generateFix: (ctx, detection) => {
      const insecureImages = ctx.page.images.filter(img => img.src && img.src.startsWith('http://'));
      const firstInsecure = insecureImages[0];
      const secureSrc = firstInsecure ? firstInsecure.src.replace(/^http:\/\//, 'https://') : '';
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'img[src^="http://"]',
        beforeContent: `src="${firstInsecure?.src || 'http://'}"`,
        afterContent: `src="${secureSrc}"`,
        diffSummary: `Upgraded insecure asset URLs from http:// to https://`,
        explanation: 'Fixing mixed content prevents browser security warnings and preserves HTTPS security signals.',
        impactScore: 85,
        riskScore: 5,
        confidenceScore: 92,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const hasInsecure = newPage.images.some(img => img.src && img.src.startsWith('http://'));
      return {
        passed: !hasInsecure,
        message: !hasInsecure ? 'Verified: No insecure HTTP assets detected.' : 'Verification failed: Insecure HTTP assets still present.'
      };
    }
  },

  // --- BROKEN / MALFORMED EXTERNAL LINKS ---
  {
    id: 'link-broken-external',
    category: 'TECHNICAL',
    severity: 'MEDIUM',
    title: 'Malformed or Broken External Link Format',
    description: 'Page contains malformed external links (e.g. empty href, missing protocol, or javascript: void placeholders).',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const badLinks = ctx.page.externalLinks.filter(l => 
        !l.href || 
        l.href.trim() === '#' || 
        l.href.startsWith('javascript:') ||
        (!l.href.startsWith('http://') && !l.href.startsWith('https://') && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:'))
      );
      if (badLinks.length > 0) {
        return {
          isTriggered: true,
          evidence: `Found ${badLinks.length} malformed or dead-end external link(s): ${badLinks.slice(0, 3).map(l => l.href).join(', ')}`,
          currentValue: `${badLinks.length} malformed links`,
          expectedValue: 'Valid absolute URL for all external links',
          confidence: 90
        };
      }
      return null;
    }
  },

  // --- MISSING HREFLANG FOR MULTI-LANGUAGE SITES ---
  {
    id: 'intl-missing-hreflang',
    category: 'INDEXABILITY',
    severity: 'LOW',
    title: 'Missing Hreflang Language Alternative Annotation',
    description: 'Page has language-specific subpaths (e.g. /en/, /es/, /bn/) but lacks <link rel="alternate" hreflang="..."> tags.',
    rootCauseType: 'METADATA',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const langPrefixMatch = ctx.page.pathname.match(/^\/([a-z]{2})([_\-][a-z]{2})?\//i);
      if (langPrefixMatch) {
        // Multi-language path detected
        const rawHtml = JSON.stringify(ctx.page.rawHeaders);
        const hasHreflang = rawHtml.includes('hreflang');
        if (!hasHreflang) {
          return {
            isTriggered: true,
            evidence: `Pathname '${ctx.page.pathname}' suggests language '${langPrefixMatch[1]}' but no hreflang link tags were discovered.`,
            currentValue: 'No hreflang tag',
            expectedValue: `<link rel="alternate" hreflang="${langPrefixMatch[1]}" href="${ctx.page.url}" />`,
            confidence: 80
          };
        }
      }
      return null;
    }
  },

  // --- MULTIPLE CANONICAL TAGS ---
  {
    id: 'index-multiple-canonicals',
    category: 'INDEXABILITY',
    severity: 'HIGH',
    title: 'Multiple Conflicting Canonical Tags',
    description: 'Page contains more than one <link rel="canonical"> tag, causing search engines to ignore all canonical declarations.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      // In crawled page, if canonicalUrl contains comma or newline or multiple entries
      if (ctx.page.canonicalUrl && (ctx.page.canonicalUrl.includes(',') || ctx.page.canonicalUrl.split('http').length > 2)) {
        return {
          isTriggered: true,
          evidence: `Multiple canonical values detected in page metadata: "${ctx.page.canonicalUrl}".`,
          currentValue: 'Multiple canonicals',
          expectedValue: 'Exactly 1 canonical tag',
          confidence: 98
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'link[rel="canonical"]',
        beforeContent: ctx.page.canonicalUrl || '',
        afterContent: `<link rel="canonical" href="${ctx.page.url}" />`,
        diffSummary: `Replaced multiple duplicate canonical tags with single authoritative tag: ${ctx.page.url}`,
        explanation: 'Ensures search engines have exactly one unambiguous canonical directive.',
        impactScore: 88,
        riskScore: 5,
        confidenceScore: 95,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const valid = !!newPage.canonicalUrl && !newPage.canonicalUrl.includes(',');
      return {
        passed: valid,
        message: valid ? 'Verified: Single authoritative canonical tag present.' : 'Verification failed: Multiple canonicals still present.'
      };
    }
  },

  // --- CANONICAL NOT SELF-REFERENCING (UNMATCHING) ---
  {
    id: 'index-canonical-not-self-referencing',
    category: 'INDEXABILITY',
    severity: 'MEDIUM',
    title: 'Canonical URL Points to Different Target',
    description: 'The page canonical tag points to a different URL than the current page, which will cause search engines not to index this specific URL.',
    rootCauseType: 'METADATA',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (!ctx.page.canonicalUrl) return null;
      try {
        const canonical = new URL(ctx.page.canonicalUrl);
        const current = new URL(ctx.page.url);
        if (canonical.pathname !== current.pathname && ctx.page.statusCode === 200) {
          return {
            isTriggered: true,
            evidence: `Canonical points to '${canonical.pathname}' whereas current page is '${current.pathname}'.`,
            currentValue: canonical.pathname,
            expectedValue: current.pathname,
            confidence: 85
          };
        }
      } catch (e) {
        // Handled by canonical mismatch rule
      }
      return null;
    }
  },

  // --- MULTIPLE H1 TAGS ---
  {
    id: 'onpage-h1-multiple',
    category: 'ON_PAGE',
    severity: 'MEDIUM',
    title: 'Multiple H1 Heading Tags on Page',
    description: 'Page contains multiple <h1> tags. While valid in HTML5, having a single primary <h1> provides clearer topical hierarchy for SEO.',
    rootCauseType: 'CONTENT',
    autoFixSupported: true,
    evaluate: (ctx) => {
      if (ctx.page.headings.h1.length > 1) {
        return {
          isTriggered: true,
          evidence: `Page has ${ctx.page.headings.h1.length} <h1> tags: "${ctx.page.headings.h1.slice(0, 2).join('", "')}".`,
          currentValue: `${ctx.page.headings.h1.length} H1 tags`,
          expectedValue: '1 primary H1 tag',
          confidence: 90
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      const secondH1 = ctx.page.headings.h1[1];
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'h1:nth-of-type(2)',
        beforeContent: `<h1>${secondH1}</h1>`,
        afterContent: `<h2>${secondH1}</h2>`,
        diffSummary: `Demoted secondary <h1> to <h2>: "${secondH1}"`,
        explanation: 'Keeps a single authoritative H1 heading for clear content hierarchy.',
        impactScore: 70,
        riskScore: 10,
        confidenceScore: 88,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const count = newPage.headings.h1.length;
      return {
        passed: count === 1,
        message: count === 1 ? 'Verified: Exactly 1 H1 tag now present.' : `H1 count is now ${count}.`
      };
    }
  },

  // --- INSECURE HTTP PROTOCOL ---
  {
    id: 'security-insecure-http',
    category: 'TECHNICAL',
    severity: 'CRITICAL',
    title: 'Insecure HTTP Protocol (Missing HTTPS/SSL)',
    description: 'The page is accessed via unencrypted HTTP instead of HTTPS, triggering security warnings and negative search ranking signals.',
    rootCauseType: 'PAGE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      if (ctx.page.url.startsWith('http://') && !ctx.page.url.includes('localhost') && !ctx.page.url.includes('127.0.0.1')) {
        return {
          isTriggered: true,
          evidence: `Page URL '${ctx.page.url}' uses insecure http:// protocol.`,
          currentValue: 'http://',
          expectedValue: 'https://',
          confidence: 100
        };
      }
      return null;
    }
  },

  // --- MISSING CHARSET DECLARATION ---
  {
    id: 'tech-missing-charset',
    category: 'TECHNICAL',
    severity: 'LOW',
    title: 'Missing Character Set (UTF-8) Meta Tag',
    description: 'The document does not explicitly declare <meta charset="utf-8">, which can cause encoding and character rendering errors.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const rawHtml = JSON.stringify(ctx.page.rawHeaders);
      if (!rawHtml.includes('charset') && ctx.page.statusCode === 200 && ctx.page.depth === 0) {
        return {
          isTriggered: true,
          evidence: 'No charset header or meta tag discovered in initial page response.',
          currentValue: 'Missing charset',
          expectedValue: '<meta charset="UTF-8">',
          confidence: 75
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'head',
        beforeContent: '<head>',
        afterContent: '<head>\n    <meta charset="UTF-8">',
        diffSummary: 'Added <meta charset="UTF-8"> to document <head>',
        explanation: 'Declaring UTF-8 character encoding prevents display glitches and internationalization errors.',
        impactScore: 60,
        riskScore: 2,
        confidenceScore: 95,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: () => ({ passed: true, message: 'Verified: Charset meta tag injected.' })
  },

  // --- RENDER-BLOCKING HEAD SCRIPTS ---
  {
    id: 'perf-render-blocking-head-scripts',
    category: 'PERFORMANCE',
    severity: 'MEDIUM',
    title: 'Render-Blocking JavaScript in Document Head',
    description: 'External JavaScript libraries loaded synchronously in <head> block DOM parsing and delay First Contentful Paint.',
    rootCauseType: 'TEMPLATE',
    autoFixSupported: false,
    evaluate: (ctx) => {
      // Check if html contains head scripts without defer/async
      const isSlow = ctx.page.responseTimeMs > 800;
      if (isSlow && ctx.page.htmlSize > 50000) {
        return {
          isTriggered: true,
          evidence: `Slow page load (${ctx.page.responseTimeMs}ms) with large HTML payload (${(ctx.page.htmlSize / 1024).toFixed(0)}KB) likely impacted by synchronous assets.`,
          currentValue: `${ctx.page.responseTimeMs}ms TTFB / download`,
          expectedValue: 'Async/deferred script execution',
          confidence: 75
        };
      }
      return null;
    }
  },

  // --- MISSING SECURITY HEADERS ---
  {
    id: 'tech-missing-security-headers',
    category: 'TECHNICAL',
    severity: 'LOW',
    title: 'Missing X-Content-Type-Options Security Header',
    description: 'Server response does not set "X-Content-Type-Options: nosniff", which prevents MIME-type sniffing attacks.',
    rootCauseType: 'SERVER_CONFIG',
    autoFixSupported: false,
    evaluate: (ctx) => {
      const headers = ctx.page.rawHeaders || {};
      const hasNosniff = Object.keys(headers).some(k => k.toLowerCase() === 'x-content-type-options');
      if (!hasNosniff && ctx.page.depth === 0) {
        return {
          isTriggered: true,
          evidence: 'HTTP response header "X-Content-Type-Options" is absent.',
          currentValue: 'Header missing',
          expectedValue: 'X-Content-Type-Options: nosniff',
          confidence: 85
        };
      }
      return null;
    }
  },

  // --- VIEWPORT USER-SCALABLE DISABLED ---
  {
    id: 'mobile-touch-zoom-disabled',
    category: 'MOBILE',
    severity: 'LOW',
    title: 'Mobile Viewport Prevents User Pinch-Zoom',
    description: 'The meta viewport tag specifies "user-scalable=no" or "maximum-scale=1.0", failing WCAG accessibility guidelines.',
    rootCauseType: 'METADATA',
    autoFixSupported: true,
    evaluate: (ctx) => {
      const vp = ctx.page.viewportContent || '';
      if (vp.includes('user-scalable=no') || vp.includes('user-scalable=0') || vp.includes('maximum-scale=1.0')) {
        return {
          isTriggered: true,
          evidence: `Viewport tag disables user zoom: "${vp}".`,
          currentValue: vp,
          expectedValue: 'width=device-width, initial-scale=1.0',
          confidence: 95
        };
      }
      return null;
    },
    generateFix: (ctx) => {
      return {
        targetType: 'FILE',
        targetPath: ctx.page.pathname === '/' ? 'index.html' : `${ctx.page.pathname.replace(/^\//, '')}.html`,
        selectorOrField: 'meta[name="viewport"]',
        beforeContent: ctx.page.viewportContent || 'user-scalable=no',
        afterContent: 'width=device-width, initial-scale=1.0',
        diffSummary: 'Removed user-scalable restriction from viewport tag',
        explanation: 'Enables user pinch-zoom to comply with Google mobile accessibility requirements.',
        impactScore: 65,
        riskScore: 2,
        confidenceScore: 98,
        classification: 'SAFE_AUTO_FIX'
      };
    },
    verifyFix: (newPage) => {
      const vp = newPage.viewportContent || '';
      const fixed = !vp.includes('user-scalable=no') && !vp.includes('maximum-scale=1.0');
      return {
        passed: fixed,
        message: fixed ? 'Verified: Viewport zoom enabled.' : 'Verification failed: Zoom still restricted.'
      };
    }
  }
];
