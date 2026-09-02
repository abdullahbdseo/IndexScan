import test from 'node:test';
import assert from 'node:assert';
import { generateCsv } from '../lib/export/csv';

test('CSV Generation - RFC 4180 escaping and column formatting', () => {
  const mockResults = [
    {
      id: '1',
      url: 'https://example.com/page-1',
      normalizedUrl: 'https://example.com/page-1',
      googleStatus: 'FOUND' as const,
      httpStatus: 200,
      canonicalStatus: 'SELF' as const,
      sitemapSource: 'https://example.com/sitemap.xml',
      lastModified: '2025-05-20',
      checkedAt: 'May 24, 2025, 10:30 AM',
    },
    {
      id: '2',
      url: 'https://example.com/page-2,with-comma',
      normalizedUrl: 'https://example.com/page-2,with-comma',
      googleStatus: 'NOT FOUND' as const,
      httpStatus: 404,
      canonicalUrl: 'https://example.com/canonical-target',
      canonicalStatus: 'DIVERGENT' as const,
      sitemapSource: 'https://example.com/sitemap.xml',
      lastModified: '2025-05-18',
      checkedAt: 'May 24, 2025, 10:30 AM',
    },
  ];

  const csv = generateCsv(mockResults);
  const lines = csv.split('\r\n');

  assert.strictEqual(lines.length, 3);
  assert.strictEqual(lines[0], '"URL","Google Status","HTTP Status","Canonical","Sitemap","Last Modified","Checked At"');
  assert.strictEqual(lines[1].includes('"https://example.com/page-1"'), true);
  assert.strictEqual(lines[1].includes('"FOUND"'), true);
  assert.strictEqual(lines[1].includes('"200"'), true);
  assert.strictEqual(lines[1].includes('"Self"'), true);
  // Escaping test with comma in URL
  assert.strictEqual(lines[2].includes('"https://example.com/page-2,with-comma"'), true);
  assert.strictEqual(lines[2].includes('"NOT FOUND"'), true);
  assert.strictEqual(lines[2].includes('"404"'), true);
});
