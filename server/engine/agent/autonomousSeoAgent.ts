import crypto from 'crypto';
import { Project, ConnectionConfig, AutonomousLoopState, SeoHealthScore } from '../../types/index.js';
import { CrawlerEngine } from '../crawler/crawler.js';
import { KnowledgeGraphEngine } from '../crawler/knowledgeGraph.js';
import { RuleRegistry } from '../rules/ruleRegistry.js';
import { CmsDetector } from '../cmsDetector.js';
import { DiagnosticEngine } from '../diagnostics/diagnosticEngine.js';
import { FixPlanningEngine } from '../fixer/fixPlanningEngine.js';
import { AutoFixEngine } from '../fixer/autoFixEngine.js';
import { VerificationEngine } from '../verifier/verificationEngine.js';
import { ReportGenerator } from '../reporter/reportGenerator.js';
import { AgentMemory } from './agentMemory.js';
import { TaskQueue } from './taskQueue.js';
import { KeywordEngine } from '../keyword/keywordEngine.js';
import { ContentAnalyzer } from '../content/contentAnalyzer.js';
import { PerformanceAnalyzer } from '../performance/performanceAnalyzer.js';
import { InternalLinkAgent } from '../linking/internalLinkAgent.js';
import { SchemaGenerator } from '../schema/schemaGenerator.js';
import { db } from '../../db/database.js';

export type AgentEventCallback = (event: {
  type: 'PHASE_CHANGE' | 'PROGRESS' | 'ISSUE_FOUND' | 'FIX_APPLIED' | 'VERIFIED' | 'SCORE_UPDATED' | 'LOG' | 'COMPLETE' | 'ERROR';
  state: AutonomousLoopState;
  data?: any;
}) => void;

export class AutonomousSeoAgent {
  private activeLoops: Map<string, AutonomousLoopState> = new Map();
  private eventListeners: Map<string, Set<AgentEventCallback>> = new Map();

  public subscribe(projectId: string, callback: AgentEventCallback): () => void {
    let listeners = this.eventListeners.get(projectId);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(projectId, listeners);
    }
    listeners.add(callback);

    return () => {
      listeners?.delete(callback);
    };
  }

  private emit(projectId: string, type: any, state: AutonomousLoopState, data?: any) {
    const listeners = this.eventListeners.get(projectId);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb({ type, state, data });
        } catch (e) {
          console.error('[Agent] Event callback error:', e);
        }
      }
    }
  }

  public getLoopState(projectId: string): AutonomousLoopState | null {
    return this.activeLoops.get(projectId) || null;
  }

  // ==========================================
  // GET AGENT STATUS — Full status with memory
  // ==========================================
  public getAgentStatus(projectId: string) {
    const loopState = this.getLoopState(projectId);
    const memorySummary = AgentMemory.getSummary(projectId);
    const taskStats = TaskQueue.getStats(projectId);
    const auditHistory = AgentMemory.getAuditHistory(projectId);

    return {
      loopState,
      memory: memorySummary,
      taskQueue: taskStats,
      auditHistory,
      isRunning: loopState?.status === 'RUNNING'
    };
  }

  public async runAutonomousOptimization(
    project: Project,
    connectionConfig?: ConnectionConfig
  ): Promise<AutonomousLoopState> {
    const maxCycles = project.maxAutonomousCycles || 3;
    const state: AutonomousLoopState = {
      cycleNumber: 1,
      maxCycles,
      status: 'RUNNING',
      currentPhase: 'CRAWLING',
      progressPercentage: 5,
      phaseDetails: 'Connecting and initiating baseline crawl...',
      initialScore: 0,
      currentScore: 0,
      fixedTotal: 0,
      verifiedTotal: 0,
      failedTotal: 0,
      rolledBackTotal: 0,
      startedAt: new Date().toISOString()
    };
    this.activeLoops.set(project.id, state);

    const issueHashHistory: string[] = [];

    const logAgentEvent = (action: string, details: string, severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' = 'INFO') => {
      try {
        db.insert('audit_logs', {
          id: crypto.randomUUID(),
          projectId: project.id,
          action,
          category: 'AGENT',
          details,
          severity,
          timestamp: new Date().toISOString()
        });
      } catch {}
    };

    logAgentEvent('AUTONOMOUS_START', `🚀 Started autonomous SEO optimization for ${project.name} (${project.domain}). Max cycles: ${maxCycles}.`, 'INFO');

    // Store site architecture in memory
    AgentMemory.storeSiteArchitecture(project.id, 'project_config', {
      domain: project.domain,
      mode: project.mode,
      cmsType: project.cmsType,
      maxCrawlUrls: project.maxCrawlUrls,
      startedAt: new Date().toISOString()
    });

    try {
      let currentCycle = 1;
      let stabilized = false;

      while (currentCycle <= maxCycles && !stabilized) {
        state.cycleNumber = currentCycle;

        // ==========================================
        // 1. CRAWL PHASE
        // ==========================================
        state.currentPhase = 'CRAWLING';
        state.progressPercentage = Math.round(10 + ((currentCycle - 1) / maxCycles) * 20);
        state.phaseDetails = `Cycle ${currentCycle}/${maxCycles}: Crawling site structure and resources...`;
        this.emit(project.id, 'PHASE_CHANGE', state);
        logAgentEvent('CRAWL_START', `🕷️ Cycle ${currentCycle}: Starting crawl of ${project.domain} (max ${project.maxCrawlUrls} URLs, depth ${project.crawlDepth})`, 'INFO');

        const crawlStart = Date.now();
        const crawler = new CrawlerEngine();
        const crawlSession = await crawler.crawl(project, {
          onProgress: (p) => {
            state.phaseDetails = `Crawling: ${p.crawled}/${p.discovered} URLs (${p.currentUrl})`;
            this.emit(project.id, 'PROGRESS', state, p);
          }
        });

        const pages = db.find('crawl_urls', { crawlId: crawlSession.id });
        const crawlDuration = ((Date.now() - crawlStart) / 1000).toFixed(1);
        logAgentEvent('CRAWL_COMPLETE', `✅ Crawl complete in ${crawlDuration}s: ${pages.length} pages found, ${crawlSession.urlsFailed} failed`, 'SUCCESS');

        // CMS Detection on root page
        if (pages.length > 0 && currentCycle === 1) {
          const root = pages.find((p: any) => p.pathname === '/' || p.depth === 0) || pages[0];
          const cmsInfo = CmsDetector.detect(root.rawHeaders['content-type'] || '', root.rawHeaders, root.url);
          db.update('projects', project.id, {
            cmsType: cmsInfo.cms,
            renderingType: cmsInfo.renderingMethod
          });
          project.cmsType = cmsInfo.cms;
          logAgentEvent('CMS_DETECTED', `🔍 Platform: ${cmsInfo.cms} (${cmsInfo.renderingMethod} rendering)`, 'INFO');

          // Store CMS info in agent memory
          AgentMemory.storeSiteArchitecture(project.id, 'cms_info', {
            cms: cmsInfo.cms,
            renderingMethod: cmsInfo.renderingMethod,
            detectedAt: new Date().toISOString()
          });
        }

        // ==========================================
        // 2. AUDIT & KNOWLEDGE GRAPH PHASE
        // ==========================================
        state.currentPhase = 'AUDITING';
        state.progressPercentage = Math.round(30 + ((currentCycle - 1) / maxCycles) * 20);
        state.phaseDetails = `Cycle ${currentCycle}/${maxCycles}: Building Knowledge Graph and evaluating 35+ SEO rules...`;
        this.emit(project.id, 'PHASE_CHANGE', state);
        logAgentEvent('AUDIT_START', `🔬 Analyzing ${pages.length} pages against 35+ technical SEO, content, and performance rules...`, 'INFO');

        const graph = KnowledgeGraphEngine.buildGraph(pages);
        const { issues, instances, score } = RuleRegistry.runAudit(
          project.id,
          crawlSession.id,
          project.domain,
          pages,
          graph
        );

        if (currentCycle === 1) {
          state.initialScore = score.overallScore;
        }
        state.currentScore = score.overallScore;

        // Log issues by severity
        const critCount = issues.filter(i => i.severity === 'CRITICAL').length;
        const highCount = issues.filter(i => i.severity === 'HIGH').length;
        const medCount = issues.filter(i => i.severity === 'MEDIUM').length;
        const lowCount = issues.filter(i => i.severity === 'LOW').length;

        logAgentEvent('SCORE_CALCULATED', `📊 SEO Health Score: ${score.overallScore}/100 | Issues: ${critCount} Critical, ${highCount} High, ${medCount} Medium, ${lowCount} Low (${issues.length} total)`,
          score.overallScore >= 80 ? 'SUCCESS' : score.overallScore >= 50 ? 'WARNING' : 'ERROR');

        // Log individual issues found
        for (const issue of issues.slice(0, 10)) {
          logAgentEvent('ISSUE_DETECTED', `⚠️ [${issue.severity}] ${issue.title} — ${issue.affectedCount} page(s) affected`, issue.severity === 'CRITICAL' ? 'ERROR' : 'WARNING');
        }
        if (issues.length > 10) {
          logAgentEvent('ISSUE_DETECTED', `... and ${issues.length - 10} more issues`, 'INFO');
        }

        this.emit(project.id, 'SCORE_UPDATED', state, score);

        // Record audit snapshot in agent memory
        AgentMemory.recordAuditSnapshot(
          project.id,
          score.overallScore,
          issues.length,
          issues.filter(i => i.status === 'FIXED').length,
          pages.length
        );

        // ==========================================
        // PHASE 2: INTELLIGENCE ANALYSIS
        // ==========================================
        try {
          // 1. Keyword & Cannibalization Analysis
          const keywordMatrix = KeywordEngine.analyzeProjectKeywords(pages);
          logAgentEvent('KEYWORD_ANALYSIS', `🔑 Keyword Matrix: Extracted ${keywordMatrix.totalUniqueKeywords} unique keywords across ${pages.length} pages.`, 'INFO');
          
          if (keywordMatrix.cannibalizationIssues.length > 0) {
            for (const c of keywordMatrix.cannibalizationIssues.slice(0, 3)) {
              logAgentEvent('KEYWORD_CANNIBALIZATION', `⚔️ Cannibalization detected for "${c.keyword}" across ${c.conflictingUrls.length} pages!`, 'WARNING');
              TaskQueue.createTask({
                projectId: project.id,
                taskType: 'KEYWORD_MAPPING',
                title: `Resolve Keyword Cannibalization: "${c.keyword}"`,
                description: c.explanation,
                category: 'ON_PAGE',
                severity: c.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
                seoImpactScore: 80,
                businessImpactScore: 75,
                confidenceScore: 85,
                riskScore: 10,
                affectedUrls: c.conflictingUrls,
                isAutoExecutable: false,
                requiresApproval: true
              });
            }
          }

          // 2. Performance & Core Web Vitals Audit
          const perfReports = pages.map(p => PerformanceAnalyzer.analyzePagePerformance(p));
          const avgPerf = Math.round(perfReports.reduce((acc, r) => acc + r.performanceScore, 0) / Math.max(1, perfReports.length));
          const poorClsCount = perfReports.filter(r => r.cwv.clsRating === 'POOR').length;
          const poorLcpCount = perfReports.filter(r => r.cwv.lcpRating === 'POOR').length;
          logAgentEvent('PERF_AUDIT', `⚡ Performance Score: ${avgPerf}/100 | Poor LCP: ${poorLcpCount} pages, Poor CLS (shift): ${poorClsCount} pages`, avgPerf >= 70 ? 'SUCCESS' : 'WARNING');

          // 3. Contextual Internal Linking Opportunities
          const linkAudit = InternalLinkAgent.findOpportunities(pages);
          if (linkAudit.opportunities.length > 0) {
            logAgentEvent('LINK_OPPORTUNITIES', `🔗 Discovered ${linkAudit.opportunities.length} high-relevance internal linking opportunities (rescued ${linkAudit.orphanPagesRescued} orphan pages).`, 'INFO');
          }
        } catch (intelErr: any) {
          logAgentEvent('INTEL_WARNING', `Note: Secondary intelligence metrics completed with notice: ${intelErr.message}`, 'INFO');
        }

        // Compute issue fingerprint for loop protection
        const currentIssueHash = crypto
          .createHash('md5')
          .update(issues.map(i => `${i.ruleId}:${i.affectedCount}`).sort().join('|'))
          .digest('hex');

        if (issueHashHistory.includes(currentIssueHash)) {
          state.status = 'STOPPED_LOOP_DETECTED';
          state.phaseDetails = 'Autonomous loop stabilized: identical issue signature reached with no further safe auto-fixes.';
          logAgentEvent('LOOP_STABILIZED', '🔄 Agent detected identical issue fingerprint — optimization has converged. Stopping.', 'SUCCESS');
          stabilized = true;
          break;
        }
        issueHashHistory.push(currentIssueHash);

        // ==========================================
        // 3. DIAGNOSTICS & FIX PLANNING PHASE
        // ==========================================
        state.currentPhase = 'PLANNING_FIXES';
        state.progressPercentage = Math.round(50 + ((currentCycle - 1) / maxCycles) * 20);
        state.phaseDetails = `Cycle ${currentCycle}/${maxCycles}: Running AI diagnostics and generating safe fix plans...`;
        this.emit(project.id, 'PHASE_CHANGE', state);
        logAgentEvent('PLANNING_START', `🧠 Running diagnostics and generating fix plans for ${issues.length} issues...`, 'INFO');

        const fixPlans = [];
        let skippedByMemory = 0;

        for (const issue of issues) {
          // Check agent memory — skip issues the user rejected before
          if (AgentMemory.shouldSkipIssue(project.id, issue.ruleId)) {
            skippedByMemory++;
            continue;
          }

          const issueInstances = instances.filter(inst => inst.issueId === issue.id);
          DiagnosticEngine.diagnose(issue, issueInstances, pages, graph);

          if (issue.autoFixSupported && (project.mode === 'AUTO_FIX_SAFE' || project.mode === 'AUTONOMOUS')) {
            const plan = FixPlanningEngine.generatePlan(issue, issueInstances, pages, graph, project);
            if (plan) {
              fixPlans.push(plan);

              // Create task in the queue
              TaskQueue.createTask({
                projectId: project.id,
                issueId: issue.id,
                fixPlanId: plan.id,
                taskType: this.mapCategoryToTaskType(issue.category),
                title: `Fix: ${issue.title}`,
                description: plan.explanation,
                category: issue.category,
                severity: issue.severity,
                seoImpactScore: plan.impactScore,
                businessImpactScore: Math.round(plan.impactScore * 0.8),
                confidenceScore: plan.confidenceScore,
                riskScore: plan.riskScore,
                affectedUrls: issueInstances.map(i => i.url),
                rootCause: issue.rootCauseSummary,
                isAutoExecutable: plan.classification === 'SAFE_AUTO_FIX',
                requiresApproval: plan.classification !== 'SAFE_AUTO_FIX'
              });
            }
          }
        }

        if (skippedByMemory > 0) {
          logAgentEvent('MEMORY_SKIP', `🧠 Agent memory: Skipped ${skippedByMemory} issues that were previously rejected/ignored`, 'INFO');
        }

        const safePlans = fixPlans.filter(p => p.classification === 'SAFE_AUTO_FIX' && p.isApproved);
        logAgentEvent('PLANNING_COMPLETE', `📋 Generated ${fixPlans.length} fix plans (${safePlans.length} safe auto-fix, ${fixPlans.length - safePlans.length} need review)`, 'INFO');

        // Auto-approve eligible tasks in the queue
        const autoApproved = TaskQueue.autoApproveEligibleTasks(project.id);
        if (autoApproved > 0) {
          logAgentEvent('TASKS_AUTO_APPROVED', `✅ Auto-approved ${autoApproved} high-confidence tasks`, 'SUCCESS');
        }

        if (safePlans.length === 0 || project.mode === 'AUDIT_ONLY' || project.mode === 'SUGGEST_FIXES') {
          // No safe fixes remaining or audit-only mode
          if (project.mode === 'AUDIT_ONLY') {
            logAgentEvent('AUDIT_ONLY_MODE', '📝 Running in AUDIT_ONLY mode — no fixes will be applied. Report generated.', 'INFO');
          } else if (safePlans.length === 0) {
            logAgentEvent('NO_SAFE_FIXES', '⏹️ No safe auto-fixes available. Remaining issues require manual intervention.', 'WARNING');
          }
          stabilized = true;
          break;
        }

        // ==========================================
        // 4. AUTO-FIX EXECUTION PHASE
        // ==========================================
        state.currentPhase = 'APPLYING_FIXES';
        state.progressPercentage = Math.round(70 + ((currentCycle - 1) / maxCycles) * 15);
        state.phaseDetails = `Cycle ${currentCycle}/${maxCycles}: Applying ${safePlans.length} safe auto-fixes through adapter...`;
        this.emit(project.id, 'PHASE_CHANGE', state);
        logAgentEvent('FIX_EXECUTION_START', `🔧 Applying ${safePlans.length} safe auto-fixes...`, 'INFO');

        let fixSuccessCount = 0;
        let fixFailCount = 0;

        for (const plan of safePlans) {
          logAgentEvent('FIX_APPLYING', `🔧 Fixing [${plan.ruleId}] → ${plan.targetPath}: ${plan.diffSummary}`, 'INFO');

          // Transition task to EXECUTING
          const relatedTasks = TaskQueue.getQueue(project.id).filter(t => t.fixPlanId === plan.id);
          for (const t of relatedTasks) {
            TaskQueue.transitionState(t.id, 'EXECUTING');
          }

          const fixResult = await AutoFixEngine.executeFix(plan, project, connectionConfig);
          if (fixResult.success && fixResult.appliedFix) {
            state.fixedTotal++;
            fixSuccessCount++;
            this.emit(project.id, 'FIX_APPLIED', state, fixResult.appliedFix);
            logAgentEvent('FIX_APPLIED', `✅ Fix applied: [${plan.ruleId}] — ${plan.diffSummary}`, 'SUCCESS');

            // ==========================================
            // 5. VERIFICATION PHASE
            // ==========================================
            state.currentPhase = 'VERIFYING';
            state.phaseDetails = `Verifying fix for ${plan.ruleId}...`;

            for (const t of relatedTasks) {
              TaskQueue.transitionState(t.id, 'VERIFYING');
            }

            const inst = instances.find(i => i.issueId === plan.issueId);
            const targetUrl = inst?.url || project.domain;

            const verifyResult = await VerificationEngine.verifyFix(
              fixResult.appliedFix,
              plan,
              targetUrl,
              project,
              connectionConfig
            );

            if (verifyResult.passed) {
              state.verifiedTotal++;
              logAgentEvent('FIX_VERIFIED', `✅ Verified: [${plan.ruleId}] fix confirmed working`, 'SUCCESS');

              // Record success in agent memory
              AgentMemory.recordFixOutcome(project.id, plan.ruleId, plan.targetPath, 'SUCCESS', 'Fix applied and verified successfully');

              for (const t of relatedTasks) {
                TaskQueue.transitionState(t.id, 'COMPLETED', { verificationResult: 'PASSED' });
              }
            } else {
              state.failedTotal++;
              const failReason = verifyResult.regressionDetected
                ? `Regression detected: ${verifyResult.regressionDetails}`
                : verifyResult.ruleEvaluationMessage;

              logAgentEvent('FIX_VERIFICATION_FAILED', `❌ Verification failed: [${plan.ruleId}] — ${failReason}`, 'ERROR');

              if (verifyResult.regressionDetected) {
                state.rolledBackTotal++;
                AgentMemory.recordFixOutcome(project.id, plan.ruleId, plan.targetPath, 'ROLLED_BACK', failReason);
                for (const t of relatedTasks) {
                  TaskQueue.transitionState(t.id, 'ROLLED_BACK', { error: failReason });
                }
              } else {
                AgentMemory.recordFixOutcome(project.id, plan.ruleId, plan.targetPath, 'FAILED', failReason);
                for (const t of relatedTasks) {
                  TaskQueue.transitionState(t.id, 'FAILED', { error: failReason });
                }
              }

              // Store as failed approach so agent doesn't retry the same strategy
              AgentMemory.remember(project.id, 'FAILED_APPROACH', `${plan.ruleId}::${plan.targetPath}`, failReason, {
                ruleId: plan.ruleId,
                targetPath: plan.targetPath,
                cycleNumber: currentCycle
              });
            }
            this.emit(project.id, 'VERIFIED', state, verifyResult);
          } else {
            state.failedTotal++;
            fixFailCount++;
            logAgentEvent('FIX_FAILED', `❌ Fix execution failed: [${plan.ruleId}] — ${fixResult.error}`, 'ERROR');

            AgentMemory.recordFixOutcome(project.id, plan.ruleId, plan.targetPath, 'FAILED', fixResult.error || 'Unknown error');

            for (const t of relatedTasks) {
              TaskQueue.transitionState(t.id, 'FAILED', { error: fixResult.error });
            }
          }
        }

        logAgentEvent('FIX_CYCLE_SUMMARY', `📊 Cycle ${currentCycle} summary: ${fixSuccessCount} fixed, ${fixFailCount} failed, ${state.verifiedTotal} verified total`, fixFailCount > 0 ? 'WARNING' : 'SUCCESS');
        currentCycle++;
      }

      // ==========================================
      // FINAL REPORTING
      // ==========================================
      state.currentPhase = 'REPORTING';
      state.progressPercentage = 100;
      state.status = stabilized ? 'STABILIZED' : (state.cycleNumber > maxCycles ? 'STOPPED_MAX_CYCLES' : 'STABILIZED');
      state.completedAt = new Date().toISOString();

      // Final score re-calculation
      const latestIssues = db.find('seo_issues', { projectId: project.id });
      const finalScore = RuleRegistry.calculateHealthScore(latestIssues, 1);
      finalScore.initialScore = state.initialScore;
      finalScore.improvementDelta = Math.max(0, finalScore.overallScore - state.initialScore);
      state.currentScore = finalScore.overallScore;

      // Generate comprehensive report
      const report = ReportGenerator.generateReport(project, finalScore, latestIssues);
      db.insert('reports', {
        id: crypto.randomUUID(),
        projectId: project.id,
        crawlId: 'final-run',
        overallScore: finalScore.overallScore,
        initialScore: state.initialScore,
        improvementDelta: finalScore.improvementDelta,
        reportDataJson: JSON.stringify(report),
        createdAt: new Date().toISOString()
      });

      // Record final snapshot in memory
      AgentMemory.recordAuditSnapshot(
        project.id,
        finalScore.overallScore,
        latestIssues.length,
        latestIssues.filter((i: any) => i.status === 'FIXED').length,
        db.find('crawl_urls', { projectId: project.id }).length
      );

      // Task queue stats
      const taskStats = TaskQueue.getStats(project.id);

      state.phaseDetails = `🎉 Optimization complete! Score: ${state.initialScore} → ${state.currentScore} (+${finalScore.improvementDelta} pts). Tasks: ${taskStats.completed} done, ${taskStats.pending} pending, ${taskStats.manualRequired} manual.`;
      logAgentEvent('AUTONOMOUS_COMPLETE', state.phaseDetails, 'SUCCESS');
      this.emit(project.id, 'COMPLETE', state, { score: finalScore, report, taskStats });

      return state;
    } catch (err) {
      state.status = 'ERROR';
      state.phaseDetails = `Agent stopped with error: ${(err as Error).message}`;
      logAgentEvent('AUTONOMOUS_ERROR', `💥 Agent error: ${(err as Error).message}`, 'ERROR');
      this.emit(project.id, 'ERROR', state, { error: (err as Error).message });
      throw err;
    }
  }

  // ==========================================
  // HELPER: Map issue category to task type
  // ==========================================
  private mapCategoryToTaskType(category: string): any {
    const map: Record<string, string> = {
      'CRAWLABILITY': 'TECHNICAL_FIX',
      'INDEXABILITY': 'TECHNICAL_FIX',
      'TECHNICAL': 'TECHNICAL_FIX',
      'ON_PAGE': 'METADATA_FIX',
      'CONTENT': 'CONTENT_OPTIMIZATION',
      'INTERNAL_LINKS': 'INTERNAL_LINKING',
      'EXTERNAL_LINKS': 'TECHNICAL_FIX',
      'IMAGES_MEDIA': 'IMAGE_OPTIMIZATION',
      'STRUCTURED_DATA': 'SCHEMA_FIX',
      'SITEMAP': 'SITEMAP_FIX',
      'ROBOTS_TXT': 'ROBOTS_FIX',
      'MOBILE': 'TECHNICAL_FIX',
      'PERFORMANCE': 'PERFORMANCE_FIX',
      'JAVASCRIPT': 'TECHNICAL_FIX',
      'INTERNATIONAL': 'TECHNICAL_FIX',
      'ECOMMERCE': 'TECHNICAL_FIX',
      'LOCAL_SEO': 'TECHNICAL_FIX',
      'SECURITY': 'SECURITY_FIX',
      'ACCESSIBILITY': 'TECHNICAL_FIX'
    };
    return map[category] || 'TECHNICAL_FIX';
  }
}

export const agentOrchestrator = new AutonomousSeoAgent();
