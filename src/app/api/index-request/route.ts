import { NextRequest, NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/indexing/indexNow';
import { submitToGoogleIndexingApi, GoogleServiceAccountKey } from '@/lib/indexing/googleIndexing';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { engine, host, urls, key, keyLocation, serviceAccountKey, actionType } = body;

    // 1. Validate Input
    if (!engine) {
      return NextResponse.json(
        { error: 'Missing parameter: "engine" is required (INDEXNOW | GOOGLE | TEST_GOOGLE_KEY)' },
        { status: 400 }
      );
    }

    // 2. IndexNow Handler
    if (engine === 'INDEXNOW') {
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'Please provide at least one valid URL for IndexNow.' }, { status: 400 });
      }

      // Determine host if not explicitly given
      let targetHost = host;
      if (!targetHost && urls[0]) {
        try {
          const parsed = new URL(urls[0]);
          targetHost = parsed.hostname;
        } catch {
          targetHost = 'example.com';
        }
      }

      const result = await submitToIndexNow({
        host: targetHost,
        urlList: urls.slice(0, 1000), // Protect serverless payload
        key,
        keyLocation,
      });

      return NextResponse.json(result);
    }

    // 3. Test Google Service Account Key Handler
    if (engine === 'TEST_GOOGLE_KEY') {
      if (!serviceAccountKey) {
        return NextResponse.json({ error: 'Service Account JSON is required' }, { status: 400 });
      }

      let keyObj: GoogleServiceAccountKey;
      if (typeof serviceAccountKey === 'string') {
        try {
          keyObj = JSON.parse(serviceAccountKey);
        } catch {
          return NextResponse.json({ error: 'Invalid JSON format in Service Account Key.' }, { status: 400 });
        }
      } else {
        keyObj = serviceAccountKey;
      }

      if (!keyObj.client_email || !keyObj.private_key) {
        return NextResponse.json(
          { error: 'Service Account Key must contain "client_email" and "private_key" fields.' },
          { status: 400 }
        );
      }

      // Test a dry-run auth token acquisition
      try {
        const testBatch = await submitToGoogleIndexingApi(
          keyObj,
          ['https://www.google.com/test-key-probe-check'],
          'URL_UPDATED'
        );

        // If auth failed, it will throw. If auth succeeded, it might say permission denied for this fake URL or 403 on the URL (which means Auth is valid).
        const authOk = !testBatch.results[0]?.message.toLowerCase().includes('google auth failed');
        return NextResponse.json({
          valid: authOk,
          clientEmail: keyObj.client_email,
          projectId: keyObj.project_id || 'N/A',
          message: 'Google Cloud Service Account authenticated successfully!',
        });
      } catch (authErr: unknown) {
        const err = authErr as Error;
        return NextResponse.json(
          { valid: false, error: err.message || 'Authentication failed' },
          { status: 400 }
        );
      }
    }

    // 4. Google Indexing API Submit Handler
    if (engine === 'GOOGLE') {
      if (!serviceAccountKey) {
        return NextResponse.json(
          { error: 'Google Service Account JSON key is required for Google Indexing API.' },
          { status: 400 }
        );
      }

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return NextResponse.json({ error: 'Please provide a list of URLs to submit.' }, { status: 400 });
      }

      let keyObj: GoogleServiceAccountKey;
      if (typeof serviceAccountKey === 'string') {
        try {
          keyObj = JSON.parse(serviceAccountKey);
        } catch {
          return NextResponse.json({ error: 'Invalid JSON format in Service Account Key.' }, { status: 400 });
        }
      } else {
        keyObj = serviceAccountKey;
      }

      // Cap at 200 URLs to match Google's daily free quota limit per batch
      const targetUrls = urls.slice(0, 200);

      const result = await submitToGoogleIndexingApi(
        keyObj,
        targetUrls,
        actionType === 'URL_DELETED' ? 'URL_DELETED' : 'URL_UPDATED'
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown engine requested' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Internal server error processing index request' },
      { status: 500 }
    );
  }
}
