export type LLMProviderId =
  | 'agy-acp'
  | 'codex-cli'
  | 'claude-cli'
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'openrouter'
  | 'legal-simulator';

export type ProviderDriverKind =
  | 'antigravity-acp'
  | 'codex-cli'
  | 'claude-agent-cli'
  | 'http-api'
  | 'local-simulator';

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
}

export interface ProviderConfig {
  id: LLMProviderId;
  driverKind: ProviderDriverKind;
  name: string;
  description: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  baseUrl?: string;
  binaryPath?: string;
  customArgs?: string;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  defaultModel: string;
  availableModels: { id: string; label: string }[];
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

export interface CourtListenerMcpAssuranceState {
  hasInstalledAgent: boolean;
  configuredAgentDisplayName: string | null;
  configuredAgentDriver: 'codex' | 'claudeAgent' | 'antigravity' | null;
  installedDrivers?: ('codex' | 'claudeAgent' | 'antigravity')[];
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

