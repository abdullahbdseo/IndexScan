'use client';

import React, { useState } from 'react';
import { WebsiteCheckerForm } from './WebsiteCheckerForm';
import { BulkCheckerForm } from './BulkCheckerForm';
import { InstantIndexerForm } from './InstantIndexerForm';
import { DisclaimerBanner } from './DisclaimerBanner';
import { ShieldCheck, Zap, Globe, Layers, Sparkles } from 'lucide-react';

interface HeroProps {
  onStartWebsiteCheck: (url: string) => void;
  onStartBulkCheck: (urls: string[]) => void;
  isLoading: boolean;
  initialTab?: 'website' | 'bulk' | 'indexer';
}

export const Hero: React.FC<HeroProps> = ({
  onStartWebsiteCheck,
  onStartBulkCheck,
  isLoading,
  initialTab = 'website',
}) => {
  const [activeTab, setActiveTab] = useState<'website' | 'bulk' | 'indexer'>(initialTab);

  return (
    <section className="relative pt-6 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Text & Badges */}
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800 rounded-full mb-4 shadow-subtle">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            <span>Instant Indexing & Checking</span>
            <span>•</span>
            <span>No Login Required</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-surface-900 dark:text-white leading-[1.15]">
            Check Visibility & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 dark:from-blue-400 dark:via-indigo-400 dark:to-amber-400">Request Instant Indexing</span>
          </h1>

          <p className="mt-3 text-base sm:text-lg text-surface-600 dark:text-surface-300 leading-relaxed max-w-2xl">
            Audit your website sitemap, check Google search observability, and instantly notify Googlebot & Bing to crawl your unindexed URLs for free.
          </p>

          <div className="mt-4">
            <DisclaimerBanner compact />
          </div>
        </div>

        {/* Feature Tool Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-surface-100 dark:bg-surface-800/90 border border-surface-200 dark:border-surface-700 rounded-2xl max-w-2xl mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('website')}
            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'website'
                ? 'bg-white dark:bg-surface-900 text-blue-600 dark:text-blue-400 shadow-md shadow-black/5'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Website / Sitemap</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'bulk'
                ? 'bg-white dark:bg-surface-900 text-purple-600 dark:text-purple-400 shadow-md shadow-black/5'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Bulk URL Checker</span>
          </button>

          <button
            onClick={() => setActiveTab('indexer')}
            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'indexer'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/20'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>⚡ Instant Indexer</span>
          </button>
        </div>

        {/* Selected Tool Form Container */}
        <div className="max-w-3xl">
          {activeTab === 'website' && (
            <div id="website-checker" className="animate-in fade-in duration-200">
              <WebsiteCheckerForm onStartCheck={onStartWebsiteCheck} isLoading={isLoading} />
            </div>
          )}

          {activeTab === 'bulk' && (
            <div id="bulk-checker" className="animate-in fade-in duration-200">
              <BulkCheckerForm onStartBulkCheck={onStartBulkCheck} isLoading={isLoading} />
            </div>
          )}

          {activeTab === 'indexer' && (
            <div id="instant-indexer" className="animate-in fade-in duration-200">
              <InstantIndexerForm />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
