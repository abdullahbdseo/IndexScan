import dns from 'dns/promises';
import { isIP } from 'net';

/**
 * Checks whether an IP address belongs to private, loopback, or internal ranges.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // Check IPv4
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;

    return false;
  }

  // Check IPv6
  if (isIP(ip) === 6) {
    const cleanIp = ip.toLowerCase();
    // Loopback
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
    // Unspecified
    if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;
    // Unique local address (fc00::/7)
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
    // Link-local address (fe80::/10)
    if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 etc.)
    if (cleanIp.includes('::ffff:')) {
      const ipv4Part = cleanIp.split('::ffff:')[1];
      if (ipv4Part && isIP(ipv4Part) === 4) {
        return isPrivateOrReservedIP(ipv4Part);
      }
    }
    return false;
  }

  return true; // Not a valid IP -> treat with caution
}

/**
 * Validates a target URL for SSRF vulnerabilities before any network request.
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ valid: boolean; url?: URL; error?: string }> {
  try {
    let urlToParse = rawUrl.trim();
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = 'https://' + urlToParse;
    }

    const parsed = new URL(urlToParse);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Invalid protocol: ${parsed.protocol}. Only http: and https: are allowed.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block obvious loopback/internal hosts
    const blockedHostnames = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      'metadata.google.internal',
      '169.254.169.254',
      'instance-data',
    ];

    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: `Access to internal host '${hostname}' is restricted.` };
    }

    if (hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan')) {
      return { valid: false, error: `Access to local network domain '${hostname}' is restricted.` };
    }

    // If hostname is directly an IP address, test it
    if (isIP(hostname)) {
      if (isPrivateOrReservedIP(hostname)) {
        return { valid: false, error: `Access to private IP address '${hostname}' is restricted.` };
      }
    } else {
      // Resolve DNS to verify against DNS rebinding to private IPs
      try {
        const lookupResult = await dns.lookup(hostname, { all: true });
        for (const record of lookupResult) {
          if (isPrivateOrReservedIP(record.address)) {
            return { valid: false, error: `Domain '${hostname}' resolves to private address (${record.address}).` };
          }
        }
      } catch (dnsErr: any) {
        // DNS lookup failed: might be unreachable
        return { valid: false, error: `Could not resolve hostname '${hostname}': ${dnsErr.message || 'DNS error'}` };
      }
    }

    return { valid: true, url: parsed };
  } catch (err: any) {
    return { valid: false, error: `Invalid URL format: ${err.message || 'Failed to parse URL'}` };
  }
}

/**
 * Safe fetch wrapper that enforces timeouts, size limits, and safe headers.
 */
export async function safeFetch(
  url: string,
  options: {
    timeoutMs?: number;
    maxBytes?: number;
    headers?: Record<string, string>;
    method?: string;
  } = {}
): Promise<{ ok: boolean; status: number; text: () => Promise<string>; buffer: () => Promise<Buffer>; headers: Headers; finalUrl: string }> {
  const { timeoutMs = 12000, maxBytes = 10 * 1024 * 1024, headers = {}, method = 'GET' } = options;

  const validation = await validateSafeUrl(url);
  if (!validation.valid || !validation.url) {
    throw new Error(validation.error || 'URL failed safety validation');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (compatible; IndexCheckBot/1.0; +https://indexcheck.tool)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      ...headers,
    };

    const res = await fetch(validation.url.toString(), {
      method,
      headers: defaultHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // Stream and check max bytes
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > maxBytes) {
      throw new Error(`Response size exceeded maximum allowed limit (${Math.round(maxBytes / 1024 / 1024)}MB)`);
    }

    const nodeBuffer = Buffer.from(arrayBuf);

    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers,
      finalUrl: res.url,
      text: async () => nodeBuffer.toString('utf-8'),
      buffer: async () => nodeBuffer,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}
