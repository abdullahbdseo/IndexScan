'use client';

import React, { useState, useMemo } from 'react';
import { Layers, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { processBulkUrls } from '@/lib/url/normalize';

interface BulkCheckerFormProps {
  onStartBulkCheck: (urls: string[]) => void;
  isLoading: boolean;
}

export const BulkCheckerForm: React.FC<BulkCheckerFormProps> = ({ onStartBulkCheck, isLoading }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  // Real-time parsed metrics
  const stats = useMemo(() => {
    if (!text.trim()) return null;
    return processBulkUrls(text);
  }, [text]);

  const handleSampleLoad = () => {
    setText(`https://example.com/
https://example.com/about
https://example.com/features
https://example.com/pricing
https://example.com/blog/seo-guide
https://example.com/docs/api-free
https://example.com/contact
https://example.com/about  # duplicate example
https://example.com/faq`);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!stats || stats.validUrls.length === 0) {
      setError('Please paste at least one valid URL to check.');
      return;
    }

    onStartBulkCheck(stats.validUrls);
  };

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-7 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                Bulk URL Checker
              </h2>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Paste multiple URLs to check their Google visibility
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSampleLoad}
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>Load Sample</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="bulk-urls-textarea" className="block text-xs font-semibold text-surface-700 dark:text-surface-300">
                Paste URLs (one per line)
              </label>
              {stats && (
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.validUrls.length} valid
                  </span>
                  {stats.duplicatesRemoved > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      • {stats.duplicatesRemoved} dups removed
                    </span>
                  )}
                  {stats.invalidUrls.length > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      • {stats.invalidUrls.length} invalid
                    </span>
                  )}
                </div>
              )}
            </div>

            <textarea
              id="bulk-urls-textarea"
              rows={4}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError('');
              }}
              disabled={isLoading}
              placeholder={`https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3`}
              className="w-full p-3 text-xs sm:text-sm font-mono rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/60 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 resize-none"
            />
            {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking URLs...</span>
              </>
            ) : (
              <>
                <span>Check URLs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-surface-500 dark:text-surface-400">
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Bulk check</span>
        </span>
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Fast results</span>
        </span>
        <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Export data</span>
        </span>
      </div>
    </div>
  );
};
