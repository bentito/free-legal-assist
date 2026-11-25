export type LLMProviderId =
  | 'agy-acp'
  | 'codex-cli'
  | 'claude-cli'
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'openrouter'
  | 'legal-simulator'
  | (string & {});

export type ProviderDriverKind =
  | 'antigravity-acp'
  | 'codex-cli'
  | 'claude-agent-cli'
  | 'http-api'
  | 'local-simulator';

export type AntigravityAuthMethod =
  | 'oauth-personal'
  | 'oauth-business'
  | 'gemini-api-key'
  | 'agent-platform';

export type ClaudeIdleCompactionMode =
  | 'default'
  | 'onReturn'
  | 'beforeCacheExpires'
  | 'off';

export interface ProviderEnvironmentVariable {
  name: string;
  value: string;
  sensitive?: boolean;
}

export type PractitionerProfileId =
  | 'vt-criminal-defense'
  | 'general-legal-practice';

export type PracticeAreaId =
  | 'vt_suppression_art11'
  | 'vt_bail_conditions'
  | 'vt_discovery_impeachment'
  | 'vt_plea_sentencing'
  | 'general_litigation'
  | 'general_transactional'
  | 'general_regulatory'
  | 'general_investigation'
  | string;

export type AdversarialReviewMode =
  | 'multi_llm_default'
  | 'single_critic'
  | 'direct_bypass';

export interface ProviderRuntimeStatus {
  installed: boolean;
  authenticated: boolean;
  version: string;
  resolvedBinaryPath: string;
  authLabel: string;
  statusDetail: string;
  statusState?: 'ready' | 'warning' | 'error' | 'disabled';
  statusHeadline?: string;
  configProblems?: string[];
  checkedAt?: string;
  accountEmail?: string | null;
}

export interface ProviderConfig {
  id: LLMProviderId;
  driverKind: ProviderDriverKind;
  name: string;
  description: string;
  accentColor?: string;
  isDefaultInstance?: boolean;
  isDirty?: boolean;
  hasApiKey: boolean;
  maskedApiKey: string;
  baseUrl?: string;
  binaryPath?: string;
  homePath?: string;
  shadowHomePath?: string;
  customArgs?: string;
  autoCompactWindow?: string;
  idleCompaction?: ClaudeIdleCompactionMode;
  authMethod?: AntigravityAuthMethod;
  gcpProject?: string;
  gcpLocation?: string;
  environmentVars?: ProviderEnvironmentVariable[];
  favoriteModels?: string[];
  hiddenModels?: string[];
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  defaultModel: string;
  availableModels: { id: string; label: string; isCustom?: boolean; capabilities?: string[] }[];
  enabled: boolean;
  runtimeStatus?: ProviderRuntimeStatus;
}

export interface PracticeAreaPreset {
  id: PracticeAreaId;
  name: string;
  shortLabel: string;
  description: string;
  systemPrompt: string;
}

export interface PractitionerProfile {
  id: PractitionerProfileId;
  name: string;
  description: string;
  defaultJurisdiction: string;
  defaultCitationStyle: string;
  coreLegalMandate: string;
  practiceAreaPresets: PracticeAreaPreset[];
  activePracticeAreaId: PracticeAreaId;
  criticCitationAuditorPrompt: string;
  criticOpposingCounselPrompt: string;
  samplePrompts: string[];
}

export interface SystemPromptSettings {
  id: string;
  version: number;
  activeProfileId: PractitionerProfileId;
  profiles: PractitionerProfile[];
  coreLegalMandate: string;
  practiceAreaPresets: PracticeAreaPreset[];
  activePracticeAreaId: PracticeAreaId;
  criticCitationAuditorPrompt: string;
  criticOpposingCounselPrompt: string;
  updatedAt: string;
}

export interface AdversarialConfig {
  mode: AdversarialReviewMode;
  primaryProvider: LLMProviderId;
  primaryModel: string;
  citationAuditorProvider: LLMProviderId;
  citationAuditorModel: string;
  opposingCounselProvider: LLMProviderId;
  opposingCounselModel: string;
  maxRevisionRounds: number;
}

export interface Matter {
  id: string;
  name: string;
  clientName: string;
  matterNumber: string;
  practiceArea: PracticeAreaId;
  jurisdiction: string;
  citationStyle: string;
  folderPath: string;
  settled?: boolean;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMatterPayload {
  matterId: string;
  name: string;
  clientName: string;
  matterNumber: string;
  practiceArea: PracticeAreaId;
  jurisdiction: string;
  citationStyle: string;
  folderPath: string;
  settled?: boolean;
}

export interface MatterIssue {
  id: string;
  matterId: string;
  title: string;
  practiceArea: PracticeAreaId;
  description?: string;
  specialistRole?: string;
  parentIssueId?: string;
  relationshipToParent?: 'fork' | 'specialist';
  forkedFromMessageId?: string;
  settled?: boolean;
  settledAt?: string;
  status: 'open' | 'synthesized';
  createdAt: string;
  updatedAt: string;
}

export interface FolderSyncResult {
  matterId: string;
  resolvedPath: string;
  folderExists: boolean;
  syncedCount: number;
  newDocuments: MatterDocument[];
}

export type DocumentCategory =
  | 'PLEADING'
  | 'CONTRACT'
  | 'EXHIBIT'
  | 'DEPOSITION'
  | 'STATUTE_AUTHORITY'
  | 'WORK_PRODUCT';

export interface MatterDocument {
  id: string;
  matterId: string;
  title: string;
  fileName: string;
  category: DocumentCategory;
  batesRange: string;
  pageCount: number;
  summary: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  matterId: string;
  versionNumber: number;
  title: string;
  content: string;
  previousContent: string;
  rationaleSummary: string;
  createdByModel: string;
  createdAt: string;
}

export interface ChronologyFact {
  id: string;
  matterId: string;
  factDate: string;
  eventDescription: string;
  sourceCitation: string;
  status: 'UNDISPUTED' | 'DISPUTED' | 'NEEDS_CORROBORATION';
  createdAt: string;
}

export interface ToolCallRecord {
  id: string;
  toolName:
    | 'list_matter_documents'
    | 'search_matter_corpus'
    | 'read_document_pages'
    | 'verify_citation_lookup'
    | 'propose_document_redline'
    | 'record_chronology_fact';
  args: Record<string, unknown>;
  resultSummary: string;
  rawOutput: string;
  durationMs: number;
  status: 'running' | 'completed' | 'error';
}

export interface AdversarialObjection {
  category:
    | 'UNVERIFIED_CITATION'
    | 'RECORD_MISMATCH'
    | 'LOGICAL_GAP'
    | 'DRAFTING_RISK'
    | 'PROMPT_NONCOMPLIANCE';
  location: string;
  critique: string;
  requiredFix: string;
}

export interface AdversarialReviewRecord {
  id: string;
  messageId: string;
  round: number;
  criticRole: 'CITATION_AUDITOR' | 'OPPOSING_COUNSEL';
  criticTitle: string;
  provider: LLMProviderId;
  model: string;
  verdict: 'APPROVE' | 'REVISE';
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL';
  objections: AdversarialObjection[];
  dissentingConsiderations: string;
  createdAt: string;
}

export interface LegalMessage {
  id: string;
  matterId: string;
  issueId?: string;
  role: 'user' | 'assistant';
  content: string;
  category?: 'WORK_PRODUCT' | 'ADVISORY' | 'FEEDBACK';
  isEditedByAttorney?: boolean;
  initialDraftBeforeReview?: string;
  primaryProvider?: LLMProviderId;
  primaryModel?: string;
  reviewModeUsed?: AdversarialReviewMode;
  assembledSystemPromptSnapshot?: string;
  toolCalls: ToolCallRecord[];
  adversarialReviews: AdversarialReviewRecord[];
  revisionRoundsCompleted?: number;
  durationMs?: number;
  routeTier?: RouteTier;
  routingLogId?: string;
  piiAudit?: PiiMaskingAudit;
  createdAt: string;
}

export type ThreadMessage = LegalMessage;

export type AgentLoopPhase =
  | 'idle'
  | 'assembling_prompt'
  | 'executing_tools'
  | 'drafting_primary'
  | 'adversarial_review'
  | 'revising_after_critique'
  | 'completed'
  | 'error';

export interface AgentProgressEvent {
  matterId: string;
  phase: AgentLoopPhase;
  statusText: string;
  detailText?: string;
  toolCall?: ToolCallRecord;
  criticUpdate?: AdversarialReviewRecord;
}

export interface AssembledPromptPreview {
  profileName: string;
  matterName: string;
  jurisdiction: string;
  citationStyle: string;
  practiceAreaName: string;
  primarySystemPrompt: string;
  citationAuditorSystemPrompt: string;
  opposingCounselSystemPrompt: string;
}

export interface AgentConnectionInstance {
  instanceId: string;
  driver: 'codex' | 'claudeAgent' | 'antigravity';
  providerId: LLMProviderId;
  displayName: string;
  setupMode: 'existing' | 'managed';
  enabled: boolean;
  installed: boolean;
  authenticated: boolean;
  status: 'ready' | 'signIn' | 'install' | 'checking' | 'attention' | 'disabled';
  headline: string;
  detail: string | null;
  email: string | null;
  subscriptionLabel: string | null;
  version: string;
  resolvedBinaryPath: string;
  homePath: string;
  shadowHomePath: string;
  installCommand: string;
  loginCommand: string;
  isAdditionalAccount?: boolean;
}

export interface AgentMcpSyncStatus {
  instanceId: string;
  displayName: string;
  driver: 'codex' | 'claudeAgent' | 'antigravity';
  enabled: boolean;
  isChosenForRole: boolean;
  roles: string[];
  configPath: string;
  courtListenerConfigured: boolean;
  customServersConfigured: string[];
  missingServers: string[];
  inSync: boolean;
}

export interface CourtListenerMcpAssuranceState {
  hasInstalledAgent: boolean;
  configuredAgentDisplayName: string | null;
  configuredAgentDriver: 'codex' | 'claudeAgent' | 'antigravity' | null;
  installedDrivers?: ('codex' | 'claudeAgent' | 'antigravity')[];
  agentSyncStatuses?: AgentMcpSyncStatus[];
  hasAuthToken: boolean;
  maskedAuthToken: string | null;
  signupUrl: string;
  status: 'ready' | 'needs_token' | 'not_configured';
  statusHeadline: string;
  statusDetail: string;
}

export interface CustomLegalMcpServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  targetDriver: 'codex' | 'claudeAgent' | 'antigravity' | 'all';
  enabled: boolean;
  createdAt: string;
}

export interface AgentOnboardingState {
  completedAt: string | null;
  machineLabel: string;
  platformOs: 'darwin' | 'windows' | 'linux';
  agentInstances: AgentConnectionInstance[];
  courtListenerAssurance: CourtListenerMcpAssuranceState;
}

export interface AgentSetupTerminalEvent {
  sessionId: string;
  instanceId: string;
  driver: 'codex' | 'claudeAgent' | 'antigravity';
  command: string;
  phase: 'preparing' | 'running' | 'completed' | 'failed';
  output: string;
  exitCode?: number | null;
  detectedAuthUrl?: string | null;
}

export type RouteTier = 'LOCAL_PRIVATE' | 'FAST_ECONOMY' | 'FRONTIER_REASONING';

export type RoutingPolicyMode = 'smart_routing' | 'force_frontier' | 'local_only_airgapped';

export interface PiiMaskingAudit {
  entitiesDetectedCount: number;
  categories: Record<string, number>;
  tokensMasked: string[];
  rehydrationSuccessful: boolean;
}

export interface RoutingDecisionLog {
  id: string;
  timestamp: string;
  matterId: string;
  turnNumber: number;
  metrics: {
    rawPromptLength: number;
    corpusExcerptTokens: number;
    totalInputTokens: number;
  };
  classification: {
    inferredIntent: string;
    onnxComplexityScore: number;
    onnxLogits: Record<RouteTier, number>;
    decisionReason: string;
  };
  selectedTier: RouteTier;
  selectedModel: string;
  costEstimate: {
    selectedModelCostUSD: number;
    frontierBaselineCostUSD: number;
    estimatedSavingsUSD: number;
  };
  piiAudit: PiiMaskingAudit;
}

export type AncillaryCheckerRole = 'low_cost_economy' | 'citation_auditor' | 'opposing_counsel';

export interface AncillaryModelOption {
  providerId: LLMProviderId;
  providerName: string;
  modelId: string;
  modelLabel: string;
  tier: RouteTier;
  isAvailable: boolean;
  statusDetail?: string;
  costPer1kTokensUSD: number;
}

export interface AncillaryModelAdvisory {
  id: string;
  role: AncillaryCheckerRole;
  roleTitle: string;
  usageExplanation: string;
  configuredProvider: LLMProviderId;
  configuredModel: string;
  status: 'healthy' | 'restricted' | 'unavailable';
  message: string;
  suggestedAlternatives: AncillaryModelOption[];
  detectedAt: string;
}

export interface AncillaryModelRegistryState {
  lastConfirmedAt: string;
  nextScheduledCheckAt: string;
  roles: {
    low_cost_economy: {
      providerId: LLMProviderId;
      modelId: string;
      roleTitle: string;
      usageExplanation: string;
      status: 'healthy' | 'restricted' | 'unavailable';
    };
    citation_auditor: {
      providerId: LLMProviderId;
      modelId: string;
      roleTitle: string;
      usageExplanation: string;
      status: 'healthy' | 'restricted' | 'unavailable';
    };
    opposing_counsel: {
      providerId: LLMProviderId;
      modelId: string;
      roleTitle: string;
      usageExplanation: string;
      status: 'healthy' | 'restricted' | 'unavailable';
    };
  };
  advisories: AncillaryModelAdvisory[];
  availableWorkingModels: AncillaryModelOption[];
}

export interface PrivacyRoutingSettings {
  policyMode: RoutingPolicyMode;
  debugModeEnabled: boolean;
  preDispatchReviewEnabled: boolean;
  localSlmEndpoint?: string;
  preferDirectMLorCoreML?: boolean;
  economyModelProvider?: LLMProviderId;
  economyModel?: string;
}

export interface AppBootstrapState {
  matters: Matter[];
  activeMatterId: string;
  issues?: MatterIssue[];
  allIssues?: MatterIssue[];
  activeIssueId?: string | null;
  messages: LegalMessage[];
  documents: MatterDocument[];
  documentVersions: DocumentVersion[];
  chronologyFacts: ChronologyFact[];
  promptSettings: SystemPromptSettings;
  adversarialConfig: AdversarialConfig;
  providers: ProviderConfig[];
  assembledPromptPreview: AssembledPromptPreview;
  agentOnboarding: AgentOnboardingState;
  customMcpServers: CustomLegalMcpServer[];
  privacyRoutingSettings: PrivacyRoutingSettings;
  recentRoutingLogs: RoutingDecisionLog[];
  ancillaryModelRegistry: AncillaryModelRegistryState;
}

export interface DocxTrackedChange {
  id: string;
  type: 'insertion' | 'deletion';
  author: string;
  date?: string;
  text: string;
}

export interface DocxComment {
  id: string;
  author: string;
  date?: string;
  initials?: string;
  anchorText?: string;
  text: string;
}

export interface ParsedDocxPreview {
  fileName: string;
  suggestedTitle: string;
  content: string;
  pageCount: number;
  summary: string;
  trackedChanges?: DocxTrackedChange[];
  comments?: DocxComment[];
  stats: {
    headingCount: number;
    numberedParagraphCount: number;
    tableCount: number;
    footnoteCount: number;
    trackedChangeCount: number;
    commentCount: number;
  };
}

export interface ExportDocxPayload {
  title: string;
  suggestedFileName?: string;
  content: string;
  previousContent?: string;
  author?: string;
  date?: string;
  rationaleSummary?: string;
  comments?: Array<{
    author: string;
    text: string;
    anchorText?: string;
    targetSnippet?: string;
    date?: string;
  }>;
}

export type DesktopUpdateStatus =
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error';

export type DesktopRuntimeArch = 'arm64' | 'x64' | 'other';

export interface DesktopUpdateReleaseNote {
  version: string;
  items: string[];
  totalItems: number;
  releasedAt?: string;
  intro?: string;
  stats?: string;
  footer?: string;
}

export interface DesktopUpdateState {
  enabled: boolean;
  status: DesktopUpdateStatus;
  currentVersion: string;
  hostArch: DesktopRuntimeArch;
  appArch: DesktopRuntimeArch;
  runningUnderArm64Translation: boolean;
  availableVersion: string | null;
  downloadedVersion: string | null;
  releaseNotes: DesktopUpdateReleaseNote[];
  omittedReleaseCount: number;
  downloadPercent: number | null;
  checkedAt: string | null;
  message: string | null;
  errorContext: 'check' | 'download' | 'install' | null;
  canRetry: boolean;
  notAppliedVersion?: string;
}

export interface DesktopUpdateCheckResult {
  checked: boolean;
  state: DesktopUpdateState;
}

export interface DesktopUpdateActionResult {
  accepted: boolean;
  completed: boolean;
  state: DesktopUpdateState;
}




