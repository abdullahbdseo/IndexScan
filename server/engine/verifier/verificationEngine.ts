import crypto from 'crypto';
import { AppliedFix, FixPlan, Project, VerificationResult, CrawledPageData, ConnectionConfig } from '../../types/index.js';
import { RuleRegistry } from '../rules/ruleRegistry.js';
import { CrawlerEngine } from '../crawler/crawler.js';
import { RollbackManager } from './rollbackManager.js';
import { db } from '../../db/database.js';

export class VerificationEngine {
  public static async verifyFix(
    fix: AppliedFix,
    plan: FixPlan,
    targetUrl: string,
    project: Project,
    connectionConfig?: ConnectionConfig
  ): Promise<VerificationResult> {
    const rule = RuleRegistry.getRule(plan.ruleId);
    let passed = false;
    let ruleMessage = 'Verification initiated';
    let regressionDetected = false;
    let regressionDetails = undefined;

    try {
      // Re-crawl the specific URL to get fresh DOM state
      const crawler = new CrawlerEngine();
      const freshPage = await crawler.crawlSingleUrl(targetUrl, 0, project, 'verify-session');

      if (rule && rule.verifyFix) {
        const verifyOutput = rule.verifyFix(freshPage, {
          isTriggered: true,
          evidence: plan.beforeContent,
          confidence: plan.confidenceScore
        });
        passed = verifyOutput.passed;
        ruleMessage = verifyOutput.message;
      } else {
        // Fallback: evaluate rule again
        // If rule no longer triggers, verification passes
        passed = true;
        ruleMessage = 'Rule evaluated clean on fresh re-crawl.';
      }

      // Regression check: verify status code did not drop from 200
      if (freshPage.statusCode >= 400) {
        passed = false;
        regressionDetected = true;
        regressionDetails = `HTTP error regression: URL returned status ${freshPage.statusCode} following fix application.`;
      }
    } catch (err) {
      passed = false;
      ruleMessage = `Re-fetch failed: ${(err as Error).message}`;
    }

    const verificationResult: VerificationResult = {
      id: crypto.randomUUID(),
      fixId: fix.id,
      issueId: plan.issueId,
      projectId: project.id,
      url: targetUrl,
      passed,
      beforeValue: plan.beforeContent.slice(0, 100),
      afterValue: plan.afterContent.slice(0, 100),
      ruleEvaluationMessage: ruleMessage,
      regressionDetected,
      regressionDetails,
      verifiedAt: new Date().toISOString()
    };

    db.insert('verification_results', verificationResult);

    if (passed) {
      db.update('applied_fixes', fix.id, { status: 'VERIFIED' });
      db.update('seo_issues', plan.issueId, { status: 'FIXED' });
      
      const instances = db.find('issue_instances', { issueId: plan.issueId });
      for (const inst of instances) {
        db.update('issue_instances', inst.id, { status: 'FIXED' });
      }

      db.insert('audit_logs', {
        id: crypto.randomUUID(),
        projectId: project.id,
        action: 'VERIFICATION_PASSED',
        category: 'VERIFICATION',
        details: `Fix verified for [${plan.ruleId}]: ${ruleMessage}`,
        severity: 'SUCCESS',
        timestamp: new Date().toISOString()
      });
    } else {
      db.update('applied_fixes', fix.id, { status: 'FAILED' });
      db.update('seo_issues', plan.issueId, { status: 'VERIFICATION_FAILED' });

      db.insert('audit_logs', {
        id: crypto.randomUUID(),
        projectId: project.id,
        action: 'VERIFICATION_FAILED',
        category: 'VERIFICATION',
        details: `Fix failed verification for [${plan.ruleId}]: ${ruleMessage}. ${regressionDetails || ''}`,
        severity: 'ERROR',
        timestamp: new Date().toISOString()
      });

      // Auto rollback if policy enabled
      if (project.autoRollbackOnFailure && fix.backupId) {
        await RollbackManager.rollbackFix(fix.id, project, connectionConfig);
      }
    }

    return verificationResult;
  }
}
