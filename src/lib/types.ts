export type GoogleStatus = 'FOUND' | 'NOT FOUND' | 'UNKNOWN' | 'ERROR';

export type CanonicalStatus = 'SELF' | 'DIVERGENT' | 'MISSING' | 'UNKNOWN';

export type RobotsStatus = 'ALLOWED' | 'DISALLOWED' | 'NOINDEX' | 'UNKNOWN';

export interface UrlCheckResult {
  id: string;
  url: string;
  normalizedUrl: string;
  googleStatus: GoogleStatus;
  googleResultSnippet?: string;
  httpStatus?: number;
  canonicalUrl?: string;
  canonicalStatus?: CanonicalStatus;
  robotsPermission?: RobotsStatus;
  metaRobots?: string;
  xRobotsTag?: string;
  sitemapSource?: string;
  lastModified?: string;
  checkedAt?: string;
  errorMessage?: string;
  durationMs?: number;
}

export interface CheckSummary {
  websiteUrl: string;
  totalUrls: number;
  foundCount: number;
  notFoundCount: number;
  unknownCount: number;
  errorCount: number;
  observableRate: number; // percentage e.g. 68.4
  sitemapsFound: string[];
  robotsFound: boolean;
  startedAt: string;
  completedAt?: string;
  isDemo?: boolean;
}

export interface BulkValidationResult {
  validUrls: string[];
  duplicatesRemoved: number;
  invalidUrls: string[];
  rawCount: number;
}

export interface StepProgressItem {
  id: number;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;
}

export interface TechnicalAuditResult {
  httpStatus: number;
  finalUrl: string;
  isRedirect: boolean;
  redirectChain: string[];
  canonicalUrl: string | null;
  canonicalStatus: CanonicalStatus;
  metaRobots: string | null;
  xRobotsTag: string | null;
  hasNoindex: boolean;
  title: string | null;
  lastModifiedHeader: string | null;
  contentType: string | null;
}

export type IndexEngineType = 'INDEXNOW' | 'GOOGLE' | 'GSC_DIRECT';

export interface IndexRequestStatus {
  url: string;
  engine: IndexEngineType;
  success: boolean;
  message: string;
  statusCode?: number;
  timestamp: string;
}

