import { AgentMemory } from '../server/engine/agent/agentMemory.js';
import { TaskQueue } from '../server/engine/agent/taskQueue.js';
import { ALL_SEO_RULES } from '../server/engine/rules/coreRules.js';
import { WordPressAdapter } from '../server/adapters/RemoteAdapters.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n========================================');
  console.log('🚀 ApexSEO Autonomous Platform Test Suite');
  console.log('========================================\n');

  // --- Test Suite 1: Agent Memory ---
  console.log('📦 1. Testing Agent Memory System:');
  const testProjectId = 'test-proj-' + Date.now();
  
  AgentMemory.remember(
    testProjectId,
    'SITE_ARCHITECTURE',
    'cms_detected',
    'WordPress 6.4',
    { theme: 'Astra', isECommerce: true }
  );

  const recalled = AgentMemory.recall(testProjectId, 'SITE_ARCHITECTURE', 'cms_detected');
  assert(recalled !== null && recalled.value === 'WordPress 6.4', 'Store and recall memory entry');

  AgentMemory.recordFixOutcome(testProjectId, 'rule-canonical', '/products', 'SUCCESS', 'Added canonical tag');
  const fixOutcomes = AgentMemory.recallAll(testProjectId, 'FIX_OUTCOME');
  assert(fixOutcomes.length >= 1 && fixOutcomes[0].value === 'SUCCESS', 'Record and query fix outcome');

  AgentMemory.remember(testProjectId, 'REJECTED_FIX', 'rule-noindex::/staging', 'Staging intentional noindex');
  assert(AgentMemory.shouldSkipIssue(testProjectId, 'rule-noindex', '/staging'), 'Check rejected fix policy');

  const summary = AgentMemory.getSummary(testProjectId);
  assert(summary.totalMemories >= 3, 'Memory summary aggregates entries accurately');

  // --- Test Suite 2: Task Queue ---
  console.log('\n📋 2. Testing Task Queue with Priority Scoring:');
  const task = TaskQueue.createTask({
    projectId: testProjectId,
    taskType: 'METADATA_FIX',
    title: 'Fix Missing Title on Homepage',
    description: 'Add SEO title tag to root page',
    category: 'ON_PAGE',
    severity: 'HIGH',
    seoImpactScore: 90,
    businessImpactScore: 85,
    confidenceScore: 95,
    riskScore: 5,
    affectedUrls: ['https://example.com/'],
    isAutoExecutable: true
  });

  assert(task.id !== undefined && task.state === 'DISCOVERED', 'Enqueue task in DISCOVERED state');
  assert(task.priorityScore > 50, `Calculated priority score: ${task.priorityScore}`);

  const transitioned = TaskQueue.transitionState(task.id, 'EXECUTING');
  assert(transitioned !== null && transitioned.state === 'EXECUTING', 'Transition task state to EXECUTING');

  const completed = TaskQueue.transitionState(task.id, 'COMPLETED', { verificationResult: 'PASSED' });
  assert(completed !== null && completed.state === 'COMPLETED', 'Complete task with execution duration');

  const stats = TaskQueue.getStats(testProjectId);
  assert(stats.completed === 1 && stats.total === 1, 'Task queue stats calculate completed/total accurately');

  // --- Test Suite 3: SEO Rules Catalog ---
  console.log('\n🔍 3. Testing SEO Rules Catalog:');
  assert(ALL_SEO_RULES.length >= 40, `Rule catalog has 40+ comprehensive rules (found ${ALL_SEO_RULES.length})`);

  const ruleCategories = new Set(ALL_SEO_RULES.map(r => r.category));
  assert(ruleCategories.has('CRAWLABILITY'), 'Has CRAWLABILITY rules');
  assert(ruleCategories.has('INDEXABILITY'), 'Has INDEXABILITY rules');
  assert(ruleCategories.has('ON_PAGE'), 'Has ON_PAGE rules');
  assert(ruleCategories.has('PERFORMANCE'), 'Has PERFORMANCE rules');
  assert(ruleCategories.has('TECHNICAL'), 'Has TECHNICAL rules');
  assert(ruleCategories.has('MOBILE'), 'Has MOBILE rules');

  const autoFixable = ALL_SEO_RULES.filter(r => r.autoFixSupported);
  assert(autoFixable.length >= 10, `At least 10 rules support automated safe remediation (found ${autoFixable.length})`);

  // --- Test Suite 4: WordPress Adapter ---
  console.log('\n🔌 4. Testing WordPress REST API Adapter:');
  const wp = new WordPressAdapter();
  assert(wp.adapterType === 'wordpress', 'WordPress adapter type identifier');

  const authMissing = await wp.authenticate({
    id: '1',
    projectId: testProjectId,
    adapterType: 'wordpress',
    isActive: true
  });
  assert(!authMissing.success && authMissing.message.includes('required'), 'Rejects missing API URL');

  const permsRead = await wp.verifyPermissions({
    id: '1',
    projectId: testProjectId,
    adapterType: 'wordpress',
    apiUrl: 'https://demo.local/wp-json',
    isActive: true
  });
  assert(permsRead.canRead && !permsRead.canWrite, 'Detects read-only access when credentials absent');

  // --- Test Suite 5: Search Intent Classifier ---
  console.log('\n🎯 5. Testing Search Intent Classifier:');
  const { IntentClassifier } = await import('../server/engine/keyword/intentClassifier.js');
  
  const transIntent = IntentClassifier.classify('buy pure cotton saree online at best price with discount');
  assert(transIntent.primaryIntent === 'TRANSACTIONAL', `Identifies TRANSACTIONAL intent (got ${transIntent.primaryIntent})`);

  const infoIntent = IntentClassifier.classify('how to wash silk fabric care guide and tips');
  assert(infoIntent.primaryIntent === 'INFORMATIONAL', `Identifies INFORMATIONAL intent (got ${infoIntent.primaryIntent})`);

  const commIntent = IntentClassifier.classify('top 10 best cotton fabrics review and comparison');
  assert(commIntent.primaryIntent === 'COMMERCIAL', `Identifies COMMERCIAL intent (got ${commIntent.primaryIntent})`);

  // --- Test Suite 6: Keyword Engine & Cannibalization ---
  console.log('\n🔑 6. Testing Keyword Engine & Cannibalization:');
  const { KeywordEngine } = await import('../server/engine/keyword/keywordEngine.js');

  const mockPages: any[] = [
    {
      id: 'p1',
      url: 'https://example.com/cotton-saree',
      pathname: '/cotton-saree',
      depth: 1,
      statusCode: 200,
      responseTimeMs: 250,
      htmlSize: 15000,
      wordCount: 350,
      title: 'Pure Cotton Saree Online Shop | Premium Collection',
      metaDescription: 'Shop pure cotton saree with free shipping and best discounts.',
      headings: { h1: ['Pure Cotton Saree Collection'], h2: ['Best Cotton Fabrics', 'Customer Reviews'], h3: [], h4: [] },
      images: [{ src: '/img/saree1.jpg', alt: 'Cotton Saree', width: 800, height: 600, isExternal: false }],
      internalLinks: [{ href: 'https://example.com/silk-saree', anchorText: 'Silk Saree Collection' }],
      externalLinks: [],
      rawHeaders: {}
    },
    {
      id: 'p2',
      url: 'https://example.com/cotton-saree-deals',
      pathname: '/cotton-saree-deals',
      depth: 2,
      statusCode: 200,
      responseTimeMs: 320,
      htmlSize: 14000,
      wordCount: 300,
      title: 'Pure Cotton Saree Discount Deals | Best Price',
      metaDescription: 'Find pure cotton saree discounts and promo offers.',
      headings: { h1: ['Pure Cotton Saree Discounts'], h2: ['Special Cotton Offers'], h3: [], h4: [] },
      images: [{ src: '/img/saree2.jpg', alt: 'Cotton Saree Deal', isExternal: false }],
      internalLinks: [],
      externalLinks: [],
      rawHeaders: {}
    },
    {
      id: 'p3',
      url: 'https://example.com/silk-saree',
      pathname: '/silk-saree',
      depth: 1,
      statusCode: 200,
      responseTimeMs: 400,
      htmlSize: 18000,
      wordCount: 450,
      title: 'Handcrafted Silk Saree | Luxury Bridal Silk',
      metaDescription: 'Luxurious handcrafted silk saree for weddings and parties.',
      headings: { h1: ['Handcrafted Silk Saree'], h2: ['Silk Fabric Specifications', 'Care Instructions'], h3: [], h4: [] },
      images: [{ src: '/img/silk.webp', alt: 'Silk Saree', width: 600, height: 600, isExternal: false, loading: 'lazy' }],
      internalLinks: [],
      externalLinks: [],
      rawHeaders: {}
    }
  ];

  const keywordMatrix = KeywordEngine.analyzeProjectKeywords(mockPages);
  assert(keywordMatrix.totalUniqueKeywords > 5, `Extracts unique keyphrases (found ${keywordMatrix.totalUniqueKeywords})`);
  assert(keywordMatrix.cannibalizationIssues.length >= 1, `Detects cannibalization between pages targeting 'pure cotton saree'`);

  // --- Test Suite 7: Content & Readability Analyzer ---
  console.log('\n📝 7. Testing Content & Readability Analyzer:');
  const { ContentAnalyzer } = await import('../server/engine/content/contentAnalyzer.js');

  const contentReport = ContentAnalyzer.analyzePageContent(mockPages[0]);
  assert(contentReport.readability.fleschReadingEase > 0, `Calculated Flesch Reading Ease score: ${contentReport.readability.fleschReadingEase}`);
  assert(contentReport.headingAudit.h1Count === 1, 'Validates single authoritative H1');
  assert(contentReport.contentQualityScore >= 50, `Calculates content quality score: ${contentReport.contentQualityScore}/100`);

  // --- Test Suite 8: Performance & Core Web Vitals ---
  console.log('\n⚡ 8. Testing Performance Analyzer (Core Web Vitals):');
  const { PerformanceAnalyzer } = await import('../server/engine/performance/performanceAnalyzer.js');

  const perfReport = PerformanceAnalyzer.analyzePagePerformance(mockPages[1]); // has image missing width/height
  assert(perfReport.cwv.imagesWithoutDimensionsCount >= 1, 'Identifies image missing width/height dimensions (CLS risk)');
  assert(perfReport.speedOpportunities.length >= 1, `Generates speed recommendations (found ${perfReport.speedOpportunities.length})`);

  // --- Test Suite 9: Schema / Structured Data Generator ---
  console.log('\n🏷️ 9. Testing Schema / Structured Data Generator:');
  const { SchemaGenerator } = await import('../server/engine/schema/schemaGenerator.js');

  const rootPage: any = { ...mockPages[0], pathname: '/', depth: 0 };
  const schemas = SchemaGenerator.generateForPage(rootPage, 'example.com', 'Example Store');
  const orgSchema = schemas.find(s => s.schemaType === 'Organization');
  assert(orgSchema !== undefined && orgSchema.jsonLdObject['@type'] === 'Organization', 'Generates valid Organization JSON-LD');

  const breadcrumbs = SchemaGenerator.generateForPage(mockPages[0], 'example.com', 'Example Store');
  const crumbSchema = breadcrumbs.find(s => s.schemaType === 'BreadcrumbList');
  assert(crumbSchema !== undefined && crumbSchema.jsonLdObject.itemListElement.length >= 2, 'Generates valid BreadcrumbList JSON-LD hierarchy');

  // --- Test Suite 10: Contextual Internal Link Agent ---
  console.log('\n🔗 10. Testing Contextual Internal Link Agent:');
  const { InternalLinkAgent } = await import('../server/engine/linking/internalLinkAgent.js');

  const linkAudit = InternalLinkAgent.findOpportunities(mockPages);
  assert(linkAudit.totalOpportunities >= 1, `Discovered internal linking opportunities (found ${linkAudit.totalOpportunities})`);
  const opp = linkAudit.opportunities[0];
  assert(opp && opp.suggestedAnchorText.length > 0, `Suggested contextual anchor text: "${opp?.suggestedAnchorText}"`);

  // Summary
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
