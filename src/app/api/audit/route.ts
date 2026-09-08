import { NextRequest, NextResponse } from 'next/server';
import { runSeoAudit } from '@/lib/audit/seoAuditEngine';
import { setCachedAudit } from '@/lib/audit/auditCache';

export const maxDuration = 60; // 60 seconds max duration on Vercel Pro/Hobby

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'URL must start with http:// or https://' },
        { status: 400 }
      );
    }

    const auditResult = await runSeoAudit(trimmedUrl);
    setCachedAudit(auditResult.id, auditResult);

    return NextResponse.json({
      success: true,
      ...auditResult,
    });
  } catch (err: any) {
    console.error('Audit API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Audit failed' },
      { status: 500 }
    );
  }
}
