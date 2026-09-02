import { NextResponse } from 'next/server';
import { discoverAndParseWebsiteSitemaps } from '@/lib/sitemap/parser';
import { validateSafeUrl } from '@/lib/security/ssrf';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const ssrf = await validateSafeUrl(url);
    if (!ssrf.valid) {
      return NextResponse.json({ error: ssrf.error || 'URL restricted by security policy' }, { status: 400 });
    }

    const discovery = await discoverAndParseWebsiteSitemaps(url);

    return NextResponse.json({
      success: true,
      websiteUrl: url,
      sitemapsFound: discovery.sitemapsFound,
      robotsDirectivesFound: discovery.robotsDirectivesFound,
      totalUrls: discovery.totalUrls,
      urls: discovery.urls,
      errors: discovery.errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to discover sitemaps' }, { status: 500 });
  }
}
