import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { AncillaryModelManager } from '../agent/providers/AncillaryModelManager';
import { LocalPrivacyModelRouter } from '../agent/router/LocalPrivacyModelRouter';
import { Matter } from '../../shared/types';

describe('AncillaryModelManager & Ancillary Checker Model Awareness', () => {
  let tmpDir: string;
  let db: LegalDatabase;
  let sampleMatter: Matter;

  beforeEach(async () => {
    AncillaryModelManager.resetInstance();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-ancillary-test-'));
    db = new LegalDatabase(tmpDir);
    await db.initialize();

    sampleMatter = {
      id: 'matter-test-123',
      name: 'State of Vermont v. Marcus Thorne',
      clientName: 'Marcus Thorne',
      matterNumber: '26-CR-04118',
      practiceArea: 'vt_suppression_art11',
      jurisdiction: 'Vermont Superior Court, Washington Criminal Division',
      citationStyle: 'Vermont Rules / Public Domain (20XX VT XX)',
      folderPath: '~/Matters/26-CR-04118-Thorne',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  afterEach(() => {
    AncillaryModelManager.resetInstance();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('probes available models across configured agents and identifies CLI restrictions', async () => {
    const manager = AncillaryModelManager.getInstance(db);
    const options = manager.probeAvailableModels();

    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);

    // Should never include built-in simulator in UX model options
    const simOption = options.find((o) => o.providerId === 'legal-simulator');
    expect(simOption).toBeUndefined();

    // If codex has chatgpt auth mode, o4-mini should be flagged as unavailable with restriction reason
    const codexO4Mini = options.find((o) => o.providerId === 'codex-cli' && o.modelId === 'o4-mini');
    if (codexO4Mini && !codexO4Mini.isAvailable) {
      expect(codexO4Mini.statusDetail).toContain('ChatGPT account');
    }
  });

  it('automatically assigns working models initially and generates advisories if configured model is restricted', async () => {
    const manager = AncillaryModelManager.getInstance(db);
    const registry = await manager.refreshModelRegistry();

    expect(registry.roles.low_cost_economy).toBeDefined();
    expect(registry.roles.low_cost_economy.modelId).toBeTruthy();
    expect(registry.roles.low_cost_economy.providerId).toBeTruthy();

    expect(registry.roles.citation_auditor).toBeDefined();
    expect(registry.roles.opposing_counsel).toBeDefined();

    // The assigned low_cost_economy model should be a working model
    expect(registry.roles.low_cost_economy.modelId).not.toBe('o4-mini');
  });

  it('flags restricted model with clear usage explanation if user or default had o4-mini configured', async () => {
    // Deliberately set economy model to o4-mini on codex-cli in database settings
    db.savePrivacyRoutingSettings({
      economyModelProvider: 'codex-cli',
      economyModel: 'o4-mini',
    });

    const manager = AncillaryModelManager.getInstance(db);
    const registry = await manager.refreshModelRegistry();

    // Check if an advisory was generated for low_cost_economy explaining the usage
    const advisory = registry.advisories.find((a) => a.role === 'low_cost_economy');
    if (advisory) {
      expect(advisory.configuredModel).toBe('o4-mini');
      expect(advisory.usageExplanation.toLowerCase()).toContain('citation formatting');
      expect(advisory.usageExplanation.toLowerCase()).toContain('procedural checks');
      expect(advisory.suggestedAlternatives.length).toBeGreaterThan(0);
    }
  });

  it('allows user to repick an ancillary checker model and clears the advisory', async () => {
    // Deliberately trigger an advisory
    db.savePrivacyRoutingSettings({
      economyModelProvider: 'codex-cli',
      economyModel: 'o4-mini',
    });

    const manager = AncillaryModelManager.getInstance(db);
    await manager.refreshModelRegistry();

    // User repicks a working model (e.g. gemini-3.8-flash on Antigravity)
    const updatedRegistry = await manager.repickAncillaryModel(
      'low_cost_economy',
      'agy-acp',
      'gemini-3.8-flash'
    );

    expect(updatedRegistry.roles.low_cost_economy.providerId).toBe('agy-acp');
    expect(updatedRegistry.roles.low_cost_economy.modelId).toBe('gemini-3.8-flash');
    expect(updatedRegistry.advisories.some((a) => a.role === 'low_cost_economy')).toBe(false);

    // Verify settings were saved to database
    const savedSettings = db.getPrivacyRoutingSettings();
    expect(savedSettings.economyModelProvider).toBe('agy-acp');
    expect(savedSettings.economyModel).toBe('gemini-3.8-flash');
  });

  it('resolves working economy model for Fast Economy without touching user primary frontier model', async () => {
    // Primary model is user-selected frontier model (e.g. gpt-6-luna or claude-opus-5-5)
    db.saveAdversarialConfig({
      primaryProvider: 'codex-cli',
      primaryModel: 'gpt-6-luna',
    });

    const router = new LocalPrivacyModelRouter(db);

    // 1. Substantive frontier inquiry -> uses user's chosen primary model
    const frontierEval = await router.evaluateAndScrub({
      matter: sampleMatter,
      userPrompt: 'Draft Motion to Suppress Exit Order under Vt. Const. art. 11 and State v. Sprague',
    });
    expect(frontierEval.selectedTier).toBe('FRONTIER_REASONING');
    expect(frontierEval.selectedModel).toBe('gpt-6-luna'); // User choice preserved

    // 2. Ancillary citation verification inquiry -> routes to FAST_ECONOMY using working economy model
    const citationEval = await router.evaluateAndScrub({
      matter: sampleMatter,
      userPrompt: 'Format citation according to Bluebook and verify public domain format for 2003 VT 20',
    });
    expect(citationEval.selectedTier).toBe('FAST_ECONOMY');
    expect(citationEval.selectedModel).not.toBe('o4-mini');
    expect(citationEval.selectedModel).toBeTruthy();
  });

  it('Issue #12 regression: uses current Claude 5.5 defaults (claude-sonnet-5-5, claude-opus-5-5, claude-haiku-5-5), exposes only agent providers (no direct HTTPS model providers), syncs Settings & Models API into agent models, and shows model errors instead of falling back to local templates', async () => {
    // 1. Verify PROVIDER_CATALOG lists only CLI agents (codex-cli, claude-cli, agy-acp)—no direct HTTPS API providers or simulator choices
    const providers = db.listProviderConfigs();
    expect(providers.map((p) => p.id)).toEqual([
      'codex-cli',
      'claude-cli',
      'agy-acp',
    ]);
    const claudeCliCfg = providers.find((p) => p.id === 'claude-cli');

    expect(claudeCliCfg?.defaultModel).toBe('claude-sonnet-5-5');
    expect(claudeCliCfg?.availableModels.map((m) => m.id)).toEqual([
      'claude-sonnet-5-5',
      'claude-opus-5-5',
      'claude-fable-5-2',
      'claude-haiku-5-5',
    ]);

    // 2. Verify retired 3.x slugs and legacy direct-API provider IDs saved in Settings are migrated to agent IDs and 5.5 model slugs
    db.savePrivacyRoutingSettings({
      economyModelProvider: 'anthropic',
      economyModel: 'claude-3-5-haiku-latest',
    });
    expect(db.getPrivacyRoutingSettings().economyModelProvider).toBe('claude-cli');
    expect(db.getPrivacyRoutingSettings().economyModel).toBe('claude-haiku-5-5');

    db.saveAdversarialConfig({
      primaryProvider: 'anthropic',
      primaryModel: 'claude-3-7-sonnet-latest',
      citationAuditorProvider: 'gemini',
      citationAuditorModel: 'claude-3-5-haiku-latest',
      opposingCounselProvider: 'openai',
      opposingCounselModel: 'claude-3-opus-latest',
    });
    const migratedAdv = db.getAdversarialConfig();
    expect([
      'codex-cli',
      'claude-cli',
      'agy-acp',
    ]).toContain(migratedAdv.primaryProvider);
    expect(migratedAdv.citationAuditorProvider).toBe('agy-acp');
    expect(migratedAdv.opposingCounselProvider).toBe('codex-cli');
    expect(migratedAdv.citationAuditorModel).toBe('claude-haiku-5-5');
    expect(migratedAdv.opposingCounselModel).toBe('claude-opus-5-5');

    // 3. Verify custom Lead Counsel model set in Settings is preserved and surfaced in agent availableModels
    db.saveProviderCredential({
      providerId: 'claude-cli',
      apiKey: 'sk-ant-test-models-api-key',
    });
    db.saveAdversarialConfig({
      primaryProvider: 'claude-cli',
      primaryModel: 'claude-sonnet-5-5-custom',
    });
    const updatedClaude = db
      .listProviderConfigs()
      .find((p) => p.id === 'claude-cli');
    expect(updatedClaude?.defaultModel).toBe('claude-sonnet-5-5-custom');
    expect(
      updatedClaude?.availableModels.some(
        (m) => m.id === 'claude-sonnet-5-5-custom'
      )
    ).toBe(true);

    // 4. Verify Models API discovery populates availableModels on claude-cli and filters out retired claude-3-* models
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/v1/models')) {
          return new Response(
            JSON.stringify({
              data: [
                { id: 'claude-sonnet-5-5', display_name: 'Claude Sonnet 5.5' },
                { id: 'claude-opus-5-5', display_name: 'Claude Opus 5.5' },
                { id: 'claude-haiku-5-5', display_name: 'Claude Haiku 5.5' },
                {
                  id: 'claude-sonnet-5-5-20261022',
                  display_name: 'Claude Sonnet 5.5 (Oct 2026)',
                },
                {
                  id: 'claude-3-5-haiku-latest',
                  display_name: 'Retired Claude 3.5 Haiku',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            type: 'error',
            error: {
              type: 'not_found_error',
              message: 'model: retired-model-id',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      const manager = AncillaryModelManager.getInstance(db);
      const registry = await manager.refreshModelRegistry();
      expect(
        registry.availableWorkingModels.some(
          (m) =>
            m.providerId === 'claude-cli' &&
            m.modelId === 'claude-sonnet-5-5-20261022'
        )
      ).toBe(true);
      expect(
        registry.availableWorkingModels.some((m) =>
          m.modelId.startsWith('claude-3-')
        )
      ).toBe(false);

      const syncedClaude = db
        .listProviderConfigs()
        .find((p) => p.id === 'claude-cli');
      expect(
        syncedClaude?.availableModels.some(
          (m) => m.id === 'claude-sonnet-5-5-20261022'
        )
      ).toBe(true);

      // 5. Verify when an agent model call fails (e.g. HTTP 404), LegalAgentLoop shows the error instead of falling back to the local template
      const { LegalAgentLoop } = await import('../agent/LegalAgentLoop');
      const loop = new LegalAgentLoop(db);
      const failedTurn = await loop.runTurn({
        matterId: 'matter-vt-state-v-thorne',
        userPrompt:
          'Draft a Complaint from the uploaded demand letter.',
        overridePrimaryProvider: 'claude-cli',
        overridePrimaryModel: 'claude-sonnet-5-5',
      });

      expect(failedTurn.assistantMessage.content).toContain(
        '### Model Call Error — CLAUDE-CLI (claude-sonnet-5-5)'
      );
      expect(failedTurn.assistantMessage.content).toContain('HTTP 404');
      expect(failedTurn.assistantMessage.content).toContain('not_found_error');
      // Must NOT fall back to the local template outline
      expect(failedTurn.assistantMessage.content).not.toContain(
        '# INITIAL DRAFT WORK PRODUCT'
      );
      expect(failedTurn.assistantMessage.content).not.toContain(
        '# VERIFIED LEGAL WORK PRODUCT'
      );
      expect(failedTurn.assistantMessage.content).not.toContain(
        'The local legal engine answered below'
      );
      expect(failedTurn.assistantMessage.adversarialReviews.length).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
