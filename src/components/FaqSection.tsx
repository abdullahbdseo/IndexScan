'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'Why is this metric called "Google Observable" instead of "Exact Index Rate"?',
    answer:
      'Google\'s public search interface is designed for searchers, not technical diagnostics. Google does not return 100% of all indexed pages in public SERPs for every query. Therefore, our tool calculates the "Google Observable Index Rate" based strictly on observable public search results.',
  },
  {
    question: 'Why might a URL show as "Not Observable" if Google has already crawled it?',
    answer:
      '"Not Observable" simply means the URL was not found in the checked public search query. This can happen due to SERP clustering, canonical deduplication, personalization filters, or delayed public search caching. It does NOT prove that Google has de-indexed your page.',
  },
  {
    question: 'Does this tool use Google Search Console API or any paid third-party proxy?',
    answer:
      'No. IndexCheck is 100% API-free and does NOT use Google Search Console API, SerpAPI, DataForSEO, Ahrefs, Semrush, or proxy rotation services. It works entirely without login, credentials, or paid subscriptions.',
  },
  {
    question: 'How does IndexCheck discover and unpack XML sitemaps?',
    answer:
      'IndexCheck first inspects /robots.txt for "Sitemap:" directives. It also checks common standard locations like /sitemap.xml, /sitemap_index.xml, /sitemap-index.xml, and /wp-sitemap.xml. If a Sitemap Index is found, it automatically and recursively discovers all child sitemaps.',
  },
  {
    question: 'What happens if Google limits automated requests during a scan?',
    answer:
      'In compliance with strict anti-bot and security policies, IndexCheck does not bypass CAPTCHAs or rotate proxies. If Google returns a 429 rate limit or verification screen, the tool safely flags the check as "UNKNOWN" and displays a friendly notice explaining that searches are temporarily limited.',
  },
  {
    question: 'How does the Instant Index Request feature work?',
    answer:
      'IndexCheck supports two instant indexing protocols: (1) IndexNow Protocol: Instant notification directly to Microsoft Bing, Yandex, Seznam, and Naver crawlers with 0 configuration; and (2) Google Indexing API: Direct push to Googlebot via your Google Cloud Service Account (200 URLs/day quota). You can also use our 1-Click Google Search Console deep links without any API keys.',
  },
  {
    question: 'Is Google Indexing API completely free to use?',
    answer:
      'Yes. Google Cloud provides a generous daily free quota of 200 URL indexing notifications per day per Service Account at zero cost. Your credentials are saved strictly in your local browser storage and never stored on any server or database.',
  },
  {
    question: 'How is user data and target URL privacy protected?',
    answer:
      'IndexCheck processes URLs ephemerally in memory during your active session. We do not store your sitemaps or URLs in permanent databases, nor do we require user accounts or track your searches.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-12 border-t border-surface-200 dark:border-surface-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-900">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 dark:text-white mt-3">
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
            Learn more about Google observable search metrics, limitations, and best practices.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden transition-all shadow-subtle"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between space-x-4 hover:bg-surface-50/50 dark:hover:bg-surface-850/40 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-surface-900 dark:text-white">
                    {faq.question}
                  </span>
                  <div className="p-1 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-white">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-surface-600 dark:text-surface-300 leading-relaxed border-t border-surface-100 dark:border-surface-800/80">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
