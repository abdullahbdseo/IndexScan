import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from './db/database.js';
import { Project, ConnectionConfig } from './types/index.js';
import { AdapterFactory } from './adapters/adapterFactory.js';
import { CrawlerEngine } from './engine/crawler/crawler.js';
import { KnowledgeGraphEngine } from './engine/crawler/knowledgeGraph.js';
import { RuleRegistry } from './engine/rules/ruleRegistry.js';
import { DiagnosticEngine } from './engine/diagnostics/diagnosticEngine.js';
import { FixPlanningEngine } from './engine/fixer/fixPlanningEngine.js';
import { AutoFixEngine } from './engine/fixer/autoFixEngine.js';
import { VerificationEngine } from './engine/verifier/verificationEngine.js';
import { RollbackManager } from './engine/verifier/rollbackManager.js';
import { ReportGenerator } from './engine/reporter/reportGenerator.js';
import { agentOrchestrator } from './engine/agent/autonomousSeoAgent.js';
import { AgentMemory } from './engine/agent/agentMemory.js';
import { TaskQueue } from './engine/agent/taskQueue.js';
import { KeywordEngine } from './engine/keyword/keywordEngine.js';
import { ContentAnalyzer } from './engine/content/contentAnalyzer.js';
import { ContentGapDetector } from './engine/content/contentGapDetector.js';
import { PerformanceAnalyzer } from './engine/performance/performanceAnalyzer.js';
import { SchemaGenerator } from './engine/schema/schemaGenerator.js';
import { InternalLinkAgent } from './engine/linking/internalLinkAgent.js';
import { createSandboxServer } from './sandbox/sandboxServer.js';
import { runSeoAudit } from './engine/indexscan/seoAuditEngine.js';
import { buildExcelReport } from './engine/indexscan/excelReportBuilder.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Start live sandbox website server
createSandboxServer(4001);

// Initialize default sandbox project if none exists
const existingProjects = db.find('projects');
if (existingProjects.length === 0) {
  const defaultProj: Project = {
    id: 'demo-sandbox-project',
    name: 'Apex Cloud Solutions (Demo Sandbox)',
    domain: 'http://localhost:4001',
    cmsType: 'Static HTML / Custom',
    renderingType: 'STATIC',
    mode: 'AUTONOMOUS',
    maxCrawlUrls: 20,
    crawlDepth: 3,
    concurrency: 2,
    autoFixThreshold: 90,
    maxAutonomousCycles: 3,
    autoRollbackOnFailure: true,
    allowedFixCategories: [
      'CRAWLABILITY', 'INDEXABILITY', 'TECHNICAL', 'ON_PAGE', 'CONTENT',
      'INTERNAL_LINKS', 'EXTERNAL_LINKS', 'IMAGES_MEDIA', 'STRUCTURED_DATA',
      'SITEMAP', 'ROBOTS_TXT', 'MOBILE', 'PERFORMANCE', 'JAVASCRIPT',
      'INTERNATIONAL', 'ECOMMERCE', 'LOCAL_SEO', 'SECURITY', 'ACCESSIBILITY'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.insert('projects', defaultProj);

  const defaultConn: ConnectionConfig = {
    id: 'demo-sandbox-conn',
    projectId: defaultProj.id,
    adapterType: 'local_fs',
    baseDirectory: path.resolve(process.cwd(), 'server/sandbox/site'),
    isActive: true,
    testedAt: new Date().toISOString(),
    testStatus: 'SUCCESS',
    testMessage: 'Connected to local sandbox site directory.'
  };
  db.insert('connections', defaultConn);
}

// ==========================================
// SERVER-SENT EVENTS (SSE) STREAM
// ==========================================
app.get(['/events', '/events/:projectId'], (req, res) => {
  const projectId = req.params.projectId || (req.query.projectId as string) || '*';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const unsubscribe = agentOrchestrator.subscribe(projectId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Also subscribe to wildcard if specific project given
  const unsubWildcard = projectId !== '*' ? agentOrchestrator.subscribe('*', (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }) : () => {};

  req.on('close', () => {
    unsubscribe();
    unsubWildcard();
  });
});

// ==========================================
// PROJECTS API
// ==========================================
app.get('/api/projects', (req, res) => {
  const projects = db.find('projects');
  res.json({ success: true, data: projects });
});

app.post('/api/projects', (req, res) => {
  const body = req.body;
  const id = crypto.randomUUID();
  const newProject: Project = {
    id,
    name: body.name || 'My Website',
    domain: body.domain,
    mode: body.mode || 'AUTONOMOUS',
    maxCrawlUrls: body.maxCrawlUrls || 50,
    crawlDepth: body.crawlDepth || 4,
    concurrency: body.concurrency || 3,
    autoFixThreshold: body.autoFixThreshold || 90,
    maxAutonomousCycles: body.maxAutonomousCycles || 3,
    autoRollbackOnFailure: body.autoRollbackOnFailure !== false,
    allowedFixCategories: body.allowedFixCategories || [
      'CRAWLABILITY', 'INDEXABILITY', 'TECHNICAL', 'ON_PAGE', 'CONTENT',
      'INTERNAL_LINKS', 'EXTERNAL_LINKS', 'IMAGES_MEDIA', 'STRUCTURED_DATA',
      'SITEMAP', 'ROBOTS_TXT', 'MOBILE', 'PERFORMANCE', 'JAVASCRIPT',
      'INTERNATIONAL', 'ECOMMERCE', 'LOCAL_SEO', 'SECURITY', 'ACCESSIBILITY'
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.insert('projects', newProject);

  // Setup connection if provided
  if (body.connection) {
    const conn: ConnectionConfig = {
      id: crypto.randomUUID(),
      projectId: id,
      adapterType: body.connection.adapterType || 'local_fs',
      baseDirectory: body.connection.baseDirectory,
      apiUrl: body.connection.apiUrl,
      apiKey: body.connection.apiKey,
      username: body.connection.username,
      gitRepoUrl: body.connection.gitRepoUrl,
      gitBranch: body.connection.gitBranch,
      sshHost: body.connection.sshHost,
      sshPort: body.connection.sshPort,
      isActive: true
    };
    db.insert('connections', conn);
  }

  res.json({ success: true, data: newProject });
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true, data: project });
});

app.put('/api/projects/:id', (req, res) => {
  db.update('projects', req.params.id, { ...req.body, updatedAt: new Date().toISOString() });
  const updated = db.findById('projects', req.params.id);
  res.json({ success: true, data: updated });
});

app.delete('/api/projects/:id', (req, res) => {
  db.delete('projects', req.params.id);
  res.json({ success: true, message: 'Project deleted' });
});

// ==========================================
// CONNECTION CONFIG API
// ==========================================
app.get('/api/projects/:id/connection', (req, res) => {
  const conn = db.find('connections', { projectId: req.params.id })[0] || null;
  res.json({ success: true, data: conn });
});

app.post('/api/projects/:id/connection', (req, res) => {
  const existing = db.find('connections', { projectId: req.params.id })[0];
  const connData: ConnectionConfig = {
    id: existing?.id || crypto.randomUUID(),
    projectId: req.params.id,
    adapterType: req.body.adapterType || 'local_fs',
    baseDirectory: req.body.baseDirectory,
    apiUrl: req.body.apiUrl,
    apiKey: req.body.apiKey,
    username: req.body.username,
    gitRepoUrl: req.body.gitRepoUrl,
    gitBranch: req.body.gitBranch,
    sshHost: req.body.sshHost,
    sshPort: req.body.sshPort,
    isActive: true
  };
  db.insert('connections', connData);
  res.json({ success: true, data: connData });
});

app.post('/api/projects/:id/connection/test', async (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  const conn = db.find('connections', { projectId: req.params.id })[0];
  if (!conn) return res.status(400).json({ success: false, message: 'No connection configuration found' });

  try {
    const adapter = AdapterFactory.getAdapter(conn.adapterType);
    const authResult = await adapter.authenticate(conn);
    const permResult = await adapter.verifyPermissions(conn);

    const isSuccess = authResult.success && permResult.canWrite;
    const message = `${authResult.message}. ${permResult.message}`;

    db.update('connections', conn.id, {
      testedAt: new Date().toISOString(),
      testStatus: isSuccess ? 'SUCCESS' : 'FAILED',
      testMessage: message
    });

    res.json({ success: isSuccess, message });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ==========================================
// CRAWL & AUDIT API
// ==========================================
app.post('/api/projects/:id/crawl', async (req, res) => {
  const project: Project | null = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  try {
    const crawler = new CrawlerEngine();
    const session = await crawler.crawl(project);
    const pages = db.find('crawl_urls', { crawlId: session.id });
    const graph = KnowledgeGraphEngine.buildGraph(pages);
    const { issues, score } = RuleRegistry.runAudit(project.id, session.id, project.domain, pages, graph);

    res.json({ success: true, session, totalPages: pages.length, issuesCount: issues.length, score });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

app.get('/api/projects/:id/pages', (req, res) => {
  const pages = db.find('crawl_urls', { projectId: req.params.id });
  res.json({ success: true, data: pages });
});

app.get('/api/projects/:id/issues', (req, res) => {
  const issues = db.find('seo_issues', { projectId: req.params.id });
  const instances = db.find('issue_instances', { projectId: req.params.id });
  
  const populated = issues.map((issue: any) => {
    const issueInsts = instances.filter((inst: any) => inst.issueId === issue.id);
    const plan = db.find('fix_plans', { issueId: issue.id })[0] || null;
    return {
      ...issue,
      instances: issueInsts,
      fixPlan: plan
    };
  });

  res.json({ success: true, data: populated });
});

app.get('/api/projects/:id/score', (req, res) => {
  const issues = db.find('seo_issues', { projectId: req.params.id });
  const score = RuleRegistry.calculateHealthScore(issues, 1);
  res.json({ success: true, data: score });
});

// ==========================================
// DIAGNOSTICS & AUTO-FIX API
// ==========================================
app.get('/api/issues/:id/diagnostic', (req, res) => {
  const issue = db.findById('seo_issues', req.params.id);
  if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

  const instances = db.find('issue_instances', { issueId: issue.id });
  const pages = db.find('crawl_urls', { projectId: issue.projectId });
  const graph = KnowledgeGraphEngine.buildGraph(pages);

  const report = DiagnosticEngine.diagnose(issue, instances, pages, graph);
  res.json({ success: true, data: report });
});

app.get('/api/issues/:id/plan', (req, res) => {
  const issue = db.findById('seo_issues', req.params.id);
  if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

  let plan = db.find('fix_plans', { issueId: issue.id })[0];
  if (!plan) {
    const instances = db.find('issue_instances', { issueId: issue.id });
    const pages = db.find('crawl_urls', { projectId: issue.projectId });
    const graph = KnowledgeGraphEngine.buildGraph(pages);
    const project = db.findById('projects', issue.projectId);
    plan = FixPlanningEngine.generatePlan(issue, instances, pages, graph, project);
  }

  res.json({ success: true, data: plan });
});

app.post('/api/issues/:id/fix', async (req, res) => {
  const issue = db.findById('seo_issues', req.params.id);
  if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

  const project = db.findById('projects', issue.projectId);
  const conn = db.find('connections', { projectId: issue.projectId })[0];

  let plan = db.find('fix_plans', { issueId: issue.id })[0];
  if (!plan) {
    const instances = db.find('issue_instances', { issueId: issue.id });
    const pages = db.find('crawl_urls', { projectId: issue.projectId });
    const graph = KnowledgeGraphEngine.buildGraph(pages);
    plan = FixPlanningEngine.generatePlan(issue, instances, pages, graph, project);
  }

  if (!plan) {
    return res.status(400).json({ success: false, message: 'Could not generate fix plan' });
  }

  const fixResult = await AutoFixEngine.executeFix(plan, project, conn);
  if (!fixResult.success || !fixResult.appliedFix) {
    return res.status(500).json({ success: false, message: fixResult.error });
  }

  const inst = db.find('issue_instances', { issueId: issue.id })[0];
  const targetUrl = inst?.url || project.domain;

  const verification = await VerificationEngine.verifyFix(
    fixResult.appliedFix,
    plan,
    targetUrl,
    project,
    conn
  );

  res.json({ success: true, fix: fixResult.appliedFix, verification });
});

app.post('/api/projects/:id/fix-all-safe', async (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  const conn = db.find('connections', { projectId: project.id })[0];

  const issues = db.find('seo_issues', { projectId: project.id });
  const pages = db.find('crawl_urls', { projectId: project.id });
  const graph = KnowledgeGraphEngine.buildGraph(pages);

  const appliedFixes = [];
  const verifications = [];

  for (const issue of issues) {
    if (issue.autoFixSupported && issue.status !== 'FIXED') {
      const instances = db.find('issue_instances', { issueId: issue.id });
      let plan = db.find('fix_plans', { issueId: issue.id })[0];
      if (!plan) {
        plan = FixPlanningEngine.generatePlan(issue, instances, pages, graph, project);
      }

      if (plan && (plan.classification === 'SAFE_AUTO_FIX' || plan.isApproved)) {
        const fixRes = await AutoFixEngine.executeFix(plan, project, conn);
        if (fixRes.success && fixRes.appliedFix) {
          appliedFixes.push(fixRes.appliedFix);
          const targetUrl = instances[0]?.url || project.domain;
          const verifyRes = await VerificationEngine.verifyFix(fixRes.appliedFix, plan, targetUrl, project, conn);
          verifications.push(verifyRes);
        }
      }
    }
  }

  res.json({
    success: true,
    totalAttempted: appliedFixes.length,
    verifiedCount: verifications.filter(v => v.passed).length,
    failedCount: verifications.filter(v => !v.passed).length
  });
});

// ==========================================
// ROLLBACK API
// ==========================================
app.post('/api/fixes/:id/rollback', async (req, res) => {
  const fix = db.findById('applied_fixes', req.params.id);
  if (!fix) return res.status(404).json({ success: false, message: 'Fix record not found' });

  const project = db.findById('projects', fix.projectId);
  const conn = db.find('connections', { projectId: fix.projectId })[0];

  const result = await RollbackManager.rollbackFix(fix.id, project, conn);
  res.json(result);
});

app.post('/api/projects/:id/rollback-session', async (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  const conn = db.find('connections', { projectId: project.id })[0];

  const result = await RollbackManager.rollbackSession(project.id, conn);
  res.json({ success: true, ...result });
});

// ==========================================
// AUTONOMOUS AGENT ORCHESTRATION API
// ==========================================
app.post('/api/projects/:id/autonomous/start', async (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  const conn = db.find('connections', { projectId: project.id })[0];

  // Start background asynchronous autonomous optimization loop
  agentOrchestrator.runAutonomousOptimization(project, conn).catch(err => {
    console.error('[Agent] Autonomous run error:', err);
  });

  res.json({ success: true, message: 'Autonomous optimization loop started.' });
});

app.get('/api/projects/:id/autonomous/state', (req, res) => {
  const state = agentOrchestrator.getLoopState(req.params.id);
  res.json({ success: true, data: state });
});

// ==========================================
// URL INSPECTOR API
// ==========================================
app.post('/api/projects/:id/inspect-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'URL required' });

  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  try {
    const crawler = new CrawlerEngine();
    const pageData = await crawler.crawlSingleUrl(url, 0, project, 'url-inspector');
    const allPages = db.find('crawl_urls', { projectId: project.id });
    const graph = KnowledgeGraphEngine.buildGraph(allPages.length > 0 ? allPages : [pageData]);

    const matchingIssues = [];
    for (const rule of RuleRegistry.getAllRules()) {
      const result = rule.evaluate({
        page: pageData,
        allPages: [pageData],
        graph,
        projectDomain: project.domain
      });
      if (result && result.isTriggered) {
        matchingIssues.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          evidence: result.evidence,
          confidence: result.confidence,
          autoFixSupported: rule.autoFixSupported
        });
      }
    }

    res.json({ success: true, page: pageData, issues: matchingIssues });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// ==========================================
// REPORTS & LOGS API
// ==========================================
app.get('/api/projects/:id/reports', (req, res) => {
  const reports = db.find('reports', { projectId: req.params.id });
  res.json({ success: true, data: reports });
});

app.get('/api/projects/:id/reports/latest', (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const issues = db.find('seo_issues', { projectId: project.id });
  const score = RuleRegistry.calculateHealthScore(issues, 1);
  const report = ReportGenerator.generateReport(project, score, issues);

  res.json({ success: true, data: report });
});

app.post('/api/projects/:id/inspect-url', async (req, res) => {
  const project = db.findById('projects', req.params.id) || {
    id: req.params.id,
    domain: req.body.url,
    name: 'URL Inspection'
  };
  const targetUrl = req.body.url;
  if (!targetUrl) return res.status(400).json({ success: false, message: 'URL is required' });

  try {
    const crawler = new CrawlerEngine();
    const pageData = await (crawler as any).crawlUrl(targetUrl, 0, project, 'inspect-' + crypto.randomUUID());
    if (!pageData) return res.status(404).json({ success: false, message: 'Failed to inspect URL' });

    const graph = KnowledgeGraphEngine.buildGraph([pageData]);
    const { issues } = RuleRegistry.runAudit(project.id, 'inspect-session', project.domain, [pageData], graph);

    res.json({ success: true, page: pageData, issues });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

app.get('/api/projects/:id/reports/export-csv', (req, res) => {
  const project = db.findById('projects', req.params.id);
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const issues = db.find('seo_issues', { projectId: project.id });
  const score = RuleRegistry.calculateHealthScore(issues, 1);
  const report = ReportGenerator.generateReport(project, score, issues);
  const csv = ReportGenerator.toCsv(report);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '_')}_SEO_Report.csv"`);
  res.send(csv);
});

app.get('/api/projects/:id/logs', (req, res) => {
  const logs = db.find('audit_logs', { projectId: req.params.id });
  res.json({ success: true, data: logs.reverse() });
});

// ==========================================
// SANDBOX RESET API
// ==========================================
app.post('/api/sandbox/reset', (req, res) => {
  const siteDir = path.resolve(process.cwd(), 'server/sandbox/site');
  
  // Re-write initial flawed index.html
  const initialIndex = `<!DOCTYPE html>
<html>
  <head>
    <title>Apex Cloud Solutions | Next-Gen Enterprise Tech</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/products">Products</a>
      </nav>
    </header>
    <main>
      <section class="hero">
        <p>We deliver autonomous enterprise cloud infrastructure and intelligent systems.</p>
        <img src="/assets/hero-banner.jpg">
      </section>
      <section class="features">
        <h2>Intelligent SEO Automation</h2>
        <p>Continuous auditing and autonomous repairing for search dominance.</p>
        <img src="/assets/chart-analytics.png">
      </section>
    </main>
    <footer>
      <div class="site-links"></div>
      <p>&copy; 2026 Apex Cloud Solutions. All rights reserved.</p>
    </footer>
  </body>
</html>`;

  fs.writeFileSync(path.join(siteDir, 'index.html'), initialIndex, 'utf-8');
  res.json({ success: true, message: 'Sandbox website reset to original state with test SEO flaws.' });
});

// ==========================================
// TASK QUEUE API
// ==========================================
app.get('/api/projects/:id/tasks', (req, res) => {
  try {
    const tasks = TaskQueue.getQueue(req.params.id);
    const stats = TaskQueue.getStats(req.params.id);
    res.json({ tasks, stats });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/projects/:id/tasks/stats', (req, res) => {
  try {
    const stats = TaskQueue.getStats(req.params.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/projects/:id/tasks/:taskId/transition', (req, res) => {
  try {
    const { state, error } = req.body;
    const task = TaskQueue.transitionState(req.params.taskId, state, { error });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// AGENT MEMORY API
// ==========================================
app.get('/api/projects/:id/memory', (req, res) => {
  try {
    const summary = AgentMemory.getSummary(req.params.id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/projects/:id/memory/history', (req, res) => {
  try {
    const history = AgentMemory.getAuditHistory(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/projects/:id/agent-status', (req, res) => {
  try {
    const status = agentOrchestrator.getAgentStatus(req.params.id);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Reject an issue (mark as intentional — agent will skip in future)
app.post('/api/projects/:id/issues/:issueId/reject', (req, res) => {
  try {
    const issue = db.findById('seo_issues', req.params.issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const { reason } = req.body;
    AgentMemory.remember(
      req.params.id,
      'REJECTED_FIX',
      issue.ruleId,
      reason || 'User rejected this fix',
      { issueId: req.params.issueId, ruleId: issue.ruleId }
    );

    db.update('seo_issues', req.params.issueId, { status: 'MANUAL_REQUIRED' });
    res.json({ success: true, message: 'Issue rejected and stored in agent memory' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// PHASE 2: SEO INTELLIGENCE API ENDPOINTS
// ==========================================

// Helper to get pages for project
function getProjectPages(projectId: string): any[] {
  const pages = db.find('crawl_urls', { projectId }) as any[];
  if (pages.length > 0) return pages;
  return db.find('crawled_pages', { projectId }) as any[];
}

// 1. KEYWORD ENGINE & CANNIBALIZATION
app.get('/api/projects/:id/keywords', (req, res) => {
  try {
    const pages = getProjectPages(req.params.id);
    if (pages.length === 0) {
      return res.json({ totalUniqueKeywords: 0, topSiteKeywords: [], cannibalizationIssues: [], pageAnalyses: [] });
    }
    const matrix = KeywordEngine.analyzeProjectKeywords(pages);
    res.json(matrix);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 2. CONTENT QUALITY & DUPLICATE CONTENT
app.get('/api/projects/:id/content-analysis', (req, res) => {
  try {
    const pages = getProjectPages(req.params.id);
    if (pages.length === 0) {
      return res.json({ pages: [], duplicates: [] });
    }
    const pageReports = pages.map(p => ContentAnalyzer.analyzePageContent(p));
    const duplicates = ContentAnalyzer.findDuplicateContent(pages);
    res.json({ pages: pageReports, duplicates });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. CONTENT GAPS
app.get('/api/projects/:id/content-gaps', (req, res) => {
  try {
    const pages = getProjectPages(req.params.id);
    const allGaps = pages.flatMap(p => ContentGapDetector.detectGaps(p));
    res.json({ totalGaps: allGaps.length, gaps: allGaps });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 4. PERFORMANCE & CORE WEB VITALS
app.get('/api/projects/:id/performance-audit', (req, res) => {
  try {
    const pages = getProjectPages(req.params.id);
    if (pages.length === 0) {
      return res.json({ averagePerformanceScore: 0, reports: [] });
    }
    const reports = pages.map(p => PerformanceAnalyzer.analyzePagePerformance(p));
    const avgScore = Math.round(reports.reduce((acc, r) => acc + r.performanceScore, 0) / Math.max(1, reports.length));
    res.json({ averagePerformanceScore: avgScore, reports });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 5. SCHEMA / STRUCTURED DATA PROPOSALS
app.get('/api/projects/:id/schema-proposals', (req, res) => {
  try {
    const project = db.findById('projects', req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const pages = getProjectPages(req.params.id);
    const proposals = pages.flatMap(p => SchemaGenerator.generateForPage(p, project.domain, project.name));
    res.json({ totalProposals: proposals.length, proposals });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 6. CONTEXTUAL INTERNAL LINKING OPPORTUNITIES
app.get('/api/projects/:id/link-opportunities', (req, res) => {
  try {
    const pages = getProjectPages(req.params.id);
    if (pages.length === 0) {
      return res.json({ totalOpportunities: 0, opportunities: [] });
    }
    const audit = InternalLinkAgent.findOpportunities(pages);
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ==========================================
// INDEXSCAN — SEO AUDIT API
// ==========================================

// In-memory audit cache (last 20 audits)
const auditCache = new Map<string, any>();

app.post('/api/indexscan/audit', async (req, res) => {
  const { url } = req.body as { url: string };
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  try {
    console.log(`[IndexScan] Starting audit for: ${url}`);
    const result = await runSeoAudit(url.trim());
    auditCache.set(result.id, result);
    // Keep only last 20
    if (auditCache.size > 20) {
      const firstKey = auditCache.keys().next().value;
      if (firstKey) auditCache.delete(firstKey);
    }
    console.log(`[IndexScan] Audit complete for ${result.domain} — score: ${result.scores.overall}/100`);
    res.json(result);
  } catch (err: any) {
    console.error('[IndexScan] Audit error:', err.message);
    res.status(500).json({ error: `Audit failed: ${err.message}` });
  }
});

app.get('/api/indexscan/download/:id', async (req, res) => {
  const { id } = req.params;
  const audit = auditCache.get(id);
  if (!audit) {
    return res.status(404).json({ error: 'Audit not found. Please run the audit again.' });
  }
  try {
    const buffer = await buildExcelReport(audit);
    const filename = `SEO_Audit_${audit.domain}_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: `Excel generation failed: ${err.message}` });
  }
});

// Serve frontend build in production
const clientDist = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[ApexSEO] Backend API & Orchestrator listening at http://localhost:${PORT}`);
});
