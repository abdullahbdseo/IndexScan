'use client';

import React from 'react';
import { CheckSummary, UrlCheckResult } from '@/lib/types';
import { ShieldCheck, Link2, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';

interface VisibilityDonutChartProps {
  summary: CheckSummary;
  results: UrlCheckResult[];
}

export const VisibilityDonutChart: React.FC<VisibilityDonutChartProps> = ({ summary, results }) => {
  const { totalUrls, foundCount, notFoundCount, unknownCount, observableRate } = summary;

  // Technical calculations
  const withCanonicalSelf = results.filter((r) => r.canonicalStatus === 'SELF').length;
  const withHttp200 = results.filter((r) => r.httpStatus === 200).length;
  const withNoindex = results.filter(
    (r) => r.metaRobots?.toLowerCase().includes('noindex') || r.xRobotsTag?.toLowerCase().includes('noindex')
  ).length;

  const total = totalUrls || 1;
  const foundAngle = (foundCount / total) * 360;
  const notFoundAngle = (notFoundCount / total) * 360;
  const unknownAngle = (unknownCount / total) * 360;

  // SVG Donut Path calculations
  const size = 180;
  const center = size / 2;
  const radius = 68;
  const strokeWidth = 24;

  const foundPct = totalUrls > 0 ? ((foundCount / totalUrls) * 100).toFixed(1) : '0';
  const notFoundPct = totalUrls > 0 ? ((notFoundCount / totalUrls) * 100).toFixed(1) : '0';
  const unknownPct = totalUrls > 0 ? ((unknownCount / totalUrls) * 100).toFixed(1) : '0';

  // SVG stroke-dasharray segments
  const circumference = 2 * Math.PI * radius;
  const foundDash = (foundCount / total) * circumference;
  const notFoundDash = (notFoundCount / total) * circumference;
  const unknownDash = (unknownCount / total) * circumference;

  const notFoundOffset = -foundDash;
  const unknownOffset = -(foundDash + notFoundDash);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* 1. Google Visibility Donut Chart */}
      <div className="lg:col-span-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white">
            Google Visibility Overview
          </h2>
          <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
            Public Search Coverage
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
          {/* Chart SVG */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-surface-100 dark:text-surface-800"
              />
              {/* Found segment */}
              {foundCount > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${foundDash} ${circumference}`}
                  strokeDashoffset={0}
                  className="transition-all duration-1000 ease-out"
                />
              )}
              {/* Not Found segment */}
              {notFoundCount > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${notFoundDash} ${circumference}`}
                  strokeDashoffset={notFoundOffset}
                  className="transition-all duration-1000 ease-out"
                />
              )}
              {/* Unknown segment */}
              {unknownCount > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${unknownDash} ${circumference}`}
                  strokeDashoffset={unknownOffset}
                  className="transition-all duration-1000 ease-out"
                />
              )}
            </svg>

            {/* Inner text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-surface-900 dark:text-white">
                {observableRate}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Observable
              </span>
            </div>
          </div>

          {/* Legend Details */}
          <div className="space-y-3 w-full max-w-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-xs font-semibold text-surface-800 dark:text-surface-200">Found (Observable)</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-surface-900 dark:text-white">{foundCount}</span>
                <span className="text-[11px] text-surface-500 ml-1.5">({foundPct}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-xs font-semibold text-surface-800 dark:text-surface-200">Not Observable</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-surface-900 dark:text-white">{notFoundCount}</span>
                <span className="text-[11px] text-surface-500 ml-1.5">({notFoundPct}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60">
              <div className="flex items-center space-x-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-xs font-semibold text-surface-800 dark:text-surface-200">Unknown / Limited</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-surface-900 dark:text-white">{unknownCount}</span>
                <span className="text-[11px] text-surface-500 ml-1.5">({unknownPct}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Technical SEO Health Snapshot */}
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-surface-900 dark:text-white">
              Technical SEO Health
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              On-Page
            </span>
          </div>

          <div className="space-y-3.5">
            {/* HTTP 200 OK */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-surface-700 dark:text-surface-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>HTTP 200 Status</span>
                </span>
                <span className="text-surface-900 dark:text-white font-bold">
                  {withHttp200} / {totalUrls}
                </span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(withHttp200 / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Self Canonical */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-surface-700 dark:text-surface-300 flex items-center space-x-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Self-referencing Canonical</span>
                </span>
                <span className="text-surface-900 dark:text-white font-bold">
                  {withCanonicalSelf} / {totalUrls}
                </span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${(withCanonicalSelf / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Noindex Detected */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-surface-700 dark:text-surface-300 flex items-center space-x-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${withNoindex > 0 ? 'text-rose-500' : 'text-surface-400'}`} />
                  <span>Noindex Directives Detected</span>
                </span>
                <span className={`font-bold ${withNoindex > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-surface-900 dark:text-white'}`}>
                  {withNoindex} URLs
                </span>
              </div>
              <div className="w-full bg-surface-100 dark:bg-surface-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${withNoindex > 0 ? 'bg-rose-500' : 'bg-surface-300 dark:bg-surface-700'}`}
                  style={{ width: `${Math.min(100, (withNoindex / total) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 text-[11px] text-surface-500 dark:text-surface-400 leading-tight">
          💡 Technical checks confirm page accessibility, while Google status checks observable public indexing.
        </div>
      </div>
    </div>
  );
};
