'use client';

import React from 'react';
import { Search, ShieldAlert, Zap, Globe, FileCode2, Layers, CheckCircle2, XCircle } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-12 border-t border-surface-200 dark:border-surface-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-900">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white mt-3">
            API-Free Google Search Visibility Engine
          </h2>
          <p className="mt-2 text-sm sm:text-base text-surface-600 dark:text-surface-300">
            Understand how IndexCheck discovers sitemaps and checks Google visibility without any API keys or paid accounts.
          </p>
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Step 1 */}
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg border border-blue-200/60 dark:border-blue-800 mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white mb-2">
              Discover URLs
            </h3>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              We inspect your website's <code className="text-blue-600 dark:text-blue-400 font-mono">/robots.txt</code>, locate sitemap directives, and recursively unpack XML sitemap index hierarchies (<code className="text-xs font-mono">.xml</code> and <code className="text-xs font-mono">.xml.gz</code>).
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-lg border border-purple-200/60 dark:border-purple-800 mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white mb-2">
              Check Google Visibility
            </h3>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              Using controlled queueing and respectful rate throttling, we verify whether each URL is publicly observable via direct <code className="text-purple-600 dark:text-purple-400 font-mono">site:URL</code> search queries.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-200/60 dark:border-emerald-800 mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white mb-2">
              Analyze & Audit
            </h3>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              Calculate your <strong className="text-emerald-600 dark:text-emerald-400">Google Observable Index Rate</strong>, review on-page technical factors (Canonical, HTTP 200, Meta robots), and export clean CSV reports.
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 sm:p-8 shadow-card">
          <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">
            IndexCheck vs. Google Search Console API
          </h3>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mb-6">
            Why an API-free public visibility checker provides immediate, lightweight insights without authentication barriers.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface-50 dark:bg-surface-850 text-surface-600 dark:text-surface-300 font-semibold border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="py-3 px-4">Feature / Capability</th>
                  <th className="py-3 px-4 text-blue-600 dark:text-blue-400 font-bold">IndexCheck (This Tool)</th>
                  <th className="py-3 px-4 text-surface-500">Google Search Console</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800 font-sans">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-surface-900 dark:text-white">API Keys & OAuth Login</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Zero Login & No API Setup</span>
                  </td>
                  <td className="py-3.5 px-4 text-surface-500">Requires OAuth 2.0 & Property Verification</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-surface-900 dark:text-white">Third-Party Website Auditing</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Check Any Competitor or Client</span>
                  </td>
                  <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-semibold flex items-center space-x-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>Only verified owned websites</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-surface-900 dark:text-white">Sitemap Tree Traversal</td>
                  <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Automatic index & child unpacking</span>
                  </td>
                  <td className="py-3.5 px-4 text-surface-500">Manual sitemap submission</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-surface-900 dark:text-white">Accuracy Level</td>
                  <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-medium">
                    Publicly Observable Results (Estimate)
                  </td>
                  <td className="py-3.5 px-4 text-blue-600 dark:text-blue-400 font-medium">
                    Internal Google Index (Exhaustive)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
