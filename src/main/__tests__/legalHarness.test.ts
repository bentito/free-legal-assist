import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LegalDatabase } from '../db/database';
import { PromptAssembler } from '../agent/PromptAssembler';
import { LegalAgentLoop } from '../agent/LegalAgentLoop';
import { LegalMcpManager } from '../mcp/LegalMcpManager';

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
    const clToolCall = result.assistantMessage.toolCalls.find(
      (tc) => tc.toolName === 'courtlistener_lookup_citation'
    );
    expect(clToolCall).toBeDefined();
    expect(clToolCall?.mcpServerId).toBe('courtlistener-mcp');

    expect(result.assistantMessage.adversarialReviews.length).toBe(2);
    expect(result.assistantMessage.revisionRoundsCompleted).toBe(1);
    expect(result.assistantMessage.content).toContain('State v. Sprague');
    expect(result.assistantMessage.content).toContain('V.R.Cr.P. 12(d)');
  });

  it('deletes a Matter and cascades deletion of threads, documents, versions, and chronology facts', () => {
    const initialMatters = db.listMatters();
    expect(initialMatters.length).toBe(2);

    const { remainingMatters, nextActiveMatterId } = db.deleteMatter(
      'matter-apex-meridian'
    );
    expect(remainingMatters.length).toBe(1);
    expect(nextActiveMatterId).toBe('matter-vt-state-v-thorne');
    expect(db.listDocuments('matter-apex-meridian').length).toBe(0);
    expect(db.listThreads('matter-apex-meridian').length).toBe(0);
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

  it('defaults to CourtListener (free account required) as the primary Legal MCP toolset, supports authed & custom MCP toolsets, and syncs MCP config to agents', async () => {
    const servers = LegalMcpManager.listServers(db);
    expect(servers.length).toBeGreaterThanOrEqual(4);

    const courtlistener = servers[0];
    expect(courtlistener.id).toBe('courtlistener-mcp');
    expect(courtlistener.isDefault).toBe(true);
    expect(courtlistener.enabled).toBe(true);
    expect(courtlistener.authTier).toBe('free_account_required');

    // Save free CourtListener API token
    const afterSave = LegalMcpManager.saveServerConfig(db, {
      serverId: 'courtlistener-mcp',
      enabled: true,
      authToken: 'cl_free_token_9876543210abcdef',
    });
    const clUpdated = afterSave.find((s) => s.id === 'courtlistener-mcp');
    expect(clUpdated?.hasAuthToken).toBe(true);
    expect(db.getLegalMcpToken('courtlistener-mcp')).toBe(
      'cl_free_token_9876543210abcdef'
    );

    // Add custom authenticated legal MCP server
    const afterCustom = LegalMcpManager.addCustomServer(db, {
      name: 'PACER / RECAP Direct Pro MCP',
      description: 'Authenticated federal docket MCP server',
      transport: 'stdio',
      authTier: 'authenticated_pro',
      endpointUrl: 'https://pacer-mcp.example.org/v1',
      command: 'npx',
      args: ['-y', '@legal/pacer-mcp'],
      envVarName: 'PACER_API_KEY',
      authToken: 'pacer_secret_123456',
      toolNames: ['pacer_docket_query', 'pacer_document_fetch'],
    });
    expect(afterCustom.some((s) => s.name === 'PACER / RECAP Direct Pro MCP')).toBe(
      true
    );

    // Verify CLI MCP injection payload for Claude (--mcp-config) and Codex (--config mcp_servers)
    const injection = LegalMcpManager.getCliMcpInjectionArgs(db);
    expect(injection.claudeMcpConfigJson).toContain('courtlistener-mcp');
    expect(
      injection.codexConfigFlags.some((f) =>
        f.includes('mcp_servers.courtlistener_mcp')
      )
    ).toBe(true);
  });
});
