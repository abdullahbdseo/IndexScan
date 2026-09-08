import { CrawledPageData } from '../../types/index.js';

export interface GraphNode {
  url: string;
  depth: number;
  inboundLinksCount: number;
  outboundLinksCount: number;
  templateId?: string;
  statusCode: number;
  isOrphan: boolean;
  pageRankScore: number;
}

export interface GraphEdge {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
}

export interface WebsiteKnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  templateClusters: Map<string, string[]>;
  orphanPages: string[];
  deepPages: string[];
}

export class KnowledgeGraphEngine {
  public static buildGraph(pages: CrawledPageData[]): WebsiteKnowledgeGraph {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const templateClusters = new Map<string, string[]>();
    const inboundCounts = new Map<string, number>();

    // Register all nodes
    for (const page of pages) {
      nodes.set(page.url, {
        url: page.url,
        depth: page.depth,
        inboundLinksCount: 0,
        outboundLinksCount: page.internalLinks.length,
        templateId: page.detectedTemplateId,
        statusCode: page.statusCode,
        isOrphan: false,
        pageRankScore: 1.0
      });

      // Cluster by template
      if (page.detectedTemplateId) {
        const cluster = templateClusters.get(page.detectedTemplateId) || [];
        cluster.push(page.url);
        templateClusters.set(page.detectedTemplateId, cluster);
      }
    }

    // Build edges & count inbounds
    for (const page of pages) {
      for (const link of page.internalLinks) {
        edges.push({
          sourceUrl: page.url,
          targetUrl: link.href,
          anchorText: link.anchorText
        });
        inboundCounts.set(link.href, (inboundCounts.get(link.href) || 0) + 1);
      }
    }

    const orphanPages: string[] = [];
    const deepPages: string[] = [];

    for (const [url, node] of nodes.entries()) {
      const inbounds = inboundCounts.get(url) || 0;
      node.inboundLinksCount = inbounds;
      
      // Depth > 0 and 0 inbound internal links => Orphan page
      if (node.depth > 0 && inbounds === 0) {
        node.isOrphan = true;
        orphanPages.push(url);
      }

      if (node.depth >= 4) {
        deepPages.push(url);
      }
    }

    // Simple iterative PageRank estimation
    for (let iter = 0; iter < 10; iter++) {
      for (const [url, node] of nodes.entries()) {
        let rankSum = 0;
        for (const edge of edges) {
          if (edge.targetUrl === url) {
            const source = nodes.get(edge.sourceUrl);
            if (source && source.outboundLinksCount > 0) {
              rankSum += source.pageRankScore / source.outboundLinksCount;
            }
          }
        }
        node.pageRankScore = 0.15 + 0.85 * rankSum;
      }
    }

    return {
      nodes,
      edges,
      templateClusters,
      orphanPages,
      deepPages
    };
  }
}
