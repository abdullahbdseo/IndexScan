'use client';

import React, { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { StepProgress } from '@/components/StepProgress';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FaqSection } from '@/components/FaqSection';
import { Footer } from '@/components/Footer';
import { CheckSummary, UrlCheckResult, StepProgressItem } from '@/lib/types';
import { getDemoResults } from '@/lib/demo/demoData';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'website' | 'bulk' | 'indexer' | 'how-it-works'>('website');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Steps state
  const [steps, setSteps] = useState<StepProgressItem[]>([
    { id: 1, label: 'Checking website', status: 'pending' },
    { id: 2, label: 'Finding robots.txt', status: 'pending' },
    { id: 3, label: 'Finding sitemap', status: 'pending' },
    { id: 4, label: 'Extracting URLs', status: 'pending' },
    { id: 5, label: 'Checking Google visibility', status: 'pending' },
    { id: 6, label: 'Generating report', status: 'pending' },
  ]);

  const [currentStep, setCurrentStep] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);

  // Live counters during check
  const [totalUrls, setTotalUrls] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [notFoundCount, setNotFoundCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  // Results state
  const [activeSummary, setActiveSummary] = useState<CheckSummary | null>(null);
  const [activeResults, setActiveResults] = useState<UrlCheckResult[]>([]);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStep = (id: number, status: 'pending' | 'running' | 'completed' | 'error', detail?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail !== undefined ? detail : s.detail } : s))
    );
    if (status === 'running') {
      setCurrentStep(id);
    }
  };

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
    setScanError('Scan was cancelled by user.');
    updateStep(currentStep, 'error', 'Scan cancelled');
  };

  const resetAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
    setScanError(null);
    setActiveSummary(null);
    setActiveResults([]);
    setProgressPercent(0);
    setTotalUrls(0);
    setCheckedCount(0);
    setFoundCount(0);
    setNotFoundCount(0);
    setUnknownCount(0);
    setSteps([
      { id: 1, label: 'Checking website', status: 'pending' },
      { id: 2, label: 'Finding robots.txt', status: 'pending' },
      { id: 3, label: 'Finding sitemap', status: 'pending' },
      { id: 4, label: 'Extracting URLs', status: 'pending' },
      { id: 5, label: 'Checking Google visibility', status: 'pending' },
      { id: 6, label: 'Generating report', status: 'pending' },
    ]);
  };

  const handleTryDemo = () => {
    resetAll();
    const demo = getDemoResults();
    setActiveSummary(demo.summary);
    setActiveResults(demo.results);
  };

  // 1. Website Checker Workflow
  const handleStartWebsiteCheck = async (websiteUrl: string) => {
    resetAll();
    setIsScanning(true);
    abortControllerRef.current = new AbortController();

    const startTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    try {
      // STEP 1: Checking website
      updateStep(1, 'running', 'Validating domain and security checks...');
      setProgressPercent(10);

      const valRes = await fetch('/api/validate-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
        signal: abortControllerRef.current.signal,
      });

      const valData = await valRes.json();
      if (!valRes.ok || !valData.valid) {
        throw new Error(valData.error || 'Website validation failed. Please verify the domain.');
      }

      const validUrl = valData.normalizedUrl;
      updateStep(1, 'completed', `Verified ${valData.hostname}`);
      setProgressPercent(20);

      // STEP 2 & 3 & 4: Finding robots.txt & discovering sitemaps
      updateStep(2, 'running', 'Inspecting /robots.txt directives...');
      updateStep(3, 'running', 'Probing sitemap XML locations...');
      updateStep(4, 'running', 'Extracting and deduplicating URLs...');
      setProgressPercent(35);

      const smRes = await fetch('/api/discover-sitemaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validUrl }),
        signal: abortControllerRef.current.signal,
      });

      const smData = await smRes.json();
      if (!smRes.ok || !smData.success) {
        throw new Error(smData.error || 'Failed to extract sitemaps from website.');
      }

      if (!smData.urls || smData.urls.length === 0) {
        throw new Error(
          `No XML sitemaps found for ${validUrl}. Make sure /sitemap.xml exists or is declared in robots.txt.`
        );
      }

      updateStep(2, 'completed', smData.robotsDirectivesFound.length > 0 ? 'Sitemap directives found' : 'Robots inspected');
      updateStep(3, 'completed', `${smData.sitemapsFound.length} sitemaps discovered`);
      updateStep(4, 'completed', `${smData.totalUrls} unique URLs extracted`);
      setProgressPercent(50);

      const targetUrls: Array<{ url: string; sitemapSource: string; lastModified?: string }> = smData.urls;
      setTotalUrls(targetUrls.length);

      // STEP 5: Checking Google Visibility
      updateStep(5, 'running', `Checking visibility for ${targetUrls.length} URLs...`);

      const batchSize = 5;
      const allResults: UrlCheckResult[] = [];
      let currentFound = 0;
      let currentNotFound = 0;
      let currentUnknown = 0;

      for (let i = 0; i < targetUrls.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) break;

        const batch = targetUrls.slice(i, i + batchSize);

        const checkRes = await fetch('/api/check-visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
          signal: abortControllerRef.current.signal,
        });

        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.results) {
          for (const item of checkData.results) {
            allResults.push(item);
            if (item.googleStatus === 'FOUND') currentFound++;
            else if (item.googleStatus === 'NOT FOUND') currentNotFound++;
            else currentUnknown++;
          }

          setFoundCount(currentFound);
          setNotFoundCount(currentNotFound);
          setUnknownCount(currentUnknown);
          setCheckedCount(allResults.length);

          const pct = 50 + (allResults.length / targetUrls.length) * 45;
          setProgressPercent(Math.min(95, pct));
        }

        // Polite delay between batches
        if (i + batchSize < targetUrls.length) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      // STEP 6: Generating Report
      updateStep(5, 'completed', `${allResults.length} URLs checked against Google`);
      updateStep(6, 'running', 'Finalizing metrics and audit tables...');
      setProgressPercent(100);

      const observableRate =
        allResults.length > 0 ? Number(((currentFound / allResults.length) * 100).toFixed(1)) : 0;

      const summary: CheckSummary = {
        websiteUrl: validUrl,
        totalUrls: allResults.length,
        foundCount: currentFound,
        notFoundCount: currentNotFound,
        unknownCount: currentUnknown,
        errorCount: allResults.filter((r) => r.googleStatus === 'ERROR').length,
        observableRate,
        sitemapsFound: smData.sitemapsFound,
        robotsFound: smData.robotsDirectivesFound.length > 0,
        startedAt: startTime,
        completedAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };

      updateStep(6, 'completed', 'Report ready');
      setActiveSummary(summary);
      setActiveResults(allResults);
      setIsScanning(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setIsScanning(false);
      setScanError(err.message || 'An unexpected error occurred during website check.');
      updateStep(currentStep, 'error', err.message);
    }
  };

  // 2. Bulk Checker Workflow
  const handleStartBulkCheck = async (urls: string[]) => {
    resetAll();
    setIsScanning(true);
    abortControllerRef.current = new AbortController();

    const startTime = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    try {
      updateStep(1, 'completed', 'Bulk list parsed and validated');
      updateStep(2, 'completed', 'Skipped for custom URL list');
      updateStep(3, 'completed', 'Custom URL list input');
      updateStep(4, 'completed', `${urls.length} unique URLs queued`);
      setProgressPercent(20);

      setTotalUrls(urls.length);

      // STEP 5: Checking Google Visibility
      updateStep(5, 'running', `Checking Google visibility for ${urls.length} URLs...`);

      const batchSize = 5;
      const allResults: UrlCheckResult[] = [];
      let currentFound = 0;
      let currentNotFound = 0;
      let currentUnknown = 0;

      for (let i = 0; i < urls.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) break;

        const batch = urls.slice(i, i + batchSize).map((u) => ({ url: u, sitemapSource: 'Bulk Input' }));

        const checkRes = await fetch('/api/check-visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
          signal: abortControllerRef.current.signal,
        });

        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.results) {
          for (const item of checkData.results) {
            allResults.push(item);
            if (item.googleStatus === 'FOUND') currentFound++;
            else if (item.googleStatus === 'NOT FOUND') currentNotFound++;
            else currentUnknown++;
          }

          setFoundCount(currentFound);
          setNotFoundCount(currentNotFound);
          setUnknownCount(currentUnknown);
          setCheckedCount(allResults.length);

          const pct = 20 + (allResults.length / urls.length) * 75;
          setProgressPercent(Math.min(95, pct));
        }

        if (i + batchSize < urls.length) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      updateStep(5, 'completed', `${allResults.length} URLs verified`);
      updateStep(6, 'running', 'Finalizing report...');
      setProgressPercent(100);

      const observableRate =
        allResults.length > 0 ? Number(((currentFound / allResults.length) * 100).toFixed(1)) : 0;

      let websiteUrl = 'Custom URL Batch';
      try {
        if (urls.length > 0) {
          const parsed = new URL(urls[0]);
          websiteUrl = parsed.hostname;
        }
      } catch {}

      const summary: CheckSummary = {
        websiteUrl,
        totalUrls: allResults.length,
        foundCount: currentFound,
        notFoundCount: currentNotFound,
        unknownCount: currentUnknown,
        errorCount: allResults.filter((r) => r.googleStatus === 'ERROR').length,
        observableRate,
        sitemapsFound: [],
        robotsFound: false,
        startedAt: startTime,
        completedAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };

      updateStep(6, 'completed', 'Report ready');
      setActiveSummary(summary);
      setActiveResults(allResults);
      setIsScanning(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setIsScanning(false);
      setScanError(err.message || 'An unexpected error occurred during bulk URL check.');
      updateStep(currentStep, 'error', err.message);
    }
  };

  const handleGoHome = () => {
    resetAll();
    setActiveTab('website');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (tab: 'website' | 'bulk' | 'indexer' | 'how-it-works') => {
    if (activeSummary || isScanning) {
      resetAll();
    }
    setActiveTab(tab);
    setTimeout(() => {
      if (tab === 'how-it-works') {
        const el = document.getElementById('how-it-works');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (tab === 'bulk') {
        const el = document.getElementById('bulk-checker');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (tab === 'indexer') {
        const el = document.getElementById('instant-indexer');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Navbar Header */}
      <Header
        onTryDemo={handleTryDemo}
        onSelectTab={scrollToSection}
        onLogoClick={handleGoHome}
        activeTab={activeTab}
      />

      <main className="flex-1">
        {/* If scanning or results are NOT showing, show Hero section */}
        {!activeSummary && (
          <Hero
            onStartWebsiteCheck={handleStartWebsiteCheck}
            onStartBulkCheck={handleStartBulkCheck}
            isLoading={isScanning}
            initialTab={activeTab === 'how-it-works' ? 'website' : activeTab}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {/* Error Alert Box */}
          {scanError && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex items-start justify-between gap-3 shadow-subtle animate-in fade-in">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-rose-950 dark:text-rose-100">Check Incomplete</h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">{scanError}</p>
                </div>
              </div>
              <button
                onClick={resetAll}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-surface-800 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-300 dark:border-rose-800 hover:bg-rose-50 transition-colors shrink-0"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Active Live Step Progress indicator */}
          {isScanning && (
            <StepProgress
              steps={steps}
              currentStep={currentStep}
              progressPercent={progressPercent}
              totalUrls={totalUrls}
              checkedCount={checkedCount}
              foundCount={foundCount}
              notFoundCount={notFoundCount}
              unknownCount={unknownCount}
              onCancel={handleCancelScan}
            />
          )}

          {/* Results Dashboard */}
          {activeSummary && (
            <ResultsDashboard
              summary={activeSummary}
              results={activeResults}
              onReset={resetAll}
              onExitDemo={resetAll}
            />
          )}
        </div>

        {/* How It Works & Comparison Section */}
        <HowItWorksSection />

        {/* FAQ Section */}
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer onLogoClick={handleGoHome} />
    </div>
  );
}
