import React from 'react';
import { CheckSquare, ShieldCheck, Heart, Sparkles, Code2 } from 'lucide-react';

interface FooterProps {
  onLogoClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onLogoClick }) => {
  return (
    <footer className="border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-surface-200 dark:border-surface-800">
          {/* Logo & Tagline */}
          <div className="text-center md:text-left">
            <div 
              onClick={onLogoClick}
              title="Go to Homepage"
              className={`flex items-center justify-center md:justify-start space-x-2.5 ${onLogoClick ? 'cursor-pointer group' : ''}`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition-colors">
                <CheckSquare className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-black text-lg tracking-tight text-surface-900 dark:text-white">
                INDEX<span className="text-blue-600">CHECK</span>
              </span>
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
              Check Which URLs Are Visible on Google & Request Fast Indexing
            </p>
          </div>

          {/* Crafted by Saleh Badge */}
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm text-xs text-surface-600 dark:text-surface-300">
              <span className="flex items-center space-x-1">
                <span>Designed & Built with</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                <span>by</span>
              </span>
              <span className="font-bold text-surface-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-sm tracking-wide">
                Saleh
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-surface-400 dark:text-surface-500">
          <p>
            Google is a trademark of Google LLC. IndexCheck is an independent SEO utility tool not affiliated with or endorsed by Google LLC.
          </p>
          <div className="flex items-center space-x-3">
            <span>Ephemeral Processing</span>
            <span>•</span>
            <span className="text-surface-600 dark:text-surface-300 font-semibold">
              © {new Date().getFullYear()} Saleh
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
