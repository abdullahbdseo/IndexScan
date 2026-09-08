import { CrawledPageData } from '../../types/index.js';
import { KnowledgeGraphEngine } from '../crawler/knowledgeGraph.js';

export interface InternalLinkOpportunity {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  suggestedAnchorText: string;
  relevanceScore: number; // 0-100
  reason: string;
  equityTransferPotential: 'HIGH' | 'MEDIUM' | 'LOW';
  sourcePageTitle: string;
  targetPageTitle: string;
}

export interface InternalLinkingAudit {
  totalOpportunities: number;
  orphanPagesRescued: number;
  overLinkedPages: Array<{ url: string; linkCount: number }>;
  genericAnchorIssues: Array<{ sourceUrl: string; targetUrl: string; anchorText: string }>;
  opportunities: InternalLinkOpportunity[];
}

export class InternalLinkAgent {
  /**
   * Evaluates all pages to discover high-value contextual internal linking opportunities.
   */
  public static findOpportunities(allPages: CrawledPageData[]): InternalLinkingAudit {
    const graph = KnowledgeGraphEngine.buildGraph(allPages);
    const opportunities: InternalLinkOpportunity[] = [];
    const genericAnchorIssues: InternalLinkingAudit['genericAnchorIssues'] = [];
    const overLinkedPages: InternalLinkingAudit['overLinkedPages'] = [];

    const GENERIC_ANCHORS = new Set([
      'click here', 'read more', 'learn more', 'more', 'link', 'here', 'visit', 'details', 'shop now'
    ]);

    // 1. Audit existing links for generic anchors and over-linking
    for (const page of allPages) {
      if (page.internalLinks.length > 100) {
        overLinkedPages.push({ url: page.url, linkCount: page.internalLinks.length });
      }

      for (const link of page.internalLinks) {
        const anchor = link.anchorText.trim().toLowerCase();
        if (GENERIC_ANCHORS.has(anchor)) {
          genericAnchorIssues.push({
            sourceUrl: page.url,
            targetUrl: link.href,
            anchorText: link.anchorText
          });
        }
      }
    }

    // 2. Identify candidate targets (orphan pages or low PageRank deep pages)
    const orphanUrls = new Set<string>();
    for (const [url, node] of graph.nodes.entries()) {
      if (node.isOrphan) orphanUrls.add(url);
    }

    // 3. Match source pages with relevant target pages based on keywords & titles
    for (const targetPage of allPages) {
      if (targetPage.pathname === '/') continue; // Skip homepage as target (already heavily linked)

      // Target keywords derived from title and H1
      const targetKeywords = this.extractTargetKeywords(targetPage);
      if (targetKeywords.length === 0) continue;

      const isOrphan = orphanUrls.has(targetPage.url);
      const targetNode = graph.nodes.get(targetPage.url);
      const targetPageRank = targetNode?.pageRankScore || 0.1;

      for (const sourcePage of allPages) {
        if (sourcePage.url === targetPage.url) continue; // No self-links

        // Check if source already links to target
        const alreadyLinks = sourcePage.internalLinks.some(l => 
          l.href === targetPage.url || l.href === targetPage.pathname
        );
        if (alreadyLinks) continue;

        // Check if source page content/headings contain target keywords
        const sourceText = `${sourcePage.title || ''} ${sourcePage.metaDescription || ''} ${sourcePage.headings.h1.join(' ')} ${sourcePage.headings.h2.join(' ')}`.toLowerCase();
        
        for (const kw of targetKeywords) {
          if (sourceText.includes(kw.toLowerCase()) && kw.length >= 4) {
            const sourceNode = graph.nodes.get(sourcePage.url);
            const sourcePageRank = sourceNode?.pageRankScore || 0.1;

            const equityTransfer: InternalLinkOpportunity['equityTransferPotential'] = 
              sourcePageRank > targetPageRank ? 'HIGH' : 'MEDIUM';

            opportunities.push({
              id: `opp-${sourcePage.id}-${targetPage.id}`,
              sourceUrl: sourcePage.url,
              targetUrl: targetPage.url,
              suggestedAnchorText: kw,
              relevanceScore: isOrphan ? 95 : 82,
              reason: isOrphan 
                ? `Target page is an ORPHAN page with 0 inbound links. Linking from "${sourcePage.title || sourcePage.pathname}" using anchor "${kw}" restores crawler discovery and ranking.`
                : `Source page discusses "${kw}" which matches the core topic of "${targetPage.title || targetPage.pathname}".`,
              equityTransferPotential: equityTransfer,
              sourcePageTitle: sourcePage.title || sourcePage.pathname,
              targetPageTitle: targetPage.title || targetPage.pathname
            });

            break; // Max 1 recommendation per source-target pair
          }
        }
      }
    }

    // Sort opportunities by relevance score & equity transfer
    opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const rescuedOrphans = new Set(
      opportunities.filter(o => orphanUrls.has(o.targetUrl)).map(o => o.targetUrl)
    ).size;

    return {
      totalOpportunities: opportunities.length,
      orphanPagesRescued: rescuedOrphans,
      overLinkedPages,
      genericAnchorIssues: genericAnchorIssues.slice(0, 20),
      opportunities: opportunities.slice(0, 30) // top 30 highest impact
    };
  }

  private static extractTargetKeywords(page: CrawledPageData): string[] {
    const raw = page.headings.h1[0] || page.title?.split('|')[0]?.trim() || '';
    const clean = raw.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(w => w.length > 3);

    const candidates: string[] = [];
    if (words.length >= 2) {
      candidates.push(words.slice(0, 3).join(' ')); // 2-3 word keyphrase
    }
    if (words.length >= 1) {
      candidates.push(words[0]);
    }
    return candidates;
  }
}
