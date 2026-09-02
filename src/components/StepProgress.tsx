'use client';

import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, AlertCircle, X } from 'lucide-react';
import { StepProgressItem } from '@/lib/types';

interface StepProgressProps {
  steps: StepProgressItem[];
  currentStep: number;
  progressPercent: number;
  totalUrls: number;
  checkedCount: number;
  foundCount: number;
  notFoundCount: number;
  unknownCount: number;
  onCancel: () => void;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  progressPercent,
  totalUrls,
  checkedCount,
  foundCount,
  notFoundCount,
  unknownCount,
  onCancel,
}) => {
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-7 shadow-card transition-all mb-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-100 dark:border-surface-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping"></span>
            <h2 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white">
              SEO Visibility Audit in Progress
            </h2>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            Safely scanning without API keys or proxy rotation
          </p>
        </div>

        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors flex items-center space-x-1.5"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel Scan</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">
          <span>Overall Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Live Google Search Counters */}
      {totalUrls > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-200/80 dark:border-surface-700/60 mb-6">
          <div>
            <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Checking Queue
            </span>
            <div className="text-base sm:text-lg font-black text-surface-900 dark:text-white mt-0.5">
              {checkedCount} <span className="text-xs font-normal text-surface-400">/ {totalUrls}</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Found (Observable)
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {foundCount}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Not Observable
            </span>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {notFoundCount}
            </div>
          </div>
          <div>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Unknown / Retried
            </span>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {unknownCount}
            </div>
          </div>
        </div>
      )}

      {/* 6 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step) => {
          const isCompleted = step.status === 'completed';
          const isRunning = step.status === 'running';
          const isError = step.status === 'error';

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start space-x-3 ${
                isRunning
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                  : isCompleted
                  ? 'bg-surface-50/50 dark:bg-surface-800/30 border-surface-200 dark:border-surface-800'
                  : isError
                  ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                  : 'bg-surface-50/20 dark:bg-surface-850/20 border-surface-200/50 dark:border-surface-800/50 opacity-60'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isRunning && <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />}
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                {isError && <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                {step.status === 'pending' && <Circle className="w-4 h-4 text-surface-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-surface-900 dark:text-white truncate">
                  STEP {step.id}: {step.label}
                </div>
                {step.detail && (
                  <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 truncate">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
