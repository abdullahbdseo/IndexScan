'use client';

import React, { useState, useMemo } from 'react';
import { Zap, ArrowRight, CheckCircle2, Sparkles, Globe, Shield } from 'lucide-react';
import { processBulkUrls } from '@/lib/url/normalize';
import { IndexRequestModal } from './IndexRequestModal';

export const InstantIndexerForm: React.FC = () => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Real-time parsed metrics
  const stats = useMemo(() => {
    if (!text.trim()) return null;
    return processBulkUrls(text);
  }, [text]);

  const handleSampleLoad = () => {
    setText(`https://example.com/new-post-1
https://example.com/updated-landing-page
https://example.com/services/seo-audit
https://example.com/blog/google-indexing-guide`);
    setError('');
  };

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!stats || stats.validUrls.length === 0) {
      setError('Please paste at least one valid URL to request indexing.');
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-7 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center space-x-2">
                  <span>Instant Index Request</span>
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Notify Googlebot & Bing to instantly crawl new or updated URLs
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSampleLoad}
              className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Load Sample</span>
            </button>
          </div>

          <form onSubmit={handleOpenModal} className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="index-urls-textarea" className="block text-xs font-semibold text-surface-700 dark:text-surface-300">
                  Paste URLs to Index (one per line)
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
                  </div>
                )}
              </div>

              <textarea
                id="index-urls-textarea"
                rows={4}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError('');
                }}
                placeholder={`https://yourwebsite.com/new-article\nhttps://yourwebsite.com/updated-page\nhttps://yourwebsite.com/products/item-1`}
                className="w-full p-3 text-xs sm:text-sm font-mono rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/60 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
              />
              {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={!text.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Submit for Instant Indexing</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-surface-500 dark:text-surface-400">
          <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>IndexNow (Bing/Yandex)</span>
          </span>
          <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Google Indexing API</span>
          </span>
          <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>GSC 1-Click Inspection</span>
          </span>
        </div>
      </div>

      <IndexRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        urlsToSubmit={stats ? stats.validUrls : []}
      />
    </>
  );
};
