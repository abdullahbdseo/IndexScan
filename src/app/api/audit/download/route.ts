import { NextRequest, NextResponse } from 'next/server';
import { buildExcelReport } from '@/lib/audit/excelReportBuilder';
import { getCachedAudit } from '@/lib/audit/auditCache';
import type { AuditResult } from '@/lib/audit/seoAuditEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Audit ID required' }, { status: 400 });
    }

    const audit = getCachedAudit(id);
    if (!audit) {
      return NextResponse.json({ error: 'Audit result not found or expired. Please re-run audit.' }, { status: 404 });
    }

    const buffer = await buildExcelReport(audit);
    const domain = new URL(audit.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${domain}_SEO_Audit_Report.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate report' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const audit: AuditResult = body.auditData;

    if (!audit || !audit.url) {
      return NextResponse.json({ error: 'Valid auditData is required' }, { status: 400 });
    }

    const buffer = await buildExcelReport(audit);
    const domain = new URL(audit.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${domain}_SEO_Audit_Report.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error('Download POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate report' }, { status: 500 });
  }
}
