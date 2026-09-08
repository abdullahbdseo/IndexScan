import { Project, SeoHealthScore, SeoIssue } from '../../types/index.js';

export interface SeoAuditReport {
  projectId: string;
  projectName: string;
  domain: string;
  generatedAt: string;
  overallScore: number;
  initialScore?: number;
  improvementDelta?: number;
  summaryText: string;
  categoryBreakdown: Array<{
    category: string;
    score: number;
    weight: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  fixedIssues: Array<{
    title: string;
    category: string;
    severity: string;
    rootCause: string;
    affectedCount: number;
  }>;
  unresolvedIssues: Array<{
    title: string;
    category: string;
    severity: string;
    rootCause: string;
    affectedCount: number;
    status: string;
    recommendation: string;
  }>;
  metrics: {
    totalIssues: number;
    fixedCount: number;
    pendingApprovalCount: number;
    manualActionCount: number;
  };
}

export class ReportGenerator {
  public static generateReport(
    project: Project,
    score: SeoHealthScore,
    issues: SeoIssue[]
  ): SeoAuditReport {
    const fixed = issues.filter(i => i.status === 'FIXED');
    const unresolved = issues.filter(i => i.status !== 'FIXED');

    const categoryBreakdown = Object.values(score.breakdown).map(cat => ({
      category: cat.category,
      score: cat.score,
      weight: cat.weight,
      critical: cat.issuesCount.critical,
      high: cat.issuesCount.high,
      medium: cat.issuesCount.medium,
      low: cat.issuesCount.low
    }));

    const summaryText = `Autonomous SEO Audit completed for ${project.domain}. Initial SEO Health was ${score.initialScore || score.overallScore}/100 and achieved a verified ${score.overallScore}/100 (+${score.improvementDelta || 0} pts). ${fixed.length} issues were automatically resolved and verified.`;

    return {
      projectId: project.id,
      projectName: project.name,
      domain: project.domain,
      generatedAt: new Date().toISOString(),
      overallScore: score.overallScore,
      initialScore: score.initialScore,
      improvementDelta: score.improvementDelta,
      summaryText,
      categoryBreakdown,
      fixedIssues: fixed.map(f => ({
        title: f.title,
        category: f.category,
        severity: f.severity,
        rootCause: f.rootCauseSummary,
        affectedCount: f.affectedCount
      })),
      unresolvedIssues: unresolved.map(u => ({
        title: u.title,
        category: u.category,
        severity: u.severity,
        rootCause: u.rootCauseSummary,
        affectedCount: u.affectedCount,
        status: u.status,
        recommendation: u.description
      })),
      metrics: {
        totalIssues: issues.length,
        fixedCount: fixed.length,
        pendingApprovalCount: issues.filter(i => i.status === 'AWAITING_APPROVAL').length,
        manualActionCount: issues.filter(i => i.status === 'MANUAL_REQUIRED' || i.fixClassification === 'MANUAL').length
      }
    };
  }

  public static toCsv(report: SeoAuditReport): string {
    const lines = [
      'Issue Title,Category,Severity,Status,Affected URLs,Root Cause',
      ...report.fixedIssues.map(i => `"${i.title}","${i.category}","${i.severity}","FIXED",${i.affectedCount},"${i.rootCause}"`),
      ...report.unresolvedIssues.map(i => `"${i.title}","${i.category}","${i.severity}","${i.status}",${i.affectedCount},"${i.rootCause}"`)
    ];
    return lines.join('\n');
  }
}
