import { NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/security/ssrf';
import { normalizeUrl } from '@/lib/url/normalize';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const norm = normalizeUrl(url);
    if (!norm.valid) {
      return NextResponse.json({ error: norm.error || 'Invalid URL format' }, { status: 400 });
    }

    const ssrf = await validateSafeUrl(norm.normalizedUrl);
    if (!ssrf.valid) {
      return NextResponse.json({ error: ssrf.error || 'URL restricted by security policy' }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      normalizedUrl: norm.normalizedUrl,
      hostname: ssrf.url?.hostname,
      protocol: ssrf.url?.protocol,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation failed' }, { status: 500 });
  }
}
