import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { PromptAssembler } from '../agent/PromptAssembler';
import { LegalAgentLoop } from '../agent/LegalAgentLoop';
import { MultiLLMClient } from '../agent/providers/MultiLLMClient';
import { CliAgentDriverManager } from '../agent/providers/CliAgentDriverManager';
import { MatterFolderWatcher } from '../tools/MatterFolderWatcher';
import { exportDocxBuffer } from '../tools/DocxParser';
import { TOUR_STEPS } from '../../renderer/components/TutorialOverlay';
import { CustomLegalMcpServer } from '../../shared/types';

describe('LexHarness: Practitioner Profiles, Matter Settings, Legal MCP Toolsets & Multi-LLM Loop', () => {
  let tmpDir: string;
  let db: LegalDatabase;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-test-'));
    db = new LegalDatabase(tmpDir);
    await db.initialize();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults to Vermont Criminal Defense Lawyer profile (1st) and General Legal Practice (2nd), and seeds State of Vermont v. Marcus Thorne', () => {
    const promptSettings = db.getSystemPromptSettings();
    expect(promptSettings.activeProfileId).toBe('vt-criminal-defense');
    expect(promptSettings.profiles.length).toBe(2);
    expect(promptSettings.profiles[0].id).toBe('vt-criminal-defense');
    expect(promptSettings.profiles[0].name).toBe('Vermont Criminal Defense Lawyer');
    expect(promptSettings.profiles[1].id).toBe('general-legal-practice');
    expect(promptSettings.profiles[1].name).toBe('General Legal Practice');

    const vtMatter = db.getMatter('matter-vt-state-v-thorne');
    expect(vtMatter).not.toBeNull();
    expect(vtMatter?.name).toBe('State of Vermont v. Marcus Thorne');
    expect(vtMatter?.matterNumber).toContain('26-CR-04118');
    expect(vtMatter?.jurisdiction).toContain('Vermont Superior Court');

    const docs = db.listDocuments('matter-vt-state-v-thorne');
    expect(docs.length).toBe(5);
  });

  it('allows revisiting and updating Matter settings (name, docket ID, client, jurisdiction, citation style, folder path)', () => {
    const updated = db.updateMatter({
      matterId: 'matter-vt-state-v-thorne',
      name: 'State of Vermont v. Marcus Thorne (Amended Information)',
      clientName: 'Marcus A. Thorne',
      matterNumber: '26-CR-04118-AM',
      practiceArea: 'vt_bail_conditions',
      jurisdiction: 'Vermont Superior Court, Washington Criminal Division',
      citationStyle: 'Vermont Rules / Public Domain (20XX VT XX)',
      folderPath: '~/Matters/26-CR-04118-AM-Thorne',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('State of Vermont v. Marcus Thorne (Amended Information)');
    expect(updated?.clientName).toBe('Marcus A. Thorne');
    expect(updated?.matterNumber).toBe('26-CR-04118-AM');
    expect(updated?.practiceArea).toBe('vt_bail_conditions');
    expect(updated?.jurisdiction).toBe('Vermont Superior Court, Washington Criminal Division');
    expect(updated?.folderPath).toBe('~/Matters/26-CR-04118-AM-Thorne');
  });

  it('switches between Vermont Criminal Defense Lawyer and General Legal Practice profiles and persists custom prompt edits', async () => {
    const switched = db.selectPractitionerProfile('general-legal-practice');
    expect(switched.activeProfileId).toBe('general-legal-practice');
    expect(switched.activePracticeAreaId).toBe('general_litigation');

    const switchedBack = db.selectPractitionerProfile('vt-criminal-defense');
    expect(switchedBack.activeProfileId).toBe('vt-criminal-defense');
    expect(switchedBack.activePracticeAreaId).toBe('vt_suppression_art11');

    const matter = db.getMatter('matter-vt-state-v-thorne')!;
    const assembled = PromptAssembler.assembleForMatter(switchedBack, matter);
    expect(assembled.profileName).toBe('Vermont Criminal Defense Lawyer');
    expect(assembled.primarySystemPrompt).toContain('Chapter I, Article 11');
    expect(assembled.primarySystemPrompt).toContain('State v. Sprague');
  });

  it('executes local LegalAgentLoop under Vermont Criminal Defense profile with CourtListener MCP toolset and Multi-LLM Adversarial Gate', async () => {
    const loop = new LegalAgentLoop(db);
    const phasesSeen: string[] = [];

    const result = await loop.runTurn({
      matterId: 'matter-vt-state-v-thorne',
      userPrompt:
        'Draft a V.R.Cr.P. 12(b)(3) Motion to Suppress and 12(d) Motion to Dismiss challenging Trooper Keller’s exit order and locked console search.',
      onProgress: (evt) => {
        phasesSeen.push(evt.phase);
      },
    });

    expect(phasesSeen).toContain('assembling_prompt');
    expect(phasesSeen).toContain('executing_tools');
    expect(phasesSeen).toContain('drafting_primary');
    expect(phasesSeen).toContain('adversarial_review');
    expect(phasesSeen).toContain('revising_after_critique');
    expect(phasesSeen).toContain('completed');

    expect(result.assistantMessage.toolCalls.length).toBeGreaterThanOrEqual(2);
    const searchToolCall = result.assistantMessage.toolCalls.find(
      (tc) => tc.toolName === 'search_matter_corpus'
    );
    expect(searchToolCall).toBeDefined();
    expect(searchToolCall?.status).toBe('completed');

    expect(result.assistantMessage.adversarialReviews.length).toBe(2);
    expect(result.assistantMessage.revisionRoundsCompleted).toBe(1);
    expect(result.assistantMessage.content).toContain('State v. Sprague');
    expect(result.assistantMessage.content).toContain('V.R.Cr.P. 12(d)');

    // Verify turn with explicit Assistant & Model selection
    const customAgentTurn = await loop.runTurn({
      matterId: 'matter-vt-state-v-thorne',
      userPrompt: 'Analyze state constitutional search doctrine under Chapter I, Article 11.',
      overridePrimaryProvider: 'legal-simulator',
      overridePrimaryModel: 'lexharness-local-v1',
    });
    expect(customAgentTurn.assistantMessage.primaryProvider).toBe('legal-simulator');
    expect(customAgentTurn.assistantMessage.primaryModel).toBe('lexharness-local-v1');
  });

  it('deletes a Matter and cascades deletion of messages, documents, versions, and chronology facts', () => {
    const initialMatters = db.listMatters();
    expect(initialMatters.length).toBe(2);

    const { remainingMatters, nextActiveMatterId } = db.deleteMatter(
      'matter-apex-meridian'
    );
    expect(remainingMatters.length).toBe(1);
    expect(nextActiveMatterId).toBe('matter-vt-state-v-thorne');
    expect(db.listDocuments('matter-apex-meridian').length).toBe(0);
    expect(db.listMessages('matter-apex-meridian').length).toBe(0);
    expect(db.listChronologyFacts('matter-apex-meridian').length).toBe(0);
  });

  it('allows deleting the last remaining matter and does not bounce back or re-seed on relaunch', async () => {
    expect(db.listMatters().length).toBe(2);
    db.deleteMatter('matter-apex-meridian');
    expect(db.listMatters().length).toBe(1);

    const { remainingMatters, nextActiveMatterId } = db.deleteMatter(
      'matter-vt-state-v-thorne'
    );
    expect(remainingMatters.length).toBe(0);
    expect(nextActiveMatterId).toBe('');
    expect(db.listMatters().length).toBe(0);

    // Simulate quitting and relaunching the app with the existing database file on disk
    const reopenedDb = new LegalDatabase(tmpDir);
    await reopenedDb.initialize();
    expect(reopenedDb.listMatters().length).toBe(0);
    expect(reopenedDb.getLastActiveMatterId()).toBe('');
  });

  it('exposes T3-style CLI Agent Harnesses (agy-acp, codex-cli, claude-cli) and persists binary path, reasoning effort, and runtime mode overrides', () => {
    const providers = db.listProviderConfigs();
    const providerIds = providers.map((p) => p.id);
    expect(providerIds).toContain('agy-acp');
    expect(providerIds).toContain('codex-cli');
    expect(providerIds).toContain('claude-cli');

    const updatedProviders = db.saveProviderCredential({
      providerId: 'codex-cli',
      binaryPath: '/opt/homebrew/bin/codex',
      reasoningEffort: 'xhigh',
      runtimeMode: 'read-only',
    });

    const codexCfg = updatedProviders.find((p) => p.id === 'codex-cli');
    expect(codexCfg?.binaryPath).toBe('/opt/homebrew/bin/codex');
    expect(codexCfg?.reasoningEffort).toBe('xhigh');
    expect(codexCfg?.runtimeMode).toBe('read-only');
  });

  it('manages prompt governance, local matter corpus tools, and leaves MCP tooling native to agents', async () => {
    const promptSettings = db.getSystemPromptSettings();
    const matter = db.getMatter('matter-vt-state-v-thorne')!;
    const assembled = PromptAssembler.assembleForMatter(promptSettings, matter);

    // Verifies Layer 1 core mandate, Layer 2 task persona, and Layer 3 forum rules are assembled
    expect(assembled.primarySystemPrompt).toContain('ETHICAL GUARDRAILS');
    expect(assembled.primarySystemPrompt).toContain('State v. Sprague');
    expect(assembled.primarySystemPrompt).toContain('13 V.S.A.');

    // Verifies local matter documents and chronology facts are indexable
    const docs = db.listDocuments(matter.id);
    expect(docs.length).toBeGreaterThan(0);
    const facts = db.listChronologyFacts(matter.id);
    expect(facts.length).toBeGreaterThan(0);
  });

  it('builds T3-style Connect your agents onboarding state and creates isolated Codex shadow-home accounts', () => {
    const savedInitial = db.getAgentOnboardingSavedState();
    expect(savedInitial.completedAt).toBeNull();

    // Add a secondary ChatGPT account ("Work")
    const instanceId = 'codex_work_test';
    const sharedHome = path.join(tmpDir, 'mock-codex-home');
    fs.mkdirSync(sharedHome, { recursive: true });
    fs.writeFileSync(path.join(sharedHome, 'config.toml'), '# shared config\n');

    const shadowHome = path.join(tmpDir, 'providers', 'codex', instanceId, 'shadow');
    CliAgentDriverManager.ensureCodexShadowHomeLayout(sharedHome, shadowHome);
    expect(fs.existsSync(shadowHome)).toBe(true);
    expect(fs.existsSync(path.join(shadowHome, 'config.toml'))).toBe(true);

    db.addCodexAccountInstance({
      instanceId,
      displayName: 'ChatGPT - Work',
      shadowHomePath: shadowHome,
      setupMode: 'managed',
    });

    const saved = db.getAgentOnboardingSavedState();
    const onboardingState = CliAgentDriverManager.buildAgentOnboardingState({
      ...saved,
      cliOverrides: db.getCliOverrides(),
    });
    expect(onboardingState.machineLabel.length).toBeGreaterThan(0);
    expect(
      onboardingState.agentInstances.some((i) => i.instanceId === 'codex-cli')
    ).toBe(true);
    expect(
      onboardingState.agentInstances.some((i) => i.displayName === 'ChatGPT - Work')
    ).toBe(true);
    expect(
      onboardingState.agentInstances.some((i) => i.instanceId === 'claude-cli')
    ).toBe(true);

    db.completeAgentOnboarding();
    expect(db.getAgentOnboardingSavedState().completedAt).not.toBeNull();
  });

  it('assures CourtListener MCP baseline availability and auto-installs on default agent if missing', () => {
    const tempHome = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lexharness-cl-assurance-')
    );

    try {
      // 1. Initial probe in empty directory should be not configured
      const initialProbe = CliAgentDriverManager.probeCourtListenerMcp({
        homeDir: tempHome,
      });
      expect(initialProbe.hasInstalledAgent).toBe(false);
      expect(initialProbe.status).toBe('not_configured');
      expect(initialProbe.signupUrl).toContain('courtlistener.com');

      // 2. ensureCourtListenerAssurance installs CourtListener MCP on default agent (Codex)
      const assuredState = CliAgentDriverManager.ensureCourtListenerAssurance({
        homeDir: tempHome,
      });
      expect(assuredState.hasInstalledAgent).toBe(true);
      expect(assuredState.configuredAgentDriver).toBe('codex');
      expect(assuredState.status).toBe('needs_token');

      // Verify Codex config.toml was created with the courtlistener block
      const codexConfigPath = path.join(tempHome, '.codex', 'config.toml');
      expect(fs.existsSync(codexConfigPath)).toBe(true);
      const codexContent = fs.readFileSync(codexConfigPath, 'utf8');
      expect(codexContent).toContain('[mcp_servers.courtlistener]');
      expect(codexContent).toContain('courtlistener-mcp');

      // 3. Save token in database and sync to agent config
      const testToken = 'cl_secret_live_api_token_test_12345';
      db.saveCourtListenerToken(testToken);
      expect(db.getCourtListenerToken()).toBe(testToken);

      CliAgentDriverManager.installCourtListenerMcpOnAgent({
        driver: 'codex',
        token: testToken,
        homeDir: tempHome,
      });

      const updatedProbe = CliAgentDriverManager.probeCourtListenerMcp({
        homeDir: tempHome,
        token: testToken,
      });
      expect(updatedProbe.hasInstalledAgent).toBe(true);
      expect(updatedProbe.hasAuthToken).toBe(true);
      expect(updatedProbe.status).toBe('ready');
      expect(updatedProbe.maskedAuthToken).toBe('cl_s••••••••2345');

      const updatedCodexContent = fs.readFileSync(codexConfigPath, 'utf8');
      expect(updatedCodexContent).toContain('COURTLISTENER_API_TOKEN');

      // 4. Test installation on Claude Agent (~/.claude.json)
      CliAgentDriverManager.installCourtListenerMcpOnAgent({
        driver: 'claudeAgent',
        token: testToken,
        homeDir: tempHome,
      });
      const claudeJsonPath = path.join(tempHome, '.claude.json');
      expect(fs.existsSync(claudeJsonPath)).toBe(true);
      const claudeData = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
      expect(claudeData.mcpServers?.courtlistener?.command).toBe('npx');
      expect(claudeData.mcpServers?.courtlistener?.args).toEqual([
        '-y',
        'courtlistener-mcp',
      ]);
      expect(
        claudeData.mcpServers?.courtlistener?.env?.COURTLISTENER_API_TOKEN
      ).toBe(testToken);

      // Verify installedDrivers lists both codex and claudeAgent
      const multiProbe = CliAgentDriverManager.probeCourtListenerMcp({
        homeDir: tempHome,
        token: testToken,
      });
      expect(multiProbe.installedDrivers).toContain('codex');
      expect(multiProbe.installedDrivers).toContain('claudeAgent');
      expect(multiProbe.configuredAgentDisplayName).toBeTruthy();
    } finally {
      try {
        fs.rmSync(tempHome, { recursive: true, force: true });
      } catch {
        // Cleanup
      }
    }
  });

  it('manages custom legal MCP servers and injects configs across agent runtimes', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-custom-mcp-'));
    try {
      // 1. Database persistence
      const customServer: CustomLegalMcpServer = {
        id: 'sec-edgar',
        name: 'SEC EDGAR Filings',
        description: 'SEC EDGAR corporate filings search via MCP',
        command: 'npx',
        args: ['-y', 'sec-edgar-mcp'],
        env: { SEC_USER_AGENT: 'LawFirm legal@firm.com' },
        targetDriver: 'all',
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      const initialList = db.listCustomMcpServers();
      expect(Array.isArray(initialList)).toBe(true);

      const savedList = db.saveCustomMcpServer(customServer);
      expect(savedList.some((s) => s.id === 'sec-edgar')).toBe(true);
      expect(db.listCustomMcpServers().some((s) => s.id === 'sec-edgar')).toBe(true);

      // 2. Install on Codex and Claude agent configs
      CliAgentDriverManager.installCustomMcpServerOnAgent({
        server: customServer,
        homeDir: tempHome,
      });

      // Codex config check
      const codexPath = path.join(tempHome, '.codex', 'config.toml');
      expect(fs.existsSync(codexPath)).toBe(true);
      const codexText = fs.readFileSync(codexPath, 'utf8');
      expect(codexText).toContain('[mcp_servers.sec-edgar]');
      expect(codexText).toContain('sec-edgar-mcp');

      // Claude config check
      const claudePath = path.join(tempHome, '.claude.json');
      expect(fs.existsSync(claudePath)).toBe(true);
      const claudeJson = JSON.parse(fs.readFileSync(claudePath, 'utf8'));
      expect(claudeJson.mcpServers?.['sec-edgar']?.command).toBe('npx');
      expect(claudeJson.mcpServers?.['sec-edgar']?.env?.SEC_USER_AGENT).toBe('LawFirm legal@firm.com');

      // 3. Remove custom MCP server from agent configs
      CliAgentDriverManager.removeCustomMcpServerFromAgent({
        serverId: 'sec-edgar',
        homeDir: tempHome,
      });

      const updatedCodex = fs.readFileSync(codexPath, 'utf8');
      expect(updatedCodex).not.toContain('[mcp_servers.sec-edgar]');

      const updatedClaude = JSON.parse(fs.readFileSync(claudePath, 'utf8'));
      expect(updatedClaude.mcpServers?.['sec-edgar']).toBeUndefined();

      // 4. Delete from database
      const afterDelete = db.deleteCustomMcpServer('sec-edgar');
      expect(afterDelete.some((s) => s.id === 'sec-edgar')).toBe(false);
      expect(db.listCustomMcpServers().some((s) => s.id === 'sec-edgar')).toBe(false);
    } finally {
      try {
        fs.rmSync(tempHome, { recursive: true, force: true });
      } catch {
        // Cleanup
      }
    }
  });

  it('auto-selects installed ready agent harnesses (codex-cli / agy-acp) and prevents selecting uninstalled Claude', () => {
    // 1. Verify probeProviderStatusSync detects when Claude CLI is not found on PATH
    const claudeStatus = CliAgentDriverManager.probeProviderStatusSync('claude-cli');
    if (!fs.existsSync('/usr/local/bin/claude') && !fs.existsSync('/opt/homebrew/bin/claude')) {
      expect(claudeStatus.installed).toBe(false);
      expect(claudeStatus.authLabel).toBe('CLI Not Installed');
    }

    // 2. Verify database auto-heals away from uninstalled Claude / unauthenticated providers
    const resolved = db.resolveBestAvailableProvider('claude-cli');
    // If Claude is not installed, it must auto-resolve to an installed provider
    if (!claudeStatus.installed) {
      expect(resolved.providerId).not.toBe('claude-cli');
      expect(['codex-cli', 'agy-acp']).toContain(resolved.providerId);
    }

    // 3. Verify getAdversarialConfig auto-heals if configured with an uninstalled provider
    db.saveAdversarialConfig({
      primaryProvider: 'claude-cli',
      primaryModel: 'claude-sonnet-5-5',
    });
    const healedConfig = db.getAdversarialConfig();
    if (!claudeStatus.installed) {
      expect(healedConfig.primaryProvider).not.toBe('claude-cli');
      expect(healedConfig.primaryProvider).not.toBe('anthropic');
      expect(['codex-cli', 'agy-acp']).toContain(healedConfig.primaryProvider);
    }

    // 4. Verify probeCourtListenerMcp does not pick Claude as active hosting driver when Claude is uninstalled
    const realProbe = CliAgentDriverManager.probeCourtListenerMcp({});
    if (!claudeStatus.installed) {
      expect(realProbe.configuredAgentDriver).not.toBe('claudeAgent');
    }
  });

  it('migrates legacy SQLite databases with messages.thread_id NOT NULL without errors', async () => {
    const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-legacy-test-'));
    try {
      // 1. Synthesize a legacy database with thread_id TEXT NOT NULL
      const SQL = await initSqlJs();
      const rawDb = new SQL.Database();
      rawDb.run(`
        CREATE TABLE messages (
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
        INSERT INTO messages VALUES (
          'legacy-msg-1',
          'thread-123',
          'user',
          'Legacy prompt',
          NULL,
          'codex-cli',
          'gpt-5',
          'multi_llm_default',
          NULL,
          '[]',
          '[]',
          0,
          '2026-11-01T00:00:00.000Z'
        );
      `);
      const buffer = Buffer.from(rawDb.export());
      fs.writeFileSync(path.join(legacyDir, 'lexharness.sqlite'), buffer);

      // 2. Initialize LegalDatabase on this directory — migration must succeed
      const migratedDb = new LegalDatabase(legacyDir);
      await migratedDb.initialize();

      // 3. Test insertMessage without thread_id (simulating legal:run-turn)
      const newMsg = migratedDb.insertMessage({
        id: 'new-msg-2',
        matterId: 'matter-vt-state-v-thorne',
        role: 'assistant',
        content: 'Review complete',
        createdAt: new Date().toISOString(),
      });
      expect(newMsg.id).toBe('new-msg-2');

      // 4. Verify listMessages returns both messages plus 2 seeded initial messages
      const msgs = migratedDb.listMessages('matter-vt-state-v-thorne');
      expect(msgs.length).toBe(4);
      expect(msgs.some((m) => m.id === 'legacy-msg-1')).toBe(true);
      expect(msgs.some((m) => m.id === 'new-msg-2')).toBe(true);
    } finally {
      try {
        fs.rmSync(legacyDir, { recursive: true, force: true });
      } catch {
        // Cleanup
      }
    }
  });

  it('loads, inspects, and closes the John Doe tutorial sample casework', async () => {
    // 1. Load sample case into fresh test db
    const sampleMatter = db.loadTutorialSampleCase();
    expect(sampleMatter.id).toBe('matter-1794160132556');
    expect(sampleMatter.name).toBe('John Doe v State of Vermont');

    // 2. Verify documents are loaded (Work product + Discovery exhibits)
    const docs = db.listDocuments('matter-1794160132556');
    expect(docs.length).toBeGreaterThanOrEqual(5);
    const wpDoc = docs.find((d) => d.category === 'WORK_PRODUCT');
    expect(wpDoc).toBeDefined();
    expect(wpDoc?.title).toContain('John Doe v State of Vermont');

    // 3. Verify document versions
    const versions = db.listDocumentVersions('matter-1794160132556');
    expect(versions.length).toBeGreaterThanOrEqual(2);
    const curedVer = versions.find((v) => v.versionNumber === 2);
    expect(curedVer?.rationaleSummary).toContain('Cured 2 critical objections');

    // 4. Verify thread messages, Case Issues, and adversarial reviews
    const msgs = db.listMessages('matter-1794160132556');
    expect(msgs.length).toBe(2);
    const assistantMsg = msgs.find((m) => m.role === 'assistant');
    expect(assistantMsg?.adversarialReviews.length).toBe(2);
    expect(assistantMsg?.toolCalls.length).toBeGreaterThanOrEqual(4);

    const sampleIssues = db.listIssues('matter-1794160132556');
    expect(sampleIssues.length).toBeGreaterThanOrEqual(1);
    expect(sampleIssues[0].title).toBe('Trooper Keller BWC Impeachment Matrix');
    expect(db.getActiveIssueId('matter-1794160132556')).toBeNull();

    // 5. Test running a live turn inside the John Doe tutorial sample casework
    const loop = new LegalAgentLoop(db);
    const tutorialTurn = await loop.runTurn({
      matterId: 'matter-1794160132556',
      userPrompt:
        'Draft the Article 11 exit order suppression argument for John Doe.',
    });
    expect(tutorialTurn.assistantMessage.content).toContain('State v. Sprague');
    expect(tutorialTurn.assistantMessage.content).toContain('STATE-BWC-0009');
    expect(tutorialTurn.assistantMessage.adversarialReviews.length).toBe(2);

    // 6. Test closeTutorialSampleCase with fallback
    const closeRes = db.closeTutorialSampleCase(
      'matter-1794160132556',
      'matter-vt-state-v-thorne',
      false
    );
    expect(closeRes.activeMatterId).toBe('matter-vt-state-v-thorne');

    // 6. Test closeTutorialSampleCase with removeSample
    const removeRes = db.closeTutorialSampleCase(
      'matter-1794160132556',
      'matter-vt-state-v-thorne',
      true
    );
    expect(removeRes.activeMatterId).toBe('matter-vt-state-v-thorne');
    expect(db.listMatters().some((m) => m.id === 'matter-1794160132556')).toBe(false);
  });

  it('allows direct inline editing of assistant messages and document versions', async () => {
    // 1. Edit an existing message
    const updatedMsg = db.updateMessageContent(
      'msg-vt-assistant-1',
      'Custom attorney-edited text for Motion to Suppress Marcus Thorne.'
    );
    expect(updatedMsg).not.toBeNull();
    expect(updatedMsg?.content).toBe(
      'Custom attorney-edited text for Motion to Suppress Marcus Thorne.'
    );
    expect(updatedMsg?.isEditedByAttorney).toBe(true);

    const msgs = db.listMessages('matter-vt-state-v-thorne');
    const reloadedMsg = msgs.find((m) => m.id === 'msg-vt-assistant-1');
    expect(reloadedMsg?.content).toBe(
      'Custom attorney-edited text for Motion to Suppress Marcus Thorne.'
    );
    expect(reloadedMsg?.isEditedByAttorney).toBe(true);

    // 2. Edit a document version and check document content synchronization
    const versions = db.listDocumentVersions('matter-vt-state-v-thorne');
    expect(versions.length).toBeGreaterThan(0);
    const targetVersion = versions[0];
    const updatedVersion = db.updateDocumentVersionContent(
      targetVersion.id,
      'Directly modified motion clause by counsel.'
    );
    expect(updatedVersion).not.toBeNull();
    expect(updatedVersion?.content).toBe(
      'Directly modified motion clause by counsel.'
    );

    const docs = db.listDocuments('matter-vt-state-v-thorne');
    const matchedDoc = docs.find((d) => d.id === targetVersion.documentId);
    expect(matchedDoc?.content).toBe(
      'Directly modified motion clause by counsel.'
    );
  });

  it('detects informational casework inquiries like "What motion are we working on?" for advisory feedback', () => {
    expect(
      MultiLLMClient.isInformationalInquiry('What motion are we working on?')
    ).toBe(true);
    expect(
      MultiLLMClient.isInformationalInquiry('what case are we in?')
    ).toBe(true);
    expect(
      MultiLLMClient.isInformationalInquiry('give me an update on progress and feedback')
    ).toBe(true);
    expect(
      MultiLLMClient.isInformationalInquiry('Draft a complete Motion to Suppress under Article 11')
    ).toBe(false);
  });

  it('auto-syncs and watches a Matter folderPath for newly dropped discovery files (§11.2)', async () => {
    const matterFolder = path.join(tmpDir, 'matter-discovery-folder');
    fs.mkdirSync(matterFolder, { recursive: true });

    // Point active matter to the local folder
    db.updateMatter({
      matterId: 'matter-vt-state-v-thorne',
      name: 'State of Vermont v. Marcus Thorne',
      clientName: 'Marcus Thorne (Defendant)',
      matterNumber: '26-CR-04118 (Chittenden Unit)',
      practiceArea: 'vt_suppression_art11',
      jurisdiction: 'Vermont Superior Court, Criminal Division',
      citationStyle: 'Vermont Supreme Court Public Domain / Bluebook',
      folderPath: matterFolder,
    });

    // Drop two new files into the linked folder
    fs.writeFileSync(
      path.join(matterFolder, '06_Supplemental_Dispatch_Log.txt'),
      '# SUPPLEMENTAL CAD DISPATCH LOG\n\n02:11:04 - Unit 44 initiated stop on I-89 Southbound.',
      'utf8'
    );
    fs.writeFileSync(
      path.join(matterFolder, '07_Trooper_Shift_Schedule.csv'),
      'Officer,Unit,ShiftStart,ShiftEnd\nTrooper Keller,44,22:00,06:00',
      'utf8'
    );
    // Also place a temporary Office lock file that must be ignored
    fs.writeFileSync(
      path.join(matterFolder, '~$06_Supplemental_Dispatch_Log.docx'),
      'lockfile',
      'utf8'
    );

    const watcher = new MatterFolderWatcher(db, { debounceMs: 50 });
    try {
      const firstSync = watcher.syncMatterFolder('matter-vt-state-v-thorne');
      expect(firstSync.folderExists).toBe(true);
      expect(firstSync.syncedCount).toBe(2);
      expect(firstSync.newDocuments.map((d) => d.fileName)).toEqual([
        '06_Supplemental_Dispatch_Log.txt',
        '07_Trooper_Shift_Schedule.csv',
      ]);

      // Re-running sync without new files should not duplicate
      const secondSync = watcher.syncMatterFolder('matter-vt-state-v-thorne');
      expect(secondSync.syncedCount).toBe(0);

      // Verify live fs.watch auto-sync when a supplemental deposition file is saved to disk
      const autoSyncPromise = new Promise<number>((resolve) => {
        watcher.watchMatter('matter-vt-state-v-thorne', (res) => {
          resolve(res.syncedCount);
        });
      });

      fs.writeFileSync(
        path.join(matterFolder, '08_Supplemental_Deposition_Transcript.txt'),
        'Q. Did you activate your cruiser dashcam prior to the exit order?\nA. Yes.',
        'utf8'
      );

      const syncedFromWatch = await Promise.race([
        autoSyncPromise,
        new Promise<number>((resolve) =>
          setTimeout(() => {
            const manual = watcher.syncMatterFolder('matter-vt-state-v-thorne');
            resolve(manual.syncedCount);
          }, 400)
        ),
      ]);
      expect(syncedFromWatch).toBe(1);

      const allDocs = db.listDocuments('matter-vt-state-v-thorne');
      const depDoc = allDocs.find(
        (d) => d.fileName === '08_Supplemental_Deposition_Transcript.txt'
      );
      expect(depDoc).toBeDefined();
      expect(depDoc?.category).toBe('DEPOSITION');
    } finally {
      watcher.stopWatching();
    }
  });

  it('supports isolated Case Issues, Focused Counsel Inquiries, and Master Brief Synthesis (§10.1–§10.3)', async () => {
    const loop = new LegalAgentLoop(db);

    // 1. Create two Case Issues within the same Matter
    const issueA = db.insertIssue({
      id: 'issue-exit-order',
      matterId: 'matter-vt-state-v-thorne',
      title: 'Art. 11 Exit Order Suppression',
      practiceArea: 'vt_suppression_art11',
      specialistRole: 'Suppression & Constitutional Counsel',
      description: 'Challenge unlawful exit order under State v. Sprague.',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const issueB = db.insertIssue({
      id: 'issue-bwc-impeachment',
      matterId: 'matter-vt-state-v-thorne',
      title: 'Trooper Keller BWC Impeachment Matrix',
      practiceArea: 'vt_discovery_impeachment',
      specialistRole: 'Discovery & Deposition Impeachment Analyst',
      parentIssueId: issueA.id,
      description: 'Cross-reference Paragraph 5 of Affidavit against BWC timestamps.',
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(db.listIssues('matter-vt-state-v-thorne').length).toBe(2);

    // 2. Run isolated turns inside Issue A and Issue B
    const turnA = await loop.runTurn({
      matterId: 'matter-vt-state-v-thorne',
      issueId: issueA.id,
      userPrompt: 'Draft the Article 11 exit order suppression argument under State v. Sprague.',
    });
    expect(turnA.assistantMessage.issueId).toBe(issueA.id);
    expect(turnA.assistantMessage.assembledSystemPromptSnapshot).toContain(
      'FOCUSED CASE ISSUE: Art. 11 Exit Order Suppression'
    );

    const turnB = await loop.runTurn({
      matterId: 'matter-vt-state-v-thorne',
      issueId: issueB.id,
      userPrompt: 'Prepare the impeachment table comparing Trooper Keller Affidavit and BWC.',
    });
    expect(turnB.assistantMessage.issueId).toBe(issueB.id);

    // Verify per-issue message isolation while matter-wide listMessages retains everything
    const msgsA = db.listMessages('matter-vt-state-v-thorne', issueA.id);
    const msgsB = db.listMessages('matter-vt-state-v-thorne', issueB.id);
    const allMsgs = db.listMessages('matter-vt-state-v-thorne');
    expect(msgsA.length).toBe(2);
    expect(msgsB.length).toBe(2);
    expect(allMsgs.length).toBeGreaterThanOrEqual(6);

    // 3. Synthesize Master Brief across both Case Issues (§10.3)
    const versionsBefore = db.listDocumentVersions('matter-vt-state-v-thorne').length;
    const synthesis = await loop.synthesizeMasterBrief({
      matterId: 'matter-vt-state-v-thorne',
      briefTitle: 'State v. Marcus Thorne — Consolidated Master Suppression Brief',
    });

    expect(synthesis.includedIssueCount).toBe(2);
    expect(synthesis.synthesizedContent).toContain('SECTION I: ART. 11 EXIT ORDER SUPPRESSION');
    expect(synthesis.synthesizedContent).toContain(
      'SECTION II: TROOPER KELLER BWC IMPEACHMENT MATRIX'
    );
    expect(synthesis.synthesizedContent).toContain(
      'CONSOLIDATED STATEMENT OF THE RECORD & MATERIAL FACTS'
    );

    // Verify a new DocumentVersion redline was created and issues were marked synthesized
    const versionsAfter = db.listDocumentVersions('matter-vt-state-v-thorne');
    expect(versionsAfter.length).toBe(versionsBefore + 1);
    expect(versionsAfter[0].title).toBe(
      'State v. Marcus Thorne — Consolidated Master Suppression Brief'
    );

    const updatedIssues = db.listIssues('matter-vt-state-v-thorne');
    expect(updatedIssues.every((i) => i.status === 'synthesized')).toBe(true);

    // 4. Test T3-style checkpoint forking (forkIssue) and incorporating back (mergeBackIssue)
    const forkedIssue = db.forkIssue({
      matterId: 'matter-vt-state-v-thorne',
      sourceIssueId: issueA.id,
      upToMessageId: turnA.assistantMessage.id,
      title: 'Bauder Exigent Circumstances Fork',
      practiceArea: 'vt_suppression_art11',
      specialistRole: 'Appellate Preservation Auditor',
      relationshipToParent: 'fork',
    });

    expect(forkedIssue.parentIssueId).toBe(issueA.id);
    expect(forkedIssue.relationshipToParent).toBe('fork');
    expect(forkedIssue.forkedFromMessageId).toBe(turnA.assistantMessage.id);

    const forkedMsgs = db.listMessages('matter-vt-state-v-thorne', forkedIssue.id);
    expect(forkedMsgs.length).toBe(2);

    await loop.runTurn({
      matterId: 'matter-vt-state-v-thorne',
      issueId: forkedIssue.id,
      userPrompt: 'Draft the warrantless console search challenge under State v. Bauder.',
    });

    const mergedRes = await loop.mergeBackIssue({
      issueId: forkedIssue.id,
      targetIssueId: issueA.id,
    });
    expect(mergedRes.targetIssueId).toBe(issueA.id);
    expect(mergedRes.mergedMessage.content).toContain(
      'INCORPORATED ISSUE ANALYSIS: BAUDER EXIGENT CIRCUMSTANCES FORK'
    );
    expect(db.getIssue(forkedIssue.id)?.settled).toBe(true);
    expect(db.getIssue(forkedIssue.id)?.status).toBe('synthesized');

    // 5. Verify Case Issue settling, reopening, deletion, and listAllIssues
    db.setIssueSettled(issueA.id, false);
    expect(db.getIssue(issueA.id)?.settled).toBe(false);
    db.setIssueSettled(issueA.id, true);
    expect(db.getIssue(issueA.id)?.settled).toBe(true);
    expect(db.getIssue(issueA.id)?.settledAt).toBeDefined();

    const allIssuesInDb = db.listAllIssues();
    expect(allIssuesInDb.length).toBe(3);

    db.setActiveIssueId('matter-vt-state-v-thorne', issueB.id);
    expect(db.getActiveIssueId('matter-vt-state-v-thorne')).toBe(issueB.id);
    db.deleteIssue(issueB.id);
    expect(db.getIssue(issueB.id)).toBeNull();
    expect(db.listMessages('matter-vt-state-v-thorne', issueB.id).length).toBe(0);
    expect(db.getActiveIssueId('matter-vt-state-v-thorne')).toBeNull();
  });

  it('auto-syncs .docx and .rtf files from a Matter folder while ignoring unsupported extensions', () => {
    const matterFolder = path.join(tmpDir, 'matter-docx-rtf-sync');
    fs.mkdirSync(matterFolder, { recursive: true });

    db.updateMatter({
      matterId: 'matter-apex-meridian',
      name: 'Apex Biometrics v. Meridian Cloud Systems',
      clientName: 'Apex Biometrics, Inc.',
      matterNumber: '2026-CV-04192-DEL',
      practiceArea: 'general_litigation',
      jurisdiction: 'Delaware Court of Chancery',
      citationStyle: 'The Bluebook (21st Ed.)',
      folderPath: matterFolder,
    });

    // Write a real .docx file into the matter folder
    const docxBuf = exportDocxBuffer({
      title: 'Supplemental Breach Notice',
      content: '# SUPPLEMENTAL BREACH NOTICE\n\n1. Meridian failed to cure SLA outage.',
    });
    fs.writeFileSync(
      path.join(matterFolder, '09_Supplemental_Contract_Amendment.docx'),
      docxBuf
    );

    // Write an .rtf file into the matter folder
    fs.writeFileSync(
      path.join(matterFolder, '10_Court_Scheduling_Order.rtf'),
      '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Times New Roman;}}\\f0\\fs24 SCHEDULING ORDER: Discovery closes December 15.\\par}',
      'utf8'
    );

    // Write unsupported and hidden files that must be ignored
    fs.writeFileSync(path.join(matterFolder, 'photo.png'), 'binary', 'utf8');
    fs.writeFileSync(path.join(matterFolder, '.DS_Store'), 'meta', 'utf8');

    const watcher = new MatterFolderWatcher(db);
    const res = watcher.syncMatterFolder('matter-apex-meridian');
    expect(res.folderExists).toBe(true);
    expect(res.syncedCount).toBe(2);

    const contractDoc = res.newDocuments.find(
      (d) => d.fileName === '09_Supplemental_Contract_Amendment.docx'
    );
    expect(contractDoc?.category).toBe('CONTRACT');
    expect(contractDoc?.content).toContain('Meridian failed to cure SLA outage');

    const rtfDoc = res.newDocuments.find(
      (d) => d.fileName === '10_Court_Scheduling_Order.rtf'
    );
    expect(rtfDoc?.content).toContain('SCHEDULING ORDER: Discovery closes December 15.');
  });

  it('verifies the Interactive Guided Tour (TOUR_STEPS) has up-to-date coverage, an intro card explaining LexHarness vs. chatbots, per-point target selectors, and distinct icons', () => {
    expect(TOUR_STEPS.length).toBe(7);

    // 1. Verify first card explains LexHarness: harnessing coding agents for legal work & why it beats a chatbot
    const introCard = TOUR_STEPS[0];
    expect(introCard.id).toBe('why_lexharness');
    const introText = `${introCard.title} ${introCard.subtitle} ${introCard.content.join(' ')}`;
    expect(introText).toContain('Coding Agents');
    expect(introText).toContain('Chatbot');
    expect(introCard.points.length).toBeGreaterThanOrEqual(4);

    // 2. Verify every card has per-point target selectors and all referenced #tour-* IDs exist in the renderer UI
    const appSource = fs.readFileSync(
      path.join(__dirname, '../../renderer/App.tsx'),
      'utf8'
    );
    const rightPaneSource = fs.readFileSync(
      path.join(__dirname, '../../renderer/components/RightWorkspacePane.tsx'),
      'utf8'
    );
    const combinedRendererSource = `${appSource}\n${rightPaneSource}`;

    for (const step of TOUR_STEPS) {
      expect(step.points.length).toBeGreaterThan(0);
      expect(step.content).toEqual(step.points.map((p) => p.text));
      const cardId = step.targetSelector.replace(/^#/, '');
      expect(combinedRendererSource).toContain(cardId);

      for (const pt of step.points) {
        expect(pt.targetSelector.startsWith('#tour-')).toBe(true);
        const pointDomId = pt.targetSelector.replace(/^#/, '');
        expect(combinedRendererSource).toContain(pointDomId);
      }
    }

    // 3. Verify unique icons are used for Guided Tour (Compass) vs Sample Legal Prompts (ScrollText), not Sparkles
    expect(appSource).toContain('<Compass');
    expect(appSource).toContain('<ScrollText');
    expect(appSource).not.toContain('<Sparkles');

    // 4. Verify all major features are covered across the tutorial steps
    const combinedText = TOUR_STEPS.map(
      (s) => `${s.title} ${s.subtitle} ${s.content.join(' ')} ${s.keyHighlight || ''}`
    ).join('\n');

    expect(combinedText).toContain('Case Issues');
    expect(combinedText).toContain('Settled');
    expect(combinedText).toContain('.docx');
    expect(combinedText).toContain('.pdf');
    expect(combinedText).toContain('.xlsx');
    expect(combinedText).toContain('Sync Folder');
    expect(combinedText).toContain('Privileged PII Shield');
    expect(combinedText).toContain('Citation & Record Auditor');
    expect(combinedText).toContain('Opposing Counsel');
    expect(combinedText).toContain('Spin Off Issue');
    expect(combinedText).toContain('Synthesize Master Brief');
    expect(combinedText).toContain('Export .docx');
    expect(combinedText).toContain('Tracked Changes');
  });
});
