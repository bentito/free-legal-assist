import React, { useEffect, useState } from 'react';
import {
  AdversarialConfig,
  AncillaryCheckerRole,
  AncillaryModelRegistryState,
  AntigravityAuthMethod,
  AssembledPromptPreview,
  ClaudeIdleCompactionMode,
  CourtListenerMcpAssuranceState,
  CustomLegalMcpServer,
  LLMProviderId,
  Matter,
  PracticeAreaId,
  PracticeAreaPreset,
  PractitionerProfileId,
  PrivacyRoutingSettings,
  ProviderConfig,
  ProviderDriverKind,
  ProviderEnvironmentVariable,
  SystemPromptSettings,
} from '../../shared/types';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Compass,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  ScrollText,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Star,
  Trash2,
  UserCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

const ProviderBrandIcon: React.FC<{
  driverKind: ProviderDriverKind;
  accentColor?: string;
  sizeClass?: string;
}> = ({ driverKind, accentColor, sizeClass = 'w-4 h-4' }) => {
  if (driverKind === 'codex-cli') {
    return (
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} text-neutral-100`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a4.5 4.5 0 0 0-3.89 2.25L4.5 10.5a4.5 4.5 0 0 0 0 4.5l3.61 6.25a4.5 4.5 0 0 0 7.78 0l3.61-6.25a4.5 4.5 0 0 0 0-4.5L15.89 4.25A4.5 4.5 0 0 0 12 2Z" />
          <path d="M8.5 7.5 15.5 16.5" />
          <path d="M15.5 7.5 8.5 16.5" />
          <circle cx="12" cy="12" r="2.75" />
        </svg>
        {accentColor && (
          <span
            style={{ backgroundColor: accentColor }}
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-neutral-950"
          />
        )}
      </span>
    );
  }
  if (driverKind === 'claude-agent-cli') {
    return (
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} text-[#d97757]`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        >
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07M7.5 2.9l9 18.2M2.9 16.5l18.2-9" />
        </svg>
        {accentColor && (
          <span
            style={{ backgroundColor: accentColor }}
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-neutral-950"
          />
        )}
      </span>
    );
  }
  if (driverKind === 'antigravity-acp') {
    return (
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none">
          <path
            d="M12 3C9.2 3 6.8 9.4 4.5 19.5c1.8-2.2 4.1-4.2 7.5-4.2s5.7 2 7.5 4.2C17.2 9.4 14.8 3 12 3Z"
            stroke="#3b82f6"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 15.8C9 14.4 10.4 13.8 12 13.8c1.6 0 3 .6 4.5 2"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {accentColor && (
          <span
            style={{ backgroundColor: accentColor }}
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-neutral-950"
          />
        )}
      </span>
    );
  }
  return <Scale className={`${sizeClass} text-amber-400 shrink-0`} />;
};

export type StudioTab =
  | 'layer1_core'
  | 'layer2_practice'
  | 'layer3_jurisdiction'
  | 'layer4_critics'
  | 'providers_models'
  | 'legal_mcp'
  | 'privacy_routing'
  | 'live_preview'
  | 'tutorial_tour';

interface PromptGovernanceModalProps {
  isOpen: boolean;
  initialTab?: StudioTab;
  onClose: () => void;
  onOpenConnectAgents?: () => void;
  promptSettings: SystemPromptSettings;
  adversarialConfig: AdversarialConfig;
  providers: ProviderConfig[];
  activeMatter?: Matter | null;
  assembledPromptPreview: AssembledPromptPreview;
  courtListenerAssurance?: CourtListenerMcpAssuranceState;
  customMcpServers?: CustomLegalMcpServer[];
  isSampleCaseLoaded?: boolean;
  privacyRoutingSettings?: PrivacyRoutingSettings;
  onStartTutorial?: () => void;
  onLoadSampleCase?: () => Promise<void>;
  onCloseSampleCase?: () => Promise<void>;
  onSelectPractitionerProfile: (profileId: PractitionerProfileId) => Promise<void>;
  onSavePromptSettings: (updated: Partial<SystemPromptSettings>) => Promise<void>;
  onResetPromptSettings: () => Promise<void>;
  onSaveAdversarialConfig: (updated: Partial<AdversarialConfig>) => Promise<void>;
  onSaveProviderCredential: (payload: {
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
    idleCompaction?: ClaudeIdleCompactionMode;
    authMethod?: AntigravityAuthMethod;
    gcpProject?: string;
    gcpLocation?: string;
    environmentVars?: ProviderEnvironmentVariable[];
    favoriteModels?: string[];
    hiddenModels?: string[];
    customModels?: { id: string; label: string }[];
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  }) => Promise<void>;
  onAddProviderInstance?: (payload: {
    driverKind: 'codex-cli' | 'claude-agent-cli' | 'antigravity-acp';
    name: string;
    instanceId?: string;
    accentColor?: string;
    binaryPath?: string;
    homePath?: string;
    shadowHomePath?: string;
    customArgs?: string;
    authMethod?: AntigravityAuthMethod;
    gcpProject?: string;
    gcpLocation?: string;
  }) => Promise<LLMProviderId | void>;
  onDeleteProviderInstance?: (providerId: LLMProviderId) => Promise<void>;
  onUpdateMatterJurisdiction: (payload: {
    matterId: string;
    jurisdiction: string;
    citationStyle: string;
    practiceArea: PracticeAreaId;
  }) => Promise<void>;
  onSaveCourtListenerToken?: (token: string) => Promise<void>;
  onInstallCourtListenerOnDefaultAgent?: (
    driver?: 'codex' | 'claudeAgent' | 'antigravity' | 'all'
  ) => Promise<void>;
  onSaveCustomMcpServer?: (server: CustomLegalMcpServer) => Promise<void>;
  onDeleteCustomMcpServer?: (serverId: string) => Promise<void>;
  onOpenExternalUrl?: (url: string) => Promise<void>;
  onSavePrivacyRoutingSettings?: (updated: Partial<PrivacyRoutingSettings>) => Promise<void>;
  onExportRoutingLogs?: () => Promise<void>;
  onClearRoutingLogs?: () => Promise<void>;
  ancillaryRegistry?: AncillaryModelRegistryState;
  onRepickAncillaryModel?: (
    role: AncillaryCheckerRole,
    providerId: LLMProviderId,
    modelId: string
  ) => Promise<void>;
  onRefreshAncillaryModels?: () => Promise<void>;
}

export const PromptGovernanceModal: React.FC<PromptGovernanceModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  onOpenConnectAgents,
  promptSettings,
  adversarialConfig,
  providers,
  activeMatter,
  assembledPromptPreview,
  courtListenerAssurance,
  customMcpServers = [],
  isSampleCaseLoaded = false,
  ancillaryRegistry,
  onRepickAncillaryModel,
  onRefreshAncillaryModels,
  onStartTutorial,
  onLoadSampleCase,
  onCloseSampleCase,
  onSelectPractitionerProfile,
  onSavePromptSettings,
  onResetPromptSettings,
  onSaveAdversarialConfig,
  onSaveProviderCredential,
  onAddProviderInstance,
  onDeleteProviderInstance,
  onUpdateMatterJurisdiction,
  onSaveCourtListenerToken,
  onInstallCourtListenerOnDefaultAgent,
  onSaveCustomMcpServer,
  onDeleteCustomMcpServer,
  onOpenExternalUrl,
  privacyRoutingSettings,
  onSavePrivacyRoutingSettings,
  onExportRoutingLogs,
  onClearRoutingLogs,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab || 'layer1_core');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Legal MCP Tab state
  const [mcpTokenInput, setMcpTokenInput] = useState('');
  const [isSavingMcpToken, setIsSavingMcpToken] = useState(false);
  const [isInstallingDriver, setIsInstallingDriver] = useState<string | null>(null);

  // Custom MCP Server addition form state
  const [showAddCustomMcp, setShowAddCustomMcp] = useState(false);
  const [customServerId, setCustomServerId] = useState('');
  const [customServerName, setCustomServerName] = useState('');
  const [customServerDesc, setCustomServerDesc] = useState('');
  const [customServerCommand, setCustomServerCommand] = useState('npx');
  const [customServerArgs, setCustomServerArgs] = useState('');
  const [customServerEnv, setCustomServerEnv] = useState('');
  const [customServerTargetDriver, setCustomServerTargetDriver] = useState<
    'codex' | 'claudeAgent' | 'antigravity' | 'all'
  >('all');
  const [isSavingCustomServer, setIsSavingCustomServer] = useState(false);

  const [coreMandate, setCoreMandate] = useState(promptSettings.coreLegalMandate);
  const [presets, setPresets] = useState<PracticeAreaPreset[]>(
    promptSettings.practiceAreaPresets
  );
  const [selectedPresetId, setSelectedPresetId] = useState<PracticeAreaId>(
    promptSettings.activePracticeAreaId
  );
  const [auditorPrompt, setAuditorPrompt] = useState(
    promptSettings.criticCitationAuditorPrompt
  );
  const [opposingPrompt, setOpposingPrompt] = useState(
    promptSettings.criticOpposingCounselPrompt
  );

  // Matter Layer 3 state
  const [jurisdiction, setJurisdiction] = useState(activeMatter?.jurisdiction ?? '');
  const [citationStyle, setCitationStyle] = useState(activeMatter?.citationStyle ?? '');
  const [matterPracticeArea, setMatterPracticeArea] = useState<PracticeAreaId>(
    activeMatter?.practiceArea ?? 'vt_suppression_art11'
  );

  // Sync local editor state when active profile or matter changes
  useEffect(() => {
    setCoreMandate(promptSettings.coreLegalMandate);
    setPresets(promptSettings.practiceAreaPresets);
    setSelectedPresetId(promptSettings.activePracticeAreaId);
    setAuditorPrompt(promptSettings.criticCitationAuditorPrompt);
    setOpposingPrompt(promptSettings.criticOpposingCounselPrompt);
  }, [promptSettings]);

  useEffect(() => {
    if (activeMatter) {
      setJurisdiction(activeMatter.jurisdiction);
      setCitationStyle(activeMatter.citationStyle);
      setMatterPracticeArea(activeMatter.practiceArea);
    }
  }, [activeMatter]);

  // Selected agent in T3-style master-detail Providers panel
  const [selectedAgentId, setSelectedAgentId] = useState<LLMProviderId>(
    () => providers[0]?.id || 'codex-cli'
  );
  const [customModelInput, setCustomModelInput] = useState('');
  const [showAddCustomModelInput, setShowAddCustomModelInput] = useState(false);
  const [isRefreshingProviders, setIsRefreshingProviders] = useState(false);

  // T3 Code "Add provider" dialog state
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);
  const [newProviderDriver, setNewProviderDriver] = useState<
    'codex-cli' | 'claude-agent-cli' | 'antigravity-acp'
  >('antigravity-acp');
  const [newProviderLabel, setNewProviderLabel] = useState('');
  const [newProviderInstanceId, setNewProviderInstanceId] = useState('');
  const [newProviderAccentColor, setNewProviderAccentColor] = useState('');
  const [newProviderHomePath, setNewProviderHomePath] = useState('');
  const [newProviderShadowPath, setNewProviderShadowPath] = useState('');
  const [newProviderAuthMethod, setNewProviderAuthMethod] =
    useState<AntigravityAuthMethod>('oauth-personal');
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  // Per-agent runtime form inputs (synced with selected provider instance)
  const [displayNameInputs, setDisplayNameInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.name || '']))
  );
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [binaryPathInputs, setBinaryPathInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.binaryPath || '']))
  );
  const [homePathInputs, setHomePathInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.homePath || '']))
  );
  const [shadowHomePathInputs, setShadowHomePathInputs] = useState<
    Record<string, string>
  >(Object.fromEntries(providers.map((p) => [p.id, p.shadowHomePath || ''])));
  const [launchArgsInputs, setLaunchArgsInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.customArgs || '']))
  );
  const [autoCompactInputs, setAutoCompactInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.autoCompactWindow || '']))
  );
  const [idleCompactionInputs, setIdleCompactionInputs] = useState<
    Record<string, ClaudeIdleCompactionMode>
  >(
    Object.fromEntries(
      providers.map((p) => [p.id, p.idleCompaction || 'default'])
    )
  );
  const [authMethodInputs, setAuthMethodInputs] = useState<
    Record<string, AntigravityAuthMethod>
  >(
    Object.fromEntries(
      providers.map((p) => [p.id, p.authMethod || 'oauth-personal'])
    )
  );
  const [gcpProjectInputs, setGcpProjectInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.gcpProject || '']))
  );
  const [gcpLocationInputs, setGcpLocationInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.gcpLocation || '']))
  );

  useEffect(() => {
    setDisplayNameInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.name || '']))
    );
    setBinaryPathInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.binaryPath || '']))
    );
    setHomePathInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.homePath || '']))
    );
    setShadowHomePathInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.shadowHomePath || '']))
    );
    setLaunchArgsInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.customArgs || '']))
    );
    setAutoCompactInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.autoCompactWindow || '']))
    );
    setIdleCompactionInputs(
      Object.fromEntries(
        providers.map((p) => [p.id, p.idleCompaction || 'default'])
      )
    );
    setAuthMethodInputs(
      Object.fromEntries(
        providers.map((p) => [p.id, p.authMethod || 'oauth-personal'])
      )
    );
    setGcpProjectInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.gcpProject || '']))
    );
    setGcpLocationInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.gcpLocation || '']))
    );
  }, [providers]);

  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[0];

  const profiles = promptSettings.profiles || [];
  const activeProfile =
    profiles.find((p) => p.id === promptSettings.activeProfileId) ?? profiles[0];

  const flashSaved = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(null), 2600);
  };

  const handleProfileChange = async (profileId: PractitionerProfileId) => {
    await onSelectPractitionerProfile(profileId);
    const chosen = profiles.find((p) => p.id === profileId);
    flashSaved(`Switched Active Practitioner Profile to "${chosen?.name ?? profileId}"`);
  };

  const handleSavePrompts = async () => {
    await onSavePromptSettings({
      coreLegalMandate: coreMandate,
      practiceAreaPresets: presets,
      activePracticeAreaId: selectedPresetId,
      criticCitationAuditorPrompt: auditorPrompt,
      criticOpposingCounselPrompt: opposingPrompt,
    });
    flashSaved(
      `Saved ${activeProfile?.name ?? 'Practice'} Settings & Reviewer Instructions`
    );
  };

  const handleSaveLayer3 = async () => {
    if (!activeMatter) return;
    await onUpdateMatterJurisdiction({
      matterId: activeMatter.id,
      jurisdiction,
      citationStyle,
      practiceArea: matterPracticeArea,
    });
    flashSaved(`Updated Matter Jurisdiction & Citation Rules for ${activeMatter.name}`);
  };

  const updateSelectedPresetPrompt = (newPrompt: string) => {
    setPresets((prev) =>
      prev.map((p) =>
        p.id === activePreset.id ? { ...p, systemPrompt: newPrompt } : p
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-6xl h-[88vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-100">
                  Settings
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Profile: {activeProfile?.name ?? 'Vermont Criminal Defense Lawyer'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select your practice profile, customize instructions and legal standards, and configure review models and research tools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedBanner && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {savedBanner}
              </span>
            )}
            <button
              onClick={async () => {
                await onResetPromptSettings();
                flashSaved(
                  `Reset ${activeProfile?.name ?? 'Active Profile'} to Default Prompts`
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
              title="Reset active Practitioner Profile prompts to built-in defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Profile Defaults
            </button>
            <button
              onClick={() => {
                onClose();
                onStartTutorial?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-xs text-amber-300 border border-amber-500/40 transition cursor-pointer"
              title="Launch the transparent guided tutorial overlay"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Guided Tour
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Practitioner Profile Selector Bar (1st: Vermont Criminal Defense Lawyer, 2nd: General Legal Practice) */}
        <div
          id="tour-settings-profile-bar"
          className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <UserCheck className="w-4 h-4 text-amber-400" />
              Practitioner Profile:
            </div>
            <select
              value={promptSettings.activeProfileId}
              onChange={(e) =>
                handleProfileChange(e.target.value as PractitionerProfileId)
              }
              className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-amber-500/40 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-400"
            >
              {profiles.map((prof, idx) => (
                <option key={prof.id} value={prof.id}>
                  {idx + 1}. {prof.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[11px] text-slate-400 flex-1 min-w-[260px]">
            {activeProfile?.description}
          </div>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left Navigation Tabs */}
          <div className="w-68 bg-slate-950/60 border-r border-slate-800 p-3 flex flex-col gap-1.5">
            <div id="tour-settings-prompt-layers" className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab('layer1_core')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                  activeTab === 'layer1_core'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Core Legal Principles</div>
                  <div className="text-[10px] opacity-75">
                    Constitutional & Ethical Standards
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('layer2_practice')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                  activeTab === 'layer2_practice'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ScrollText className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Practice Task Presets</div>
                  <div className="text-[10px] opacity-75">
                    Suppression, Bail, Discovery, etc.
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('layer3_jurisdiction')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                  activeTab === 'layer3_jurisdiction'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Matter & Forum Rules</div>
                  <div className="text-[10px] opacity-75">
                    Court Rules & Citation Manual
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('layer4_critics')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                  activeTab === 'layer4_critics'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Reviewers & Opposing Counsel</div>
                  <div className="text-[10px] opacity-75">
                    Citation Auditor & Opposing Perspective
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setActiveTab('providers_models')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                activeTab === 'providers_models'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <span>Agent Setup</span>
                  {providers.some(
                    (p) =>
                      p.enabled &&
                      p.id !== 'legal-simulator' &&
                      (p.runtimeStatus?.configProblems?.length ?? 0) > 0
                  ) ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400"
                      title="One or more enabled agents have setup issues flagged"
                    />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div className="text-[10px] opacity-75">
                  Providers, Runtime & Review Team
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('legal_mcp')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                activeTab === 'legal_mcp'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Wrench className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <span>MCP Setup</span>
                  {courtListenerAssurance?.agentSyncStatuses?.some(
                    (s) => (s.enabled || s.isChosenForRole) && !s.inSync
                  ) ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400"
                      title="Some chosen agents need MCP tools synced"
                    />
                  ) : courtListenerAssurance?.hasInstalledAgent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ) : null}
                </div>
                <div className="text-[10px] opacity-75 truncate max-w-[170px]">
                  CourtListener & Legal MCP Tools
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('privacy_routing')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                activeTab === 'privacy_routing'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <div>
                <div className="font-semibold flex items-center gap-1.5">
                  <span>Privacy & Local Routing</span>
                </div>
                <div className="text-[10px] opacity-75 truncate max-w-[170px]">
                  ONNX Router & PII Gateway
                </div>
              </div>
            </button>

            <div className="mt-auto pt-3 border-t border-slate-800 space-y-1.5">
              <button
                onClick={() => setActiveTab('tutorial_tour')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                  activeTab === 'tutorial_tour'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <div className="font-semibold">Tour & Sample Case</div>
                  <div className="text-[10px] opacity-75">
                    Guide and sample matter
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('live_preview')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                  activeTab === 'live_preview'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Eye className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold">Assembled Prompt</div>
                  <div className="text-[10px] opacity-75">
                    Inspect full instructions
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Editor Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'layer1_core' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Core Legal Principles ({activeProfile?.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Governs every turn for this Practitioner Profile. Enforces constitutional primacy, record pinpoint citations, and strict legal standards.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Core Principles
                  </button>
                </div>

                <textarea
                  value={coreMandate}
                  onChange={(e) => setCoreMandate(e.target.value)}
                  rows={18}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500/60"
                />
              </div>
            )}

            {activeTab === 'layer2_practice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Practice Area & Task Presets ({activeProfile?.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select and customize the task persona instructions for {activeProfile?.name}.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Task Preset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedPresetId === preset.id
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{preset.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>

                {activePreset && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-medium text-slate-300">
                      System Prompt Directive for:{' '}
                      <span className="text-amber-400 font-semibold">
                        {activePreset.name}
                      </span>
                    </label>
                    <textarea
                      value={activePreset.systemPrompt}
                      onChange={(e) => updateSelectedPresetPrompt(e.target.value)}
                      rows={13}
                      className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'layer3_jurisdiction' && (
              !activeMatter ? (
                <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                  No active matter is selected. Create or select a matter to configure its jurisdiction and citation manual.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        Matter Jurisdiction & Citation Rules ({activeMatter.name})
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Provided to both the Drafting Assistant and Reviewers to enforce controlling forum law and citation style.
                      </p>
                    </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (!activeProfile) return;
                        setJurisdiction(activeProfile.defaultJurisdiction);
                        setCitationStyle(activeProfile.defaultCitationStyle);
                        setMatterPracticeArea(activeProfile.activePracticeAreaId);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 transition"
                    >
                      Apply {activeProfile?.name} Defaults
                    </button>
                    <button
                      onClick={handleSaveLayer3}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                    >
                      Save Matter Jurisdiction Rules
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Governing Jurisdiction & Forum Court
                    </label>
                    <input
                      type="text"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Mandatory Legal Citation Manual / Format
                    </label>
                    <input
                      type="text"
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Default Task Persona for Matter
                    </label>
                    <select
                      value={matterPracticeArea}
                      onChange={(e) =>
                        setMatterPracticeArea(e.target.value as PracticeAreaId)
                      }
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'layer4_critics' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Reviewer & Opposing Perspective Instructions ({activeProfile?.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Customize instructions for the reviewer models that audit citations and evaluate opposing arguments before delivery.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Reviewer Instructions
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-400">
                    Reviewer #1: Citation & Discovery Record Auditor Instructions
                  </label>
                  <textarea
                    value={auditorPrompt}
                    onChange={(e) => setAuditorPrompt(e.target.value)}
                    rows={8}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-rose-400">
                    Reviewer #2: Opposing Counsel & Judicial Perspective Instructions
                  </label>
                  <textarea
                    value={opposingPrompt}
                    onChange={(e) => setOpposingPrompt(e.target.value)}
                    rows={8}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            )}

            {activeTab === 'providers_models' && (() => {
              const selectedAgent =
                providers.find((p) => p.id === selectedAgentId) ?? providers[0];
              const isSelectedCliAgent = Boolean(selectedAgent);
              const enabledProviders = providers.filter((p) => p.enabled !== false);
              const roleOptions =
                enabledProviders.length > 0 ? enabledProviders : providers;

              const formatCheckedElapsed = (iso?: string) => {
                if (!iso) return '1m';
                const diffSec = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
                );
                if (diffSec < 60) return '1m';
                const mins = Math.floor(diffSec / 60);
                if (mins < 60) return `${mins}m`;
                return `${Math.floor(mins / 60)}h`;
              };

              const latestCheckedAt = providers.reduce<string | undefined>(
                (acc, p) => {
                  const ts = p.runtimeStatus?.checkedAt;
                  if (!ts) return acc;
                  if (!acc) return ts;
                  return ts > acc ? ts : acc;
                },
                ancillaryRegistry?.lastConfirmedAt
              );

              const getModelsForProvider = (
                providerId: LLMProviderId,
                currentModelId?: string
              ) => {
                const prov = providers.find((p) => p.id === providerId);
                const hidden = new Set(prov?.hiddenModels || []);
                const list = (prov?.availableModels ?? []).filter(
                  (m) => m.isCustom || !hidden.has(m.id)
                );
                if (
                  currentModelId &&
                  !list.some((m) => m.id === currentModelId)
                ) {
                  list.push({
                    id: currentModelId,
                    label: currentModelId,
                  });
                }
                return list;
              };

              const economyProv =
                privacyRoutingSettings?.economyModelProvider ||
                ancillaryRegistry?.roles?.low_cost_economy?.providerId ||
                'agy-acp';
              const economyModel =
                privacyRoutingSettings?.economyModel ||
                ancillaryRegistry?.roles?.low_cost_economy?.modelId ||
                'gemini-3.8-flash';

              const commitSelectedField = async (
                patch: Parameters<typeof onSaveProviderCredential>[0],
                bannerMsg?: string
              ) => {
                await onSaveProviderCredential(patch);
                if (bannerMsg) flashSaved(bannerMsg);
              };

              return (
                <div className="space-y-6">
                  {/* T3 Code `Providers +` Header & `Checked 1m ago` Refresh Control (Exact match to image.png) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold tracking-tight text-neutral-100">
                          Providers
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setNewProviderLabel('');
                            setNewProviderInstanceId('');
                            setNewProviderHomePath('');
                            setNewProviderShadowPath('');
                            setShowAddProviderDialog(true);
                          }}
                          title="Add provider"
                          aria-label="Add provider"
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isRefreshingProviders}
                          onClick={async () => {
                            setIsRefreshingProviders(true);
                            try {
                              if (onRefreshAncillaryModels) {
                                await onRefreshAncillaryModels();
                                flashSaved('Checked provider status & configurations');
                              }
                            } finally {
                              setIsRefreshingProviders(false);
                            }
                          }}
                          title="Refresh provider status"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              isRefreshingProviders ? 'animate-spin' : ''
                            }`}
                          />
                          <span>
                            {isRefreshingProviders ? (
                              'Refreshing providers'
                            ) : (
                              <>
                                Checked{' '}
                                <span className="font-mono tabular-nums">
                                  {formatCheckedElapsed(latestCheckedAt)}
                                </span>{' '}
                                ago
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Main T3 Code Master-Detail Providers Box (Exact match to image.png) */}
                    <div className="rounded-xl border border-neutral-800/90 bg-[#0d0d10] overflow-hidden grid grid-cols-1 lg:grid-cols-[17.5rem_minmax(0,1fr)] min-h-[31rem]">
                      {/* Left Column: Provider Instances List + `+ Add provider` */}
                      <div className="border-b lg:border-b-0 lg:border-r border-neutral-800/80 bg-[#111115]/60 flex flex-col justify-between">
                        <div className="divide-y divide-neutral-800/70">
                          {providers.map((prov) => {
                            const isSelected = selectedAgent?.id === prov.id;
                            const isEnabled = prov.enabled !== false;
                            const problems =
                              prov.runtimeStatus?.configProblems ?? [];
                            const hasProblem = isEnabled && problems.length > 0;
                            const statusState =
                              prov.runtimeStatus?.statusState ??
                              (isEnabled ? 'ready' : 'disabled');
                            const versionBadge =
                              isEnabled && prov.runtimeStatus?.version
                                ? prov.runtimeStatus.version
                                : '';
                            const statusHeadline = !isEnabled
                              ? 'Disabled'
                              : prov.runtimeStatus?.statusHeadline ||
                                (prov.hasApiKey
                                  ? `Authenticated · ${
                                      prov.runtimeStatus?.authLabel || 'Ready'
                                    }`
                                  : prov.runtimeStatus?.installed
                                    ? `Not authenticated · ${
                                        prov.runtimeStatus?.authLabel ||
                                        'Sign-in required'
                                      }`
                                    : 'Not found · CLI not detected on PATH');

                            return (
                              <div
                                key={prov.id}
                                className={`group relative flex min-h-[4.5rem] items-center justify-between gap-3 px-3.5 py-3 transition-colors ${
                                  isSelected
                                    ? 'bg-white/[0.06]'
                                    : 'hover:bg-white/[0.025]'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedAgentId(prov.id)}
                                  aria-pressed={isSelected}
                                  className={`flex min-w-0 flex-1 items-start gap-3 text-left outline-none cursor-pointer transition-opacity ${
                                    !isEnabled && !isSelected
                                      ? 'opacity-60 group-hover:opacity-100'
                                      : ''
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    <ProviderBrandIcon
                                      driverKind={prov.driverKind}
                                      accentColor={prov.accentColor}
                                      sizeClass="w-4 h-4"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="truncate text-sm font-medium text-neutral-100">
                                        {prov.name}
                                      </span>
                                      {versionBadge && (
                                        <code className="max-w-24 shrink-0 truncate font-mono text-xs text-neutral-400">
                                          {versionBadge}
                                        </code>
                                      )}
                                      {hasProblem && (
                                        <span
                                          title={problems.join(' ')}
                                          className="shrink-0 text-amber-400"
                                        >
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-0.5 flex items-start gap-1.5 text-xs leading-normal text-neutral-400">
                                      {isEnabled &&
                                        (statusState === 'warning' ||
                                          statusState === 'error') && (
                                          <span
                                            className={`mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full ${
                                              statusState === 'error'
                                                ? 'bg-rose-500'
                                                : 'bg-amber-400'
                                            }`}
                                          />
                                        )}
                                      <span className="line-clamp-2 break-words">
                                        {statusHeadline}
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                {/* Right Pill Toggle Switch (Exact match to T3 Code image.png) */}
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isEnabled}
                                  aria-label={`Enable ${prov.name}`}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const nextEnabled = !isEnabled;
                                    await commitSelectedField(
                                      {
                                        providerId: prov.id,
                                        enabled: nextEnabled,
                                      },
                                      `${nextEnabled ? 'Enabled' : 'Disabled'} ${
                                        prov.name
                                      }`
                                    );
                                  }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                                    isEnabled
                                      ? 'bg-blue-600'
                                      : 'bg-neutral-800 border border-neutral-700'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-neutral-100 transition-transform ${
                                      isEnabled
                                        ? 'translate-x-4'
                                        : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}

                          {/* Bottom Row: `+ Add provider` */}
                          <button
                            type="button"
                            onClick={() => {
                              setNewProviderLabel('');
                              setNewProviderInstanceId('');
                              setNewProviderHomePath('');
                              setNewProviderShadowPath('');
                              setShowAddProviderDialog(true);
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm text-neutral-400 hover:bg-white/[0.03] hover:text-neutral-100 transition"
                          >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>Add provider</span>
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Selected Provider Instance Editor (Matches image.png & Bi(e)) */}
                      {selectedAgent && (
                        <div className="min-w-0 divide-y divide-neutral-800/80 px-6 py-5 space-y-5 text-xs overflow-y-auto">
                          {/* Instance Header Bar + Status */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ProviderBrandIcon
                                  driverKind={selectedAgent.driverKind}
                                  accentColor={selectedAgent.accentColor}
                                  sizeClass="w-4 h-4"
                                />
                                <h4 className="text-base font-semibold text-neutral-100 truncate">
                                  {selectedAgent.name}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {selectedAgent.runtimeStatus?.version && (
                                  <code className="font-mono text-xs text-neutral-400">
                                    {selectedAgent.runtimeStatus.version}
                                  </code>
                                )}
                                {selectedAgent.isDefaultInstance &&
                                  selectedAgent.isDirty &&
                                  onDeleteProviderInstance && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onDeleteProviderInstance(
                                          selectedAgent.id
                                        );
                                        flashSaved(
                                          `Reset ${selectedAgent.name} settings to default`
                                        );
                                      }}
                                      title={`Reset ${selectedAgent.name} provider settings to default`}
                                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                {!selectedAgent.isDefaultInstance &&
                                  onDeleteProviderInstance && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const removedName = selectedAgent.name;
                                        const fallbackId =
                                          providers.find(
                                            (p) => p.id !== selectedAgent.id
                                          )?.id || 'codex-cli';
                                        await onDeleteProviderInstance(
                                          selectedAgent.id
                                        );
                                        setSelectedAgentId(fallbackId);
                                        flashSaved(
                                          `Removed provider instance ${removedName}`
                                        );
                                      }}
                                      title={`Delete instance ${selectedAgent.name}`}
                                      className="p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                              </div>
                            </div>

                            {/* Status Block + Config Problem Flagging */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-semibold text-neutral-100">
                                    Status
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
                                    {selectedAgent.enabled &&
                                      (selectedAgent.runtimeStatus?.statusState ===
                                        'warning' ||
                                        selectedAgent.runtimeStatus?.statusState ===
                                          'error') && (
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                            selectedAgent.runtimeStatus
                                              ?.statusState === 'error'
                                              ? 'bg-rose-500'
                                              : 'bg-amber-400'
                                          }`}
                                        />
                                      )}
                                    <span>
                                      {!selectedAgent.enabled
                                        ? 'Disabled · This provider is installed but disabled for new sessions.'
                                        : selectedAgent.runtimeStatus
                                            ?.statusHeadline ||
                                          `Authenticated · ${
                                            selectedAgent.runtimeStatus
                                              ?.authLabel || 'Ready'
                                          }`}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {!selectedAgent.enabled && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await commitSelectedField(
                                          {
                                            providerId: selectedAgent.id,
                                            enabled: true,
                                          },
                                          `Enabled ${selectedAgent.name}`
                                        );
                                      }}
                                      className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition"
                                    >
                                      Enable {selectedAgent.name}
                                    </button>
                                  )}
                                  {isSelectedCliAgent && onOpenConnectAgents && (
                                    <button
                                      type="button"
                                      onClick={onOpenConnectAgents}
                                      className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition"
                                    >
                                      {selectedAgent.hasApiKey
                                        ? 'Change account / Re-auth'
                                        : selectedAgent.runtimeStatus?.installed
                                          ? 'Sign in'
                                          : 'Install CLI'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Flagged Setup / Config Problems Banner */}
                              {selectedAgent.enabled &&
                                (selectedAgent.runtimeStatus?.configProblems
                                  ?.length ?? 0) > 0 && (
                                  <div
                                    role="alert"
                                    className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/35 space-y-1.5"
                                  >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>
                                        Setup / Configuration Issue Detected
                                      </span>
                                    </div>
                                    <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-1">
                                      {selectedAgent.runtimeStatus!.configProblems!.map(
                                        (prob, idx) => (
                                          <li key={idx}>{prob}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Display name Row (Exact match to image.png) */}
                          <div
                            className={`pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              !selectedAgent.enabled ? 'opacity-50' : ''
                            }`}
                          >
                            <label className="text-xs font-medium text-neutral-100">
                              Display name
                            </label>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button
                                type="button"
                                title="Cycle accent color marker"
                                onClick={async () => {
                                  const palette = [
                                    '#2563eb',
                                    '#10b981',
                                    '#f59e0b',
                                    '#ec4899',
                                    '#8b5cf6',
                                    '',
                                  ];
                                  const currIdx = palette.indexOf(
                                    selectedAgent.accentColor || ''
                                  );
                                  const nextColor =
                                    palette[(currIdx + 1) % palette.length];
                                  await commitSelectedField(
                                    {
                                      providerId: selectedAgent.id,
                                      accentColor: nextColor,
                                    },
                                    nextColor
                                      ? `Updated accent color for ${selectedAgent.name}`
                                      : `Cleared accent color for ${selectedAgent.name}`
                                  );
                                }}
                                style={
                                  selectedAgent.accentColor
                                    ? {
                                        backgroundColor:
                                          selectedAgent.accentColor,
                                      }
                                    : undefined
                                }
                                className="inline-flex w-6 h-6 items-center justify-center rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition shrink-0"
                              >
                                {!selectedAgent.accentColor && (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <input
                                type="text"
                                value={
                                  displayNameInputs[selectedAgent.id] ??
                                  selectedAgent.name
                                }
                                onChange={(e) =>
                                  setDisplayNameInputs((prev) => ({
                                    ...prev,
                                    [selectedAgent.id]: e.target.value,
                                  }))
                                }
                                onBlur={async () => {
                                  const val = (
                                    displayNameInputs[selectedAgent.id] ?? ''
                                  ).trim();
                                  if (val && val !== selectedAgent.name) {
                                    await commitSelectedField(
                                      {
                                        providerId: selectedAgent.id,
                                        name: val,
                                      },
                                      `Updated display name to ${val}`
                                    );
                                  }
                                }}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                placeholder={selectedAgent.name}
                                className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-neutral-600"
                              />
                            </div>
                          </div>

                          {/* Runtime Section (Exact ProviderSettingsForm schema per driverKind, matching image.png!) */}
                          {isSelectedCliAgent && (
                            <div
                              className={`pt-5 space-y-4 ${
                                !selectedAgent.enabled ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="text-sm font-semibold text-neutral-100">
                                Runtime
                              </div>

                              <div className="divide-y divide-neutral-800/70 space-y-4">
                                {/* CODEX RUNTIME FIELDS (Exact match to image.png) */}
                                {selectedAgent.driverKind === 'codex-cli' && (
                                  <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Binary path
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Path to the Codex binary used by this instance.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            binaryPathInputs[selectedAgent.id] ||
                                            'codex'
                                          }
                                          onChange={(e) =>
                                            setBinaryPathInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                binaryPath:
                                                  binaryPathInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved Codex binary path'
                                            )
                                          }
                                          placeholder="codex"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          CODEX_HOME path
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Custom Codex home and config directory.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            homePathInputs[selectedAgent.id] ?? ''
                                          }
                                          onChange={(e) =>
                                            setHomePathInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                homePath:
                                                  homePathInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved CODEX_HOME path & validated config'
                                            )
                                          }
                                          placeholder="~/.codex"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Shadow home path
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Account-specific Codex home. Keeps auth.json separate while sharing state from CODEX_HOME.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            shadowHomePathInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setShadowHomePathInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                shadowHomePath:
                                                  shadowHomePathInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved Shadow home path'
                                            )
                                          }
                                          placeholder="~/.codex-t3/personal"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Launch arguments
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Additional CLI arguments passed to codex app-server on session start.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            launchArgsInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setLaunchArgsInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                customArgs:
                                                  launchArgsInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved Launch arguments'
                                            )
                                          }
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* CLAUDE RUNTIME FIELDS (Exact match to T3 Code ClaudeSettings) */}
                                {selectedAgent.driverKind ===
                                  'claude-agent-cli' && (
                                  <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Binary path
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Path to the Claude binary used by this instance.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            binaryPathInputs[selectedAgent.id] ||
                                            'claude'
                                          }
                                          onChange={(e) =>
                                            setBinaryPathInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                binaryPath:
                                                  binaryPathInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved Claude binary path'
                                            )
                                          }
                                          placeholder="claude"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          CLAUDE_CONFIG_DIR path
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Custom Claude home and config directory. Keeps .claude.json and .claude separate.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            homePathInputs[selectedAgent.id] ?? ''
                                          }
                                          onChange={(e) =>
                                            setHomePathInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                homePath:
                                                  homePathInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved CLAUDE_CONFIG_DIR path'
                                            )
                                          }
                                          placeholder="~/.claude"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Auto-compact after
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Compact after 100,000 to 1,000,000 tokens. Leave empty to use Claude's default.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            autoCompactInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setAutoCompactInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                autoCompactWindow:
                                                  autoCompactInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Updated Auto-compact window'
                                            )
                                          }
                                          placeholder="e.g. 300000"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Compact idle threads
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          When to compact an idle thread over 200,000 tokens: after you return, just before its prompt cache expires, or never.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <select
                                          value={
                                            idleCompactionInputs[
                                              selectedAgent.id
                                            ] ?? 'default'
                                          }
                                          onChange={async (e) => {
                                            const mode = e.target
                                              .value as ClaudeIdleCompactionMode;
                                            setIdleCompactionInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: mode,
                                            }));
                                            await commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                idleCompaction: mode,
                                              },
                                              'Updated idle thread compaction mode'
                                            );
                                          }}
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-neutral-600"
                                        >
                                          <option value="default">
                                            Use default
                                          </option>
                                          <option value="onReturn">
                                            When you return
                                          </option>
                                          <option value="beforeCacheExpires">
                                            Before the cache expires (beta)
                                          </option>
                                          <option value="off">Never</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Launch arguments
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Additional CLI arguments passed on session start.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            launchArgsInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setLaunchArgsInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                customArgs:
                                                  launchArgsInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved Launch arguments'
                                            )
                                          }
                                          placeholder="e.g. --chrome"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* ANTIGRAVITY RUNTIME FIELDS (Exact match to T3 Code AntigravitySettings) */}
                                {selectedAgent.driverKind ===
                                  'antigravity-acp' && (
                                  <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Sign-in method
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Google accounts use your subscription; API keys and Agent Platform bill usage.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <select
                                          value={
                                            authMethodInputs[selectedAgent.id] ??
                                            'oauth-personal'
                                          }
                                          onChange={async (e) => {
                                            const method = e.target
                                              .value as AntigravityAuthMethod;
                                            setAuthMethodInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: method,
                                            }));
                                            await commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                authMethod: method,
                                              },
                                              `Updated Sign-in method for ${selectedAgent.name}`
                                            );
                                          }}
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-neutral-600"
                                        >
                                          <option value="oauth-personal">
                                            Google account
                                          </option>
                                          <option value="oauth-business">
                                            Gemini Enterprise
                                          </option>
                                          <option value="gemini-api-key">
                                            Gemini API key
                                          </option>
                                          <option value="agent-platform">
                                            Agent Platform (Vertex AI)
                                          </option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          API key
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Gemini or Vertex AI express key. Stored separately on the host.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="password"
                                          value={
                                            apiKeyInputs[selectedAgent.id] ?? ''
                                          }
                                          onChange={(e) =>
                                            setApiKeyInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={async () => {
                                            const val = (
                                              apiKeyInputs[selectedAgent.id] ??
                                              ''
                                            ).trim();
                                            if (val) {
                                              await commitSelectedField(
                                                {
                                                  providerId: selectedAgent.id,
                                                  apiKey: val,
                                                },
                                                `Saved API key for ${selectedAgent.name}`
                                              );
                                              setApiKeyInputs((prev) => ({
                                                ...prev,
                                                [selectedAgent.id]: '',
                                              }));
                                            }
                                          }}
                                          placeholder="Optional"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          GCP project
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Required for Gemini Enterprise. Agent Platform uses it when no API key is set.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            gcpProjectInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setGcpProjectInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                gcpProject:
                                                  gcpProjectInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved GCP project & re-checked configuration'
                                            )
                                          }
                                          placeholder="my-project-id"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          GCP location
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Region for Gemini Enterprise or Agent Platform.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            gcpLocationInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setGcpLocationInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                gcpLocation:
                                                  gcpLocationInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved GCP location'
                                            )
                                          }
                                          placeholder="us-central1"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <label className="block text-xs font-medium text-neutral-100">
                                          Binary path
                                        </label>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                          Custom ACP executable. Leave empty to select automatically.
                                        </p>
                                      </div>
                                      <div className="w-full sm:w-60 shrink-0">
                                        <input
                                          type="text"
                                          value={
                                            binaryPathInputs[
                                              selectedAgent.id
                                            ] ?? ''
                                          }
                                          onChange={(e) =>
                                            setBinaryPathInputs((prev) => ({
                                              ...prev,
                                              [selectedAgent.id]: e.target.value,
                                            }))
                                          }
                                          onBlur={() =>
                                            commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                binaryPath:
                                                  binaryPathInputs[
                                                    selectedAgent.id
                                                  ],
                                              },
                                              'Saved Antigravity binary path'
                                            )
                                          }
                                          placeholder="Automatic"
                                          className="w-full px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Environment Variables Section (Exact match to T3 Code `Environment -> Variables`) */}
                          {isSelectedCliAgent && (
                            <div
                              className={`pt-5 space-y-3 ${
                                !selectedAgent.enabled ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="text-sm font-semibold text-neutral-100">
                                Environment
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-medium text-neutral-100">
                                    Variables
                                  </div>
                                  <p className="text-xs text-neutral-400 mt-0.5">
                                    API keys, base URLs, and other per-instance CLI settings.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const currentVars =
                                      selectedAgent.environmentVars ?? [];
                                    const defaultKeyName =
                                      selectedAgent.driverKind === 'codex-cli'
                                        ? 'OPENAI_API_KEY'
                                        : selectedAgent.driverKind ===
                                            'claude-agent-cli'
                                          ? 'ANTHROPIC_API_KEY'
                                          : 'GEMINI_API_KEY';
                                    const nextName = currentVars.some(
                                      (v) => v.name === defaultKeyName
                                    )
                                      ? `CUSTOM_VAR_${currentVars.length + 1}`
                                      : defaultKeyName;
                                    await commitSelectedField({
                                      providerId: selectedAgent.id,
                                      environmentVars: [
                                        ...currentVars,
                                        {
                                          name: nextName,
                                          value: '',
                                          sensitive: true,
                                        },
                                      ],
                                    });
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-200 transition shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add variable</span>
                                </button>
                              </div>

                              {(selectedAgent.environmentVars?.length ?? 0) >
                                0 && (
                                <div className="space-y-2 pt-1">
                                  {selectedAgent.environmentVars!.map(
                                    (envVar, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 p-2 rounded-lg border border-neutral-800 bg-[#141418]"
                                      >
                                        <input
                                          type="text"
                                          value={envVar.name}
                                          onChange={async (e) => {
                                            const next = [
                                              ...(selectedAgent.environmentVars ??
                                                []),
                                            ];
                                            next[idx] = {
                                              ...next[idx],
                                              name: e.target.value,
                                            };
                                            await commitSelectedField({
                                              providerId: selectedAgent.id,
                                              environmentVars: next,
                                            });
                                          }}
                                          placeholder="VARIABLE_NAME"
                                          className="w-40 px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100"
                                        />
                                        <input
                                          type={
                                            envVar.sensitive
                                              ? 'password'
                                              : 'text'
                                          }
                                          value={envVar.value}
                                          onChange={async (e) => {
                                            const next = [
                                              ...(selectedAgent.environmentVars ??
                                                []),
                                            ];
                                            next[idx] = {
                                              ...next[idx],
                                              value: e.target.value,
                                            };
                                            await commitSelectedField({
                                              providerId: selectedAgent.id,
                                              environmentVars: next,
                                            });
                                          }}
                                          placeholder="value"
                                          className="flex-1 px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100"
                                        />
                                        <button
                                          type="button"
                                          title="Remove variable"
                                          onClick={async () => {
                                            const next = (
                                              selectedAgent.environmentVars ??
                                              []
                                            ).filter((_, i) => i !== idx);
                                            await commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                environmentVars: next,
                                              },
                                              'Removed environment variable'
                                            );
                                          }}
                                          className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Models Section (Exact match to T3 Code `Models` list with favorites, slugs, visibility switches & custom model adder) */}
                          <div
                            className={`pt-5 space-y-3 ${
                              !selectedAgent.enabled ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-neutral-100">
                                Models
                              </div>
                              <p className="text-xs text-neutral-400">
                                Model preferences and custom models are saved on the selected environment and shared across connected sessions.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <span className="text-xs text-neutral-400">
                                {selectedAgent.availableModels.length}{' '}
                                {selectedAgent.availableModels.length === 1
                                  ? 'model'
                                  : 'models'}
                                {(selectedAgent.favoriteModels?.length ?? 0) > 0
                                  ? ` · ${
                                      selectedAgent.favoriteModels!.length
                                    } favorite${
                                      selectedAgent.favoriteModels!.length === 1
                                        ? ''
                                        : 's'
                                    }`
                                  : ''}
                              </span>

                              {isSelectedCliAgent &&
                                selectedAgent.driverKind !==
                                  'antigravity-acp' &&
                                !showAddCustomModelInput && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowAddCustomModelInput(true)
                                    }
                                    className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-100 transition cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add custom model</span>
                                  </button>
                                )}
                            </div>

                            <div className="rounded-lg border border-neutral-800/80 divide-y divide-neutral-800/60 bg-[#121216] max-h-56 overflow-y-auto">
                              {selectedAgent.availableModels.map((m) => {
                                const isDefault =
                                  selectedAgent.defaultModel === m.id;
                                const isFav = (
                                  selectedAgent.favoriteModels ?? []
                                ).includes(m.id);
                                const isHidden = (
                                  selectedAgent.hiddenModels ?? []
                                ).includes(m.id);
                                const shownInPicker = !isHidden;

                                return (
                                  <div
                                    key={m.id}
                                    className={`flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-white/[0.025] ${
                                      isHidden ? 'opacity-50' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const favs = new Set(
                                            selectedAgent.favoriteModels ?? []
                                          );
                                          if (favs.has(m.id)) favs.delete(m.id);
                                          else favs.add(m.id);
                                          await commitSelectedField({
                                            providerId: selectedAgent.id,
                                            favoriteModels: Array.from(favs),
                                          });
                                        }}
                                        title={
                                          isFav
                                            ? 'Remove from favorites'
                                            : 'Add to favorites'
                                        }
                                        className="text-neutral-500 hover:text-amber-400 transition shrink-0"
                                      >
                                        <Star
                                          className={`w-3.5 h-3.5 ${
                                            isFav
                                              ? 'fill-amber-400 text-amber-400'
                                              : ''
                                          }`}
                                        />
                                      </button>
                                      <div className="flex items-baseline gap-2 min-w-0 truncate">
                                        <span className="text-xs font-medium text-neutral-100 truncate">
                                          {m.label}
                                        </span>
                                        {m.label !== m.id && (
                                          <code className="font-mono text-[11px] text-neutral-500 truncate">
                                            {m.id}
                                          </code>
                                        )}
                                        {m.isCustom && (
                                          <span className="text-[10px] text-neutral-500">
                                            custom
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                      {m.capabilities &&
                                        m.capabilities.length > 0 && (
                                          <span className="hidden sm:inline text-[11px] text-neutral-500">
                                            {m.capabilities.join(' · ')}
                                          </span>
                                        )}
                                      {isDefault ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                          Default
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            await commitSelectedField(
                                              {
                                                providerId: selectedAgent.id,
                                                defaultModel: m.id,
                                              },
                                              `Set ${m.label} as default model for ${selectedAgent.name}`
                                            );
                                          }}
                                          className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 border border-neutral-700 transition"
                                        >
                                          Set Default
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={shownInPicker}
                                        title={
                                          shownInPicker
                                            ? 'Shown in model picker'
                                            : 'Hidden from model picker'
                                        }
                                        onClick={async () => {
                                          const hid = new Set(
                                            selectedAgent.hiddenModels ?? []
                                          );
                                          if (hid.has(m.id)) hid.delete(m.id);
                                          else hid.add(m.id);
                                          await commitSelectedField({
                                            providerId: selectedAgent.id,
                                            hiddenModels: Array.from(hid),
                                          });
                                        }}
                                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                                          shownInPicker
                                            ? 'bg-blue-600'
                                            : 'bg-neutral-800 border border-neutral-700'
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-neutral-100 transition-transform ${
                                            shownInPicker
                                              ? 'translate-x-3.5'
                                              : 'translate-x-0.5'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {showAddCustomModelInput && (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={customModelInput}
                                  onChange={(e) =>
                                    setCustomModelInput(e.target.value)
                                  }
                                  placeholder={
                                    selectedAgent.driverKind === 'codex-cli'
                                      ? 'gpt-6.7-codex-ultra-preview'
                                      : 'claude-sonnet-5-5'
                                  }
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#141418] border border-neutral-800 text-xs font-mono text-neutral-100"
                                />
                                <button
                                  type="button"
                                  disabled={!customModelInput.trim()}
                                  onClick={async () => {
                                    const slug = customModelInput.trim();
                                    if (!slug) return;
                                    const existingCustom =
                                      selectedAgent.availableModels
                                        .filter((m) => m.isCustom)
                                        .map((m) => ({
                                          id: m.id,
                                          label: m.label,
                                        }));
                                    await commitSelectedField(
                                      {
                                        providerId: selectedAgent.id,
                                        defaultModel: slug,
                                        customModels: [
                                          ...existingCustom,
                                          { id: slug, label: slug },
                                        ],
                                      },
                                      `Added custom model ${slug} to ${selectedAgent.name}`
                                    );
                                    setCustomModelInput('');
                                    setShowAddCustomModelInput(false);
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-100 transition"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomModelInput('');
                                    setShowAddCustomModelInput(false);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Counsel & Peer-Review Role Assignment Section (Assigns Enabled Agent Providers + Models to the 4 Roles) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-100">
                          Counsel & Peer-Review Role Assignment
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Choose which enabled agent provider and model handles each role in your drafting and peer-review harness.
                        </p>
                      </div>
                    </div>

                    {/* Ancillary Model Advisories Banner */}
                    {ancillaryRegistry?.advisories &&
                      ancillaryRegistry.advisories.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-2">
                          {ancillaryRegistry.advisories.map((advisory) => (
                            <div
                              key={advisory.id}
                              className="flex flex-wrap items-start justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-amber-200">
                                    {advisory.roleTitle} Notice:{' '}
                                    <span className="font-normal text-amber-300/90">
                                      {advisory.message}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {advisory.suggestedAlternatives.length > 0 && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {advisory.suggestedAlternatives
                                    .slice(0, 2)
                                    .map((alt) => (
                                      <button
                                        key={`${alt.providerId}-${alt.modelId}`}
                                        onClick={async () => {
                                          if (onRepickAncillaryModel) {
                                            await onRepickAncillaryModel(
                                              advisory.role,
                                              alt.providerId,
                                              alt.modelId
                                            );
                                            flashSaved(
                                              `Selected ${alt.modelId} on ${alt.providerName} for ${advisory.roleTitle}`
                                            );
                                          }
                                        }}
                                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] text-amber-200 transition font-medium"
                                      >
                                        Switch to {alt.modelId} ({alt.providerName})
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-xl bg-[#0d0d10] border border-neutral-800">
                      {/* 1. Lead Counsel */}
                      <div className="p-3 rounded-lg bg-[#141418] border border-neutral-800 space-y-2">
                        <div className="text-xs font-semibold text-amber-300 flex items-center justify-between">
                          <span>1. Lead Counsel</span>
                          <span className="text-[10px] text-neutral-400 font-normal">
                            Primary
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-tight">
                          Primary agent & frontier model for drafting and analysis
                        </div>
                        <select
                          value={adversarialConfig.primaryProvider}
                          onChange={(e) => {
                            const prov = e.target.value as LLMProviderId;
                            const cat = providers.find((p) => p.id === prov);
                            onSaveAdversarialConfig({
                              primaryProvider: prov,
                              primaryModel:
                                cat?.defaultModel ||
                                cat?.availableModels[0]?.id ||
                                '',
                            });
                            flashSaved(
                              `Updated Lead Counsel Agent to ${cat?.name ?? prov}`
                            );
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                        >
                          {roleOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={adversarialConfig.primaryModel}
                          onChange={(e) => {
                            onSaveAdversarialConfig({
                              primaryModel: e.target.value,
                            });
                            flashSaved(
                              `Updated Lead Counsel Model to ${e.target.value}`
                            );
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200"
                        >
                          {getModelsForProvider(
                            adversarialConfig.primaryProvider,
                            adversarialConfig.primaryModel
                          ).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Economy Checker */}
                      <div className="p-3 rounded-lg bg-[#141418] border border-neutral-800 space-y-2">
                        <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
                          <span>2. Economy Checker</span>
                          <span className="text-[10px] text-neutral-400 font-normal">
                            Fast Triage
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-tight">
                          Fast agent model for Bluebook & citation formatting
                        </div>
                        <select
                          value={economyProv}
                          onChange={async (e) => {
                            const prov = e.target.value as LLMProviderId;
                            const cat = providers.find((p) => p.id === prov);
                            const defaultM =
                              cat?.availableModels.find((m) =>
                                /flash|haiku|mini/i.test(m.id)
                              )?.id ||
                              cat?.defaultModel ||
                              '';
                            if (onRepickAncillaryModel) {
                              await onRepickAncillaryModel(
                                'low_cost_economy',
                                prov,
                                defaultM
                              );
                            } else if (onSavePrivacyRoutingSettings) {
                              await onSavePrivacyRoutingSettings({
                                economyModelProvider: prov,
                                economyModel: defaultM,
                              });
                            }
                            flashSaved('Updated Economy Checker Agent');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                        >
                          {roleOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={economyModel}
                          onChange={async (e) => {
                            const newModel = e.target.value;
                            if (onRepickAncillaryModel) {
                              await onRepickAncillaryModel(
                                'low_cost_economy',
                                economyProv,
                                newModel
                              );
                            } else if (onSavePrivacyRoutingSettings) {
                              await onSavePrivacyRoutingSettings({
                                economyModel: newModel,
                              });
                            }
                            flashSaved(
                              `Updated Economy Checker Model to ${newModel}`
                            );
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200"
                        >
                          {getModelsForProvider(economyProv, economyModel).map(
                            (m) => (
                              <option key={m.id} value={m.id}>
                                {m.label} ({m.id})
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* 3. Citation Auditor */}
                      <div className="p-3 rounded-lg bg-[#141418] border border-neutral-800 space-y-2">
                        <div className="text-xs font-semibold text-emerald-300 flex items-center justify-between">
                          <span>3. Citation Auditor</span>
                          <span className="text-[10px] text-neutral-400 font-normal">
                            Reviewer #1
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-tight">
                          Audits caselaw pinpoints & discovery Bates records
                        </div>
                        <select
                          value={adversarialConfig.citationAuditorProvider}
                          onChange={(e) => {
                            const prov = e.target.value as LLMProviderId;
                            const cat = providers.find((p) => p.id === prov);
                            onSaveAdversarialConfig({
                              citationAuditorProvider: prov,
                              citationAuditorModel:
                                cat?.defaultModel ||
                                cat?.availableModels[0]?.id ||
                                '',
                            });
                            flashSaved('Updated Citation Auditor Agent');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                        >
                          {roleOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={adversarialConfig.citationAuditorModel}
                          onChange={(e) => {
                            onSaveAdversarialConfig({
                              citationAuditorModel: e.target.value,
                            });
                            flashSaved(
                              `Updated Citation Auditor Model to ${e.target.value}`
                            );
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200"
                        >
                          {getModelsForProvider(
                            adversarialConfig.citationAuditorProvider,
                            adversarialConfig.citationAuditorModel
                          ).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. Opposing Critic */}
                      <div className="p-3 rounded-lg bg-[#141418] border border-neutral-800 space-y-2">
                        <div className="text-xs font-semibold text-rose-300 flex items-center justify-between">
                          <span>4. Opposing Critic</span>
                          <span className="text-[10px] text-neutral-400 font-normal">
                            Reviewer #2
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-tight">
                          Stress-tests legal theories & finds procedural gaps
                        </div>
                        <select
                          value={adversarialConfig.opposingCounselProvider}
                          onChange={(e) => {
                            const prov = e.target.value as LLMProviderId;
                            const cat = providers.find((p) => p.id === prov);
                            onSaveAdversarialConfig({
                              opposingCounselProvider: prov,
                              opposingCounselModel:
                                cat?.defaultModel ||
                                cat?.availableModels[0]?.id ||
                                '',
                            });
                            flashSaved('Updated Opposing Critic Agent');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                        >
                          {roleOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={adversarialConfig.opposingCounselModel}
                          onChange={(e) => {
                            onSaveAdversarialConfig({
                              opposingCounselModel: e.target.value,
                            });
                            flashSaved(
                              `Updated Opposing Critic Model to ${e.target.value}`
                            );
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200"
                        >
                          {getModelsForProvider(
                            adversarialConfig.opposingCounselProvider,
                            adversarialConfig.opposingCounselModel
                          ).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* T3 Code `Add provider` Dialog (`AddProviderInstanceDialog` replica) */}
                  {showAddProviderDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#141418] p-6 text-neutral-100 shadow-2xl space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-neutral-100">
                              Add provider
                            </h3>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              Add an account or configure another agent provider instance on this machine.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddProviderDialog(false)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Step 1: Choose Provider Driver */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-neutral-200">
                            Provider
                          </label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {(
                              [
                                {
                                  driverKind: 'codex-cli' as const,
                                  label: 'Codex',
                                },
                                {
                                  driverKind: 'claude-agent-cli' as const,
                                  label: 'Claude',
                                },
                                {
                                  driverKind: 'antigravity-acp' as const,
                                  label: 'Antigravity',
                                },
                              ] as const
                            ).map((opt) => {
                              const active =
                                newProviderDriver === opt.driverKind;
                              return (
                                <button
                                  key={opt.driverKind}
                                  type="button"
                                  onClick={() =>
                                    setNewProviderDriver(opt.driverKind)
                                  }
                                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition cursor-pointer ${
                                    active
                                      ? 'border-blue-500 bg-blue-500/15 text-neutral-100'
                                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <ProviderBrandIcon
                                      driverKind={opt.driverKind}
                                      sizeClass="w-4 h-4"
                                    />
                                    <span className="text-xs font-medium truncate">
                                      {opt.label}
                                    </span>
                                  </div>
                                  {active && (
                                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                      <Check className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Identity & Runtime Fields */}
                        <div className="space-y-3 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <label className="block font-medium text-neutral-200">
                                Label
                              </label>
                              <span className="text-[11px] text-neutral-400">
                                Shown in the provider list (e.g. Antigravity (personal)).
                              </span>
                            </div>
                            <input
                              type="text"
                              autoFocus
                              value={newProviderLabel}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewProviderLabel(val);
                                const slug = val
                                  .trim()
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, '_')
                                  .replace(/^_+|_+$/g, '');
                                const prefix =
                                  newProviderDriver === 'codex-cli'
                                    ? 'codex'
                                    : newProviderDriver === 'claude-agent-cli'
                                      ? 'claude'
                                      : 'antigravity';
                                setNewProviderInstanceId(
                                  slug ? `${prefix}_${slug}` : ''
                                );
                                if (
                                  newProviderDriver === 'codex-cli' &&
                                  !newProviderShadowPath
                                ) {
                                  setNewProviderShadowPath(
                                    slug ? `~/.codex-t3/${slug}` : ''
                                  );
                                }
                              }}
                              placeholder={
                                newProviderDriver === 'antigravity-acp'
                                  ? 'Antigravity (personal)'
                                  : newProviderDriver === 'codex-cli'
                                    ? 'Codex (work)'
                                    : 'Claude (team)'
                              }
                              className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <label className="block font-medium text-neutral-200">
                                Instance ID
                              </label>
                              <span className="text-[11px] text-neutral-400">
                                Letters, digits, &apos;-&apos;, or &apos;_&apos;.
                              </span>
                            </div>
                            <input
                              type="text"
                              value={newProviderInstanceId}
                              onChange={(e) =>
                                setNewProviderInstanceId(e.target.value)
                              }
                              placeholder={
                                newProviderDriver === 'antigravity-acp'
                                  ? 'antigravity_personal'
                                  : newProviderDriver === 'codex-cli'
                                    ? 'codex_work'
                                    : 'claude_team'
                              }
                              className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100"
                            />
                          </div>

                          {newProviderDriver === 'codex-cli' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <label className="block font-medium text-neutral-200">
                                  Shadow home path
                                </label>
                                <span className="text-[11px] text-neutral-400">
                                  Account-specific Codex home keeping auth.json separate.
                                </span>
                              </div>
                              <input
                                type="text"
                                value={newProviderShadowPath}
                                onChange={(e) =>
                                  setNewProviderShadowPath(e.target.value)
                                }
                                placeholder="~/.codex-t3/personal"
                                className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100"
                              />
                            </div>
                          )}

                          {newProviderDriver === 'claude-agent-cli' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <label className="block font-medium text-neutral-200">
                                  CLAUDE_CONFIG_DIR path
                                </label>
                                <span className="text-[11px] text-neutral-400">
                                  Custom Claude config directory for this instance.
                                </span>
                              </div>
                              <input
                                type="text"
                                value={newProviderHomePath}
                                onChange={(e) =>
                                  setNewProviderHomePath(e.target.value)
                                }
                                placeholder="~/.claude-work"
                                className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100"
                              />
                            </div>
                          )}

                          {newProviderDriver === 'antigravity-acp' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <label className="block font-medium text-neutral-200">
                                  Sign-in method
                                </label>
                                <span className="text-[11px] text-neutral-400">
                                  Google account, Gemini Enterprise, or API key.
                                </span>
                              </div>
                              <select
                                value={newProviderAuthMethod}
                                onChange={(e) =>
                                  setNewProviderAuthMethod(
                                    e.target.value as AntigravityAuthMethod
                                  )
                                }
                                className="w-full sm:w-60 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100"
                              >
                                <option value="oauth-personal">
                                  Google account
                                </option>
                                <option value="oauth-business">
                                  Gemini Enterprise
                                </option>
                                <option value="gemini-api-key">
                                  Gemini API key
                                </option>
                                <option value="agent-platform">
                                  Agent Platform (Vertex AI)
                                </option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                          <button
                            type="button"
                            onClick={() => setShowAddProviderDialog(false)}
                            className="px-3.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-800 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isCreatingProvider}
                            onClick={async () => {
                              if (!onAddProviderInstance) return;
                              setIsCreatingProvider(true);
                              try {
                                const defaultBaseName =
                                  newProviderDriver === 'codex-cli'
                                    ? 'Codex'
                                    : newProviderDriver === 'claude-agent-cli'
                                      ? 'Claude'
                                      : 'Antigravity';
                                const label =
                                  newProviderLabel.trim() ||
                                  `${defaultBaseName} (custom)`;
                                const createdId = await onAddProviderInstance({
                                  driverKind: newProviderDriver,
                                  name: label,
                                  instanceId:
                                    newProviderInstanceId.trim() || undefined,
                                  accentColor:
                                    newProviderAccentColor || undefined,
                                  homePath:
                                    newProviderHomePath.trim() || undefined,
                                  shadowHomePath:
                                    newProviderShadowPath.trim() || undefined,
                                  authMethod: newProviderAuthMethod,
                                });
                                if (createdId) {
                                  setSelectedAgentId(createdId);
                                }
                                setShowAddProviderDialog(false);
                                flashSaved(
                                  `Added provider instance "${label}"`
                                );
                              } finally {
                                setIsCreatingProvider(false);
                              }
                            }}
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                          >
                            {isCreatingProvider ? 'Adding...' : 'Add instance'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === 'legal_mcp' && (() => {
              const syncStatuses =
                courtListenerAssurance?.agentSyncStatuses ?? [];
              const chosenAgents = syncStatuses.filter(
                (s) => s.enabled || s.isChosenForRole
              );
              const anyOutOfSync = chosenAgents.some((s) => !s.inSync);

              return (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        <Server className="w-4 h-4 text-amber-400" />
                        <span>MCP Setup</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Configure Model Context Protocol (MCP) legal research servers and verify that every listed MCP tool is registered in the runtime configuration of the agents chosen in Agent Setup.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isInstallingDriver !== null}
                      onClick={async () => {
                        setIsInstallingDriver('all');
                        try {
                          await onInstallCourtListenerOnDefaultAgent?.('all');
                          flashSaved(
                            'Synced all MCP tools across all chosen & enabled agents'
                          );
                        } finally {
                          setIsInstallingDriver(null);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isInstallingDriver === 'all' ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Sync MCP Tools to Chosen Agents</span>
                    </button>
                  </div>

                  {/* Card 1: Per-Agent MCP Tool Configuration Verification (Chosen Agents from Agent Setup) */}
                  <div
                    id="tour-settings-mcp-panel"
                    className="p-4 rounded-xl bg-[#0d0d10] border border-neutral-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-neutral-100">
                          Chosen Agents MCP Configuration Status
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Verifies that CourtListener MCP and all enabled custom MCP tools below are configured in each chosen agent&apos;s config file.
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                          !anyOutOfSync && chosenAgents.length > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {!anyOutOfSync && chosenAgents.length > 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              All {chosenAgents.length} Chosen Agents Configured
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Sync Needed</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="divide-y divide-neutral-800/80 rounded-lg border border-neutral-800 bg-[#121216]">
                      {(chosenAgents.length > 0 ? chosenAgents : syncStatuses).map(
                        (st) => {
                          const driverKind: ProviderDriverKind =
                            st.driver === 'codex'
                              ? 'codex-cli'
                              : st.driver === 'claudeAgent'
                                ? 'claude-agent-cli'
                                : 'antigravity-acp';
                          return (
                            <div
                              key={st.instanceId}
                              className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <ProviderBrandIcon
                                  driverKind={driverKind}
                                  sizeClass="w-4 h-4"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-medium text-neutral-100">
                                      {st.displayName}
                                    </span>
                                    {st.roles.map((role) => (
                                      <span
                                        key={role}
                                        className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] text-amber-300 font-medium"
                                      >
                                        {role}
                                      </span>
                                    ))}
                                    {!st.enabled && (
                                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                                        Disabled in Agent Setup
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
                                    Config: {st.configPath}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {st.inSync ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
                                    <Check className="w-3 h-3" />
                                    <span>
                                      {1 + st.customServersConfigured.length} MCP{' '}
                                      {1 + st.customServersConfigured.length === 1
                                        ? 'tool'
                                        : 'tools'}{' '}
                                      configured
                                    </span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setIsInstallingDriver(st.driver);
                                      try {
                                        await onInstallCourtListenerOnDefaultAgent?.(
                                          st.driver
                                        );
                                        flashSaved(
                                          `Configured MCP tools on ${st.displayName}`
                                        );
                                      } finally {
                                        setIsInstallingDriver(null);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] text-amber-200 font-medium transition"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    <span>
                                      Missing: {st.missingServers.join(', ')} · Click to Fix
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>

                {/* CourtListener API Token / Free Account Section */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        CourtListener API Authentication (Optional Free Tier)
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        CourtListener MCP works out-of-the-box with open search access. Registering a free API token raises query rate limits and enables federal RECAP/PACER document retrieval.
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenExternalUrl?.(courtListenerAssurance?.signupUrl || 'https://www.courtlistener.com/sign-in/')}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      Get Free API Token
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={mcpTokenInput}
                      onChange={(e) => setMcpTokenInput(e.target.value)}
                      placeholder={
                        courtListenerAssurance?.maskedAuthToken
                          ? `Configured: ${courtListenerAssurance.maskedAuthToken}`
                          : 'Paste CourtListener API token (optional)'
                      }
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={async () => {
                        if (!mcpTokenInput.trim()) return;
                        setIsSavingMcpToken(true);
                        try {
                          await onSaveCourtListenerToken?.(mcpTokenInput.trim());
                          setMcpTokenInput('');
                          flashSaved('CourtListener API token saved and injected into agent runtime configs');
                        } finally {
                          setIsSavingMcpToken(false);
                        }
                      }}
                      disabled={isSavingMcpToken || !mcpTokenInput.trim()}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition shrink-0"
                    >
                      {isSavingMcpToken ? 'Saving...' : 'Save Token'}
                    </button>
                  </div>
                </div>

                {/* Configured MCP Servers List & Custom Additions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        Active Legal MCP Servers
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        MCP servers managed across your attorney workspace and injected into agent prompts.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddCustomMcp(!showAddCustomMcp)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-medium text-xs flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Legal MCP Server
                    </button>
                  </div>

                  {/* Add Custom MCP Form */}
                  {showAddCustomMcp && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-amber-300">
                          Add Custom Legal MCP Server
                        </div>
                        <button
                          onClick={() => setShowAddCustomMcp(false)}
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Templates */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-medium text-slate-400">
                          Or quick-fill preset template:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setCustomServerId('recap-pacer');
                              setCustomServerName('RECAP Federal Dockets');
                              setCustomServerDesc('Automated docket lookup and RECAP document archive retrieval');
                              setCustomServerCommand('npx');
                              setCustomServerArgs('-y courtlistener-mcp --dockets');
                              setCustomServerTargetDriver('all');
                            }}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition"
                          >
                            RECAP / PACER Dockets
                          </button>
                          <button
                            onClick={() => {
                              setCustomServerId('sec-edgar');
                              setCustomServerName('SEC EDGAR Filings');
                              setCustomServerDesc('Public company 10-K, 10-Q, and 8-K filings retrieval via MCP');
                              setCustomServerCommand('npx');
                              setCustomServerArgs('-y sec-edgar-mcp');
                              setCustomServerTargetDriver('all');
                            }}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition"
                          >
                            SEC EDGAR Filings
                          </button>
                          <button
                            onClick={() => {
                              setCustomServerId('harvard-cap');
                              setCustomServerName('Harvard Caselaw Access Project');
                              setCustomServerDesc('Historical US caselaw archive from Harvard Law Library');
                              setCustomServerCommand('npx');
                              setCustomServerArgs('-y harvard-cap-mcp');
                              setCustomServerTargetDriver('all');
                            }}
                            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] transition"
                          >
                            Harvard CAP
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 mb-1">Server ID (slug)</label>
                          <input
                            type="text"
                            value={customServerId}
                            onChange={(e) => setCustomServerId(e.target.value)}
                            placeholder="e.g. sec-edgar"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1">Display Name</label>
                          <input
                            type="text"
                            value={customServerName}
                            onChange={(e) => setCustomServerName(e.target.value)}
                            placeholder="e.g. SEC EDGAR Search"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="block text-slate-300 mb-1">Description</label>
                        <input
                          type="text"
                          value={customServerDesc}
                          onChange={(e) => setCustomServerDesc(e.target.value)}
                          placeholder="Brief description of the legal research tools provided"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 mb-1">Command</label>
                          <input
                            type="text"
                            value={customServerCommand}
                            onChange={(e) => setCustomServerCommand(e.target.value)}
                            placeholder="npx or python3"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-slate-300 mb-1">Arguments</label>
                          <input
                            type="text"
                            value={customServerArgs}
                            onChange={(e) => setCustomServerArgs(e.target.value)}
                            placeholder="-y package-name --flag"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-300 mb-1">Target Client</label>
                          <select
                            value={customServerTargetDriver}
                            onChange={(e) => setCustomServerTargetDriver(e.target.value as any)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                          >
                            <option value="all">All Enabled Clients</option>
                            <option value="codex">OpenAI Codex (~/.codex/config.toml)</option>
                            <option value="claudeAgent">Claude Code (~/.claude.json)</option>
                            <option value="antigravity">Antigravity ACP (Skills)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1">Environment (KEY=VAL)</label>
                          <input
                            type="text"
                            value={customServerEnv}
                            onChange={(e) => setCustomServerEnv(e.target.value)}
                            placeholder="API_KEY=xxx,DEBUG=true"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setShowAddCustomMcp(false)}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!customServerId.trim() || !customServerCommand.trim()) return;
                            setIsSavingCustomServer(true);
                            try {
                              const envObj: Record<string, string> = {};
                              if (customServerEnv.trim()) {
                                for (const pair of customServerEnv.split(',')) {
                                  const [k, v] = pair.split('=');
                                  if (k && v) envObj[k.trim()] = v.trim();
                                }
                              }
                              const argsArray = customServerArgs.trim()
                                ? customServerArgs.trim().split(/\s+/)
                                : [];
                              await onSaveCustomMcpServer?.({
                                id: customServerId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                                name: customServerName.trim() || customServerId.trim(),
                                description: customServerDesc.trim() || 'Custom Legal MCP Server',
                                command: customServerCommand.trim(),
                                args: argsArray,
                                env: envObj,
                                targetDriver: customServerTargetDriver,
                                enabled: true,
                                createdAt: new Date().toISOString(),
                              });
                              setShowAddCustomMcp(false);
                              setCustomServerId('');
                              setCustomServerName('');
                              setCustomServerDesc('');
                              setCustomServerArgs('');
                              setCustomServerEnv('');
                              flashSaved('Custom legal MCP server configured and installed');
                            } finally {
                              setIsSavingCustomServer(false);
                            }
                          }}
                          disabled={isSavingCustomServer || !customServerId.trim() || !customServerCommand.trim()}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition"
                        >
                          {isSavingCustomServer ? 'Registering...' : 'Save & Configure'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of active servers */}
                  <div className="space-y-2">
                    {/* Core Server: CourtListener */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-100">
                            CourtListener Legal Search (Core Base)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                            Core Base
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Pre-configured legal citation verification & case retrieval toolset
                        </p>
                        <div className="font-mono text-[10px] text-slate-400">
                          Command: <span className="text-slate-300">npx -y courtlistener-mcp</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] font-medium text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Configured on Chosen Agents
                        </span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {(chosenAgents.length > 0 ? chosenAgents : syncStatuses)
                            .filter((s) => s.courtListenerConfigured)
                            .map((s) => (
                              <span
                                key={s.instanceId}
                                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-amber-300"
                              >
                                {s.displayName}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Custom MCP servers */}
                    {customMcpServers.map((server) => (
                      <div
                        key={server.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100">
                              {server.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {server.targetDriver === 'all'
                                ? 'All Chosen Agents'
                                : server.targetDriver === 'codex'
                                ? 'Codex'
                                : server.targetDriver === 'claudeAgent'
                                ? 'Claude'
                                : 'Antigravity'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {server.description}
                          </p>
                          <div className="font-mono text-[10px] text-slate-400">
                            Command: <span className="text-slate-300">{server.command} {server.args.join(' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await onDeleteCustomMcpServer?.(server.id);
                              flashSaved(`Removed MCP server ${server.name}`);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete custom MCP server"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              );
            })()}

            {activeTab === 'privacy_routing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Embedded Privacy Model Router & PII Gateway</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Embedded ONNX runtime strips confidential client identifiers and dockets before cloud dispatch,
                    triages queries to economy models to save up to 85% in API costs, and restores real names locally.
                  </p>
                </div>

                {/* Routing Policy Mode Selection Cards */}
                <div id="tour-settings-privacy-panel" className="space-y-3">
                  <div className="text-xs font-semibold text-slate-200">
                    Routing Policy Mode (Always-On Default)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => onSavePrivacyRoutingSettings?.({ policyMode: 'smart_routing' })}
                      className={`p-4 rounded-xl border text-left transition ${
                        (privacyRoutingSettings?.policyMode ?? 'smart_routing') === 'smart_routing'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-300">
                          Dynamic Smart Routing
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Embedded ONNX classifier evaluates legal complexity. Routes single-statute and citation queries to economy models (~75% savings) and escalates constitutional motions to frontier models.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSavePrivacyRoutingSettings?.({ policyMode: 'force_frontier' })}
                      className={`p-4 rounded-xl border text-left transition ${
                        privacyRoutingSettings?.policyMode === 'force_frontier'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-indigo-300">
                          Force Frontier Reasoning
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Bypasses economy tier, dispatching all queries directly to top frontier models while retaining full local PII scrubbing, Bates protection, and reversible pseudonymization.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSavePrivacyRoutingSettings?.({ policyMode: 'local_only_airgapped' })}
                      className={`p-4 rounded-xl border text-left transition ${
                        privacyRoutingSettings?.policyMode === 'local_only_airgapped'
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-cyan-300">
                          Strict Local-Only (Air-Gapped)
                        </span>
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Completely disables external API/cloud network calls. Fulfills drafting and review strictly on-device using local matter corpus and embedded engine.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Governance Toggles */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="text-xs font-semibold text-slate-200">
                    Decision Telemetry & Compliance Controls
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyRoutingSettings?.debugModeEnabled ?? false}
                        onChange={(e) =>
                          onSavePrivacyRoutingSettings?.({ debugModeEnabled: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          Routing Decision Debug Mode (Inspector Drawer)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Surfaces real-time decision logits, ONNX complexity scores, scrubbed PII audits, and cost savings telemetry directly below the prompt composer. Shortcut: Cmd+Shift+D.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacyRoutingSettings?.preDispatchReviewEnabled ?? false}
                        onChange={(e) =>
                          onSavePrivacyRoutingSettings?.({ preDispatchReviewEnabled: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          Pre-Dispatch Review Gate
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Requires explicit attorney confirmation of the scrubbed payload and pseudonym table before transmitting tokens outside the local machine.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Audit Bundle Export Section */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Audit Telemetry Export & Compliance Verification
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Export a sanitized diagnostic bundle of routing decisions and PII masking audits to verify ethics compliance or submit diagnostic reports.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onExportRoutingLogs}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Export Audit (JSON)</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClearRoutingLogs}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 border border-slate-700 text-slate-400 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Log</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'live_preview' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Assembled Instructions & Context ({assembledPromptPreview.profileName} • {assembledPromptPreview.matterName})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Complete instruction context assembled from Core Principles, Practice Task, Matter Rules, and Legal Research Tools.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-300">
                    Assembled Drafting Instructions (Core Principles + Practice Task + Matter Rules + Research Tools)
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                    {assembledPromptPreview.primarySystemPrompt}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-300">
                      Reviewer #1 Instructions (Citation & Record Auditor)
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                      {assembledPromptPreview.citationAuditorSystemPrompt}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-rose-300">
                      Reviewer #2 Instructions (Opposing Perspective / Counterarguments)
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                      {assembledPromptPreview.opposingCounselSystemPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tutorial_tour' && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-100">
                          Tour & Sample Case
                        </h3>
                        <p className="text-xs text-slate-400">
                          Walkthrough of the LexHarness drafting and review workflow.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onStartTutorial?.();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-lg transition active:scale-95 cursor-pointer"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Start Tour</span>
                    </button>
                  </div>
                </div>

                {/* Sample Casework Management Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Tutorial Sample Casework
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isSampleCaseLoaded
                          ? 'Active: John Doe v. State of Vermont (Docket 25-CR-00123) is currently loaded.'
                          : 'John Doe sample casework is not currently loaded in your workspace.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSampleCaseLoaded ? (
                        <button
                          onClick={async () => {
                            await onLoadSampleCase?.();
                            flashSaved('Loaded Sample Case: John Doe v. State of Vermont');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition cursor-pointer"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Load Sample Case</span>
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await onCloseSampleCase?.();
                            flashSaved('Closed Sample Case and returned to previous matter');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Close Sample Case</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workflow Architecture Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Step 1 */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px]">
                        1
                      </span>
                      <span>Repurposing Coding Agents for Law</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Chatbots generate single-pass replies from memory. Coding agents (OpenAI Codex, Claude Code, Antigravity) are built for multi-step task work—searching files, verifying citations, and revising drafts.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px]">
                        2
                      </span>
                      <span>Practitioner Profiles & System Prompts</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Layered system prompts supply forum standards and ethical guardrails. Defaults currently include Vermont Criminal Defense and General Legal Practice, with profiles for many more locales and practice types coming soon.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px]">
                        3
                      </span>
                      <span>Bates Discovery & Parallel Peer Review</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Agents query indexed discovery exhibits by Bates stamp while the Citation & Record Auditor and Opposing Counsel reviewers audit every draft in parallel before delivery.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px]">
                        4
                      </span>
                      <span>Case Issues, Master Brief & Word Redlines</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Branch focused Case Issues, synthesize them into a Master Brief, and export native Word (.docx) files with Tracked Changes and reviewer margin comments.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
