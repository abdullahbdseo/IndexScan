import { CrawledPageData } from '../../types/index.js';

export interface ReadabilityMetrics {
  fleschReadingEase: number; // 0-100 (higher = easier to read)
  fleschKincaidGrade: number; // Grade level (e.g. 8.2)
  readingLevel: 'Very Easy' | 'Easy' | 'Fairly Easy' | 'Standard' | 'Fairly Difficult' | 'Difficult' | 'Very Confusing';
  avgSentenceLengthWords: number;
  avgSyllablesPerWord: number;
  estimatedReadingTimeMinutes: number;
}

export interface HeadingAudit {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  hasSkippedLevels: boolean;
  warnings: string[];
  outline: Array<{ level: 'H1' | 'H2' | 'H3' | 'H4'; text: string }>;
}

export interface ContentQualityReport {
  url: string;
  wordCount: number;
  contentCategory: 'HOMEPAGE' | 'PRODUCT' | 'CATEGORY' | 'ARTICLE' | 'GENERAL';
  contentLengthStatus: 'THIN' | 'ACCEPTABLE' | 'OPTIMAL' | 'OVER_LENGTH';
  readability: ReadabilityMetrics;
  headingAudit: HeadingAudit;
  contentQualityScore: number; // 0-100
  recommendations: string[];
}

export interface DuplicateContentPair {
  urlA: string;
  urlB: string;
  similarityScore: number; // 0-1 (e.g. 0.85 = 85% duplicate text)
  commonPhrases: string[];
  severity: 'HIGH' | 'MEDIUM';
}

export class ContentAnalyzer {
  /**
   * Complete content and readability audit for a single page.
   */
  public static analyzePageContent(page: CrawledPageData): ContentQualityReport {
    // Determine content category
    const category = this.detectCategory(page);

    // Aggregate body & heading text
    const headingText = [
      ...page.headings.h1,
      ...page.headings.h2,
      ...page.headings.h3,
      ...page.headings.h4
    ].join('. ');

    const sampleText = `${page.title || ''}. ${page.metaDescription || ''}. ${headingText}.`;
    const wordCount = Math.max(page.wordCount, sampleText.split(/\s+/).filter(w => w.length > 0).length);

    // Readability
    const readability = this.calculateReadability(sampleText, wordCount);

    // Heading structure
    const headingAudit = this.auditHeadings(page);

    // Content length evaluation against benchmarks
    const { status, lengthRecs } = this.evaluateContentLength(wordCount, category);

    // Recommendations list
    const recommendations: string[] = [...lengthRecs, ...headingAudit.warnings];

    if (readability.fleschReadingEase < 50) {
      recommendations.push(`Content readability is difficult (score: ${readability.fleschReadingEase}/100). Simplify long sentences to improve user engagement and dwell time.`);
    }

    // Overall quality score calculation
    let score = 100;
    if (status === 'THIN') score -= 35;
    if (headingAudit.h1Count !== 1) score -= 15;
    if (headingAudit.hasSkippedLevels) score -= 10;
    if (readability.fleschReadingEase < 45) score -= 15;
    if (wordCount < 100) score -= 20;

    const contentQualityScore = Math.max(10, Math.min(100, score));

    return {
      url: page.url,
      wordCount,
      contentCategory: category,
      contentLengthStatus: status,
      readability,
      headingAudit,
      contentQualityScore,
      recommendations
    };
  }

  /**
   * Detect cross-page near-duplicate content across the site.
   */
  public static findDuplicateContent(allPages: CrawledPageData[]): DuplicateContentPair[] {
    const pairs: DuplicateContentPair[] = [];
    if (allPages.length < 2) return pairs;

    // Build shingles (3-grams) for each page
    const pageShingles = allPages.map(page => {
      const text = `${page.title || ''} ${page.metaDescription || ''} ${page.headings.h1.join(' ')} ${page.headings.h2.join(' ')}`.toLowerCase();
      const tokens = text.split(/\s+/).filter(t => t.length > 2);
      const shingles = new Set<string>();
      for (let i = 0; i <= tokens.length - 3; i++) {
        shingles.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
      }
      return { url: page.url, shingles };
    });

    // Compare pairs
    for (let i = 0; i < pageShingles.length; i++) {
      for (let j = i + 1; j < pageShingles.length; j++) {
        const setA = pageShingles[i].shingles;
        const setB = pageShingles[j].shingles;

        if (setA.size < 5 || setB.size < 5) continue;

        let intersection = 0;
        const common: string[] = [];
        for (const s of setA) {
          if (setB.has(s)) {
            intersection++;
            if (common.length < 5) common.push(s);
          }
        }

        const union = setA.size + setB.size - intersection;
        const jaccard = union > 0 ? intersection / union : 0;

        if (jaccard >= 0.65) {
          pairs.push({
            urlA: pageShingles[i].url,
            urlB: pageShingles[j].url,
            similarityScore: Number(jaccard.toFixed(2)),
            commonPhrases: common,
            severity: jaccard >= 0.85 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }

    return pairs;
  }

  // --- Helpers ---

  private static detectCategory(page: CrawledPageData): 'HOMEPAGE' | 'PRODUCT' | 'CATEGORY' | 'ARTICLE' | 'GENERAL' {
    if (page.pathname === '/' || page.depth === 0) return 'HOMEPAGE';
    if (page.pathname.includes('/product/') || page.pathname.includes('/item/') || page.pathname.includes('/p/')) return 'PRODUCT';
    if (page.pathname.includes('/category/') || page.pathname.includes('/collection/') || page.pathname.includes('/shop/')) return 'CATEGORY';
    if (page.pathname.includes('/blog/') || page.pathname.includes('/article/') || page.pathname.includes('/news/')) return 'ARTICLE';
    return 'GENERAL';
  }

  private static evaluateContentLength(
    wordCount: number,
    category: 'HOMEPAGE' | 'PRODUCT' | 'CATEGORY' | 'ARTICLE' | 'GENERAL'
  ): { status: 'THIN' | 'ACCEPTABLE' | 'OPTIMAL' | 'OVER_LENGTH'; lengthRecs: string[] } {
    const benchmarks: Record<string, { min: number; optimal: number }> = {
      HOMEPAGE: { min: 300, optimal: 600 },
      PRODUCT: { min: 180, optimal: 400 },
      CATEGORY: { min: 120, optimal: 350 },
      ARTICLE: { min: 600, optimal: 1500 },
      GENERAL: { min: 250, optimal: 700 }
    };

    const target = benchmarks[category] || benchmarks.GENERAL;
    const recs: string[] = [];

    if (wordCount < target.min) {
      recs.push(`Page has thin content (${wordCount} words). Target at least ${target.min} words for this ${category.toLowerCase()} page.`);
      return { status: 'THIN', lengthRecs: recs };
    }

    if (wordCount < target.optimal) {
      return { status: 'ACCEPTABLE', lengthRecs: recs };
    }

    return { status: 'OPTIMAL', lengthRecs: recs };
  }

  private static auditHeadings(page: CrawledPageData): HeadingAudit {
    const warnings: string[] = [];
    const outline: Array<{ level: 'H1' | 'H2' | 'H3' | 'H4'; text: string }> = [];

    const h1Count = page.headings.h1.length;
    const h2Count = page.headings.h2.length;
    const h3Count = page.headings.h3.length;
    const h4Count = page.headings.h4.length;

    page.headings.h1.forEach(t => outline.push({ level: 'H1', text: t }));
    page.headings.h2.forEach(t => outline.push({ level: 'H2', text: t }));
    page.headings.h3.forEach(t => outline.push({ level: 'H3', text: t }));
    page.headings.h4.forEach(t => outline.push({ level: 'H4', text: t }));

    if (h1Count === 0) {
      warnings.push('Missing <h1> heading tag. Every indexable page requires exactly one descriptive H1.');
    } else if (h1Count > 1) {
      warnings.push(`Page contains ${h1Count} <h1> heading tags. Demote secondary H1s to H2.`);
    }

    const hasSkippedLevels = (h1Count > 0 && h2Count === 0 && h3Count > 0);
    if (hasSkippedLevels) {
      warnings.push('Heading structure skips heading levels (H1 jumps directly to H3 without H2).');
    }

    return {
      h1Count,
      h2Count,
      h3Count,
      h4Count,
      hasSkippedLevels,
      warnings,
      outline
    };
  }

  private static calculateReadability(text: string, wordCount: number): ReadabilityMetrics {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalSentences = Math.max(1, sentences.length);
    const totalWords = Math.max(1, wordCount);

    // Syllables count heuristic
    let totalSyllables = 0;
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    for (const w of words) {
      totalSyllables += this.countSyllables(w);
    }
    if (totalSyllables === 0) totalSyllables = totalWords * 1.4;

    const avgSentenceLengthWords = Number((totalWords / totalSentences).toFixed(1));
    const avgSyllablesPerWord = Number((totalSyllables / totalWords).toFixed(2));

    // Flesch Reading Ease = 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
    let score = 206.835 - (1.015 * avgSentenceLengthWords) - (84.6 * avgSyllablesPerWord);
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Flesch-Kincaid Grade Level = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    let grade = (0.39 * avgSentenceLengthWords) + (11.8 * avgSyllablesPerWord) - 15.59;
    grade = Math.max(1, Math.min(18, Number(grade.toFixed(1))));

    let level: ReadabilityMetrics['readingLevel'] = 'Standard';
    if (score >= 90) level = 'Very Easy';
    else if (score >= 80) level = 'Easy';
    else if (score >= 70) level = 'Fairly Easy';
    else if (score >= 60) level = 'Standard';
    else if (score >= 50) level = 'Fairly Difficult';
    else if (score >= 30) level = 'Difficult';
    else level = 'Very Confusing';

    const readingTime = Math.max(1, Math.ceil(totalWords / 200)); // 200 words per minute average

    return {
      fleschReadingEase: score,
      fleschKincaidGrade: grade,
      readingLevel: level,
      avgSentenceLengthWords,
      avgSyllablesPerWord,
      estimatedReadingTimeMinutes: readingTime
    };
  }

  private static countSyllables(word: string): number {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length <= 3) return 1;
    const match = clean.match(/[aeiouy]{1,2}/g);
    let count = match ? match.length : 1;
    if (clean.endsWith('e') && !clean.endsWith('le')) {
      count = Math.max(1, count - 1);
    }
    return count;
  }
}
