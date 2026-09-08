import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Project, SeoHealthScore, SeoIssue, IssueInstance, FixPlan, AutonomousLoopState, CrawledPageData, AuditLog } from '../server/types/index.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { LiveProgressBanner } from './components/LiveProgressBanner.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AuditProgressPage } from './pages/AuditProgressPage.js';
import { IssueExplorerPage } from './pages/IssueExplorerPage.js';
import { AutoFixPage } from './pages/AutoFixPage.js';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage.js';
import { UrlInspectorPage } from './pages/UrlInspectorPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { LogsPage } from './pages/LogsPage.js';
import { TaskQueuePage } from './pages/TaskQueuePage.js';
import { IndexScanPage } from './pages/IndexScanPage.js';
import { api } from './api.js';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [score, setScore] = useState<SeoHealthScore | null>(null);
  const [issues, setIssues] = useState<(SeoIssue & { instances: IssueInstance[]; fixPlan?: FixPlan })[]>([]);
  const [loopState, setLoopState] = useState<AutonomousLoopState | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pages, setPages] = useState<CrawledPageData[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchProjectDetails = useCallback(async (projectId: string) => {
    try {
      const [scoreData, issuesData, loopData, logsData, pagesData] = await Promise.all([
        api.getHealthScore(projectId).catch(() => null),
        api.getIssues(projectId).catch(() => []),
        api.getAutonomousLoopState(projectId).catch(() => null),
        api.getLogs(projectId).catch(() => []),
        api.getCrawledPages(projectId).catch(() => [])
      ]);

      setScore(scoreData);
      setIssues(issuesData || []);
      setLoopState(loopData);
      setLogs(logsData || []);
      setPages(pagesData || []);
    } catch (err) {
      console.error('Failed to fetch project details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectProject = useCallback((proj: Project) => {
    setActiveProject(proj);
    localStorage.setItem('apex_active_project_id', proj.id);
    fetchProjectDetails(proj.id);
  }, [fetchProjectDetails]);

  const fetchProjects = useCallback(async () => {
    try {
      const projs = await api.getProjects();
      setProjects(projs);
      if (projs.length > 0) {
        const savedId = localStorage.getItem('apex_active_project_id');
        const match = projs.find(p => p.id === savedId) || projs[0];
        setActiveProject(match);
        fetchProjectDetails(match.id);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, [fetchProjectDetails]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Server-Sent Events (SSE) & polling for real-time progress updates
  useEffect(() => {
    if (!activeProject) return;

    const eventSource = new EventSource(`/events/${activeProject.id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.state) {
          setLoopState(data.state);
        }
        if (data.type === 'SCORE_UPDATED' && data.data) {
          setScore(data.data);
        }
        if (data.type === 'COMPLETE' || data.type === 'FIX_APPLIED' || data.type === 'VERIFIED' || data.type === 'PHASE_CHANGE') {
          fetchProjectDetails(activeProject.id);
        }
      } catch (e) {
        console.error('SSE JSON error:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [activeProject, fetchProjectDetails]);

  // Active polling while loop is running
  useEffect(() => {
    if (!activeProject || loopState?.status !== 'RUNNING') return;

    const interval = setInterval(() => {
      fetchProjectDetails(activeProject.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeProject, loopState?.status, fetchProjectDetails]);

  const handleStartAutonomous = async () => {
    if (!activeProject) return;
    try {
      await api.startAutonomousLoop(activeProject.id);
      navigate('/audit');
      if (activeProject) {
        fetchProjectDetails(activeProject.id);
      }
    } catch (err) {
      alert(`Failed to start autonomous cycle: ${(err as Error).message}`);
    }
  };

  const handleFixAllSafe = async () => {
    if (!activeProject) return;
    try {
      await api.fixAllSafeIssues(activeProject.id);
      if (activeProject) {
        fetchProjectDetails(activeProject.id);
      }
    } catch (err) {
      alert(`Failed to apply safe fixes: ${(err as Error).message}`);
    }
  };

  const handleRefresh = () => {
    if (activeProject) {
      fetchProjectDetails(activeProject.id);
    }
    fetchProjects();
  };

  const isRunningAutonomous = loopState?.status === 'RUNNING';

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header
          projects={projects}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
          isRunningAutonomous={isRunningAutonomous}
          onStartAutonomous={handleStartAutonomous}
          onRefreshData={handleRefresh}
        />
        
        <main className="content-area">
          <LiveProgressBanner state={loopState} />

          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  project={activeProject}
                  score={score}
                  issues={issues}
                  onStartAutonomous={handleStartAutonomous}
                  onFixAllSafe={handleFixAllSafe}
                />
              }
            />
            <Route
              path="/audit"
              element={
                <AuditProgressPage
                  project={activeProject}
                  loopState={loopState}
                  logs={logs}
                  onStartAutonomous={handleStartAutonomous}
                />
              }
            />
            <Route
              path="/issues"
              element={
                <IssueExplorerPage
                  issues={issues}
                  onRefresh={handleRefresh}
                />
              }
            />
            <Route
              path="/autofix"
              element={
                <AutoFixPage
                  project={activeProject}
                  issues={issues}
                  onRefresh={handleRefresh}
                />
              }
            />
            <Route
              path="/inspector"
              element={
                <UrlInspectorPage
                  project={activeProject}
                />
              }
            />
            <Route
              path="/graph"
              element={
                <KnowledgeGraphPage
                  pages={pages}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ReportsPage
                  project={activeProject}
                />
              }
            />
            <Route
              path="/projects"
              element={
                <ProjectsPage
                  projects={projects}
                  activeProject={activeProject}
                  onRefresh={handleRefresh}
                  onSelectProject={handleSelectProject}
                />
              }
            />
            <Route
              path="/logs"
              element={
                <LogsPage
                  logs={logs}
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <TaskQueuePage
                  projectId={activeProject?.id || ''}
                />
              }
            />
            <Route
              path="/indexscan"
              element={<IndexScanPage />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;