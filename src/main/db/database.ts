import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import {
  AdversarialConfig,
  ChronologyFact,
  DocumentVersion,
  LegalThread,
  LLMProviderId,
  Matter,
  MatterDocument,
  PracticeAreaId,
  PractitionerProfile,
  PractitionerProfileId,
  ProviderConfig,
  SystemPromptSettings,
  ThreadMessage,
  UpdateMatterPayload,
} from '../../shared/types';
import {
  DEFAULT_ADVERSARIAL_CONFIG,
  DEFAULT_PRACTITIONER_PROFILES,
  DEFAULT_SYSTEM_PROMPT_SETTINGS,
  SEEDED_CHRONOLOGY_FACTS,
  SEEDED_DOCUMENTS,
  SEEDED_DOCUMENT_VERSIONS,
  SEEDED_MATTERS,
  SEEDED_MESSAGES,
  SEEDED_THREADS,
} from './defaultLegalData';

export interface SecretEncryptor {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}

const defaultEncryptor: SecretEncryptor = {
  encrypt: (plainText: string) => Buffer.from(plainText, 'utf8').toString('base64'),
  decrypt: (cipherText: string) => Buffer.from(cipherText, 'base64').toString('utf8'),
};

export const PROVIDER_CATALOG: Omit<ProviderConfig, 'hasApiKey' | 'maskedApiKey'>[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Primary legal reasoning, brief drafting, and motion/contract analysis.',
    defaultModel: 'claude-3-7-sonnet-latest',
    availableModels: [
      { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet (Extended Legal Reasoning)' },
      { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-latest', label: 'Claude 3 Opus (Deepest Analysis)' },
    ],
    enabled: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (o-Series & GPT-4o)',
    description: 'Adversarial Opposing Counsel / State’s Attorney critique & logic verification.',
    defaultModel: 'o3-mini',
    availableModels: [
      { id: 'o3-mini', label: 'OpenAI o3-mini (Adversarial Logic Critic)' },
      { id: 'gpt-4o', label: 'GPT-4o (Omni Legal Reviewer)' },
      { id: 'o1', label: 'OpenAI o1 (Deep Analytical Audit)' },
    ],
    enabled: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini Pro',
    description: 'Long-context discovery record & citation auditor across transcripts and affidavits.',
    defaultModel: 'gemini-2.5-pro',
    availableModels: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Record & Citation Auditor)' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fast Verification)' },
    ],
    enabled: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter / Custom Local Endpoint',
    description: 'Connect OpenRouter or a local OpenAI-compatible server (e.g., Ollama / vLLM).',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    availableModels: [
      { id: 'anthropic/claude-3.7-sonnet', label: 'OpenRouter: Claude 3.7 Sonnet' },
      { id: 'deepseek/deepseek-r1', label: 'OpenRouter: DeepSeek R1' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Local / Llama 3.3 70B Instruct' },
    ],
    enabled: true,
  },
  {
    id: 'legal-simulator',
    name: 'Built-In Legal Harness Simulator (Offline / Mac Test Mode)',
    description:
      'Deterministic local legal agent & multi-critic engine for testing the full control surface without external API charges.',
    defaultModel: 'lexharness-local-v1',
    availableModels: [
      { id: 'lexharness-local-v1', label: 'LexHarness Local Legal Engine (Zero-Key Test Mode)' },
    ],
    enabled: true,
  },
];

export class LegalDatabase {
  private db!: SqlJsDatabase;
  private dbFilePath: string;
  private encryptor: SecretEncryptor;

  constructor(storageDir: string, encryptor: SecretEncryptor = defaultEncryptor) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbFilePath = path.join(storageDir, 'lexharness.sqlite');
    this.encryptor = encryptor;
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

      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        matter_id TEXT NOT NULL,
        title TEXT NOT NULL,
        practice_area TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
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
    `);
  }

  private seedOrMigrate(): void {
    const existingMatters = this.listMatters();
    const hasVtMatter = existingMatters.some(
      (m) => m.id === 'matter-vt-state-v-thorne'
    );

    if (existingMatters.length === 0 || !hasVtMatter) {
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
      for (const t of SEEDED_THREADS) {
        this.insertThread(t, false);
      }
      for (const msg of SEEDED_MESSAGES) {
        this.insertMessage(msg, false);
      }
    }

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

  // --- Matters ---
  listMatters(): Matter[] {
    const stmt = this.db.prepare('SELECT * FROM matters ORDER BY updated_at DESC');
    const results: Matter[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, string>;
      results.push({
        id: row.id,
        name: row.name,
        clientName: row.client_name,
        matterNumber: row.matter_number,
        practiceArea: row.practice_area as PracticeAreaId,
        jurisdiction: row.jurisdiction,
        citationStyle: row.citation_style,
        folderPath: row.folder_path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
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
      `INSERT OR REPLACE INTO matters (id, name, client_name, matter_number, practice_area, jurisdiction, citation_style, folder_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matter.id,
        matter.name,
        matter.clientName,
        matter.matterNumber,
        matter.practiceArea,
        matter.jurisdiction,
        matter.citationStyle,
        matter.folderPath,
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
    const updated: Matter = {
      ...existing,
      name: payload.name.trim() || existing.name,
      clientName: payload.clientName.trim() || existing.clientName,
      matterNumber: payload.matterNumber.trim() || existing.matterNumber,
      practiceArea: payload.practiceArea || existing.practiceArea,
      jurisdiction: payload.jurisdiction.trim() || existing.jurisdiction,
      citationStyle: payload.citationStyle.trim() || existing.citationStyle,
      folderPath: payload.folderPath.trim() || existing.folderPath,
      updatedAt: new Date().toISOString(),
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
      `INSERT OR REPLACE INTO documents (id, matter_id, title, file_name, category, bates_range, page_count, summary, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  // --- Threads & Messages ---
  listThreads(matterId: string): LegalThread[] {
    const stmt = this.db.prepare(
      'SELECT * FROM threads WHERE matter_id = ? ORDER BY updated_at DESC'
    );
    stmt.bind([matterId]);
    const threads: LegalThread[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, string>;
      threads.push({
        id: r.id,
        matterId: r.matter_id,
        title: r.title,
        practiceArea: r.practice_area as PracticeAreaId,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    }
    stmt.free();
    return threads;
  }

  insertThread(thread: LegalThread, flush = true): LegalThread {
    this.db.run(
      `INSERT OR REPLACE INTO threads (id, matter_id, title, practice_area, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        thread.id,
        thread.matterId,
        thread.title,
        thread.practiceArea,
        thread.createdAt,
        thread.updatedAt,
      ]
    );
    if (flush) this.persist();
    return thread;
  }

  listMessages(threadId: string): ThreadMessage[] {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC'
    );
    stmt.bind([threadId]);
    const messages: ThreadMessage[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      messages.push({
        id: String(r.id),
        threadId: String(r.thread_id),
        role: r.role as 'user' | 'assistant',
        content: String(r.content),
        initialDraftBeforeReview: r.initial_draft_before_review
          ? String(r.initial_draft_before_review)
          : undefined,
        primaryProvider: r.primary_provider
          ? (String(r.primary_provider) as LLMProviderId)
          : undefined,
        primaryModel: r.primary_model ? String(r.primary_model) : undefined,
        reviewModeUsed: r.review_mode_used
          ? (String(r.review_mode_used) as ThreadMessage['reviewModeUsed'])
          : undefined,
        assembledSystemPromptSnapshot: r.assembled_system_prompt_snapshot
          ? String(r.assembled_system_prompt_snapshot)
          : undefined,
        toolCalls: JSON.parse(String(r.tool_calls_json || '[]')),
        adversarialReviews: JSON.parse(String(r.adversarial_reviews_json || '[]')),
        revisionRoundsCompleted: Number(r.revision_rounds_completed ?? 0),
        createdAt: String(r.created_at),
      });
    }
    stmt.free();
    return messages;
  }

  insertMessage(msg: ThreadMessage, flush = true): ThreadMessage {
    this.db.run(
      `INSERT OR REPLACE INTO messages (
        id, thread_id, role, content, initial_draft_before_review,
        primary_provider, primary_model, review_mode_used,
        assembled_system_prompt_snapshot, tool_calls_json, adversarial_reviews_json,
        revision_rounds_completed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg.id,
        msg.threadId,
        msg.role,
        msg.content,
        msg.initialDraftBeforeReview ?? null,
        msg.primaryProvider ?? null,
        msg.primaryModel ?? null,
        msg.reviewModeUsed ?? null,
        msg.assembledSystemPromptSnapshot ?? null,
        JSON.stringify(msg.toolCalls ?? []),
        JSON.stringify(msg.adversarialReviews ?? []),
        msg.revisionRoundsCompleted ?? 0,
        msg.createdAt,
      ]
    );
    if (flush) this.persist();
    return msg;
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

  // --- Adversarial Config ---
  getAdversarialConfig(): AdversarialConfig {
    return (
      this.getKeyValue<AdversarialConfig>('adversarial_config') ??
      DEFAULT_ADVERSARIAL_CONFIG
    );
  }

  saveAdversarialConfig(updated: Partial<AdversarialConfig>): AdversarialConfig {
    const current = this.getAdversarialConfig();
    const merged: AdversarialConfig = {
      ...current,
      ...updated,
    };
    this.setKeyValue('adversarial_config', merged, true);
    return merged;
  }

  // --- Provider Credentials & Configuration ---
  saveProviderCredential(params: {
    providerId: LLMProviderId;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
  }): ProviderConfig[] {
    const existing = this.getRawProviderRow(params.providerId);
    const catalogEntry = PROVIDER_CATALOG.find((p) => p.id === params.providerId);
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
        params.providerId,
        encryptedKey,
        baseUrl,
        defaultModel,
        new Date().toISOString(),
      ]
    );
    this.persist();
    return this.listProviderConfigs();
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

  getDecryptedApiKey(providerId: LLMProviderId): string | null {
    const envMap: Record<LLMProviderId, string | undefined> = {
      anthropic: process.env.ANTHROPIC_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
      'legal-simulator': 'simulator-built-in-key',
    };

    const row = this.getRawProviderRow(providerId);
    if (row && row.encrypted_api_key) {
      try {
        const decrypted = this.encryptor.decrypt(row.encrypted_api_key);
        if (decrypted) return decrypted;
      } catch {
        // Fallback to env if decryption fails
      }
    }
    return envMap[providerId] ?? null;
  }

  listProviderConfigs(): ProviderConfig[] {
    return PROVIDER_CATALOG.map((cat) => {
      const row = this.getRawProviderRow(cat.id);
      const rawKey = this.getDecryptedApiKey(cat.id);
      const hasApiKey =
        cat.id === 'legal-simulator'
          ? true
          : Boolean(rawKey && rawKey.length > 0);
      const maskedApiKey =
        cat.id === 'legal-simulator'
          ? 'Built-In Local Engine'
          : rawKey && rawKey.length > 8
            ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}`
            : hasApiKey
              ? '••••••••'
              : '';

      return {
        ...cat,
        hasApiKey,
        maskedApiKey,
        baseUrl: row?.base_url || cat.baseUrl,
        defaultModel: row?.default_model || cat.defaultModel,
      };
    });
  }
}
