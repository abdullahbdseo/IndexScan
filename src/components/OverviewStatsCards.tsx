'use client';

import React from 'react';
import { FileText, CheckCircle2, XCircle, HelpCircle, TrendingUp, Percent } from 'lucide-react';
import { CheckSummary } from '@/lib/types';

interface OverviewStatsCardsProps {
  summary: CheckSummary;
}

export const OverviewStatsCards: React.FC<OverviewStatsCardsProps> = ({ summary }) => {
  const { totalUrls, foundCount, notFoundCount, unknownCount, observableRate } = summary;

  const foundPercent = totalUrls > 0 ? ((foundCount / totalUrls) * 100).toFixed(1) : '0';
  const notFoundPercent = totalUrls > 0 ? ((notFoundCount / totalUrls) * 100).toFixed(1) : '0';
  const unknownPercent = totalUrls > 0 ? ((unknownCount / totalUrls) * 100).toFixed(1) : '0';

  // Circular progress calculations for the gauge
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, observableRate)) / 100) * circumference;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Sitemap URLs */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Sitemap URLs</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white">
            {totalUrls.toLocaleString()}
          </div>
          <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
            100%
          </span>
        </div>
      </div>

      {/* 2. Google Observable */}
      <div className="bg-white dark:bg-surface-900 border border-emerald-200/80 dark:border-emerald-950 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Google Observable</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {foundCount.toLocaleString()}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            {foundPercent}%
          </span>
        </div>
      </div>

      {/* 3. Not Observable */}
      <div className="bg-white dark:bg-surface-900 border border-rose-200/80 dark:border-rose-950 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Not Observable</span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {notFoundCount.toLocaleString()}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
            {notFoundPercent}%
          </span>
        </div>
      </div>

      {/* 4. Unknown */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Unknown</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {unknownCount.toLocaleString()}
          </div>
          <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
            {unknownPercent}%
          </span>
        </div>
      </div>

      {/* 5. Observable Rate */}
      <div className="bg-white dark:bg-surface-900 border border-blue-200/80 dark:border-blue-950 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all relative overflow-hidden">
        <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Observable Rate</span>
          <div className="relative w-8 h-8 flex items-center justify-center">
            <svg className="w-8 h-8 transform -rotate-90">
              <circle
                cx="16"
                cy="16"
                r={12}
                stroke="currentColor"
                strokeWidth="3"
                className="text-surface-200 dark:text-surface-800"
                fill="transparent"
              />
              <circle
                cx="16"
                cy="16"
                r={12}
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 12}
                strokeDashoffset={2 * Math.PI * 12 - (observableRate / 100) * (2 * Math.PI * 12)}
                className="text-blue-600 dark:text-blue-400 transition-all duration-700 ease-out"
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {observableRate}%
          </div>
          <span className="text-[11px] text-surface-500 dark:text-surface-400 font-medium">
            Google Public
          </span>
        </div>
      </div>
    </div>
  );
};
