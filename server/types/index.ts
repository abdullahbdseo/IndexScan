export type ProjectMode = 'AUDIT_ONLY' | 'SUGGEST_FIXES' | 'AUTO_FIX_SAFE' | 'AUTONOMOUS';

export type AdapterType = 'local_fs' | 'wordpress' | 'git' | 'sftp' | 'shopify' | 'generic_api';

export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type IssueCategory =
  | 'CRAWLABILITY'
  | 'INDEXABILITY'
  | 'TECHNICAL'
  | 'ON_PAGE'
  | 'CONTENT'
  | 'INTERNAL_LINKS'
  | 'EXTERNAL_LINKS'
  | 'IMAGES_MEDIA'
  | 'STRUCTURED_DATA'
  | 'SITEMAP'
  | 'ROBOTS_TXT'
  | 'MOBILE'
  | 'PERFORMANCE'
  | 'JAVASCRIPT'
  | 'INTERNATIONAL'
  | 'ECOMMERCE'
  | 'LOCAL_SEO'
  | 'SECURITY'
  | 'ACCESSIBILITY';

export type RootCauseType = 'TEMPLATE' | 'PAGE' | 'SERVER_CONFIG' | 'CONTENT' | 'ROBOTS_OR_SITEMAP' | 'METADATA';

export type IssueStatus =
  | 'DETECTED'
  | 'ANALYZING'
  | 'FIX_PLANNED'
  | 'AWAITING_APPROVAL'
  | 'FIXING'
  | 'VERIFYING'
  | 'FIXED'
  | 'VERIFICATION_FAILED'
  | 'ROLLED_BACK'
  | 'MANUAL_REQUIRED';

export type FixClassification = 'SAFE_AUTO_FIX' | 'REVIEW_REQUIRED' | 'MANUAL';

export interface Project {
  id: string;
  name: string;
  domain: string;
  cmsType?: string;
  renderingType?: string;
  mode: ProjectMode;
  maxCrawlUrls: number;
  crawlDepth: number;
  concurrency: number;
  autoFixThreshold: number; // e.g. 90
  maxAutonomousCycles: number;
  autoRollbackOnFailure: boolean;
  allowedFixCategories: IssueCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionConfig {
  id: string;
  projectId: string;
  adapterType: AdapterType;
  baseDirectory?: string;
  apiUrl?: string;
  apiKey?: string;
  username?: string;
  encryptedPassword?: string;
  gitRepoUrl?: string;
  gitBranch?: string;
  sshHost?: string;
  sshPort?: number;
  isActive: boolean;
  testedAt?: string;
  testStatus?: 'SUCCESS' | 'FAILED';
  testMessage?: string;
}

export interface CrawlSession {
  id: string;
  projectId: string;
  status: 'QUEUED' | 'CRAWLING' | 'AUDITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  urlsDiscovered: number;
  urlsCrawled: number;
  urlsFailed: number;
  maxDepthReached: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface CrawledPageData {
  id: string;
  crawlId: string;
  projectId: string;
  url: string;
  pathname: string;
  statusCode: number;
  responseTimeMs: number;
  contentType: string;
  htmlHash: string;
  depth: number;
  canonicalUrl?: string;
  title?: string;
  metaDescription?: string;
  metaRobots?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  jsonLdSchemas: any[];
  images: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    loading?: string;
    isExternal: boolean;
  }>;
  internalLinks: Array<{
    href: string;
    anchorText: string;
    rel?: string;
  }>;
  externalLinks: Array<{
    href: string;
    anchorText: string;
    rel?: string;
  }>;
  rawHeaders: Record<string, string>;
  htmlSize: number;
  wordCount: number;
  textRatio: number;
  hasViewport: boolean;
  viewportContent?: string;
  lang?: string;
  detectedTemplateId?: string;
}

export interface SeoIssue {
  id: string;
  projectId: string;
  crawlId: string;
  ruleId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  rootCauseType: RootCauseType;
  rootCauseSummary: string;
  templateIdentifier?: string;
  affectedCount: number;
  autoFixSupported: boolean;
  fixClassification: FixClassification;
  confidenceScore: number;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IssueInstance {
  id: string;
  issueId: string;
  projectId: string;
  crawlId: string;
  url: string;
  domSelector?: string;
  currentValue?: string;
  expectedValue?: string;
  evidence: string;
  status: IssueStatus;
  fixPlanId?: string;
}

export interface FixPlan {
  id: string;
  issueId: string;
  projectId: string;
  ruleId: string;
  targetType: 'FILE' | 'DATABASE_RECORD' | 'API_CONFIG' | 'TEMPLATE';
  targetPath: string;
  selectorOrField?: string;
  beforeContent: string;
  afterContent: string;
  diffSummary: string;
  explanation: string;
  impactScore: number; // 0-100
  riskScore: number; // 0-100
  confidenceScore: number; // 0-100
  classification: FixClassification;
  isApproved: boolean;
  createdAt: string;
}

export interface AppliedFix {
  id: string;
  fixPlanId: string;
  issueId: string;
  projectId: string;
  adapterType: AdapterType;
  backupId?: string;
  appliedContentHash: string;
  appliedAt: string;
  status: 'APPLIED' | 'VERIFIED' | 'FAILED' | 'ROLLED_BACK';
  executionLog: string;
}

export interface BackupSnapshot {
  id: string;
  projectId: string;
  fixPlanId?: string;
  targetPath: string;
  originalContent: string;
  contentHash: string;
  createdAt: string;
  isRestored: boolean;
  restoredAt?: string;
}

export interface VerificationResult {
  id: string;
  fixId: string;
  issueId: string;
  projectId: string;
  url: string;
  passed: boolean;
  beforeValue?: string;
  afterValue?: string;
  ruleEvaluationMessage: string;
  regressionDetected: boolean;
  regressionDetails?: string;
  verifiedAt: string;
}

export interface CategoryScore {
  category: IssueCategory;
  score: number; // 0-100
  weight: number;
  issuesCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

export interface SeoHealthScore {
  overallScore: number; // 0-100
  initialScore?: number;
  improvementDelta?: number;
  breakdown: Record<IssueCategory, CategoryScore>;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  fixedIssues: number;
  pendingReviewIssues: number;
  manualIssues: number;
  calculatedAt: string;
}

export interface AutonomousLoopState {
  cycleNumber: number;
  maxCycles: number;
  status: 'IDLE' | 'RUNNING' | 'STABILIZED' | 'STOPPED_MAX_CYCLES' | 'STOPPED_LOOP_DETECTED' | 'ERROR';
  currentPhase: 'CRAWLING' | 'AUDITING' | 'PLANNING_FIXES' | 'APPLYING_FIXES' | 'VERIFYING' | 'RE_AUDITING' | 'REPORTING';
  progressPercentage: number;
  phaseDetails: string;
  initialScore: number;
  currentScore: number;
  fixedTotal: number;
  verifiedTotal: number;
  failedTotal: number;
  rolledBackTotal: number;
  startedAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  projectId: string;
  action: string;
  category: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  timestamp: string;
}
