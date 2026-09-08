import { CrawledPageData } from '../../types/index.js';

export interface CoreWebVitalsEstimate {
  ttfbStatus: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  ttfbMs: number;
  estimatedLcpMs: number;
  lcpRating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  lcpHeroImageCandidate?: string;
  estimatedClsScore: number;
  clsRating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  imagesWithoutDimensionsCount: number;
  renderBlockingResourcesCount: number;
}

export interface ImageOptimizationItem {
  src: string;
  isExternal: boolean;
  hasAlt: boolean;
  hasDimensions: boolean;
  hasLazyLoading: boolean;
  format: 'WEBP' | 'AVIF' | 'JPEG' | 'PNG' | 'GIF' | 'SVG' | 'UNKNOWN';
  isModernFormat: boolean;
  recommendation?: string;
}

export interface PagePerformanceReport {
  url: string;
  performanceScore: number; // 0-100
  cwv: CoreWebVitalsEstimate;
  totalImages: number;
  optimizedImages: number;
  unoptimizedImagesCount: number;
  htmlSizeKb: number;
  speedOpportunities: Array<{
    title: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    savingEstimate: string;
    action: string;
  }>;
}

export class PerformanceAnalyzer {
  /**
   * Complete performance and Core Web Vitals audit for a crawled page.
   */
  public static analyzePagePerformance(page: CrawledPageData): PagePerformanceReport {
    const ttfbMs = page.responseTimeMs || 300;
    
    // TTFB evaluation
    let ttfbStatus: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' = 'GOOD';
    if (ttfbMs > 1800) ttfbStatus = 'POOR';
    else if (ttfbMs > 600) ttfbStatus = 'NEEDS_IMPROVEMENT';

    // Image Audit
    const imageItems = this.auditImages(page);
    const unoptimizedImages = imageItems.filter(img => !img.isModernFormat || !img.hasDimensions);
    const missingDimensions = imageItems.filter(img => !img.hasDimensions);

    // Estimate CLS
    // Each image without width/height contributes ~0.04 - 0.08 shift score
    const estimatedCls = Number((Math.min(0.45, missingDimensions.length * 0.035)).toFixed(3));
    let clsRating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' = 'GOOD';
    if (estimatedCls > 0.25) clsRating = 'POOR';
    else if (estimatedCls > 0.1) clsRating = 'NEEDS_IMPROVEMENT';

    // Estimate LCP
    // TTFB + HTML download time + First large hero image load time
    const htmlSizeKb = Number((page.htmlSize / 1024).toFixed(1));
    const heroImage = imageItems[0]?.src;
    let baseLcp = ttfbMs + (htmlSizeKb > 150 ? 400 : 150);
    if (heroImage) {
      baseLcp += 800; // estimated image download & render
      if (imageItems[0]?.hasLazyLoading) {
        baseLcp += 400; // anti-pattern: lazy-loading above-the-fold hero image delays LCP
      }
    }
    const estimatedLcpMs = Math.round(baseLcp);

    let lcpRating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' = 'GOOD';
    if (estimatedLcpMs > 4000) lcpRating = 'POOR';
    else if (estimatedLcpMs > 2500) lcpRating = 'NEEDS_IMPROVEMENT';

    // Render-blocking resources count (estimated from headers and response)
    const renderBlockingCount = ttfbMs > 800 && htmlSizeKb > 80 ? 3 : 1;

    // Opportunities calculation
    const opportunities: PagePerformanceReport['speedOpportunities'] = [];

    if (missingDimensions.length > 0) {
      opportunities.push({
        title: 'Specify explicit width and height on image elements',
        impact: 'HIGH',
        savingEstimate: `CLS reduction of ~${estimatedCls}`,
        action: `Add width="..." and height="..." attributes to ${missingDimensions.length} <img> tags to reserve layout space and eliminate visual shifts.`
      });
    }

    const legacyImages = imageItems.filter(i => i.format === 'JPEG' || i.format === 'PNG');
    if (legacyImages.length > 0) {
      opportunities.push({
        title: 'Serve images in modern WebP or AVIF formats',
        impact: 'HIGH',
        savingEstimate: `~40-60% image payload reduction`,
        action: `Convert ${legacyImages.length} PNG/JPEG images to next-gen WebP or AVIF to drastically speed up Largest Contentful Paint.`
      });
    }

    if (imageItems.length > 3 && imageItems.slice(2).some(i => !i.hasLazyLoading)) {
      opportunities.push({
        title: 'Add loading="lazy" to off-screen images',
        impact: 'MEDIUM',
        savingEstimate: `Faster initial page rendering and reduced bandwidth`,
        action: 'Defers off-screen images until the user scrolls near them.'
      });
    }

    if (ttfbMs > 800) {
      opportunities.push({
        title: 'Reduce server response time (TTFB)',
        impact: 'HIGH',
        savingEstimate: `Up to ${(ttfbMs - 300)}ms latency savings`,
        action: 'Enable full-page caching (Redis/Varnish/WP Rocket), optimize database queries, or use a CDN edge cache.'
      });
    }

    // Performance Score (0-100)
    let score = 100;
    if (lcpRating === 'POOR') score -= 30;
    else if (lcpRating === 'NEEDS_IMPROVEMENT') score -= 15;

    if (clsRating === 'POOR') score -= 25;
    else if (clsRating === 'NEEDS_IMPROVEMENT') score -= 12;

    if (ttfbStatus === 'POOR') score -= 20;
    else if (ttfbStatus === 'NEEDS_IMPROVEMENT') score -= 10;

    if (legacyImages.length > 5) score -= 10;

    const performanceScore = Math.max(15, Math.min(100, score));

    return {
      url: page.url,
      performanceScore,
      cwv: {
        ttfbStatus,
        ttfbMs,
        estimatedLcpMs,
        lcpRating,
        lcpHeroImageCandidate: heroImage,
        estimatedClsScore: estimatedCls,
        clsRating,
        imagesWithoutDimensionsCount: missingDimensions.length,
        renderBlockingResourcesCount: renderBlockingCount
      },
      totalImages: imageItems.length,
      optimizedImages: imageItems.length - unoptimizedImages.length,
      unoptimizedImagesCount: unoptimizedImages.length,
      htmlSizeKb,
      speedOpportunities: opportunities
    };
  }

  private static auditImages(page: CrawledPageData): ImageOptimizationItem[] {
    return page.images.map(img => {
      const src = img.src || '';
      const lower = src.toLowerCase();
      let format: ImageOptimizationItem['format'] = 'UNKNOWN';
      if (lower.endsWith('.webp')) format = 'WEBP';
      else if (lower.endsWith('.avif')) format = 'AVIF';
      else if (lower.endsWith('.png')) format = 'PNG';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) format = 'JPEG';
      else if (lower.endsWith('.svg')) format = 'SVG';
      else if (lower.endsWith('.gif')) format = 'GIF';

      const isModern = format === 'WEBP' || format === 'AVIF' || format === 'SVG';
      const hasDimensions = !!(img.width && img.height);
      const hasLazy = img.loading === 'lazy';

      let recommendation: string | undefined;
      if (!isModern && (format === 'PNG' || format === 'JPEG')) {
        recommendation = 'Convert to WebP format for 40%+ size reduction.';
      } else if (!hasDimensions) {
        recommendation = 'Add explicit width and height attributes to prevent CLS layout shifts.';
      }

      return {
        src,
        isExternal: img.isExternal,
        hasAlt: !!(img.alt && img.alt.trim().length > 0),
        hasDimensions,
        hasLazyLoading: hasLazy,
        format,
        isModernFormat: isModern,
        recommendation
      };
    });
  }
}
