import React from 'react';
import { Info } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  return (
    <div
      role="note"
      className={`rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ${
        compact ? 'p-3 text-xs' : 'p-4 text-sm'
      } flex items-start space-x-3 transition-colors shadow-subtle`}
    >
      <Info className={`text-blue-600 dark:text-blue-400 shrink-0 ${compact ? 'w-4 h-4 mt-0.5' : 'w-5 h-5 mt-0.5'}`} />
      <div>
        <p className="font-semibold text-blue-950 dark:text-blue-100">
          Important Disclaimer on Google Observable Results
        </p>
        <p className="mt-0.5 text-blue-800/90 dark:text-blue-300 leading-relaxed">
          Google search results are not exhaustive. A URL marked <span className="font-semibold text-amber-700 dark:text-amber-300">"Not Observable"</span> is not proof that Google has not indexed it. This tool checks publicly observable Google search queries without using private API credentials.
        </p>
      </div>
    </div>
  );
};
