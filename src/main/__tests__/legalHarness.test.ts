import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { PromptAssembler } from '../agent/PromptAssembler';
import { LegalAgentLoop } from '../agent/LegalAgentLoop';
import { CliAgentDriverManager } from '../agent/providers/CliAgentDriverManager';

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

    // Verify turn with explicit Agent & Model selection as per T3 control surface
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
    } finally {
      try {
        fs.rmSync(tempHome, { recursive: true, force: true });
      } catch {
        // Cleanup
      }
    }
  });
});
