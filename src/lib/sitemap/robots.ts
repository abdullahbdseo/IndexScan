import { safeFetch } from '../security/ssrf';

export interface RobotsResult {
  hasRobots: boolean;
  content: string;
  sitemapDirectives: string[];
  disallowRules: string[];
  allowRules: string[];
}

/**
 * Fetches and parses robots.txt for a given domain/website URL.
 */
export async function fetchAndParseRobots(websiteUrl: string): Promise<RobotsResult> {
  const result: RobotsResult = {
    hasRobots: false,
    content: '',
    sitemapDirectives: [],
    disallowRules: [],
    allowRules: [],
  };

  try {
    const urlObj = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const res = await safeFetch(robotsUrl, { timeoutMs: 8000 });
    if (!res.ok) {
      return result;
    }

    const text = await res.text();
    result.hasRobots = true;
    result.content = text;

    const lines = text.split(/\r?\n/);
    let currentUserAgent = '';

    for (const line of lines) {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) continue;

      const colonIdx = clean.indexOf(':');
      if (colonIdx === -1) continue;

      const field = clean.substring(0, colonIdx).trim().toLowerCase();
      const value = clean.substring(colonIdx + 1).trim();

      if (field === 'sitemap') {
        if (value && !result.sitemapDirectives.includes(value)) {
          result.sitemapDirectives.push(value);
        }
      } else if (field === 'user-agent') {
        currentUserAgent = value.toLowerCase();
      } else if (field === 'disallow') {
        if (currentUserAgent === '*' || currentUserAgent === 'googlebot') {
          if (value && !result.disallowRules.includes(value)) {
            result.disallowRules.push(value);
          }
        }
      } else if (field === 'allow') {
        if (currentUserAgent === '*' || currentUserAgent === 'googlebot') {
          if (value && !result.allowRules.includes(value)) {
            result.allowRules.push(value);
          }
        }
      }
    }

    return result;
  } catch (err) {
    // Robots.txt may not exist or be accessible
    return result;
  }
}
