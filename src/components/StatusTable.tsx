'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  SlidersHorizontal,
  FileSearch,
  Zap,
  CheckSquare,
  Square,
} from 'lucide-react';
import { UrlCheckResult, GoogleStatus } from '@/lib/types';
import { IndexRequestModal } from './IndexRequestModal';

interface StatusTableProps {
  results: UrlCheckResult[];
  onSelectUrl: (item: UrlCheckResult) => void;
  websiteDomain?: string;
}

export const StatusTable: React.FC<StatusTableProps> = ({ results, onSelectUrl, websiteDomain }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | GoogleStatus>('ALL');
  const [httpFilter, setHttpFilter] = useState<string>('ALL');
  const [sitemapFilter, setSitemapFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selected URLs for Index Request
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);
  const [modalInitialUrls, setModalInitialUrls] = useState<string[]>([]);
  const [modalInitialEngine, setModalInitialEngine] = useState<'INDEXNOW' | 'GOOGLE' | 'GSC_DIRECT'>('INDEXNOW');

  // Available sitemap sources
  const sitemapSources = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      if (r.sitemapSource) set.add(r.sitemapSource);
    }
    return Array.from(set);
  }, [results]);

  // Counts for filter pills
  const counts = useMemo(() => {
    let found = 0;
    let notFound = 0;
    let unknown = 0;
    let error = 0;

    for (const r of results) {
      if (r.googleStatus === 'FOUND') found++;
      else if (r.googleStatus === 'NOT FOUND') notFound++;
      else if (r.googleStatus === 'UNKNOWN') unknown++;
      else if (r.googleStatus === 'ERROR') error++;
    }

    return { all: results.length, found, notFound, unknown, error };
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // 1. Status filter
      if (statusFilter !== 'ALL' && item.googleStatus !== statusFilter) {
        return false;
      }

      // 2. HTTP Filter
      if (httpFilter === '200' && item.httpStatus !== 200) return false;
      if (httpFilter === '3xx' && (!item.httpStatus || item.httpStatus < 300 || item.httpStatus >= 400)) return false;
      if (httpFilter === '4xx' && (!item.httpStatus || item.httpStatus < 400 || item.httpStatus >= 500)) return false;
      if (httpFilter === '5xx' && (!item.httpStatus || item.httpStatus < 500)) return false;

      // 3. Sitemap filter
      if (sitemapFilter !== 'ALL' && item.sitemapSource !== sitemapFilter) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const urlMatch = item.url.toLowerCase().includes(q);
        const canonMatch = item.canonicalUrl?.toLowerCase().includes(q);
        const sitemapMatch = item.sitemapSource?.toLowerCase().includes(q);
        if (!urlMatch && !canonMatch && !sitemapMatch) return false;
      }

      return true;
    });
  }, [results, statusFilter, httpFilter, sitemapFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + pageSize);

  const toggleSelectUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedUrls.size === filteredResults.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredResults.map((r) => r.url)));
    }
  };

  const selectAllNotFound = () => {
    const notFoundUrls = results.filter((r) => r.googleStatus === 'NOT FOUND').map((r) => r.url);
    setSelectedUrls(new Set(notFoundUrls));
  };

  const handleOpenBulkIndexModal = (engine: 'INDEXNOW' | 'GOOGLE' | 'GSC_DIRECT' = 'INDEXNOW') => {
    const urls = selectedUrls.size > 0 
      ? Array.from(selectedUrls) 
      : results.filter((r) => r.googleStatus === 'NOT FOUND').map((r) => r.url);
    
    setModalInitialUrls(urls.length > 0 ? urls : results.map((r) => r.url));
    setModalInitialEngine(engine);
    setIsIndexModalOpen(true);
  };

  const handleOpenSingleIndexModal = (url: string, engine: 'INDEXNOW' | 'GOOGLE' | 'GSC_DIRECT' = 'INDEXNOW') => {
    setModalInitialUrls([url]);
    setModalInitialEngine(engine);
    setIsIndexModalOpen(true);
  };

  const getSitemapDisplayName = (src?: string) => {
    if (!src) return 'Direct Input';
    try {
      const url = new URL(src);
      return url.pathname.split('/').pop() || src;
    } catch {
      return src;
    }
  };

  const getGscInspectUrl = (url: string) => {
    let prop = websiteDomain || '';
    if (!prop) {
      try {
        const u = new URL(url);
        prop = `${u.protocol}//${u.hostname}/`;
      } catch {
        prop = url;
      }
    }
    return `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(prop)}&id=${encodeURIComponent(url)}`;
  };

  return (
    <>
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-card overflow-hidden">
        {/* Table Toolbar & Filters */}
        <div className="p-4 sm:p-5 border-b border-surface-100 dark:border-surface-800 space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface-100 dark:bg-surface-800/80 rounded-xl">
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                    : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                All <span className="ml-1 text-[11px] font-normal text-surface-400">({counts.all})</span>
              </button>

              <button
                onClick={() => {
                  setStatusFilter('FOUND');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  statusFilter === 'FOUND'
                    ? 'bg-white dark:bg-surface-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-emerald-700/80 dark:text-emerald-400/80 hover:text-emerald-600 dark:hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Observable</span>
                <span className="text-[11px] font-normal opacity-75">({counts.found})</span>
              </button>

              <button
                onClick={() => {
                  setStatusFilter('NOT FOUND');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  statusFilter === 'NOT FOUND'
                    ? 'bg-white dark:bg-surface-900 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-rose-700/80 dark:text-rose-400/80 hover:text-rose-600 dark:hover:text-rose-300'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Not Observable</span>
                <span className="text-[11px] font-normal opacity-75">({counts.notFound})</span>
              </button>

              <button
                onClick={() => {
                  setStatusFilter('UNKNOWN');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  statusFilter === 'UNKNOWN'
                    ? 'bg-white dark:bg-surface-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-amber-700/80 dark:text-amber-400/80 hover:text-amber-600 dark:hover:text-amber-300'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Unknown</span>
                <span className="text-[11px] font-normal opacity-75">({counts.unknown})</span>
              </button>

              {counts.error > 0 && (
                <button
                  onClick={() => {
                    setStatusFilter('ERROR');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    statusFilter === 'ERROR'
                      ? 'bg-white dark:bg-surface-900 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-red-700/80 dark:text-red-400/80'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Errors ({counts.error})</span>
                </button>
              )}
            </div>

            {/* Quick Bulk Index Button */}
            <div className="flex items-center space-x-2">
              {counts.notFound > 0 && (
                <button
                  onClick={() => selectAllNotFound()}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors"
                >
                  Select All {counts.notFound} Not Observable
                </button>
              )}

              <button
                onClick={() => handleOpenBulkIndexModal('INDEXNOW')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm shadow-blue-500/20 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>
                  Request Indexing {selectedUrls.size > 0 ? `(${selectedUrls.size})` : counts.notFound > 0 ? `(${counts.notFound})` : ''}
                </span>
              </button>
            </div>
          </div>

          {/* Search & Dropdown Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search bar */}
            <div className="sm:col-span-6 lg:col-span-7 relative">
              <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search URLs, canonical, or sitemaps..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* HTTP Status Filter */}
            <div className="sm:col-span-3 lg:col-span-2.5">
              <select
                value={httpFilter}
                onChange={(e) => {
                  setHttpFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All HTTP Status</option>
                <option value="200">200 OK</option>
                <option value="3xx">3xx Redirect</option>
                <option value="4xx">4xx Client Error</option>
                <option value="5xx">5xx Server Error</option>
              </select>
            </div>

            {/* Sitemap Source Filter */}
            <div className="sm:col-span-3 lg:col-span-2.5">
              <select
                value={sitemapFilter}
                onChange={(e) => {
                  setSitemapFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="ALL">All Sitemaps</option>
                {sitemapSources.map((src) => (
                  <option key={src} value={src}>
                    {getSitemapDisplayName(src)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 dark:bg-surface-850 text-surface-500 dark:text-surface-400 font-semibold border-b border-surface-100 dark:border-surface-800">
              <tr>
                <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                  <button
                    onClick={selectAllFiltered}
                    title="Select/Deselect all"
                    className="p-1 hover:text-surface-900 dark:hover:text-white"
                  >
                    {selectedUrls.size > 0 && selectedUrls.size === filteredResults.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3">URL</th>
                <th className="py-3.5 px-3">Google Status</th>
                <th className="py-3.5 px-3">HTTP</th>
                <th className="py-3.5 px-3">Canonical</th>
                <th className="py-3.5 px-3">Sitemap</th>
                <th className="py-3.5 px-3">Last Modified</th>
                <th className="py-3.5 pr-4 pl-2 text-right">Actions & Indexing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800 font-sans">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-surface-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSearch className="w-8 h-8 text-surface-300 dark:text-surface-600" />
                      <p className="text-sm font-medium">No matching URLs found</p>
                      <p className="text-xs text-surface-400">Try changing your search query or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((item, idx) => {
                  const itemIndex = startIndex + idx + 1;
                  const isFound = item.googleStatus === 'FOUND';
                  const isNotFound = item.googleStatus === 'NOT FOUND';
                  const isUnknown = item.googleStatus === 'UNKNOWN';
                  const isError = item.googleStatus === 'ERROR';
                  const isSelected = selectedUrls.has(item.url);

                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors group cursor-pointer ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                      onClick={() => onSelectUrl(item)}
                    >
                      <td
                        className="py-3.5 pl-4 pr-2 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectUrl(item.url);
                        }}
                      >
                        <button className="p-1 hover:text-blue-600">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-surface-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-medium text-surface-900 dark:text-surface-100 max-w-xs sm:max-w-sm md:max-w-md truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate" title={item.url}>
                            {item.url}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
                            isFound
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : isNotFound
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                              : isUnknown
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-surface-200 text-surface-800 dark:bg-surface-800 dark:text-surface-200'
                          }`}
                        >
                          {isFound && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {isNotFound && <XCircle className="w-3 h-3 mr-1" />}
                          {isUnknown && <HelpCircle className="w-3 h-3 mr-1" />}
                          {isError && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {item.googleStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {item.httpStatus ? (
                          <span
                            className={`font-semibold ${
                              item.httpStatus === 200
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {item.httpStatus}
                          </span>
                        ) : (
                          <span className="text-surface-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-surface-600 dark:text-surface-300">
                        {item.canonicalStatus === 'SELF' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Self</span>
                        ) : item.canonicalUrl ? (
                          <span className="text-amber-600 dark:text-amber-400 truncate max-w-[120px] inline-block" title={item.canonicalUrl}>
                            Divergent
                          </span>
                        ) : (
                          <span className="text-surface-400">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-surface-500 dark:text-surface-400 font-mono text-[11px] truncate max-w-[120px]">
                        {getSitemapDisplayName(item.sitemapSource)}
                      </td>

                      <td className="py-3.5 px-3 text-surface-500 dark:text-surface-400 text-[11px] whitespace-nowrap">
                        {item.lastModified || 'N/A'}
                      </td>

                      <td className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Fast Index Request Button */}
                          <button
                            onClick={() => handleOpenSingleIndexModal(item.url, 'INDEXNOW')}
                            title="Request Fast Indexing (IndexNow / Google)"
                            className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-md transition-colors"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Request</span>
                          </button>

                          {/* 1-Click GSC Inspection Link */}
                          <a
                            href={getGscInspectUrl(item.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open URL Inspection in Google Search Console"
                            className="px-2 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-md transition-colors"
                          >
                            GSC
                          </a>

                          <button
                            onClick={() => onSelectUrl(item)}
                            className="px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors"
                          >
                            Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-surface-100 dark:border-surface-800 flex flex-wrap items-center justify-between gap-3 text-xs text-surface-500 dark:text-surface-400">
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <span>
              Page <span className="font-bold text-surface-900 dark:text-white">{validPage}</span> of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage === 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage === totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <IndexRequestModal
        isOpen={isIndexModalOpen}
        onClose={() => setIsIndexModalOpen(false)}
        urlsToSubmit={modalInitialUrls}
        initialEngine={modalInitialEngine}
        domainContext={websiteDomain}
      />
    </>
  );
};
