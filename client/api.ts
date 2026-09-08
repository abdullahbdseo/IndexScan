import { Project, ConnectionConfig, SeoHealthScore, SeoIssue, IssueInstance, FixPlan, AppliedFix, AutonomousLoopState, CrawledPageData, AuditLog } from '../server/types/index.js';

export const api = {
  async getProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects');
    const json = await res.json();
    return json.data || [];
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`/api/projects/${id}`);
    const json = await res.json();
    return json.data;
  },

  async createProject(data: Partial<Project> & { connection?: Partial<ConnectionConfig> }): Promise<Project> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.data;
  },

  async deleteProject(id: string): Promise<void> {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  },

  async getConnection(projectId: string): Promise<ConnectionConfig | null> {
    const res = await fetch(`/api/projects/${projectId}/connection`);
    const json = await res.json();
    return json.data;
  },

  async saveConnection(projectId: string, data: Partial<ConnectionConfig>): Promise<ConnectionConfig> {
    const res = await fetch(`/api/projects/${projectId}/connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    return json.data;
  },

  async testConnection(projectId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/projects/${projectId}/connection/test`, { method: 'POST' });
    return await res.json();
  },

  async getIssues(projectId: string): Promise<(SeoIssue & { instances: IssueInstance[]; fixPlan?: FixPlan })[]> {
    const res = await fetch(`/api/projects/${projectId}/issues`);
    const json = await res.json();
    return json.data || [];
  },

  async getScore(projectId: string): Promise<SeoHealthScore> {
    const res = await fetch(`/api/projects/${projectId}/score`);
    const json = await res.json();
    return json.data;
  },

  async getPages(projectId: string): Promise<CrawledPageData[]> {
    const res = await fetch(`/api/projects/${projectId}/pages`);
    const json = await res.json();
    return json.data || [];
  },

  async startCrawl(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/crawl`, { method: 'POST' });
    return await res.json();
  },

  async startAutonomous(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/autonomous/start`, { method: 'POST' });
    return await res.json();
  },

  async getAutonomousState(projectId: string): Promise<AutonomousLoopState | null> {
    const res = await fetch(`/api/projects/${projectId}/autonomous/state`);
    const json = await res.json();
    return json.data;
  },

  async getDiagnostic(issueId: string): Promise<any> {
    const res = await fetch(`/api/issues/${issueId}/diagnostic`);
    const json = await res.json();
    return json.data;
  },

  async getFixPlan(issueId: string): Promise<FixPlan> {
    const res = await fetch(`/api/issues/${issueId}/plan`);
    const json = await res.json();
    return json.data;
  },

  async applyFix(issueId: string): Promise<any> {
    const res = await fetch(`/api/issues/${issueId}/fix`, { method: 'POST' });
    return await res.json();
  },

  async fixAllSafe(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/fix-all-safe`, { method: 'POST' });
    return await res.json();
  },

  async rollbackFix(fixId: string): Promise<any> {
    const res = await fetch(`/api/fixes/${fixId}/rollback`, { method: 'POST' });
    return await res.json();
  },

  async rollbackSession(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/rollback-session`, { method: 'POST' });
    return await res.json();
  },

  async inspectUrl(projectId: string, url: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/inspect-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return await res.json();
  },

  async getLatestReport(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/reports/latest`);
    const json = await res.json();
    return json.data;
  },

  async getLogs(projectId: string): Promise<AuditLog[]> {
    const res = await fetch(`/api/projects/${projectId}/logs`);
    const json = await res.json();
    return json.data || [];
  },

  async resetSandbox(): Promise<any> {
    const res = await fetch('/api/sandbox/reset', { method: 'POST' });
    return await res.json();
  },

  // Aliases for seamless component compatibility
  getHealthScore(projectId: string) { return this.getScore(projectId); },
  getCrawledPages(projectId: string) { return this.getPages(projectId); },
  getAutonomousLoopState(projectId: string) { return this.getAutonomousState(projectId); },
  startAutonomousLoop(projectId: string) { return this.startAutonomous(projectId); },
  fixAllSafeIssues(projectId: string) { return this.fixAllSafe(projectId); },

  // ==========================================
  // TASK QUEUE API
  // ==========================================
  async getTasks(projectId: string): Promise<{ tasks: any[]; stats: any }> {
    const res = await fetch(`/api/projects/${projectId}/tasks`);
    return await res.json();
  },

  async getTaskStats(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/tasks/stats`);
    return await res.json();
  },

  async transitionTask(projectId: string, taskId: string, state: string, error?: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, error })
    });
    return await res.json();
  },

  // ==========================================
  // AGENT MEMORY API
  // ==========================================
  async getMemory(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/memory`);
    return await res.json();
  },

  async getAuditHistory(projectId: string): Promise<any[]> {
    const res = await fetch(`/api/projects/${projectId}/memory/history`);
    return await res.json();
  },

  async getAgentStatus(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/agent-status`);
    return await res.json();
  },

  // ==========================================
  // ISSUE MANAGEMENT
  // ==========================================
  async rejectIssue(projectId: string, issueId: string, reason?: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/issues/${issueId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'User rejected' })
    });
    return await res.json();
  },

  // ==========================================
  // PHASE 2: SEO INTELLIGENCE API
  // ==========================================
  async getKeywords(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/keywords`);
    return await res.json();
  },

  async getContentAnalysis(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/content-analysis`);
    return await res.json();
  },

  async getContentGaps(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/content-gaps`);
    return await res.json();
  },

  async getPerformanceAudit(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/performance-audit`);
    return await res.json();
  },

  async getSchemaProposals(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/schema-proposals`);
    return await res.json();
  },

  async getLinkOpportunities(projectId: string): Promise<any> {
    const res = await fetch(`/api/projects/${projectId}/link-opportunities`);
    return await res.json();
  }
};
