import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { PromptAssembler } from '../agent/PromptAssembler';
import { LegalAgentLoop } from '../agent/LegalAgentLoop';

describe('LexHarness Phase 1: SQLite Persistence, Prompt Governance & Multi-LLM Adversarial Loop', () => {
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

  it('seeds SQLite database with initial legal matters, documents, redline versions, and chronology', () => {
    const matters = db.listMatters();
    expect(matters.length).toBeGreaterThanOrEqual(2);

    const apex = db.getMatter('matter-apex-meridian');
    expect(apex).not.toBeNull();
    expect(apex?.jurisdiction).toContain('Delaware');

    const docs = db.listDocuments('matter-apex-meridian');
    expect(docs.length).toBe(4);

    const versions = db.listDocumentVersions('matter-apex-meridian');
    expect(versions.length).toBe(2);

    const facts = db.listChronologyFacts('matter-apex-meridian');
    expect(facts.length).toBe(4);
  });

  it('persists user-governed 4-layer legal system prompts and encrypted provider credentials across reloads', async () => {
    const updatedSettings = db.saveSystemPromptSettings({
      coreLegalMandate: 'CUSTOM FIRM MANDATE: Cite Delaware Court of Chancery precedent with pinpoint Bates numbers.',
    });
    expect(updatedSettings.version).toBe(2);

    db.saveProviderCredential({
      providerId: 'anthropic',
      apiKey: 'sk-ant-test-1234567890',
      defaultModel: 'claude-3-7-sonnet-latest',
    });

    // Reload from disk to verify SQLite persistence
    const dbReloaded = new LegalDatabase(tmpDir);
    await dbReloaded.initialize();

    expect(dbReloaded.getSystemPromptSettings().coreLegalMandate).toContain(
      'CUSTOM FIRM MANDATE'
    );
    expect(dbReloaded.getDecryptedApiKey('anthropic')).toBe('sk-ant-test-1234567890');
  });

  it('assembles 4-layer legal system prompts with zero software-engineering instructions', () => {
    const matter = db.getMatter('matter-apex-meridian')!;
    const settings = db.getSystemPromptSettings();
    const assembled = PromptAssembler.assembleForMatter(
      settings,
      matter,
      'transactional_contracts'
    );

    expect(assembled.primarySystemPrompt).toContain('LAYER 1: CORE LEGAL MANDATE');
    expect(assembled.primarySystemPrompt).toContain(
      'LAYER 2: PRACTICE AREA PERSONA — TRANSACTIONAL & COMMERCIAL CONTRACTS COUNSEL'
    );
    expect(assembled.primarySystemPrompt).toContain(
      'Delaware Court of Chancery'
    );
    expect(assembled.citationAuditorSystemPrompt).toContain(
      'Independent Citation & Record Auditor'
    );
    expect(assembled.opposingCounselSystemPrompt).toContain(
      'Adversarial Opposing Counsel'
    );
  });

  it('executes local LegalAgentLoop with default Multi-LLM Adversarial Gate and cures critic objections', async () => {
    const loop = new LegalAgentLoop(db);
    const phasesSeen: string[] = [];

    const result = await loop.runTurn({
      matterId: 'matter-apex-meridian',
      threadId: 'thread-apex-cap-analysis',
      userPrompt:
        'Assess whether Marcus Vance’s August 2, 2026 deposition admission pierces the $1.8M cap under MSA § 9.2.',
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

    expect(result.assistantMessage.toolCalls.length).toBeGreaterThanOrEqual(3);
    expect(result.assistantMessage.adversarialReviews.length).toBe(2);
    expect(result.assistantMessage.revisionRoundsCompleted).toBe(1);
    expect(result.assistantMessage.initialDraftBeforeReview).toBeDefined();
    expect(result.assistantMessage.content).toContain('$5,400,000 Enhanced Super-Cap');
  });
});
