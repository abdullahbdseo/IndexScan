import { CrawledPageData } from '../../types/index.js';

export interface GeneratedSchemaProposal {
  schemaType: 'Organization' | 'Product' | 'BreadcrumbList' | 'FAQPage' | 'Article' | 'LocalBusiness';
  targetUrl: string;
  jsonLdObject: Record<string, any>;
  jsonLdScriptTag: string;
  isValid: boolean;
  validationWarnings: string[];
  explanation: string;
}

export class SchemaGenerator {
  /**
   * Generates all appropriate JSON-LD schemas for a given page.
   */
  public static generateForPage(page: CrawledPageData, siteDomain: string, siteName: string = 'Fabric Ghar'): GeneratedSchemaProposal[] {
    const proposals: GeneratedSchemaProposal[] = [];
    const isRoot = page.pathname === '/' || page.depth === 0;
    const lowerUrl = page.url.toLowerCase();

    // 1. Organization / Website schema for Homepage
    if (isRoot) {
      proposals.push(this.generateOrganizationSchema(page, siteDomain, siteName));
    }

    // 2. BreadcrumbList for all interior pages
    if (!isRoot) {
      proposals.push(this.generateBreadcrumbSchema(page, siteDomain, siteName));
    }

    // 3. Product Schema for product pages
    const isProduct = lowerUrl.includes('/product/') || lowerUrl.includes('/item/') || lowerUrl.includes('/p/');
    if (isProduct) {
      proposals.push(this.generateProductSchema(page, siteName));
    }

    // 4. FAQPage Schema if headings contain questions
    const hasQuestions = page.headings.h2.concat(page.headings.h3).some(h => h.includes('?') || /^(what|how|why|when|where|can|is)\b/i.test(h));
    if (hasQuestions) {
      proposals.push(this.generateFaqSchema(page));
    }

    // 5. Article Schema for blog/articles
    const isArticle = lowerUrl.includes('/blog/') || lowerUrl.includes('/article/') || lowerUrl.includes('/post/');
    if (isArticle) {
      proposals.push(this.generateArticleSchema(page, siteName));
    }

    return proposals;
  }

  // --- 1. Organization Schema ---
  public static generateOrganizationSchema(page: CrawledPageData, siteDomain: string, siteName: string): GeneratedSchemaProposal {
    const logoImg = page.images.find(i => i.src.toLowerCase().includes('logo'))?.src || `${page.url}/logo.png`;
    
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': siteName,
      'url': page.url,
      'logo': logoImg,
      'description': page.metaDescription || `${siteName} - Premium Quality Collection`,
      'sameAs': [
        'https://facebook.com',
        'https://instagram.com'
      ]
    };

    return {
      schemaType: 'Organization',
      targetUrl: page.url,
      jsonLdObject: jsonLd,
      jsonLdScriptTag: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
      isValid: true,
      validationWarnings: [],
      explanation: 'Establishes site identity, official logo, and brand authority in Google Knowledge Graph.'
    };
  }

  // --- 2. BreadcrumbList Schema ---
  public static generateBreadcrumbSchema(page: CrawledPageData, siteDomain: string, siteName: string): GeneratedSchemaProposal {
    const pathParts = page.pathname.split('/').filter(p => p.length > 0);
    const itemListElement: any[] = [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': `https://${siteDomain}/`
      }
    ];

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      // Clean up part title
      const rawName = part.replace(/[-_]/g, ' ').replace(/\.html?$/, '');
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      itemListElement.push({
        '@type': 'ListItem',
        'position': index + 2,
        'name': formattedName,
        'item': `https://${siteDomain}${currentPath}`
      });
    });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': itemListElement
    };

    return {
      schemaType: 'BreadcrumbList',
      targetUrl: page.url,
      jsonLdObject: jsonLd,
      jsonLdScriptTag: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
      isValid: true,
      validationWarnings: [],
      explanation: 'Enables rich snippet breadcrumb navigation trail in Google search results.'
    };
  }

  // --- 3. Product Schema ---
  public static generateProductSchema(page: CrawledPageData, brandName: string): GeneratedSchemaProposal {
    const productName = page.headings.h1[0] || page.title?.split('|')[0]?.trim() || 'Product';
    const mainImage = page.images[0]?.src || '';
    const warnings: string[] = [];

    if (!mainImage) warnings.push('Product image is recommended for rich snippet display.');

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': productName,
      'image': mainImage ? [mainImage] : undefined,
      'description': page.metaDescription || productName,
      'brand': {
        '@type': 'Brand',
        'name': brandName
      },
      'offers': {
        '@type': 'Offer',
        'url': page.url,
        'priceCurrency': 'BDT',
        'price': '990',
        'availability': 'https://schema.org/InStock',
        'itemCondition': 'https://schema.org/NewCondition'
      }
    };

    return {
      schemaType: 'Product',
      targetUrl: page.url,
      jsonLdObject: jsonLd,
      jsonLdScriptTag: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
      isValid: true,
      validationWarnings: warnings,
      explanation: 'Enables Product rich snippet showing price, availability, and brand badges in Google search.'
    };
  }

  // --- 4. FAQPage Schema ---
  public static generateFaqSchema(page: CrawledPageData): GeneratedSchemaProposal {
    const questionHeadings = page.headings.h2
      .concat(page.headings.h3)
      .filter(h => h.includes('?') || /^(what|how|why|when|where|can|is)\b/i.test(h))
      .slice(0, 5);

    const mainEntity = questionHeadings.map(q => ({
      '@type': 'Question',
      'name': q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': `For full information regarding ${q.toLowerCase().replace(/\?/, '')}, please consult our customer service or visit the detailed product documentation.`
      }
    }));

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': mainEntity
    };

    return {
      schemaType: 'FAQPage',
      targetUrl: page.url,
      jsonLdObject: jsonLd,
      jsonLdScriptTag: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
      isValid: mainEntity.length > 0,
      validationWarnings: [],
      explanation: 'Enables interactive accordion Q&A drop-downs directly within Google SERP listings.'
    };
  }

  // --- 5. Article Schema ---
  public static generateArticleSchema(page: CrawledPageData, publisherName: string): GeneratedSchemaProposal {
    const headline = page.headings.h1[0] || page.title || 'Article';
    const mainImage = page.images[0]?.src || '';

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': headline,
      'image': mainImage ? [mainImage] : undefined,
      'datePublished': new Date().toISOString(),
      'dateModified': new Date().toISOString(),
      'author': {
        '@type': 'Organization',
        'name': publisherName
      },
      'publisher': {
        '@type': 'Organization',
        'name': publisherName
      },
      'description': page.metaDescription || headline
    };

    return {
      schemaType: 'Article',
      targetUrl: page.url,
      jsonLdObject: jsonLd,
      jsonLdScriptTag: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`,
      isValid: true,
      validationWarnings: [],
      explanation: 'Enables Article rich carousel placement and author attribution in search results.'
    };
  }
}
