'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import type { AuditResult, SeoCheck } from '@/lib/audit/seoAuditEngine';
import {
  Search, Download, AlertCircle, CheckCircle, AlertTriangle,
  Globe, Shield, Share2, Code2, Image, Zap, Link2,
  BarChart3, ChevronDown, ChevronUp, Loader2, FileSpreadsheet,
  ExternalLink, Sparkles, RefreshCw, Layers, Check
} from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  ON_PAGE: { label: 'On-Page SEO', icon: Code2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/60' },
  TECHNICAL: { label: 'Technical SEO', icon: Shield, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/60' },
  PERFORMANCE: { label: 'Performance', icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60' },
  SOCIAL: { label: 'Social & OG', icon: Share2, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60' },
  IMAGES: { label: 'Image SEO', icon: Image, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
  SCHEMA: { label: 'Schema Data', icon: Layers, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/60' },
};

function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export default function AuditPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'FAIL' | 'WARN' | 'PASS'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'headings'>('overview');

  // Scanner steps
  const [scanStep, setScanStep] = useState(0);
  const steps = [
    'Connecting to website & resolving headers...',
    'Downloading & parsing DOM structure...',
    'Analyzing Title, Description & Canonical tags...',
    'Evaluating H1/H2/H3 semantic hierarchy...',
    'Inspecting Image Alt tags & Asset compression...',
    'Checking SSL/TLS & Security response headers...',
    'Auditing OpenGraph & Social card integrations...',
    'Synthesizing final SEO score & 7-Sheet Excel workbook...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setScanStep(0);
      interval = setInterval(() => {
        setScanStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 700);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAudit = async (targetUrl?: string) => {
    const runUrl = (targetUrl || url).trim();
    if (!runUrl) {
      setError('Please enter a website URL');
      return;
    }
    const finalUrl = runUrl.startsWith('http') ? runUrl : `https://${runUrl}`;
    setUrl(finalUrl);
    setLoading(true);
    setError(null);
    setResult(null);
    setDownloadSuccess(false);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete audit');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Audit failed. Please verify the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      let blob: Blob | null = null;
      let filename = 'IndexScan_SEO_Audit_Report.xlsx';

      // 1. Try GET by id first
      try {
        const getRes = await fetch(`/api/audit/download?id=${result.id}`);
        if (getRes.ok) {
          const disposition = getRes.headers.get('content-disposition');
          if (disposition && disposition.includes('filename=')) {
            filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
          }
          blob = await getRes.blob();
        }
      } catch {
        // fallback to POST
      }

      // 2. Fallback to POST with auditData if cache expired or on different serverless instance
      if (!blob) {
        const postRes = await fetch('/api/audit/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditData: result }),
        });
        if (!postRes.ok) throw new Error('Download failed');
        const disposition = postRes.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
          filename = disposition.split('filename=')[1].replace(/"/g, '').trim();
        }
        blob = await postRes.blob();
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      alert('Could not download Excel report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const checks = result?.checks ?? [];
  const passedCount = checks.filter((c) => c.status === 'PASS').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;

  const criticalIssues = checks.filter(
    (c) => c.status === 'FAIL' && (c.severity === 'CRITICAL' || c.severity === 'HIGH')
  );
  const mediumIssues = checks.filter(
    (c) => c.status === 'WARN' || (c.status === 'FAIL' && c.severity === 'MEDIUM')
  );

  const filteredChecks = checks.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.current.toLowerCase().includes(q) ||
        c.recommended.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const overallScore = result?.scores?.overall ?? 0;
  const grade = getGrade(overallScore);

  const gradeColors: Record<string, string> = {
    'A+': 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    'A': 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    'B': 'text-blue-600 dark:text-blue-400 border-blue-500 bg-blue-50 dark:bg-blue-950/50',
    'C': 'text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/50',
    'D': 'text-orange-600 dark:text-orange-400 border-orange-500 bg-orange-50 dark:bg-orange-950/50',
    'F': 'text-rose-600 dark:text-rose-400 border-rose-500 bg-rose-50 dark:bg-rose-950/50',
  };

  const categoryScoresMap: Record<string, number> = result?.scores
    ? {
        ON_PAGE: result.scores.onPage,
        TECHNICAL: result.scores.technical,
        PERFORMANCE: result.scores.performance,
        SOCIAL: result.scores.social,
        IMAGES: result.scores.images,
        SCHEMA: result.scores.schema,
      }
    : {};

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50">
      <Header activeTab="audit" />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-4 shadow-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Deep SEO Audit &amp; Professional 7-Sheet Excel Generator</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-surface-900 dark:text-white">
            Audit Any Website &amp; Download{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 dark:from-emerald-400 dark:via-teal-400 dark:to-blue-400">
              Excel Report
            </span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-surface-600 dark:text-surface-300 leading-relaxed">
            Perform an exhaustive 26+ point technical and on-page SEO inspection. Instant grade, issue diagnosis, and client-ready Excel workbook export.
          </p>
        </div>

        {/* Input Card */}
        <div className="max-w-3xl mx-auto bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 sm:p-8 shadow-card mb-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAudit();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="audit-url-input" className="block text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-2">
                Enter Website URL to Audit
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-surface-400">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  id="audit-url-input"
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3.5 text-base rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/60 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Quick Demo Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-surface-500 dark:text-surface-400">
              <span className="font-semibold text-surface-600 dark:text-surface-300">Quick Samples:</span>
              <button
                type="button"
                onClick={() => {
                  setUrl('https://www.primemovebd.com/');
                  handleAudit('https://www.primemovebd.com/');
                }}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-medium transition-colors"
              >
                primemovebd.com
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl('https://wordpress.org/');
                  handleAudit('https://wordpress.org/');
                }}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 font-medium transition-colors"
              >
                wordpress.org
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Running Deep SEO Audit...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Start Deep SEO Audit</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">Audit Error</p>
                <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading Progress State */}
        {loading && (
          <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-card text-center animate-in fade-in duration-300">
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-950 animate-ping opacity-40"></div>
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <h3 className="text-xl font-black text-surface-900 dark:text-white mb-2">
              Analyzing Webpage Architecture
            </h3>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-6 h-6 transition-all">
              {steps[scanStep]}
            </p>

            <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(((scanStep + 1) / steps.length) * 100)}%` }}
              ></div>
            </div>
            <p className="mt-3 text-xs text-surface-400">
              Testing on-page SEO, Meta tags, Headings, Performance, SSL &amp; Excel Builder
            </p>
          </div>
        )}

        {/* Audit Results Dashboard */}
        {result && !loading && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Summary & Excel Download Action Card */}
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 sm:p-8 shadow-card flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-5">
                {/* Overall Score Circle */}
                <div className={`w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center shadow-lg ${gradeColors[grade] || gradeColors['C']}`}>
                  <span className="text-3xl font-black leading-none">{overallScore}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider mt-1">Grade {grade}</span>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 uppercase">
                      {result.isHttps ? 'HTTPS Secure' : 'HTTP Insecure'}
                    </span>
                    <span className="text-xs text-surface-400">
                      Domain: {result.domain}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-surface-900 dark:text-white mt-1 break-all line-clamp-1">
                    {result.url}
                  </h2>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    Title: {result.meta?.title || '(Missing Title)'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center space-x-2.5 ${
                    downloadSuccess
                      ? 'bg-emerald-700 shadow-emerald-700/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 hover:shadow-emerald-500/35'
                  }`}
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Excel...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Excel Report Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Download Excel Report (.xlsx)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleAudit()}
                  className="w-full sm:w-auto px-4 py-3.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-750 text-surface-700 dark:text-surface-200 font-semibold text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Re-scan</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">Passed Checks</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-2">
                  <CheckCircle className="w-6 h-6" />
                  <span>{passedCount}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">Critical / High Issues</div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 flex items-center space-x-2">
                  <AlertCircle className="w-6 h-6" />
                  <span>{criticalIssues.length}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">Warnings</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>{warnCount}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm">
                <div className="text-xs font-bold text-surface-500 uppercase tracking-wider">Total Checks</div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1 flex items-center space-x-2">
                  <BarChart3 className="w-6 h-6" />
                  <span>{checks.length}</span>
                </div>
              </div>
            </div>

            {/* Category Score Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(categoryScoresMap).map(([cat, score]) => {
                const meta = CATEGORY_META[cat] || { label: cat, icon: Code2, color: 'text-blue-600', bg: 'bg-blue-50' };
                const Icon = meta.icon;
                return (
                  <div key={cat} className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm text-center">
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center ${meta.bg} ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-surface-700 dark:text-surface-300 truncate">
                      {meta.label}
                    </div>
                    <div className="text-xl font-black text-surface-900 dark:text-white mt-1">
                      {score}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tab Navigation for Detailed Results */}
            <div className="border-b border-surface-200 dark:border-surface-800 flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'overview'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                Action Items ({criticalIssues.length + mediumIssues.length})
              </button>
              <button
                onClick={() => setActiveTab('checks')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'checks'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                All 26+ Audit Checks ({checks.length})
              </button>
              <button
                onClick={() => setActiveTab('headings')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'headings'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                Headings Structure (H1: {result.meta?.h1?.length ?? 0}, H2: {result.meta?.h2?.length ?? 0})
              </button>
            </div>

            {/* Tab 1: Action Items */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {criticalIssues.length > 0 && (
                  <div>
                    <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center space-x-2 mb-3">
                      <AlertCircle className="w-5 h-5" />
                      <span>Critical Action Items (High Priority)</span>
                    </h3>
                    <div className="space-y-3">
                      {criticalIssues.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                              {item.category} • {item.severity}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-surface-900 dark:text-white mt-1">{item.name}</p>
                          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                            <strong>Action:</strong> {item.recommended}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mediumIssues.length > 0 && (
                  <div>
                    <h3 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center space-x-2 mb-3">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Medium Priority Fixes</span>
                    </h3>
                    <div className="space-y-3">
                      {mediumIssues.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                            {item.category}
                          </span>
                          <p className="text-sm font-bold text-surface-900 dark:text-white mt-1">{item.name}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                            <strong>Action:</strong> {item.recommended}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {criticalIssues.length === 0 && mediumIssues.length === 0 && (
                  <div className="p-8 text-center bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <h4 className="text-lg font-black text-surface-900 dark:text-white">Great Work! No Critical Issues</h4>
                    <p className="text-xs text-surface-500 mt-1">This website passed all high-priority SEO and technical evaluations.</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: All 26+ Audit Checks */}
            {activeTab === 'checks' && (
              <div className="space-y-4">
                {/* Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['ALL', 'FAIL', 'WARN', 'PASS'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          filterStatus === st
                            ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900'
                            : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200'
                        }`}
                      >
                        {st === 'ALL' ? 'All Checks' : st === 'FAIL' ? 'Failed' : st === 'WARN' ? 'Warnings' : 'Passed'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-50 dark:bg-surface-800 border border-surface-300 dark:border-surface-700 text-surface-800 dark:text-surface-200"
                    >
                      <option value="ALL">All Categories</option>
                      {Object.entries(CATEGORY_META).map(([cat, m]) => (
                        <option key={cat} value={cat}>{m.label}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search checks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-800 dark:text-surface-200"
                    />
                  </div>
                </div>

                {/* Check List */}
                <div className="space-y-2">
                  {filteredChecks.map((chk) => {
                    const isExpanded = expandedCheck === chk.id;
                    return (
                      <div
                        key={chk.id}
                        className={`bg-white dark:bg-surface-900 rounded-xl border transition-all ${
                          chk.status === 'FAIL'
                            ? 'border-rose-200 dark:border-rose-900/60'
                            : chk.status === 'WARN'
                            ? 'border-amber-200 dark:border-amber-900/60'
                            : 'border-surface-200 dark:border-surface-800'
                        }`}
                      >
                        <div
                          onClick={() => setExpandedCheck(isExpanded ? null : chk.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-50/50 dark:hover:bg-surface-800/40"
                        >
                          <div className="flex items-center space-x-3">
                            {chk.status === 'PASS' ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : chk.status === 'WARN' ? (
                              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                  {chk.category}
                                </span>
                                <h4 className="text-sm font-bold text-surface-900 dark:text-white">{chk.name}</h4>
                              </div>
                              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-1">
                                {chk.current}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                chk.status === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : chk.status === 'WARN'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {chk.status === 'PASS' ? 'Passed' : chk.status === 'WARN' ? 'Warning' : 'Failed'}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-surface-100 dark:border-surface-800/60 bg-surface-50/50 dark:bg-surface-850/40 text-xs space-y-2">
                            {chk.current && (
                              <div>
                                <strong className="text-surface-700 dark:text-surface-300">Observed Status:</strong>
                                <pre className="mt-1 p-2 rounded bg-surface-100 dark:bg-surface-800 text-[11px] font-mono whitespace-pre-wrap text-surface-800 dark:text-surface-200">
                                  {chk.current}
                                </pre>
                              </div>
                            )}
                            <div>
                              <strong className="text-emerald-700 dark:text-emerald-400">Recommended Action:</strong>
                              <p className="mt-0.5 text-surface-600 dark:text-surface-300 leading-relaxed">
                                {chk.recommended}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4 pt-1 text-[11px] text-surface-400">
                              <span>Impact: <strong className="text-surface-700 dark:text-surface-300">{chk.impact}</strong></span>
                              <span>Effort: <strong className="text-surface-700 dark:text-surface-300">{chk.effort}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Headings Structure */}
            {activeTab === 'headings' && (
              <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-card space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">
                    H1 Tags ({result.meta?.h1?.length ?? 0})
                  </h3>
                  {(!result.meta?.h1 || result.meta.h1.length === 0) ? (
                    <p className="text-xs text-rose-500 font-semibold">Missing H1 heading on this page!</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {result.meta.h1.map((h, i) => (
                        <li key={i} className="text-xs p-2.5 rounded-lg bg-surface-100 dark:bg-surface-800 font-mono font-medium">
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">
                    H2 Tags ({result.meta?.h2?.length ?? 0})
                  </h3>
                  {(!result.meta?.h2 || result.meta.h2.length === 0) ? (
                    <p className="text-xs text-surface-400">No H2 subheadings detected.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-2">
                      {result.meta.h2.map((h, i) => (
                        <li key={i} className="text-xs p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800 font-mono">
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
