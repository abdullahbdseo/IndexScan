import crypto from 'crypto';
import { HtmlParser } from './htmlParser.js';
import { CrawledPageData, CrawlSession, Project } from '../../types/index.js';
import { db } from '../../db/database.js';

export interface CrawlerEvents {
  onProgress?: (progress: { crawled: number; discovered: number; currentUrl: string; percentage: number }) => void;
  onPageCrawled?: (page: CrawledPageData) => void;
  onError?: (url: string, error: string) => void;
}

export class CrawlerEngine {
  private visitedUrls: Set<string> = new Set();
  private queue: Array<{ url: string; depth: number }> = [];
  private robotsTxtRules: { disallow: string[]; allow: string[]; sitemaps: string[] } = {
    disallow: [],
    allow: [],
    sitemaps: []
  };

  private logEvent(projectId: string, action: string, details: string, severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' = 'INFO') {
    try {
      db.insert('audit_logs', {
        id: crypto.randomUUID(),
        projectId,
        action,
        details,
        severity,
        timestamp: new Date().toISOString()
      });
    } catch {
      // safe fallback
    }
  }

  public async crawl(project: Project, events?: CrawlerEvents): Promise<CrawlSession> {
    const crawlId = crypto.randomUUID();
    const session: CrawlSession = {
      id: crawlId,
      projectId: project.id,
      status: 'CRAWLING',
      urlsDiscovered: 1,
      urlsCrawled: 0,
      urlsFailed: 0,
      maxDepthReached: 0,
      startedAt: new Date().toISOString()
    };
    db.insert('crawls', session);

    this.visitedUrls.clear();
    this.queue = [];

    let baseUrl = project.domain.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    this.logEvent(project.id, 'CRAWL_START', `Initiating crawler for domain ${baseUrl}`, 'INFO');

    try {
      // 1. Fetch robots.txt and sitemaps
      await this.fetchRobotsTxt(baseUrl, project.id);
      await this.discoverSitemaps(baseUrl, project.id);

      // Seed queue with base URL
      this.queue.push({ url: baseUrl, depth: 0 });

      // Run concurrency controlled crawling
      const maxUrls = project.maxCrawlUrls || 30;
      const maxDepth = project.crawlDepth || 3;
      const concurrency = Math.min(project.concurrency || 3, 5);

      while (this.queue.length > 0 && session.urlsCrawled < maxUrls) {
        const batch = this.queue.splice(0, concurrency);
        const promises = batch.map(async item => {
          const normalized = this.normalizeUrl(item.url);
          if (this.visitedUrls.has(normalized)) return null;
          this.visitedUrls.add(normalized);

          if (item.depth > session.maxDepthReached) {
            session.maxDepthReached = item.depth;
          }

          if (this.isBlockedByRobots(normalized)) {
            this.logEvent(project.id, 'ROBOTS_BLOCKED', `Skipping ${normalized} (Disallowed in robots.txt)`, 'WARNING');
            return null;
          }

          try {
            const pageData = await this.crawlSingleUrl(normalized, item.depth, project, crawlId);
            session.urlsCrawled++;
            db.insert('crawl_urls', pageData);

            this.logEvent(project.id, 'PAGE_CRAWLED', `[${pageData.statusCode}] ${normalized} (${pageData.responseTimeMs}ms) - Title: "${pageData.title || 'No Title'}"`, pageData.statusCode >= 400 ? 'WARNING' : 'SUCCESS');

            if (events?.onPageCrawled) {
              events.onPageCrawled(pageData);
            }

            // Enqueue new internal links if depth permits
            if (item.depth < maxDepth && session.urlsCrawled + this.queue.length < maxUrls * 2) {
              for (const link of pageData.internalLinks) {
                const normLink = this.normalizeUrl(link.href);
                if (!this.visitedUrls.has(normLink) && !this.queue.some(q => q.url === normLink)) {
                  this.queue.push({ url: normLink, depth: item.depth + 1 });
                  session.urlsDiscovered++;
                }
              }
            }
            return pageData;
          } catch (err) {
            session.urlsFailed++;
            this.logEvent(project.id, 'CRAWL_FAILED', `Failed to crawl ${normalized}: ${(err as Error).message}`, 'ERROR');
            if (events?.onError) {
              events.onError(normalized, (err as Error).message);
            }
            return null;
          }
        });

        await Promise.all(promises);

        if (events?.onProgress) {
          const pct = Math.min(Math.round((session.urlsCrawled / Math.max(session.urlsDiscovered, 1)) * 100), 100);
          events.onProgress({
            crawled: session.urlsCrawled,
            discovered: session.urlsDiscovered,
            currentUrl: batch[0]?.url || baseUrl,
            percentage: pct
          });
        }
      }

      session.status = 'COMPLETED';
      session.completedAt = new Date().toISOString();
      db.update('crawls', crawlId, session);
      this.logEvent(project.id, 'CRAWL_COMPLETE', `Crawl completed! Discovered ${session.urlsDiscovered} URLs, successfully parsed ${session.urlsCrawled} pages.`, 'SUCCESS');
      return session;
    } catch (error) {
      session.status = 'FAILED';
      session.errorMessage = (error as Error).message;
      session.completedAt = new Date().toISOString();
      db.update('crawls', crawlId, session);
      this.logEvent(project.id, 'CRAWL_ERROR', `Crawl aborted: ${(error as Error).message}`, 'ERROR');
      throw error;
    }
  }

  public async crawlSingleUrl(url: string, depth: number, project: Project, crawlId: string = 'single-inspect'): Promise<CrawledPageData> {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;
      const statusCode = response.status;
      const contentType = response.headers.get('content-type') || 'text/html';
      const rawHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        rawHeaders[key] = val;
      });

      let html = '';
      if (contentType.includes('text/html') || contentType.includes('xml') || contentType.includes('json')) {
        html = await response.text();
      }

      const parsed = HtmlParser.parse(html, url, project.domain);

      const pageData: CrawledPageData = {
        id: crypto.randomUUID(),
        crawlId,
        projectId: project.id,
        url,
        pathname: parsedUrl.pathname,
        statusCode,
        responseTimeMs,
        contentType,
        htmlHash: parsed.htmlHash,
        depth,
        canonicalUrl: parsed.canonicalUrl,
        title: parsed.title,
        metaDescription: parsed.metaDescription,
        metaRobots: parsed.metaRobots,
        headings: parsed.headings,
        openGraph: parsed.openGraph,
        twitterCard: parsed.twitterCard,
        jsonLdSchemas: parsed.jsonLdSchemas,
        images: parsed.images,
        internalLinks: parsed.internalLinks,
        externalLinks: parsed.externalLinks,
        rawHeaders,
        htmlSize: parsed.htmlSize,
        wordCount: parsed.wordCount,
        textRatio: parsed.textRatio,
        hasViewport: parsed.hasViewport,
        viewportContent: parsed.viewportContent,
        lang: parsed.lang,
        detectedTemplateId: parsed.templateFingerprint
      };

      return pageData;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private async fetchRobotsTxt(baseUrl: string, projectId: string) {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const res = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (res.ok) {
        const text = await res.text();
        const lines = text.split('\n');
        for (const line of lines) {
          const clean = line.trim();
          if (clean.toLowerCase().startsWith('disallow:')) {
            const rule = clean.substring(9).trim();
            if (rule) this.robotsTxtRules.disallow.push(rule);
          } else if (clean.toLowerCase().startsWith('allow:')) {
            const rule = clean.substring(6).trim();
            if (rule) this.robotsTxtRules.allow.push(rule);
          } else if (clean.toLowerCase().startsWith('sitemap:')) {
            const sitemapUrl = clean.substring(8).trim();
            if (sitemapUrl) this.robotsTxtRules.sitemaps.push(sitemapUrl);
          }
        }
        this.logEvent(projectId, 'ROBOTS_TXT', `Parsed robots.txt: ${this.robotsTxtRules.disallow.length} disallow rules, ${this.robotsTxtRules.sitemaps.length} sitemaps found`, 'INFO');
      }
    } catch {
      // robots.txt optional
    }
  }

  private async discoverSitemaps(baseUrl: string, projectId: string) {
    const sitemapCandidates = [
      ...this.robotsTxtRules.sitemaps,
      new URL('/sitemap.xml', baseUrl).toString(),
      new URL('/sitemap_index.xml', baseUrl).toString()
    ];

    for (const smUrl of sitemapCandidates) {
      try {
        const res = await fetch(smUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (res.ok) {
          const xml = await res.text();
          const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
          let match;
          let sitemapUrlsFound = 0;
          while ((match = locRegex.exec(xml)) !== null) {
            const foundUrl = match[1].trim();
            // If it's another sitemap XML, we don't treat it as a page directly
            if (foundUrl.endsWith('.xml')) {
              continue;
            }
            if (foundUrl.includes(new URL(baseUrl).hostname)) {
              const norm = this.normalizeUrl(foundUrl);
              if (!this.visitedUrls.has(norm) && !this.queue.some(q => q.url === norm)) {
                this.queue.push({ url: norm, depth: 1 });
                sitemapUrlsFound++;
              }
            }
          }
          if (sitemapUrlsFound > 0) {
            this.logEvent(projectId, 'SITEMAP_DISCOVERY', `Discovered ${sitemapUrlsFound} valid URLs from XML sitemap: ${smUrl}`, 'INFO');
          }
        }
      } catch {
        // Continue
      }
    }
  }

  private isBlockedByRobots(url: string): boolean {
    try {
      const pathname = new URL(url).pathname;
      for (const allow of this.robotsTxtRules.allow) {
        if (pathname.startsWith(allow)) return false;
      }
      for (const disallow of this.robotsTxtRules.disallow) {
        if (disallow === '/' || pathname.startsWith(disallow)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hash = '';
      if (u.pathname.endsWith('/') && u.pathname.length > 1) {
        u.pathname = u.pathname.slice(0, -1);
      }
      return u.toString();
    } catch {
      return url;
    }
  }
}

