export interface CmsDetectionResult {
  cms: string;
  framework?: string;
  server?: string;
  renderingMethod: 'STATIC' | 'SSR' | 'CSR' | 'HYDRATED';
  isEcommerce: boolean;
  confidence: number;
  detectedSignals: string[];
  recommendedAdapter: 'wordpress' | 'shopify' | 'local_fs' | 'git' | 'sftp' | 'generic_api';
}

export class CmsDetector {
  public static detect(html: string, headers: Record<string, string> = {}, url: string = ''): CmsDetectionResult {
    const signals: string[] = [];
    const lowerHtml = html.toLowerCase();
    const serverHeader = (headers['server'] || headers['Server'] || '').toLowerCase();
    const poweredBy = (headers['x-powered-by'] || headers['X-Powered-By'] || '').toLowerCase();

    let cms = 'Static HTML / Custom';
    let framework: string | undefined = undefined;
    let renderingMethod: 'STATIC' | 'SSR' | 'CSR' | 'HYDRATED' = 'STATIC';
    let isEcommerce = false;
    let confidence = 70;
    let recommendedAdapter: 'wordpress' | 'shopify' | 'local_fs' | 'git' | 'sftp' | 'generic_api' = 'local_fs';

    // 1. WordPress / WooCommerce
    if (
      lowerHtml.includes('wp-content') ||
      lowerHtml.includes('wp-includes') ||
      lowerHtml.includes('wp-json') ||
      lowerHtml.includes('generator" content="wordpress')
    ) {
      cms = 'WordPress';
      confidence = 98;
      signals.push('Found wp-content or WordPress generator tags');
      recommendedAdapter = 'wordpress';
      if (lowerHtml.includes('woocommerce') || lowerHtml.includes('wc-block') || lowerHtml.includes('add-to-cart')) {
        isEcommerce = true;
        signals.push('WooCommerce eCommerce plugin detected');
      }
    }
    // 2. Shopify
    else if (
      lowerHtml.includes('cdn.shopify.com') ||
      lowerHtml.includes('shopify.theme') ||
      lowerHtml.includes('myshopify.com')
    ) {
      cms = 'Shopify';
      isEcommerce = true;
      confidence = 99;
      signals.push('Shopify CDN & Theme scripts detected');
      recommendedAdapter = 'shopify';
    }
    // 3. Webflow
    else if (lowerHtml.includes('w-layout-grid') || lowerHtml.includes('webflow.com') || lowerHtml.includes('data-wf-page')) {
      cms = 'Webflow';
      confidence = 95;
      signals.push('Webflow attributes and stylesheet signatures detected');
      recommendedAdapter = 'generic_api';
    }
    // 4. Next.js
    else if (lowerHtml.includes('__next') || lowerHtml.includes('/_next/static') || lowerHtml.includes('__next_data__')) {
      cms = 'Next.js Application';
      framework = 'React';
      renderingMethod = lowerHtml.includes('__next_data__') ? 'HYDRATED' : 'SSR';
      confidence = 95;
      signals.push('Next.js script and hydration markers found');
      recommendedAdapter = 'git';
    }
    // 5. Nuxt.js
    else if (lowerHtml.includes('__nuxt') || lowerHtml.includes('/_nuxt/')) {
      cms = 'Nuxt.js Application';
      framework = 'Vue';
      renderingMethod = 'HYDRATED';
      confidence = 95;
      signals.push('Nuxt Vue hydration markers found');
      recommendedAdapter = 'git';
    }
    // 6. Wix
    else if (lowerHtml.includes('wix.com') || lowerHtml.includes('wixstatic.com') || lowerHtml.includes('wix-image')) {
      cms = 'Wix';
      confidence = 95;
      signals.push('Wix site architecture signatures found');
      recommendedAdapter = 'generic_api';
    }
    // 7. Squarespace
    else if (lowerHtml.includes('squarespace.com') || lowerHtml.includes('static1.squarespace.com')) {
      cms = 'Squarespace';
      confidence = 95;
      signals.push('Squarespace asset signatures found');
      recommendedAdapter = 'generic_api';
    }
    // 8. Ghost
    else if (lowerHtml.includes('ghost.org') || lowerHtml.includes('generator" content="ghost')) {
      cms = 'Ghost CMS';
      confidence = 90;
      signals.push('Ghost CMS generator signature found');
      recommendedAdapter = 'generic_api';
    }

    // Framework detection
    if (!framework) {
      if (lowerHtml.includes('data-reactroot') || lowerHtml.includes('react')) {
        framework = 'React';
        renderingMethod = 'CSR';
        signals.push('React rendering detected');
      } else if (lowerHtml.includes('data-v-') || lowerHtml.includes('vue')) {
        framework = 'Vue.js';
        signals.push('Vue.js template markers detected');
      } else if (lowerHtml.includes('ng-version') || lowerHtml.includes('ng-app')) {
        framework = 'Angular';
        renderingMethod = 'CSR';
        signals.push('Angular root directives detected');
      } else if (poweredBy.includes('express') || serverHeader.includes('express')) {
        framework = 'Node.js / Express';
        signals.push('Express server header detected');
      } else if (poweredBy.includes('php') || lowerHtml.includes('.php')) {
        framework = 'PHP / Native';
        signals.push('PHP runtime detected');
      }
    }

    return {
      cms,
      framework,
      server: serverHeader || poweredBy || 'Standard Web Server',
      renderingMethod,
      isEcommerce,
      confidence,
      detectedSignals: signals,
      recommendedAdapter
    };
  }
}
