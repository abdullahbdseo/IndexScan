import test from 'node:test';
import assert from 'node:assert';
import { XMLParser } from 'fast-xml-parser';

test('Sitemap Parser - parses standard urlset XML format', () => {
  const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://example.com/</loc>
      <lastmod>2025-05-20T12:00:00Z</lastmod>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://example.com/about</loc>
      <lastmod>2025-05-18</lastmod>
      <priority>0.8</priority>
    </url>
  </urlset>`;

  const parser = new XMLParser({
    ignoreAttributes: false,
    textNodeName: '#text',
    trimValues: true,
  });

  const parsed = parser.parse(xmlSample);
  assert.ok(parsed.urlset);
  assert.ok(parsed.urlset.url);
  assert.strictEqual(parsed.urlset.url.length, 2);
  assert.strictEqual(parsed.urlset.url[0].loc, 'https://example.com/');
  assert.strictEqual(parsed.urlset.url[1].loc, 'https://example.com/about');
});

test('Sitemap Parser - parses sitemapindex XML format', () => {
  const xmlIndexSample = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>https://example.com/sitemap-posts.xml</loc>
      <lastmod>2025-05-20</lastmod>
    </sitemap>
    <sitemap>
      <loc>https://example.com/sitemap-pages.xml</loc>
      <lastmod>2025-05-19</lastmod>
    </sitemap>
  </sitemapindex>`;

  const parser = new XMLParser({
    ignoreAttributes: false,
    textNodeName: '#text',
    trimValues: true,
  });

  const parsed = parser.parse(xmlIndexSample);
  assert.ok(parsed.sitemapindex);
  assert.ok(parsed.sitemapindex.sitemap);
  assert.strictEqual(parsed.sitemapindex.sitemap.length, 2);
  assert.strictEqual(parsed.sitemapindex.sitemap[0].loc, 'https://example.com/sitemap-posts.xml');
  assert.strictEqual(parsed.sitemapindex.sitemap[1].loc, 'https://example.com/sitemap-pages.xml');
});
