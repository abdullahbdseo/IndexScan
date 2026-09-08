import crypto from 'crypto';
import { SeoRule, RuleEvaluationContext } from './ruleTypes.js';
import { ALL_SEO_RULES } from './coreRules.js';
import { CrawledPageData, SeoIssue, IssueInstance, SeoHealthScore, IssueCategory, CategoryScore, IssueSeverity } from '../../types/index.js';
import { WebsiteKnowledgeGraph } from '../crawler/knowledgeGraph.js';
import { db } from '../../db/database.js';

export class RuleRegistry {
  private static rules: Map<string, SeoRule> = new Map();

  static {
    for (const rule of ALL_SEO_RULES) {
      this.rules.set(rule.id, rule);
    }
  }

  public static getRule(id: string): SeoRule | undefined {
    return this.rules.get(id);
  }

  public static getAllRules(): SeoRule[] {
    return Array.from(this.rules.values());
  }

  public static runAudit(
    projectId: string,
    crawlId: string,
    projectDomain: string,
    pages: CrawledPageData[],
    graph: WebsiteKnowledgeGraph
  ): { issues: SeoIssue[]; instances: IssueInstance[]; score: SeoHealthScore } {
    // Clear old issues for this project/crawl
    db.deleteWhere('seo_issues', { projectId, crawlId });
    db.deleteWhere('issue_instances', { projectId, crawlId });

    const issuesMap = new Map<string, { issue: SeoIssue; instances: IssueInstance[] }>();

    for (const page of pages) {
      const context: RuleEvaluationContext = {
        page,
        allPages: pages,
        graph,
        projectDomain
      };

      for (const rule of this.rules.values()) {
        try {
          const result = rule.evaluate(context);
          if (result && result.isTriggered) {
            let grouped = issuesMap.get(rule.id);
            if (!grouped) {
              const issueId = crypto.randomUUID();
              const autoFixSupported = rule.autoFixSupported;
              const classification = autoFixSupported ? (result.confidence >= 90 ? 'SAFE_AUTO_FIX' : 'REVIEW_REQUIRED') : 'MANUAL';
              
              const masterIssue: SeoIssue = {
                id: issueId,
                projectId,
                crawlId,
                ruleId: rule.id,
                category: rule.category,
                severity: rule.severity,
                title: rule.title,
                description: rule.description,
                rootCauseType: rule.rootCauseType,
                rootCauseSummary: `${rule.title} detected on ${page.pathname}`,
                templateIdentifier: page.detectedTemplateId,
                affectedCount: 0,
                autoFixSupported,
                fixClassification: classification,
                confidenceScore: result.confidence,
                status: 'DETECTED',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              grouped = { issue: masterIssue, instances: [] };
              issuesMap.set(rule.id, grouped);
            }

            grouped.issue.affectedCount++;
            const instance: IssueInstance = {
              id: crypto.randomUUID(),
              issueId: grouped.issue.id,
              projectId,
              crawlId,
              url: page.url,
              domSelector: result.domSelector,
              currentValue: result.currentValue,
              expectedValue: result.expectedValue,
              evidence: result.evidence,
              status: 'DETECTED'
            };
            grouped.instances.push(instance);
          }
        } catch (err) {
          console.error(`[Rules] Error executing rule ${rule.id} on ${page.url}:`, err);
        }
      }
    }

    const allIssues: SeoIssue[] = [];
    const allInstances: IssueInstance[] = [];

    for (const { issue, instances } of issuesMap.values()) {
      db.insert('seo_issues', issue);
      allIssues.push(issue);
      for (const inst of instances) {
        db.insert('issue_instances', inst);
        allInstances.push(inst);
      }
    }

    const score = this.calculateHealthScore(allIssues, pages.length);
    return { issues: allIssues, instances: allInstances, score };
  }

  public static calculateHealthScore(issues: SeoIssue[], totalPages: number): SeoHealthScore {
    const categories: IssueCategory[] = [
      'CRAWLABILITY', 'INDEXABILITY', 'TECHNICAL', 'ON_PAGE', 'CONTENT',
      'INTERNAL_LINKS', 'EXTERNAL_LINKS', 'IMAGES_MEDIA', 'STRUCTURED_DATA',
      'SITEMAP', 'ROBOTS_TXT', 'MOBILE', 'PERFORMANCE', 'JAVASCRIPT',
      'INTERNATIONAL', 'ECOMMERCE', 'LOCAL_SEO', 'SECURITY', 'ACCESSIBILITY'
    ];

    const categoryWeights: Record<IssueCategory, number> = {
      CRAWLABILITY: 10,
      INDEXABILITY: 15,
      TECHNICAL: 15,
      ON_PAGE: 15,
      CONTENT: 10,
      INTERNAL_LINKS: 8,
      EXTERNAL_LINKS: 5,
      IMAGES_MEDIA: 6,
      STRUCTURED_DATA: 8,
      SITEMAP: 6,
      ROBOTS_TXT: 6,
      MOBILE: 10,
      PERFORMANCE: 8,
      JAVASCRIPT: 6,
      INTERNATIONAL: 4,
      ECOMMERCE: 5,
      LOCAL_SEO: 4,
      SECURITY: 10,
      ACCESSIBILITY: 5
    };

    const breakdown: Partial<Record<IssueCategory, CategoryScore>> = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;
    let totalInfo = 0;
    let totalFixed = 0;

    for (const cat of categories) {
      const catIssues = issues.filter(i => i.category === cat);
      const crit = catIssues.filter(i => i.severity === 'CRITICAL' && i.status !== 'FIXED').length;
      const high = catIssues.filter(i => i.severity === 'HIGH' && i.status !== 'FIXED').length;
      const med = catIssues.filter(i => i.severity === 'MEDIUM' && i.status !== 'FIXED').length;
      const low = catIssues.filter(i => i.severity === 'LOW' && i.status !== 'FIXED').length;
      const info = catIssues.filter(i => i.severity === 'INFO' && i.status !== 'FIXED').length;
      const fixed = catIssues.filter(i => i.status === 'FIXED').length;

      totalCritical += crit;
      totalHigh += high;
      totalMedium += med;
      totalLow += low;
      totalInfo += info;
      totalFixed += fixed;

      // Penalties per severity
      const deductions = (crit * 25) + (high * 15) + (med * 8) + (low * 3);
      const categoryScore = Math.max(0, 100 - deductions);
      const weight = categoryWeights[cat];

      breakdown[cat] = {
        category: cat,
        score: categoryScore,
        weight,
        issuesCount: { critical: crit, high, medium: med, low, info }
      };

      totalWeightedScore += categoryScore * weight;
      totalWeight += weight;
    }

    const overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 100;

    return {
      overallScore: overall,
      breakdown: breakdown as Record<IssueCategory, CategoryScore>,
      totalIssues: issues.length,
      criticalIssues: totalCritical,
      highIssues: totalHigh,
      mediumIssues: totalMedium,
      lowIssues: totalLow,
      fixedIssues: totalFixed,
      pendingReviewIssues: issues.filter(i => i.status === 'AWAITING_APPROVAL').length,
      manualIssues: issues.filter(i => i.status === 'MANUAL_REQUIRED' || i.fixClassification === 'MANUAL').length,
      calculatedAt: new Date().toISOString()
    };
  }
}
