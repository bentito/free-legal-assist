import { app, BrowserWindow, dialog, ipcMain, safeStorage, session, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { LegalDatabase, SecretEncryptor } from './db/database';
import { LegalAgentLoop } from './agent/LegalAgentLoop';
import { PromptAssembler } from './agent/PromptAssembler';
import { CliAgentDriverManager } from './agent/providers/CliAgentDriverManager';
import { AncillaryModelManager } from './agent/providers/AncillaryModelManager';
import {
  exportDocxBuffer,
  parseDocumentBuffer,
  SUPPORTED_IMPORT_EXTENSIONS,
} from './tools/DocxParser';
import { MatterFolderWatcher } from './tools/MatterFolderWatcher';
import {
  AdversarialConfig,
  AdversarialReviewMode,
  AncillaryCheckerRole,
  AppBootstrapState,
  ChronologyFact,
  CustomLegalMcpServer,
  DocumentCategory,
  ExportDocxPayload,
  FolderSyncResult,
  LLMProviderId,
  Matter,
  MatterDocument,
  MatterIssue,
  ParsedDocxPreview,
  PracticeAreaId,
  PractitionerProfileId,
  PrivacyRoutingSettings,
  SystemPromptSettings,
  UpdateMatterPayload,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let db: LegalDatabase;
let agentLoop: LegalAgentLoop;
let folderWatcher: MatterFolderWatcher;
let activeMatterId = '';

function createSafeStorageEncryptor(): SecretEncryptor {
  return {
    encrypt(plainText: string): string {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          return safeStorage.encryptString(plainText).toString('base64');
        }
      } catch {
        // Fallback below
      }
      return Buffer.from(plainText, 'utf8').toString('base64');
    },
    decrypt(cipherText: string): string {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          return safeStorage.decryptString(Buffer.from(cipherText, 'base64'));
        }
      } catch {
        // Fallback below
      }
      return Buffer.from(cipherText, 'base64').toString('utf8');
    },
  };
}

function buildBootstrapState(): AppBootstrapState {
  const matters = db.listMatters();
  const savedActiveId = db.getLastActiveMatterId();
  const currentMatter =
    (activeMatterId ? matters.find((m) => m.id === activeMatterId) : null) ??
    (savedActiveId ? matters.find((m) => m.id === savedActiveId) : null) ??
    matters[0] ??
    null;
  activeMatterId = currentMatter ? currentMatter.id : '';
  if (savedActiveId !== activeMatterId) {
    db.setLastActiveMatterId(activeMatterId);
  }

  if (folderWatcher && activeMatterId && folderWatcher.getWatchedMatterId() !== activeMatterId) {
    folderWatcher.watchMatter(activeMatterId, (result) => {
      mainWindow?.webContents.send('legal:matter-folder-synced', {
        result,
        state: buildBootstrapState(),
      });
    });
  }

  const issues = activeMatterId ? db.listIssues(activeMatterId) : [];
  const allIssues = db.listAllIssues();
  const activeIssueId = activeMatterId ? db.getActiveIssueId(activeMatterId) : null;
  const messages = activeMatterId ? db.listMessages(activeMatterId) : [];
  const documents = activeMatterId ? db.listDocuments(activeMatterId) : [];
  const documentVersions = activeMatterId ? db.listDocumentVersions(activeMatterId) : [];
  const chronologyFacts = activeMatterId ? db.listChronologyFacts(activeMatterId) : [];
  const promptSettings = db.getSystemPromptSettings();
  const adversarialConfig = db.getAdversarialConfig();
  const providers = db.listProviderConfigs();
  const assembledPromptPreview = currentMatter
    ? PromptAssembler.assembleForMatter(
        promptSettings,
        currentMatter,
        currentMatter.practiceArea
      )
    : {
        profileName: promptSettings.profiles[0]?.name ?? 'Criminal Defense Counsel',
        matterName: 'No Active Matter',
        jurisdiction: 'None Selected',
        citationStyle: 'Bluebook Standard',
        practiceAreaName: 'Criminal Defense',
        primarySystemPrompt: 'No active matter selected. Create a matter to begin.',
        citationAuditorSystemPrompt: '',
        opposingCounselSystemPrompt: '',
      };

  const onboardingSaved = db.getAgentOnboardingSavedState();
  const agentOnboarding = CliAgentDriverManager.buildAgentOnboardingState({
    completedAt: onboardingSaved.completedAt,
    setupModes: onboardingSaved.setupModes,
    additionalCodexAccounts: onboardingSaved.additionalCodexAccounts,
    cliOverrides: db.getCliOverrides(),
    courtListenerToken: db.getCourtListenerToken(),
  });

  return {
    matters,
    activeMatterId,
    issues,
    allIssues,
    activeIssueId,
    messages,
    documents,
    documentVersions,
    chronologyFacts,
    promptSettings,
    adversarialConfig,
    providers,
    assembledPromptPreview,
    agentOnboarding,
    customMcpServers: db.listCustomMcpServers(),
    privacyRoutingSettings: db.getPrivacyRoutingSettings(),
    recentRoutingLogs: db.listRoutingDebugLogs(activeMatterId || undefined, 20),
    ancillaryModelRegistry: AncillaryModelManager.getInstance(db).getState(),
  };
}

function registerIpcHandlers(): void {
  ipcMain.handle('legal:bootstrap', async () => {
    return buildBootstrapState();
  });

  ipcMain.handle('legal:select-matter', async (_event, matterId: string) => {
    activeMatterId = matterId;
    db.setLastActiveMatterId(matterId);
    return buildBootstrapState();
  });

  ipcMain.handle(
    'legal:create-matter',
    async (
      _event,
      payload: {
        name: string;
        clientName: string;
        matterNumber: string;
        practiceArea: PracticeAreaId;
        jurisdiction: string;
        citationStyle: string;
      }
    ) => {
      const now = new Date().toISOString();
      const rawNumber = (payload.matterNumber || '').trim();
      const existingCollide = rawNumber
        ? db
            .listMatters()
            .some(
              (m) =>
                m.matterNumber.trim().toLowerCase() === rawNumber.toLowerCase() &&
                (rawNumber === '26-CR-00001' ||
                  rawNumber.startsWith('26-CR-05512'))
            )
        : false;
      const effectiveMatterNumber =
        !rawNumber || existingCollide
          ? db.generateNextMatterNumber(payload.practiceArea)
          : rawNumber;

      const newMatter: Matter = {
        id: `matter-${Date.now()}`,
        name: payload.name,
        clientName: payload.clientName,
        matterNumber: effectiveMatterNumber,
        practiceArea: payload.practiceArea,
        jurisdiction: payload.jurisdiction,
        citationStyle: payload.citationStyle,
        folderPath: `~/Matters/${effectiveMatterNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}`,
        createdAt: now,
        updatedAt: now,
      };
      db.insertMatter(newMatter);
      activeMatterId = newMatter.id;
      db.setLastActiveMatterId(activeMatterId);

      const initialDoc: MatterDocument = {
        id: `doc-${Date.now()}`,
        matterId: newMatter.id,
        title: `${newMatter.name} — Initial Matter Memorandum`,
        fileName: '01_Initial_Matter_Memorandum.md',
        category: 'WORK_PRODUCT',
        batesRange: 'WP-0001',
        pageCount: 1,
        summary: `Initial work-product memorandum for ${newMatter.name} (${newMatter.jurisdiction}).`,
        content: `# INITIAL MATTER MEMORANDUM: ${newMatter.name.toUpperCase()}\n\n- **Client**: ${newMatter.clientName}\n- **Matter / Docket No.**: ${newMatter.matterNumber}\n- **Governing Jurisdiction**: ${newMatter.jurisdiction}\n- **Citation Manual**: ${newMatter.citationStyle}\n`,
        createdAt: now,
        updatedAt: now,
      };
      db.insertDocument(initialDoc);

      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:update-matter',
    async (_event, payload: UpdateMatterPayload) => {
      db.updateMatter(payload);
      if (folderWatcher && payload.matterId === activeMatterId) {
        folderWatcher.watchMatter(payload.matterId, (result) => {
          mainWindow?.webContents.send('legal:matter-folder-synced', {
            result,
            state: buildBootstrapState(),
          });
        });
      }
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:sync-matter-folder',
    async (
      _event,
      payload: { matterId: string }
    ): Promise<{
      result: FolderSyncResult;
      state: AppBootstrapState;
    }> => {
      const result = folderWatcher.syncMatterFolder(payload.matterId);
      return {
        result,
        state: buildBootstrapState(),
      };
    }
  );

  ipcMain.handle(
    'legal:pick-matter-folder',
    async (
      _event,
      payload: { matterId: string }
    ): Promise<{
      chosenPath: string | null;
      result?: FolderSyncResult;
      state: AppBootstrapState;
    }> => {
      const dialogOptions = {
        title: 'Select Local Matter Folder for Discovery Auto-Sync',
        properties: ['openDirectory' as const, 'createDirectory' as const],
      };
      const dialogRes = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (dialogRes.canceled || dialogRes.filePaths.length === 0) {
        return {
          chosenPath: null,
          state: buildBootstrapState(),
        };
      }

      const chosenPath = dialogRes.filePaths[0];
      const existing = db.getMatter(payload.matterId);
      if (existing) {
        db.updateMatter({
          matterId: existing.id,
          name: existing.name,
          clientName: existing.clientName,
          matterNumber: existing.matterNumber,
          practiceArea: existing.practiceArea,
          jurisdiction: existing.jurisdiction,
          citationStyle: existing.citationStyle,
          folderPath: chosenPath,
          settled: existing.settled,
        });
      }

      const syncResult = folderWatcher.watchMatter(payload.matterId, (res) => {
        mainWindow?.webContents.send('legal:matter-folder-synced', {
          result: res,
          state: buildBootstrapState(),
        });
      });

      return {
        chosenPath,
        result: syncResult,
        state: buildBootstrapState(),
      };
    }
  );

  ipcMain.handle(
    'legal:create-issue',
    async (
      _event,
      payload: {
        matterId: string;
        title: string;
        practiceArea?: PracticeAreaId;
        description?: string;
        specialistRole?: string;
        parentIssueId?: string;
      }
    ) => {
      const matter = db.getMatter(payload.matterId);
      const now = new Date().toISOString();
      const newIssue: MatterIssue = {
        id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matterId: payload.matterId,
        title: payload.title.trim() || 'Case Issue Analysis',
        practiceArea: payload.practiceArea || matter?.practiceArea || 'vt_suppression_art11',
        description: payload.description?.trim() || undefined,
        specialistRole: payload.specialistRole?.trim() || undefined,
        parentIssueId: payload.parentIssueId,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      db.insertIssue(newIssue);
      db.setActiveIssueId(payload.matterId, newIssue.id);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:select-issue',
    async (
      _event,
      payload: { matterId: string; issueId: string | null }
    ) => {
      if (payload.matterId && payload.matterId !== activeMatterId) {
        activeMatterId = payload.matterId;
        db.setLastActiveMatterId(payload.matterId);
      }
      db.setActiveIssueId(payload.matterId, payload.issueId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:fork-issue',
    async (
      _event,
      payload: {
        matterId: string;
        sourceIssueId?: string | null;
        upToMessageId?: string;
        title: string;
        practiceArea?: PracticeAreaId;
        specialistRole?: string;
        description?: string;
        relationshipToParent?: 'fork' | 'specialist';
      }
    ) => {
      if (payload.matterId && payload.matterId !== activeMatterId) {
        activeMatterId = payload.matterId;
        db.setLastActiveMatterId(payload.matterId);
      }
      db.forkIssue(payload);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:settle-issue',
    async (
      _event,
      payload: { issueId: string; settled: boolean }
    ) => {
      const updated = db.setIssueSettled(payload.issueId, payload.settled);
      if (
        payload.settled &&
        updated &&
        db.getActiveIssueId(updated.matterId) === payload.issueId
      ) {
        db.setActiveIssueId(updated.matterId, null);
      }
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:merge-back-issue',
    async (
      _event,
      payload: {
        issueId: string;
        targetIssueId?: string | null;
      }
    ) => {
      await agentLoop.mergeBackIssue({
        ...payload,
        onProgress: (progressEvent) => {
          mainWindow?.webContents.send('legal:agent-progress', progressEvent);
        },
      });
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:delete-issue',
    async (_event, payload: { issueId: string }) => {
      db.deleteIssue(payload.issueId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:synthesize-master-brief',
    async (
      _event,
      payload: {
        matterId: string;
        issueIds?: string[];
        briefTitle?: string;
      }
    ) => {
      await agentLoop.synthesizeMasterBrief({
        ...payload,
        onProgress: (progressEvent) => {
          mainWindow?.webContents.send('legal:agent-progress', progressEvent);
        },
      });
      db.setActiveIssueId(payload.matterId, null);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:delete-matter',
    async (_event, matterId: string) => {
      const { nextActiveMatterId } = db.deleteMatter(matterId);
      if (activeMatterId === matterId) {
        activeMatterId = nextActiveMatterId;
      }
      db.setLastActiveMatterId(activeMatterId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle('legal:load-tutorial-case', async () => {
    const sampleMatter = db.loadTutorialSampleCase();
    activeMatterId = sampleMatter.id;
    db.setLastActiveMatterId(activeMatterId);
    return buildBootstrapState();
  });

  ipcMain.handle(
    'legal:close-tutorial-case',
    async (
      _event,
      payload?: { fallbackMatterId?: string; removeSample?: boolean }
    ) => {
      const res = db.closeTutorialSampleCase(
        undefined,
        payload?.fallbackMatterId,
        payload?.removeSample ?? false
      );
      activeMatterId = res.activeMatterId;
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:update-matter-jurisdiction',
    async (
      _event,
      payload: {
        matterId: string;
        jurisdiction: string;
        citationStyle: string;
        practiceArea: PracticeAreaId;
      }
    ) => {
      db.updateMatterJurisdiction(payload.matterId, {
        jurisdiction: payload.jurisdiction,
        citationStyle: payload.citationStyle,
        practiceArea: payload.practiceArea,
      });
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:select-practitioner-profile',
    async (_event, profileId: PractitionerProfileId) => {
      db.selectPractitionerProfile(profileId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:run-turn',
    async (
      _event,
      payload: {
        matterId: string;
        issueId?: string;
        userPrompt: string;
        overrideReviewMode?: AdversarialReviewMode;
        overridePracticeAreaId?: PracticeAreaId;
        overridePrimaryProvider?: LLMProviderId;
        overridePrimaryModel?: string;
      }
    ) => {
      const effectiveIssueId =
        payload.issueId !== undefined
          ? payload.issueId
          : db.getActiveIssueId(payload.matterId) || undefined;
      await agentLoop.runTurn({
        ...payload,
        issueId: effectiveIssueId,
        onProgress: (progressEvent) => {
          mainWindow?.webContents.send('legal:agent-progress', progressEvent);
        },
      });
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:save-prompt-settings',
    async (_event, updated: Partial<SystemPromptSettings>) => {
      db.saveSystemPromptSettings(updated);
      return buildBootstrapState();
    }
  );

  ipcMain.handle('legal:reset-prompt-settings', async () => {
    db.resetSystemPromptSettingsToDefault();
    return buildBootstrapState();
  });

  ipcMain.handle(
    'legal:save-adversarial-config',
    async (_event, updated: Partial<AdversarialConfig>) => {
      db.saveAdversarialConfig(updated);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:save-provider-credential',
    async (
      _event,
      payload: {
        providerId: LLMProviderId;
        apiKey?: string;
        baseUrl?: string;
        defaultModel?: string;
        binaryPath?: string;
        customArgs?: string;
        reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
      }
    ) => {
      db.saveProviderCredential(payload);
      await AncillaryModelManager.getInstance(db).refreshModelRegistry();
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:create-document',
    async (
      _event,
      payload: {
        matterId: string;
        title: string;
        fileName: string;
        category: DocumentCategory;
        batesRange: string;
        summary: string;
        content: string;
      }
    ) => {
      const now = new Date().toISOString();
      const doc: MatterDocument = {
        id: `doc-${Date.now()}`,
        matterId: payload.matterId,
        title: payload.title,
        fileName: payload.fileName,
        category: payload.category,
        batesRange: payload.batesRange || 'DOC-0001',
        pageCount: Math.max(1, Math.ceil(payload.content.length / 1800)),
        summary: payload.summary,
        content: payload.content,
        createdAt: now,
        updatedAt: now,
      };
      db.insertDocument(doc);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:parse-docx-buffer',
    async (
      _event,
      payload: {
        fileName: string;
        base64Data: string;
      }
    ): Promise<ParsedDocxPreview> => {
      const buffer = Buffer.from(payload.base64Data, 'base64');
      return parseDocumentBuffer(buffer, payload.fileName);
    }
  );

  ipcMain.handle(
    'legal:pick-docx-file',
    async (): Promise<ParsedDocxPreview | null> => {
      const dialogOptions = {
        title: 'Import Case Document or Exhibit (.docx, .pdf, .txt, .rtf, .csv, .xlsx)',
        filters: [
          {
            name: 'Supported Legal Documents (.docx, .pdf, .txt, .md, .rtf, .csv, .xlsx)',
            extensions: [...SUPPORTED_IMPORT_EXTENSIONS],
          },
          { name: 'Word Document (.docx)', extensions: ['docx'] },
          { name: 'PDF Document (.pdf)', extensions: ['pdf'] },
          { name: 'Spreadsheets & Tables (.xlsx, .csv)', extensions: ['xlsx', 'csv'] },
          { name: 'Text & Rich Text (.txt, .md, .rtf)', extensions: ['txt', 'md', 'rtf'] },
        ],
        properties: ['openFile' as const],
      };

      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions);

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      return parseDocumentBuffer(buffer, path.basename(filePath));
    }
  );

  ipcMain.handle(
    'legal:export-docx',
    async (
      _event,
      payload: ExportDocxPayload
    ): Promise<{ saved: boolean; filePath?: string; byteLength?: number }> => {
      const safeDefaultName = (
        payload.suggestedFileName ||
        `${(payload.title || 'Legal_Work_Product').replace(/[^a-zA-Z0-9-_]+/g, '_')}.docx`
      ).replace(/\.docx$/i, '') + '.docx';

      const saveOptions = {
        title: 'Export Word (.docx) with Tracked Changes & Comments',
        defaultPath: safeDefaultName,
        filters: [{ name: 'Word Document (.docx)', extensions: ['docx'] }],
      };

      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, saveOptions)
        : await dialog.showSaveDialog(saveOptions);

      if (result.canceled || !result.filePath) {
        return { saved: false };
      }

      const docxBuffer = exportDocxBuffer(payload);
      fs.writeFileSync(result.filePath, docxBuffer);
      return {
        saved: true,
        filePath: result.filePath,
        byteLength: docxBuffer.byteLength,
      };
    }
  );

  ipcMain.handle(
    'legal:update-document',
    async (
      _event,
      payload: {
        docId: string;
        title?: string;
        content?: string;
        category?: DocumentCategory;
        batesRange?: string;
        summary?: string;
      }
    ) => {
      db.updateDocument(payload.docId, payload);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:update-document-version',
    async (
      _event,
      payload: {
        versionId: string;
        content: string;
      }
    ) => {
      db.updateDocumentVersionContent(payload.versionId, payload.content);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:update-message',
    async (
      _event,
      payload: {
        messageId: string;
        content: string;
      }
    ) => {
      db.updateMessageContent(payload.messageId, payload.content);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:add-chronology-fact',
    async (
      _event,
      payload: {
        matterId: string;
        factDate: string;
        eventDescription: string;
        sourceCitation: string;
        status: ChronologyFact['status'];
      }
    ) => {
      db.insertChronologyFact({
        id: `fact-${Date.now()}`,
        matterId: payload.matterId,
        factDate: payload.factDate,
        eventDescription: payload.eventDescription,
        sourceCitation: payload.sourceCitation,
        status: payload.status,
        createdAt: new Date().toISOString(),
      });
      return buildBootstrapState();
    }
  );

  // --- T3-Style Agent Onboarding, Multi-Account Codex & Setup Terminal IPC ---
  ipcMain.handle('legal:complete-agent-onboarding', async () => {
    db.completeAgentOnboarding();
    return buildBootstrapState();
  });

  ipcMain.handle('legal:refresh-agent-connections', async () => {
    CliAgentDriverManager.invalidateStatusCache();
    await AncillaryModelManager.getInstance(db).refreshModelRegistry();
    return buildBootstrapState();
  });

  ipcMain.handle(
    'legal:add-codex-account',
    async (_event, payload: { accountName: string }) => {
      const cleanName = payload.accountName.trim() || 'Personal';
      const displayName = cleanName.toLowerCase().startsWith('chatgpt')
        ? cleanName
        : `ChatGPT - ${cleanName}`;
      const instanceId = `codex_${Date.now().toString(36)}`;
      const shadowHomePath = path.join(
        app.getPath('userData'),
        'providers',
        'codex',
        instanceId,
        'shadow'
      );
      db.addCodexAccountInstance({
        instanceId,
        displayName,
        shadowHomePath,
        setupMode: 'managed',
      });
      CliAgentDriverManager.invalidateStatusCache();
      return {
        state: buildBootstrapState(),
        createdInstanceId: instanceId,
        displayName,
      };
    }
  );

  ipcMain.handle(
    'legal:remove-codex-account',
    async (_event, payload: { instanceId: string }) => {
      db.removeCodexAccountInstance(payload.instanceId);
      CliAgentDriverManager.invalidateStatusCache();
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:start-agent-setup-command',
    async (
      _event,
      payload: {
        instanceId: string;
        mode: 'install' | 'login' | 'custom';
        customCommand?: string;
      }
    ) => {
      const currentState = buildBootstrapState();
      const target = currentState.agentOnboarding.agentInstances.find(
        (inst) => inst.instanceId === payload.instanceId
      );
      if (!target) {
        throw new Error(`Agent instance ${payload.instanceId} not found.`);
      }
      const sessionId = `onboarding-${target.driver}-${Date.now().toString(36)}`;
      CliAgentDriverManager.startSetupTerminalSession({
        sessionId,
        instance: target,
        mode: payload.mode,
        customCommand: payload.customCommand,
        onEvent: (termEvent) => {
          mainWindow?.webContents.send('legal:agent-setup-terminal', termEvent);
        },
      });
      return { sessionId };
    }
  );

  ipcMain.handle(
    'legal:stop-agent-setup-command',
    async (_event, payload: { sessionId: string }) => {
      CliAgentDriverManager.stopSetupTerminalSession(payload.sessionId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:save-courtlistener-token',
    async (_event, payload: { token: string }) => {
      db.saveCourtListenerToken(payload.token);
      const probe = CliAgentDriverManager.probeCourtListenerMcp({
        token: payload.token,
      });
      const driver = probe.configuredAgentDriver || 'codex';
      CliAgentDriverManager.installCourtListenerMcpOnAgent({
        driver,
        token: payload.token,
      });
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:install-courtlistener-default-agent',
    async (
      _event,
      payload?: { driver?: 'codex' | 'claudeAgent' | 'antigravity' | 'all' }
    ) => {
      const token = db.getCourtListenerToken();
      const driver = payload?.driver || 'codex';
      CliAgentDriverManager.installCourtListenerMcpOnAgent({
        driver,
        token,
      });
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:save-custom-mcp-server',
    async (_event, payload: { server: CustomLegalMcpServer }) => {
      db.saveCustomMcpServer(payload.server);
      CliAgentDriverManager.installCustomMcpServerOnAgent({
        server: payload.server,
      });
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:delete-custom-mcp-server',
    async (_event, payload: { serverId: string }) => {
      const servers = db.listCustomMcpServers();
      const toDelete = servers.find((s) => s.id === payload.serverId);
      if (toDelete) {
        CliAgentDriverManager.removeCustomMcpServerFromAgent({
          serverId: toDelete.id,
          serverName: toDelete.name,
          targetDriver: toDelete.targetDriver,
        });
      }
      db.deleteCustomMcpServer(payload.serverId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:open-external-url',
    async (_event, payload: { url: string }) => {
      if (/^https?:\/\//i.test(payload.url)) {
        await shell.openExternal(payload.url);
      }
    }
  );

  // --- Phase 2: Privacy Model Router & Decision Debug Telemetry IPC ---
  ipcMain.handle('legal:get-privacy-routing-settings', async () => {
    return db.getPrivacyRoutingSettings();
  });

  ipcMain.handle(
    'legal:save-privacy-routing-settings',
    async (_event, payload: { settings: Partial<PrivacyRoutingSettings> }) => {
      db.savePrivacyRoutingSettings(payload.settings);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:get-routing-logs',
    async (_event, payload?: { matterId?: string; limit?: number }) => {
      return db.listRoutingDebugLogs(payload?.matterId, payload?.limit ?? 50);
    }
  );

  ipcMain.handle(
    'legal:clear-routing-logs',
    async (_event, payload?: { matterId?: string }) => {
      agentLoop.getPrivacyRouter().getDebugLogger().clearLogs(payload?.matterId);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:export-routing-logs',
    async (_event, payload?: { destinationPath?: string }) => {
      return agentLoop.getPrivacyRouter().getDebugLogger().exportLogs(payload?.destinationPath);
    }
  );

  // --- Ancillary Checker Model Health, Periodic Background Probing & User Repick IPC ---
  ipcMain.handle('legal:get-ancillary-model-registry', async () => {
    return AncillaryModelManager.getInstance(db).getState();
  });

  ipcMain.handle('legal:refresh-ancillary-model-registry', async () => {
    await AncillaryModelManager.getInstance(db).refreshModelRegistry();
    return buildBootstrapState();
  });

  ipcMain.handle(
    'legal:repick-ancillary-model',
    async (
      _event,
      payload: {
        role: AncillaryCheckerRole;
        providerId: LLMProviderId;
        modelId: string;
      }
    ) => {
      await AncillaryModelManager.getInstance(db).repickAncillaryModel(
        payload.role,
        payload.providerId,
        payload.modelId
      );
      return buildBootstrapState();
    }
  );
}

function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, '../../build/icon.png'),
    path.join(process.cwd(), 'build/icon.png'),
    path.join(app.getAppPath(), 'build/icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function createWindow(): Promise<void> {
  const isMac = process.platform === 'darwin';
  const appIcon = resolveAppIconPath();

  if (isMac && app.dock && appIcon) {
    try {
      app.dock.setIcon(appIcon);
    } catch {
      // ignore in dev if dock is not available
    }
  }

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    title: 'LexHarness',
    backgroundColor: '#0b0b0e',
    icon: appIcon,
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 18, y: 12 },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  const screenshotOut = process.env.LEXHARNESS_SCREENSHOT_PATH;
  if (screenshotOut) {
    setTimeout(async () => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const img = await mainWindow.webContents.capturePage();
          fs.writeFileSync(screenshotOut, img.toPNG());
        }
      } finally {
        app.quit();
      }
    }, 1800);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const userDataDir = path.join(app.getPath('userData'), 'lexharness-data');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Prevent main process or spawned sub-processes from defaulting cwd to user's home directory
  try {
    process.chdir(userDataDir);
  } catch {
    // Ignore if not allowed
  }

  // Configure Chromium download path to internal sandboxed directory so Chromium never probes ~/Downloads
  try {
    const safeDownloadsDir = path.join(userDataDir, 'downloads');
    if (!fs.existsSync(safeDownloadsDir)) {
      fs.mkdirSync(safeDownloadsDir, { recursive: true });
    }
    session.defaultSession.setDownloadPath(safeDownloadsDir);
  } catch {
    // Ignore in non-GUI or test environments
  }

  db = new LegalDatabase(userDataDir, createSafeStorageEncryptor());
  await db.initialize();
  await AncillaryModelManager.getInstance(db).initialize();
  agentLoop = new LegalAgentLoop(db);
  folderWatcher = new MatterFolderWatcher(db);

  registerIpcHandlers();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
