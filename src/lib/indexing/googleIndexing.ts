import crypto from 'crypto';

export interface GoogleServiceAccountKey {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
}

export interface GoogleIndexingItemResult {
  url: string;
  success: boolean;
  statusCode?: number;
  message: string;
  notifyTime?: string;
  type?: 'URL_UPDATED' | 'URL_DELETED';
}

export interface GoogleIndexingBatchResult {
  success: boolean;
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: GoogleIndexingItemResult[];
  quotaMessage?: string;
}

/**
 * Base64 URL Encode utility
 */
function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str) : str;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate Google OAuth2 Access Token using RS256 JWT assertion
 */
async function getGoogleOAuthToken(credentials: GoogleServiceAccountKey): Promise<string> {
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Invalid Service Account Key: client_email and private_key are required.');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA-SHA256
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();

  // Normalize private key formatting in case of line break escapes
  let privateKey = credentials.private_key;
  if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const signature = signer.sign(privateKey);
  const encodedSignature = base64UrlEncode(signature);
  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenUrl = credentials.token_uri || 'https://oauth2.googleapis.com/token';

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    let errBody = '';
    try {
      const errJson = await tokenRes.json();
      errBody = errJson.error_description || errJson.error || JSON.stringify(errJson);
    } catch {
      errBody = await tokenRes.text();
    }
    throw new Error(`Google Auth Failed (${tokenRes.status}): ${errBody || 'Check your Service Account credentials and permissions.'}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('No access_token returned by Google Auth endpoint.');
  }

  return tokenData.access_token as string;
}

/**
 * Submit URLs to Google Indexing API
 */
export async function submitToGoogleIndexingApi(
  credentials: GoogleServiceAccountKey,
  urls: string[],
  actionType: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<GoogleIndexingBatchResult> {
  if (!urls || urls.length === 0) {
    return {
      success: false,
      totalRequested: 0,
      successCount: 0,
      failureCount: 0,
      results: [],
      quotaMessage: 'No URLs provided',
    };
  }

  // Obtain access token
  const accessToken = await getGoogleOAuthToken(credentials);

  const results: GoogleIndexingItemResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Process URLs in controlled series/micro-batches to respect Google API limits
  for (const targetUrl of urls) {
    try {
      const publishRes = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url: targetUrl,
          type: actionType,
        }),
      });

      if (publishRes.ok) {
        const publishData = await publishRes.json();
        results.push({
          url: targetUrl,
          success: true,
          statusCode: 200,
          message: 'Notification successfully sent to Googlebot.',
          notifyTime: publishData?.urlNotificationMetadata?.latestUpdate?.notifyTime || new Date().toISOString(),
          type: actionType,
        });
        successCount++;
      } else {
        const errJson = await publishRes.json().catch(() => null);
        const errMsg =
          errJson?.error?.message ||
          `HTTP ${publishRes.status}: ${publishRes.statusText}`;

        results.push({
          url: targetUrl,
          success: false,
          statusCode: publishRes.status,
          message: errMsg,
          type: actionType,
        });
        failureCount++;
      }
    } catch (itemErr: unknown) {
      const err = itemErr as Error;
      results.push({
        url: targetUrl,
        success: false,
        statusCode: 500,
        message: err.message || 'Network error communicating with Google API',
        type: actionType,
      });
      failureCount++;
    }
  }

  return {
    success: successCount > 0,
    totalRequested: urls.length,
    successCount,
    failureCount,
    results,
    quotaMessage: `Completed ${successCount} successful requests out of ${urls.length} (Daily free Google quota: 200 URLs).`,
  };
}
