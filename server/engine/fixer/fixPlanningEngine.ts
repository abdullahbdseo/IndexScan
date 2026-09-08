import crypto from 'crypto';
import { SeoIssue, IssueInstance, FixPlan, CrawledPageData, Project } from '../../types/index.js';
import { RuleRegistry } from '../rules/ruleRegistry.js';
import { WebsiteKnowledgeGraph } from '../crawler/knowledgeGraph.js';
import { db } from '../../db/database.js';

export class FixPlanningEngine {
  public static generatePlan(
    issue: SeoIssue,
    instances: IssueInstance[],
    pages: CrawledPageData[],
    graph: WebsiteKnowledgeGraph,
    project: Project
  ): FixPlan | null {
    const rule = RuleRegistry.getRule(issue.ruleId);
    if (!rule || !rule.generateFix) {
      return null;
    }

    const firstInstance = instances[0];
    const page = pages.find(p => p.url === firstInstance.url) || pages[0];
    if (!page) return null;

    const detection = {
      isTriggered: true,
      evidence: firstInstance.evidence,
      currentValue: firstInstance.currentValue,
      expectedValue: firstInstance.expectedValue,
      domSelector: firstInstance.domSelector,
      confidence: issue.confidenceScore
    };

    const context = {
      page,
      allPages: pages,
      graph,
      projectDomain: project.domain
    };

    const proposal = rule.generateFix(context, detection);
    if (!proposal) return null;

    const planId = crypto.randomUUID();
    const plan: FixPlan = {
      id: planId,
      issueId: issue.id,
      projectId: project.id,
      ruleId: issue.ruleId,
      targetType: proposal.targetType,
      targetPath: proposal.targetPath,
      selectorOrField: proposal.selectorOrField,
      beforeContent: proposal.beforeContent,
      afterContent: proposal.afterContent,
      diffSummary: proposal.diffSummary,
      explanation: proposal.explanation,
      impactScore: proposal.impactScore,
      riskScore: proposal.riskScore,
      confidenceScore: proposal.confidenceScore,
      classification: proposal.classification,
      isApproved: proposal.classification === 'SAFE_AUTO_FIX',
      createdAt: new Date().toISOString()
    };

    db.insert('fix_plans', plan);

    // Link plan to issue instances
    for (const inst of instances) {
      db.update('issue_instances', inst.id, {
        fixPlanId: plan.id,
        status: plan.classification === 'SAFE_AUTO_FIX' ? 'FIX_PLANNED' : 'AWAITING_APPROVAL'
      });
    }

    db.update('seo_issues', issue.id, {
      status: plan.classification === 'SAFE_AUTO_FIX' ? 'FIX_PLANNED' : 'AWAITING_APPROVAL'
    });

    return plan;
  }
}
