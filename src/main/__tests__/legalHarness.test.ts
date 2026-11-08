import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { PromptAssembler } from '../agent/PromptAssembler';
import { LegalAgentLoop } from '../agent/LegalAgentLoop';

describe('LexHarness: Practitioner Profiles, Matter Settings Editing & Multi-LLM Adversarial Loop', () => {
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

  it('executes local LegalAgentLoop under Vermont Criminal Defense profile with Multi-LLM Adversarial Gate and cures Article 11 / BWC objections', async () => {
    const loop = new LegalAgentLoop(db);
    const phasesSeen: string[] = [];

    const result = await loop.runTurn({
      matterId: 'matter-vt-state-v-thorne',
      threadId: 'thread-vt-suppression',
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

    expect(result.assistantMessage.toolCalls.length).toBeGreaterThanOrEqual(3);
    expect(result.assistantMessage.adversarialReviews.length).toBe(2);
    expect(result.assistantMessage.revisionRoundsCompleted).toBe(1);
    expect(result.assistantMessage.content).toContain('State v. Sprague');
    expect(result.assistantMessage.content).toContain('V.R.Cr.P. 12(d)');
  });
});
