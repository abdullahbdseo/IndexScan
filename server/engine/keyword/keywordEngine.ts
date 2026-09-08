import { CrawledPageData } from '../../types/index.js';
import { IntentClassifier, SearchIntent } from './intentClassifier.js';

export interface ExtractedKeyword {
  keyword: string;
  nGram: 1 | 2 | 3;
  frequency: number;
  density: number; // percentage (e.g. 1.8%)
  tfIdfScore: number;
  intent: SearchIntent;
  intentConfidence: number;
  appearsIn: {
    title: boolean;
    h1: boolean;
    metaDescription: boolean;
    headings: boolean;
    body: boolean;
  };
}

export interface PageKeywordAnalysis {
  url: string;
  pathname: string;
  wordCount: number;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  intent: SearchIntent;
  keywords: ExtractedKeyword[];
  overOptimizedKeywords: string[]; // density > 3.5%
}

export interface CannibalizationIssue {
  keyword: string;
  conflictingUrls: string[];
  severity: 'HIGH' | 'MEDIUM';
  explanation: string;
  recommendedAction: string;
}

export interface ProjectKeywordMatrix {
  totalUniqueKeywords: number;
  topSiteKeywords: Array<{ keyword: string; totalFrequency: number; pageCount: number; intent: SearchIntent }>;
  cannibalizationIssues: CannibalizationIssue[];
  pageAnalyses: PageKeywordAnalysis[];
}

export class KeywordEngine {
  private static readonly STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as',
    'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t',
    'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
    'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having',
    'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
    'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
    'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
    'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she',
    'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
    'wasn\'t', 'we', 'were', 'weren\'t', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with',
    'won\'t', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
    // Bengali common words transliterated & particles
    'ebong', 'o', 'aar', 'ki', 'kintu', 'ba', 'te', 'er', 'ke', 'theke'
  ]);

  /**
   * Analyze keywords for a single page in context of all pages (for TF-IDF).
   */
  public static analyzePageKeywords(page: CrawledPageData, allPages: CrawledPageData[]): PageKeywordAnalysis {
    // Collect text from all page elements
    const titleText = page.title || '';
    const descText = page.metaDescription || '';
    const h1Text = page.headings.h1.join(' ');
    const otherHeadingsText = [...page.headings.h2, ...page.headings.h3, ...page.headings.h4].join(' ');
    
    // Aggregate full text
    const fullText = `${titleText} ${descText} ${h1Text} ${otherHeadingsText}`;
    const words = this.tokenize(fullText);
    const totalWords = Math.max(1, words.length);

    // Extract n-grams (1, 2, 3)
    const nGrams1 = this.extractNGrams(words, 1);
    const nGrams2 = this.extractNGrams(words, 2);
    const nGrams3 = this.extractNGrams(words, 3);
    const allNGrams = [...nGrams1, ...nGrams2, ...nGrams3];

    // Count frequencies
    const freqMap = new Map<string, { count: number; nGram: 1 | 2 | 3 }>();
    for (const item of allNGrams) {
      const existing = freqMap.get(item.phrase);
      if (existing) {
        existing.count++;
      } else {
        freqMap.set(item.phrase, { count: 1, nGram: item.nGram });
      }
    }

    // Document frequency across allPages
    const docCount = Math.max(1, allPages.length);

    // Build ExtractedKeyword list
    const keywords: ExtractedKeyword[] = [];
    const overOptimized: string[] = [];

    for (const [phrase, meta] of freqMap.entries()) {
      if (meta.count < 2 && phrase.split(' ').length === 1 && phrase.length < 5) continue; // Filter trivial 1-word low freq

      const density = Number(((meta.count / totalWords) * 100).toFixed(2));
      if (density > 3.5 && meta.count > 3) {
        overOptimized.push(phrase);
      }

      // Calculate TF-IDF
      const tf = meta.count / totalWords;
      const docsWithPhrase = Math.max(1, allPages.filter(p => {
        const text = `${p.title || ''} ${p.metaDescription || ''} ${p.headings.h1.join(' ')}`.toLowerCase();
        return text.includes(phrase);
      }).length);
      const idf = Math.log(1 + (docCount / docsWithPhrase));
      const tfIdfScore = Number((tf * idf * 100).toFixed(2));

      // Presence in key HTML elements
      const inTitle = titleText.toLowerCase().includes(phrase);
      const inH1 = h1Text.toLowerCase().includes(phrase);
      const inDesc = descText.toLowerCase().includes(phrase);
      const inHeadings = otherHeadingsText.toLowerCase().includes(phrase);

      const intentResult = IntentClassifier.classify(phrase);

      keywords.push({
        keyword: phrase,
        nGram: meta.nGram,
        frequency: meta.count,
        density,
        tfIdfScore,
        intent: intentResult.primaryIntent,
        intentConfidence: intentResult.confidence,
        appearsIn: {
          title: inTitle,
          h1: inH1,
          metaDescription: inDesc,
          headings: inHeadings,
          body: true
        }
      });
    }

    // Sort by weighted prominence: inTitle/H1 + TF-IDF score
    keywords.sort((a, b) => {
      const weightA = (a.appearsIn.title ? 50 : 0) + (a.appearsIn.h1 ? 40 : 0) + a.tfIdfScore;
      const weightB = (b.appearsIn.title ? 50 : 0) + (b.appearsIn.h1 ? 40 : 0) + b.tfIdfScore;
      return weightB - weightA;
    });

    const primaryKeyword = keywords[0]?.keyword;
    const secondaryKeywords = keywords.slice(1, 6).map(k => k.keyword);
    const overallIntent = IntentClassifier.classify(`${titleText} ${h1Text}`).primaryIntent;

    return {
      url: page.url,
      pathname: page.pathname,
      wordCount: totalWords,
      primaryKeyword,
      secondaryKeywords,
      intent: overallIntent,
      keywords: keywords.slice(0, 25), // top 25
      overOptimizedKeywords: overOptimized
    };
  }

  /**
   * Analyze entire project keyword distribution and detect cannibalization.
   */
  public static analyzeProjectKeywords(allPages: CrawledPageData[]): ProjectKeywordMatrix {
    const pageAnalyses = allPages.map(page => this.analyzePageKeywords(page, allPages));
    
    // Aggregate global keyword frequencies
    const globalFreq = new Map<string, { count: number; pages: Set<string>; intent: SearchIntent }>();

    for (const pa of pageAnalyses) {
      for (const kw of pa.keywords) {
        const existing = globalFreq.get(kw.keyword);
        if (existing) {
          existing.count += kw.frequency;
          existing.pages.add(pa.url);
        } else {
          globalFreq.set(kw.keyword, {
            count: kw.frequency,
            pages: new Set([pa.url]),
            intent: kw.intent
          });
        }
      }
    }

    // Detect Keyword Cannibalization:
    // Multiple pages having overlapping top target keywords (2+ word keyphrases)
    const cannibalizationMap = new Map<string, Set<string>>();
    for (const pa of pageAnalyses) {
      const topTargets = [pa.primaryKeyword, ...pa.secondaryKeywords.slice(0, 3)].filter(Boolean) as string[];
      for (const kw of new Set(topTargets)) {
        if (kw.split(' ').length >= 2) {
          const set = cannibalizationMap.get(kw) || new Set<string>();
          set.add(pa.url);
          cannibalizationMap.set(kw, set);
        }
      }
    }

    const cannibalizationIssues: CannibalizationIssue[] = [];
    for (const [kw, urlSet] of cannibalizationMap.entries()) {
      const urls = Array.from(urlSet);
      if (urls.length >= 2) {
        cannibalizationIssues.push({
          keyword: kw,
          conflictingUrls: urls,
          severity: urls.length >= 3 ? 'HIGH' : 'MEDIUM',
          explanation: `Multiple pages (${urls.length}) target or compete for the same keyphrase "${kw}", splitting link equity and confusing search ranking algorithms.`,
          recommendedAction: `Consolidate competing content into a single authoritative pillar page or differentiate search intents with distinct long-tail keywords.`
        });
      }
    }

    // Top site-wide keywords
    const topSiteKeywords = Array.from(globalFreq.entries())
      .map(([keyword, data]) => ({
        keyword,
        totalFrequency: data.count,
        pageCount: data.pages.size,
        intent: data.intent
      }))
      .filter(k => k.pageCount >= 1 && k.keyword.length > 2)
      .sort((a, b) => (b.totalFrequency * b.pageCount) - (a.totalFrequency * a.pageCount))
      .slice(0, 30);

    return {
      totalUniqueKeywords: globalFreq.size,
      topSiteKeywords,
      cannibalizationIssues,
      pageAnalyses
    };
  }

  // --- Helper Methods ---

  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !this.STOP_WORDS.has(w));
  }

  private static extractNGrams(words: string[], n: 1 | 2 | 3): Array<{ phrase: string; nGram: 1 | 2 | 3 }> {
    const result: Array<{ phrase: string; nGram: 1 | 2 | 3 }> = [];
    if (words.length < n) return result;

    for (let i = 0; i <= words.length - n; i++) {
      const slice = words.slice(i, i + n);
      // Ensure phrase does not start or end with a stop word or trivial number
      if (slice.every(w => !this.STOP_WORDS.has(w) && isNaN(Number(w)))) {
        result.push({ phrase: slice.join(' '), nGram: n });
      }
    }
    return result;
  }
}
