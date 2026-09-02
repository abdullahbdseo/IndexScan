import { XMLParser } from 'fast-xml-parser';
import zlib from 'zlib';
import { safeFetch } from '../security/ssrf';
import { normalizeUrl } from '../url/normalize';
import { fetchAndParseRobots } from './robots';

export interface ExtractedUrl {
  url: string;
  normalizedUrl: string;
  lastModified?: string;
  sitemapSource: string;
}

export interface SitemapDiscoveryResult {
  sitemapsFound: string[];
  totalUrls: number;
  urls: ExtractedUrl[];
  robotsDirectivesFound: string[];
  errors: string[];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

/**
 * Decompresses gzip buffer if necessary, or returns raw string.
 */
function parseBufferToXml(buffer: Buffer, isGzip: boolean): string {
  try {
    if (isGzip || (buffer[0] === 0x1f && buffer[1] === 0x8b)) {
      return zlib.gunzipSync(buffer).toString('utf-8');
    }
    return buffer.toString('utf-8');
  } catch (err: any) {
    return buffer.toString('utf-8');
  }
}

/**
 * Fetches and extracts URLs from a single sitemap XML URL.
 * Handles both URLSets and SitemapIndexes recursively.
 */
async function fetchAndParseSingleSitemap(
  sitemapUrl: string,
  depth: number = 0,
  visitedSitemaps: Set<string> = new Set(),
  maxDepth: number = 4,
  maxUrls: number = 2000
): Promise<{ urls: ExtractedUrl[]; childSitemaps: string[]; error?: string }> {
  if (depth > maxDepth || visitedSitemaps.has(sitemapUrl) || visitedSitemaps.size > 25) {
    return { urls: [], childSitemaps: [] };
  }

  visitedSitemaps.add(sitemapUrl);

  try {
    const isGz = sitemapUrl.endsWith('.gz');
    const res = await safeFetch(sitemapUrl, { timeoutMs: 10000, maxBytes: 15 * 1024 * 1024 });

    if (!res.ok) {
      return { urls: [], childSitemaps: [], error: `HTTP ${res.status} when fetching ${sitemapUrl}` };
    }

    const buf = await res.buffer();
    const xmlText = parseBufferToXml(buf, isGz);

    const parsed = xmlParser.parse(xmlText);
    const urls: ExtractedUrl[] = [];
    const childSitemaps: string[] = [];

    // Case 1: Sitemap Index (<sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>)
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const rawSitemaps = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      for (const sm of rawSitemaps) {
        const loc = typeof sm.loc === 'string' ? sm.loc.trim() : sm.loc?.['#text']?.trim();
        if (loc && !visitedSitemaps.has(loc)) {
          childSitemaps.push(loc);
        }
      }

      // Recursively fetch child sitemaps
      for (const childUrl of childSitemaps) {
        if (urls.length >= maxUrls) break;
        const childResult = await fetchAndParseSingleSitemap(
          childUrl,
          depth + 1,
          visitedSitemaps,
          maxDepth,
          maxUrls - urls.length
        );
        urls.push(...childResult.urls);
      }

      return { urls, childSitemaps };
    }

    // Case 2: URL Set (<urlset><url><loc>...</loc><lastmod>...</lastmod></url></urlset>)
    if (parsed.urlset && parsed.urlset.url) {
      const rawUrls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];

      for (const entry of rawUrls) {
        if (urls.length >= maxUrls) break;

        const loc = typeof entry.loc === 'string' ? entry.loc.trim() : entry.loc?.['#text']?.trim();
        if (!loc) continue;

        const lastmod =
          typeof entry.lastmod === 'string'
            ? entry.lastmod.trim()
            : entry.lastmod?.['#text']?.trim() || undefined;

        const norm = normalizeUrl(loc);
        if (norm.valid) {
          urls.push({
            url: loc,
            normalizedUrl: norm.normalizedUrl,
            lastModified: lastmod,
            sitemapSource: sitemapUrl,
          });
        }
      }

      return { urls, childSitemaps: [] };
    }

    return { urls: [], childSitemaps: [], error: `No recognizable sitemap or sitemapindex tag in ${sitemapUrl}` };
  } catch (err: any) {
    return { urls: [], childSitemaps: [], error: `Failed to parse sitemap ${sitemapUrl}: ${err.message}` };
  }
}

/**
 * Discovers and extracts all URLs from a website's sitemaps.
 * Follows robots.txt directives and tests standard fallback paths.
 */
export async function discoverAndParseWebsiteSitemaps(websiteUrl: string): Promise<SitemapDiscoveryResult> {
  const result: SitemapDiscoveryResult = {
    sitemapsFound: [],
    totalUrls: 0,
    urls: [],
    robotsDirectivesFound: [],
    errors: [],
  };

  const norm = normalizeUrl(websiteUrl);
  if (!norm.valid) {
    result.errors.push(`Invalid website URL: ${websiteUrl}`);
    return result;
  }

  const urlObj = new URL(norm.normalizedUrl);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  // Step 1: Check robots.txt
  const robots = await fetchAndParseRobots(baseUrl);
  result.robotsDirectivesFound = robots.sitemapDirectives;

  const candidateSitemaps: string[] = [...robots.sitemapDirectives];

  // Standard fallback sitemap paths to test if robots didn't specify or in addition
  const fallbackPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/wp-sitemap.xml',
  ];

  for (const path of fallbackPaths) {
    const full = `${baseUrl}${path}`;
    if (!candidateSitemaps.includes(full)) {
      candidateSitemaps.push(full);
    }
  }

  const seenUrls = new Set<string>();
  const visitedSitemaps = new Set<string>();

  for (const sitemapUrl of candidateSitemaps) {
    if (result.urls.length >= 3000) break;

    const parseRes = await fetchAndParseSingleSitemap(sitemapUrl, 0, visitedSitemaps, 4, 3000 - result.urls.length);

    if (parseRes.urls.length > 0) {
      if (!result.sitemapsFound.includes(sitemapUrl)) {
        result.sitemapsFound.push(sitemapUrl);
      }

      for (const item of parseRes.urls) {
        const key = item.normalizedUrl.toLowerCase();
        if (!seenUrls.has(key)) {
          seenUrls.add(key);
          result.urls.push(item);
        }
      }
    } else if (parseRes.error && robots.sitemapDirectives.includes(sitemapUrl)) {
      result.errors.push(parseRes.error);
    }
  }

  result.totalUrls = result.urls.length;
  return result;
}
