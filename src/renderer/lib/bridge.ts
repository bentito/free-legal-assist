import {
  AdversarialConfig,
  AdversarialReviewMode,
  AgentProgressEvent,
  AgentSetupTerminalEvent,
  AncillaryCheckerRole,
  AncillaryModelRegistryState,
  AppBootstrapState,
  ChronologyFact,
  CustomLegalMcpServer,
  DesktopUpdateActionResult,
  DesktopUpdateCheckResult,
  DesktopUpdateState,
  DocumentCategory,
  ExportDocxPayload,
  FolderSyncResult,
  LLMProviderId,
  ParsedDocxPreview,
  PracticeAreaId,
  PractitionerProfileId,
  PrivacyRoutingSettings,
  RoutingDecisionLog,
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
      loadTutorialCase(): Promise<AppBootstrapState>;
      closeTutorialCase(payload?: {
        fallbackMatterId?: string;
        removeSample?: boolean;
      }): Promise<AppBootstrapState>;
      updateMatterJurisdiction(payload: {
        matterId: string;
        jurisdiction: string;
        citationStyle: string;
        practiceArea: PracticeAreaId;
      }): Promise<AppBootstrapState>;
      selectPractitionerProfile(
        profileId: PractitionerProfileId
      ): Promise<AppBootstrapState>;
      runTurn(payload: {
        matterId: string;
        issueId?: string;
        userPrompt: string;
        overrideReviewMode?: AdversarialReviewMode;
        overridePracticeAreaId?: PracticeAreaId;
        overridePrimaryProvider?: LLMProviderId;
        overridePrimaryModel?: string;
      }): Promise<AppBootstrapState>;
      syncMatterFolder(payload: { matterId: string }): Promise<{
        result: FolderSyncResult;
        state: AppBootstrapState;
      }>;
      pickMatterFolder(payload: { matterId: string }): Promise<{
        chosenPath: string | null;
        result?: FolderSyncResult;
        state: AppBootstrapState;
      }>;
      createIssue(payload: {
        matterId: string;
        title: string;
        practiceArea?: PracticeAreaId;
        description?: string;
        specialistRole?: string;
        parentIssueId?: string;
      }): Promise<AppBootstrapState>;
      selectIssue(payload: {
        matterId: string;
        issueId: string | null;
      }): Promise<AppBootstrapState>;
      forkIssue(payload: {
        matterId: string;
        sourceIssueId?: string | null;
        upToMessageId?: string;
        title: string;
        practiceArea?: PracticeAreaId;
        specialistRole?: string;
        description?: string;
        relationshipToParent?: 'fork' | 'specialist';
      }): Promise<AppBootstrapState>;
      settleIssue(payload: {
        issueId: string;
        settled: boolean;
      }): Promise<AppBootstrapState>;
      mergeBackIssue(payload: {
        issueId: string;
        targetIssueId?: string | null;
      }): Promise<AppBootstrapState>;
      deleteIssue(payload: { issueId: string }): Promise<AppBootstrapState>;
      synthesizeMasterBrief(payload: {
        matterId: string;
        issueIds?: string[];
        briefTitle?: string;
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
        enabled?: boolean;
        name?: string;
        accentColor?: string;
        apiKey?: string;
        baseUrl?: string;
        defaultModel?: string;
        binaryPath?: string;
        homePath?: string;
        shadowHomePath?: string;
        customArgs?: string;
        autoCompactWindow?: string;
        idleCompaction?: 'default' | 'onReturn' | 'beforeCacheExpires' | 'off';
        authMethod?: 'oauth-personal' | 'oauth-business' | 'gemini-api-key' | 'agent-platform';
        gcpProject?: string;
        gcpLocation?: string;
        environmentVars?: { name: string; value: string; sensitive?: boolean }[];
        favoriteModels?: string[];
        hiddenModels?: string[];
        customModels?: { id: string; label: string }[];
        reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
      }): Promise<AppBootstrapState>;
      addProviderInstance(payload: {
        driverKind: 'codex-cli' | 'claude-agent-cli' | 'antigravity-acp';
        name: string;
        instanceId?: string;
        accentColor?: string;
        binaryPath?: string;
        homePath?: string;
        shadowHomePath?: string;
        customArgs?: string;
        authMethod?: 'oauth-personal' | 'oauth-business' | 'gemini-api-key' | 'agent-platform';
        gcpProject?: string;
        gcpLocation?: string;
      }): Promise<{ state: AppBootstrapState; createdId: LLMProviderId }>;
      deleteProviderInstance(payload: {
        providerId: LLMProviderId;
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
        driver?: 'codex' | 'claudeAgent' | 'antigravity' | 'all';
      }): Promise<AppBootstrapState>;
      saveCustomMcpServer(payload: {
        server: CustomLegalMcpServer;
      }): Promise<AppBootstrapState>;
      deleteCustomMcpServer(payload: {
        serverId: string;
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
      parseDocxBuffer(payload: {
        fileName: string;
        base64Data: string;
      }): Promise<ParsedDocxPreview>;
      pickDocxFile(): Promise<ParsedDocxPreview | null>;
      exportDocx(payload: ExportDocxPayload): Promise<{
        saved: boolean;
        filePath?: string;
        byteLength?: number;
      }>;
      updateDocument(payload: {
        docId: string;
        title?: string;
        content?: string;
        category?: DocumentCategory;
        batesRange?: string;
        summary?: string;
      }): Promise<AppBootstrapState>;
      updateDocumentVersion(payload: {
        versionId: string;
        content: string;
      }): Promise<AppBootstrapState>;
      updateMessage(payload: {
        messageId: string;
        content: string;
      }): Promise<AppBootstrapState>;
      addChronologyFact(payload: {
        matterId: string;
        factDate: string;
        eventDescription: string;
        sourceCitation: string;
        status: ChronologyFact['status'];
      }): Promise<AppBootstrapState>;
      getPrivacyRoutingSettings(): Promise<PrivacyRoutingSettings>;
      savePrivacyRoutingSettings(
        settings: Partial<PrivacyRoutingSettings>
      ): Promise<AppBootstrapState>;
      getRoutingLogs(payload?: {
        matterId?: string;
        limit?: number;
      }): Promise<RoutingDecisionLog[]>;
      clearRoutingLogs(payload?: {
        matterId?: string;
      }): Promise<AppBootstrapState>;
      exportRoutingLogs(payload?: {
        destinationPath?: string;
      }): Promise<string>;
      getAncillaryModelRegistry(): Promise<AncillaryModelRegistryState>;
      refreshAncillaryModelRegistry(): Promise<AppBootstrapState>;
      repickAncillaryModel(payload: {
        role: AncillaryCheckerRole;
        providerId: LLMProviderId;
        modelId: string;
      }): Promise<AppBootstrapState>;
      getUpdateState(): Promise<DesktopUpdateState>;
      checkForUpdate(): Promise<DesktopUpdateCheckResult>;
      downloadUpdate(): Promise<DesktopUpdateActionResult>;
      installUpdate(): Promise<DesktopUpdateActionResult>;
      openReleaseNotesUrl(payload: { url: string }): Promise<boolean>;
      onUpdateState(callback: (state: DesktopUpdateState) => void): () => void;
      onAgentProgress(callback: (event: AgentProgressEvent) => void): () => void;
      onAgentSetupTerminal(
        callback: (event: AgentSetupTerminalEvent) => void
      ): () => void;
      onMatterFolderSynced(
        callback: (event: { result: FolderSyncResult; state: AppBootstrapState }) => void
      ): () => void;
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

  async loadTutorialCase(): Promise<AppBootstrapState> {
    return window.lexharness!.loadTutorialCase();
  },

  async closeTutorialCase(payload?: {
    fallbackMatterId?: string;
    removeSample?: boolean;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.closeTutorialCase(payload);
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

  async runTurn(payload: {
    matterId: string;
    issueId?: string;
    userPrompt: string;
    overrideReviewMode?: AdversarialReviewMode;
    overridePracticeAreaId?: PracticeAreaId;
    overridePrimaryProvider?: LLMProviderId;
    overridePrimaryModel?: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.runTurn(payload);
  },

  async syncMatterFolder(matterId: string): Promise<{
    result: FolderSyncResult;
    state: AppBootstrapState;
  }> {
    return window.lexharness!.syncMatterFolder({ matterId });
  },

  async pickMatterFolder(matterId: string): Promise<{
    chosenPath: string | null;
    result?: FolderSyncResult;
    state: AppBootstrapState;
  }> {
    return window.lexharness!.pickMatterFolder({ matterId });
  },

  async createIssue(payload: {
    matterId: string;
    title: string;
    practiceArea?: PracticeAreaId;
    description?: string;
    specialistRole?: string;
    parentIssueId?: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.createIssue(payload);
  },

  async selectIssue(
    matterId: string,
    issueId: string | null
  ): Promise<AppBootstrapState> {
    return window.lexharness!.selectIssue({ matterId, issueId });
  },

  async forkIssue(payload: {
    matterId: string;
    sourceIssueId?: string | null;
    upToMessageId?: string;
    title: string;
    practiceArea?: PracticeAreaId;
    specialistRole?: string;
    description?: string;
    relationshipToParent?: 'fork' | 'specialist';
  }): Promise<AppBootstrapState> {
    return window.lexharness!.forkIssue(payload);
  },

  async settleIssue(
    issueId: string,
    settled: boolean
  ): Promise<AppBootstrapState> {
    return window.lexharness!.settleIssue({ issueId, settled });
  },

  async mergeBackIssue(payload: {
    issueId: string;
    targetIssueId?: string | null;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.mergeBackIssue(payload);
  },

  async deleteIssue(issueId: string): Promise<AppBootstrapState> {
    return window.lexharness!.deleteIssue({ issueId });
  },

  async synthesizeMasterBrief(payload: {
    matterId: string;
    issueIds?: string[];
    briefTitle?: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.synthesizeMasterBrief(payload);
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
    enabled?: boolean;
    name?: string;
    accentColor?: string;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    binaryPath?: string;
    homePath?: string;
    shadowHomePath?: string;
    customArgs?: string;
    autoCompactWindow?: string;
    idleCompaction?: 'default' | 'onReturn' | 'beforeCacheExpires' | 'off';
    authMethod?: 'oauth-personal' | 'oauth-business' | 'gemini-api-key' | 'agent-platform';
    gcpProject?: string;
    gcpLocation?: string;
    environmentVars?: { name: string; value: string; sensitive?: boolean }[];
    favoriteModels?: string[];
    hiddenModels?: string[];
    customModels?: { id: string; label: string }[];
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  }): Promise<AppBootstrapState> {
    return window.lexharness!.saveProviderCredential(payload);
  },

  async addProviderInstance(payload: {
    driverKind: 'codex-cli' | 'claude-agent-cli' | 'antigravity-acp';
    name: string;
    instanceId?: string;
    accentColor?: string;
    binaryPath?: string;
    homePath?: string;
    shadowHomePath?: string;
    customArgs?: string;
    authMethod?: 'oauth-personal' | 'oauth-business' | 'gemini-api-key' | 'agent-platform';
    gcpProject?: string;
    gcpLocation?: string;
  }): Promise<{ state: AppBootstrapState; createdId: LLMProviderId }> {
    return window.lexharness!.addProviderInstance(payload);
  },

  async deleteProviderInstance(
    providerId: LLMProviderId
  ): Promise<AppBootstrapState> {
    return window.lexharness!.deleteProviderInstance({ providerId });
  },

  async completeAgentOnboarding(): Promise<AppBootstrapState> {
    return window.lexharness!.completeAgentOnboarding();
  },

  async refreshAgentConnections(): Promise<AppBootstrapState> {
    return window.lexharness!.refreshAgentConnections();
  },

  async addCodexAccount(accountName: string): Promise<AppBootstrapState> {
    const res = await window.lexharness!.addCodexAccount({ accountName });
    return res.state;
  },

  async removeCodexAccount(instanceId: string): Promise<AppBootstrapState> {
    return window.lexharness!.removeCodexAccount({ instanceId });
  },

  async startAgentSetupCommand(payload: {
    instanceId: string;
    mode: 'install' | 'login' | 'custom';
    customCommand?: string;
  }): Promise<{ sessionId: string }> {
    return window.lexharness!.startAgentSetupCommand(payload);
  },

  async stopAgentSetupCommand(sessionId: string): Promise<AppBootstrapState> {
    return window.lexharness!.stopAgentSetupCommand({ sessionId });
  },

  async saveCourtListenerToken(token: string): Promise<AppBootstrapState> {
    return window.lexharness!.saveCourtListenerToken({ token });
  },

  async installCourtListenerOnDefaultAgent(
    driver?: 'codex' | 'claudeAgent' | 'antigravity' | 'all'
  ): Promise<AppBootstrapState> {
    return window.lexharness!.installCourtListenerOnDefaultAgent(
      driver ? { driver } : undefined
    );
  },

  async saveCustomMcpServer(
    server: CustomLegalMcpServer
  ): Promise<AppBootstrapState> {
    return window.lexharness!.saveCustomMcpServer({ server });
  },

  async deleteCustomMcpServer(
    serverId: string
  ): Promise<AppBootstrapState> {
    return window.lexharness!.deleteCustomMcpServer({ serverId });
  },

  async openExternalUrl(url: string): Promise<void> {
    return window.lexharness!.openExternalUrl({ url });
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

  async parseDocxBuffer(payload: {
    fileName: string;
    base64Data: string;
  }): Promise<ParsedDocxPreview> {
    return window.lexharness!.parseDocxBuffer(payload);
  },

  async pickDocxFile(): Promise<ParsedDocxPreview | null> {
    return window.lexharness!.pickDocxFile();
  },

  async exportDocx(payload: ExportDocxPayload): Promise<{
    saved: boolean;
    filePath?: string;
    byteLength?: number;
  }> {
    return window.lexharness!.exportDocx(payload);
  },

  async updateDocument(payload: {
    docId: string;
    title?: string;
    content?: string;
    category?: DocumentCategory;
    batesRange?: string;
    summary?: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.updateDocument(payload);
  },

  async updateDocumentVersion(payload: {
    versionId: string;
    content: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.updateDocumentVersion(payload);
  },

  async updateMessage(payload: {
    messageId: string;
    content: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.updateMessage(payload);
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

  async getPrivacyRoutingSettings(): Promise<PrivacyRoutingSettings> {
    return window.lexharness!.getPrivacyRoutingSettings();
  },

  async savePrivacyRoutingSettings(
    settings: Partial<PrivacyRoutingSettings>
  ): Promise<AppBootstrapState> {
    return window.lexharness!.savePrivacyRoutingSettings(settings);
  },

  async getRoutingLogs(payload?: {
    matterId?: string;
    limit?: number;
  }): Promise<RoutingDecisionLog[]> {
    return window.lexharness!.getRoutingLogs(payload);
  },

  async clearRoutingLogs(payload?: {
    matterId?: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.clearRoutingLogs(payload);
  },

  async exportRoutingLogs(payload?: {
    destinationPath?: string;
  }): Promise<string> {
    return window.lexharness!.exportRoutingLogs(payload);
  },

  async getAncillaryModelRegistry(): Promise<AncillaryModelRegistryState> {
    return window.lexharness!.getAncillaryModelRegistry();
  },

  async refreshAncillaryModelRegistry(): Promise<AppBootstrapState> {
    return window.lexharness!.refreshAncillaryModelRegistry();
  },

  async repickAncillaryModel(payload: {
    role: AncillaryCheckerRole;
    providerId: LLMProviderId;
    modelId: string;
  }): Promise<AppBootstrapState> {
    return window.lexharness!.repickAncillaryModel(payload);
  },

  async getUpdateState(): Promise<DesktopUpdateState | null> {
    if (window.lexharness?.getUpdateState) {
      return window.lexharness.getUpdateState();
    }
    return null;
  },

  async checkForUpdate(): Promise<DesktopUpdateCheckResult | null> {
    if (window.lexharness?.checkForUpdate) {
      return window.lexharness.checkForUpdate();
    }
    return null;
  },

  async downloadUpdate(): Promise<DesktopUpdateActionResult | null> {
    if (window.lexharness?.downloadUpdate) {
      return window.lexharness.downloadUpdate();
    }
    return null;
  },

  async installUpdate(): Promise<DesktopUpdateActionResult | null> {
    if (window.lexharness?.installUpdate) {
      return window.lexharness.installUpdate();
    }
    return null;
  },

  async openReleaseNotesUrl(url: string): Promise<boolean> {
    if (window.lexharness?.openReleaseNotesUrl) {
      return window.lexharness.openReleaseNotesUrl({ url });
    }
    return false;
  },

  onUpdateState(callback: (state: DesktopUpdateState) => void): () => void {
    if (window.lexharness?.onUpdateState) {
      return window.lexharness.onUpdateState(callback);
    }
    return () => {};
  },

  onAgentProgress(callback: (event: AgentProgressEvent) => void): () => void {
    if (window.lexharness) {
      return window.lexharness.onAgentProgress(callback);
    }
    return () => {};
  },

  onAgentSetupTerminal(
    callback: (event: AgentSetupTerminalEvent) => void
  ): () => void {
    if (window.lexharness) {
      return window.lexharness.onAgentSetupTerminal(callback);
    }
    return () => {};
  },

  onMatterFolderSynced(
    callback: (event: { result: FolderSyncResult; state: AppBootstrapState }) => void
  ): () => void {
    if (window.lexharness?.onMatterFolderSynced) {
      return window.lexharness.onMatterFolderSynced(callback);
    }
    return () => {};
  },
};
