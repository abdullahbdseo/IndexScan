import crypto from 'crypto';

export interface IndexNowSubmitOptions {
  host: string;
  urlList: string[];
  key?: string;
  keyLocation?: string;
}

export interface IndexNowResult {
  success: boolean;
  statusCode: number;
  message: string;
  submittedCount: number;
  timestamp: string;
}

/**
 * Submits single or multiple URLs to the IndexNow protocol (supported by Bing, Yandex, Seznam, Naver)
 */
export async function submitToIndexNow(options: IndexNowSubmitOptions): Promise<IndexNowResult> {
  const { host, urlList, keyLocation } = options;

  if (!urlList || urlList.length === 0) {
    throw new Error('No URLs provided for IndexNow submission');
  }

  // Generate a valid 32-character hex key if none provided
  const apiKey = options.key && options.key.trim().length >= 8 
    ? options.key.trim() 
    : crypto.randomBytes(16).toString('hex');

  // Normalize URLs to ensure they belong to the host
  const cleanHost = host.replace(/^https?:\/\//i, '').replace(/\/+$/, '').split('/')[0];

  const payload: Record<string, unknown> = {
    host: cleanHost,
    key: apiKey,
    urlList: urlList.slice(0, 10000), // Max 10,000 per IndexNow specs
  };

  if (keyLocation) {
    payload.keyLocation = keyLocation;
  }

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'IndexCheck-SEO-Tool/1.0',
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.status;

    if (statusCode === 200 || statusCode === 202) {
      return {
        success: true,
        statusCode,
        message: statusCode === 200 
          ? 'Successfully submitted to IndexNow search engines (Bing, Yandex, Seznam)!' 
          : 'Submission accepted by IndexNow (key validation in progress).',
        submittedCount: urlList.length,
        timestamp: new Date().toISOString(),
      };
    } else if (statusCode === 429) {
      return {
        success: false,
        statusCode,
        message: 'Too many requests. IndexNow rate limit reached. Please try again later.',
        submittedCount: 0,
        timestamp: new Date().toISOString(),
      };
    } else {
      let errText = '';
      try {
        errText = await response.text();
      } catch {
        errText = response.statusText;
      }
      return {
        success: false,
        statusCode,
        message: `IndexNow submission returned status ${statusCode}: ${errText || 'Invalid request'}`,
        submittedCount: 0,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      statusCode: 500,
      message: `Failed to connect to IndexNow API: ${err.message || 'Network error'}`,
      submittedCount: 0,
      timestamp: new Date().toISOString(),
    };
  }
}
