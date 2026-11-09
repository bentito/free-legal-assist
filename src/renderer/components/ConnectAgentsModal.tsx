import React, { useEffect, useState } from 'react';
import {
  AgentConnectionInstance,
  AgentOnboardingState,
  AgentSetupTerminalEvent,
  Matter,
} from '../../shared/types';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FolderOpen,
  Laptop,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  Server,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';

interface ConnectAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onboarding: AgentOnboardingState;
  matters: Matter[];
  activeMatterId: string;
  onCompleteOnboarding: () => Promise<void>;
  onRefreshConnections: () => Promise<void>;
  onAddCodexAccount: (accountName: string) => Promise<void>;
  onRemoveCodexAccount: (instanceId: string) => Promise<void>;
  onStartSetupCommand: (payload: {
    instanceId: string;
    mode: 'install' | 'login' | 'custom';
    customCommand?: string;
  }) => Promise<{ sessionId: string }>;
  onStopSetupCommand: (sessionId: string) => Promise<void>;
  onOpenExternalUrl: (url: string) => Promise<void>;
  onSubscribeSetupTerminal: (
    callback: (event: AgentSetupTerminalEvent) => void
  ) => () => void;
  onSaveCourtListenerToken: (token: string) => Promise<void>;
  onInstallCourtListenerOnDefaultAgent: () => Promise<void>;
  onSelectMatter: (matterId: string) => Promise<void>;
  onOpenNewMatterModal: () => void;
}

const STEPS = ['Connect', 'Agents', 'Projects'] as const;

const RedactedSensitiveEmail: React.FC<{ email: string }> = ({ email }) => {
  const [revealed, setRevealed] = useState(false);

  const maskEmail = (raw: string) => {
    const [localPart, domain] = raw.split('@');
    if (!domain) return '••••••';
    const visiblePrefix = localPart.slice(0, 2);
    return `${visiblePrefix}••••••@${domain}`;
  };

  return (
    <button
      type="button"
      onClick={() => setRevealed((prev) => !prev)}
      title={revealed ? 'Click to hide email' : 'Click to reveal account email'}
      className="text-left font-mono text-[11px] text-neutral-400 hover:text-neutral-200 transition underline decoration-dotted underline-offset-2"
    >
      {revealed ? email : maskEmail(email)}
    </button>
  );
};

const ProviderAvatarIcon: React.FC<{
  driver: 'codex' | 'claudeAgent' | 'antigravity';
}> = ({ driver }) => {
  if (driver === 'codex') {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-700/80 bg-neutral-950 text-neutral-100 shadow-inner">
        {/* OpenAI Codex style knot icon */}
        <svg
          viewBox="0 0 24 24"
          className="size-5 text-neutral-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a4.5 4.5 0 0 0-3.89 2.25L4.5 10.5a4.5 4.5 0 0 0 0 4.5l3.61 6.25a4.5 4.5 0 0 0 7.78 0l3.61-6.25a4.5 4.5 0 0 0 0-4.5L15.89 4.25A4.5 4.5 0 0 0 12 2Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
    );
  }

  if (driver === 'claudeAgent') {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#d97757]/35 bg-[#d97757]/15 text-[#e68a6b] shadow-inner">
        {/* Claude starburst icon */}
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/35 bg-sky-500/15 text-sky-300 shadow-inner">
      {/* Antigravity ACP diamond/orbit icon */}
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 19 12 12 22 5 12 12 2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    </div>
  );
};

export const ConnectAgentsModal: React.FC<ConnectAgentsModalProps> = ({
  isOpen,
  onClose,
  onboarding,
  matters,
  activeMatterId,
  onCompleteOnboarding,
  onRefreshConnections,
  onAddCodexAccount,
  onRemoveCodexAccount,
  onStartSetupCommand,
  onStopSetupCommand,
  onOpenExternalUrl,
  onSubscribeSetupTerminal,
  onSaveCourtListenerToken,
  onInstallCourtListenerOnDefaultAgent,
  onSelectMatter,
  onOpenNewMatterModal,
}) => {
  // Replicate T3 Code's onboarding stepper: opens directly on Step 1 ('Agents', index 1)
  // when resuming local setup so it matches `image.png` immediately.
  const [stepIndex, setStepIndex] = useState<number>(1);
  const [setupMode, setSetupMode] = useState<'local' | 'remote'>('local');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CourtListener MCP Assurance State
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);

  // Add ChatGPT Account modal state (replicates T3's `Ae` dialog in CodexSetupSection)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountLabel, setNewAccountLabel] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Inline Setup Terminal Drawer state (replicates T3's `Vt` terminal drawer in welcome.js)
  const [activeTerminalSession, setActiveTerminalSession] = useState<{
    sessionId: string;
    instanceId: string;
    title: string;
  } | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<Record<string, string>>({});
  const [terminalRunning, setTerminalRunning] = useState<Record<string, boolean>>({});
  const [terminalAuthUrls, setTerminalAuthUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = onSubscribeSetupTerminal((evt) => {
      setTerminalLogs((prev) => ({
        ...prev,
        [evt.instanceId]: evt.output || prev[evt.instanceId] || '',
      }));
      const isDone = evt.phase === 'completed' || evt.phase === 'failed';
      setTerminalRunning((prev) => ({
        ...prev,
        [evt.instanceId]: !isDone,
      }));
      if (evt.detectedAuthUrl) {
        setTerminalAuthUrls((prev) => ({
          ...prev,
          [evt.instanceId]: evt.detectedAuthUrl!,
        }));
      }
      if (isDone) {
        void onRefreshConnections();
      }
    });
    return () => unsubscribe();
  }, [isOpen, onSubscribeSetupTerminal, onRefreshConnections]);

  if (!isOpen) return null;

  const handleRunSetupAction = async (
    instance: AgentConnectionInstance,
    mode: 'install' | 'login'
  ) => {
    const title =
      mode === 'install'
        ? `Install ${instance.displayName}`
        : instance.driver === 'codex'
          ? `Sign in to ${instance.displayName}`
          : `Authenticate ${instance.displayName}`;

    setTerminalLogs((prev) => ({
      ...prev,
      [instance.instanceId]: '',
    }));
    setTerminalRunning((prev) => ({
      ...prev,
      [instance.instanceId]: true,
    }));

    const { sessionId } = await onStartSetupCommand({
      instanceId: instance.instanceId,
      mode,
    });

    setActiveTerminalSession({
      sessionId,
      instanceId: instance.instanceId,
      title,
    });
  };

  const handleCreateCodexAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAccountLabel.trim();
    if (!trimmed || isAddingAccount) return;
    setIsAddingAccount(true);
    try {
      await onAddCodexAccount(trimmed);
      setNewAccountLabel('');
      setShowAddAccountModal(false);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleCloseModal = async () => {
    if (!onboarding.completedAt) {
      await onCompleteOnboarding();
    }
    onClose();
  };

  const activeTerminalOutput = activeTerminalSession
    ? terminalLogs[activeTerminalSession.instanceId] || ''
    : '';
  const isTerminalActiveRunning = activeTerminalSession
    ? Boolean(terminalRunning[activeTerminalSession.instanceId])
    : false;
  const activeDetectedUrl = activeTerminalSession
    ? terminalAuthUrls[activeTerminalSession.instanceId]
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      {/* Main T3-Style Onboarding & Agent Connection Card */}
      <div className="relative w-full max-w-[680px] rounded-2xl border border-neutral-800 bg-[#111113] text-neutral-100 shadow-2xl overflow-hidden">
        {/* Top Bar: App Title + 1 Connect · 2 Agents · 3 Projects Stepper + Close X */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-400">
              <Scale className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-100">
              LexHarness
            </span>
          </div>

          {/* 3-Step Indicator matching T3 Code (`1 Connect · 2 Agents · 3 Projects`) */}
          <div className="flex items-center gap-2 text-xs">
            {STEPS.map((label, idx) => {
              const isCompleted = idx < stepIndex;
              const isCurrent = idx === stepIndex;
              return (
                <React.Fragment key={label}>
                  {idx > 0 && <span className="text-neutral-700">&middot;</span>}
                  <button
                    type="button"
                    onClick={() => setStepIndex(idx)}
                    className={`inline-flex items-center gap-1.5 transition ${
                      isCurrent
                        ? 'font-medium text-neutral-100'
                        : isCompleted
                          ? 'text-neutral-400 hover:text-neutral-200'
                          : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <span
                      className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : isCurrent
                            ? 'bg-neutral-100 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {isCompleted ? <Check className="size-2.5" /> : idx + 1}
                    </span>
                    <span>{label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="inline-flex size-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-100 transition"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="px-7 pb-7 pt-2">
          {/* STEP 0: Connect (Local vs Remote Machine) */}
          {stepIndex === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-neutral-100">
                  How are you setting up LexHarness?
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Run legal CLI agents directly on this workstation or connect to a
                  remote legal sandbox.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSetupMode('local')}
                  className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition ${
                    setupMode === 'local'
                      ? 'border-neutral-200 bg-neutral-900/90'
                      : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-100">
                    <Laptop className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">
                      On this computer
                    </div>
                    <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                      Everything runs locally on{' '}
                      <span className="text-neutral-200 font-medium">
                        {onboarding.machineLabel}
                      </span>
                      . Best for privileged client discovery and single-machine
                      setups.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSetupMode('remote')}
                  className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition ${
                    setupMode === 'remote'
                      ? 'border-neutral-200 bg-neutral-900/90'
                      : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-100">
                    <Server className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">
                      Remote server / Firm Enclave
                    </div>
                    <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                      Connect to a self-hosted firm server or remote workstation
                      over SSH/Tailscale.
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition"
                >
                  <span>Continue</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Connect your agents (Matches `image.png` from T3 Code) */}
          {stepIndex === 1 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-100">
                    Connect your agents
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Choose an agent to start coding. You can add more later.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefreshConnections();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  title="Re-probe local CLI binaries and auth sessions"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white transition"
                >
                  <RefreshCw
                    className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Machine Name Subheader (`Brett's MacBook Pro`) */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-neutral-200">
                  {onboarding.machineLabel}
                </div>

                {/* Agent Connection Cards */}
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5">
                  {onboarding.agentInstances.map((instance) => {
                    const isReady = instance.status === 'ready';
                    const isCustomCodex = Boolean(instance.isAdditionalAccount);

                    return (
                      <div
                        key={instance.instanceId}
                        className="rounded-xl border border-neutral-800/90 bg-[#17171a] px-4 py-3.5 transition hover:border-neutral-700/80"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3.5">
                            <ProviderAvatarIcon driver={instance.driver} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-neutral-100 truncate">
                                  {instance.displayName}
                                </span>
                                {instance.version && (
                                  <span className="rounded bg-neutral-800/90 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">
                                    {instance.version}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-neutral-400 truncate">
                                {instance.headline}
                              </p>
                              {instance.email && (
                                <div className="mt-0.5">
                                  <RedactedSensitiveEmail
                                    email={instance.email}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Status / Action Controls */}
                          <div className="flex shrink-0 items-center gap-2">
                            {isReady ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                <Check className="size-3.5 stroke-[2.5]" />
                                <span>Ready</span>
                              </span>
                            ) : !instance.installed ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRunSetupAction(instance, 'install')
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 transition"
                              >
                                <Terminal className="size-3.5" />
                                <span>Install</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRunSetupAction(instance, 'login')
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition"
                              >
                                <span>
                                  {instance.driver === 'codex'
                                    ? 'Continue with ChatGPT'
                                    : 'Sign in'}
                                </span>
                              </button>
                            )}

                            {/* Re-auth / Terminal status button even when ready */}
                            {instance.installed && isReady && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRunSetupAction(instance, 'login')
                                }
                                title="Re-authenticate or switch account session"
                                className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1 text-[11px] text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition"
                              >
                                Re-auth
                              </button>
                            )}

                            {isCustomCodex && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRemoveCodexAccount(instance.instanceId)
                                }
                                title="Remove this ChatGPT account instance"
                                className="inline-flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-rose-500/15 hover:text-rose-300 transition"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Setup Terminal Drawer (Replicates T3 Code's `Vt` in `welcome.js`) */}
                {activeTerminalSession && (
                  <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-200">
                        <Terminal className="size-3.5 text-amber-400" />
                        <span>{activeTerminalSession.title}</span>
                        {isTerminalActiveRunning && (
                          <Loader2 className="size-3.5 animate-spin text-amber-400" />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {activeDetectedUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenExternalUrl(activeDetectedUrl)
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30 transition"
                          >
                            <ExternalLink className="size-3" />
                            <span>Open sign-in page</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            await onStopSetupCommand(
                              activeTerminalSession.sessionId
                            );
                            setActiveTerminalSession(null);
                            await onRefreshConnections();
                          }}
                          className="rounded-lg border border-neutral-800 px-2 py-1 text-[11px] text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition"
                        >
                          Done
                        </button>
                      </div>
                    </div>

                    <pre className="max-h-40 overflow-y-auto rounded-lg bg-black/80 border border-neutral-900 p-2.5 font-mono text-[11px] text-neutral-300 whitespace-pre-wrap select-text">
                      {activeTerminalOutput ||
                        'Launching agent setup command...'}
                    </pre>
                  </div>
                )}

                {/* Base Case Law Tooling: CourtListener MCP Assurance Card */}
                {onboarding.courtListenerAssurance && (
                  <div className="rounded-xl border border-neutral-800/90 bg-[#17171a] p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/10 text-amber-400">
                          <Scale className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-neutral-100">
                              Base Legal Tooling &bull; CourtListener MCP
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                onboarding.courtListenerAssurance.status === 'ready'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : onboarding.courtListenerAssurance.status === 'needs_token'
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                              }`}
                            >
                              {onboarding.courtListenerAssurance.status === 'ready'
                                ? 'Ready & Configured'
                                : onboarding.courtListenerAssurance.status === 'needs_token'
                                  ? 'Installed \u00b7 Token Optional'
                                  : 'Not Configured'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-neutral-300">
                            {onboarding.courtListenerAssurance.statusHeadline}
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-400 leading-relaxed">
                            {onboarding.courtListenerAssurance.statusDetail}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenExternalUrl(
                              onboarding.courtListenerAssurance.signupUrl
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1 text-xs text-neutral-200 hover:border-neutral-600 hover:text-white transition"
                        >
                          <ExternalLink className="size-3" />
                          <span>Create Free Account</span>
                        </button>

                        {!onboarding.courtListenerAssurance.hasInstalledAgent && (
                          <button
                            type="button"
                            onClick={onInstallCourtListenerOnDefaultAgent}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/25 transition"
                          >
                            <span>Install on Default Agent</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTokenInput(!showTokenInput)}
                          className="text-xs text-neutral-400 hover:text-neutral-200 underline decoration-dotted transition"
                        >
                          {onboarding.courtListenerAssurance.hasAuthToken
                            ? 'Update API Token'
                            : 'Add Free API Token'}
                        </button>
                      </div>
                    </div>

                    {showTokenInput && (
                      <div className="mt-2 rounded-lg bg-black/60 border border-neutral-800 p-2.5 space-y-2">
                        <label className="text-[11px] text-neutral-300 block">
                          CourtListener REST API v4 Token (free tier unlocks 5,000 req/hr live case law access)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder={
                              onboarding.courtListenerAssurance.maskedAuthToken ||
                              'Paste API token from courtlistener.com...'
                            }
                            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-100 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={isSavingToken || !tokenInput.trim()}
                            onClick={async () => {
                              setIsSavingToken(true);
                              try {
                                await onSaveCourtListenerToken(tokenInput.trim());
                                setTokenInput('');
                                setShowTokenInput(false);
                              } finally {
                                setIsSavingToken(false);
                              }
                            }}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50 transition"
                          >
                            {isSavingToken ? 'Saving...' : 'Save & Sync'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Secondary Action: `Connect another ChatGPT account` (Exact match to `image.png`) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-[#17171a] px-3.5 py-2 text-xs font-medium text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/80 transition"
                  >
                    <span>Connect another ChatGPT account</span>
                  </button>
                </div>
              </div>

              {/* Footer: `Continue ->` */}
              <div className="flex items-center justify-end pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    await onCompleteOnboarding();
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition"
                >
                  <span>Continue</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Projects / Legal Matters */}
          {stepIndex === 2 && (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-100">
                    Add your first legal matter
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Pick a local matter folder for your legal agents to work in.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewMatterModal();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 transition"
                >
                  <Plus className="size-3.5" />
                  <span>New Matter</span>
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {matters.map((m) => {
                  const isSelected = m.id === activeMatterId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={async () => {
                        await onSelectMatter(m.id);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-neutral-800 bg-[#17171a] hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderOpen className="size-4 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-neutral-100 truncate">
                            {m.name}
                          </div>
                          <div className="text-xs text-neutral-400 font-mono truncate">
                            {m.matterNumber} &bull; {m.folderPath}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 shrink-0">
                          <Check className="size-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStepIndex(1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 px-3.5 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await onCompleteOnboarding();
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition"
                >
                  <span>Start LexHarness</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Modal: `Add ChatGPT account` (Replicates T3 Code's `Ae` in `CodexSetupSection-D8WpB4Jb.js`) */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#141417] p-6 text-neutral-100 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                Add ChatGPT account
              </h3>
              <p className="mt-1 text-xs text-neutral-400">
                Save a name first, then sign in with ChatGPT to finish connecting
                an isolated Codex shadow-home profile.
              </p>
            </div>

            <form onSubmit={handleCreateCodexAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newAccountLabel}
                  onChange={(e) => setNewAccountLabel(e.target.value)}
                  placeholder="Work, Personal, Firm Pro..."
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-neutral-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="rounded-xl border border-neutral-800 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAccountLabel.trim() || isAddingAccount}
                  className="rounded-xl bg-white px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 disabled:opacity-40 transition"
                >
                  {isAddingAccount ? 'Adding...' : 'Add account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
