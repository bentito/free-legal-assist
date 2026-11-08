import React, { useState } from 'react';
import {
  AdversarialConfig,
  AssembledPromptPreview,
  LLMProviderId,
  Matter,
  PracticeAreaId,
  PracticeAreaPreset,
  ProviderConfig,
  SystemPromptSettings,
} from '../../shared/types';
import {
  CheckCircle2,
  Eye,
  KeyRound,
  RotateCcw,
  Scale,
  ShieldAlert,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';

interface PromptGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptSettings: SystemPromptSettings;
  adversarialConfig: AdversarialConfig;
  providers: ProviderConfig[];
  activeMatter: Matter;
  assembledPromptPreview: AssembledPromptPreview;
  onSavePromptSettings: (updated: Partial<SystemPromptSettings>) => Promise<void>;
  onResetPromptSettings: () => Promise<void>;
  onSaveAdversarialConfig: (updated: Partial<AdversarialConfig>) => Promise<void>;
  onSaveProviderCredential: (payload: {
    providerId: LLMProviderId;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
  }) => Promise<void>;
  onUpdateMatterJurisdiction: (payload: {
    matterId: string;
    jurisdiction: string;
    citationStyle: string;
    practiceArea: PracticeAreaId;
  }) => Promise<void>;
}

type StudioTab =
  | 'layer1_core'
  | 'layer2_practice'
  | 'layer3_jurisdiction'
  | 'layer4_critics'
  | 'providers_models'
  | 'live_preview';

export const PromptGovernanceModal: React.FC<PromptGovernanceModalProps> = ({
  isOpen,
  onClose,
  promptSettings,
  adversarialConfig,
  providers,
  activeMatter,
  assembledPromptPreview,
  onSavePromptSettings,
  onResetPromptSettings,
  onSaveAdversarialConfig,
  onSaveProviderCredential,
  onUpdateMatterJurisdiction,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('layer1_core');
  const [coreMandate, setCoreMandate] = useState(promptSettings.coreLegalMandate);
  const [presets, setPresets] = useState<PracticeAreaPreset[]>(
    promptSettings.practiceAreaPresets
  );
  const [selectedPresetId, setSelectedPresetId] = useState<PracticeAreaId>(
    activeMatter.practiceArea || promptSettings.activePracticeAreaId
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

  // Provider API key inputs
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [baseUrlInputs, setBaseUrlInputs] = useState<Record<string, string>>(
    Object.fromEntries(providers.map((p) => [p.id, p.baseUrl || '']))
  );
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[0];

  const flashSaved = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 2800);
  };

  const handleSavePrompts = async () => {
    await onSavePromptSettings({
      coreLegalMandate: coreMandate,
      practiceAreaPresets: presets,
      activePracticeAreaId: selectedPresetId,
      criticCitationAuditorPrompt: auditorPrompt,
      criticOpposingCounselPrompt: opposingPrompt,
    });
    flashSaved(`Saved Legal System Prompt Profile (v${promptSettings.version + 1})`);
  };

  const handleResetPrompts = async () => {
    await onResetPromptSettings();
    flashSaved('Reset all Legal System Prompts to curated defaults');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
      <div className="flex flex-col w-full max-w-6xl h-[86vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-100">
                  Legal System Prompt Governance Studio & Multi-LLM Harness Settings
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Profile v{promptSettings.version} • Zero Software Prompts
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Govern every instruction layer sent to the Primary Legal Model and the Multi-LLM Adversarial Review Critics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveBanner && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveBanner}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left Tab Navigation */}
          <div className="w-64 bg-slate-950/60 border-r border-slate-800 p-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                4-Layer Prompt Governance
              </div>
              <button
                onClick={() => setActiveTab('layer1_core')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                  activeTab === 'layer1_core'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0" />
                <div>
                  <div>Layer 1: Core Legal Mandate</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Ethical & evidentiary guardrails
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('layer2_practice')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                  activeTab === 'layer2_practice'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <div>
                  <div>Layer 2: Practice Area Personas</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Litigation, M&A, Regulatory, Discovery
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('layer3_jurisdiction')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                  activeTab === 'layer3_jurisdiction'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <div>
                  <div>Layer 3: Matter Jurisdiction</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Forum & Bluebook/ALWD rules
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('layer4_critics')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                  activeTab === 'layer4_critics'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <div>
                  <div>Layer 4: Adversarial Critics</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Citation Auditor & Opposing Counsel
                  </div>
                </div>
              </button>

              <div className="pt-3 pb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Models & Inspection
              </div>

              <button
                onClick={() => setActiveTab('providers_models')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                  activeTab === 'providers_models'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <div>
                  <div>Multi-LLM Providers & Keys</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Claude, OpenAI, Gemini, Keychain
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('live_preview')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                  activeTab === 'live_preview'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Eye className="w-4 h-4 shrink-0" />
                <div>
                  <div>Live Assembled Prompt</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Exact payload sent on each turn
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={handleResetPrompts}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Prompts to Defaults</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {activeTab === 'layer1_core' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Layer 1 — Core Legal Mandate & Ethical Guardrails
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Applied globally to every turn. Enforces strict citation grounding, Bates pinpoints, and candid legal risk analysis.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Layer 1 Mandate
                  </button>
                </div>
                <textarea
                  value={coreMandate}
                  onChange={(e) => setCoreMandate(e.target.value)}
                  rows={18}
                  className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500/60"
                />
              </div>
            )}

            {activeTab === 'layer2_practice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Layer 2 — Practice Area & Task Personas
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Customize the specialized legal instructions for each practice area preset.
                    </p>
                  </div>
                  <button
                    onClick={handleSavePrompts}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Practice Area Presets
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
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
                      <div className="text-xs font-semibold">{preset.shortLabel}</div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedPreset && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      System Prompt Directive for: {selectedPreset.name}
                    </label>
                    <textarea
                      value={selectedPreset.systemPrompt}
                      onChange={(e) => {
                        const updatedText = e.target.value;
                        setPresets((prev) =>
                          prev.map((p) =>
                            p.id === selectedPreset.id
                              ? { ...p, systemPrompt: updatedText }
                              : p
                          )
                        );
                      }}
                      rows={13}
                      className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500/60"
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
                      Layer 3 — Matter Jurisdiction, Forum & Citation Manual ({activeMatter.name})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Injected into both the Primary Legal Model and Adversarial Critics to enforce controlling forum law and citation style.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveLayer3}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                  >
                    Save Matter Jurisdiction Rules
                  </button>
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
                      placeholder="e.g., Delaware Court of Chancery / U.S. District Court S.D.N.Y."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Mandatory Legal Citation Manual
                    </label>
                    <input
                      type="text"
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      placeholder="e.g., The Bluebook (21st Ed.) / California Style Manual / ALWD"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Default Practice Area Persona for Matter
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
                      Layer 4 — Multi-LLM Adversarial Reviewer Prompts
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
                    Critic #1: Independent Citation & Record Auditor System Prompt
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
                    Critic #2: Adversarial Opposing Counsel & Reviewing Partner System Prompt
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
                    Multi-LLM Adversarial Role Assignment & Provider Credentials
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign distinct model families to Primary Drafting, Citation Auditing, and Opposing Counsel Critique. API keys are encrypted via macOS Keychain / Windows DPAPI (`safeStorage`).
                  </p>
                </div>

                {/* Role Assignment Matrix */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-2">
                      1. Primary Legal Counsel Model
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
                      3. Opposing Counsel Critic
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
                        flashSaved('Updated Opposing Counsel Critic Model');
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

                {/* Provider API Keys List */}
                <div className="space-y-3">
                  {providers.map((prov) => (
                    <div
                      key={prov.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-100">
                            {prov.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                              prov.hasApiKey
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {prov.hasApiKey
                              ? `Active (${prov.maskedApiKey})`
                              : 'Using Local Mac Test Fallback'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {prov.description}
                        </p>
                      </div>

                      {prov.id !== 'legal-simulator' && (
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
                              flashSaved(`Saved encrypted key for ${prov.name}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
                          >
                            Save Key
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'live_preview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Live Assembled Legal System Prompts (Sent on Every Turn)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspect the exact composed system prompts assembled from Layers 1–4 for{' '}
                    <span className="text-slate-200 font-medium">
                      {assembledPromptPreview.matterName}
                    </span>
                    .
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-amber-300 mb-1">
                      Primary Legal Model Assembled System Prompt (Layers 1 + 2 + 3)
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {assembledPromptPreview.primarySystemPrompt}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-emerald-300 mb-1">
                        Critic #1: Citation & Record Auditor Prompt (Layer 4A)
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {assembledPromptPreview.citationAuditorSystemPrompt}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-rose-300 mb-1">
                        Critic #2: Opposing Counsel Critic Prompt (Layer 4B)
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {assembledPromptPreview.opposingCounselSystemPrompt}
                      </pre>
                    </div>
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
