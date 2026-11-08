import React, { useEffect, useState } from 'react';
import {
  AdversarialConfig,
  AssembledPromptPreview,
  CreateCustomLegalMcpServerPayload,
  LegalMcpAuthTier,
  LegalMcpServerConfig,
  LegalMcpServerId,
  LegalMcpTestResult,
  LegalMcpTransport,
  LLMProviderId,
  Matter,
  PracticeAreaId,
  PracticeAreaPreset,
  PractitionerProfileId,
  ProviderConfig,
  SaveLegalMcpServerPayload,
  SystemPromptSettings,
} from '../../shared/types';
import {
  CheckCircle2,
  Database,
  Eye,
  KeyRound,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldAlert,
  Sliders,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';

export type StudioTab =
  | 'layer1_core'
  | 'layer2_practice'
  | 'layer3_jurisdiction'
  | 'layer4_critics'
  | 'legal_mcp'
  | 'providers_models'
  | 'live_preview';

interface PromptGovernanceModalProps {
  isOpen: boolean;
  initialTab?: StudioTab;
  onClose: () => void;
  promptSettings: SystemPromptSettings;
  adversarialConfig: AdversarialConfig;
  providers: ProviderConfig[];
  legalMcpServers: LegalMcpServerConfig[];
  activeMatter: Matter;
  assembledPromptPreview: AssembledPromptPreview;
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
  onSaveLegalMcpServer: (payload: SaveLegalMcpServerPayload) => Promise<void>;
  onAddCustomLegalMcpServer: (
    payload: CreateCustomLegalMcpServerPayload
  ) => Promise<void>;
  onSyncLegalMcpToAgents: () => Promise<void>;
  onTestLegalMcpServer: (serverId: LegalMcpServerId) => Promise<LegalMcpTestResult>;
  onUpdateMatterJurisdiction: (payload: {
    matterId: string;
    jurisdiction: string;
    citationStyle: string;
    practiceArea: PracticeAreaId;
  }) => Promise<void>;
}

export const PromptGovernanceModal: React.FC<PromptGovernanceModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  promptSettings,
  adversarialConfig,
  providers,
  legalMcpServers,
  activeMatter,
  assembledPromptPreview,
  onSelectPractitionerProfile,
  onSavePromptSettings,
  onResetPromptSettings,
  onSaveAdversarialConfig,
  onSaveProviderCredential,
  onSaveLegalMcpServer,
  onAddCustomLegalMcpServer,
  onSyncLegalMcpToAgents,
  onTestLegalMcpServer,
  onUpdateMatterJurisdiction,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab || 'layer1_core');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

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

  // Legal MCP state
  const [mcpTokenInputs, setMcpTokenInputs] = useState<Record<string, string>>({});
  const [mcpEndpointInputs, setMcpEndpointInputs] = useState<Record<string, string>>(
    Object.fromEntries((legalMcpServers || []).map((s) => [s.id, s.endpointUrl || '']))
  );
  const [mcpTestResults, setMcpTestResults] = useState<
    Record<string, LegalMcpTestResult>
  >({});
  const [testingMcpId, setTestingMcpId] = useState<string | null>(null);
  const [showAddCustomMcp, setShowAddCustomMcp] = useState(false);
  const [customMcpName, setCustomMcpName] = useState('');
  const [customMcpDesc, setCustomMcpDesc] = useState('');
  const [customMcpTransport, setCustomMcpTransport] =
    useState<LegalMcpTransport>('stdio');
  const [customMcpAuthTier, setCustomMcpAuthTier] =
    useState<LegalMcpAuthTier>('authenticated_pro');
  const [customMcpEndpoint, setCustomMcpEndpoint] = useState('');
  const [customMcpCommand, setCustomMcpCommand] = useState('npx');
  const [customMcpArgs, setCustomMcpArgs] = useState('-y @modelcontextprotocol/server-legal');
  const [customMcpEnvVar, setCustomMcpEnvVar] = useState('LEGAL_MCP_API_TOKEN');
  const [customMcpToken, setCustomMcpToken] = useState('');
  const [customMcpTools, setCustomMcpTools] = useState(
    'legal_authority_search, verify_case_citation'
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

  useEffect(() => {
    setMcpEndpointInputs(
      Object.fromEntries(
        (legalMcpServers || []).map((s) => [s.id, s.endpointUrl || ''])
      )
    );
  }, [legalMcpServers]);

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
      `Saved ${activeProfile?.name ?? 'Legal'} System Prompts & Adversarial Critic Instructions`
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

  const handleRunMcpTest = async (serverId: LegalMcpServerId) => {
    setTestingMcpId(serverId);
    try {
      const res = await onTestLegalMcpServer(serverId);
      setMcpTestResults((prev) => ({ ...prev, [serverId]: res }));
    } finally {
      setTestingMcpId(null);
    }
  };

  const handleCreateCustomMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMcpName.trim()) return;
    await onAddCustomLegalMcpServer({
      name: customMcpName.trim(),
      description: customMcpDesc.trim(),
      transport: customMcpTransport,
      authTier: customMcpAuthTier,
      endpointUrl: customMcpEndpoint.trim() || 'stdio://custom-legal-mcp',
      command: customMcpCommand.trim() || 'npx',
      args: customMcpArgs
        .split(/\s+/)
        .map((a) => a.trim())
        .filter(Boolean),
      envVarName: customMcpEnvVar.trim() || 'LEGAL_MCP_API_TOKEN',
      authToken: customMcpToken.trim() || undefined,
      toolNames: customMcpTools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setCustomMcpName('');
    setCustomMcpDesc('');
    setCustomMcpToken('');
    setShowAddCustomMcp(false);
    flashSaved('Added Custom Legal MCP Toolset & Synced to Agents');
  };

  const defaultMcpSyncInfo = legalMcpServers?.[0]?.agentSyncStatus;

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
                  Legal System Prompt & Multi-LLM Governance Studio
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Profile: {activeProfile?.name ?? 'Vermont Criminal Defense Lawyer'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select your Practitioner Profile, customize the 4-layer legal system prompt hierarchy, configure CourtListener & Legal MCP Toolsets, and manage T3 CLI/ACP agents.
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
                <div className="font-semibold">Layer 4: Adversarial Critics</div>
                <div className="text-[10px] opacity-75">
                  Record Auditor & Prosecutor Critic
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
              <Database className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <div className="font-semibold">
                  Legal MCP Toolsets
                </div>
                <div className="text-[10px] opacity-75">
                  CourtListener (Default) & Auth MCPs
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
                <div className="font-semibold">Multi-LLM & CLI Agents</div>
                <div className="text-[10px] opacity-75">
                  Codex, agy ACP, Claude & API Keys
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
                      Governs every turn for this Practitioner Profile. Enforces constitutional primacy, record-grounding rules, and zero-hallucination citation discipline.
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
                      Layer 4 — Multi-LLM Adversarial Reviewer Prompts ({activeProfile?.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Govern the system prompts for the independent reviewer models that audit every candidate response before completion.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Adversarial Critic Prompts
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-400">
                    Critic #1: Citation & Discovery Record Auditor System Prompt
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
                    Critic #2: Adversarial Opposing Counsel / Prosecutor & Judge System Prompt
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

            {activeTab === 'legal_mcp' && (
              <div className="space-y-6">
                {/* Top Header & Agent Sync Bar */}
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">
                          Legal MCP Toolsets & Automatic Agent Harness Provisioning
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          CourtListener Default Enabled
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        LexHarness automatically provisions and syncs enabled Legal MCP servers into{' '}
                        <span className="text-slate-200 font-medium">
                          Antigravity ACP (`agy`)
                        </span>
                        ,{' '}
                        <span className="text-slate-200 font-medium">
                          OpenAI Codex (`codex exec -c mcp_servers...`)
                        </span>
                        ,{' '}
                        <span className="text-slate-200 font-medium">
                          Claude Code (`claude --mcp-config`)
                        </span>
                        , and the{' '}
                        <span className="text-slate-200 font-medium">
                          Local Legal Agent Loop
                        </span>
                        .
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddCustomMcp((prev) => !prev)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Custom Legal MCP
                      </button>
                      <button
                        onClick={async () => {
                          await onSyncLegalMcpToAgents();
                          flashSaved(
                            'Verified & Synced Legal MCP Toolsets to All Agents (Codex, agy ACP, Claude, Local Loop)'
                          );
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Ensure & Sync MCP Config to All Agents
                      </button>
                    </div>
                  </div>

                  {/* Agent Sync Checkmarks */}
                  {defaultMcpSyncInfo && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-medium">
                        Agent Harness MCP Sync Status:
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          defaultMcpSyncInfo.localLoopSynced
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        ✓ Local Legal Loop: Synced
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          defaultMcpSyncInfo.agyAcpSynced
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {defaultMcpSyncInfo.agyAcpSynced ? '✓' : '•'} Antigravity ACP (`agy`):{' '}
                        {defaultMcpSyncInfo.agyAcpSynced ? 'MCP Synced' : 'Ready on Install'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          defaultMcpSyncInfo.codexCliSynced
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {defaultMcpSyncInfo.codexCliSynced ? '✓' : '•'} Codex CLI (`mcp_servers`):{' '}
                        {defaultMcpSyncInfo.codexCliSynced ? 'MCP Synced' : 'Ready on Install'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border ${
                          defaultMcpSyncInfo.claudeCliSynced
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {defaultMcpSyncInfo.claudeCliSynced ? '✓' : '•'} Claude Code (`--mcp-config`):{' '}
                        {defaultMcpSyncInfo.claudeCliSynced ? 'MCP Synced' : 'Config Generated'}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-slate-500 truncate max-w-xs">
                        {defaultMcpSyncInfo.configFilePath}
                      </span>
                    </div>
                  )}
                </div>

                {/* Add Custom Legal MCP Form */}
                {showAddCustomMcp && (
                  <form
                    onSubmit={handleCreateCustomMcp}
                    className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-amber-300">
                        Register Additional Legal MCP Server (Free or Authenticated)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomMcp(false)}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Toolset Name
                        </label>
                        <input
                          type="text"
                          value={customMcpName}
                          onChange={(e) => setCustomMcpName(e.target.value)}
                          placeholder="e.g., PACER / RECAP Direct MCP or State Bar Citator"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Authentication Tier
                        </label>
                        <select
                          value={customMcpAuthTier}
                          onChange={(e) =>
                            setCustomMcpAuthTier(e.target.value as LegalMcpAuthTier)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                        >
                          <option value="free_account_required">
                            Free Account Token Required
                          </option>
                          <option value="free_public">
                            Public / No Token Required
                          </option>
                          <option value="authenticated_pro">
                            Authenticated Subscription / Pro Token
                          </option>
                          <option value="enterprise_key">
                            Enterprise Firm Key
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Transport
                        </label>
                        <select
                          value={customMcpTransport}
                          onChange={(e) =>
                            setCustomMcpTransport(e.target.value as LegalMcpTransport)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                        >
                          <option value="stdio">MCP Stdio Process</option>
                          <option value="http-sse">MCP HTTP / SSE Endpoint</option>
                          <option value="http-rest-bridge">REST Bridge</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Command / Executable
                        </label>
                        <input
                          type="text"
                          value={customMcpCommand}
                          onChange={(e) => setCustomMcpCommand(e.target.value)}
                          placeholder="npx or node or python3"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Arguments (space-separated)
                        </label>
                        <input
                          type="text"
                          value={customMcpArgs}
                          onChange={(e) => setCustomMcpArgs(e.target.value)}
                          placeholder="-y @org/legal-mcp-server"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Endpoint URL / Reference
                        </label>
                        <input
                          type="text"
                          value={customMcpEndpoint}
                          onChange={(e) => setCustomMcpEndpoint(e.target.value)}
                          placeholder="https://api.example-legal.org/v1"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Auth Environment Variable Name
                        </label>
                        <input
                          type="text"
                          value={customMcpEnvVar}
                          onChange={(e) => setCustomMcpEnvVar(e.target.value)}
                          placeholder="LEGAL_MCP_API_TOKEN"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          API Token / Secret (Encrypted via safeStorage)
                        </label>
                        <input
                          type="password"
                          value={customMcpToken}
                          onChange={(e) => setCustomMcpToken(e.target.value)}
                          placeholder="Optional token..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Exposed Tool Names (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={customMcpTools}
                          onChange={(e) => setCustomMcpTools(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                      >
                        Register & Sync Legal MCP Server
                      </button>
                    </div>
                  </form>
                )}

                {/* Legal MCP Toolset Cards (CourtListener 1st & Default) */}
                <div className="space-y-4">
                  {(legalMcpServers || []).map((srv) => {
                    const isCourtListener = srv.id === 'courtlistener-mcp';
                    const testResult = mcpTestResults[srv.id];

                    return (
                      <div
                        key={srv.id}
                        className={`p-4 rounded-xl border space-y-3 ${
                          isCourtListener
                            ? 'bg-slate-950 border-amber-500/40 shadow-lg shadow-amber-500/5'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-100">
                                {srv.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                                  isCourtListener
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                    : srv.authTier === 'authenticated_pro'
                                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {srv.badgeText}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                                  srv.enabled
                                    ? srv.hasAuthToken || srv.authTier === 'free_public'
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                {srv.enabled
                                  ? srv.hasAuthToken
                                    ? `Enabled • Token Configured (${srv.maskedAuthToken})`
                                    : srv.authTier === 'free_public'
                                      ? 'Enabled • Public Access Ready'
                                      : 'Enabled (Default) • Free Account Token Recommended'
                                  : 'Disabled'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {srv.description}
                            </p>

                            {isCourtListener && (
                              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 flex flex-wrap items-center justify-between gap-2">
                                <span>
                                  <strong>Free CourtListener Account Setup:</strong> Create a free account at{' '}
                                  <code className="text-amber-300 font-mono">
                                    https://www.courtlistener.com/help/api/rest/
                                  </code>{' '}
                                  and paste your API Token below to enable live 5,000 req/hr REST v4 citation verification and opinion searches across all agents.
                                </span>
                              </div>
                            )}

                            {/* Exposed MCP Tools List */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">
                                MCP Tools:
                              </span>
                              {srv.tools.map((t) => (
                                <span
                                  key={t.name}
                                  title={t.description}
                                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-300"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Enable Toggle & Test Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleRunMcpTest(srv.id)}
                              disabled={testingMcpId === srv.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                            >
                              <Play className="w-3 h-3 text-emerald-400" />
                              {testingMcpId === srv.id ? 'Testing...' : 'Test MCP Toolset'}
                            </button>
                            <button
                              onClick={async () => {
                                await onSaveLegalMcpServer({
                                  serverId: srv.id,
                                  enabled: !srv.enabled,
                                });
                                flashSaved(
                                  `${!srv.enabled ? 'Enabled' : 'Disabled'} ${srv.name} & synced to agents`
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                srv.enabled
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {srv.enabled ? 'Enabled' : 'Enable MCP'}
                            </button>
                          </div>
                        </div>

                        {/* Token & Endpoint Configuration Row */}
                        {srv.authTier !== 'free_public' && (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-2.5 border-t border-slate-800/80 items-end">
                            <div className="md:col-span-5">
                              <label className="block text-[10px] text-slate-400 mb-1">
                                API / MCP Endpoint URL
                              </label>
                              <input
                                type="text"
                                value={mcpEndpointInputs[srv.id] ?? srv.endpointUrl}
                                onChange={(e) =>
                                  setMcpEndpointInputs((prev) => ({
                                    ...prev,
                                    [srv.id]: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                              />
                            </div>
                            <div className="md:col-span-5">
                              <label className="block text-[10px] text-slate-400 mb-1">
                                {isCourtListener
                                  ? 'Free CourtListener API Token (`COURTLISTENER_API_TOKEN`)'
                                  : `Auth Token / Key (\`${srv.envVarName || 'API_TOKEN'}\`)`}
                              </label>
                              <input
                                type="password"
                                value={mcpTokenInputs[srv.id] ?? ''}
                                onChange={(e) =>
                                  setMcpTokenInputs((prev) => ({
                                    ...prev,
                                    [srv.id]: e.target.value,
                                  }))
                                }
                                placeholder={
                                  srv.hasAuthToken
                                    ? `Saved (${srv.maskedAuthToken}) — Enter new token to replace...`
                                    : isCourtListener
                                      ? 'Paste free CourtListener API Token (40-char hex)...'
                                      : 'Enter API Token...'
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <button
                                onClick={async () => {
                                  await onSaveLegalMcpServer({
                                    serverId: srv.id,
                                    enabled: true,
                                    endpointUrl: mcpEndpointInputs[srv.id],
                                    authToken:
                                      mcpTokenInputs[srv.id] !== undefined &&
                                      mcpTokenInputs[srv.id].trim().length > 0
                                        ? mcpTokenInputs[srv.id]
                                        : undefined,
                                  });
                                  setMcpTokenInputs((prev) => ({
                                    ...prev,
                                    [srv.id]: '',
                                  }));
                                  flashSaved(
                                    `Saved & synced ${srv.name} configuration to all agents`
                                  );
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                              >
                                Save & Sync
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Live Diagnostic Test Result */}
                        {testResult && (
                          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={`font-semibold ${
                                  testResult.ok ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {testResult.statusSummary}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {testResult.latencyMs}ms
                              </span>
                            </div>
                            <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
                              {testResult.samplePayload}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'providers_models' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Multi-LLM Adversarial Role Assignment & Provider Credentials
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign distinct model families to Primary Drafting, Citation Auditing, and Opposing Critique. API keys are encrypted via macOS Keychain / Windows DPAPI (`safeStorage`).
                  </p>
                </div>

                {/* Role Assignment Matrix */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-2">
                      1. Primary Defense / Lead Counsel
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
                        flashSaved('Updated Primary Counsel Model');
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
                      2. Citation & Record Auditor Critic
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
                        flashSaved('Updated Citation Auditor Critic Model');
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
                      3. State's Attorney / Opposing Critic
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
                        flashSaved('Updated Opposing Critic Model');
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
