'use client';

import React, { useState } from 'react';
import { Globe, CheckCircle2, RotateCcw, Sparkles, AlertCircle, AlertTriangle, FileText, Zap } from 'lucide-react';
import { CheckSummary, UrlCheckResult } from '@/lib/types';
import { OverviewStatsCards } from './OverviewStatsCards';
import { VisibilityDonutChart } from './VisibilityDonutChart';
import { StatusTable } from './StatusTable';
import { ExportActions } from './ExportActions';
import { UrlDetailModal } from './UrlDetailModal';
import { DisclaimerBanner } from './DisclaimerBanner';
import { IndexRequestModal } from './IndexRequestModal';

interface ResultsDashboardProps {
  summary: CheckSummary;
  results: UrlCheckResult[];
  onReset: () => void;
  onExitDemo?: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  summary,
  results,
  onReset,
  onExitDemo,
}) => {
  const [selectedUrl, setSelectedUrl] = useState<UrlCheckResult | null>(null);
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);

  // Check if any results flagged rate limiting
  const isRateLimited = results.some((r) => r.errorMessage?.includes('Google is limiting automated searches'));

  const cleanDomain = summary.websiteUrl.replace(/https?:\/\//, '').replace(/\/$/, '');

  // URLs eligible for index request (Not Observable or all)
  const notFoundUrls = results.filter((r) => r.googleStatus === 'NOT FOUND').map((r) => r.url);
  const targetIndexUrls = notFoundUrls.length > 0 ? notFoundUrls : results.map((r) => r.url);

  return (
    <div className="space-y-6">
      {/* Demo Banner if active */}
      {summary.isDemo && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-subtle animate-in fade-in">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500 text-white uppercase tracking-wider">
              DEMO DATA
            </span>
            <p className="text-xs sm:text-sm font-medium">
              Viewing simulated dataset for <span className="font-bold">example.com</span>. No actual web requests are active.
            </p>
          </div>
          <button
            onClick={onExitDemo || onReset}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-surface-800 text-amber-800 dark:text-amber-300 font-semibold text-xs border border-amber-300 dark:border-amber-700 shadow-sm hover:bg-amber-50 dark:hover:bg-surface-700 transition-colors"
          >
            Exit Demo & Run Real Check
          </button>
        </div>
      )}

      {/* Rate Limit Alert Banner if triggered */}
      {isRateLimited && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex items-start space-x-3 shadow-subtle">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-rose-950 dark:text-rose-100">
              Google Check Temporarily Unavailable
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
              Google is limiting automated searches from this network. In accordance with zero-proxy and zero-CAPTCHA bypass policies, requests are gracefully paused. Please wait and try again later.
            </p>
          </div>
        </div>
      )}

      {/* Dashboard Top Header Bar */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white">
                {cleanDomain || 'Custom URL Batch'}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                Completed
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500 dark:text-surface-400 mt-1">
              <span>Sitemap URLs: <strong className="text-surface-700 dark:text-surface-200">{summary.totalUrls}</strong></span>
              <span>•</span>
              <span>Checked on: {summary.completedAt || summary.startedAt || 'Just now'}</span>
              {summary.sitemapsFound.length > 0 && (
                <>
                  <span>•</span>
                  <span>{summary.sitemapsFound.length} Sitemap files found</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Instant Index Request Action */}
          <button
            onClick={() => setIsIndexModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm shadow-amber-500/20 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Instant Index Request ({targetIndexUrls.length})</span>
          </button>

          <ExportActions results={results} websiteDomain={cleanDomain} />

          <button
            onClick={onReset}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Check</span>
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <DisclaimerBanner compact />

      {/* 5 Stats Cards */}
      <OverviewStatsCards summary={summary} />

      {/* Donut Chart & Technical Overview */}
      <VisibilityDonutChart summary={summary} results={results} />

      {/* Rich Status Table */}
      <StatusTable results={results} onSelectUrl={(item) => setSelectedUrl(item)} websiteDomain={cleanDomain} />

      {/* Technical Detail Modal */}
      <UrlDetailModal item={selectedUrl} onClose={() => setSelectedUrl(null)} domainContext={cleanDomain} />

      {/* Index Request Modal */}
      <IndexRequestModal
        isOpen={isIndexModalOpen}
        onClose={() => setIsIndexModalOpen(false)}
        urlsToSubmit={targetIndexUrls}
        domainContext={cleanDomain}
      />
    </div>
  );
};
