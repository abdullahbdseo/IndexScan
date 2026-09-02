'use client';

import React, { useState } from 'react';
import { Globe, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface WebsiteCheckerFormProps {
  onStartCheck: (websiteUrl: string) => void;
  isLoading: boolean;
}

export const WebsiteCheckerForm: React.FC<WebsiteCheckerFormProps> = ({ onStartCheck, isLoading }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = url.trim();
    if (!clean) {
      setError('Please enter a website URL (e.g. example.com)');
      return;
    }

    onStartCheck(clean);
  };

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-7 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              Website Index Checker
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Check all URLs from your website sitemap
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div>
            <label htmlFor="website-url-input" className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
              Website Domain or URL
            </label>
            <div className="relative">
              <input
                id="website-url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                disabled={isLoading}
                placeholder="https://example.com"
                className="w-full pl-3.5 pr-4 py-3 text-sm rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/60 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning Website...</span>
              </>
            ) : (
              <>
                <span>Check Website</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-surface-500 dark:text-surface-400">
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Find sitemap</span>
        </span>
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Check visibility</span>
        </span>
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Get report</span>
        </span>
      </div>
    </div>
  );
};
