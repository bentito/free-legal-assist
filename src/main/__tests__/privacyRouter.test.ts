import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { LegalAgentLoop } from '../agent/LegalAgentLoop';
import { PiiScrubberVault } from '../agent/router/PiiScrubberVault';
import { OnnxRouterEngine } from '../agent/router/OnnxRouterEngine';
import { OnnxPiiClassifier } from '../agent/router/OnnxPiiClassifier';
import { RoutingDebugLogger } from '../agent/router/RoutingDebugLogger';
import { LocalPrivacyModelRouter } from '../agent/router/LocalPrivacyModelRouter';
import { Matter, RoutingDecisionLog } from '../../shared/types';

describe('Phase 2 Item 7: LocalPrivacyModelRouter, PiiScrubberVault & RoutingDebugLogger', () => {
  let tmpDir: string;
  let db: LegalDatabase;
  let sampleMatter: Matter;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-router-test-'));
    db = new LegalDatabase(tmpDir);
    await db.initialize();

    sampleMatter = {
      id: 'matter-vt-state-v-thorne',
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
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('PiiScrubberVault & Evidentiary Allowlist Protection', () => {
    it('accurately strips client names and docket IDs while preserving Bluebook citations, Bates stamps, and timestamps', () => {
      const vault = new PiiScrubberVault();
      vault.registerMatterRoster(sampleMatter);

      const rawInput =
        'Marcus Thorne was stopped under docket 26-CR-04118. ' +
        'At 23:21:10 on BWC footage [STATE-BWC-0014], the officer initiated an exit order. ' +
        'Defense argues under State v. Sprague, 2003 VT 20, ¶ 16, State v. Bauder, 2007 VT 16, and ' +
        'Vt. Const. ch. I, art. 11 that exit orders require reasonable suspicion. ' +
        'See also 13 V.S.A. § 7554 and deposition [DEF-DEP-0018].';

      const { scrubbedText, audit } = vault.scrub(rawInput);

      // Verify PII is scrubbed
      expect(scrubbedText).not.toContain('Marcus Thorne');
      expect(scrubbedText).toContain('[CLIENT_DEFENDANT_1]');
      expect(scrubbedText).not.toContain('26-CR-04118');
      expect(scrubbedText).toContain('[DOCKET_ID_1]');

      // CRITICAL: Verify citations, Bates stamps, and BWC timestamps are 100% PRESERVED
      expect(scrubbedText).toContain('23:21:10');
      expect(scrubbedText).toContain('[STATE-BWC-0014]');
      expect(scrubbedText).toContain('2003 VT 20');
      expect(scrubbedText).toContain('2007 VT 16');
      expect(scrubbedText).toContain('Vt. Const. ch. I, art. 11');
      expect(scrubbedText).toContain('13 V.S.A. § 7554');
      expect(scrubbedText).toContain('[DEF-DEP-0018]');

      // Verify audit metrics
      expect(audit.entitiesDetectedCount).toBeGreaterThanOrEqual(2);
      expect(audit.tokensMasked).toContain('[CLIENT_DEFENDANT_1]');
      expect(audit.tokensMasked).toContain('[DOCKET_ID_1]');
      expect(audit.rehydrationSuccessful).toBe(true);

      // Test Reversible Re-Hydration
      const rehydrated = vault.rehydrate(scrubbedText);
      expect(rehydrated).toContain('Marcus Thorne');
      expect(rehydrated).toContain('26-CR-04118');
      expect(rehydrated).toBe(rawInput);
    });

    it('scrubs structured PII regexes: SSN, phone numbers, emails, addresses, driver licenses, and accounts', () => {
      const vault = new PiiScrubberVault();
      vault.registerMatterRoster(sampleMatter);

      const confidentialText =
        'Client Marcus Thorne (SSN: 987-65-4321, DOB: 05/14/1986) resides at 142 North Main Street. ' +
        'Contact phone: (802) 555-0199, email: marcus.thorne@example.com. ' +
        'Driver License DL: V8921829. Card: 4111-2222-3333-4444. Ref pinpoint [STATE-0001].';

      const { scrubbedText, audit } = vault.scrub(confidentialText);

      expect(scrubbedText).not.toContain('987-65-4321');
      expect(scrubbedText).toContain('[SSN_REDACTED_1]');

      expect(scrubbedText).not.toContain('(802) 555-0199');
      expect(scrubbedText).toContain('[PHONE_REDACTED_1]');

      expect(scrubbedText).not.toContain('marcus.thorne@example.com');
      expect(scrubbedText).toContain('[EMAIL_REDACTED_1]');

      expect(scrubbedText).not.toContain('142 North Main Street');
      expect(scrubbedText).toContain('[ADDRESS_REDACTED_1]');

      expect(scrubbedText).not.toContain('V8921829');
      expect(scrubbedText).toContain('[DL_NUMBER_1]');

      expect(scrubbedText).not.toContain('4111-2222-3333-4444');
      expect(scrubbedText).toContain('[ACCOUNT_REDACTED_1]');

      // Bates stamp must NOT be scrubbed
      expect(scrubbedText).toContain('[STATE-0001]');

      // Full inbound re-hydration test
      const restored = vault.rehydrate(scrubbedText);
      expect(restored).toContain('Marcus Thorne');
      expect(restored).toContain('987-65-4321');
      expect(restored).toContain('(802) 555-0199');
      expect(restored).toContain('marcus.thorne@example.com');
      expect(restored).toContain('142 North Main Street');
      expect(restored).toContain('V8921829');
      expect(restored).toContain('4111-2222-3333-4444');
      expect(restored).toBe(confidentialText);
    });

    it('encrypts and restores pseudonym vault mappings using safeStorage / encryptor', () => {
      const vault = new PiiScrubberVault();
      vault.registerMatterRoster(sampleMatter);
      vault.scrub('Marcus Thorne phone 802-555-1234');

      const cipher = vault.exportVaultEncrypted();
      expect(typeof cipher).toBe('string');
      expect(cipher.length).toBeGreaterThan(0);

      const restoredVault = new PiiScrubberVault();
      restoredVault.importVaultDecrypted(cipher);

      expect(restoredVault.rehydrate('Defendant [CLIENT_DEFENDANT_1] called [PHONE_REDACTED_1]')).toBe(
        'Defendant Marcus Thorne called 802-555-1234'
      );
    });
  });

  describe('OnnxPiiClassifier & Contextual NER', () => {
    it('detects uncataloged law enforcement officers and judges as contextual legal entities', async () => {
      const classifier = new OnnxPiiClassifier();
      const text =
        'Trooper Daniel Kelly conducted the stop while Officer David Chen operated the BWC. ' +
        'Presiding Judge Mary Miles Teachout reviewed the warrant application.';

      const entities = await classifier.extractContextualEntities(text);

      expect(entities.length).toBeGreaterThanOrEqual(3);
      expect(entities.some((e) => e.name === 'Trooper Daniel Kelly' && e.category === 'OFFICER_NAME')).toBe(true);
      expect(entities.some((e) => e.name === 'Officer David Chen' && e.category === 'OFFICER_NAME')).toBe(true);
      expect(entities.some((e) => e.name === 'Judge Mary Miles Teachout' && e.category === 'JUDGE_NAME')).toBe(true);
    });
  });

  describe('OnnxRouterEngine: Complexity Classification & Logits', () => {
    it('routes substantive constitutional suppression inquiries to FRONTIER_REASONING with high complexity score', async () => {
      const engine = new OnnxRouterEngine();
      const result = await engine.classify({
        userPrompt: 'Draft motion to suppress exit order under Vt. Const. art. 11 and State v. Sprague',
        corpusExcerpt: 'Affidavit of Trooper Kelly contradicts BWC footage at 23:21:10 regarding exit order justification.',
      });

      expect(result.recommendedTier).toBe('FRONTIER_REASONING');
      expect(result.onnxComplexityScore).toBeGreaterThanOrEqual(0.80);
      expect(result.inferredIntent).toBe('vt_suppression_art11');
      expect(result.onnxLogits.FRONTIER_REASONING).toBeGreaterThan(0.70);
      expect(result.decisionReason).toContain('Vt. Const. art. 11');
    });

    it('routes citation verification and format inquiries to FAST_ECONOMY with low complexity score', async () => {
      const engine = new OnnxRouterEngine();
      const result = await engine.classify({
        userPrompt: 'Format citation according to Bluebook and verify public domain format for 2003 VT 20',
      });

      expect(result.recommendedTier).toBe('FAST_ECONOMY');
      expect(result.onnxComplexityScore).toBeLessThan(0.40);
      expect(result.inferredIntent).toBe('format_citation');
      expect(result.onnxLogits.FAST_ECONOMY).toBeGreaterThan(0.70);
    });

    it('routes air-gapped matters to LOCAL_PRIVATE regardless of prompt complexity', async () => {
      const engine = new OnnxRouterEngine();
      const result = await engine.classify({
        userPrompt: 'Draft complex constitutional suppression motion under Vt. Const. art. 11',
        isAirGappedMatter: true,
      });

      expect(result.recommendedTier).toBe('LOCAL_PRIVATE');
      expect(result.onnxLogits.LOCAL_PRIVATE).toBeGreaterThanOrEqual(0.90);
      expect(result.decisionReason).toContain('Air-gapped');
    });
  });

  describe('RoutingDebugLogger & Dual Persistence (SQLite + JSONL)', () => {
    it('records structured routing decisions to SQLite and append-only JSONL log', async () => {
      const logger = new RoutingDebugLogger(db);

      const sampleDecision: RoutingDecisionLog = {
        id: 'route-evt-test-001',
        timestamp: new Date().toISOString(),
        matterId: sampleMatter.id,
        turnNumber: 1,
        metrics: {
          rawPromptLength: 120,
          corpusExcerptTokens: 450,
          totalInputTokens: 570,
        },
        classification: {
          inferredIntent: 'vt_suppression_art11',
          onnxComplexityScore: 0.884,
          onnxLogits: {
            LOCAL_PRIVATE: 0.042,
            FAST_ECONOMY: 0.118,
            FRONTIER_REASONING: 0.84,
          },
          decisionReason: 'High substantive constitutional complexity (Vt. Const. art. 11 exit order)',
        },
        selectedTier: 'FRONTIER_REASONING',
        selectedModel: 'claude-opus-5-5',
        costEstimate: {
          selectedModelCostUSD: 0.0085,
          frontierBaselineCostUSD: 0.0085,
          estimatedSavingsUSD: 0.0,
        },
        piiAudit: {
          entitiesDetectedCount: 3,
          categories: { CLIENT_NAME: 1, DOCKET_ID: 1, OFFICER_NAME: 1 },
          tokensMasked: ['[CLIENT_DEFENDANT_1]', '[DOCKET_ID_1]', '[LAW_ENFORCEMENT_WITNESS_1]'],
          rehydrationSuccessful: true,
        },
      };

      await logger.logDecision(sampleDecision);

      // Verify SQLite persistence
      const sqliteLogs = logger.getLogs(sampleMatter.id);
      expect(sqliteLogs.length).toBe(1);
      expect(sqliteLogs[0].id).toBe('route-evt-test-001');
      expect(sqliteLogs[0].selectedTier).toBe('FRONTIER_REASONING');
      expect(sqliteLogs[0].classification.inferredIntent).toBe('vt_suppression_art11');

      // Verify JSONL file persistence
      const jsonlPath = logger.getJsonlPath();
      expect(fs.existsSync(jsonlPath)).toBe(true);
      const jsonlContent = fs.readFileSync(jsonlPath, 'utf8');
      expect(jsonlContent).toContain('route-evt-test-001');
      expect(jsonlContent).toContain('FRONTIER_REASONING');

      // Test export bundle
      const exportJson = await logger.exportLogs();
      const parsedExport = JSON.parse(exportJson);
      expect(parsedExport.totalDecisions).toBe(1);
      expect(parsedExport.decisions[0].id).toBe('route-evt-test-001');

      // Test clearing logs
      logger.clearLogs();
      expect(logger.getLogs().length).toBe(0);
      expect(fs.readFileSync(jsonlPath, 'utf8')).toBe('');
    });
  });

  describe('LocalPrivacyModelRouter & Policy Modes', () => {
    it('applies smart_routing policy by default, calculating cost delta and saving telemetry', async () => {
      const router = new LocalPrivacyModelRouter(db);

      const evaluation = await router.evaluateAndScrub({
        matter: sampleMatter,
        userPrompt: 'Format citation according to Bluebook for 2003 VT 20 regarding Marcus Thorne',
      });

      expect(evaluation.selectedTier).toBe('FAST_ECONOMY');
      expect(evaluation.scrubbedPrompt).not.toContain('Marcus Thorne');
      expect(evaluation.scrubbedPrompt).toContain('[CLIENT_DEFENDANT_1]');
      expect(evaluation.scrubbedPrompt).toContain('2003 VT 20');
      expect(evaluation.decisionLog.costEstimate.estimatedSavingsUSD).toBeGreaterThanOrEqual(0);

      // Verify log was recorded into SQLite
      const logs = db.listRoutingDebugLogs(sampleMatter.id);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].selectedTier).toBe('FAST_ECONOMY');
    });

    it('respects force_frontier policy mode while still performing full PII scrubbing', async () => {
      db.savePrivacyRoutingSettings({ policyMode: 'force_frontier' });
      const router = new LocalPrivacyModelRouter(db);

      const evaluation = await router.evaluateAndScrub({
        matter: sampleMatter,
        userPrompt: 'Format citation for Bluebook regarding client Marcus Thorne',
      });

      expect(evaluation.selectedTier).toBe('FRONTIER_REASONING');
      expect(evaluation.scrubbedPrompt).not.toContain('Marcus Thorne');
      expect(evaluation.scrubbedPrompt).toContain('[CLIENT_DEFENDANT_1]');
    });

    it('respects local_only_airgapped policy mode for strictly on-device execution', async () => {
      db.savePrivacyRoutingSettings({ policyMode: 'local_only_airgapped' });
      const router = new LocalPrivacyModelRouter(db);

      const evaluation = await router.evaluateAndScrub({
        matter: sampleMatter,
        userPrompt: 'Draft complex constitutional motion under Vt. Const. art. 11 for Marcus Thorne',
      });

      expect(evaluation.selectedTier).toBe('LOCAL_PRIVATE');
      expect(evaluation.selectedModel).toBe('local-legal-engine');
      expect(evaluation.decisionLog.costEstimate.selectedModelCostUSD).toBe(0.0);
    });
  });

  describe('LegalAgentLoop End-to-End Integration with Privacy Router', () => {
    it('executes a legal turn with PII scrubbing, route tier selection, and re-hydrated assistant output', async () => {
      const loop = new LegalAgentLoop(db);

      const progressEvents: string[] = [];
      const result = await loop.runTurn({
        matterId: sampleMatter.id,
        userPrompt: 'Draft Motion to Suppress Exit Order under Vt. Const. art. 11 for Marcus Thorne based on BWC [STATE-BWC-0014]',
        onProgress: (event) => {
          progressEvents.push(`${event.phase}: ${event.statusText}`);
        },
      });

      // Verify progress events include PII shield status
      const shieldEvent = progressEvents.find((p) => p.includes('Privileged PII Shield'));
      expect(shieldEvent).toBeDefined();

      // Verify returned assistant message has Phase 2 routing metadata
      expect(result.assistantMessage.routeTier).toBe('FRONTIER_REASONING');
      expect(result.assistantMessage.routingLogId).toBeDefined();
      expect(result.assistantMessage.piiAudit).toBeDefined();
      expect(result.assistantMessage.piiAudit?.rehydrationSuccessful).toBe(true);

      // Verify assistant content was fully re-hydrated back to real client name
      expect(result.assistantMessage.content).toContain('Marcus Thorne');
      expect(result.assistantMessage.content).not.toContain('[CLIENT_DEFENDANT_1]');

      // Verify decision log was persisted in SQLite
      const logs = db.listRoutingDebugLogs(sampleMatter.id);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].id).toBe(result.assistantMessage.routingLogId);
      expect(logs[0].piiAudit.rehydrationSuccessful).toBe(true);
    });
  });
});
