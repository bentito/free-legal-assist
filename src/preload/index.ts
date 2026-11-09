import { contextBridge, ipcRenderer } from 'electron';
import {
  AdversarialConfig,
  AdversarialReviewMode,
  AgentProgressEvent,
  AgentSetupTerminalEvent,
  AppBootstrapState,
  ChronologyFact,
  DocumentCategory,
  LLMProviderId,
  PracticeAreaId,
  PractitionerProfileId,
  SystemPromptSettings,
  UpdateMatterPayload,
} from '../shared/types';

export interface LexHarnessBridge {
  bootstrap(): Promise<AppBootstrapState>;
  selectMatter(matterId: string): Promise<AppBootstrapState>;
  createMatter(payload: {
    name: string;
    clientName: string;
    matterNumber: string;
    practiceArea: PracticeAreaId;
    jurisdiction: string;
    citationStyle: string;
  }): Promise<AppBootstrapState>;
  updateMatter(payload: UpdateMatterPayload): Promise<AppBootstrapState>;
  deleteMatter(matterId: string): Promise<AppBootstrapState>;
  updateMatterJurisdiction(payload: {
    matterId: string;
    jurisdiction: string;
    citationStyle: string;
    practiceArea: PracticeAreaId;
  }): Promise<AppBootstrapState>;
  selectPractitionerProfile(
    profileId: PractitionerProfileId
  ): Promise<AppBootstrapState>;
  createThread(payload: {
    matterId: string;
    title: string;
    practiceArea: PracticeAreaId;
  }): Promise<AppBootstrapState>;
  selectThread(threadId: string): Promise<AppBootstrapState>;
  runTurn(payload: {
    matterId: string;
    threadId: string;
    userPrompt: string;
    overrideReviewMode?: AdversarialReviewMode;
    overridePracticeAreaId?: PracticeAreaId;
  }): Promise<AppBootstrapState>;
  savePromptSettings(
    updated: Partial<SystemPromptSettings>
  ): Promise<AppBootstrapState>;
  resetPromptSettings(): Promise<AppBootstrapState>;
  saveAdversarialConfig(
    updated: Partial<AdversarialConfig>
  ): Promise<AppBootstrapState>;
  saveProviderCredential(payload: {
    providerId: LLMProviderId;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    binaryPath?: string;
    customArgs?: string;
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  }): Promise<AppBootstrapState>;
  completeAgentOnboarding(): Promise<AppBootstrapState>;
  refreshAgentConnections(): Promise<AppBootstrapState>;
  addCodexAccount(payload: { accountName: string }): Promise<{
    state: AppBootstrapState;
    createdInstanceId: string;
    displayName: string;
  }>;
  removeCodexAccount(payload: { instanceId: string }): Promise<AppBootstrapState>;
  startAgentSetupCommand(payload: {
    instanceId: string;
    mode: 'install' | 'login' | 'custom';
    customCommand?: string;
  }): Promise<{ sessionId: string }>;
  stopAgentSetupCommand(payload: { sessionId: string }): Promise<AppBootstrapState>;
  saveCourtListenerToken(payload: { token: string }): Promise<AppBootstrapState>;
  installCourtListenerOnDefaultAgent(payload?: {
    driver?: 'codex' | 'claudeAgent' | 'antigravity';
  }): Promise<AppBootstrapState>;
  openExternalUrl(payload: { url: string }): Promise<void>;
  createDocument(payload: {
    matterId: string;
    title: string;
    fileName: string;
    category: DocumentCategory;
    batesRange: string;
    summary: string;
    content: string;
  }): Promise<AppBootstrapState>;
  addChronologyFact(payload: {
    matterId: string;
    factDate: string;
    eventDescription: string;
    sourceCitation: string;
    status: ChronologyFact['status'];
  }): Promise<AppBootstrapState>;
  onAgentProgress(callback: (event: AgentProgressEvent) => void): () => void;
  onAgentSetupTerminal(callback: (event: AgentSetupTerminalEvent) => void): () => void;
}

const bridge: LexHarnessBridge = {
  bootstrap: () => ipcRenderer.invoke('legal:bootstrap'),
  selectMatter: (matterId) => ipcRenderer.invoke('legal:select-matter', matterId),
  createMatter: (payload) => ipcRenderer.invoke('legal:create-matter', payload),
  updateMatter: (payload) => ipcRenderer.invoke('legal:update-matter', payload),
  deleteMatter: (matterId) => ipcRenderer.invoke('legal:delete-matter', matterId),
  updateMatterJurisdiction: (payload) =>
    ipcRenderer.invoke('legal:update-matter-jurisdiction', payload),
  selectPractitionerProfile: (profileId) =>
    ipcRenderer.invoke('legal:select-practitioner-profile', profileId),
  createThread: (payload) => ipcRenderer.invoke('legal:create-thread', payload),
  selectThread: (threadId) => ipcRenderer.invoke('legal:select-thread', threadId),
  runTurn: (payload) => ipcRenderer.invoke('legal:run-turn', payload),
  savePromptSettings: (updated) =>
    ipcRenderer.invoke('legal:save-prompt-settings', updated),
  resetPromptSettings: () => ipcRenderer.invoke('legal:reset-prompt-settings'),
  saveAdversarialConfig: (updated) =>
    ipcRenderer.invoke('legal:save-adversarial-config', updated),
  saveProviderCredential: (payload) =>
    ipcRenderer.invoke('legal:save-provider-credential', payload),
  completeAgentOnboarding: () =>
    ipcRenderer.invoke('legal:complete-agent-onboarding'),
  refreshAgentConnections: () =>
    ipcRenderer.invoke('legal:refresh-agent-connections'),
  addCodexAccount: (payload) =>
    ipcRenderer.invoke('legal:add-codex-account', payload),
  removeCodexAccount: (payload) =>
    ipcRenderer.invoke('legal:remove-codex-account', payload),
  startAgentSetupCommand: (payload) =>
    ipcRenderer.invoke('legal:start-agent-setup-command', payload),
  stopAgentSetupCommand: (payload) =>
    ipcRenderer.invoke('legal:stop-agent-setup-command', payload),
  saveCourtListenerToken: (payload) =>
    ipcRenderer.invoke('legal:save-courtlistener-token', payload),
  installCourtListenerOnDefaultAgent: (payload) =>
    ipcRenderer.invoke('legal:install-courtlistener-default-agent', payload),
  openExternalUrl: (payload) =>
    ipcRenderer.invoke('legal:open-external-url', payload),
  createDocument: (payload) => ipcRenderer.invoke('legal:create-document', payload),
  addChronologyFact: (payload) =>
    ipcRenderer.invoke('legal:add-chronology-fact', payload),
  onAgentProgress: (callback) => {
    const listener = (_event: unknown, data: AgentProgressEvent) => callback(data);
    ipcRenderer.on('legal:agent-progress', listener);
    return () => {
      ipcRenderer.removeListener('legal:agent-progress', listener);
    };
  },
  onAgentSetupTerminal: (callback) => {
    const listener = (_event: unknown, data: AgentSetupTerminalEvent) => callback(data);
    ipcRenderer.on('legal:agent-setup-terminal', listener);
    return () => {
      ipcRenderer.removeListener('legal:agent-setup-terminal', listener);
    };
  },
};

contextBridge.exposeInMainWorld('lexharness', bridge);
