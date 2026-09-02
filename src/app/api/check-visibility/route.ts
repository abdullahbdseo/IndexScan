import { NextResponse } from 'next/server';
import { checkGooglePublicVisibility } from '@/lib/google/checker';
import { auditTechnicalUrl } from '@/lib/technical/audit';
import { UrlCheckResult } from '@/lib/types';
import { normalizeUrl } from '@/lib/url/normalize';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { urls, includeTechnical = true } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Array of URLs is required' }, { status: 400 });
    }

    // Process batch
    const batchUrls = urls.slice(0, 10);
    const results: UrlCheckResult[] = [];

    for (let i = 0; i < batchUrls.length; i++) {
      const item = batchUrls[i];
      const targetUrl = typeof item === 'string' ? item : item.url;
      const sitemapSource = typeof item === 'object' ? item.sitemapSource : undefined;
      const lastModified = typeof item === 'object' ? item.lastModified : undefined;

      const norm = normalizeUrl(targetUrl);
      const startTime = Date.now();

      if (!norm.valid) {
        results.push({
          id: `res-${Date.now()}-${i}`,
          url: targetUrl,
          normalizedUrl: targetUrl,
          googleStatus: 'ERROR',
          errorMessage: norm.error || 'Invalid URL format',
          checkedAt: new Date().toLocaleString(),
          durationMs: 0,
        });
        continue;
      }

      // 1. Technical SEO on-page audit
      let techAudit = undefined;
      if (includeTechnical) {
        techAudit = await auditTechnicalUrl(norm.normalizedUrl);
      }

      // 2. Google search visibility & indexability check
      const googleCheck = await checkGooglePublicVisibility(norm.normalizedUrl, {
        httpStatus: techAudit?.httpStatus,
        canonicalStatus: techAudit?.canonicalStatus,
        hasNoindex: techAudit?.hasNoindex,
        robotsPermission: techAudit?.hasNoindex ? 'NOINDEX' : 'ALLOWED',
      });

      const durationMs = Date.now() - startTime;

      results.push({
        id: `res-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        url: targetUrl,
        normalizedUrl: norm.normalizedUrl,
        googleStatus: googleCheck.status,
        googleResultSnippet: googleCheck.snippet,
        httpStatus: techAudit?.httpStatus || undefined,
        canonicalUrl: techAudit?.canonicalUrl || undefined,
        canonicalStatus: techAudit?.canonicalStatus || undefined,
        metaRobots: techAudit?.metaRobots || undefined,
        xRobotsTag: techAudit?.xRobotsTag || undefined,
        robotsPermission: techAudit?.hasNoindex ? 'NOINDEX' : 'ALLOWED',
        sitemapSource,
        lastModified: lastModified || techAudit?.lastModifiedHeader || undefined,
        checkedAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        errorMessage: googleCheck.errorMessage,
        durationMs,
      });

      // Polite inter-batch delay
      if (i < batchUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Visibility check failed' }, { status: 500 });
  }
}
