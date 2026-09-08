/**
 * IntentClassifier — Detects search intent from keyword phrases or page text.
 * 
 * Intents:
 * - INFORMATIONAL: User wants to learn or discover information
 * - COMMERCIAL: User is researching options, comparing products or brands
 * - TRANSACTIONAL: User is ready to buy, download, or complete an action
 * - NAVIGATIONAL: User is seeking a specific brand, portal, or login page
 * - LOCAL: User is searching for a local store, address, or geo-specific service
 */

export type SearchIntent = 'INFORMATIONAL' | 'COMMERCIAL' | 'TRANSACTIONAL' | 'NAVIGATIONAL' | 'LOCAL';

export interface IntentClassificationResult {
  primaryIntent: SearchIntent;
  secondaryIntent?: SearchIntent;
  confidence: number; // 0-100
  matchedSignals: string[];
  explanation: string;
}

export class IntentClassifier {
  private static readonly INFORMATIONAL_PATTERNS = [
    /\b(how to|how do|what is|what are|why|guide|tutorial|tips|ideas|examples|definition|diy|history|meaning|learn|steps to)\b/i,
    /\b(explained|overview|benefits of|difference between|ways to)\b/i
  ];

  private static readonly COMMERCIAL_PATTERNS = [
    /\b(best|top\s*\d+|review|reviews|comparison|vs|versus|alternative|alternatives|rated|recommended|worth it)\b/i,
    /\b(buying guide|affordable|cheapest|luxury|features|pros and cons)\b/i
  ];

  private static readonly TRANSACTIONAL_PATTERNS = [
    /\b(buy|purchase|order|shop|price|prices|pricing|cost|costs|discount|discounts|coupon|promo|deal|deals)\b/i,
    /\b(sale|clearance|for sale|add to cart|checkout|free shipping|order online|cash on delivery)\b/i,
    /\b(bdt|usd|tk|taka|৳|\$)\b/i
  ];

  private static readonly LOCAL_PATTERNS = [
    /\b(near me|nearby|in\s+[a-z]+|location|locations|store locator|address|branch|branches)\b/i,
    /\b(dhaka|chittagong|sylhet|bangladesh|uttara|dhanmondi|mirpur|gulshan|banani)\b/i
  ];

  private static readonly NAVIGATIONAL_PATTERNS = [
    /\b(login|sign in|signup|log in|register|portal|account|my account|dashboard|support|contact us)\b/i
  ];

  public static classify(text: string): IntentClassificationResult {
    const cleanText = text.trim().toLowerCase();
    const scores: Record<SearchIntent, { count: number; signals: string[] }> = {
      INFORMATIONAL: { count: 0, signals: [] },
      COMMERCIAL: { count: 0, signals: [] },
      TRANSACTIONAL: { count: 0, signals: [] },
      LOCAL: { count: 0, signals: [] },
      NAVIGATIONAL: { count: 0, signals: [] }
    };

    // Evaluate patterns
    this.evaluatePatterns(cleanText, this.INFORMATIONAL_PATTERNS, 'INFORMATIONAL', scores);
    this.evaluatePatterns(cleanText, this.COMMERCIAL_PATTERNS, 'COMMERCIAL', scores);
    this.evaluatePatterns(cleanText, this.TRANSACTIONAL_PATTERNS, 'TRANSACTIONAL', scores);
    this.evaluatePatterns(cleanText, this.LOCAL_PATTERNS, 'LOCAL', scores);
    this.evaluatePatterns(cleanText, this.NAVIGATIONAL_PATTERNS, 'NAVIGATIONAL', scores);

    // Contextual heuristics
    if (/\b(add to cart|checkout|product|stock|sku)\b/i.test(cleanText)) {
      scores.TRANSACTIONAL.count += 2;
      scores.TRANSACTIONAL.signals.push('E-commerce transaction signals');
    }

    // Sort intents by signal score
    const sorted = (Object.keys(scores) as SearchIntent[]).sort((a, b) => scores[b].count - scores[a].count);
    const top = sorted[0];
    const topScore = scores[top].count;
    const runnerUp = sorted[1];
    const runnerUpScore = scores[runnerUp].count;

    if (topScore === 0) {
      // Default fallback
      return {
        primaryIntent: 'INFORMATIONAL',
        confidence: 50,
        matchedSignals: ['General content heuristic (no explicit transactional or commercial triggers)'],
        explanation: 'Defaulted to Informational intent based on general page text.'
      };
    }

    const confidence = Math.min(98, Math.round(55 + (topScore * 12)));
    const result: IntentClassificationResult = {
      primaryIntent: top,
      confidence,
      matchedSignals: scores[top].signals,
      explanation: `Identified as ${top} intent based on triggers: ${scores[top].signals.slice(0, 3).join(', ')}.`
    };

    if (runnerUpScore > 0 && runnerUpScore >= topScore * 0.5) {
      result.secondaryIntent = runnerUp;
    }

    return result;
  }

  private static evaluatePatterns(
    text: string,
    patterns: RegExp[],
    intent: SearchIntent,
    scores: Record<SearchIntent, { count: number; signals: string[] }>
  ) {
    for (const pat of patterns) {
      const globalPat = new RegExp(pat.source, pat.flags.includes('g') ? pat.flags : pat.flags + 'g');
      const matches = text.match(globalPat);
      if (matches) {
        scores[intent].count += matches.length;
        scores[intent].signals.push(...matches);
      }
    }
  }
}
