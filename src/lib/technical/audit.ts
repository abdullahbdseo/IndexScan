import { safeFetch } from '../security/ssrf';
import { CanonicalStatus, RobotsStatus, TechnicalAuditResult } from '../types';
import { normalizeUrl } from '../url/normalize';

/**
 * Performs a comprehensive technical SEO check for a target URL.
 * Checks HTTP status, canonical tags, meta robots, and headers.
 */
export async function auditTechnicalUrl(targetUrl: string): Promise<TechnicalAuditResult> {
  const defaultResult: TechnicalAuditResult = {
    httpStatus: 0,
    finalUrl: targetUrl,
    isRedirect: false,
    redirectChain: [],
    canonicalUrl: null,
    canonicalStatus: 'UNKNOWN',
    metaRobots: null,
    xRobotsTag: null,
    hasNoindex: false,
    title: null,
    lastModifiedHeader: null,
    contentType: null,
  };

  try {
    const res = await safeFetch(targetUrl, { timeoutMs: 8000, maxBytes: 5 * 1024 * 1024 });

    defaultResult.httpStatus = res.status;
    defaultResult.finalUrl = res.finalUrl;
    defaultResult.isRedirect = res.finalUrl !== targetUrl;
    defaultResult.contentType = res.headers.get('content-type');
    defaultResult.lastModifiedHeader = res.headers.get('last-modified');

    const xRobots = res.headers.get('x-robots-tag');
    if (xRobots) {
      defaultResult.xRobotsTag = xRobots;
      if (xRobots.toLowerCase().includes('noindex')) {
        defaultResult.hasNoindex = true;
      }
    }

    const html = await res.text();

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      defaultResult.title = titleMatch[1].trim();
    }

    // Extract Meta Robots
    const metaRobotsMatch = html.match(/<meta\s+name=["']robots["']\s+content=["'](.*?)["']/i) ||
                           html.match(/<meta\s+content=["'](.*?)["']\s+name=["']robots["']/i);
    if (metaRobotsMatch && metaRobotsMatch[1]) {
      defaultResult.metaRobots = metaRobotsMatch[1].trim();
      if (defaultResult.metaRobots.toLowerCase().includes('noindex')) {
        defaultResult.hasNoindex = true;
      }
    }

    // Extract Canonical Link
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i) ||
                          html.match(/<link\s+href=["'](.*?)["']\s+rel=["']canonical["']/i);

    if (canonicalMatch && canonicalMatch[1]) {
      const extractedCanonical = canonicalMatch[1].trim();
      defaultResult.canonicalUrl = extractedCanonical;

      // Determine Canonical Status
      const normTarget = normalizeUrl(targetUrl);
      const normFinal = normalizeUrl(res.finalUrl);
      const normCanonical = normalizeUrl(extractedCanonical);

      if (normCanonical.valid && (normCanonical.normalizedUrl === normTarget.normalizedUrl || normCanonical.normalizedUrl === normFinal.normalizedUrl)) {
        defaultResult.canonicalStatus = 'SELF';
      } else if (normCanonical.valid) {
        defaultResult.canonicalStatus = 'DIVERGENT';
      } else {
        defaultResult.canonicalStatus = 'UNKNOWN';
      }
    } else {
      defaultResult.canonicalStatus = 'MISSING';
    }

    return defaultResult;
  } catch (err: any) {
    defaultResult.httpStatus = 0;
    return defaultResult;
  }
}
