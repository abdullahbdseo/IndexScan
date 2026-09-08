import { CrawledPageData, IssueCategory, IssueSeverity, RootCauseType, FixClassification } from '../../types/index.js';
import { WebsiteKnowledgeGraph } from '../crawler/knowledgeGraph.js';

export interface RuleEvaluationContext {
  page: CrawledPageData;
  allPages: CrawledPageData[];
  graph: WebsiteKnowledgeGraph;
  projectDomain: string;
}

export interface RuleDetectionOutput {
  isTriggered: boolean;
  evidence: string;
  currentValue?: string;
  expectedValue?: string;
  domSelector?: string;
  confidence: number;
}

export interface RuleFixProposal {
  targetType: 'FILE' | 'DATABASE_RECORD' | 'API_CONFIG' | 'TEMPLATE';
  targetPath: string;
  selectorOrField?: string;
  beforeContent: string;
  afterContent: string;
  diffSummary: string;
  explanation: string;
  impactScore: number;
  riskScore: number;
  confidenceScore: number;
  classification: FixClassification;
}

export interface SeoRule {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  rootCauseType: RootCauseType;
  autoFixSupported: boolean;
  evaluate(context: RuleEvaluationContext): RuleDetectionOutput | null;
  generateFix?(context: RuleEvaluationContext, detection: RuleDetectionOutput): RuleFixProposal | null;
  verifyFix?(newPageData: CrawledPageData, priorDetection: RuleDetectionOutput): { passed: boolean; message: string };
}
