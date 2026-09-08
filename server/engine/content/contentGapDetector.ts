import { CrawledPageData } from '../../types/index.js';

export interface ContentGap {
  id: string;
  url: string;
  gapType: 'MISSING_FAQ' | 'MISSING_CTA' | 'MISSING_SPECS' | 'MISSING_REVIEWS' | 'MISSING_CATEGORY_INTRO' | 'MISSING_TOC';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  suggestedContent: string;
  seoImpact: number; // 0-100
}

export class ContentGapDetector {
  /**
   * Identifies missing content opportunities for a specific page based on its archetype.
   */
  public static detectGaps(page: CrawledPageData): ContentGap[] {
    const gaps: ContentGap[] = [];
    const lowerUrl = page.url.toLowerCase();
    const headingText = [...page.headings.h1, ...page.headings.h2, ...page.headings.h3].join(' ').toLowerCase();

    // 1. Check for Missing FAQs (High SEO Impact across all informational & commercial pages)
    const hasFaq = headingText.includes('faq') || headingText.includes('frequently asked') || headingText.includes('questions');
    if (!hasFaq && page.depth <= 2 && page.wordCount > 150) {
      gaps.push({
        id: `gap-faq-${page.id}`,
        url: page.url,
        gapType: 'MISSING_FAQ',
        severity: 'MEDIUM',
        title: 'Missing Frequently Asked Questions (FAQ) Section',
        description: 'Adding a 3-5 item FAQ section with FAQPage Schema helps capture Google People Also Ask (PAA) rich snippets and addresses long-tail queries.',
        suggestedContent: `## Frequently Asked Questions\n- **Q: What are the primary features?**\n  A: Detailed answer addressing key user pain points.\n- **Q: How does shipping/delivery work?**\n  A: Clear terms and delivery timeline.`,
        seoImpact: 75
      });
    }

    // 2. Product Page Specific Gaps
    const isProduct = lowerUrl.includes('/product/') || lowerUrl.includes('/item/') || lowerUrl.includes('/p/');
    if (isProduct) {
      const hasSpecs = headingText.includes('spec') || headingText.includes('detail') || headingText.includes('material') || headingText.includes('dimension');
      if (!hasSpecs) {
        gaps.push({
          id: `gap-specs-${page.id}`,
          url: page.url,
          gapType: 'MISSING_SPECS',
          severity: 'HIGH',
          title: 'Missing Product Specification & Material Details',
          description: 'E-commerce buyers and Google Merchant crawlers rely on structured attribute lists (fabric type, dimensions, color, origin) for search relevance.',
          suggestedContent: `### Product Specifications\n- **Material / Fabric**: 100% Premium Cotton\n- **Care Instructions**: Machine wash gentle\n- **Origin**: Handcrafted in Bangladesh`,
          seoImpact: 85
        });
      }

      const hasReviews = headingText.includes('review') || headingText.includes('rating') || headingText.includes('testimonial');
      if (!hasReviews) {
        gaps.push({
          id: `gap-reviews-${page.id}`,
          url: page.url,
          gapType: 'MISSING_REVIEWS',
          severity: 'HIGH',
          title: 'Missing Customer Reviews / Social Proof',
          description: 'Customer review content provides fresh user-generated text and enables Review/Rating schema rich snippets in SERPs.',
          suggestedContent: `### Customer Feedback\nIntegrate customer reviews to boost dwell time and conversion rates.`,
          seoImpact: 80
        });
      }
    }

    // 3. Category Page Specific Gaps (Intro text)
    const isCategory = lowerUrl.includes('/category/') || lowerUrl.includes('/collection/') || lowerUrl.includes('/shop/');
    if (isCategory && page.wordCount < 200) {
      gaps.push({
        id: `gap-cat-intro-${page.id}`,
        url: page.url,
        gapType: 'MISSING_CATEGORY_INTRO',
        severity: 'MEDIUM',
        title: 'Missing Category Introductory Content',
        description: 'Category pages without introductory descriptive text struggle to rank against competitors who describe the collection with targeted keywords.',
        suggestedContent: `### About This Collection\nExplore our curated collection of ${page.title?.split('|')[0]?.trim() || 'products'}, crafted with the highest quality standards.`,
        seoImpact: 78
      });
    }

    // 4. Long Articles missing Table of Contents
    const isArticle = lowerUrl.includes('/blog/') || lowerUrl.includes('/article/') || lowerUrl.includes('/post/');
    if (isArticle && page.wordCount > 900) {
      const hasToc = headingText.includes('table of contents') || headingText.includes('contents');
      if (!hasToc) {
        gaps.push({
          id: `gap-toc-${page.id}`,
          url: page.url,
          gapType: 'MISSING_TOC',
          severity: 'LOW',
          title: 'Missing Table of Contents for Long Article',
          description: 'A jump-link Table of Contents generates sitelinks and snippet anchors in Google search results for long-form content.',
          suggestedContent: `### Table of Contents\n- [Section 1](#section-1)\n- [Section 2](#section-2)\n- [Summary](#summary)`,
          seoImpact: 60
        });
      }
    }

    return gaps;
  }
}
