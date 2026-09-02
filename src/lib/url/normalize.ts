import { BulkValidationResult } from '../types';

/**
 * Normalizes a single URL string for consistent comparison and search querying.
 */
export function normalizeUrl(rawUrl: string): { valid: boolean; normalizedUrl: string; originalUrl: string; error?: string } {
  const originalUrl = rawUrl.trim();
  if (!originalUrl) {
    return { valid: false, normalizedUrl: '', originalUrl, error: 'Empty URL' };
  }

  let parseTarget = originalUrl;
  if (!/^https?:\/\//i.test(parseTarget)) {
    parseTarget = 'https://' + parseTarget;
  }

  try {
    const parsed = new URL(parseTarget);

    // Hostname lowercase
    let hostname = parsed.hostname.toLowerCase();

    // Protocol lowercase
    const protocol = parsed.protocol.toLowerCase();

    // Filter out standard ports
    let port = parsed.port;
    if ((protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443')) {
      port = '';
    }

    // Pathname normalization
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    if (!pathname) {
      pathname = '/';
    }

    // Search params: normalize empty or sort
    const search = parsed.search;

    const reconstructed = `${protocol}//${hostname}${port ? `:${port}` : ''}${pathname}${search}`;

    return {
      valid: true,
      normalizedUrl: reconstructed,
      originalUrl,
    };
  } catch (err: any) {
    return {
      valid: false,
      normalizedUrl: '',
      originalUrl,
      error: `Invalid URL format: ${err.message || 'Parse error'}`,
    };
  }
}

/**
 * Parses and processes bulk text input (one URL per line).
 * Automatically trims whitespace, filters invalid URLs, and removes duplicates.
 */
export function processBulkUrls(rawText: string): BulkValidationResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const seen = new Set<string>();
  const validUrls: string[] = [];
  const invalidUrls: string[] = [];
  let duplicatesRemoved = 0;

  for (const line of lines) {
    const result = normalizeUrl(line);
    if (!result.valid) {
      invalidUrls.push(line);
      continue;
    }

    const key = result.normalizedUrl.toLowerCase();
    if (seen.has(key)) {
      duplicatesRemoved++;
    } else {
      seen.add(key);
      validUrls.push(result.normalizedUrl);
    }
  }

  return {
    validUrls,
    duplicatesRemoved,
    invalidUrls,
    rawCount: lines.length,
  };
}
