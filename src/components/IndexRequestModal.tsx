'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Key,
  Globe,
  Copy,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Search,
  Sparkles,
  FileJson,
  Upload,
} from 'lucide-react';
import { UrlCheckResult } from '@/lib/types';

interface IndexRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  urlsToSubmit: string[];
  initialEngine?: 'INDEXNOW' | 'GOOGLE' | 'GSC_DIRECT';
  domainContext?: string;
}

export const IndexRequestModal: React.FC<IndexRequestModalProps> = ({
  isOpen,
  onClose,
  urlsToSubmit,
  initialEngine = 'INDEXNOW',
  domainContext = '',
}) => {
  const [activeTab, setActiveTab] = useState<'INDEXNOW' | 'GOOGLE' | 'GSC_DIRECT'>(initialEngine);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusLogs, setStatusLogs] = useState<{ url: string; success: boolean; message: string }[]>([]);
  const [batchSummary, setBatchSummary] = useState<{ successCount: number; failureCount: number; message: string } | null>(null);

  // Google Service Account state (stored in localStorage)
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [savedClientEmail, setSavedClientEmail] = useState('');
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [guideLang, setGuideLang] = useState<'bn' | 'en'>('bn');

  // IndexNow Custom Key state
  const [indexNowKey, setIndexNowKey] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Initialize selected URLs when modal opens or urls change
  useEffect(() => {
    setSelectedUrls(urlsToSubmit);
    setStatusLogs([]);
    setBatchSummary(null);
  }, [urlsToSubmit, isOpen]);

  // Load saved Google Service Account from localStorage on mount
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem('indexcheck_google_sa_key');
      if (savedKey) {
        setServiceAccountJson(savedKey);
        const parsed = JSON.parse(savedKey);
        if (parsed.client_email) {
          setSavedClientEmail(parsed.client_email);
          setIsKeyValid(true);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setServiceAccountJson(content);
        try {
          const parsed = JSON.parse(content);
          if (parsed.client_email) {
            setSavedClientEmail(parsed.client_email);
            setIsKeyValid(true);
            localStorage.setItem('indexcheck_google_sa_key', content);
          }
        } catch {
          setIsKeyValid(false);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleTestKey = async () => {
    if (!serviceAccountJson.trim()) return;
    setIsValidatingKey(true);
    setIsKeyValid(null);

    try {
      const res = await fetch('/api/index-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'TEST_GOOGLE_KEY',
          serviceAccountKey: serviceAccountJson,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setIsKeyValid(true);
        setSavedClientEmail(data.clientEmail);
        localStorage.setItem('indexcheck_google_sa_key', serviceAccountJson);
      } else {
        setIsKeyValid(false);
        alert(data.error || 'Invalid Google Service Account credentials.');
      }
    } catch (err: unknown) {
      setIsKeyValid(false);
      const e = err as Error;
      alert(`Validation error: ${e.message}`);
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleSaveKey = () => {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (!parsed.client_email || !parsed.private_key) {
        alert('Invalid JSON: Must contain "client_email" and "private_key"');
        return;
      }
      localStorage.setItem('indexcheck_google_sa_key', serviceAccountJson);
      setSavedClientEmail(parsed.client_email);
      setIsKeyValid(true);
      alert('Google Service Account key securely saved in your browser!');
    } catch {
      alert('Invalid JSON format. Please paste valid JSON.');
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('indexcheck_google_sa_key');
    setServiceAccountJson('');
    setSavedClientEmail('');
    setIsKeyValid(null);
  };

  // Submit to IndexNow
  const handleSubmitIndexNow = async () => {
    if (selectedUrls.length === 0) return;
    setIsSubmitting(true);
    setStatusLogs([]);
    setBatchSummary(null);

    try {
      const res = await fetch('/api/index-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'INDEXNOW',
          urls: selectedUrls,
          key: indexNowKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBatchSummary({
          successCount: data.submittedCount || selectedUrls.length,
          failureCount: 0,
          message: data.message || 'Successfully submitted to IndexNow (Bing & Yandex)!',
        });
        setStatusLogs(
          selectedUrls.map((u) => ({
            url: u,
            success: true,
            message: 'IndexNow crawl signal dispatched',
          }))
        );
      } else {
        setBatchSummary({
          successCount: 0,
          failureCount: selectedUrls.length,
          message: data.error || data.message || 'IndexNow request failed.',
        });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setBatchSummary({
        successCount: 0,
        failureCount: selectedUrls.length,
        message: e.message || 'Network error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit to Google Indexing API
  const handleSubmitGoogle = async () => {
    if (selectedUrls.length === 0) return;
    if (!serviceAccountJson.trim()) {
      alert('Please provide your Google Service Account JSON key first.');
      return;
    }

    setIsSubmitting(true);
    setStatusLogs([]);
    setBatchSummary(null);

    try {
      const res = await fetch('/api/index-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'GOOGLE',
          urls: selectedUrls.slice(0, 200), // Max 200 URLs daily free quota
          serviceAccountKey: serviceAccountJson,
          actionType: 'URL_UPDATED',
        }),
      });

      const data = await res.json();

      if (res.ok && data.results) {
        setBatchSummary({
          successCount: data.successCount || 0,
          failureCount: data.failureCount || 0,
          message: data.quotaMessage || `Completed ${data.successCount} submissions.`,
        });
        setStatusLogs(
          data.results.map((r: { url: string; success: boolean; message: string }) => ({
            url: r.url,
            success: r.success,
            message: r.message,
          }))
        );
      } else {
        setBatchSummary({
          successCount: 0,
          failureCount: selectedUrls.length,
          message: data.error || 'Google Indexing API request failed.',
        });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setBatchSummary({
        successCount: 0,
        failureCount: selectedUrls.length,
        message: e.message || 'Failed to communicate with Google Indexing endpoint.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGscUrl = (url: string) => {
    let domainProp = domainContext;
    try {
      if (!domainProp) {
        const u = new URL(url);
        domainProp = `${u.protocol}//${u.hostname}/`;
      }
    } catch {
      domainProp = url;
    }
    return `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(domainProp)}&id=${encodeURIComponent(url)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-surface-100 dark:border-surface-800 flex items-start justify-between bg-surface-50/50 dark:bg-surface-850/40">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Zap className="w-3.5 h-3.5 mr-1 fill-current" />
                Instant Index Request Hub
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-surface-900 dark:text-white">
              Request Fast Search Engine Indexing
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Notify Googlebot, Bing, and search engine crawlers to immediately crawl your {selectedUrls.length} selected URL{selectedUrls.length > 1 ? 's' : ''}.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Tabs */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-surface-100 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-850/20">
          <div className="flex flex-wrap gap-2">
            {/* Tab 1: IndexNow */}
            <button
              onClick={() => setActiveTab('INDEXNOW')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'INDEXNOW'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>IndexNow (Bing/Yandex)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                0 Setup
              </span>
            </button>

            {/* Tab 2: Google Indexing API */}
            <button
              onClick={() => setActiveTab('GOOGLE')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'GOOGLE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Indexing API</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                200 Free/Day
              </span>
            </button>

            {/* Tab 3: Google Search Console Direct */}
            <button
              onClick={() => setActiveTab('GSC_DIRECT')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'GSC_DIRECT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>1-Click GSC Links</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                Manual
              </span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: IndexNow */}
          {activeTab === 'INDEXNOW' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Instant Multi-Search Engine Notification</span>
                </div>
                <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                  IndexNow is an open protocol co-developed by Microsoft and Yandex. Submitting here immediately notifies <strong>Bing, Yandex, Seznam.cz, and Naver</strong> crawlers to index these URLs.
                </p>
              </div>

              {/* Selected URL count indicator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/70 dark:border-surface-700 text-xs">
                <span className="text-surface-600 dark:text-surface-300 font-medium">
                  Ready to submit <strong>{selectedUrls.length}</strong> URL{selectedUrls.length > 1 ? 's' : ''} to IndexNow
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Instant Crawl Push
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSubmitIndexNow}
                disabled={isSubmitting || selectedUrls.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Submitting to IndexNow...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Instant Submit {selectedUrls.length} URLs to IndexNow (Bing & Yandex)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: Google Indexing API */}
          {activeTab === 'GOOGLE' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-amber-900 dark:text-amber-200">
                  <Globe className="w-4 h-4 text-amber-600" />
                  <span>Direct Googlebot Crawl Notification (200 URLs / Day Free Quota)</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  Sends automated `URL_UPDATED` publish requests directly to <strong>Google Indexing API</strong>. Requires your free Google Cloud Service Account JSON key.
                </p>
              </div>

              {/* Service Account Input Card */}
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-surface-900 dark:text-white">
                      Google Service Account JSON Key
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-surface-700 border border-surface-300 dark:border-surface-600 hover:bg-surface-100 text-surface-700 dark:text-surface-200 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Upload .JSON File</span>
                      <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                    </label>

                    {savedClientEmail && (
                      <button
                        onClick={handleClearKey}
                        className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Remove Key
                      </button>
                    )}
                  </div>
                </div>

                {savedClientEmail ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate text-emerald-900 dark:text-emerald-200 font-mono">
                        {savedClientEmail}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 shrink-0">
                      SAVED LOCALLY
                    </span>
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={3}
                      value={serviceAccountJson}
                      onChange={(e) => setServiceAccountJson(e.target.value)}
                      placeholder='Paste contents of your Google Service Account JSON file here ({"type": "service_account", ...})'
                      className="w-full p-2.5 text-xs font-mono rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-surface-500">
                        🔒 Key is stored exclusively in your browser localStorage. Never saved on our server.
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleTestKey}
                          disabled={isValidatingKey || !serviceAccountJson.trim()}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-surface-300 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200"
                        >
                          {isValidatingKey ? 'Testing...' : 'Test Auth'}
                        </button>
                        <button
                          onClick={handleSaveKey}
                          disabled={!serviceAccountJson.trim()}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Save Key
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion: 2-Minute Setup Guide */}
              <div className="border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="w-full p-3 bg-surface-50 dark:bg-surface-800/60 flex items-center justify-between text-xs font-bold text-surface-800 dark:text-surface-200 hover:bg-surface-100 transition-colors"
                >
                  <span className="flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>📖 কীভাবে ২ মিনিটে ফ্রিতে Google Service Account Key তৈরি করবেন? (Free Setup Guide)</span>
                  </span>
                  {showSetupGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSetupGuide && (
                  <div className="p-4 bg-white dark:bg-surface-900 text-xs text-surface-700 dark:text-surface-300 space-y-3 border-t border-surface-200 dark:border-surface-800">
                    <div className="flex space-x-2 mb-2">
                      <button
                        onClick={() => setGuideLang('bn')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          guideLang === 'bn' ? 'bg-blue-600 text-white' : 'bg-surface-100 dark:bg-surface-800'
                        }`}
                      >
                        বাংলা
                      </button>
                      <button
                        onClick={() => setGuideLang('en')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          guideLang === 'en' ? 'bg-blue-600 text-white' : 'bg-surface-100 dark:bg-surface-800'
                        }`}
                      >
                        English
                      </button>
                    </div>

                    {guideLang === 'bn' ? (
                      <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                        <li>
                          <strong>Google Cloud Console</strong>-এ যান (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.cloud.google.com</a>) এবং একটি নতুন ফ্রি প্রজেক্ট তৈরি করুন।
                        </li>
                        <li>
                          <strong>"APIs & Services" &gt; "Library"</strong>-এ গিয়ে <strong>"Web Search Indexing API"</strong> লিখে সার্চ করুন এবং <strong>Enable</strong> করুন।
                        </li>
                        <li>
                          <strong>"IAM & Admin" &gt; "Service Accounts"</strong>-এ যান &gt; <strong>Create Service Account</strong>-এ ক্লিক করে একটি নাম দিয়ে তৈরি করুন (Role: Owner সিলেক্ট করুন)।
                        </li>
                        <li>
                          তৈরি করা Service Account-এর ওপর ক্লিক করে <strong>"Keys" &gt; "Add Key" &gt; "Create new key" (JSON)</strong> সিলেক্ট করুন। একটি `.json` ফাইল ডাউনলোড হবে।
                        </li>
                        <li>
                          সবশেষে আপনার <strong>Google Search Console</strong> (<a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-blue-600 underline">search-console</a>)-এ যান &gt; <strong>Settings &gt; Users & Permissions</strong> &gt; <strong>Add User</strong>-এ ক্লিক করে আপনার Service Account ইমেইলটি (যেমন: `xxx@xxx.iam.gserviceaccount.com`) <strong>Owner</strong> হিসেবে যোগ করে দিন।
                        </li>
                        <li>ডাউনলোড করা JSON ফাইলটি এখানে আপলোড করুন এবং এক ক্লিকে সাবমিট করুন!</li>
                      </ol>
                    ) : (
                      <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                        <li>Go to <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.cloud.google.com</a>) and create a free project.</li>
                        <li>Enable <strong>"Web Search Indexing API"</strong> under APIs & Services &gt; Library.</li>
                        <li>Create a <strong>Service Account</strong> under IAM & Admin &gt; Service Accounts (Role: Owner).</li>
                        <li>Under Keys tab, click <strong>Add Key &gt; Create new key (JSON)</strong> and download the key file.</li>
                        <li>Go to <strong>Google Search Console &gt; Settings &gt; Users & Permissions</strong> and add the Service Account email as an <strong>Owner</strong>.</li>
                        <li>Upload your JSON key above and click Push to Googlebot!</li>
                      </ol>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleSubmitGoogle}
                disabled={isSubmitting || selectedUrls.length === 0 || (!serviceAccountJson.trim() && !savedClientEmail)}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Pushing to Googlebot...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Push {Math.min(selectedUrls.length, 200)} URLs to Google Indexing API</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: Google Search Console Direct Deep Links */}
          {activeTab === 'GSC_DIRECT' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-purple-900 dark:text-purple-200">
                  <Search className="w-4 h-4 text-purple-600" />
                  <span>1-Click Official Google Search Console Inspection Links</span>
                </div>
                <p className="text-purple-800 dark:text-purple-300 leading-relaxed">
                  No API keys required. Click any URL below to directly open its <strong>URL Inspection</strong> page in Google Search Console, then click <strong>"Request Indexing"</strong>.
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedUrls.map((url, idx) => {
                  const gscLink = getGscUrl(url);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800/60 border border-surface-200/70 dark:border-surface-700 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-mono text-surface-800 dark:text-surface-200 truncate flex-1">
                        {url}
                      </span>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(url, `url-${idx}`)}
                          className="p-1.5 rounded text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-surface-700"
                          title="Copy URL"
                        >
                          {copiedUrl === `url-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={gscLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px]"
                        >
                          <span>Inspect in GSC</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submission Result / Logs */}
          {batchSummary && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                batchSummary.successCount > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold">
                {batchSummary.successCount > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>Submission Report: {batchSummary.message}</span>
              </div>

              {statusLogs.length > 0 && (
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {statusLogs.map((log, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded bg-white/70 dark:bg-surface-900/60 flex items-center justify-between gap-2"
                    >
                      <span className="truncate flex-1">{log.url}</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          log.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {log.success ? '✓ Sent' : '✕ Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-surface-500 dark:text-surface-400">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Secure Client-Side Key Storage</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
