import { NextResponse } from 'next/server';
import { auditTechnicalUrl } from '@/lib/technical/audit';
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

    const audit = await auditTechnicalUrl(url);

    return NextResponse.json({
      success: true,
      url,
      audit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Technical audit failed' }, { status: 500 });
  }
}
