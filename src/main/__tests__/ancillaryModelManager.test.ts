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

    // Should include built-in simulator options
    const simOption = options.find((o) => o.providerId === 'legal-simulator');
    expect(simOption).toBeDefined();
    expect(simOption?.isAvailable).toBe(true);

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

    // User repicks a working model (e.g. gemini-3.8-flash or local simulator)
    const updatedRegistry = await manager.repickAncillaryModel(
      'low_cost_economy',
      'legal-simulator',
      'lexharness-local-v1'
    );

    expect(updatedRegistry.roles.low_cost_economy.providerId).toBe('legal-simulator');
    expect(updatedRegistry.roles.low_cost_economy.modelId).toBe('lexharness-local-v1');
    expect(updatedRegistry.advisories.some((a) => a.role === 'low_cost_economy')).toBe(false);

    // Verify settings were saved to database
    const savedSettings = db.getPrivacyRoutingSettings();
    expect(savedSettings.economyModelProvider).toBe('legal-simulator');
    expect(savedSettings.economyModel).toBe('lexharness-local-v1');
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
});
