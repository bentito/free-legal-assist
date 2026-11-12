import React, { useEffect, useMemo, useState } from 'react';
import {
  AdversarialReviewMode,
  AgentProgressEvent,
  AppBootstrapState,
  LLMProviderId,
  Matter,
  PracticeAreaId,
  ProviderConfig,
  ThreadMessage,
} from '../shared/types';
import { ipcBridge } from './lib/bridge';
import { ConnectAgentsModal } from './components/ConnectAgentsModal';
import {
  PromptGovernanceModal,
  StudioTab,
} from './components/PromptGovernanceModal';
import { RightWorkspacePane } from './components/RightWorkspacePane';
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  FileSearch,
  FolderPlus,
  Gavel,
  Loader2,
  MessageSquarePlus,
  Plug,
  Scale,
  Send,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';

export const App: React.FC = () => {
  const [state, setState] = useState<AppBootstrapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [promptInput, setPromptInput] = useState('');
  const [isRunningTurn, setIsRunningTurn] = useState(false);
  const [liveProgress, setLiveProgress] = useState<AgentProgressEvent | null>(
    null
  );
  const [turnProvider, setTurnProvider] = useState<LLMProviderId>('agy-acp');
  const [turnModel, setTurnModel] = useState<string>('gemini-4-argon');
  const [turnReviewMode, setTurnReviewMode] =
    useState<AdversarialReviewMode>('multi_llm_default');
  const [turnPracticeArea, setTurnPracticeArea] =
    useState<PracticeAreaId>('vt_suppression_art11');

  // Modals & UI drawers
  const [isConnectAgentsOpen, setIsConnectAgentsOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioInitialTab, setStudioInitialTab] =
    useState<StudioTab>('layer1_core');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [expandedReviewMsgIds, setExpandedReviewMsgIds] = useState<
    Record<string, boolean>
  >({
    'msg-vt-assistant-1': true,
    'msg-seed-assistant-1': true,
  });
  const [showInitialDraftMsgIds, setShowInitialDraftMsgIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedToolCallIds, setExpandedToolCallIds] = useState<
    Record<string, boolean>
  >({});

  // New Matter Modal state
  const [showNewMatterModal, setShowNewMatterModal] = useState(false);
  const [newMatterName, setNewMatterName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newMatterNumber, setNewMatterNumber] = useState(
    '26-CR-05512 (Chittenden Unit)'
  );
  const [newMatterJurisdiction, setNewMatterJurisdiction] = useState(
    'Vermont Superior Court, Chittenden Criminal Division (Vt. Const. ch. I, art. 11; 13 V.S.A.; V.R.Cr.P.)'
  );
  const [newMatterCitation, setNewMatterCitation] = useState(
    'Vermont Supreme Court / Bluebook (e.g., 2007 VT 16, ¶ 14; 13 V.S.A. § ...; V.R.Cr.P. 12)'
  );
  const [newMatterPracticeArea, setNewMatterPracticeArea] =
    useState<PracticeAreaId>('vt_suppression_art11');

  // Right-Click Context Menu & Edit / Delete Matter Settings Dialog state
  const [matterContextMenu, setMatterContextMenu] = useState<{
    x: number;
    y: number;
    matter: Matter;
  } | null>(null);
  const [editingMatter, setEditingMatter] = useState<Matter | null>(null);
  const [deletingMatter, setDeletingMatter] = useState<Matter | null>(null);
  const [editMatterName, setEditMatterName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editMatterNumber, setEditMatterNumber] = useState('');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [editCitationStyle, setEditCitationStyle] = useState('');
  const [editPracticeArea, setEditPracticeArea] =
    useState<PracticeAreaId>('vt_suppression_art11');
  const [editFolderPath, setEditFolderPath] = useState('');

  const openEditMatterDialog = (matter: Matter) => {
    setEditingMatter(matter);
    setEditMatterName(matter.name);
    setEditClientName(matter.clientName);
    setEditMatterNumber(matter.matterNumber);
    setEditJurisdiction(matter.jurisdiction);
    setEditCitationStyle(matter.citationStyle);
    setEditPracticeArea(matter.practiceArea);
    setEditFolderPath(matter.folderPath);
    setMatterContextMenu(null);
  };

  const openDeleteMatterConfirm = (matter: Matter) => {
    setDeletingMatter(matter);
    setMatterContextMenu(null);
  };

  useEffect(() => {
    const closeMenu = () => setMatterContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    ipcBridge
      .bootstrap()
      .then((initial) => {
        setState(initial);
        setTurnReviewMode(initial.adversarialConfig.mode);

        // Auto-select a provider that is actually installed & ready on this system
        const configured = initial.providers.find(
          (p) => p.id === initial.adversarialConfig.primaryProvider
        );
        const isConfiguredReady =
          configured && (configured.hasApiKey || configured.runtimeStatus?.installed);

        const firstReady =
          initial.providers.find(
            (p) => p.hasApiKey || p.runtimeStatus?.installed
          ) || initial.providers[0];

        const activeConfig = isConfiguredReady ? configured! : firstReady;
        const activeProvider = activeConfig.id;
        const activeModel =
          (isConfiguredReady
            ? initial.adversarialConfig.primaryModel
            : activeConfig.defaultModel) ||
          activeConfig.defaultModel ||
          'gpt-6-luna';

        setTurnProvider(activeProvider);
        setTurnModel(activeModel);
        const activeMatter = initial.matters.find(
          (m) => m.id === initial.activeMatterId
        );
        if (activeMatter) {
          setTurnPracticeArea(activeMatter.practiceArea);
        }
        // Automatically show the T3-style "Connect your agents" onboarding modal on initial use
        if (!initial.agentOnboarding?.completedAt) {
          setIsConnectAgentsOpen(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });

    unsubscribe = ipcBridge.onAgentProgress((evt) => {
      setLiveProgress(evt);
    });

    return () => unsubscribe();
  }, []);

  const docNeedingReview = useMemo(() => {
    if (!state) return null;
    // 1. Check currently selected document first
    const selectedDoc = state.documents.find((d) => d.id === selectedDocId);
    if (selectedDoc) {
      const versions = state.documentVersions.filter(
        (v) => v.documentId === selectedDoc.id && v.versionNumber > 1
      );
      const latestVer = versions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const isEdited =
        latestVer &&
        new Date(selectedDoc.updatedAt).getTime() > new Date(latestVer.createdAt).getTime();
      const isUnreviewedWorkProduct =
        !latestVer &&
        (selectedDoc.category === 'WORK_PRODUCT' ||
          selectedDoc.category === 'PLEADING' ||
          selectedDoc.updatedAt !== selectedDoc.createdAt);

      if (isEdited || isUnreviewedWorkProduct) {
        return { doc: selectedDoc, reason: isEdited ? ('edited' as const) : ('new' as const) };
      }
    }

    // 2. Otherwise check any other document in the matter
    for (const doc of state.documents) {
      const versions = state.documentVersions.filter(
        (v) => v.documentId === doc.id && v.versionNumber > 1
      );
      const latestVer = versions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const isEdited =
        latestVer &&
        new Date(doc.updatedAt).getTime() > new Date(latestVer.createdAt).getTime();
      const isUnreviewedWorkProduct =
        !latestVer &&
        (doc.category === 'WORK_PRODUCT' ||
          doc.category === 'PLEADING' ||
          doc.updatedAt !== doc.createdAt);

      if (isEdited || isUnreviewedWorkProduct) {
        return { doc, reason: isEdited ? ('edited' as const) : ('new' as const) };
      }
    }

    return null;
  }, [state?.documents, state?.documentVersions, selectedDocId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          <span className="text-sm font-medium">
            Initializing LexHarness Local Legal Database & Control Surface...
          </span>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-rose-300 p-8">
        <div className="max-w-lg p-6 rounded-xl bg-slate-900 border border-rose-500/40 space-y-2">
          <div className="font-semibold text-base">
            Failed to initialize LexHarness Runtime
          </div>
          <p className="text-xs text-slate-300 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  const activeMatter =
    state.matters.find((m) => m.id === state.activeMatterId) ?? state.matters[0];
  const activeProfile =
    state.promptSettings.profiles.find(
      (p) => p.id === state.promptSettings.activeProfileId
    ) ?? state.promptSettings.profiles[0];

  const currentProviderConfig =
    state.providers.find((p) => p.id === turnProvider) ?? state.providers[0];

  const formatAgentLabel = (p?: ProviderConfig) => {
    if (!p) return 'Agent';
    if (p.id === 'agy-acp') return 'Antigravity ACP (T3 Native)';
    if (p.id === 'claude-cli') return 'Claude Code CLI';
    if (p.id === 'codex-cli') return 'OpenAI Codex CLI';
    if (p.id === 'anthropic') return 'Anthropic Claude API';
    if (p.id === 'openai') return 'OpenAI Direct API';
    if (p.id === 'gemini') return 'Google Gemini API';
    if (p.id === 'openrouter') return 'OpenRouter / Local';
    if (p.id === 'legal-simulator') return 'Offline Simulator';
    return p.name;
  };

  const availableModelsForTurnProvider =
    currentProviderConfig?.availableModels ?? [
      { id: turnModel, label: turnModel },
    ];

  const handleProviderChange = async (providerId: LLMProviderId) => {
    setTurnProvider(providerId);
    const providerObj = state.providers.find((p) => p.id === providerId);
    const newModel =
      providerObj?.availableModels[0]?.id || providerObj?.defaultModel || turnModel;
    setTurnModel(newModel);
    try {
      const updated = await ipcBridge.saveAdversarialConfig({
        primaryProvider: providerId,
        primaryModel: newModel,
      });
      setState(updated);
    } catch {
      // Non-blocking sync
    }
  };

  const handleModelChange = async (modelId: string) => {
    setTurnModel(modelId);
    try {
      const updated = await ipcBridge.saveAdversarialConfig({
        primaryProvider: turnProvider,
        primaryModel: modelId,
      });
      setState(updated);
    } catch {
      // Non-blocking sync
    }
  };

  const handleSubmitPrompt = async (customPrompt?: string) => {
    let text = (customPrompt ?? promptInput).trim();
    if (!text && docNeedingReview) {
      text = `Run a comprehensive peer review on the ${docNeedingReview.reason === 'edited' ? 'updated' : 'new'} document "${docNeedingReview.doc.title}" (Bates: ${docNeedingReview.doc.batesRange}). Audit citations against controlling forum law and discovery exhibits, identify weaknesses, and propose a redline revision.`;
    }
    if (!text || isRunningTurn) return;

    setPromptInput('');
    setIsRunningTurn(true);
    setLiveProgress({
      matterId: activeMatter.id,
      phase: 'assembling_prompt',
      statusText: `Starting Legal Agent Turn with ${currentProviderConfig?.name || turnProvider} (${turnModel})...`,
    });

    try {
      const updated = await ipcBridge.runTurn({
        matterId: activeMatter.id,
        userPrompt: text,
        overrideReviewMode: turnReviewMode,
        overridePracticeAreaId: turnPracticeArea,
        overridePrimaryProvider: turnProvider,
        overridePrimaryModel: turnModel,
      });
      setState(updated);
      const newestAssistantMsg = [...updated.messages]
        .reverse()
        .find((m) => m.role === 'assistant');
      if (newestAssistantMsg) {
        setExpandedReviewMsgIds((prev) => ({
          ...prev,
          [newestAssistantMsg.id]: true,
        }));
      }
    } catch (err) {
      alert(`Agent Loop Error: ${(err as Error).message}`);
    } finally {
      setIsRunningTurn(false);
      setLiveProgress(null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top macOS-friendly Titlebar & Control Surface Header */}
      <header className="h-13 shrink-0 bg-slate-950 border-b border-slate-800/90 flex items-center justify-between pl-24 pr-4 app-drag-region">
        <div className="flex items-center gap-3 app-no-drag">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Scale className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-100">
              LexHarness
            </span>
          </div>

          <span className="text-slate-700">/</span>

          <div
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMatterContextMenu({
                x: e.clientX,
                y: e.clientY,
                matter: activeMatter,
              });
            }}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs"
            title="Right-click or click gear to edit Matter Settings"
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-slate-200">
              {activeMatter.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ({activeMatter.matterNumber})
            </span>
            <button
              onClick={() => openEditMatterDialog(activeMatter)}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition"
              title="Edit Matter / Docket Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/70 border border-slate-800/80 text-[11px] text-slate-300">
            <Gavel className="w-3.5 h-3.5 text-amber-400/80" />
            <span className="truncate max-w-xs">
              {activeMatter.jurisdiction}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 app-no-drag">
          <button
            onClick={() => setIsConnectAgentsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200 transition"
            title="Connect your agents (Codex, Claude, Antigravity & Multi-Account ChatGPT)"
          >
            <Plug className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Agents:{' '}
              {
                (state.agentOnboarding?.agentInstances || []).filter(
                  (i) => i.status === 'ready'
                ).length
              }{' '}
              Ready
            </span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              Review:{' '}
              {turnReviewMode === 'multi_llm_default'
                ? 'Full Peer Review'
                : turnReviewMode === 'single_critic'
                  ? 'Quick Review'
                  : 'Off'}
            </span>
          </div>

          <button
            onClick={() => {
              setStudioInitialTab('layer1_core');
              setIsStudioOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Profile: {activeProfile.name}</span>
          </button>
        </div>
      </header>

      {/* Main 3-Pane Control Surface */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT PANE: Matters, Threads & Multi-LLM Harness Status */}
        <aside className="w-72 shrink-0 bg-slate-900/75 border-r border-slate-800 flex flex-col justify-between">
          <div className="p-3 space-y-4 overflow-y-auto">
            {/* Matter Switcher */}
            <div>
              <div className="flex items-center justify-between px-1.5 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Legal Matters (Right-Click to Edit)
                </span>
                <button
                  onClick={() => {
                    setNewMatterJurisdiction(activeProfile.defaultJurisdiction);
                    setNewMatterCitation(activeProfile.defaultCitationStyle);
                    setNewMatterPracticeArea(activeProfile.activePracticeAreaId);
                    setShowNewMatterModal(true);
                  }}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>New Matter</span>
                </button>
              </div>

              <div className="space-y-1">
                {state.matters.map((m) => (
                  <div
                    key={m.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMatterContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        matter: m,
                      });
                    }}
                    className={`group relative w-full p-2.5 rounded-xl text-left border transition cursor-pointer ${
                      m.id === activeMatter.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-slate-100'
                        : 'bg-slate-950/50 border-slate-800/70 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    onClick={async () => {
                      const updated = await ipcBridge.selectMatter(m.id);
                      setState(updated);
                      setTurnPracticeArea(m.practiceArea);
                    }}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="text-xs font-semibold truncate">
                        {m.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditMatterDialog(m);
                        }}
                        title="Matter Settings (Change Name, Docket ID, Forum...)"
                        className="opacity-70 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition shrink-0"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span className="truncate">{m.clientName}</span>
                      <span className="font-mono">{m.matterNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matter Overview */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Matter Overview
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  {state.documents.length} Files
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="text-slate-200 font-medium truncate">
                  {activeMatter.name}
                </div>
                <div className="text-slate-400 text-[10px]">
                  Client: <span className="text-slate-300">{activeMatter.clientName}</span>
                </div>
                <div className="text-slate-400 text-[10px] font-mono truncate">
                  Docket: {activeMatter.matterNumber}
                </div>
                <div className="text-slate-400 text-[10px] truncate">
                  Forum: {activeMatter.jurisdiction}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Active Review Team Panel Card */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Active Review Team
              </span>
              <button
                onClick={() => {
                  setStudioInitialTab('providers_models');
                  setIsStudioOpen(true);
                }}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Configure
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Lead Drafter:</span>
                <span className="font-mono text-amber-300 truncate max-w-[130px]">
                  {state.adversarialConfig.primaryModel}
                </span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Citation Auditor:</span>
                <span className="font-mono text-emerald-300 truncate max-w-[130px]">
                  {state.adversarialConfig.citationAuditorModel}
                </span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Opposing Review:</span>
                <span className="font-mono text-rose-300 truncate max-w-[130px]">
                  {state.adversarialConfig.opposingCounselModel}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANE: Legal Workspace & Messages */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {/* Active Matter Subheader */}
          <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>{activeMatter.name}</span>
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({activeMatter.matterNumber})
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Client:{' '}
                <span className="text-slate-200 font-medium">
                  {activeMatter.clientName}
                </span>{' '}
                &bull; Profile:{' '}
                <span className="text-amber-300 font-medium">
                  {activeProfile.name}
                </span>{' '}
                &bull; Forum:{' '}
                <span className="text-slate-300 font-medium">
                  {activeMatter.jurisdiction}
                </span>{' '}
                &bull; Documents: {state.documents.length} Files
              </p>
            </div>

            <button
              onClick={() => setIsStudioOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
              title="Open Practice Settings & Legal Instructions"
            >
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings</span>
            </button>
          </div>

          {/* Messages & Agent Loop Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 select-text">
            {state.messages.map((msg: ThreadMessage) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-3xl p-4 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-slate-100 space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                        Attorney Instruction
                      </div>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              const isReviewExpanded = Boolean(expandedReviewMsgIds[msg.id]);
              const showingInitialDraft = Boolean(
                showInitialDraftMsgIds[msg.id]
              );
              const totalObjections = msg.adversarialReviews.reduce(
                (acc, r) => acc + r.objections.length,
                0
              );

              return (
                <div
                  key={msg.id}
                  className="max-w-4xl rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl"
                >
                  {/* Assistant Header Bar */}
                  <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-100">
                            Verified Legal Work Product
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-amber-300">
                            Primary: {msg.primaryModel || 'claude-3-7-sonnet'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Multi-LLM Adversarial Audit Badge */}
                    {msg.adversarialReviews.length > 0 ? (
                      <button
                        onClick={() =>
                          setExpandedReviewMsgIds((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition"
                        title={`Reviewed on ${new Date(
                          msg.adversarialReviews[0].createdAt
                        ).toLocaleString()}`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          Peer Review: {msg.adversarialReviews.length} Checks &bull; {totalObjections} Revision(s)
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-normal pl-1 border-l border-emerald-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.adversarialReviews[0].createdAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        {isReviewExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-normal">
                        <Clock className="w-3 h-3" />
                        <span>Not yet reviewed</span>
                      </div>
                    )}
                  </div>

                  {/* Tool Calls Executed in Loop */}
                  {msg.toolCalls.length > 0 && (
                    <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Wrench className="w-3 h-3 text-amber-400" />
                        <span>
                          Research & Tool Searches ({msg.toolCalls.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.toolCalls.map((tc) => {
                          const isExpanded = Boolean(
                            expandedToolCallIds[tc.id]
                          );
                          return (
                            <div key={tc.id} className="w-full">
                              <button
                                onClick={() =>
                                  setExpandedToolCallIds((prev) => ({
                                    ...prev,
                                    [tc.id]: !prev[tc.id],
                                  }))
                                }
                                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs text-left transition"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileSearch className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="font-mono text-[11px] text-amber-300 shrink-0">
                                    {tc.toolName}
                                  </span>
                                  <span className="text-slate-300 truncate">
                                    — {tc.resultSummary}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                                  {tc.durationMs}ms
                                </span>
                              </button>
                              {isExpanded && (
                                <pre className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {tc.rawOutput}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Peer Review Drawer */}
                  {isReviewExpanded && msg.adversarialReviews.length > 0 && (
                    <div className="p-5 bg-slate-950/90 border-b border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                              Peer Review Notes & Audit Trail
                            </h4>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>
                                Reviewed {new Date(msg.adversarialReviews[0].createdAt).toLocaleDateString()}{' '}
                                at {new Date(msg.adversarialReviews[0].createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {msg.initialDraftBeforeReview && (
                          <button
                            onClick={() =>
                              setShowInitialDraftMsgIds((prev) => ({
                                ...prev,
                                [msg.id]: !prev[msg.id],
                              }))
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 border border-slate-700 transition"
                          >
                            {showingInitialDraft
                              ? 'Show Final Revised Draft'
                              : 'View Draft Before Review'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.adversarialReviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs font-semibold text-slate-100">
                                  {rev.criticTitle}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  Provider: {rev.provider.toUpperCase()} (
                                  {rev.model})
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                  rev.objections.length > 0
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {rev.objections.length > 0
                                  ? `${rev.objections.length} Objection(s) Raised & Cured`
                                  : 'Approved'}
                              </span>
                            </div>

                            {rev.objections.map((obj, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    {obj.category}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                    {obj.location}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                  <strong className="text-rose-300">
                                    Critique:{' '}
                                  </strong>
                                  {obj.critique}
                                </p>
                                <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                                  <strong>Required Cure Applied: </strong>
                                  {obj.requiredFix}
                                </p>
                              </div>
                            ))}

                            {rev.dissentingConsiderations && (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90">
                                <strong>Reviewer / Bench Note: </strong>
                                {rev.dissentingConsiderations}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Legal Work Product Content */}
                  <div className="p-6">
                    {showingInitialDraft && msg.initialDraftBeforeReview ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            Viewing{' '}
                            <strong>Draft Before Review</strong>{' '}
                            (Revised after peer review before delivery).
                          </span>
                        </div>
                        <div className="prose prose-invert max-w-none font-serif text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {msg.initialDraftBeforeReview}
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none font-serif text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Turn Progress Card */}
            {isRunningTurn && liveProgress && (
              <div className="max-w-3xl p-5 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                      Legal Assistant —{' '}
                      {liveProgress.phase.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Peer Review Active
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-100">
                  {liveProgress.statusText}
                </div>
                {liveProgress.detailText && (
                  <div className="text-xs text-slate-400">
                    {liveProgress.detailText}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Legal Prompt Composer */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
            {/* Profile-Specific Quick Sample Prompts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{activeProfile.name} Prompts:</span>
              </span>
              {(activeProfile.samplePrompts || []).map((qp, i) => (
                <button
                  key={i}
                  disabled={isRunningTurn}
                  onClick={() => handleSubmitPrompt(qp)}
                  className="px-2.5 py-1 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-[11px] text-slate-300 truncate max-w-xs transition shrink-0"
                >
                  {qp}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 bg-slate-950 border border-slate-700/90 focus-within:border-amber-500/70 rounded-xl p-3 space-y-2.5">
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSubmitPrompt();
                    }
                  }}
                  rows={2}
                  placeholder={
                    !promptInput.trim() && docNeedingReview
                      ? `Instruct ${formatAgentLabel(currentProviderConfig)} (${turnModel})... or press Send / ⌘+Enter to Peer Review "${docNeedingReview.doc.title}"`
                      : `Instruct ${formatAgentLabel(currentProviderConfig)} (${turnModel}) under ${activeProfile.name}... (⌘+Enter to send)`
                  }
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* T3-Style Agent Selector */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-amber-500/40 transition">
                      <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Agent:
                      </span>
                      <select
                        value={turnProvider}
                        onChange={(e) =>
                          handleProviderChange(e.target.value as LLMProviderId)
                        }
                        className="bg-transparent text-xs font-medium text-amber-300 focus:outline-none cursor-pointer"
                        title="Select Executing Agent Harness (as per T3)"
                      >
                        {state.providers.map((p) => {
                          const isReady = p.hasApiKey || Boolean(p.runtimeStatus?.installed);
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              className="bg-slate-900 text-slate-100"
                            >
                              {formatAgentLabel(p)}{!isReady ? ' · (Not Installed)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* T3-Style Model Selector */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-cyan-500/40 transition">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Model:
                      </span>
                      <select
                        value={turnModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="bg-transparent text-xs font-mono font-medium text-cyan-300 focus:outline-none cursor-pointer max-w-[200px] truncate"
                        title="Select Model for this Agent"
                      >
                        {availableModelsForTurnProvider.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            className="bg-slate-900 text-slate-100 font-sans"
                          >
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Practice Task Selector */}
                    <select
                      value={turnPracticeArea}
                      onChange={(e) =>
                        setTurnPracticeArea(e.target.value as PracticeAreaId)
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-300 hover:border-slate-600 transition cursor-pointer"
                      title="Practice Task"
                    >
                      {state.promptSettings.practiceAreaPresets.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="bg-slate-900 text-slate-100"
                        >
                          Task: {p.shortLabel}
                        </option>
                      ))}
                    </select>

                    {/* Review Mode Selector (simplified and lit up when doc needs review) */}
                    <select
                      value={turnReviewMode}
                      onChange={(e) =>
                        setTurnReviewMode(
                          e.target.value as AdversarialReviewMode
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer font-medium ${
                        docNeedingReview
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-slate-900 border-slate-700/80 text-emerald-300 hover:border-slate-600'
                      }`}
                      title={
                        docNeedingReview
                          ? `Peer Review recommended: "${docNeedingReview.doc.title}" was ${docNeedingReview.reason === 'edited' ? 'edited' : 'added'}`
                          : 'Review Mode'
                      }
                    >
                      <option
                        value="multi_llm_default"
                        className="bg-slate-900 text-slate-100"
                      >
                        Peer Review (Recommended)
                      </option>
                      <option
                        value="single_critic"
                        className="bg-slate-900 text-slate-100"
                      >
                        Quick Check
                      </option>
                      <option
                        value="direct_bypass"
                        className="bg-slate-900 text-slate-100"
                      >
                        Off
                      </option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      ⌘↵
                    </span>
                    <button
                      disabled={isRunningTurn || (!promptInput.trim() && !docNeedingReview)}
                      onClick={() => handleSubmitPrompt()}
                      title={
                        !promptInput.trim() && docNeedingReview
                          ? `Send Peer Review for "${docNeedingReview.doc.title}" — ⌘+Enter`
                          : `Send prompt to ${formatAgentLabel(currentProviderConfig)} (${turnModel}) — ⌘+Enter`
                      }
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition active:scale-95 cursor-pointer font-semibold ${
                        !promptInput.trim() && docNeedingReview
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.45)] ring-1 ring-amber-300'
                          : 'bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-slate-950'
                      }`}
                    >
                      {isRunningTurn ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : !promptInput.trim() && docNeedingReview ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>Peer Review</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT PANE: Redline Viewer, Matter Corpus & Chronology */}
        <RightWorkspacePane
          matterId={activeMatter.id}
          documents={state.documents}
          documentVersions={state.documentVersions}
          chronologyFacts={state.chronologyFacts}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
          onCreateDocument={async (payload) => {
            const updated = await ipcBridge.createDocument(payload);
            setState(updated);
          }}
          onUpdateDocument={async (payload) => {
            const updated = await ipcBridge.updateDocument(payload);
            setState(updated);
          }}
          onRequestReview={(doc) => {
            const promptText = `Run a comprehensive peer review on the updated document "${doc.title}" (Bates: ${doc.batesRange}). Audit citations against controlling forum law and discovery exhibits, identify weaknesses, and propose a redline revision.`;
            setPromptInput(promptText);
            setTurnReviewMode('multi_llm_default');
            handleSubmitPrompt(promptText);
          }}
          onAddChronologyFact={async (payload) => {
            const updated = await ipcBridge.addChronologyFact(payload);
            setState(updated);
          }}
        />
      </div>

      {/* Right-Click Context Menu for Matter Items */}
      {matterContextMenu && (
        <div
          style={{
            top: matterContextMenu.y,
            left: matterContextMenu.x,
          }}
          className="fixed z-50 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-mono text-slate-400 truncate">
            {matterContextMenu.matter.name}
          </div>
          <button
            onClick={() => openEditMatterDialog(matterContextMenu.matter)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-100 hover:bg-amber-500/20 hover:text-amber-300 transition"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Matter Settings (Edit Name, Docket ID...)</span>
          </button>
          <div className="my-1 border-t border-slate-800" />
          <button
            onClick={() => openDeleteMatterConfirm(matterContextMenu.matter)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Matter...</span>
          </button>
        </div>
      )}

      {/* Edit Matter Settings Dialog (Revisit Matter Name, Docket ID, Client, Forum, Citation Style, Folder, or Delete Matter) */}
      {editingMatter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Matter Settings — {editingMatter.name}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {editingMatter.id}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  Matter / Case Caption Name
                </label>
                <input
                  type="text"
                  value={editMatterName}
                  onChange={(e) => setEditMatterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Client / Defendant Name
                  </label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Docket ID / Matter Number
                  </label>
                  <input
                    type="text"
                    value={editMatterNumber}
                    onChange={(e) => setEditMatterNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Governing Jurisdiction & Court Forum
                </label>
                <input
                  type="text"
                  value={editJurisdiction}
                  onChange={(e) => setEditJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Citation Style / Manual
                  </label>
                  <input
                    type="text"
                    value={editCitationStyle}
                    onChange={(e) => setEditCitationStyle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Default Task Persona
                  </label>
                  <select
                    value={editPracticeArea}
                    onChange={(e) =>
                      setEditPracticeArea(e.target.value as PracticeAreaId)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    {state.promptSettings.practiceAreaPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Local Matter Workspace Folder Path
                </label>
                <input
                  type="text"
                  value={editFolderPath}
                  onChange={(e) => setEditFolderPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const target = editingMatter;
                  setEditingMatter(null);
                  openDeleteMatterConfirm(target);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-medium text-rose-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Matter...</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMatter(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const updated = await ipcBridge.updateMatter({
                      matterId: editingMatter.id,
                      name: editMatterName,
                      clientName: editClientName,
                      matterNumber: editMatterNumber,
                      practiceArea: editPracticeArea,
                      jurisdiction: editJurisdiction,
                      citationStyle: editCitationStyle,
                      folderPath: editFolderPath,
                    });
                    setState(updated);
                    if (editingMatter.id === activeMatter.id) {
                      setTurnPracticeArea(editPracticeArea);
                    }
                    setEditingMatter(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
                >
                  Save Matter Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Matter Confirmation Dialog */}
      {deletingMatter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-900 border border-rose-500/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Confirm Permanent Matter Deletion
                </h3>
                <p className="text-[11px] text-rose-300 font-mono">
                  {deletingMatter.matterNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-100">{deletingMatter.name}</strong>{' '}
                ({deletingMatter.clientName})?
              </p>
              <p className="text-[11px] text-slate-400">
                This action will remove the Matter and all associated legal
                messages, indexed discovery documents, redline
                versions, and chronology facts from the local database. This
                cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeletingMatter(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition"
              >
                Cancel & Keep Matter
              </button>
              <button
                onClick={async () => {
                  const targetId = deletingMatter.id;
                  setDeletingMatter(null);
                  const updated = await ipcBridge.deleteMatter(targetId);
                  setState(updated);
                  const nextActive = updated.matters.find(
                    (m) => m.id === updated.activeMatterId
                  );
                  if (nextActive) {
                    setTurnPracticeArea(nextActive.practiceArea);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Permanently Delete Matter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Governance & Practitioner Profile Settings Modal */}
      <PromptGovernanceModal
        isOpen={isStudioOpen}
        initialTab={studioInitialTab}
        onClose={() => setIsStudioOpen(false)}
        promptSettings={state.promptSettings}
        adversarialConfig={state.adversarialConfig}
        providers={state.providers}
        activeMatter={activeMatter}
        assembledPromptPreview={state.assembledPromptPreview}
        onSelectPractitionerProfile={async (profileId) => {
          const next = await ipcBridge.selectPractitionerProfile(profileId);
          setState(next);
          setTurnPracticeArea(next.promptSettings.activePracticeAreaId);
        }}
        onSavePromptSettings={async (updated) => {
          const next = await ipcBridge.savePromptSettings(updated);
          setState(next);
        }}
        onResetPromptSettings={async () => {
          const next = await ipcBridge.resetPromptSettings();
          setState(next);
        }}
        onSaveAdversarialConfig={async (updated) => {
          const next = await ipcBridge.saveAdversarialConfig(updated);
          setState(next);
          if (updated.mode) setTurnReviewMode(updated.mode);
        }}
        onSaveProviderCredential={async (payload) => {
          const next = await ipcBridge.saveProviderCredential(payload);
          setState(next);
        }}
        onUpdateMatterJurisdiction={async (payload) => {
          const next = await ipcBridge.updateMatterJurisdiction(payload);
          setState(next);
        }}
        courtListenerAssurance={state.agentOnboarding?.courtListenerAssurance}
        customMcpServers={state.customMcpServers}
        onSaveCourtListenerToken={async (token) => {
          const next = await ipcBridge.saveCourtListenerToken(token);
          setState(next);
        }}
        onInstallCourtListenerOnDefaultAgent={async (driver) => {
          const next = await ipcBridge.installCourtListenerOnDefaultAgent(driver);
          setState(next);
        }}
        onSaveCustomMcpServer={async (server) => {
          const next = await ipcBridge.saveCustomMcpServer(server);
          setState(next);
        }}
        onDeleteCustomMcpServer={async (serverId) => {
          const next = await ipcBridge.deleteCustomMcpServer(serverId);
          setState(next);
        }}
        onOpenExternalUrl={async (url) => {
          await ipcBridge.openExternalUrl(url);
        }}
      />

      {/* New Legal Matter Modal */}
      {showNewMatterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100">
              Create New Legal Matter Workspace ({activeProfile.name})
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  Matter / Case Caption
                </label>
                <input
                  type="text"
                  value={newMatterName}
                  onChange={(e) => setNewMatterName(e.target.value)}
                  placeholder="e.g., State of Vermont v. Jordan Mercer"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Client / Defendant Name
                  </label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Jordan Mercer"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Docket ID / Matter No.
                  </label>
                  <input
                    type="text"
                    value={newMatterNumber}
                    onChange={(e) => setNewMatterNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">
                  Governing Jurisdiction & Forum
                </label>
                <input
                  type="text"
                  value={newMatterJurisdiction}
                  onChange={(e) => setNewMatterJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Citation Manual
                  </label>
                  <input
                    type="text"
                    value={newMatterCitation}
                    onChange={(e) => setNewMatterCitation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">
                    Default Task Persona
                  </label>
                  <select
                    value={newMatterPracticeArea}
                    onChange={(e) =>
                      setNewMatterPracticeArea(e.target.value as PracticeAreaId)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
                  >
                    {state.promptSettings.practiceAreaPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewMatterModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newMatterName.trim()) return;
                  const updated = await ipcBridge.createMatter({
                    name: newMatterName.trim(),
                    clientName: newClientName.trim() || 'Client',
                    matterNumber: newMatterNumber.trim() || '26-CR-00001',
                    practiceArea: newMatterPracticeArea,
                    jurisdiction: newMatterJurisdiction.trim(),
                    citationStyle: newMatterCitation.trim(),
                  });
                  setState(updated);
                  setNewMatterName('');
                  setNewClientName('');
                  setShowNewMatterModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs"
              >
                Create Matter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* T3-Style Connect Your Agents Onboarding & Multi-Account Modal */}
      {state.agentOnboarding && (
        <ConnectAgentsModal
          isOpen={isConnectAgentsOpen}
          onClose={() => setIsConnectAgentsOpen(false)}
          onboarding={state.agentOnboarding}
          matters={state.matters}
          activeMatterId={activeMatter.id}
          onCompleteOnboarding={async () => {
            const next = await ipcBridge.completeAgentOnboarding();
            setState(next);
          }}
          onRefreshConnections={async () => {
            const next = await ipcBridge.refreshAgentConnections();
            setState(next);
          }}
          onAddCodexAccount={async (label) => {
            const next = await ipcBridge.addCodexAccount(label);
            setState(next);
          }}
          onRemoveCodexAccount={async (instanceId) => {
            const next = await ipcBridge.removeCodexAccount(instanceId);
            setState(next);
          }}
          onStartSetupCommand={async (payload) => {
            return ipcBridge.startAgentSetupCommand(payload);
          }}
          onStopSetupCommand={async (sessionId) => {
            const next = await ipcBridge.stopAgentSetupCommand(sessionId);
            setState(next);
          }}
          onOpenExternalUrl={async (url) => {
            await ipcBridge.openExternalUrl(url);
          }}
          onSubscribeSetupTerminal={(callback) => {
            return ipcBridge.onAgentSetupTerminal(callback);
          }}
          onSelectMatter={async (matterId) => {
            const next = await ipcBridge.selectMatter(matterId);
            setState(next);
          }}
          onOpenNewMatterModal={() => {
            setNewMatterJurisdiction(activeProfile.defaultJurisdiction);
            setNewMatterCitation(activeProfile.defaultCitationStyle);
            setNewMatterPracticeArea(activeProfile.activePracticeAreaId);
            setShowNewMatterModal(true);
          }}
        />
      )}
    </div>
  );
};
