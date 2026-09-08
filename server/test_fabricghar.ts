import * as cheerio from 'cheerio';

async function run() {
  try {
    console.log('Fetching https://fabricghar.com/ ...');
    const resp = await fetch('https://fabricghar.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    });

    console.log('Status:', resp.status, resp.statusText);
    const html = await resp.text();
    console.log('HTML size:', html.length, 'bytes');

    const $ = cheerio.load(html);

    console.log('\n=========================================');
    console.log('   FABRICGHAR.COM FULL SEO & SPEED AUDIT');
    console.log('=========================================');

    console.log('\n[1] TECHNICAL & ON-PAGE SEO:');
    const title = $('title').text().trim();
    console.log('  Page Title:', title, `(${title.length} chars)`);
    const metaDesc = $('meta[name="description"]').attr('content') || 'MISSING';
    console.log('  Meta Description:', metaDesc, `(${metaDesc.length} chars)`);
    console.log('  Canonical URL:', $('link[rel="canonical"]').attr('href') || 'MISSING');
    console.log('  Robots Meta:', $('meta[name="robots"]').attr('content') || 'MISSING');
    
    const h1s: string[] = [];
    $('h1').each((i, el) => {
      h1s.push($(el).text().replace(/\s+/g, ' ').trim());
    });
    console.log(`  H1 Tags (${h1s.length}):`, h1s);
    console.log('  H2 Tags Count:', $('h2').length);
    console.log('  H3 Tags Count:', $('h3').length);

    console.log('\n[2] PERFORMANCE & SPEED BOTTLENECKS:');
    const scripts = $('script');
    let externalScripts = 0;
    let syncScripts: string[] = [];
    let deferScripts = 0;
    let asyncScripts = 0;

    scripts.each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        externalScripts++;
        const isAsync = $(el).attr('async') !== undefined;
        const isDefer = $(el).attr('defer') !== undefined;
        if (isAsync) asyncScripts++;
        else if (isDefer) deferScripts++;
        else syncScripts.push(src);
      }
    });

    console.log('  Total External JS:', externalScripts);
    console.log('  - Async JS:', asyncScripts);
    console.log('  - Defer JS:', deferScripts);
    console.log('  - Render-Blocking Sync JS:', syncScripts.length);
    if (syncScripts.length > 0) {
      console.log('  Sample Render-Blocking Scripts:');
      syncScripts.slice(0, 5).forEach(s => console.log('    •', s));
    }

    const stylesheets = $('link[rel="stylesheet"]');
    console.log('  External CSS Stylesheets:', stylesheets.length);
    stylesheets.slice(0, 5).each((i, el) => {
      console.log('    •', $(el).attr('href'));
    });

    console.log('\n[3] IMAGE & MEDIA AUDIT:');
    const images = $('img');
    console.log('  Total Images:', images.length);
    let missingAlt = 0;
    let missingDimensions = 0;
    let nonWebpCount = 0;
    let unlazyCount = 0;
    const sampleImgs: any[] = [];

    images.each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      const alt = $(el).attr('alt');
      const w = $(el).attr('width');
      const h = $(el).attr('height');
      const loading = $(el).attr('loading');

      if (!alt || alt.trim() === '') missingAlt++;
      if (!w || !h) missingDimensions++;
      if (src && !src.includes('.webp') && !src.includes('.avif') && !src.includes('.svg') && !src.startsWith('data:')) nonWebpCount++;
      if (loading !== 'lazy') unlazyCount++;

      if (i < 5) {
        sampleImgs.push({ src: src.substring(0, 70), alt: alt || 'MISSING', w, h, loading });
      }
    });

    console.log('  - Images Missing ALT Text (Accessibility & Image SEO):', missingAlt);
    console.log('  - Images Missing width/height (Causes CLS Layout Shifts):', missingDimensions);
    console.log('  - Non-WebP / Legacy JPG/PNG formats (LCP speed drag):', nonWebpCount);
    console.log('  - Images without loading="lazy" (Slows initial page load):', unlazyCount);
    console.log('  Sample Image Elements:', sampleImgs);

    console.log('\n[4] STRUCTURED DATA (SCHEMA.ORG):');
    const schemas = $('script[type="application/ld+json"]');
    console.log('  JSON-LD Blocks found:', schemas.length);
    schemas.each((i, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        console.log('    Schema @type:', parsed['@type'] || (parsed['@graph'] ? parsed['@graph'].map((g: any) => g['@type']) : 'Unknown'));
      } catch(e) {}
    });

    console.log('\n[5] SERVER & CACHE HEADERS:');
    console.log('  Server:', resp.headers.get('server'));
    console.log('  X-LiteSpeed-Cache:', resp.headers.get('x-litespeed-cache'));
    console.log('  Cache-Control:', resp.headers.get('cache-control'));
    console.log('  Strict-Transport-Security:', resp.headers.get('strict-transport-security'));

  } catch (err: any) {
    console.error('Audit Error:', err);
  }
}

run();
