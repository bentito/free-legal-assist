import React, { useEffect, useState } from 'react';
import {
  AdversarialConfig,
  AssembledPromptPreview,
  CourtListenerMcpAssuranceState,
  CustomLegalMcpServer,
  LLMProviderId,
  Matter,
  PracticeAreaId,
  PracticeAreaPreset,
  PractitionerProfileId,
  ProviderConfig,
  SystemPromptSettings,
} from '../../shared/types';
import {
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Server,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';

export type StudioTab =
  | 'layer1_core'
  | 'layer2_practice'
  | 'layer3_jurisdiction'
  | 'layer4_critics'
  | 'providers_models'
  | 'legal_mcp'
  | 'live_preview';

interface PromptGovernanceModalProps {
  isOpen: boolean;
  initialTab?: StudioTab;
  onClose: () => void;
  promptSettings: SystemPromptSettings;
  adversarialConfig: AdversarialConfig;
  providers: ProviderConfig[];
  activeMatter: Matter;
  assembledPromptPreview: AssembledPromptPreview;
  courtListenerAssurance?: CourtListenerMcpAssuranceState;
  customMcpServers?: CustomLegalMcpServer[];
  onSelectPractitionerProfile: (profileId: PractitionerProfileId) => Promise<void>;
  onSavePromptSettings: (updated: Partial<SystemPromptSettings>) => Promise<void>;
  onResetPromptSettings: () => Promise<void>;
  onSaveAdversarialConfig: (updated: Partial<AdversarialConfig>) => Promise<void>;
  onSaveProviderCredential: (payload: {
    providerId: LLMProviderId;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    binaryPath?: string;
    customArgs?: string;
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    runtimeMode?: 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access';
  }) => Promise<void>;
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
}

export const PromptGovernanceModal: React.FC<PromptGovernanceModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  promptSettings,
  adversarialConfig,
  providers,
  activeMatter,
  assembledPromptPreview,
  courtListenerAssurance,
  customMcpServers = [],
  onSelectPractitionerProfile,
  onSavePromptSettings,
  onResetPromptSettings,
  onSaveAdversarialConfig,
  onSaveProviderCredential,
  onUpdateMatterJurisdiction,
  onSaveCourtListenerToken,
  onInstallCourtListenerOnDefaultAgent,
  onSaveCustomMcpServer,
  onDeleteCustomMcpServer,
  onOpenExternalUrl,
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
  const [jurisdiction, setJurisdiction] = useState(activeMatter.jurisdiction);
  const [citationStyle, setCitationStyle] = useState(activeMatter.citationStyle);
  const [matterPracticeArea, setMatterPracticeArea] = useState<PracticeAreaId>(
    activeMatter.practiceArea
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
    setJurisdiction(activeMatter.jurisdiction);
    setCitationStyle(activeMatter.citationStyle);
    setMatterPracticeArea(activeMatter.practiceArea);
  }, [activeMatter]);

  // Provider API key & CLI runtime inputs
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [baseUrlInputs, setBaseUrlInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.baseUrl || '']))
  );
  const [binaryPathInputs, setBinaryPathInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.binaryPath || '']))
  );
  const [effortInputs, setEffortInputs] = useState<
    Record<string, 'low' | 'medium' | 'high' | 'xhigh' | 'max'>
  >(
    Object.fromEntries(
      providers.map((p) => [p.id, p.reasoningEffort || 'medium'])
    )
  );
  const [runtimeModeInputs, setRuntimeModeInputs] = useState<
    Record<string, 'read-only' | 'approval-required' | 'auto-accept-edits' | 'full-access'>
  >(
    Object.fromEntries(
      providers.map((p) => [p.id, p.runtimeMode || 'read-only'])
    )
  );

  useEffect(() => {
    setBinaryPathInputs(
      Object.fromEntries(providers.map((p) => [p.id, p.binaryPath || '']))
    );
    setEffortInputs(
      Object.fromEntries(
        providers.map((p) => [p.id, p.reasoningEffort || 'medium'])
      )
    );
    setRuntimeModeInputs(
      Object.fromEntries(
        providers.map((p) => [p.id, p.runtimeMode || 'read-only'])
      )
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
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Practitioner Profile Selector Bar (1st: Vermont Criminal Defense Lawyer, 2nd: General Legal Practice) */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
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
                <div className="font-semibold">Layer 1: Core Legal Mandate</div>
                <div className="text-[10px] opacity-75">
                  Constitutional & Ethical Guardrails
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
              <Sparkles className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-semibold">Layer 2: Task Presets</div>
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
                <div className="font-semibold">Layer 3: Matter & Forum</div>
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

            <button
              onClick={() => setActiveTab('providers_models')}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                activeTab === 'providers_models'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-semibold">AI Agents & Models</div>
                <div className="text-[10px] opacity-75">
                  Codex, Claude, Models & API Keys
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
                  <span>Legal MCP Tools</span>
                  {courtListenerAssurance?.hasInstalledAgent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div className="text-[10px] opacity-75 truncate max-w-[170px]">
                  {courtListenerAssurance?.configuredAgentDisplayName
                    ? `Active on ${courtListenerAssurance.configuredAgentDisplayName}`
                    : 'CourtListener & Custom MCPs'}
                </div>
              </div>
            </button>

            <div className="mt-auto pt-3 border-t border-slate-800">
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
                  <div className="font-semibold">Live Assembled Prompt</div>
                  <div className="text-[10px] opacity-75">
                    Inspect Full Payload Sent to Models
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
                      Layer 1 — Core Legal Mandate ({activeProfile?.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Governs every turn for this Practitioner Profile. Enforces constitutional primacy, record pinpoint citations, and strict legal standards.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Layer 1 Prompt
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
                      Layer 2 — Task & Practice Area Presets ({activeProfile?.name})
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
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Layer 3 — Active Matter / Docket Jurisdiction & Citation Manual ({activeMatter.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Injected into both the Primary Legal Model and Adversarial Critics to enforce controlling forum law and citation style.
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
            )}

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

            {activeTab === 'providers_models' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Review Team Roles & API Credentials
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign models to Lead Drafting, Citation Auditing, and Opposing Review. API keys are encrypted securely on your device.
                  </p>
                </div>

                {/* Role Assignment Matrix */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-2">
                      1. Lead Counsel / Primary Drafter
                    </div>
                    <select
                      value={adversarialConfig.primaryProvider}
                      onChange={(e) => {
                        const prov = e.target.value as LLMProviderId;
                        const cat = providers.find((p) => p.id === prov);
                        onSaveAdversarialConfig({
                          primaryProvider: prov,
                          primaryModel: cat?.defaultModel || '',
                        });
                        flashSaved('Updated Lead Drafter Model');
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 mb-2"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={adversarialConfig.primaryModel}
                      onChange={(e) =>
                        onSaveAdversarialConfig({ primaryModel: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-emerald-300 mb-2">
                      2. Citation & Record Auditor
                    </div>
                    <select
                      value={adversarialConfig.citationAuditorProvider}
                      onChange={(e) => {
                        const prov = e.target.value as LLMProviderId;
                        const cat = providers.find((p) => p.id === prov);
                        onSaveAdversarialConfig({
                          citationAuditorProvider: prov,
                          citationAuditorModel: cat?.defaultModel || '',
                        });
                        flashSaved('Updated Citation Auditor Model');
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 mb-2"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={adversarialConfig.citationAuditorModel}
                      onChange={(e) =>
                        onSaveAdversarialConfig({
                          citationAuditorModel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-rose-300 mb-2">
                      3. Opposing Counsel / Judicial Perspective
                    </div>
                    <select
                      value={adversarialConfig.opposingCounselProvider}
                      onChange={(e) => {
                        const prov = e.target.value as LLMProviderId;
                        const cat = providers.find((p) => p.id === prov);
                        onSaveAdversarialConfig({
                          opposingCounselProvider: prov,
                          opposingCounselModel: cat?.defaultModel || '',
                        });
                        flashSaved('Updated Opposing Review Model');
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 mb-2"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={adversarialConfig.opposingCounselModel}
                      onChange={(e) =>
                        onSaveAdversarialConfig({
                          opposingCounselModel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300"
                    />
                  </div>
                </div>

                {/* Provider & Agent CLI Harness List */}
                <div className="space-y-3">
                  {providers.map((prov) => {
                    const isCliHarness =
                      prov.id === 'agy-acp' ||
                      prov.id === 'codex-cli' ||
                      prov.id === 'claude-cli';

                    return (
                      <div
                        key={prov.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-100">
                                {prov.name}
                              </span>
                              {isCliHarness && (
                                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  T3 CLI Driver: {prov.driverKind}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                                  prov.hasApiKey
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {prov.hasApiKey
                                  ? `Ready (${prov.maskedApiKey})`
                                  : isCliHarness
                                    ? prov.runtimeStatus?.installed
                                      ? `Installed (${prov.runtimeStatus.authLabel})`
                                      : 'CLI Binary Not Detected (Fallback Active)'
                                    : 'Using Local Legal Test Fallback'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {prov.description}
                            </p>
                            {isCliHarness && prov.runtimeStatus && (
                              <div className="text-[10px] font-mono text-slate-500 mt-1">
                                {prov.runtimeStatus.statusDetail}
                              </div>
                            )}
                          </div>

                          {prov.id !== 'legal-simulator' && !isCliHarness && (
                            <div className="flex items-center gap-2 shrink-0">
                              {prov.id === 'openrouter' && (
                                <input
                                  type="text"
                                  value={baseUrlInputs[prov.id] ?? ''}
                                  onChange={(e) =>
                                    setBaseUrlInputs((prev) => ({
                                      ...prev,
                                      [prov.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Base URL"
                                  className="w-44 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                                />
                              )}
                              <input
                                type="password"
                                value={apiKeyInputs[prov.id] ?? ''}
                                onChange={(e) =>
                                  setApiKeyInputs((prev) => ({
                                    ...prev,
                                    [prov.id]: e.target.value,
                                  }))
                                }
                                placeholder={
                                  prov.hasApiKey
                                    ? 'Replace API Key...'
                                    : 'Enter API Key (sk-...)'
                                }
                                className="w-56 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                              />
                              <button
                                onClick={async () => {
                                  await onSaveProviderCredential({
                                    providerId: prov.id,
                                    apiKey: apiKeyInputs[prov.id],
                                    baseUrl: baseUrlInputs[prov.id],
                                  });
                                  setApiKeyInputs((prev) => ({
                                    ...prev,
                                    [prov.id]: '',
                                  }));
                                  flashSaved(
                                    `Saved encrypted key for ${prov.name}`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                              >
                                Save Key
                              </button>
                            </div>
                          )}
                        </div>

                        {isCliHarness && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Binary / ACP Executable Path (Auto-detected or Custom Override)
                              </label>
                              <input
                                type="text"
                                value={binaryPathInputs[prov.id] ?? ''}
                                onChange={(e) =>
                                  setBinaryPathInputs((prev) => ({
                                    ...prev,
                                    [prov.id]: e.target.value,
                                  }))
                                }
                                placeholder={
                                  prov.id === 'agy-acp'
                                    ? '/opt/homebrew/bin/agy or ~/.t3/tools/antigravity-acp/.../agy_acp_server.par'
                                    : prov.id === 'codex-cli'
                                      ? '/opt/homebrew/bin/codex'
                                      : 'claude or C:\\Users\\...\\claude.exe'
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Reasoning / Thinking Effort
                              </label>
                              <select
                                value={effortInputs[prov.id] ?? 'medium'}
                                onChange={(e) =>
                                  setEffortInputs((prev) => ({
                                    ...prev,
                                    [prov.id]: e.target.value as
                                      | 'low'
                                      | 'medium'
                                      | 'high'
                                      | 'xhigh'
                                      | 'max',
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                              >
                                <option value="low">low</option>
                                <option value="medium">medium (Default)</option>
                                <option value="high">high</option>
                                <option value="xhigh">xhigh</option>
                                <option value="max">max</option>
                              </select>
                            </div>

                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] text-slate-400 mb-1">
                                  Sandbox / Runtime Mode
                                </label>
                                <select
                                  value={runtimeModeInputs[prov.id] ?? 'read-only'}
                                  onChange={(e) =>
                                    setRuntimeModeInputs((prev) => ({
                                      ...prev,
                                      [prov.id]: e.target.value as
                                        | 'read-only'
                                        | 'approval-required'
                                        | 'auto-accept-edits'
                                        | 'full-access',
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                                >
                                  <option value="read-only">read-only</option>
                                  <option value="approval-required">
                                    approval-required
                                  </option>
                                  <option value="auto-accept-edits">
                                    auto-accept-edits
                                  </option>
                                  <option value="full-access">full-access</option>
                                </select>
                              </div>
                              <button
                                onClick={async () => {
                                  await onSaveProviderCredential({
                                    providerId: prov.id,
                                    binaryPath: binaryPathInputs[prov.id],
                                    reasoningEffort: effortInputs[prov.id],
                                    runtimeMode: runtimeModeInputs[prov.id],
                                  });
                                  flashSaved(`Updated CLI config for ${prov.name}`);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shrink-0"
                              >
                                Save Agent Config
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'legal_mcp' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    Legal Research Tools (CourtListener MCP)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Legal research tools connect directly to your local AI agents (OpenAI Codex, Claude Code, Antigravity ACP). LexHarness ensures at least one active agent is equipped with live legal research capabilities.
                  </p>
                </div>

                {/* Assurance & Hosting Client Card */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-emerald-400" />
                        Base Legal Research Tool: CourtListener MCP
                      </div>
                      <p className="text-xs text-slate-400">
                        Provides authoritative federal & state case law search, citation verification, and docket lookups directly to attorney agent loops.
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        courtListenerAssurance?.hasInstalledAgent
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {courtListenerAssurance?.hasInstalledAgent
                        ? 'Configured in Active Client'
                        : 'Setup Required'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="text-[11px] text-slate-400 font-medium">
                      Currently Hosting Client:
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-amber-300 font-mono">
                        {courtListenerAssurance?.configuredAgentDisplayName || 'None (Automatic default will install)'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 mr-1">Active on:</span>
                        {(courtListenerAssurance?.installedDrivers || []).length > 0 ? (
                          (courtListenerAssurance?.installedDrivers || []).map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 border border-emerald-700/60 text-emerald-300"
                            >
                              {d === 'codex' ? 'Codex CLI' : d === 'claudeAgent' ? 'Claude Code' : 'Antigravity'}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">No agent clients configured</span>
                        )}
                      </div>
                    </div>
                    {courtListenerAssurance?.statusDetail && (
                      <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
                        {courtListenerAssurance.statusDetail}
                      </div>
                    )}
                  </div>

                  {/* Switch / Change Hosting Client */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-xs font-medium text-slate-300">
                      Switch or Extend Toolset to Other Clients:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={async () => {
                          setIsInstallingDriver('codex');
                          try {
                            await onInstallCourtListenerOnDefaultAgent?.('codex');
                            flashSaved('Configured CourtListener MCP on OpenAI Codex CLI (~/.codex/config.toml)');
                          } finally {
                            setIsInstallingDriver(null);
                          }
                        }}
                        disabled={isInstallingDriver !== null}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium text-center transition flex flex-col items-center justify-center gap-1"
                      >
                        <Bot className="w-4 h-4 text-emerald-400" />
                        <span>OpenAI Codex</span>
                        <span className="text-[10px] text-slate-400">~/.codex/config.toml</span>
                      </button>

                      <button
                        onClick={async () => {
                          setIsInstallingDriver('claudeAgent');
                          try {
                            await onInstallCourtListenerOnDefaultAgent?.('claudeAgent');
                            flashSaved('Configured CourtListener MCP on Claude Code (~/.claude.json)');
                          } finally {
                            setIsInstallingDriver(null);
                          }
                        }}
                        disabled={isInstallingDriver !== null}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium text-center transition flex flex-col items-center justify-center gap-1"
                      >
                        <Bot className="w-4 h-4 text-amber-400" />
                        <span>Claude Code</span>
                        <span className="text-[10px] text-slate-400">~/.claude.json</span>
                      </button>

                      <button
                        onClick={async () => {
                          setIsInstallingDriver('antigravity');
                          try {
                            await onInstallCourtListenerOnDefaultAgent?.('antigravity');
                            flashSaved('Configured CourtListener MCP on Antigravity ACP (Skills Directory)');
                          } finally {
                            setIsInstallingDriver(null);
                          }
                        }}
                        disabled={isInstallingDriver !== null}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium text-center transition flex flex-col items-center justify-center gap-1"
                      >
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        <span>Antigravity ACP</span>
                        <span className="text-[10px] text-slate-400">~/.gemini/antigravity-cli</span>
                      </button>

                      <button
                        onClick={async () => {
                          setIsInstallingDriver('all');
                          try {
                            await onInstallCourtListenerOnDefaultAgent?.('all');
                            flashSaved('Configured CourtListener MCP across all enabled clients!');
                          } finally {
                            setIsInstallingDriver(null);
                          }
                        }}
                        disabled={isInstallingDriver !== null}
                        className="px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium text-center transition flex flex-col items-center justify-center gap-1"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>All Clients</span>
                        <span className="text-[10px] text-amber-300/70">Universal Sync</span>
                      </button>
                    </div>
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
                          Active
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Host: <span className="text-amber-300 font-mono">{courtListenerAssurance?.configuredAgentDisplayName || 'Codex CLI'}</span>
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
                                ? 'All Clients'
                                : server.targetDriver === 'codex'
                                ? 'Codex'
                                : server.targetDriver === 'claudeAgent'
                                ? 'Claude Code'
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
            )}

            {activeTab === 'live_preview' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Live Assembled System Prompt Payload ({assembledPromptPreview.profileName} • {assembledPromptPreview.matterName})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exact runtime prompt hierarchy assembled from Layers 1, 2, 3, and 3B (Configured Legal MCP Toolsets) and sent to the active models.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-300">
                    Assembled Primary Counsel System Prompt (Layers 1 + 2 + 3 + 3B Legal MCPs)
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                    {assembledPromptPreview.primarySystemPrompt}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-300">
                      Assembled Critic #1 Prompt (Citation & Record Auditor)
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                      {assembledPromptPreview.citationAuditorSystemPrompt}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-rose-300">
                      Assembled Critic #2 Prompt (Prosecutor / Opposing Critic)
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                      {assembledPromptPreview.opposingCounselSystemPrompt}
                    </pre>
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
