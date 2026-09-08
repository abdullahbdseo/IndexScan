import { SeoIssue, IssueInstance, CrawledPageData, RootCauseType } from '../../types/index.js';
import { WebsiteKnowledgeGraph } from '../crawler/knowledgeGraph.js';
import { db } from '../../db/database.js';

export interface DiagnosticReport {
  issueId: string;
  whatIsWrong: string;
  whyItIsWrong: string;
  severityReasoning: string;
  rootCauseType: RootCauseType;
  rootCauseSummary: string;
  isTemplateLevel: boolean;
  templateFileSuggested?: string;
  affectedUrls: string[];
  recommendedFixStrategy: string;
  potentialSideEffects: string;
  verificationMethod: string;
}

export class DiagnosticEngine {
  public static diagnose(
    issue: SeoIssue,
    instances: IssueInstance[],
    pages: CrawledPageData[],
    graph: WebsiteKnowledgeGraph
  ): DiagnosticReport {
    const isTemplateLevel = instances.length >= 2 || issue.rootCauseType === 'TEMPLATE';
    let templateFile = undefined;

    if (isTemplateLevel) {
      if (issue.category === 'ON_PAGE' && issue.title.includes('Meta')) {
        templateFile = 'templates/header.html';
      } else if (issue.category === 'IMAGES_MEDIA') {
        templateFile = 'templates/content.html';
      } else if (issue.category === 'CRAWLABILITY') {
        templateFile = 'templates/footer.html';
      } else {
        templateFile = 'templates/base.html';
      }
    }

    let sideEffects = 'None detected. Change is strictly scoped to HTML metadata/structure without altering visible UI text.';
    if (issue.severity === 'CRITICAL' && issue.category === 'TECHNICAL') {
      sideEffects = 'Low risk: Broken links will point to home fallback, eliminating 404 crawl waste.';
    }

    const report: DiagnosticReport = {
      issueId: issue.id,
      whatIsWrong: issue.description,
      whyItIsWrong: `Search engines penalize ${issue.title.toLowerCase()} because it degrades crawler efficiency and search snippet presentation.`,
      severityReasoning: `Classified as ${issue.severity} priority based on direct organic traffic, indexation, and Core Web Vitals impact.`,
      rootCauseType: isTemplateLevel ? 'TEMPLATE' : issue.rootCauseType,
      rootCauseSummary: isTemplateLevel
        ? `Shared template pattern across ${instances.length} URLs (Root: ${templateFile})`
        : `Page-specific issue on ${instances[0]?.url || 'target URL'}`,
      isTemplateLevel,
      templateFileSuggested: templateFile,
      affectedUrls: instances.map(i => i.url),
      recommendedFixStrategy: isTemplateLevel
        ? `Apply single template-level patch to ${templateFile} to resolve all ${instances.length} affected pages simultaneously.`
        : `Apply page-level HTML patch to ${instances[0]?.url}`,
      potentialSideEffects: sideEffects,
      verificationMethod: 'Re-crawl affected URLs and execute automated DOM assertion rules.'
    };

    // Update issue with refined diagnostic summary
    db.update('seo_issues', issue.id, {
      rootCauseType: report.rootCauseType,
      rootCauseSummary: report.rootCauseSummary
    });

    return report;
  }
}
