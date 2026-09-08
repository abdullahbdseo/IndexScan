'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Moon, Sun, Sparkles, Zap, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onTryDemo?: () => void;
  onSelectTab?: (tab: 'website' | 'bulk' | 'indexer' | 'how-it-works') => void;
  activeTab?: string;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onTryDemo, onSelectTab, activeTab = '', onLogoClick }) => {
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const toggleTheme = () => {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        setIsDark(false);
      } else {
        html.classList.add('dark');
        setIsDark(true);
      }
    }
  };

  const handleNavClick = (tab: 'website' | 'bulk' | 'indexer' | 'how-it-works') => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      router.push(`/?tab=${tab}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-950/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/"
          title="Go to Homepage"
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
            <CheckSquare className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-surface-900 dark:text-white">
              INDEX<span className="text-blue-600">CHECK</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded border border-blue-200/60 dark:border-blue-800">
              API-FREE
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <button
            onClick={() => handleNavClick('website')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'website'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
          >
            Website Checker
          </button>
          <button
            onClick={() => handleNavClick('bulk')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'bulk'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
          >
            Bulk URL Checker
          </button>
          <button
            onClick={() => handleNavClick('indexer')}
            className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'indexer'
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span>Instant Indexer</span>
          </button>

          {/* Deep SEO Audit & Excel Report Nav Link */}
          <Link
            href="/audit"
            className={`px-3.5 py-2 text-sm font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Deep Audit & Excel</span>
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500 text-white rounded-full">
              New
            </span>
          </Link>

          <button
            onClick={() => handleNavClick('how-it-works')}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'how-it-works'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
          >
            How It Works
          </button>
        </nav>

        {/* Right CTA / Theme */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {onTryDemo ? (
            <button
              onClick={onTryDemo}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Try Demo</span>
            </button>
          ) : (
            <Link
              href="/audit"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 rounded-lg transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Audit Website</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
