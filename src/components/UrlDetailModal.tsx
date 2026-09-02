'use client';

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Globe,
  FileCode,
  Shield,
  Link as LinkIcon,
  Calendar,
  Layers,
  Search,
  Zap,
} from 'lucide-react';
import { UrlCheckResult } from '@/lib/types';
import { IndexRequestModal } from './IndexRequestModal';

interface UrlDetailModalProps {
  item: UrlCheckResult | null;
  onClose: () => void;
  domainContext?: string;
}

export const UrlDetailModal: React.FC<UrlDetailModalProps> = ({ item, onClose, domainContext }) => {
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);

  if (!item) return null;

  const isFound = item.googleStatus === 'FOUND';
  const isNotFound = item.googleStatus === 'NOT FOUND';
  const isUnknown = item.googleStatus === 'UNKNOWN';
  const isError = item.googleStatus === 'ERROR';

  const hasNoindex =
    item.metaRobots?.toLowerCase().includes('noindex') ||
    item.xRobotsTag?.toLowerCase().includes('noindex');

  const testSearchUrl = `https://www.google.com/search?q=site:${encodeURIComponent(item.normalizedUrl || item.url)}`;

  const getGscUrl = () => {
    let prop = domainContext || '';
    if (!prop) {
      try {
        const u = new URL(item.url);
        prop = `${u.protocol}//${u.hostname}/`;
      } catch {
        prop = item.url;
      }
    }
    return `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(prop)}&id=${encodeURIComponent(item.url)}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-surface-100 dark:border-surface-800 flex items-start justify-between bg-surface-50/50 dark:bg-surface-850/40">
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isFound
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : isNotFound
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : isUnknown
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-surface-200 text-surface-800 dark:bg-surface-800 dark:text-surface-200'
                  }`}
                >
                  {isFound && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  {isNotFound && <XCircle className="w-3.5 h-3.5 mr-1" />}
                  {isUnknown && <HelpCircle className="w-3.5 h-3.5 mr-1" />}
                  {isError && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                  GOOGLE {item.googleStatus}
                </span>
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  Technical Audit & Visibility
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-mono font-bold text-surface-900 dark:text-white break-all">
                {item.url}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Quick Action CTA Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-blue-50 dark:from-amber-950/30 dark:to-blue-950/30 border border-amber-200/80 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-current shrink-0" />
                <span className="text-xs font-semibold text-surface-900 dark:text-white">
                  Fast Indexing Available
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsIndexModalOpen(true)}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors flex items-center space-x-1"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Request Instant Index</span>
                </button>
                <a
                  href={getGscUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center space-x-1"
                >
                  <span>GSC Inspect</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Grid of technical metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* HTTP Status */}
              <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/60">
                <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider block mb-1">
                  HTTP Response
                </span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      item.httpStatus === 200
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : item.httpStatus && item.httpStatus >= 300 && item.httpStatus < 400
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {item.httpStatus ? `HTTP ${item.httpStatus}` : 'Not Checked'}
                  </span>
                  <span className="text-xs text-surface-600 dark:text-surface-300">
                    {item.httpStatus === 200 ? 'OK (Accessible)' : item.httpStatus ? 'Redirect/Error' : ''}
                  </span>
                </div>
              </div>

              {/* Canonical Tag */}
              <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/60">
                <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider block mb-1">
                  Canonical URL
                </span>
                <div className="text-xs font-medium text-surface-900 dark:text-white truncate">
                  {item.canonicalStatus === 'SELF' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Self-referencing Canonical
                    </span>
                  ) : item.canonicalUrl ? (
                    <span className="text-amber-600 dark:text-amber-400 font-mono truncate block" title={item.canonicalUrl}>
                      Divergent: {item.canonicalUrl}
                    </span>
                  ) : (
                    <span className="text-surface-500">No canonical tag detected</span>
                  )}
                </div>
              </div>

              {/* Robots.txt Permission */}
              <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/60">
                <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider block mb-1">
                  Robots.txt Permission
                </span>
                <div className="text-xs font-semibold text-surface-800 dark:text-surface-200">
                  {item.robotsPermission === 'ALLOWED' ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Allowed for Googlebot</span>
                  ) : item.robotsPermission === 'DISALLOWED' ? (
                    <span className="text-rose-600 dark:text-rose-400">✕ Blocked in robots.txt</span>
                  ) : (
                    <span>Allowed (Default)</span>
                  )}
                </div>
              </div>

              {/* Meta Robots & X-Robots-Tag */}
              <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/60">
                <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider block mb-1">
                  Meta Robots / Noindex
                </span>
                <div className="text-xs font-semibold">
                  {hasNoindex ? (
                    <span className="text-rose-600 dark:text-rose-400">⚠️ Noindex directive detected</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ Indexable ({item.metaRobots || 'Not detected'})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sitemap Source & Lastmod */}
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Sitemap Source:</span>
                <span className="font-mono text-surface-800 dark:text-surface-200 truncate max-w-xs">
                  {item.sitemapSource || 'Direct URL Input'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Sitemap Last Modified:</span>
                <span className="font-medium text-surface-800 dark:text-surface-200">
                  {item.lastModified || 'Not specified in sitemap'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500 dark:text-surface-400">Audit Timestamp:</span>
                <span className="font-medium text-surface-800 dark:text-surface-200">
                  {item.checkedAt || 'Just now'}
                </span>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-4 rounded-xl bg-surface-100 dark:bg-surface-800/90 border border-surface-200 dark:border-surface-700">
              <h3 className="text-xs font-bold text-surface-900 dark:text-white uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <span>Recommendation & Next Steps</span>
              </h3>
              <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                {isFound
                  ? 'This URL was successfully observed in public Google search results. Continue maintaining on-page content quality and regular sitemap submissions.'
                  : isNotFound
                  ? 'The URL was not observed in the checked public search result. You can instantly push a crawl signal to search engines using the Index Request button above, or inspect manually in Google Search Console.'
                  : 'The search check encountered a timeout or rate limitation. Please try checking this URL again later.'}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex flex-wrap items-center justify-between gap-3">
            <a
              href={testSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Test `site:` query on Google.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center space-x-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-300 dark:border-surface-700 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200 transition-colors"
              >
                Open URL
              </a>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      <IndexRequestModal
        isOpen={isIndexModalOpen}
        onClose={() => setIsIndexModalOpen(false)}
        urlsToSubmit={[item.url]}
        domainContext={domainContext}
      />
    </>
  );
};
