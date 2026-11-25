import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import {
  AdversarialConfig,
  AdversarialReviewMode,
  AncillaryModelRegistryState,
  AntigravityAuthMethod,
  ChronologyFact,
  ClaudeIdleCompactionMode,
  CustomLegalMcpServer,
  DocumentCategory,
  DocumentVersion,
  LegalMessage,
  LLMProviderId,
  Matter,
  MatterDocument,
  MatterIssue,
  PracticeAreaId,
  PractitionerProfile,
  PractitionerProfileId,
  PrivacyRoutingSettings,
  ProviderConfig,
  ProviderDriverKind,
  ProviderEnvironmentVariable,
  RouteTier,
  RoutingDecisionLog,
  SystemPromptSettings,
  UpdateMatterPayload,
} from '../../shared/types';
import { CliAgentDriverManager } from '../agent/providers/CliAgentDriverManager';
import {
  DEFAULT_ADVERSARIAL_CONFIG,
  DEFAULT_PRACTITIONER_PROFILES,
  DEFAULT_SYSTEM_PROMPT_SETTINGS,
  SEEDED_CHRONOLOGY_FACTS,
  SEEDED_DOCUMENTS,
  SEEDED_DOCUMENT_VERSIONS,
  SEEDED_MATTERS,
  SEEDED_MESSAGES,
} from './defaultLegalData';
import {
  TUTORIAL_SAMPLE_CHRONOLOGY_FACTS,
  TUTORIAL_SAMPLE_DOCUMENTS,
  TUTORIAL_SAMPLE_DOCUMENT_VERSIONS,
  TUTORIAL_SAMPLE_ISSUES,
  TUTORIAL_SAMPLE_MATTER,
  TUTORIAL_SAMPLE_MATTER_ID,
  TUTORIAL_SAMPLE_MESSAGES,
} from './tutorialSampleCase';

export interface SecretEncryptor {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

const defaultEncryptor: SecretEncryptor = {
  encrypt: (plainText: string) => Buffer.from(plainText, 'utf8').toString('base64'),
  decrypt: (cipherText: string) => Buffer.from(cipherText, 'base64').toString('utf8'),
};

export const RETIRED_CLAUDE_MODEL_MIGRATIONS: Record<string, string> = {
  'claude-3-7-sonnet-latest': 'claude-sonnet-5-5',
  'claude-3-7-sonnet': 'claude-sonnet-5-5',
  'claude-3-7-sonnet-20250219': 'claude-sonnet-5-5',
  'claude-3-5-sonnet-latest': 'claude-sonnet-5-5',
  'claude-3-5-sonnet': 'claude-sonnet-5-5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-5-5',
  'claude-3-5-sonnet-20240620': 'claude-sonnet-5-5',
  'claude-3-5-haiku-latest': 'claude-haiku-5-5',
  'claude-3-5-haiku': 'claude-haiku-5-5',
  'claude-3-5-haiku-20241022': 'claude-haiku-5-5',
  'claude-3-haiku-20240307': 'claude-haiku-5-5',
  'claude-3-haiku-latest': 'claude-haiku-5-5',
  'claude-3-haiku': 'claude-haiku-5-5',
  'claude-3-opus-latest': 'claude-opus-5-5',
  'claude-3-opus': 'claude-opus-5-5',
  'claude-3-opus-20240229': 'claude-opus-5-5',
  'anthropic/claude-3.7-sonnet': 'anthropic/claude-sonnet-5-5',
};

export const LEGACY_DIRECT_PROVIDER_MIGRATIONS: Record<string, LLMProviderId> = {
  anthropic: 'claude-cli',
  openai: 'codex-cli',
  openrouter: 'codex-cli',
  gemini: 'agy-acp',
};

export function migrateLegacyDirectProviderId(
  providerId?: LLMProviderId | string
): LLMProviderId {
  if (!providerId) return 'codex-cli';
  const trimmed = providerId.trim();
  return (LEGACY_DIRECT_PROVIDER_MIGRATIONS[trimmed] || trimmed) as LLMProviderId;
}

export function migrateRetiredModelId(modelId?: string): string {
  if (!modelId) return '';
  const trimmed = modelId.trim();
  return RETIRED_CLAUDE_MODEL_MIGRATIONS[trimmed] || trimmed;
}

export const PROVIDER_CATALOG: Omit<ProviderConfig, 'hasApiKey' | 'maskedApiKey'>[] = [
  {
    id: 'codex-cli',
    driverKind: 'codex-cli',
    name: 'Codex',
    description:
      'OpenAI Codex agent with configurable reasoning effort, multi-account shadow homes, and native MCP research tools.',
    reasoningEffort: 'medium',
    runtimeMode: 'read-only',
    defaultModel: 'gpt-6-luna',
    availableModels: [
      { id: 'gpt-6.2-sol', label: 'GPT-6.2 Sol' },
      { id: 'gpt-6.2-astra', label: 'GPT-6.2 Astra' },
      { id: 'gpt-6.1-terra', label: 'GPT-6.1 Terra' },
      { id: 'gpt-6-luna', label: 'GPT-6 Luna' },
      { id: 'o3', label: 'OpenAI o3' },
      { id: 'o4-mini', label: 'OpenAI o4-mini' },
    ],
    enabled: true,
  },
  {
    id: 'claude-cli',
    driverKind: 'claude-agent-cli',
    name: 'Claude',
    description:
      'Anthropic Claude Code agent with configurable thinking effort, subscription or environment key auth, and native MCP tools.',
    reasoningEffort: 'high',
    runtimeMode: 'approval-required',
    defaultModel: 'claude-sonnet-5-5',
    availableModels: [
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-fable-5-2', label: 'Claude Fable 5.2' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
    ],
    enabled: true,
  },
  {
    id: 'agy-acp',
    driverKind: 'antigravity-acp',
    name: 'Antigravity',
    description:
      'Antigravity ACP agent supporting Gemini 4 and Claude 5.5 models with configurable thinking effort.',
    reasoningEffort: 'medium',
    runtimeMode: 'full-access',
    defaultModel: 'gemini-4-argon',
    availableModels: [
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon' },
      { id: 'gemini-4-neon', label: 'Gemini 4 Neon' },
      { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
    ],
    enabled: true,
  },
];

export interface CliRuntimeOverride {
  enabled?: boolean;
  displayName?: string;
  accentColor?: string;
  driverKind?: ProviderDriverKind;
  isCustomInstance?: boolean;
  binaryPath?: string;
  homePath?: string;
  shadowHomePath?: string;
  customArgs?: string;
  autoCompactWindow?: string;
  idleCompaction?: ClaudeIdleCompactionMode;
  authMethod?: AntigravityAuthMethod;
  gcpProject?: string;
  gcpLocation?: string;
  environmentVars?: ProviderEnvironmentVariable[];
  favoriteModels?: string[];
  hiddenModels?: string[];
  customModels?: { id: string; label: string }[];
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
}

export class LegalDatabase {
  private db!: SqlJsDatabase;
  private dbFilePath: string;
  private encryptor: SecretEncryptor;
  private storageDir: string;

  constructor(storageDir: string, encryptor: SecretEncryptor = defaultEncryptor) {
    this.storageDir = storageDir;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbFilePath = path.join(storageDir, 'lexharness.sqlite');
    this.encryptor = encryptor;
  }

  getStorageDir(): string {
    return this.storageDir;
  }

  async initialize(): Promise<void> {
    const SQL = await initSqlJs();
    if (fs.existsSync(this.dbFilePath)) {
      const fileBuffer = fs.readFileSync(this.dbFilePath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.seedOrMigrate();
    this.persist();
  }

  private persist(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbFilePath, buffer);
  }

  private createTables(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS matters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        matter_number TEXT NOT NULL,
        practice_area TEXT NOT NULL,
        jurisdiction TEXT NOT NULL,
        citation_style TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        settled INTEGER DEFAULT 0,
        settled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        category TEXT NOT NULL,
        bates_range TEXT NOT NULL,
        page_count INTEGER NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        matter_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        previous_content TEXT NOT NULL,
        rationale_summary TEXT NOT NULL,
        created_by_model TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chronology_facts (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        fact_date TEXT NOT NULL,
        event_description TEXT NOT NULL,
        source_citation TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS matter_issues (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        title TEXT NOT NULL,
        practice_area TEXT NOT NULL,
        description TEXT,
        specialist_role TEXT,
        parent_issue_id TEXT,
        relationship_to_parent TEXT,
        forked_from_message_id TEXT,
        settled INTEGER DEFAULT 0,
        settled_at TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        issue_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        is_edited INTEGER DEFAULT 0,
        initial_draft_before_review TEXT,
        primary_provider TEXT,
        primary_model TEXT,
        review_mode_used TEXT,
        assembled_system_prompt_snapshot TEXT,
        tool_calls_json TEXT NOT NULL,
        adversarial_reviews_json TEXT NOT NULL,
        revision_rounds_completed INTEGER DEFAULT 0,
        duration_ms INTEGER,
        route_tier TEXT,
        routing_log_id TEXT,
        pii_audit_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS key_value_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS provider_credentials (
        provider_id TEXT PRIMARY KEY,
        encrypted_api_key TEXT NOT NULL,
        base_url TEXT,
        default_model TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS routing_debug_logs (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        log_json TEXT NOT NULL
      );
    `);

    // Migrate messages table if existing DB had thread_id (which had legacy NOT NULL constraint)
    try {
      const tableInfo = this.db.exec('PRAGMA table_info(messages)');
      const cols = tableInfo[0]?.values?.map((row) => String(row[1])) || [];
      if (cols.includes('thread_id')) {
        this.db.run('DROP TABLE IF EXISTS messages_migration_temp;');
        this.db.run(`
          CREATE TABLE messages_migration_temp (
            id TEXT PRIMARY KEY,
            matter_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            initial_draft_before_review TEXT,
            primary_provider TEXT,
            primary_model TEXT,
            review_mode_used TEXT,
            assembled_system_prompt_snapshot TEXT,
            tool_calls_json TEXT NOT NULL,
            adversarial_reviews_json TEXT NOT NULL,
            revision_rounds_completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
          );
        `);

        const hasMatterId = cols.includes('matter_id');
        const threadsTableCheck = this.db.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='threads'"
        );
        const hasThreadsTable = Boolean(threadsTableCheck[0]?.values?.length);

        let selectMatterIdExpr: string;
        if (hasMatterId && hasThreadsTable) {
          selectMatterIdExpr = `COALESCE(
            CASE WHEN matter_id IN (SELECT id FROM matters) THEN matter_id ELSE NULL END,
            (SELECT matter_id FROM threads WHERE threads.id = messages.thread_id),
            'matter-vt-state-v-thorne'
          )`;
        } else if (hasMatterId) {
          selectMatterIdExpr = `COALESCE(
            CASE WHEN matter_id IN (SELECT id FROM matters) THEN matter_id ELSE NULL END,
            'matter-vt-state-v-thorne'
          )`;
        } else if (hasThreadsTable) {
          selectMatterIdExpr = `COALESCE(
            (SELECT matter_id FROM threads WHERE threads.id = messages.thread_id),
            'matter-vt-state-v-thorne'
          )`;
        } else {
          selectMatterIdExpr = "'matter-vt-state-v-thorne'";
        }

        this.db.run(`
          INSERT OR REPLACE INTO messages_migration_temp (
            id, matter_id, role, content, initial_draft_before_review,
            primary_provider, primary_model, review_mode_used,
            assembled_system_prompt_snapshot, tool_calls_json, adversarial_reviews_json,
            revision_rounds_completed, created_at
          )
          SELECT
            id,
            ${selectMatterIdExpr},
            role,
            content,
            initial_draft_before_review,
            primary_provider,
            primary_model,
            review_mode_used,
            assembled_system_prompt_snapshot,
            COALESCE(tool_calls_json, '[]'),
            COALESCE(adversarial_reviews_json, '[]'),
            COALESCE(revision_rounds_completed, 0),
            created_at
          FROM messages;
        `);

        this.db.run('DROP TABLE messages;');
        this.db.run('ALTER TABLE messages_migration_temp RENAME TO messages;');
      } else if (cols.length > 0 && !cols.includes('matter_id')) {
        this.db.run('ALTER TABLE messages ADD COLUMN matter_id TEXT');
        this.db.run("UPDATE messages SET matter_id = 'matter-vt-state-v-thorne' WHERE matter_id IS NULL");
      }

      // Ensure category and is_edited columns exist
      const refreshedInfo = this.db.exec('PRAGMA table_info(messages)');
      const refreshedCols = refreshedInfo[0]?.values?.map((row) => String(row[1])) || [];
      if (!refreshedCols.includes('category')) {
        this.db.run('ALTER TABLE messages ADD COLUMN category TEXT;');
      }
      if (!refreshedCols.includes('is_edited')) {
        this.db.run('ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0;');
      }
      if (!refreshedCols.includes('route_tier')) {
        this.db.run('ALTER TABLE messages ADD COLUMN route_tier TEXT;');
      }
      if (!refreshedCols.includes('routing_log_id')) {
        this.db.run('ALTER TABLE messages ADD COLUMN routing_log_id TEXT;');
      }
      if (!refreshedCols.includes('pii_audit_json')) {
        this.db.run('ALTER TABLE messages ADD COLUMN pii_audit_json TEXT;');
      }
      if (!refreshedCols.includes('issue_id')) {
        this.db.run('ALTER TABLE messages ADD COLUMN issue_id TEXT;');
      }
      if (!refreshedCols.includes('duration_ms')) {
        this.db.run('ALTER TABLE messages ADD COLUMN duration_ms INTEGER;');
      }

      const mattersInfo = this.db.exec('PRAGMA table_info(matters)');
      const mattersCols = mattersInfo[0]?.values?.map((row) => String(row[1])) || [];
      if (!mattersCols.includes('settled')) {
        this.db.run('ALTER TABLE matters ADD COLUMN settled INTEGER DEFAULT 0;');
      }
      if (!mattersCols.includes('settled_at')) {
        this.db.run('ALTER TABLE matters ADD COLUMN settled_at TEXT;');
      }

      const issuesInfo = this.db.exec('PRAGMA table_info(matter_issues)');
      const issuesCols = issuesInfo[0]?.values?.map((row) => String(row[1])) || [];
      if (issuesCols.length > 0) {
        if (!issuesCols.includes('relationship_to_parent')) {
          this.db.run('ALTER TABLE matter_issues ADD COLUMN relationship_to_parent TEXT;');
        }
        if (!issuesCols.includes('forked_from_message_id')) {
          this.db.run('ALTER TABLE matter_issues ADD COLUMN forked_from_message_id TEXT;');
        }
        if (!issuesCols.includes('settled')) {
          this.db.run('ALTER TABLE matter_issues ADD COLUMN settled INTEGER DEFAULT 0;');
        }
        if (!issuesCols.includes('settled_at')) {
          this.db.run('ALTER TABLE matter_issues ADD COLUMN settled_at TEXT;');
        }
      }
    } catch (err) {
      console.error('Failed migrating messages table schema:', err);
    }
  }

  private seedOrMigrate(): void {
    const existingMatters = this.listMatters();
    const hasSeededInitial = this.getKeyValue<boolean>('seeded_initial_matters');

    if (existingMatters.length === 0 && !hasSeededInitial) {
      for (const m of SEEDED_MATTERS) {
        this.insertMatter(m, false);
      }
      for (const doc of SEEDED_DOCUMENTS) {
        this.insertDocument(doc, false);
      }
      for (const ver of SEEDED_DOCUMENT_VERSIONS) {
        this.insertDocumentVersion(ver, false);
      }
      for (const fact of SEEDED_CHRONOLOGY_FACTS) {
        this.insertChronologyFact(fact, false);
      }
      for (const msg of SEEDED_MESSAGES) {
        this.insertMessage(msg, false);
      }
    }

    // Always record that initial seeding phase has occurred so matters never resurrect on app relaunch
    this.setKeyValue('seeded_initial_matters', true, false);

    const promptSettings = this.getKeyValue<SystemPromptSettings>(
      'system_prompt_settings'
    );
    if (
      !promptSettings ||
      !Array.isArray(promptSettings.profiles) ||
      promptSettings.profiles.length === 0
    ) {
      this.setKeyValue(
        'system_prompt_settings',
        DEFAULT_SYSTEM_PROMPT_SETTINGS,
        false
      );
    }

    const advConfig = this.getKeyValue<AdversarialConfig>('adversarial_config');
    if (!advConfig) {
      this.setKeyValue('adversarial_config', DEFAULT_ADVERSARIAL_CONFIG, false);
    }
  }

  private getKeyValue<T>(key: string): T | null {
    const stmt = this.db.prepare(
      'SELECT value_json FROM key_value_settings WHERE key = ?'
    );
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as { value_json: string };
      stmt.free();
      return JSON.parse(row.value_json) as T;
    }
    stmt.free();
    return null;
  }

  private setKeyValue<T>(key: string, value: T, flush = true): void {
    this.db.run(
      `INSERT OR REPLACE INTO key_value_settings (key, value_json, updated_at) VALUES (?, ?, ?)`,
      [key, JSON.stringify(value), new Date().toISOString()]
    );
    if (flush) this.persist();
  }

  getLastActiveMatterId(): string | null {
    return this.getKeyValue<string>('last_active_matter_id');
  }

  setLastActiveMatterId(matterId: string, flush = true): void {
    this.setKeyValue('last_active_matter_id', matterId, flush);
  }

  generateNextMatterNumber(practiceArea?: PracticeAreaId): string {
    const existingNumbers = new Set(
      this.listMatters().map((m) => m.matterNumber.split(' ')[0].trim().toUpperCase())
    );
    const yearPrefix = String(new Date().getFullYear()).slice(-2);
    const isCriminal = !practiceArea || practiceArea.startsWith('vt_');
    const typeCode = isCriminal ? 'CR' : 'CV';

    let seq = 1;
    while (seq < 99999) {
      const candidate = `${yearPrefix}-${typeCode}-${String(seq).padStart(5, '0')}`;
      if (!existingNumbers.has(candidate.toUpperCase())) {
        return candidate;
      }
      seq++;
    }
    return `${yearPrefix}-${typeCode}-${Date.now().toString().slice(-5)}`;
  }

  // --- Matters ---
  listMatters(): Matter[] {
    const stmt = this.db.prepare('SELECT * FROM matters ORDER BY updated_at DESC');
    const results: Matter[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        id: String(row.id),
        name: String(row.name),
        clientName: String(row.client_name),
        matterNumber: String(row.matter_number),
        practiceArea: String(row.practice_area) as PracticeAreaId,
        jurisdiction: String(row.jurisdiction),
        citationStyle: String(row.citation_style),
        folderPath: String(row.folder_path),
        settled: Boolean(row.settled),
        settledAt: row.settled_at ? String(row.settled_at) : undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      });
    }
    stmt.free();
    return results;
  }

  getMatter(matterId: string): Matter | null {
    const matters = this.listMatters();
    return matters.find((m) => m.id === matterId) ?? matters[0] ?? null;
  }

  insertMatter(matter: Matter, flush = true): Matter {
    this.db.run(
      `INSERT OR REPLACE INTO matters (id, name, client_name, matter_number, practice_area, jurisdiction, citation_style, folder_path, settled, settled_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matter.id,
        matter.name,
        matter.clientName,
        matter.matterNumber,
        matter.practiceArea,
        matter.jurisdiction,
        matter.citationStyle,
        matter.folderPath,
        matter.settled ? 1 : 0,
        matter.settledAt ?? null,
        matter.createdAt,
        matter.updatedAt,
      ]
    );
    if (flush) this.persist();
    return matter;
  }

  updateMatter(payload: UpdateMatterPayload): Matter | null {
    const existing = this.getMatter(payload.matterId);
    if (!existing) return null;
    const isSettled = payload.settled !== undefined ? payload.settled : existing.settled;
    const updated: Matter = {
      ...existing,
      name: payload.name.trim() || existing.name,
      clientName: payload.clientName.trim() || existing.clientName,
      matterNumber: payload.matterNumber.trim() || existing.matterNumber,
      practiceArea: payload.practiceArea || existing.practiceArea,
      jurisdiction: payload.jurisdiction.trim() || existing.jurisdiction,
      citationStyle: payload.citationStyle.trim() || existing.citationStyle,
      folderPath: payload.folderPath.trim() || existing.folderPath,
      settled: isSettled,
      settledAt:
        payload.settled === true
          ? existing.settledAt || new Date().toISOString()
          : payload.settled === false
          ? undefined
          : existing.settledAt,
      updatedAt: new Date().toISOString(),
    };
    return this.insertMatter(updated, true);
  }

  setMatterSettled(matterId: string, settled: boolean): Matter | null {
    const existing = this.listMatters().find((m) => m.id === matterId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated: Matter = {
      ...existing,
      settled,
      settledAt: settled ? now : undefined,
      updatedAt: now,
    };
    return this.insertMatter(updated, true);
  }

  updateMatterJurisdiction(
    matterId: string,
    updates: {
      jurisdiction: string;
      citationStyle: string;
      practiceArea: PracticeAreaId;
    }
  ): Matter | null {
    const existing = this.getMatter(matterId);
    if (!existing) return null;
    return this.updateMatter({
      matterId,
      name: existing.name,
      clientName: existing.clientName,
      matterNumber: existing.matterNumber,
      practiceArea: updates.practiceArea,
      jurisdiction: updates.jurisdiction,
      citationStyle: updates.citationStyle,
      folderPath: existing.folderPath,
    });
  }

  /**
   * Deletes a Matter and cascades deletion to all associated messages,
   * documents, document versions, and chronology facts.
   */
  deleteMatter(matterId: string): { remainingMatters: Matter[]; nextActiveMatterId: string } {
    this.db.run('DELETE FROM messages WHERE matter_id = ?', [matterId]);
    this.db.run('DELETE FROM matter_issues WHERE matter_id = ?', [matterId]);
    this.db.run('DELETE FROM document_versions WHERE matter_id = ?', [matterId]);
    this.db.run('DELETE FROM documents WHERE matter_id = ?', [matterId]);
    this.db.run('DELETE FROM chronology_facts WHERE matter_id = ?', [matterId]);
    this.db.run('DELETE FROM matters WHERE id = ?', [matterId]);

    const remaining = this.listMatters();
    const nextActiveMatterId = remaining.length > 0 ? remaining[0].id : '';
    this.setLastActiveMatterId(nextActiveMatterId, false);
    this.setKeyValue('seeded_initial_matters', true, false);
    this.persist();
    return {
      remainingMatters: remaining,
      nextActiveMatterId,
    };
  }

  // --- Tutorial Sample Casework (John Doe v State of Vermont) ---
  loadTutorialSampleCase(): Matter {
    this.insertMatter(TUTORIAL_SAMPLE_MATTER, false);
    for (const doc of TUTORIAL_SAMPLE_DOCUMENTS) {
      this.insertDocument(doc, false);
    }
    for (const ver of TUTORIAL_SAMPLE_DOCUMENT_VERSIONS) {
      this.insertDocumentVersion(ver, false);
    }
    for (const fact of TUTORIAL_SAMPLE_CHRONOLOGY_FACTS) {
      this.insertChronologyFact(fact, false);
    }
    for (const issue of TUTORIAL_SAMPLE_ISSUES) {
      this.insertIssue(issue, false);
    }
    for (const msg of TUTORIAL_SAMPLE_MESSAGES) {
      this.insertMessage(msg, false);
    }
    this.setActiveIssueId(TUTORIAL_SAMPLE_MATTER_ID, null, false);
    this.persist();
    return TUTORIAL_SAMPLE_MATTER;
  }

  closeTutorialSampleCase(
    sampleMatterId: string = TUTORIAL_SAMPLE_MATTER_ID,
    fallbackMatterId?: string,
    removeSample = false
  ): { activeMatterId: string } {
    if (removeSample) {
      const res = this.deleteMatter(sampleMatterId);
      const chosenFallback =
        fallbackMatterId && this.getMatter(fallbackMatterId)
          ? fallbackMatterId
          : res.nextActiveMatterId;
      return { activeMatterId: chosenFallback };
    }

    const matters = this.listMatters();
    if (fallbackMatterId && matters.some((m) => m.id === fallbackMatterId)) {
      return { activeMatterId: fallbackMatterId };
    }
    const nonSample = matters.find((m) => m.id !== sampleMatterId);
    return { activeMatterId: nonSample?.id ?? matters[0]?.id ?? sampleMatterId };
  }

  // --- Documents & Versions ---
  listDocuments(matterId: string): MatterDocument[] {
    const stmt = this.db.prepare(
      'SELECT * FROM documents WHERE matter_id = ? ORDER BY file_name ASC'
    );
    stmt.bind([matterId]);
    const docs: MatterDocument[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      docs.push({
        id: String(r.id),
        matterId: String(r.matter_id),
        title: String(r.title),
        fileName: String(r.file_name),
        category: r.category as MatterDocument['category'],
        batesRange: String(r.bates_range),
        pageCount: Number(r.page_count),
        summary: String(r.summary),
        content: String(r.content),
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      });
    }
    stmt.free();
    return docs;
  }

  insertDocument(doc: MatterDocument, flush = true): MatterDocument {
    this.db.run(
      `INSERT OR REPLACE INTO documents (id, matter_id, title, file_name, category, bates_range, page_count, summary, content, created_at, updated_at)` +
        ` VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.id,
        doc.matterId,
        doc.title,
        doc.fileName,
        doc.category,
        doc.batesRange,
        doc.pageCount,
        doc.summary,
        doc.content,
        doc.createdAt,
        doc.updatedAt,
      ]
    );
    if (flush) this.persist();
    return doc;
  }

  updateDocument(
    docId: string,
    payload: {
      title?: string;
      content?: string;
      category?: DocumentCategory;
      batesRange?: string;
      summary?: string;
    },
    flush = true
  ): MatterDocument | null {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?');
    stmt.bind([docId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const r = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();

    const newContent = payload.content !== undefined ? payload.content : String(r.content);
    const updated: MatterDocument = {
      id: String(r.id),
      matterId: String(r.matter_id),
      title: payload.title !== undefined ? payload.title.trim() : String(r.title),
      fileName: String(r.file_name),
      category: (payload.category || r.category) as DocumentCategory,
      batesRange: payload.batesRange !== undefined ? payload.batesRange.trim() : String(r.bates_range),
      pageCount: Math.max(1, Math.ceil(newContent.length / 1800)),
      summary: payload.summary !== undefined ? payload.summary.trim() : String(r.summary),
      content: newContent,
      createdAt: String(r.created_at),
      updatedAt: new Date().toISOString(),
    };

    return this.insertDocument(updated, flush);
  }

  listDocumentVersions(matterId: string): DocumentVersion[] {
    const stmt = this.db.prepare(
      'SELECT * FROM document_versions WHERE matter_id = ? ORDER BY version_number DESC'
    );
    stmt.bind([matterId]);
    const versions: DocumentVersion[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      versions.push({
        id: String(r.id),
        documentId: String(r.document_id),
        matterId: String(r.matter_id),
        versionNumber: Number(r.version_number),
        title: String(r.title),
        content: String(r.content),
        previousContent: String(r.previous_content),
        rationaleSummary: String(r.rationale_summary),
        createdByModel: String(r.created_by_model),
        createdAt: String(r.created_at),
      });
    }
    stmt.free();
    return versions;
  }

  insertDocumentVersion(ver: DocumentVersion, flush = true): DocumentVersion {
    this.db.run(
      `INSERT OR REPLACE INTO document_versions (id, document_id, matter_id, version_number, title, content, previous_content, rationale_summary, created_by_model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ver.id,
        ver.documentId,
        ver.matterId,
        ver.versionNumber,
        ver.title,
        ver.content,
        ver.previousContent,
        ver.rationaleSummary,
        ver.createdByModel,
        ver.createdAt,
      ]
    );
    if (flush) this.persist();
    return ver;
  }

  // --- Chronology Facts ---
  listChronologyFacts(matterId: string): ChronologyFact[] {
    const stmt = this.db.prepare(
      'SELECT * FROM chronology_facts WHERE matter_id = ? ORDER BY fact_date ASC'
    );
    stmt.bind([matterId]);
    const facts: ChronologyFact[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, string>;
      facts.push({
        id: r.id,
        matterId: r.matter_id,
        factDate: r.fact_date,
        eventDescription: r.event_description,
        sourceCitation: r.source_citation,
        status: r.status as ChronologyFact['status'],
        createdAt: r.created_at,
      });
    }
    stmt.free();
    return facts;
  }

  insertChronologyFact(fact: ChronologyFact, flush = true): ChronologyFact {
    this.db.run(
      `INSERT OR REPLACE INTO chronology_facts (id, matter_id, fact_date, event_description, source_citation, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fact.id,
        fact.matterId,
        fact.factDate,
        fact.eventDescription,
        fact.sourceCitation,
        fact.status,
        fact.createdAt,
      ]
    );
    if (flush) this.persist();
    return fact;
  }

  // --- Case Issues & Focused Counsel Inquiries ---
  private mapRowToIssue(r: Record<string, unknown>): MatterIssue {
    return {
      id: String(r.id),
      matterId: String(r.matter_id),
      title: String(r.title),
      practiceArea: String(r.practice_area) as PracticeAreaId,
      description: r.description ? String(r.description) : undefined,
      specialistRole: r.specialist_role ? String(r.specialist_role) : undefined,
      parentIssueId: r.parent_issue_id ? String(r.parent_issue_id) : undefined,
      relationshipToParent:
        r.relationship_to_parent === 'fork' || r.relationship_to_parent === 'specialist'
          ? r.relationship_to_parent
          : undefined,
      forkedFromMessageId: r.forked_from_message_id
        ? String(r.forked_from_message_id)
        : undefined,
      settled: Boolean(r.settled),
      settledAt: r.settled_at ? String(r.settled_at) : undefined,
      status: (r.status === 'synthesized' ? 'synthesized' : 'open') as 'open' | 'synthesized',
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  }

  listIssues(matterId: string): MatterIssue[] {
    const stmt = this.db.prepare(
      'SELECT * FROM matter_issues WHERE matter_id = ? ORDER BY created_at ASC'
    );
    stmt.bind([matterId]);
    const issues: MatterIssue[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      issues.push(this.mapRowToIssue(r));
    }
    stmt.free();
    return issues;
  }

  listAllIssues(): MatterIssue[] {
    const stmt = this.db.prepare('SELECT * FROM matter_issues ORDER BY updated_at DESC');
    const issues: MatterIssue[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      issues.push(this.mapRowToIssue(r));
    }
    stmt.free();
    return issues;
  }

  getIssue(issueId: string): MatterIssue | null {
    const stmt = this.db.prepare('SELECT * FROM matter_issues WHERE id = ?');
    stmt.bind([issueId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const r = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return this.mapRowToIssue(r);
  }

  insertIssue(issue: MatterIssue, flush = true): MatterIssue {
    this.db.run(
      `INSERT OR REPLACE INTO matter_issues (
        id, matter_id, title, practice_area, description, specialist_role,
        parent_issue_id, relationship_to_parent, forked_from_message_id,
        settled, settled_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        issue.id,
        issue.matterId,
        issue.title,
        issue.practiceArea,
        issue.description ?? null,
        issue.specialistRole ?? null,
        issue.parentIssueId ?? null,
        issue.relationshipToParent ?? null,
        issue.forkedFromMessageId ?? null,
        issue.settled ? 1 : 0,
        issue.settledAt ?? null,
        issue.status ?? 'open',
        issue.createdAt,
        issue.updatedAt,
      ]
    );
    if (flush) this.persist();
    return issue;
  }

  setIssueSettled(
    issueId: string,
    settled: boolean,
    flush = true
  ): MatterIssue | null {
    const existing = this.getIssue(issueId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated: MatterIssue = {
      ...existing,
      settled,
      settledAt: settled ? now : undefined,
      updatedAt: now,
    };
    return this.insertIssue(updated, flush);
  }

  /**
   * Forks a new Case Issue from an existing conversation checkpoint (or from the matter's
   * primary stream), copying the prior messages up to `upToMessageId` into the new Case Issue
   * just like T3 Code's `t3_thread_transfer({ action: 'fork' })`.
   */
  forkIssue(payload: {
    matterId: string;
    sourceIssueId?: string | null;
    upToMessageId?: string;
    title: string;
    practiceArea?: PracticeAreaId;
    specialistRole?: string;
    description?: string;
    relationshipToParent?: 'fork' | 'specialist';
  }): MatterIssue {
    const matter = this.getMatter(payload.matterId);
    const now = new Date().toISOString();
    const newIssueId = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const allMatterMessages = this.listMessages(payload.matterId);
    const sourceMessages = payload.sourceIssueId
      ? allMatterMessages.filter((m) => m.issueId === payload.sourceIssueId)
      : allMatterMessages.filter((m) => !m.issueId);

    let messagesToCopy = sourceMessages;
    if (payload.upToMessageId) {
      const stopIdx = sourceMessages.findIndex((m) => m.id === payload.upToMessageId);
      if (stopIdx >= 0) {
        messagesToCopy = sourceMessages.slice(0, stopIdx + 1);
      }
    }

    const newIssue: MatterIssue = {
      id: newIssueId,
      matterId: payload.matterId,
      title: payload.title.trim() || 'Forked Case Issue',
      practiceArea: payload.practiceArea || matter?.practiceArea || 'vt_suppression_art11',
      description: payload.description?.trim() || undefined,
      specialistRole: payload.specialistRole?.trim() || undefined,
      parentIssueId: payload.sourceIssueId || 'primary',
      relationshipToParent: payload.relationshipToParent || 'fork',
      forkedFromMessageId: payload.upToMessageId,
      settled: false,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    this.insertIssue(newIssue, false);

    messagesToCopy.forEach((msg, index) => {
      const clonedMsg: LegalMessage = {
        ...msg,
        id: `msg-fork-${newIssueId}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        matterId: payload.matterId,
        issueId: newIssueId,
      };
      this.insertMessage(clonedMsg, false);
    });

    this.setActiveIssueId(payload.matterId, newIssueId, false);
    this.persist();
    return newIssue;
  }

  updateIssueStatus(
    issueId: string,
    status: 'open' | 'synthesized',
    flush = true
  ): MatterIssue | null {
    const existing = this.getIssue(issueId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated: MatterIssue = {
      ...existing,
      status,
      settled: status === 'synthesized' ? true : existing.settled,
      settledAt: status === 'synthesized' ? existing.settledAt || now : existing.settledAt,
      updatedAt: now,
    };
    return this.insertIssue(updated, flush);
  }

  deleteIssue(issueId: string, flush = true): void {
    const existing = this.getIssue(issueId);
    this.db.run('DELETE FROM messages WHERE issue_id = ?', [issueId]);
    this.db.run('DELETE FROM matter_issues WHERE id = ?', [issueId]);
    if (existing) {
      const currentActive = this.getActiveIssueId(existing.matterId);
      if (currentActive === issueId) {
        this.setActiveIssueId(existing.matterId, null, false);
      }
    }
    if (flush) this.persist();
  }

  getActiveIssueId(matterId: string): string | null {
    if (!matterId) return null;
    const val = this.getKeyValue<string | null>(`active_issue_${matterId}`);
    if (!val) return null;
    return this.getIssue(val) ? val : null;
  }

  setActiveIssueId(matterId: string, issueId: string | null, flush = true): void {
    if (!matterId) return;
    this.setKeyValue(`active_issue_${matterId}`, issueId, flush);
  }

  // --- Matter Analysis Messages ---
  listMessages(matterId: string, issueId?: string | null): LegalMessage[] {
    const stmt = issueId
      ? this.db.prepare(
          'SELECT * FROM messages WHERE matter_id = ? AND issue_id = ? ORDER BY created_at ASC'
        )
      : this.db.prepare(
          'SELECT * FROM messages WHERE matter_id = ? ORDER BY created_at ASC'
        );
    stmt.bind(issueId ? [matterId, issueId] : [matterId]);
    const messages: LegalMessage[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const rawContent = String(r.content ?? '');
      const initialDraft = r.initial_draft_before_review
        ? String(r.initial_draft_before_review)
        : undefined;
      const effectiveContent =
        r.role === 'assistant' && !rawContent.trim() && initialDraft
          ? initialDraft
          : rawContent;
      messages.push({
        id: String(r.id),
        matterId: String(r.matter_id),
        issueId: r.issue_id ? String(r.issue_id) : undefined,
        role: r.role as 'user' | 'assistant',
        content: effectiveContent,
        category: (r.category ? String(r.category) : undefined) as LegalMessage['category'],
        isEditedByAttorney: Boolean(r.is_edited),
        initialDraftBeforeReview: initialDraft,
        primaryProvider: r.primary_provider
          ? (String(r.primary_provider) as LLMProviderId)
          : undefined,
        primaryModel: r.primary_model ? String(r.primary_model) : undefined,
        reviewModeUsed: r.review_mode_used
          ? (String(r.review_mode_used) as LegalMessage['reviewModeUsed'])
          : undefined,
        assembledSystemPromptSnapshot: r.assembled_system_prompt_snapshot
          ? String(r.assembled_system_prompt_snapshot)
          : undefined,
        toolCalls: JSON.parse(String(r.tool_calls_json || '[]')),
        adversarialReviews: JSON.parse(String(r.adversarial_reviews_json || '[]')),
        revisionRoundsCompleted: Number(r.revision_rounds_completed ?? 0),
        durationMs:
          r.duration_ms !== null && r.duration_ms !== undefined
            ? Number(r.duration_ms)
            : undefined,
        routeTier: r.route_tier ? (String(r.route_tier) as RouteTier) : undefined,
        routingLogId: r.routing_log_id ? String(r.routing_log_id) : undefined,
        piiAudit: r.pii_audit_json ? JSON.parse(String(r.pii_audit_json)) : undefined,
        createdAt: String(r.created_at),
      });
    }
    stmt.free();
    return messages;
  }

  insertMessage(msg: LegalMessage, flush = true): LegalMessage {
    this.db.run(
      `INSERT OR REPLACE INTO messages (
        id, matter_id, issue_id, role, content, category, is_edited, initial_draft_before_review,
        primary_provider, primary_model, review_mode_used,
        assembled_system_prompt_snapshot, tool_calls_json, adversarial_reviews_json,
        revision_rounds_completed, duration_ms, route_tier, routing_log_id, pii_audit_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.matterId,
        msg.issueId ?? null,
        msg.role,
        msg.content,
        msg.category ?? null,
        msg.isEditedByAttorney ? 1 : 0,
        msg.initialDraftBeforeReview ?? null,
        msg.primaryProvider ?? null,
        msg.primaryModel ?? null,
        msg.reviewModeUsed ?? null,
        msg.assembledSystemPromptSnapshot ?? null,
        JSON.stringify(msg.toolCalls ?? []),
        JSON.stringify(msg.adversarialReviews ?? []),
        msg.revisionRoundsCompleted ?? 0,
        msg.durationMs ?? null,
        msg.routeTier ?? null,
        msg.routingLogId ?? null,
        msg.piiAudit ? JSON.stringify(msg.piiAudit) : null,
        msg.createdAt,
      ]
    );
    if (flush) this.persist();
    return msg;
  }

  updateMessageContent(
    messageId: string,
    content: string,
    flush = true
  ): LegalMessage | null {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    stmt.bind([messageId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const r = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();

    this.db.run('UPDATE messages SET content = ?, is_edited = 1 WHERE id = ?', [
      content,
      messageId,
    ]);
    if (flush) this.persist();

    return {
      id: String(r.id),
      matterId: String(r.matter_id),
      issueId: r.issue_id ? String(r.issue_id) : undefined,
      role: r.role as 'user' | 'assistant',
      content,
      category: (r.category ? String(r.category) : undefined) as LegalMessage['category'],
      isEditedByAttorney: true,
      initialDraftBeforeReview: r.initial_draft_before_review
        ? String(r.initial_draft_before_review)
        : undefined,
      primaryProvider: r.primary_provider as LLMProviderId,
      primaryModel: r.primary_model ? String(r.primary_model) : undefined,
      reviewModeUsed: r.review_mode_used as AdversarialReviewMode,
      assembledSystemPromptSnapshot: r.assembled_system_prompt_snapshot
        ? String(r.assembled_system_prompt_snapshot)
        : undefined,
      toolCalls: r.tool_calls_json ? JSON.parse(String(r.tool_calls_json)) : [],
      adversarialReviews: r.adversarial_reviews_json
        ? JSON.parse(String(r.adversarial_reviews_json))
        : [],
      revisionRoundsCompleted: Number(r.revision_rounds_completed || 0),
      durationMs:
        r.duration_ms !== null && r.duration_ms !== undefined
          ? Number(r.duration_ms)
          : undefined,
      routeTier: r.route_tier ? (String(r.route_tier) as RouteTier) : undefined,
      routingLogId: r.routing_log_id ? String(r.routing_log_id) : undefined,
      piiAudit: r.pii_audit_json ? JSON.parse(String(r.pii_audit_json)) : undefined,
      createdAt: String(r.created_at),
    };
  }

  updateDocumentVersionContent(
    versionId: string,
    content: string,
    flush = true
  ): DocumentVersion | null {
    const stmt = this.db.prepare('SELECT * FROM document_versions WHERE id = ?');
    stmt.bind([versionId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const r = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();

    this.db.run('UPDATE document_versions SET content = ? WHERE id = ?', [content, versionId]);

    const docId = String(r.document_id);
    if (docId) {
      this.updateDocument(docId, { content }, false);
    }

    if (flush) this.persist();

    return {
      id: String(r.id),
      documentId: docId,
      matterId: String(r.matter_id),
      versionNumber: Number(r.version_number),
      title: String(r.title),
      content,
      previousContent: r.previous_content ? String(r.previous_content) : '',
      rationaleSummary: String(r.rationale_summary),
      createdByModel: String(r.created_by_model),
      createdAt: String(r.created_at),
    };
  }

  // --- Practitioner Profiles & User-Governed System Prompts ---
  getSystemPromptSettings(): SystemPromptSettings {
    const stored = this.getKeyValue<SystemPromptSettings>('system_prompt_settings');
    if (
      !stored ||
      !Array.isArray(stored.profiles) ||
      stored.profiles.length === 0
    ) {
      return DEFAULT_SYSTEM_PROMPT_SETTINGS;
    }
    return stored;
  }

  selectPractitionerProfile(profileId: PractitionerProfileId): SystemPromptSettings {
    const current = this.getSystemPromptSettings();
    const targetProfile: PractitionerProfile =
      current.profiles.find((p) => p.id === profileId) ??
      DEFAULT_PRACTITIONER_PROFILES.find((p) => p.id === profileId) ??
      DEFAULT_PRACTITIONER_PROFILES[0];

    const updated: SystemPromptSettings = {
      ...current,
      id: targetProfile.id,
      activeProfileId: targetProfile.id,
      coreLegalMandate: targetProfile.coreLegalMandate,
      practiceAreaPresets: targetProfile.practiceAreaPresets,
      activePracticeAreaId: targetProfile.activePracticeAreaId,
      criticCitationAuditorPrompt: targetProfile.criticCitationAuditorPrompt,
      criticOpposingCounselPrompt: targetProfile.criticOpposingCounselPrompt,
      updatedAt: new Date().toISOString(),
    };
    this.setKeyValue('system_prompt_settings', updated, true);
    return updated;
  }

  saveSystemPromptSettings(
    updated: Partial<SystemPromptSettings>
  ): SystemPromptSettings {
    const current = this.getSystemPromptSettings();
    const nextCore = updated.coreLegalMandate ?? current.coreLegalMandate;
    const nextPresets = updated.practiceAreaPresets ?? current.practiceAreaPresets;
    const nextActivePractice =
      updated.activePracticeAreaId ?? current.activePracticeAreaId;
    const nextAuditor =
      updated.criticCitationAuditorPrompt ?? current.criticCitationAuditorPrompt;
    const nextOpposing =
      updated.criticOpposingCounselPrompt ?? current.criticOpposingCounselPrompt;
    const activeProfileId = updated.activeProfileId ?? current.activeProfileId;

    const updatedProfiles = current.profiles.map((prof) =>
      prof.id === activeProfileId
        ? {
            ...prof,
            coreLegalMandate: nextCore,
            practiceAreaPresets: nextPresets,
            activePracticeAreaId: nextActivePractice,
            criticCitationAuditorPrompt: nextAuditor,
            criticOpposingCounselPrompt: nextOpposing,
          }
        : prof
    );

    const merged: SystemPromptSettings = {
      ...current,
      ...updated,
      activeProfileId,
      profiles: updatedProfiles,
      coreLegalMandate: nextCore,
      practiceAreaPresets: nextPresets,
      activePracticeAreaId: nextActivePractice,
      criticCitationAuditorPrompt: nextAuditor,
      criticOpposingCounselPrompt: nextOpposing,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.setKeyValue('system_prompt_settings', merged, true);
    return merged;
  }

  resetSystemPromptSettingsToDefault(): SystemPromptSettings {
    const current = this.getSystemPromptSettings();
    const activeId = current.activeProfileId || 'vt-criminal-defense';
    const defaultProfile =
      DEFAULT_PRACTITIONER_PROFILES.find((p) => p.id === activeId) ??
      DEFAULT_PRACTITIONER_PROFILES[0];

    const fresh: SystemPromptSettings = {
      id: defaultProfile.id,
      version: 1,
      activeProfileId: defaultProfile.id,
      profiles: JSON.parse(JSON.stringify(DEFAULT_PRACTITIONER_PROFILES)),
      coreLegalMandate: defaultProfile.coreLegalMandate,
      practiceAreaPresets: JSON.parse(
        JSON.stringify(defaultProfile.practiceAreaPresets)
      ),
      activePracticeAreaId: defaultProfile.activePracticeAreaId,
      criticCitationAuditorPrompt: defaultProfile.criticCitationAuditorPrompt,
      criticOpposingCounselPrompt: defaultProfile.criticOpposingCounselPrompt,
      updatedAt: new Date().toISOString(),
    };
    this.setKeyValue('system_prompt_settings', fresh, true);
    return fresh;
  }

  // --- Dynamic Provider Resolution & Adversarial Config ---
  resolveBestAvailableProvider(preferredId?: LLMProviderId): {
    providerId: LLMProviderId;
    model: string;
  } {
    const configs = this.listProviderConfigs();

    // 1. If preferredId is ready and authenticated, keep it
    if (preferredId) {
      const match = configs.find((p) => p.id === preferredId);
      if (match && match.hasApiKey) {
        return { providerId: match.id, model: match.defaultModel };
      }
    }

    // 2. Look for ready CLI agent harnesses in priority order: codex-cli -> agy-acp -> claude-cli
    const codex = configs.find((p) => p.id === 'codex-cli');
    if (codex && codex.hasApiKey) {
      return { providerId: 'codex-cli', model: codex.defaultModel };
    }
    const agy = configs.find((p) => p.id === 'agy-acp');
    if (agy && agy.hasApiKey) {
      return { providerId: 'agy-acp', model: agy.defaultModel };
    }
    const claude = configs.find((p) => p.id === 'claude-cli');
    if (claude && claude.hasApiKey) {
      return { providerId: 'claude-cli', model: claude.defaultModel };
    }

    // 3. Look for any HTTP provider with configured API key
    const anyReady = configs.find(
      (p) => p.hasApiKey && p.id !== 'legal-simulator'
    );
    if (anyReady) {
      return { providerId: anyReady.id, model: anyReady.defaultModel };
    }

    // 4. Fallback to installed CLI agent even if auth is pending
    if (codex?.runtimeStatus?.installed) {
      return { providerId: 'codex-cli', model: codex.defaultModel };
    }
    if (agy?.runtimeStatus?.installed) {
      return { providerId: 'agy-acp', model: agy.defaultModel };
    }

    return { providerId: 'codex-cli', model: 'gpt-6-luna' };
  }

  getAdversarialConfig(): AdversarialConfig {
    const stored =
      this.getKeyValue<AdversarialConfig>('adversarial_config') ??
      DEFAULT_ADVERSARIAL_CONFIG;

    const migratedPrimaryProvider = migrateLegacyDirectProviderId(
      stored.primaryProvider
    );
    const migratedAuditorProvider = migrateLegacyDirectProviderId(
      stored.citationAuditorProvider
    );
    const migratedOpposingProvider = migrateLegacyDirectProviderId(
      stored.opposingCounselProvider
    );

    const migratedPrimaryModel =
      migrateRetiredModelId(stored.primaryModel) || stored.primaryModel;
    const migratedAuditorModel =
      migrateRetiredModelId(stored.citationAuditorModel) ||
      stored.citationAuditorModel;
    const migratedOpposingModel =
      migrateRetiredModelId(stored.opposingCounselModel) ||
      stored.opposingCounselModel;

    const raw: AdversarialConfig = {
      ...stored,
      primaryProvider: migratedPrimaryProvider,
      citationAuditorProvider: migratedAuditorProvider,
      opposingCounselProvider: migratedOpposingProvider,
      primaryModel: migratedPrimaryModel,
      citationAuditorModel: migratedAuditorModel,
      opposingCounselModel: migratedOpposingModel,
    };

    const configMigrated =
      raw.primaryProvider !== stored.primaryProvider ||
      raw.citationAuditorProvider !== stored.citationAuditorProvider ||
      raw.opposingCounselProvider !== stored.opposingCounselProvider ||
      raw.primaryModel !== stored.primaryModel ||
      raw.citationAuditorModel !== stored.citationAuditorModel ||
      raw.opposingCounselModel !== stored.opposingCounselModel;

    // Auto-heal away from uninstalled CLI agents when no explicit credential override is stored
    const isCliPrimary =
      raw.primaryProvider === 'claude-cli' ||
      raw.primaryProvider === 'codex-cli' ||
      raw.primaryProvider === 'agy-acp';

    if (isCliPrimary && !this.hasStoredApiKey(raw.primaryProvider)) {
      const targetCfg = this.listProviderConfigs().find(
        (p) => p.id === raw.primaryProvider
      );
      if (!targetCfg?.runtimeStatus?.installed) {
        const resolved = this.resolveBestAvailableProvider(raw.primaryProvider);
        if (resolved.providerId !== raw.primaryProvider) {
          const updated: AdversarialConfig = {
            ...raw,
            primaryProvider: resolved.providerId,
            primaryModel: resolved.model,
          };
          this.setKeyValue('adversarial_config', updated, true);
          return updated;
        }
      }
    }

    if (configMigrated) {
      this.setKeyValue('adversarial_config', raw, true);
    }

    return raw;
  }

  saveAdversarialConfig(updated: Partial<AdversarialConfig>): AdversarialConfig {
    const current =
      this.getKeyValue<AdversarialConfig>('adversarial_config') ??
      DEFAULT_ADVERSARIAL_CONFIG;
    const merged: AdversarialConfig = {
      ...current,
      ...updated,
      primaryProvider: migrateLegacyDirectProviderId(
        updated.primaryProvider ?? current.primaryProvider
      ),
      citationAuditorProvider: migrateLegacyDirectProviderId(
        updated.citationAuditorProvider ?? current.citationAuditorProvider
      ),
      opposingCounselProvider: migrateLegacyDirectProviderId(
        updated.opposingCounselProvider ?? current.opposingCounselProvider
      ),
      primaryModel:
        migrateRetiredModelId(updated.primaryModel ?? current.primaryModel) ||
        (updated.primaryModel ?? current.primaryModel),
      citationAuditorModel:
        migrateRetiredModelId(
          updated.citationAuditorModel ?? current.citationAuditorModel
        ) || (updated.citationAuditorModel ?? current.citationAuditorModel),
      opposingCounselModel:
        migrateRetiredModelId(
          updated.opposingCounselModel ?? current.opposingCounselModel
        ) || (updated.opposingCounselModel ?? current.opposingCounselModel),
    };
    this.setKeyValue('adversarial_config', merged, true);
    return merged;
  }

  // --- CLI Runtime Overrides ---
  getCliOverrides(): Record<string, CliRuntimeOverride> {
    return this.getKeyValue<Record<string, CliRuntimeOverride>>('cli_runtime_overrides') ?? {};
  }

  // --- Provider Credentials & Configuration ---
  saveProviderCredential(params: {
    providerId: LLMProviderId;
    enabled?: boolean;
    name?: string;
    accentColor?: string;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    binaryPath?: string;
    homePath?: string;
    shadowHomePath?: string;
    customArgs?: string;
    autoCompactWindow?: string;
    idleCompaction?: ClaudeIdleCompactionMode;
    authMethod?: AntigravityAuthMethod;
    gcpProject?: string;
    gcpLocation?: string;
    environmentVars?: ProviderEnvironmentVariable[];
    favoriteModels?: string[];
    hiddenModels?: string[];
    customModels?: { id: string; label: string }[];
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  }): ProviderConfig[] {
    const targetProviderId = migrateLegacyDirectProviderId(params.providerId);
    const existing = this.getRawProviderRow(targetProviderId);
    const overrides = this.getCliOverrides();
    const prevOverride = overrides[targetProviderId] ?? {};
    const baseCatalogId =
      prevOverride.driverKind === 'codex-cli'
        ? 'codex-cli'
        : prevOverride.driverKind === 'claude-agent-cli'
          ? 'claude-cli'
          : prevOverride.driverKind === 'antigravity-acp'
            ? 'agy-acp'
            : targetProviderId;
    const catalogEntry = PROVIDER_CATALOG.find((p) => p.id === baseCatalogId);
    const defaultModel =
      params.defaultModel ??
      existing?.default_model ??
      catalogEntry?.defaultModel ??
      '';
    const baseUrl =
      params.baseUrl ?? existing?.base_url ?? catalogEntry?.baseUrl ?? '';

    let encryptedKey = existing?.encrypted_api_key ?? '';
    if (params.apiKey !== undefined) {
      encryptedKey =
        params.apiKey.trim().length > 0
          ? this.encryptor.encrypt(params.apiKey.trim())
          : '';
    }

    this.db.run(
      `INSERT OR REPLACE INTO provider_credentials (provider_id, encrypted_api_key, base_url, default_model, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        targetProviderId,
        encryptedKey,
        baseUrl,
        defaultModel,
        new Date().toISOString(),
      ]
    );

    const hasOverrideChange =
      params.enabled !== undefined ||
      params.name !== undefined ||
      params.accentColor !== undefined ||
      params.binaryPath !== undefined ||
      params.homePath !== undefined ||
      params.shadowHomePath !== undefined ||
      params.customArgs !== undefined ||
      params.autoCompactWindow !== undefined ||
      params.idleCompaction !== undefined ||
      params.authMethod !== undefined ||
      params.gcpProject !== undefined ||
      params.gcpLocation !== undefined ||
      params.environmentVars !== undefined ||
      params.favoriteModels !== undefined ||
      params.hiddenModels !== undefined ||
      params.customModels !== undefined ||
      params.reasoningEffort !== undefined ||
      params.runtimeMode !== undefined;

    if (hasOverrideChange) {
      overrides[targetProviderId] = {
        ...prevOverride,
        enabled: params.enabled !== undefined ? params.enabled : prevOverride.enabled,
        displayName:
          params.name !== undefined ? params.name.trim() : prevOverride.displayName,
        accentColor:
          params.accentColor !== undefined
            ? params.accentColor.trim()
            : prevOverride.accentColor,
        binaryPath:
          params.binaryPath !== undefined
            ? params.binaryPath.trim()
            : prevOverride.binaryPath,
        homePath:
          params.homePath !== undefined
            ? params.homePath.trim()
            : prevOverride.homePath,
        shadowHomePath:
          params.shadowHomePath !== undefined
            ? params.shadowHomePath.trim()
            : prevOverride.shadowHomePath,
        customArgs:
          params.customArgs !== undefined
            ? params.customArgs.trim()
            : prevOverride.customArgs,
        autoCompactWindow:
          params.autoCompactWindow !== undefined
            ? params.autoCompactWindow.trim()
            : prevOverride.autoCompactWindow,
        idleCompaction: params.idleCompaction ?? prevOverride.idleCompaction,
        authMethod: params.authMethod ?? prevOverride.authMethod,
        gcpProject:
          params.gcpProject !== undefined
            ? params.gcpProject.trim()
            : prevOverride.gcpProject,
        gcpLocation:
          params.gcpLocation !== undefined
            ? params.gcpLocation.trim()
            : prevOverride.gcpLocation,
        environmentVars: params.environmentVars ?? prevOverride.environmentVars,
        favoriteModels: params.favoriteModels ?? prevOverride.favoriteModels,
        hiddenModels: params.hiddenModels ?? prevOverride.hiddenModels,
        customModels: params.customModels ?? prevOverride.customModels,
        reasoningEffort: params.reasoningEffort ?? prevOverride.reasoningEffort,
        runtimeMode: params.runtimeMode ?? prevOverride.runtimeMode,
      };
      this.setKeyValue('cli_runtime_overrides', overrides, false);
    }

    CliAgentDriverManager.invalidateStatusCache();
    this.persist();
    return this.listProviderConfigs();
  }

  addProviderInstance(params: {
    driverKind: 'codex-cli' | 'claude-agent-cli' | 'antigravity-acp';
    name?: string;
    displayName?: string;
    instanceId?: string;
    accentColor?: string;
    binaryPath?: string;
    homePath?: string;
    shadowHomePath?: string;
    customArgs?: string;
    authMethod?: AntigravityAuthMethod;
    gcpProject?: string;
    gcpLocation?: string;
  }): { providers: ProviderConfig[]; createdId: LLMProviderId } {
    const overrides = this.getCliOverrides();
    const basePrefix =
      params.driverKind === 'codex-cli'
        ? 'codex'
        : params.driverKind === 'claude-agent-cli'
          ? 'claude'
          : 'antigravity';
    const rawName = (params.name ?? params.displayName ?? '').trim();
    const rawSlug = (params.instanceId || rawName || 'instance')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48);
    let candidateId = rawSlug.startsWith(`${basePrefix}_`)
      ? rawSlug
      : `${basePrefix}_${rawSlug || Date.now().toString(36)}`;
    let suffix = 2;
    const existingIds = new Set([
      ...PROVIDER_CATALOG.map((p) => p.id),
      ...Object.keys(overrides),
    ]);
    while (existingIds.has(candidateId)) {
      candidateId = `${basePrefix}_${rawSlug}_${suffix++}`;
    }

    const cleanLabel = rawName || `${basePrefix} (${rawSlug})`;
    const defaultShadowHome =
      params.driverKind === 'codex-cli'
        ? params.shadowHomePath?.trim() || `~/.codex-t3/${rawSlug || 'personal'}`
        : '';

    overrides[candidateId] = {
      isCustomInstance: true,
      driverKind: params.driverKind,
      enabled: true,
      displayName: cleanLabel,
      accentColor: params.accentColor?.trim() || undefined,
      binaryPath: params.binaryPath?.trim() || undefined,
      homePath: params.homePath?.trim() || undefined,
      shadowHomePath: defaultShadowHome || undefined,
      customArgs: params.customArgs?.trim() || undefined,
      authMethod: params.authMethod || 'oauth-personal',
      gcpProject: params.gcpProject?.trim() || undefined,
      gcpLocation: params.gcpLocation?.trim() || undefined,
    };
    this.setKeyValue('cli_runtime_overrides', overrides, true);
    CliAgentDriverManager.invalidateStatusCache();
    return {
      providers: this.listProviderConfigs(),
      createdId: candidateId,
    };
  }

  deleteOrResetProviderInstance(providerId: LLMProviderId): ProviderConfig[] {
    const overrides = this.getCliOverrides();
    const isDefaultCatalog = PROVIDER_CATALOG.some((p) => p.id === providerId);
    delete overrides[providerId];
    this.setKeyValue('cli_runtime_overrides', overrides, false);

    if (!isDefaultCatalog) {
      this.db.run('DELETE FROM provider_credentials WHERE provider_id = ?', [
        providerId,
      ]);
      // Also remove if it was in additionalCodexAccounts
      const onboarding = this.getAgentOnboardingSavedState();
      if (
        onboarding.additionalCodexAccounts.some(
          (a) => a.instanceId === providerId
        )
      ) {
        onboarding.additionalCodexAccounts =
          onboarding.additionalCodexAccounts.filter(
            (a) => a.instanceId !== providerId
          );
        this.setKeyValue('agent_onboarding_state', onboarding, false);
      }
    }
    CliAgentDriverManager.invalidateStatusCache();
    this.persist();
    return this.listProviderConfigs();
  }

  // --- Base Legal Tooling: CourtListener MCP Token ---
  saveCourtListenerToken(token: string): void {
    const trimmed = token.trim();
    const encrypted = trimmed ? this.encryptor.encrypt(trimmed) : '';
    this.setKeyValue('courtlistener_api_token_encrypted', encrypted, true);
    if (trimmed) {
      process.env.COURTLISTENER_API_TOKEN = trimmed;
    } else {
      delete process.env.COURTLISTENER_API_TOKEN;
    }
  }

  getCourtListenerToken(): string | null {
    const encrypted = this.getKeyValue<string>('courtlistener_api_token_encrypted');
    if (encrypted) {
      try {
        const decrypted = this.encryptor.decrypt(encrypted);
        if (decrypted && decrypted.trim().length > 0) return decrypted.trim();
      } catch {
        // Fallback
      }
    }
    return process.env.COURTLISTENER_API_TOKEN || null;
  }

  // --- Custom Legal MCP Servers ---
  listCustomMcpServers(): CustomLegalMcpServer[] {
    return this.getKeyValue<CustomLegalMcpServer[]>('custom_mcp_servers') ?? [];
  }

  saveCustomMcpServer(server: CustomLegalMcpServer): CustomLegalMcpServer[] {
    const current = this.listCustomMcpServers();
    const existingIndex = current.findIndex((s) => s.id === server.id);
    let next: CustomLegalMcpServer[];
    if (existingIndex >= 0) {
      next = [...current];
      next[existingIndex] = server;
    } else {
      next = [...current, server];
    }
    this.setKeyValue('custom_mcp_servers', next, true);
    return next;
  }

  deleteCustomMcpServer(serverId: string): CustomLegalMcpServer[] {
    const current = this.listCustomMcpServers();
    const next = current.filter((s) => s.id !== serverId);
    this.setKeyValue('custom_mcp_servers', next, true);
    return next;
  }

  private getRawProviderRow(providerId: LLMProviderId): {
    provider_id: string;
    encrypted_api_key: string;
    base_url: string;
    default_model: string;
  } | null {
    const stmt = this.db.prepare(
      'SELECT * FROM provider_credentials WHERE provider_id = ?'
    );
    stmt.bind([providerId]);
    if (stmt.step()) {
      const r = stmt.getAsObject() as {
        provider_id: string;
        encrypted_api_key: string;
        base_url: string;
        default_model: string;
      };
      stmt.free();
      return r;
    }
    stmt.free();
    return null;
  }

  hasStoredApiKey(providerId: LLMProviderId): boolean {
    const targetId = migrateLegacyDirectProviderId(providerId);
    const row = this.getRawProviderRow(targetId) || this.getRawProviderRow(providerId);
    if (!row || !row.encrypted_api_key) return false;
    try {
      const decrypted = this.encryptor.decrypt(row.encrypted_api_key);
      return Boolean(decrypted && decrypted.trim().length > 0);
    } catch {
      return false;
    }
  }

  getDecryptedApiKey(providerId: LLMProviderId): string | null {
    const targetId = migrateLegacyDirectProviderId(providerId);
    const envMap: Record<LLMProviderId, string | undefined> = {
      'agy-acp': process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      'codex-cli': process.env.OPENAI_API_KEY,
      'claude-cli': process.env.ANTHROPIC_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
      'legal-simulator': 'simulator-built-in-key',
    };

    const row = this.getRawProviderRow(targetId) || this.getRawProviderRow(providerId);
    if (row && row.encrypted_api_key) {
      try {
        const decrypted = this.encryptor.decrypt(row.encrypted_api_key);
        if (decrypted) return decrypted;
      } catch {
        // Fallback to env if decryption fails
      }
    }
    return envMap[targetId] ?? envMap[providerId] ?? null;
  }

  listProviderConfigs(): ProviderConfig[] {
    const cliOverrides = this.getCliOverrides();
    const rawAdv =
      this.getKeyValue<AdversarialConfig>('adversarial_config') ??
      DEFAULT_ADVERSARIAL_CONFIG;
    const rawPrivacy = this.getKeyValue<PrivacyRoutingSettings>(
      'privacy_routing_settings'
    );
    const ancillaryRegistry =
      this.getKeyValue<AncillaryModelRegistryState>('ancillary_model_registry');

    // Combine catalog default providers + any user-added provider instances
    const catalogAndCustomEntries: {
      cat: Omit<ProviderConfig, 'hasApiKey' | 'maskedApiKey'>;
      baseCliId: 'codex-cli' | 'claude-cli' | 'agy-acp' | 'legal-simulator';
      isDefaultInstance: boolean;
    }[] = PROVIDER_CATALOG.map((cat) => ({
      cat,
      baseCliId: cat.id as 'codex-cli' | 'claude-cli' | 'agy-acp' | 'legal-simulator',
      isDefaultInstance: true,
    }));

    for (const [instanceId, ov] of Object.entries(cliOverrides)) {
      if (!ov.isCustomInstance) continue;
      if (PROVIDER_CATALOG.some((c) => c.id === instanceId)) continue;
      const baseCliId: 'codex-cli' | 'claude-cli' | 'agy-acp' =
        ov.driverKind === 'claude-agent-cli'
          ? 'claude-cli'
          : ov.driverKind === 'antigravity-acp'
            ? 'agy-acp'
            : 'codex-cli';
      const template =
        PROVIDER_CATALOG.find((c) => c.id === baseCliId) ?? PROVIDER_CATALOG[0];
      catalogAndCustomEntries.push({
        cat: {
          ...template,
          id: instanceId,
          driverKind: ov.driverKind || template.driverKind,
          name: ov.displayName || `${template.name} (${instanceId})`,
        },
        baseCliId,
        isDefaultInstance: false,
      });
    }

    return catalogAndCustomEntries.map(({ cat, baseCliId, isDefaultInstance }) => {
      const row = this.getRawProviderRow(cat.id);
      const rawKey =
        this.getDecryptedApiKey(cat.id) || this.getDecryptedApiKey(baseCliId);
      const override = cliOverrides[cat.id];
      const isEnabled = override?.enabled !== undefined ? override.enabled : cat.enabled;
      const displayName = override?.displayName?.trim() || cat.name;
      const isDirty = Boolean(
        override &&
          (override.displayName ||
            override.binaryPath ||
            override.homePath ||
            override.shadowHomePath ||
            override.customArgs ||
            override.autoCompactWindow ||
            override.gcpProject ||
            override.gcpLocation ||
            (override.environmentVars && override.environmentVars.length > 0))
      );

      const rowDefaultModel = migrateRetiredModelId(row?.default_model);
      const migratedPrimaryProv = migrateLegacyDirectProviderId(
        rawAdv.primaryProvider
      );
      const migratedAuditorProv = migrateLegacyDirectProviderId(
        rawAdv.citationAuditorProvider
      );
      const migratedOpposingProv = migrateLegacyDirectProviderId(
        rawAdv.opposingCounselProvider
      );
      const migratedEconomyProv = rawPrivacy?.economyModelProvider
        ? migrateLegacyDirectProviderId(rawPrivacy.economyModelProvider)
        : undefined;

      const settingsPrimaryModel =
        migratedPrimaryProv === cat.id
          ? migrateRetiredModelId(rawAdv.primaryModel)
          : '';
      const effectiveDefaultModel =
        settingsPrimaryModel || rowDefaultModel || cat.defaultModel;

      // Merge models from Settings, live Models API / Ancillary Registry, customModels, and catalog defaults
      const modelMap = new Map<
        string,
        { id: string; label: string; isCustom?: boolean; capabilities?: string[] }
      >();
      for (const m of cat.availableModels) {
        modelMap.set(m.id, {
          ...m,
          capabilities: /flash|haiku|mini/i.test(m.id) ? ['Fast mode'] : undefined,
        });
      }

      if (ancillaryRegistry?.availableWorkingModels) {
        for (const wm of ancillaryRegistry.availableWorkingModels) {
          if (
            (migrateLegacyDirectProviderId(wm.providerId) === cat.id ||
              migrateLegacyDirectProviderId(wm.providerId) === baseCliId) &&
            wm.modelId
          ) {
            const migratedId = migrateRetiredModelId(wm.modelId);
            if (migratedId && !modelMap.has(migratedId)) {
              modelMap.set(migratedId, {
                id: migratedId,
                label: wm.modelLabel || migratedId,
              });
            }
          }
        }
      }

      for (const cm of override?.customModels || []) {
        if (cm.id && !modelMap.has(cm.id)) {
          modelMap.set(cm.id, {
            id: cm.id,
            label: cm.label || cm.id,
            isCustom: true,
          });
        }
      }

      const settingsModelsForProvider = [
        settingsPrimaryModel,
        rowDefaultModel,
        migratedAuditorProv === cat.id
          ? migrateRetiredModelId(rawAdv.citationAuditorModel)
          : '',
        migratedOpposingProv === cat.id
          ? migrateRetiredModelId(rawAdv.opposingCounselModel)
          : '',
        migratedEconomyProv === cat.id
          ? migrateRetiredModelId(rawPrivacy?.economyModel)
          : '',
      ].filter((m): m is string => Boolean(m && m.trim().length > 0));

      for (const customId of settingsModelsForProvider) {
        if (!modelMap.has(customId)) {
          modelMap.set(customId, {
            id: customId,
            label: customId,
            isCustom: true,
          });
        }
      }

      const mergedAvailableModels = Array.from(modelMap.values());

      if (
        baseCliId === 'agy-acp' ||
        baseCliId === 'codex-cli' ||
        baseCliId === 'claude-cli'
      ) {
        const hasEnvKey = Boolean(
          override?.environmentVars?.some(
            (v) =>
              (v.name === 'OPENAI_API_KEY' ||
                v.name === 'ANTHROPIC_API_KEY' ||
                v.name === 'GEMINI_API_KEY') &&
              v.value.trim().length > 0
          )
        );
        const runtimeStatus = CliAgentDriverManager.probeProviderStatusSync(
          baseCliId,
          {
            customBinaryPath: override?.binaryPath,
            homePath: override?.homePath,
            shadowHomePath: override?.shadowHomePath,
            autoCompactWindow: override?.autoCompactWindow,
            authMethod: override?.authMethod,
            gcpProject: override?.gcpProject,
            gcpLocation: override?.gcpLocation,
            hasApiKey: Boolean(rawKey) || hasEnvKey,
            enabled: isEnabled,
          }
        );
        const isReady =
          isEnabled &&
          runtimeStatus.installed &&
          (runtimeStatus.authenticated || Boolean(rawKey) || hasEnvKey);
        return {
          ...cat,
          name: displayName,
          accentColor: override?.accentColor,
          isDefaultInstance,
          isDirty,
          enabled: isEnabled,
          availableModels: mergedAvailableModels,
          hasApiKey: isReady,
          maskedApiKey: runtimeStatus.installed
            ? `${runtimeStatus.version} • ${runtimeStatus.authLabel}`
            : 'CLI Not Detected on PATH',
          baseUrl: row?.base_url || cat.baseUrl,
          binaryPath: override?.binaryPath ?? '',
          homePath: override?.homePath ?? '',
          shadowHomePath: override?.shadowHomePath ?? '',
          customArgs: override?.customArgs ?? '',
          autoCompactWindow: override?.autoCompactWindow ?? '',
          idleCompaction: override?.idleCompaction ?? 'default',
          authMethod: override?.authMethod ?? 'oauth-personal',
          gcpProject: override?.gcpProject ?? '',
          gcpLocation: override?.gcpLocation ?? '',
          environmentVars: override?.environmentVars ?? [],
          favoriteModels: override?.favoriteModels ?? [],
          hiddenModels: override?.hiddenModels ?? [],
          reasoningEffort:
            override?.reasoningEffort || cat.reasoningEffort || 'medium',
          runtimeMode: override?.runtimeMode || cat.runtimeMode || 'read-only',
          defaultModel: effectiveDefaultModel,
          runtimeStatus,
        };
      }

      const hasApiKey =
        cat.id === 'legal-simulator'
          ? isEnabled
          : Boolean(rawKey && rawKey.length > 0);
      const maskedApiKey =
        cat.id === 'legal-simulator'
          ? 'Built-In Local Engine'
          : rawKey && rawKey.length > 8
            ? `${rawKey.slice(0, 4)}\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${rawKey.slice(-4)}`
            : hasApiKey
              ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
              : '';

      return {
        ...cat,
        name: displayName,
        isDefaultInstance,
        isDirty,
        enabled: isEnabled,
        availableModels: mergedAvailableModels,
        hasApiKey,
        maskedApiKey,
        baseUrl: row?.base_url || cat.baseUrl,
        defaultModel: effectiveDefaultModel,
      };
    });
  }

  // --- T3-Style Agent Onboarding & Multi-Account Codex Instances ---
  getAgentOnboardingSavedState(): {
    completedAt: string | null;
    setupModes: Record<string, 'existing' | 'managed'>;
    additionalCodexAccounts: {
      instanceId: string;
      displayName: string;
      shadowHomePath: string;
      setupMode: 'existing' | 'managed';
      createdAt: string;
    }[];
  } {
    return (
      this.getKeyValue('agent_onboarding_state') ?? {
        completedAt: null,
        setupModes: {},
        additionalCodexAccounts: [],
      }
    );
  }

  completeAgentOnboarding(): void {
    const state = this.getAgentOnboardingSavedState();
    state.completedAt = new Date().toISOString();
    this.setKeyValue('agent_onboarding_state', state, true);
  }

  setAgentSetupMode(instanceId: string, setupMode: 'existing' | 'managed'): void {
    const state = this.getAgentOnboardingSavedState();
    state.setupModes[instanceId] = setupMode;
    this.setKeyValue('agent_onboarding_state', state, true);
  }

  addCodexAccountInstance(params: {
    instanceId: string;
    displayName: string;
    shadowHomePath: string;
    setupMode?: 'existing' | 'managed';
  }): void {
    const state = this.getAgentOnboardingSavedState();
    const existing = state.additionalCodexAccounts.filter(
      (a) => a.instanceId !== params.instanceId
    );
    state.additionalCodexAccounts = [
      ...existing,
      {
        instanceId: params.instanceId,
        displayName: params.displayName,
        shadowHomePath: params.shadowHomePath,
        setupMode: params.setupMode ?? 'managed',
        createdAt: new Date().toISOString(),
      },
    ];
    this.setKeyValue('agent_onboarding_state', state, true);
  }

  removeCodexAccountInstance(instanceId: string): void {
    const state = this.getAgentOnboardingSavedState();
    state.additionalCodexAccounts = state.additionalCodexAccounts.filter(
      (a) => a.instanceId !== instanceId
    );
    this.setKeyValue('agent_onboarding_state', state, true);
  }

  // --- Phase 2: Privacy Model Routing & Decision Debug Logger ---
  getPrivacyRoutingSettings(): PrivacyRoutingSettings {
    const defaultSettings: PrivacyRoutingSettings = {
      policyMode: 'smart_routing',
      debugModeEnabled: false,
      preDispatchReviewEnabled: false,
      preferDirectMLorCoreML: true,
    };
    const stored =
      this.getKeyValue<PrivacyRoutingSettings>('privacy_routing_settings') ??
      defaultSettings;
    const migratedProv = stored.economyModelProvider
      ? migrateLegacyDirectProviderId(stored.economyModelProvider)
      : stored.economyModelProvider;
    const migratedModel = stored.economyModel
      ? migrateRetiredModelId(stored.economyModel) || stored.economyModel
      : stored.economyModel;
    if (
      migratedProv !== stored.economyModelProvider ||
      migratedModel !== stored.economyModel
    ) {
      const updated: PrivacyRoutingSettings = {
        ...stored,
        ...(migratedProv ? { economyModelProvider: migratedProv } : {}),
        ...(migratedModel ? { economyModel: migratedModel } : {}),
      };
      this.setKeyValue('privacy_routing_settings', updated, true);
      return updated;
    }
    return stored;
  }

  savePrivacyRoutingSettings(
    updated: Partial<PrivacyRoutingSettings>
  ): PrivacyRoutingSettings {
    const current = this.getPrivacyRoutingSettings();
    const merged: PrivacyRoutingSettings = {
      ...current,
      ...updated,
      ...(updated.economyModelProvider !== undefined
        ? {
            economyModelProvider: migrateLegacyDirectProviderId(
              updated.economyModelProvider
            ),
          }
        : {}),
      ...(updated.economyModel !== undefined
        ? {
            economyModel:
              migrateRetiredModelId(updated.economyModel) || updated.economyModel,
          }
        : {}),
    };
    this.setKeyValue('privacy_routing_settings', merged, true);
    return merged;
  }

  getAncillaryModelRegistry(): AncillaryModelRegistryState | null {
    return this.getKeyValue<AncillaryModelRegistryState>('ancillary_model_registry');
  }

  saveAncillaryModelRegistry(state: AncillaryModelRegistryState): void {
    this.setKeyValue('ancillary_model_registry', state, true);
  }

  insertRoutingDebugLog(log: RoutingDecisionLog, flush = true): void {
    this.db.run(
      `INSERT OR REPLACE INTO routing_debug_logs (id, matter_id, timestamp, log_json)
       VALUES (?, ?, ?, ?)`,
      [log.id, log.matterId, log.timestamp, JSON.stringify(log)]
    );
    if (flush) this.persist();
  }

  listRoutingDebugLogs(matterId?: string, limit = 50): RoutingDecisionLog[] {
    let query = 'SELECT log_json FROM routing_debug_logs';
    const params: (string | number)[] = [];
    if (matterId) {
      query += ' WHERE matter_id = ?';
      params.push(matterId);
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    stmt.bind(params);
    const results: RoutingDecisionLog[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { log_json: string };
      try {
        results.push(JSON.parse(row.log_json) as RoutingDecisionLog);
      } catch {
        // Skip corrupted row
      }
    }
    stmt.free();
    return results;
  }

  clearRoutingDebugLogs(matterId?: string): void {
    if (matterId) {
      this.db.run('DELETE FROM routing_debug_logs WHERE matter_id = ?', [matterId]);
    } else {
      this.db.run('DELETE FROM routing_debug_logs');
    }
    this.persist();
  }
}

