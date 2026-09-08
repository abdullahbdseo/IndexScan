import path from 'path';
import fs from 'fs';

// Lightweight persistent JSON-backed and better-sqlite3 compatible DB driver
export class DatabaseManager {
  private static instance: DatabaseManager;
  private dbPath: string;
  private memoryTables: Map<string, Map<string, any>> = new Map();
  private isBetterSqlite = false;
  private sqliteDb: any = null;

  private constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'apex_seo.db');
    this.init();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private init() {
    try {
      const Database = require('better-sqlite3');
      this.sqliteDb = new Database(this.dbPath);
      this.sqliteDb.pragma('journal_mode = WAL');
      this.isBetterSqlite = true;
      this.createSqliteTables();
    } catch (err) {
      console.warn('[DB] better-sqlite3 native binding fallback to structured JSON store:', (err as Error).message);
      this.initJsonStore();
    }
  }

  private createSqliteTables() {
    if (!this.sqliteDb) return;
    this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        cmsType TEXT,
        renderingType TEXT,
        mode TEXT NOT NULL,
        maxCrawlUrls INTEGER NOT NULL,
        crawlDepth INTEGER NOT NULL,
        concurrency INTEGER NOT NULL,
        autoFixThreshold INTEGER NOT NULL,
        maxAutonomousCycles INTEGER NOT NULL,
        autoRollbackOnFailure INTEGER NOT NULL,
        allowedFixCategories TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        adapterType TEXT NOT NULL,
        baseDirectory TEXT,
        apiUrl TEXT,
        apiKey TEXT,
        username TEXT,
        encryptedPassword TEXT,
        gitRepoUrl TEXT,
        gitBranch TEXT,
        sshHost TEXT,
        sshPort INTEGER,
        isActive INTEGER NOT NULL,
        testedAt TEXT,
        testStatus TEXT,
        testMessage TEXT
      );

      CREATE TABLE IF NOT EXISTS crawls (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        status TEXT NOT NULL,
        urlsDiscovered INTEGER NOT NULL,
        urlsCrawled INTEGER NOT NULL,
        urlsFailed INTEGER NOT NULL,
        maxDepthReached INTEGER NOT NULL,
        startedAt TEXT NOT NULL,
        completedAt TEXT,
        errorMessage TEXT
      );

      CREATE TABLE IF NOT EXISTS crawl_urls (
        id TEXT PRIMARY KEY,
        crawlId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        url TEXT NOT NULL,
        pathname TEXT NOT NULL,
        statusCode INTEGER NOT NULL,
        responseTimeMs INTEGER NOT NULL,
        contentType TEXT NOT NULL,
        htmlHash TEXT NOT NULL,
        depth INTEGER NOT NULL,
        canonicalUrl TEXT,
        title TEXT,
        metaDescription TEXT,
        metaRobots TEXT,
        headingsJson TEXT NOT NULL,
        openGraphJson TEXT NOT NULL,
        twitterCardJson TEXT NOT NULL,
        jsonLdSchemasJson TEXT NOT NULL,
        imagesJson TEXT NOT NULL,
        internalLinksJson TEXT NOT NULL,
        externalLinksJson TEXT NOT NULL,
        rawHeadersJson TEXT NOT NULL,
        htmlSize INTEGER NOT NULL,
        wordCount INTEGER NOT NULL,
        textRatio REAL NOT NULL,
        hasViewport INTEGER NOT NULL,
        viewportContent TEXT,
        lang TEXT,
        detectedTemplateId TEXT
      );

      CREATE TABLE IF NOT EXISTS seo_issues (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        crawlId TEXT NOT NULL,
        ruleId TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        rootCauseType TEXT NOT NULL,
        rootCauseSummary TEXT NOT NULL,
        templateIdentifier TEXT,
        affectedCount INTEGER NOT NULL,
        autoFixSupported INTEGER NOT NULL,
        fixClassification TEXT NOT NULL,
        confidenceScore REAL NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS issue_instances (
        id TEXT PRIMARY KEY,
        issueId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        crawlId TEXT NOT NULL,
        url TEXT NOT NULL,
        domSelector TEXT,
        currentValue TEXT,
        expectedValue TEXT,
        evidence TEXT NOT NULL,
        status TEXT NOT NULL,
        fixPlanId TEXT
      );

      CREATE TABLE IF NOT EXISTS fix_plans (
        id TEXT PRIMARY KEY,
        issueId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        ruleId TEXT NOT NULL,
        targetType TEXT NOT NULL,
        targetPath TEXT NOT NULL,
        selectorOrField TEXT,
        beforeContent TEXT NOT NULL,
        afterContent TEXT NOT NULL,
        diffSummary TEXT NOT NULL,
        explanation TEXT NOT NULL,
        impactScore INTEGER NOT NULL,
        riskScore INTEGER NOT NULL,
        confidenceScore REAL NOT NULL,
        classification TEXT NOT NULL,
        isApproved INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS applied_fixes (
        id TEXT PRIMARY KEY,
        fixPlanId TEXT NOT NULL,
        issueId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        adapterType TEXT NOT NULL,
        backupId TEXT,
        appliedContentHash TEXT NOT NULL,
        appliedAt TEXT NOT NULL,
        status TEXT NOT NULL,
        executionLog TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS backup_snapshots (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        fixPlanId TEXT,
        targetPath TEXT NOT NULL,
        originalContent TEXT NOT NULL,
        contentHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        isRestored INTEGER NOT NULL,
        restoredAt TEXT
      );

      CREATE TABLE IF NOT EXISTS verification_results (
        id TEXT PRIMARY KEY,
        fixId TEXT NOT NULL,
        issueId TEXT NOT NULL,
        projectId TEXT NOT NULL,
        url TEXT NOT NULL,
        passed INTEGER NOT NULL,
        beforeValue TEXT,
        afterValue TEXT,
        ruleEvaluationMessage TEXT NOT NULL,
        regressionDetected INTEGER NOT NULL,
        regressionDetails TEXT,
        verifiedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        details TEXT NOT NULL,
        severity TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        crawlId TEXT NOT NULL,
        overallScore INTEGER NOT NULL,
        initialScore INTEGER,
        improvementDelta INTEGER,
        reportDataJson TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_memory (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        memoryType TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT,
        confidence REAL NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        expiresAt TEXT
      );

      CREATE TABLE IF NOT EXISTS seo_tasks (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        issueId TEXT,
        fixPlanId TEXT,
        taskType TEXT NOT NULL,
        state TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        seoImpactScore INTEGER NOT NULL,
        businessImpactScore INTEGER NOT NULL,
        confidenceScore REAL NOT NULL,
        riskScore INTEGER NOT NULL,
        priorityScore INTEGER NOT NULL,
        affectedUrlsJson TEXT NOT NULL,
        affectedCount INTEGER NOT NULL,
        rootCause TEXT,
        isAutoExecutable INTEGER NOT NULL,
        requiresApproval INTEGER NOT NULL,
        attemptCount INTEGER NOT NULL,
        lastAttemptAt TEXT,
        lastError TEXT,
        executionTimeMs INTEGER,
        verificationResult TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        startedAt TEXT,
        completedAt TEXT
      );
    `);
  }

  private initJsonStore() {
    const jsonFile = path.join(path.dirname(this.dbPath), 'apex_store.json');
    const tableNames = [
      'projects', 'connections', 'crawls', 'crawl_urls',
      'seo_issues', 'issue_instances', 'fix_plans', 'applied_fixes',
      'backup_snapshots', 'verification_results', 'audit_logs', 'reports',
      'agent_memory', 'seo_tasks'
    ];
    for (const table of tableNames) {
      this.memoryTables.set(table, new Map());
    }

    if (fs.existsSync(jsonFile)) {
      try {
        const raw = fs.readFileSync(jsonFile, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [table, items] of Object.entries(parsed)) {
          const map = new Map();
          for (const item of items as any[]) {
            if (item && item.id) map.set(item.id, item);
          }
          this.memoryTables.set(table, map);
        }
      } catch (e) {
        console.error('[DB] Error loading json store:', e);
      }
    }
  }

  private persistJsonStore() {
    if (this.isBetterSqlite) return;
    const jsonFile = path.join(path.dirname(this.dbPath), 'apex_store.json');
    const exportData: Record<string, any[]> = {};
    for (const [table, map] of this.memoryTables.entries()) {
      exportData[table] = Array.from(map.values());
    }
    fs.writeFileSync(jsonFile, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  // Universal CRUD methods
  public insert(table: string, data: any): void {
    if (this.isBetterSqlite && this.sqliteDb) {
      const keys = Object.keys(data);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      const values = keys.map(k => {
        const val = data[k];
        if (typeof val === 'boolean') return val ? 1 : 0;
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return val;
      });
      this.sqliteDb.prepare(sql).run(...values);
    } else {
      const map = this.memoryTables.get(table) || new Map();
      map.set(data.id, { ...data });
      this.memoryTables.set(table, map);
      this.persistJsonStore();
    }
  }

  public update(table: string, id: string, updates: Partial<any>): void {
    if (this.isBetterSqlite && this.sqliteDb) {
      const existing = this.findById(table, id);
      if (!existing) return;
      const merged = { ...existing, ...updates };
      this.insert(table, merged);
    } else {
      const map = this.memoryTables.get(table);
      if (map && map.has(id)) {
        const current = map.get(id);
        map.set(id, { ...current, ...updates });
        this.persistJsonStore();
      }
    }
  }

  public findById(table: string, id: string): any | null {
    if (this.isBetterSqlite && this.sqliteDb) {
      const row = this.sqliteDb.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      return row ? this.normalizeRow(row) : null;
    } else {
      const map = this.memoryTables.get(table);
      return map ? (map.get(id) || null) : null;
    }
  }

  public find(table: string, filter?: Record<string, any>): any[] {
    if (this.isBetterSqlite && this.sqliteDb) {
      if (!filter || Object.keys(filter).length === 0) {
        const rows = this.sqliteDb.prepare(`SELECT * FROM ${table}`).all();
        return rows.map((r: any) => this.normalizeRow(r));
      }
      const keys = Object.keys(filter);
      const where = keys.map(k => `${k} = ?`).join(' AND ');
      const values = keys.map(k => {
        const v = filter[k];
        return typeof v === 'boolean' ? (v ? 1 : 0) : v;
      });
      const rows = this.sqliteDb.prepare(`SELECT * FROM ${table} WHERE ${where}`).all(...values);
      return rows.map((r: any) => this.normalizeRow(r));
    } else {
      const map = this.memoryTables.get(table);
      if (!map) return [];
      const list = Array.from(map.values());
      if (!filter) return list;
      return list.filter(item => {
        return Object.entries(filter).every(([k, v]) => item[k] === v);
      });
    }
  }

  public delete(table: string, id: string): void {
    if (this.isBetterSqlite && this.sqliteDb) {
      this.sqliteDb.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    } else {
      const map = this.memoryTables.get(table);
      if (map) {
        map.delete(id);
        this.persistJsonStore();
      }
    }
  }

  public deleteWhere(table: string, filter: Record<string, any>): void {
    if (this.isBetterSqlite && this.sqliteDb) {
      const keys = Object.keys(filter);
      const where = keys.map(k => `${k} = ?`).join(' AND ');
      const values = keys.map(k => filter[k]);
      this.sqliteDb.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...values);
    } else {
      const map = this.memoryTables.get(table);
      if (map) {
        for (const [id, item] of map.entries()) {
          const match = Object.entries(filter).every(([k, v]) => item[k] === v);
          if (match) map.delete(id);
        }
        this.persistJsonStore();
      }
    }
  }

  private normalizeRow(row: any): any {
    const res: any = { ...row };
    for (const [k, v] of Object.entries(res)) {
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try {
          res[k] = JSON.parse(v);
        } catch {}
      }
      if (k.endsWith('Json') && typeof v === 'string') {
        try {
          res[k.replace('Json', '')] = JSON.parse(v);
        } catch {}
      }
      if (typeof v === 'number' && (k.startsWith('is') || k.startsWith('has') || k === 'autoRollbackOnFailure' || k === 'passed' || k === 'regressionDetected' || k === 'isApproved' || k === 'isRestored' || k === 'autoFixSupported')) {
        res[k] = v === 1;
      }
    }
    return res;
  }
}

export const db = DatabaseManager.getInstance();
