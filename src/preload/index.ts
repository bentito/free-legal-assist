import { contextBridge, ipcRenderer } from 'electron';
import {
  AdversarialConfig,
  AdversarialReviewMode,
  AgentProgressEvent,
  AppBootstrapState,
  ChronologyFact,
  DocumentCategory,
  LLMProviderId,
  PracticeAreaId,
  SystemPromptSettings,
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
  updateMatterJurisdiction(payload: {
    matterId: string;
    jurisdiction: string;
    citationStyle: string;
    practiceArea: PracticeAreaId;
  }): Promise<AppBootstrapState>;
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
  savePromptSettings(updated: Partial<SystemPromptSettings>): Promise<AppBootstrapState>;
  resetPromptSettings(): Promise<AppBootstrapState>;
  saveAdversarialConfig(updated: Partial<AdversarialConfig>): Promise<AppBootstrapState>;
  saveProviderCredential(payload: {
    providerId: LLMProviderId;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
  }): Promise<AppBootstrapState>;
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
}

const bridge: LexHarnessBridge = {
  bootstrap: () => ipcRenderer.invoke('legal:bootstrap'),
  selectMatter: (matterId) => ipcRenderer.invoke('legal:select-matter', matterId),
  createMatter: (payload) => ipcRenderer.invoke('legal:create-matter', payload),
  updateMatterJurisdiction: (payload) =>
    ipcRenderer.invoke('legal:update-matter-jurisdiction', payload),
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
};

contextBridge.exposeInMainWorld('lexharness', bridge);
