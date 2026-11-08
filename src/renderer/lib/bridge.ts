import {
  AdversarialConfig,
  AdversarialReviewMode,
  AgentProgressEvent,
  AppBootstrapState,
  ChronologyFact,
  DocumentCategory,
  LLMProviderId,
  PracticeAreaId,
  PractitionerProfileId,
  SystemPromptSettings,
  UpdateMatterPayload,
} from '../../shared/types';

declare global {
  interface Window {
    lexharness?: {
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
    };
  }
}

export const ipcBridge = {
  isElectron(): boolean {
    return typeof window !== 'undefined' && Boolean(window.lexharness);
  },

  async bootstrap(): Promise<AppBootstrapState> {
    if (window.lexharness) {
      return window.lexharness.bootstrap();
    }
    throw new Error('Electron IPC bridge not initialized');
  },

  async selectMatter(matterId: string): Promise<AppBootstrapState> {
    return window.lexharness!.selectMatter(matterId);
  },

  async createMatter(payload: {
    name: string;
    clientName: string;
    matterNumber: string;
    practiceArea: PracticeAreaId;
    jurisdiction: string;
    citationStyle: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.createMatter(payload);
  },

  async updateMatter(payload: UpdateMatterPayload): Promise<AppBootstrapState> {
    return window.lexharness!.updateMatter(payload);
  },

  async deleteMatter(matterId: string): Promise<AppBootstrapState> {
    return window.lexharness!.deleteMatter(matterId);
  },

  async updateMatterJurisdiction(payload: {
    matterId: string;
    jurisdiction: string;
    citationStyle: string;
    practiceArea: PracticeAreaId;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.updateMatterJurisdiction(payload);
  },

  async selectPractitionerProfile(
    profileId: PractitionerProfileId
  ): Promise<AppBootstrapState> {
    return window.lexharness!.selectPractitionerProfile(profileId);
  },

  async createThread(payload: {
    matterId: string;
    title: string;
    practiceArea: PracticeAreaId;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.createThread(payload);
  },

  async selectThread(threadId: string): Promise<AppBootstrapState> {
    return window.lexharness!.selectThread(threadId);
  },

  async runTurn(payload: {
    matterId: string;
    threadId: string;
    userPrompt: string;
    overrideReviewMode?: AdversarialReviewMode;
    overridePracticeAreaId?: PracticeAreaId;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.runTurn(payload);
  },

  async savePromptSettings(
    updated: Partial<SystemPromptSettings>
  ): Promise<AppBootstrapState> {
    return window.lexharness!.savePromptSettings(updated);
  },

  async resetPromptSettings(): Promise<AppBootstrapState> {
    return window.lexharness!.resetPromptSettings();
  },

  async saveAdversarialConfig(
    updated: Partial<AdversarialConfig>
  ): Promise<AppBootstrapState> {
    return window.lexharness!.saveAdversarialConfig(updated);
  },

  async saveProviderCredential(payload: {
    providerId: LLMProviderId;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    binaryPath?: string;
    customArgs?: string;
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  }): Promise<AppBootstrapState> {
    return window.lexharness!.saveProviderCredential(payload);
  },

  async createDocument(payload: {
    matterId: string;
    title: string;
    fileName: string;
    category: DocumentCategory;
    batesRange: string;
    summary: string;
    content: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.createDocument(payload);
  },

  async addChronologyFact(payload: {
    matterId: string;
    factDate: string;
    eventDescription: string;
    sourceCitation: string;
    status: ChronologyFact['status'];
  }): Promise<AppBootstrapState> {
    return window.lexharness!.addChronologyFact(payload);
  },

  onAgentProgress(callback: (event: AgentProgressEvent) => void): () => void {
    if (window.lexharness) {
      return window.lexharness.onAgentProgress(callback);
    }
    return () => {};
  },
};
