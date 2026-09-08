import * as cheerio from 'cheerio';
import crypto from 'crypto';

export interface ParsedHtmlData {
  htmlHash: string;
  htmlSize: number;
  canonicalUrl?: string;
  title?: string;
  metaDescription?: string;
  metaRobots?: string;
  lang?: string;
  hasViewport: boolean;
  viewportContent?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  jsonLdSchemas: any[];
  images: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    loading?: string;
    isExternal: boolean;
  }>;
  internalLinks: Array<{
    href: string;
    anchorText: string;
    rel?: string;
  }>;
  externalLinks: Array<{
    href: string;
    anchorText: string;
    rel?: string;
  }>;
  wordCount: number;
  textRatio: number;
  templateFingerprint: string;
}

export class HtmlParser {
  public static parse(html: string, pageUrl: string, baseDomain: string): ParsedHtmlData {
    const $ = cheerio.load(html);
    const htmlHash = crypto.createHash('sha256').update(html).digest('hex');
    const htmlSize = Buffer.byteLength(html, 'utf-8');

    // Title & Meta
    const title = $('title').first().text().trim() || undefined;
    const metaDescription = $('meta[name="description" i]').attr('content')?.trim() ||
      $('meta[property="og:description" i]').attr('content')?.trim() || undefined;
    const metaRobots = $('meta[name="robots" i]').attr('content')?.trim() || undefined;
    const canonicalUrl = $('link[rel="canonical" i]').attr('href')?.trim() || undefined;
    const lang = $('html').attr('lang')?.trim() || undefined;

    const viewport = $('meta[name="viewport" i]');
    const hasViewport = viewport.length > 0;
    const viewportContent = viewport.attr('content')?.trim() || undefined;

    // Headings
    const headings = {
      h1: $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h2: $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h3: $('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h4: $('h4').map((_, el) => $(el).text().trim()).get().filter(Boolean),
    };

    // OpenGraph
    const openGraph: Record<string, string> = {};
    $('meta[property^="og:" i]').each((_, el) => {
      const prop = $(el).attr('property')?.toLowerCase();
      const val = $(el).attr('content');
      if (prop && val) openGraph[prop] = val.trim();
    });

    // Twitter Card
    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:" i]').each((_, el) => {
      const name = $(el).attr('name')?.toLowerCase();
      const val = $(el).attr('content');
      if (name && val) twitterCard[name] = val.trim();
    });

    // JSON-LD Schemas
    const jsonLdSchemas: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html() || '';
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          jsonLdSchemas.push(...parsed);
        } else {
          jsonLdSchemas.push(parsed);
        }
      } catch (e) {
        jsonLdSchemas.push({ _syntaxError: true, raw: $(el).html() });
      }
    });

    // Images
    const images: ParsedHtmlData['images'] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (!src) return;
      const alt = $(el).attr('alt');
      const width = parseInt($(el).attr('width') || '', 10) || undefined;
      const height = parseInt($(el).attr('height') || '', 10) || undefined;
      const loading = $(el).attr('loading') || undefined;
      const isExternal = src.startsWith('http') && !src.includes(baseDomain);

      images.push({
        src,
        alt: alt !== undefined ? alt.trim() : undefined,
        width,
        height,
        loading,
        isExternal
      });
    });

    // Links (Internal & External)
    const internalLinks: ParsedHtmlData['internalLinks'] = [];
    const externalLinks: ParsedHtmlData['externalLinks'] = [];

    let baseUrlObj: URL;
    try {
      baseUrlObj = new URL(pageUrl);
    } catch {
      baseUrlObj = new URL('http://localhost');
    }

    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href')?.trim() || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      const anchorText = $(el).text().trim() || $(el).find('img').attr('alt') || '';
      const rel = $(el).attr('rel') || undefined;

      try {
        const resolved = new URL(rawHref, baseUrlObj.origin + baseUrlObj.pathname);
        const resolvedHref = resolved.toString();
        
        // Normalize hostname check
        const isInternal = resolved.hostname === baseUrlObj.hostname || resolved.hostname === baseDomain.replace(/^https?:\/\//, '').split('/')[0];

        if (isInternal) {
          internalLinks.push({ href: resolvedHref, anchorText, rel });
        } else {
          externalLinks.push({ href: resolvedHref, anchorText, rel });
        }
      } catch {
        // Unparseable link
      }
    });

    // Text metrics
    const bodyClone = $('body').clone();
    bodyClone.find('script, style, noscript, svg').remove();
    const visibleText = bodyClone.text().replace(/\s+/g, ' ').trim();
    const words = visibleText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const textRatio = htmlSize > 0 ? Number((Buffer.byteLength(visibleText) / htmlSize).toFixed(4)) : 0;

    // Template Fingerprinting (Structural tags structure)
    const structuralClassNames = $('header, footer, nav, main, aside, article, div[class*="layout"], div[class*="template"], div[class*="container"]')
      .map((_, el) => `${el.tagName}.${$(el).attr('class') || ''}`)
      .get()
      .slice(0, 10)
      .join('|');
    const templateFingerprint = crypto.createHash('md5').update(structuralClassNames || 'generic-template').digest('hex');

    return {
      htmlHash,
      htmlSize,
      canonicalUrl,
      title,
      metaDescription,
      metaRobots,
      lang,
      hasViewport,
      viewportContent,
      headings,
      openGraph,
      twitterCard,
      jsonLdSchemas,
      images,
      internalLinks,
      externalLinks,
      wordCount,
      textRatio,
      templateFingerprint
    };
  }
}
