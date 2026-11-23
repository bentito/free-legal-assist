import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileSearch,
  Gavel,
  Play,
  RotateCcw,
  Scale,
  Send,
  Settings2,
  X,
} from 'lucide-react';
import type { StudioTab } from './PromptGovernanceModal';

export type TourDialogState = 'none' | 'settings' | 'connect_agents';

export type TourCardPlacement =
  | 'center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-corner-right'
  | 'top-right'
  | 'top-left';

export interface TourUiSyncState {
  openDialog: TourDialogState;
  settingsTab?: StudioTab;
  preferredTab?: 'redline' | 'corpus' | 'chronology';
}

export interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeMatterId: string;
  isSampleCaseLoaded: boolean;
  onLoadSampleCase: () => Promise<void>;
  onCloseSampleCase: (options?: { removeSample?: boolean }) => Promise<void>;
  onSelectTab?: (tab: 'redline' | 'corpus' | 'chronology') => void;
  onSyncTourUiState?: (uiState: TourUiSyncState) => void;
}

export interface TourPoint {
  text: string;
  targetSelector: string;
  preferredTab?: 'redline' | 'corpus' | 'chronology';
  openDialog?: TourDialogState;
  settingsTab?: StudioTab;
  cardPlacement?: TourCardPlacement;
}

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  subtitle: string;
  category: string;
  icon?: React.ReactNode;
  points: TourPoint[];
  content: string[];
  keyHighlight?: string;
  cardPlacement: TourCardPlacement;
  preferredTab?: 'redline' | 'corpus' | 'chronology';
  openDialog?: TourDialogState;
  settingsTab?: StudioTab;
}

const createTourStep = (step: Omit<TourStep, 'content'>): TourStep => ({
  ...step,
  content: step.points.map((p) => p.text),
});

export const TOUR_STEPS: TourStep[] = [
  createTourStep({
    id: 'why_lexharness',
    targetSelector: '#tour-model-selector',
    title: 'Welcome to LexHarness',
    subtitle: 'Repurposing Coding Agents for Legal Work — Why Agents Beat Chatbots',
    category: 'Why LexHarness?',
    icon: <Compass className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Why Coding Agents Beat Chatbots for Task Work: Chatbots generate single-shot replies from memory. Coding agents (OpenAI Codex, Claude Code, Antigravity) are built for multi-step task work—searching files, running verification tools, checking exact line citations, and revising drafts.',
        targetSelector: '#tour-model-selector',
        openDialog: 'none',
        cardPlacement: 'top-left',
      },
      {
        text: 'Repurposed for Law via Settings Prompts: LexHarness redirects coding agents from software engineering to legal work through layered system prompts in Settings. Defaults currently cover Vermont Criminal Defense and a plain General Legal Practice profile, with profiles for many more locales and practice types coming soon.',
        targetSelector: '#tour-settings-profile-bar',
        openDialog: 'settings',
        settingsTab: 'layer1_core',
        cardPlacement: 'bottom-corner-right',
      },
      {
        text: 'Setting Up Your Coding Agents: Connect your OpenAI Codex, Claude Code, or Antigravity account here in one click—or use the built-in offline legal simulator to explore immediately.',
        targetSelector: '#tour-connect-agents-list',
        openDialog: 'connect_agents',
        cardPlacement: 'bottom-right',
      },
      {
        text: 'Grounded in Discovery Exhibits: Instead of guessing facts, agents search your indexed case files by Bates number (e.g., STATE-0001, STATE-BWC-0009) so every factual claim is anchored to the record.',
        targetSelector: '#tour-corpus-tab',
        openDialog: 'none',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Second-Chair Review & Local PII Shield: Every draft is audited in parallel by a Citation & Record Auditor and Opposing Counsel while the Privileged PII Shield scrubs client identifiers locally before cloud dispatch.',
        targetSelector: '#tour-review-gate',
        openDialog: 'none',
        cardPlacement: 'bottom-right',
      },
    ],
    keyHighlight:
      'Use Next (or click any point) to step through each highlight—LexHarness automatically opens the relevant workspace pane or settings dialog.',
    cardPlacement: 'top-left',
  }),
  createTourStep({
    id: 'welcome_docket',
    targetSelector: '#tour-matter-overview',
    title: '1. Matters, Case Issues & Settled Docket',
    subtitle: 'Organizing Casework & Focused Legal Inquiries',
    category: 'Matters & Case Issues',
    icon: <Scale className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Matters & Nested Case Issues: Each Matter holds your full discovery record, while nested Case Issues isolate specific motions or inquiries (such as a Motion to Suppress vs. a Witness Impeachment Matrix) that share those exhibits.',
        targetSelector: '#tour-matter-overview',
        openDialog: 'none',
        cardPlacement: 'center',
      },
      {
        text: 'New Matter: Create a case workspace configured with its governing court forum, docket number, and citation manual.',
        targetSelector: '#tour-new-matter-btn',
        openDialog: 'none',
        cardPlacement: 'center',
      },
      {
        text: 'New Case Issue: Start a focused legal workstream (such as Trooper Keller BWC Impeachment Matrix) under the active matter.',
        targetSelector: '#tour-new-issue-btn',
        openDialog: 'none',
        cardPlacement: 'center',
      },
      {
        text: 'Settled Drawer: Archive completed matters and resolved Case Issues to keep your active docket focused without losing prior research.',
        targetSelector: '#tour-settled-drawer',
        openDialog: 'none',
        cardPlacement: 'center',
      },
    ],
    keyHighlight:
      'Break complex matters into focused Case Issues that share the same discovery corpus, then incorporate their findings back into your brief.',
    cardPlacement: 'center',
  }),
  createTourStep({
    id: 'corpus_discovery',
    targetSelector: '#tour-corpus-tab',
    title: '2. Discovery Exhibits & Folder Auto-Sync',
    subtitle: 'Word (.docx), PDF, Spreadsheets, RTF & Live Folder Watching',
    category: 'Evidence & Intake',
    icon: <FileSearch className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Bates-Indexed Record: Exhibits, pleadings, and depositions are indexed with Bates stamps (STATE-0001 to STATE-0005, STATE-BWC-0009, DEF-DEP-0018) so agents cite exact pages and timestamps.',
        targetSelector: '#tour-corpus-tab',
        openDialog: 'none',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Multi-Format Import: Ingest .docx (preserving legal numbering, tables, footnotes, Word Tracked Changes, and comments), .pdf, .xlsx, .csv, .rtf, .txt, and .md files via file picker or drag-and-drop.',
        targetSelector: '#tour-import-file-btn',
        openDialog: 'none',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Sync Folder: Link a local matter folder on disk so new supplemental disclosures are automatically indexed as soon as they are saved.',
        targetSelector: '#tour-sync-folder-btn',
        openDialog: 'none',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
    ],
    keyHighlight:
      'Link a local case folder once—whenever new disclosures arrive on disk, LexHarness indexes them automatically.',
    cardPlacement: 'bottom-left',
    preferredTab: 'corpus',
  }),
  createTourStep({
    id: 'agents_composer',
    targetSelector: '#tour-composer',
    title: '3. Legal Drafting, Task Presets & PII Protection',
    subtitle: 'Task-Specific Standards, Model Selection & Local Anonymization',
    category: 'Drafting & Privacy',
    icon: <Send className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Drafting & Record Queries: Instruct your agent to draft motions, cross-examine officer affidavits against body-worn camera transcripts, or build chronology tables grounded in your exhibits.',
        targetSelector: '#tour-composer',
        openDialog: 'none',
        cardPlacement: 'top-left',
      },
      {
        text: 'Sample Legal Prompts: Insert ready-to-run practitioner prompts tailored to your active profile.',
        targetSelector: '#tour-sample-prompts-btn',
        openDialog: 'none',
        cardPlacement: 'top-left',
      },
      {
        text: 'Practice Task Focus: Select the active legal task (e.g., Suppression & Art. 11, Discovery & Impeachment, Bail, or Civil Litigation) to apply task-specific legal standards.',
        targetSelector: '#tour-task-selector',
        openDialog: 'none',
        cardPlacement: 'top-left',
      },
      {
        text: 'Agent, Model & Privileged PII Shield: Choose your coding agent, frontier model, and review mode. Client names, SSNs, DOBs, and addresses are scrubbed locally before cloud dispatch and restored on return.',
        targetSelector: '#tour-model-selector',
        openDialog: 'none',
        cardPlacement: 'top-left',
      },
    ],
    keyHighlight:
      'Privileged PII Shield masks sensitive client identifiers on your machine while keeping Bates stamps and legal citations intact.',
    cardPlacement: 'top-left',
  }),
  createTourStep({
    id: 'adversarial_review_gate',
    targetSelector: '#tour-review-gate',
    title: '4. Adversarial Peer Review & Issue Branching',
    subtitle: 'Citation & Record Auditor, Opposing Counsel & Checkpoint Forks',
    category: 'Peer Review',
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Parallel Second-Chair Review: Before finalizing a response, two independent critics review the initial draft—the Citation & Record Auditor verifies Bates pinpoints and authorities, while Opposing Counsel challenges weak inferences and procedural gaps.',
        targetSelector: '#tour-review-gate',
        openDialog: 'none',
        cardPlacement: 'bottom-right',
      },
      {
        text: 'Execution & Audit Trace: Expand the summary line above any response to inspect exhibit searches, reviewer objections and cures, PII masking counts, and the pre-review draft.',
        targetSelector: '#tour-trace-summary-btn',
        openDialog: 'none',
        cardPlacement: 'bottom-right',
      },
      {
        text: 'Spin Off Issue: Branch a new Case Issue directly from any response checkpoint to pursue a subsidiary legal question without cluttering the main thread.',
        targetSelector: '#tour-spin-off-issue-btn',
        openDialog: 'none',
        cardPlacement: 'bottom-right',
      },
    ],
    keyHighlight:
      'Expand the trace bar on any response to see every objection raised by the Citation Auditor and Opposing Counsel—and how the final draft cured them.',
    cardPlacement: 'bottom-right',
  }),
  createTourStep({
    id: 'work_product_editing',
    targetSelector: '#tour-redline-pane',
    title: '5. Redlines, Master Brief Synthesis & Word Export',
    subtitle: 'Version Comparison, Issue Consolidation & Native Tracked Changes',
    category: 'Redlines & Export',
    icon: <BookOpen className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Side-by-Side Redlines: Compare the initial draft against the post-review revision with word-level diffs and reviewer rationale.',
        targetSelector: '#tour-redline-pane',
        openDialog: 'none',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Version History & In-Place Editing: Switch between saved draft versions, edit text directly in place, and trigger a 1-click re-audit after manual edits.',
        targetSelector: '#tour-redline-version-bar',
        openDialog: 'none',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Synthesize Master Brief: Incorporate findings from individual Case Issues or click "Synthesize Master Brief" to consolidate all open issues into a single unified pleading.',
        targetSelector: '#tour-case-issues-lineage',
        openDialog: 'none',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Export .docx with Tracked Changes: Export any response to Microsoft Word with native Tracked Changes and peer-review objections attached as margin comments.',
        targetSelector: '#tour-export-docx-msg-btn',
        openDialog: 'none',
        preferredTab: 'redline',
        cardPlacement: 'bottom-right',
      },
    ],
    keyHighlight:
      'Exported .docx files open in Microsoft Word, LibreOffice, or Google Docs with native Tracked Changes and reviewer margin comments.',
    cardPlacement: 'bottom-left',
    preferredTab: 'redline',
  }),
  createTourStep({
    id: 'governance_settings',
    targetSelector: '#tour-settings-prompt-layers',
    title: '6. System Prompts, Research Tools & Privacy Controls',
    subtitle: 'Customizing How Coding Agents Practice Law in Your Jurisdiction',
    category: 'Settings & Governance',
    icon: <Settings2 className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: '4-Layer Legal Prompt Harness: Edit the Core Legal Principles, Practice Task Presets, Matter Forum Rules, and Reviewer instructions that govern your agents. Use the built-in Vermont Criminal Defense or General Legal Practice profiles today, or customize the prompts for your own jurisdiction as more locale profiles roll out.',
        targetSelector: '#tour-settings-prompt-layers',
        openDialog: 'settings',
        settingsTab: 'layer1_core',
        cardPlacement: 'bottom-corner-right',
      },
      {
        text: 'CourtListener & Legal MCP Tools: Equip your connected coding agents with live CourtListener caselaw verification and custom Model Context Protocol (MCP) research servers.',
        targetSelector: '#tour-settings-mcp-panel',
        openDialog: 'settings',
        settingsTab: 'legal_mcp',
        cardPlacement: 'bottom-corner-right',
      },
      {
        text: 'Privacy & Routing Policies: Choose between Dynamic Smart Routing (ONNX complexity triage), Force Frontier Reasoning, or Strict Local-Only (Air-Gapped) execution.',
        targetSelector: '#tour-settings-privacy-panel',
        openDialog: 'settings',
        settingsTab: 'privacy_routing',
        cardPlacement: 'bottom-corner-right',
      },
      {
        text: 'Workspace Controls: Open Settings, Connected Assistants, the PII & Routing Inspector (Cmd+Shift+D), or this Guided Tour anytime.',
        targetSelector: '#tour-top-button',
        openDialog: 'none',
        cardPlacement: 'center',
      },
    ],
    keyHighlight:
      'Tour Complete: Keep exploring the sample Vermont suppression matter and its Case Issues, or close the sample case to work on your own matters.',
    cardPlacement: 'bottom-corner-right',
    openDialog: 'settings',
    settingsTab: 'layer1_core',
  }),
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  onClose,
  isSampleCaseLoaded,
  onLoadSampleCase,
  onCloseSampleCase,
  onSelectTab,
  onSyncTourUiState,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [isClosingCase, setIsClosingCase] = useState(false);

  // Reset to Card 1, Point 1 whenever the tutorial opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setCurrentPointIndex(0);
    }
  }, [isOpen]);

  const currentStep = TOUR_STEPS[currentStepIndex] ?? TOUR_STEPS[0];
  const points = currentStep?.points ?? [];
  const activePoint = points[currentPointIndex] ?? points[0];

  const activeTargetSelector =
    activePoint?.targetSelector || currentStep?.targetSelector;
  const activePreferredTab =
    activePoint?.preferredTab || currentStep?.preferredTab;
  const activeOpenDialog: TourDialogState =
    activePoint?.openDialog ?? currentStep?.openDialog ?? 'none';
  const activeSettingsTab =
    activePoint?.settingsTab || currentStep?.settingsTab;
  const activeCardPlacement =
    activePoint?.cardPlacement || currentStep?.cardPlacement || 'center';

  // Update spotlight target rect for the currently active > point
  const updateTargetRect = () => {
    if (!activeTargetSelector) return;
    const el = document.querySelector(activeTargetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (onSyncTourUiState) {
      onSyncTourUiState({
        openDialog: activeOpenDialog,
        settingsTab: activeSettingsTab,
        preferredTab: activePreferredTab,
      });
    } else if (activePreferredTab && onSelectTab) {
      onSelectTab(activePreferredTab);
    }

    const timerFast = setTimeout(() => {
      updateTargetRect();
    }, 60);
    const timerModal = setTimeout(() => {
      updateTargetRect();
    }, 180);

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timerFast);
      clearTimeout(timerModal);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [
    isOpen,
    currentStepIndex,
    currentPointIndex,
    activeTargetSelector,
    activePreferredTab,
    activeOpenDialog,
    activeSettingsTab,
  ]);

  const isFirstCard = currentStepIndex === 0;
  const isLastCard = currentStepIndex === TOUR_STEPS.length - 1;
  const isFirstPointOnCard = currentPointIndex === 0;
  const isLastPointOnCard = currentPointIndex >= points.length - 1;
  const isVeryStart = isFirstCard && isFirstPointOnCard;
  const isVeryEnd = isLastCard && isLastPointOnCard;

  const handleNext = () => {
    if (!isLastPointOnCard) {
      setCurrentPointIndex((prev) => prev + 1);
    } else if (!isLastCard) {
      setCurrentStepIndex((prev) => prev + 1);
      setCurrentPointIndex(0);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (!isFirstPointOnCard) {
      setCurrentPointIndex((prev) => prev - 1);
    } else if (!isFirstCard) {
      const prevStepIdx = currentStepIndex - 1;
      const prevStepPoints = TOUR_STEPS[prevStepIdx]?.points ?? [];
      setCurrentStepIndex(prevStepIdx);
      setCurrentPointIndex(Math.max(0, prevStepPoints.length - 1));
    }
  };

  // Keyboard navigation steps through each > point on each card
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, currentPointIndex, onClose]);

  if (!isOpen) return null;

  const handleLoadSample = async () => {
    try {
      setIsLoadingCase(true);
      await onLoadSampleCase();
    } finally {
      setIsLoadingCase(false);
    }
  };

  const handleCloseSample = async (remove = false) => {
    try {
      setIsClosingCase(true);
      await onCloseSampleCase({ removeSample: remove });
      onClose();
    } finally {
      setIsClosingCase(false);
    }
  };

  const getCardContainerAlignment = (placement: TourCardPlacement): string => {
    switch (placement) {
      case 'top-left':
        return 'items-start justify-center pt-16';
      case 'top-right':
        return 'items-center justify-end pr-12';
      case 'bottom-left':
        return 'items-center justify-start pl-72';
      case 'bottom-right':
        return 'items-end justify-center pb-8';
      case 'bottom-corner-right':
        return 'items-end justify-end pr-8 pb-6';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-auto">
      {/* Subtle unblurred dim when no specific spotlight target is found */}
      {!targetRect && (
        <div className="absolute inset-0 bg-black/45 transition-opacity duration-300" />
      )}

      {/* True Spotlight Cutout: 100% clear inside targetRect, subtle unblurred dim outside */}
      {targetRect && (
        <div
          style={{
            top: Math.max(4, targetRect.top - 6),
            left: Math.max(4, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow:
              '0 0 0 9999px rgba(9, 9, 11, 0.48), 0 0 28px rgba(245, 158, 11, 0.45)',
          }}
          className="absolute rounded-2xl border-2 border-amber-400 bg-transparent pointer-events-none transition-all duration-300 ease-out"
        />
      )}

      {/* Floating Tutorial Card positioned away from the highlighted target */}
      <div
        className={`absolute inset-0 flex p-6 pointer-events-none ${getCardContainerAlignment(
          activeCardPlacement
        )}`}
      >
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-[#121216]/95 border border-amber-500/40 shadow-2xl p-6 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Navigation & Metadata */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                {currentStep.icon}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                    {currentStep.category}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                    Card {currentStepIndex + 1} of {TOUR_STEPS.length}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-[10px] text-amber-300 font-mono">
                    Point {currentPointIndex + 1} of {points.length}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 leading-tight mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
              title="Skip or Close Tour (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle & Interactive Step-Through Points (> Bullets) */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-amber-300/90">
              {currentStep.subtitle}
            </p>

            <div className="space-y-1.5 text-xs leading-relaxed">
              {points.map((pt, idx) => {
                const isPointActive = idx === currentPointIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPointIndex(idx)}
                    className={`w-full text-left flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer ${
                      isPointActive
                        ? 'bg-amber-500/15 border-amber-400/50 text-slate-100 shadow-sm'
                        : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`}
                    title="Click to spotlight this control"
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform ${
                        isPointActive
                          ? 'text-amber-400 translate-x-0.5 scale-110'
                          : 'text-slate-600'
                      }`}
                    />
                    <span>{pt.text}</span>
                  </button>
                );
              })}
            </div>

            {currentStep.keyHighlight && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>{currentStep.keyHighlight}</div>
              </div>
            )}
          </div>

          {/* Sample Casework Status & Actions (Available on First and Last Card) */}
          {(isFirstCard || isLastCard) && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSampleCaseLoaded ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="text-xs text-slate-300">
                  {isSampleCaseLoaded
                    ? 'Sample Case Loaded: John Doe v. State of Vermont'
                    : 'Sample Case Not Loaded'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isSampleCaseLoaded && (
                  <button
                    disabled={isLoadingCase}
                    onClick={handleLoadSample}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>{isLoadingCase ? 'Loading...' : 'Load Sample Case'}</span>
                  </button>
                )}

                {isSampleCaseLoaded && (
                  <button
                    disabled={isClosingCase}
                    onClick={() => handleCloseSample(false)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
                    title="Close sample casework and return to your own matter"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>{isClosingCase ? 'Closing...' : 'Close Sample Case'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stepper Dots & Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            {/* Card Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    setCurrentPointIndex(0);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-amber-400'
                      : 'w-2 bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={`Jump to ${step.title}`}
                />
              ))}
            </div>

            {/* Next / Back / Finish Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={isVeryStart}
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow transition active:scale-95 cursor-pointer"
              >
                <span>
                  {isVeryEnd
                    ? 'Finish Tour'
                    : isLastPointOnCard
                      ? 'Next Card'
                      : `Next Point (${currentPointIndex + 2}/${points.length})`}
                </span>
                {!isVeryEnd && <ArrowRight className="w-3.5 h-3.5" />}
                {isVeryEnd && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
