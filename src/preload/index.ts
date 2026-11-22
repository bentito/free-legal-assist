import { contextBridge, ipcRenderer } from 'electron';
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
  savePrivacyRoutingSettings(settings: Partial<PrivacyRoutingSettings>): Promise<AppBootstrapState>;
  getRoutingLogs(payload?: { matterId?: string; limit?: number }): Promise<RoutingDecisionLog[]>;
  clearRoutingLogs(payload?: { matterId?: string }): Promise<AppBootstrapState>;
  exportRoutingLogs(payload?: { destinationPath?: string }): Promise<string>;
  getAncillaryModelRegistry(): Promise<AncillaryModelRegistryState>;
  refreshAncillaryModelRegistry(): Promise<AppBootstrapState>;
  repickAncillaryModel(payload: {
    role: AncillaryCheckerRole;
    providerId: LLMProviderId;
    modelId: string;
  }): Promise<AppBootstrapState>;
  onAgentProgress(callback: (event: AgentProgressEvent) => void): () => void;
  onAgentSetupTerminal(callback: (event: AgentSetupTerminalEvent) => void): () => void;
  onMatterFolderSynced(
    callback: (event: { result: FolderSyncResult; state: AppBootstrapState }) => void
  ): () => void;
}

const bridge: LexHarnessBridge = {
  bootstrap: () => ipcRenderer.invoke('legal:bootstrap'),
  selectMatter: (matterId) => ipcRenderer.invoke('legal:select-matter', matterId),
  createMatter: (payload) => ipcRenderer.invoke('legal:create-matter', payload),
  updateMatter: (payload) => ipcRenderer.invoke('legal:update-matter', payload),
  deleteMatter: (matterId) => ipcRenderer.invoke('legal:delete-matter', matterId),
  loadTutorialCase: () => ipcRenderer.invoke('legal:load-tutorial-case'),
  closeTutorialCase: (payload) =>
    ipcRenderer.invoke('legal:close-tutorial-case', payload),
  updateMatterJurisdiction: (payload) =>
    ipcRenderer.invoke('legal:update-matter-jurisdiction', payload),
  selectPractitionerProfile: (profileId) =>
    ipcRenderer.invoke('legal:select-practitioner-profile', profileId),
  runTurn: (payload) => ipcRenderer.invoke('legal:run-turn', payload),
  syncMatterFolder: (payload) =>
    ipcRenderer.invoke('legal:sync-matter-folder', payload),
  pickMatterFolder: (payload) =>
    ipcRenderer.invoke('legal:pick-matter-folder', payload),
  createIssue: (payload) => ipcRenderer.invoke('legal:create-issue', payload),
  selectIssue: (payload) => ipcRenderer.invoke('legal:select-issue', payload),
  forkIssue: (payload) => ipcRenderer.invoke('legal:fork-issue', payload),
  settleIssue: (payload) => ipcRenderer.invoke('legal:settle-issue', payload),
  mergeBackIssue: (payload) =>
    ipcRenderer.invoke('legal:merge-back-issue', payload),
  deleteIssue: (payload) => ipcRenderer.invoke('legal:delete-issue', payload),
  synthesizeMasterBrief: (payload) =>
    ipcRenderer.invoke('legal:synthesize-master-brief', payload),
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
  saveCustomMcpServer: (payload) =>
    ipcRenderer.invoke('legal:save-custom-mcp-server', payload),
  deleteCustomMcpServer: (payload) =>
    ipcRenderer.invoke('legal:delete-custom-mcp-server', payload),
  openExternalUrl: (payload) =>
    ipcRenderer.invoke('legal:open-external-url', payload),
  createDocument: (payload) => ipcRenderer.invoke('legal:create-document', payload),
  parseDocxBuffer: (payload) => ipcRenderer.invoke('legal:parse-docx-buffer', payload),
  pickDocxFile: () => ipcRenderer.invoke('legal:pick-docx-file'),
  exportDocx: (payload) => ipcRenderer.invoke('legal:export-docx', payload),
  updateDocument: (payload) => ipcRenderer.invoke('legal:update-document', payload),
  updateDocumentVersion: (payload) =>
    ipcRenderer.invoke('legal:update-document-version', payload),
  updateMessage: (payload) => ipcRenderer.invoke('legal:update-message', payload),
  addChronologyFact: (payload) =>
    ipcRenderer.invoke('legal:add-chronology-fact', payload),
  getPrivacyRoutingSettings: () =>
    ipcRenderer.invoke('legal:get-privacy-routing-settings'),
  savePrivacyRoutingSettings: (settings) =>
    ipcRenderer.invoke('legal:save-privacy-routing-settings', { settings }),
  getRoutingLogs: (payload) =>
    ipcRenderer.invoke('legal:get-routing-logs', payload),
  clearRoutingLogs: (payload) =>
    ipcRenderer.invoke('legal:clear-routing-logs', payload),
  exportRoutingLogs: (payload) =>
    ipcRenderer.invoke('legal:export-routing-logs', payload),
  getAncillaryModelRegistry: () =>
    ipcRenderer.invoke('legal:get-ancillary-model-registry'),
  refreshAncillaryModelRegistry: () =>
    ipcRenderer.invoke('legal:refresh-ancillary-model-registry'),
  repickAncillaryModel: (payload) =>
    ipcRenderer.invoke('legal:repick-ancillary-model', payload),
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
  onMatterFolderSynced: (callback) => {
    const listener = (
      _event: unknown,
      data: { result: FolderSyncResult; state: AppBootstrapState }
    ) => callback(data);
    ipcRenderer.on('legal:matter-folder-synced', listener);
    return () => {
      ipcRenderer.removeListener('legal:matter-folder-synced', listener);
    };
  },
};

contextBridge.exposeInMainWorld('lexharness', bridge);
