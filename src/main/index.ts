import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron';
import path from 'node:path';
import { LegalDatabase, SecretEncryptor } from './db/database';
import { LegalAgentLoop } from './agent/LegalAgentLoop';
import { PromptAssembler } from './agent/PromptAssembler';
import { CliAgentDriverManager } from './agent/providers/CliAgentDriverManager';
import {
  AdversarialConfig,
  AdversarialReviewMode,
  AppBootstrapState,
  ChronologyFact,
  DocumentCategory,
  LegalThread,
  LLMProviderId,
  Matter,
  MatterDocument,
  PracticeAreaId,
  PractitionerProfileId,
  SystemPromptSettings,
  UpdateMatterPayload,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let db: LegalDatabase;
let agentLoop: LegalAgentLoop;
let activeMatterId = 'matter-vt-state-v-thorne';
let activeThreadId = 'thread-vt-suppression';

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
  const currentMatter =
    matters.find((m) => m.id === activeMatterId) ?? matters[0];
  activeMatterId = currentMatter.id;

  let threads = db.listThreads(activeMatterId);
  if (threads.length === 0) {
    const defaultThread: LegalThread = {
      id: `thread-${Date.now()}`,
      matterId: activeMatterId,
      title: `${currentMatter.name} — Legal Analysis Thread`,
      practiceArea: currentMatter.practiceArea,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.insertThread(defaultThread);
    threads = [defaultThread];
  }

  const currentThread =
    threads.find((t) => t.id === activeThreadId) ?? threads[0];
  activeThreadId = currentThread.id;

  const messages = db.listMessages(activeThreadId);
  const documents = db.listDocuments(activeMatterId);
  const documentVersions = db.listDocumentVersions(activeMatterId);
  const chronologyFacts = db.listChronologyFacts(activeMatterId);
  const promptSettings = db.getSystemPromptSettings();
  const adversarialConfig = db.getAdversarialConfig();
  const providers = db.listProviderConfigs();
  const assembledPromptPreview = PromptAssembler.assembleForMatter(
    promptSettings,
    currentMatter,
    currentThread.practiceArea
  );

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
    threads,
    activeThreadId,
    messages,
    documents,
    documentVersions,
    chronologyFacts,
    promptSettings,
    adversarialConfig,
    providers,
    assembledPromptPreview,
    agentOnboarding,
  };
}

function registerIpcHandlers(): void {
  ipcMain.handle('legal:bootstrap', async () => {
    return buildBootstrapState();
  });

  ipcMain.handle('legal:select-matter', async (_event, matterId: string) => {
    activeMatterId = matterId;
    const threads = db.listThreads(matterId);
    if (threads.length > 0) {
      activeThreadId = threads[0].id;
    }
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
      const newMatter: Matter = {
        id: `matter-${Date.now()}`,
        name: payload.name,
        clientName: payload.clientName,
        matterNumber: payload.matterNumber,
        practiceArea: payload.practiceArea,
        jurisdiction: payload.jurisdiction,
        citationStyle: payload.citationStyle,
        folderPath: `~/Matters/${payload.matterNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}`,
        createdAt: now,
        updatedAt: now,
      };
      db.insertMatter(newMatter);
      activeMatterId = newMatter.id;

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

      const initialThread: LegalThread = {
        id: `thread-${Date.now()}`,
        matterId: newMatter.id,
        title: 'Primary Legal Research & Drafting Thread',
        practiceArea: newMatter.practiceArea,
        createdAt: now,
        updatedAt: now,
      };
      db.insertThread(initialThread);
      activeThreadId = initialThread.id;

      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:update-matter',
    async (_event, payload: UpdateMatterPayload) => {
      db.updateMatter(payload);
      return buildBootstrapState();
    }
  );

  ipcMain.handle(
    'legal:delete-matter',
    async (_event, matterId: string) => {
      const { nextActiveMatterId } = db.deleteMatter(matterId);
      if (activeMatterId === matterId) {
        activeMatterId = nextActiveMatterId;
        const threads = db.listThreads(activeMatterId);
        if (threads.length > 0) {
          activeThreadId = threads[0].id;
        }
      }
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
    'legal:create-thread',
    async (
      _event,
      payload: { matterId: string; title: string; practiceArea: PracticeAreaId }
    ) => {
      const now = new Date().toISOString();
      const thread: LegalThread = {
        id: `thread-${Date.now()}`,
        matterId: payload.matterId,
        title: payload.title,
        practiceArea: payload.practiceArea,
        createdAt: now,
        updatedAt: now,
      };
      db.insertThread(thread);
      activeMatterId = payload.matterId;
      activeThreadId = thread.id;
      return buildBootstrapState();
    }
  );

  ipcMain.handle('legal:select-thread', async (_event, threadId: string) => {
    activeThreadId = threadId;
    return buildBootstrapState();
  });

  ipcMain.handle(
    'legal:run-turn',
    async (
      _event,
      payload: {
        matterId: string;
        threadId: string;
        userPrompt: string;
        overrideReviewMode?: AdversarialReviewMode;
        overridePracticeAreaId?: PracticeAreaId;
      }
    ) => {
      await agentLoop.runTurn({
        ...payload,
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
      payload?: { driver?: 'codex' | 'claudeAgent' | 'antigravity' }
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
    'legal:open-external-url',
    async (_event, payload: { url: string }) => {
      if (/^https?:\/\//i.test(payload.url)) {
        await shell.openExternal(payload.url);
      }
    }
  );
}

async function createWindow(): Promise<void> {
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    title: 'LexHarness — Legal Agent Control Surface',
    backgroundColor: '#020617',
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 16, y: 16 },
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const userDataDir = path.join(app.getPath('userData'), 'lexharness-data');
  db = new LegalDatabase(userDataDir, createSafeStorageEncryptor());
  await db.initialize();
  agentLoop = new LegalAgentLoop(db);

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
