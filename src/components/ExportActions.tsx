'use client';

import React, { useState } from 'react';
import { Download, Copy, Check, FileSpreadsheet } from 'lucide-react';
import { UrlCheckResult } from '@/lib/types';
import { generateCsv, downloadCsvFile, copyUrlsToClipboard } from '@/lib/export/csv';

interface ExportActionsProps {
  results: UrlCheckResult[];
  websiteDomain?: string;
}

export const ExportActions: React.FC<ExportActionsProps> = ({ results, websiteDomain = 'results' }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleDownloadCsv = () => {
    if (results.length === 0) return;
    const csvData = generateCsv(results);
    const cleanDomain = websiteDomain.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(`indexcheck_${cleanDomain}_${dateStr}.csv`, csvData);
  };

  const handleCopy = async (key: 'found' | 'notFound' | 'all') => {
    let urlsToCopy: string[] = [];

    if (key === 'found') {
      urlsToCopy = results.filter((r) => r.googleStatus === 'FOUND').map((r) => r.url);
    } else if (key === 'notFound') {
      urlsToCopy = results.filter((r) => r.googleStatus === 'NOT FOUND').map((r) => r.url);
    } else {
      urlsToCopy = results.map((r) => r.url);
    }

    if (urlsToCopy.length === 0) return;

    const success = await copyUrlsToClipboard(urlsToCopy);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const foundCount = results.filter((r) => r.googleStatus === 'FOUND').length;
  const notFoundCount = results.filter((r) => r.googleStatus === 'NOT FOUND').length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Download CSV */}
      <button
        onClick={handleDownloadCsv}
        disabled={results.length === 0}
        className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download CSV</span>
      </button>

      {/* Copy Found */}
      <button
        onClick={() => handleCopy('found')}
        disabled={foundCount === 0}
        className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 transition-all disabled:opacity-50"
      >
        {copiedKey === 'found' ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Copied ({foundCount})</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-surface-400" />
            <span>Copy Found ({foundCount})</span>
          </>
        )}
      </button>

      {/* Copy Not Found */}
      <button
        onClick={() => handleCopy('notFound')}
        disabled={notFoundCount === 0}
        className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 transition-all disabled:opacity-50"
      >
        {copiedKey === 'notFound' ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Copied ({notFoundCount})</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-surface-400" />
            <span>Copy Not Found ({notFoundCount})</span>
          </>
        )}
      </button>

      {/* Copy All */}
      <button
        onClick={() => handleCopy('all')}
        disabled={results.length === 0}
        className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-700 transition-all disabled:opacity-50"
      >
        {copiedKey === 'all' ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Copied All ({results.length})</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-surface-400" />
            <span>Copy All ({results.length})</span>
          </>
        )}
      </button>
    </div>
  );
};
