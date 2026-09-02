import test from 'node:test';
import assert from 'node:assert';
import { normalizeUrl, processBulkUrls } from '../lib/url/normalize';

test('URL Normalization - normalizeUrl handles protocols, casing, trailing slashes, fragments', () => {
  // Protocol addition
  const res1 = normalizeUrl('example.com/blog/');
  assert.strictEqual(res1.valid, true);
  assert.strictEqual(res1.normalizedUrl, 'https://example.com/blog');

  // Lowercase hostname
  const res2 = normalizeUrl('HTTPS://EXAMPLE.COM/Article-1');
  assert.strictEqual(res2.valid, true);
  assert.strictEqual(res2.normalizedUrl, 'https://example.com/Article-1');

  // Fragment stripping
  const res3 = normalizeUrl('https://example.com/page#section-2');
  assert.strictEqual(res3.valid, true);
  assert.strictEqual(res3.normalizedUrl, 'https://example.com/page');

  // Port normalization (standard ports 80/443 removed)
  const res4 = normalizeUrl('https://example.com:443/test');
  assert.strictEqual(res4.valid, true);
  assert.strictEqual(res4.normalizedUrl, 'https://example.com/test');

  // Root domain keeps trailing slash
  const res5 = normalizeUrl('https://example.com/');
  assert.strictEqual(res5.valid, true);
  assert.strictEqual(res5.normalizedUrl, 'https://example.com/');
});

test('Bulk Processing - processBulkUrls handles duplicates, invalid URLs, and whitespace', () => {
  const input = `
    https://example.com/page-1
    https://example.com/page-2
    https://EXAMPLE.COM/page-1
    https://example.com/page-2/
    invalid url string @@#
    https://example.com/page-3#top
  `;

  const processed = processBulkUrls(input);
  assert.strictEqual(processed.validUrls.length, 3);
  assert.strictEqual(processed.duplicatesRemoved, 2);
  assert.strictEqual(processed.invalidUrls.length, 1);
  assert.strictEqual(processed.validUrls.includes('https://example.com/page-1'), true);
  assert.strictEqual(processed.validUrls.includes('https://example.com/page-2'), true);
  assert.strictEqual(processed.validUrls.includes('https://example.com/page-3'), true);
});
