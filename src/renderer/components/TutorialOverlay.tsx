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

export interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeMatterId: string;
  isSampleCaseLoaded: boolean;
  onLoadSampleCase: () => Promise<void>;
  onCloseSampleCase: (options?: { removeSample?: boolean }) => Promise<void>;
  onSelectTab?: (tab: 'redline' | 'corpus' | 'chronology') => void;
}

export interface TourPoint {
  text: string;
  targetSelector: string;
  preferredTab?: 'redline' | 'corpus' | 'chronology';
  cardPlacement?: 'center' | 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';
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
  cardPlacement: 'center' | 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';
  preferredTab?: 'redline' | 'corpus' | 'chronology';
}

const createTourStep = (
  step: Omit<TourStep, 'content'>
): TourStep => ({
  ...step,
  content: step.points.map((p) => p.text),
});

export const TOUR_STEPS: TourStep[] = [
  createTourStep({
    id: 'why_lexharness',
    targetSelector: '#tour-model-selector',
    title: 'Welcome to LexHarness',
    subtitle: 'Harnessing Coding Agents for Legal Work — Why It Beats a Chatbot',
    category: 'Why LexHarness?',
    icon: <Compass className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Harness Existing Coding Agents for Legal Work: Connect Claude Code, OpenAI Codex, and Antigravity directly to a legal matter workspace instead of starting from scratch in a generic chatbot.',
        targetSelector: '#tour-model-selector',
        cardPlacement: 'top-left',
      },
      {
        text: 'Grounded in Discovery Exhibits (Not Hallucinations): Chatbots guess facts from memory; LexHarness indexes your case files with Bates stamps (e.g., STATE-0001, STATE-BWC-0009) so every factual claim is anchored to the record.',
        targetSelector: '#tour-corpus-tab',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Automatic Second-Chair & Opposing Counsel Review: Chatbots act as agreeable yes-men; LexHarness runs parallel Citation & Record Auditor and Opposing Counsel checks to cure weak inferences and citation errors before you finish.',
        targetSelector: '#tour-review-gate',
        cardPlacement: 'bottom-right',
      },
      {
        text: 'Side-by-Side Redlines & Native Word (.docx) Tracked Changes: Instead of copy-pasting raw chat text, compare pre- and post-review drafts side by side and export native Word redlines with reviewer margin comments.',
        targetSelector: '#tour-redline-pane',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Local-First Confidentiality & Practitioner Profiles: The Privileged PII Shield scrubs client names, SSNs, and DOBs locally before cloud dispatch while injecting your forum and constitutional rules.',
        targetSelector: '#tour-routing-button',
        cardPlacement: 'center',
      },
    ],
    keyHighlight:
      'Step through each > point on any card using Next (or click any point directly) to spotlight the exact UI control it describes.',
    cardPlacement: 'top-left',
  }),
  createTourStep({
    id: 'welcome_docket',
    targetSelector: '#tour-matter-overview',
    title: '1. Matters, Case Issues & Settled Drawer',
    subtitle: 'Organizing Casework & Focused Legal Inquiries',
    category: 'Matters & Case Issues',
    icon: <Scale className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'LexHarness organizes your work by Matter and focused Case Issues (such as a Motion to Suppress vs. a Witness Impeachment Matrix) that share the same discovery exhibits in the left sidebar.',
        targetSelector: '#tour-matter-overview',
        cardPlacement: 'center',
      },
      {
        text: 'Click the top Folder icon to create a New Matter workspace with its court forum, docket number, and citation manual.',
        targetSelector: '#tour-new-matter-btn',
        cardPlacement: 'center',
      },
      {
        text: 'Click the New Issue pen icon to start a focused Case Issue (such as Trooper Keller BWC Impeachment Matrix) under the active matter.',
        targetSelector: '#tour-new-issue-btn',
        cardPlacement: 'center',
      },
      {
        text: 'Settle completed matters and resolved Case Issues into the lower Settled drawer to keep your active docket clean.',
        targetSelector: '#tour-settled-drawer',
        cardPlacement: 'center',
      },
    ],
    keyHighlight:
      'Case Issues & Settled Inbox: Spin off focused legal issues under any matter and incorporate their findings back into your brief.',
    cardPlacement: 'center',
  }),
  createTourStep({
    id: 'corpus_discovery',
    targetSelector: '#tour-corpus-tab',
    title: '2. Exhibits, Multi-Format Import & Folder Sync',
    subtitle: 'Word (.docx), PDF, Excel, CSV, RTF & Auto-Sync',
    category: 'Evidence & Intake',
    icon: <FileSearch className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Case files are indexed in the Exhibits tab with Bates numbers (STATE-0001 to STATE-0005, STATE-BWC-0009, DEF-DEP-0018) so every factual claim is anchored to the record.',
        targetSelector: '#tour-corpus-tab',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Click Import File (or drag-and-drop) to ingest .docx (preserving headings, legal numbering, tables, footnotes, Word Tracked Changes, and comments), .pdf, .xlsx, .csv, .rtf, .txt, and .md files.',
        targetSelector: '#tour-import-file-btn',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Click Sync Folder (or link a local folder in Matter Settings) so new supplemental disclosures saved into your matter folder on disk are automatically indexed.',
        targetSelector: '#tour-sync-folder-btn',
        preferredTab: 'corpus',
        cardPlacement: 'bottom-left',
      },
    ],
    keyHighlight:
      'Multi-Format Intake & Folder Auto-Sync: Import Word, PDF, and spreadsheet exhibits directly or auto-sync from a local case folder.',
    cardPlacement: 'bottom-left',
    preferredTab: 'corpus',
  }),
  createTourStep({
    id: 'agents_composer',
    targetSelector: '#tour-composer',
    title: '3. Grounded Drafting, Sample Prompts & Task Focus',
    subtitle: 'Practitioner Profiles, Frontier Models & Confidentiality',
    category: 'Drafting & Privacy',
    icon: <Send className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Use the vertically resizable composer to draft motions, briefs, or memos, or attach exhibits directly from the prompt bar.',
        targetSelector: '#tour-composer',
        cardPlacement: 'top-left',
      },
      {
        text: 'Click the Sample Legal Prompts scroll icon to insert tailored practitioner prompts for your active profile.',
        targetSelector: '#tour-sample-prompts-btn',
        cardPlacement: 'top-left',
      },
      {
        text: 'Select your Practice Task (e.g., Suppression & Art. 11, Bail, or Discovery) to apply task-specific legal standards and court rules.',
        targetSelector: '#tour-task-selector',
        cardPlacement: 'top-left',
      },
      {
        text: 'Pick your preferred coding agent and frontier model while the Privileged PII Shield automatically scrubs client names, SSNs, DOBs, and addresses before cloud dispatch and restores them locally.',
        targetSelector: '#tour-model-selector',
        cardPlacement: 'top-left',
      },
    ],
    keyHighlight:
      'Privileged PII Shield: Client identifiers are masked before leaving your machine while Bates stamps and citations stay intact.',
    cardPlacement: 'top-left',
  }),
  createTourStep({
    id: 'adversarial_review_gate',
    targetSelector: '#tour-review-gate',
    title: '4. Peer Review & Checkpoint Issue Branching',
    subtitle: 'Citation Auditor, Opposing Counsel & Spin Off Issue',
    category: 'Peer Review',
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Every draft can run through two independent review checks in parallel — the Citation & Record Auditor (verifying Bates pinpoints and controlling authorities) and Opposing Counsel Review (challenging weak inferences and procedural gaps).',
        targetSelector: '#tour-review-gate',
        cardPlacement: 'bottom-right',
      },
      {
        text: 'Click the quiet "Worked for..." trace summary line above any response to inspect corpus searches, cured peer-review objections, and PII masking.',
        targetSelector: '#tour-trace-summary-btn',
        cardPlacement: 'bottom-right',
      },
      {
        text: 'Click "Spin Off Issue" on any response to branch a focused inquiry starting from that exact conversation checkpoint.',
        targetSelector: '#tour-spin-off-issue-btn',
        cardPlacement: 'bottom-right',
      },
    ],
    keyHighlight:
      'Second-Chair Review & Spin Off Issue: Catch citation and record errors automatically or branch any turn into a dedicated Case Issue.',
    cardPlacement: 'bottom-right',
  }),
  createTourStep({
    id: 'work_product_editing',
    targetSelector: '#tour-redline-pane',
    title: '5. Redlines, Master Brief Synthesis & Word (.docx) Export',
    subtitle: 'In-Place Editing, Tracked Changes & Margin Comments',
    category: 'Redlines & Export',
    icon: <BookOpen className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Inspect drafts in the right Redline pane to compare pre- and post-review versions side by side.',
        targetSelector: '#tour-redline-pane',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Use the Redline version bar to switch draft versions, edit text in-place at any time, or export the redline to Word.',
        targetSelector: '#tour-redline-version-bar',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Use the Case Issues section in the top summary card to incorporate individual issue findings or click "Synthesize Master Brief" to combine multiple Case Issues into a single consolidated pleading.',
        targetSelector: '#tour-case-issues-lineage',
        preferredTab: 'redline',
        cardPlacement: 'bottom-left',
      },
      {
        text: 'Click "Export .docx" on any response to export a Microsoft Word document with native Word Tracked Changes and peer-review objections attached as margin comments.',
        targetSelector: '#tour-export-docx-msg-btn',
        preferredTab: 'redline',
        cardPlacement: 'bottom-right',
      },
    ],
    keyHighlight:
      'Native Word (.docx) Export & Master Brief Synthesis: Combine Case Issues into a Master Brief and export native Word redlines with comments.',
    cardPlacement: 'bottom-left',
    preferredTab: 'redline',
  }),
  createTourStep({
    id: 'governance_settings',
    targetSelector: '#tour-settings-button',
    title: '6. Settings, Assistants & PII Shield Inspector',
    subtitle: 'Customize Prompts, CourtListener & Privacy Anytime',
    category: 'Settings & Governance',
    icon: <Settings2 className="w-5 h-5 text-amber-400" />,
    points: [
      {
        text: 'Click Settings (gear icon) in the bottom-left utility bar to switch Practitioner Profiles and customize the 4-layer legal system prompts.',
        targetSelector: '#tour-settings-button',
        cardPlacement: 'center',
      },
      {
        text: 'Click Connected Assistants (plug icon) to configure OpenAI Codex, Claude, Antigravity, and CourtListener caselaw verification.',
        targetSelector: '#tour-agents-button',
        cardPlacement: 'center',
      },
      {
        text: 'Click the Decision & PII Shield Inspector (bar-chart icon or Cmd+Shift+D) to audit local PII masking and model routing.',
        targetSelector: '#tour-routing-button',
        cardPlacement: 'center',
      },
      {
        text: 'Reopen this Interactive Guided Tour anytime via the Compass icon in the lower-left bar or from Settings.',
        targetSelector: '#tour-top-button',
        cardPlacement: 'center',
      },
    ],
    keyHighlight:
      'Tour Complete: Keep exploring the sample casework and its Case Issues, or close it to work on your own matters.',
    cardPlacement: 'center',
  }),
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  onClose,
  isSampleCaseLoaded,
  onLoadSampleCase,
  onCloseSampleCase,
  onSelectTab,
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

    if (activePreferredTab && onSelectTab) {
      onSelectTab(activePreferredTab);
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 100);

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [
    isOpen,
    currentStepIndex,
    currentPointIndex,
    activeTargetSelector,
    activePreferredTab,
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

  const getCardContainerAlignment = (
    placement: TourStep['cardPlacement']
  ): string => {
    switch (placement) {
      case 'top-left':
        return 'items-start justify-center pt-16';
      case 'top-right':
        return 'items-center justify-end pr-12';
      case 'bottom-left':
        return 'items-center justify-start pl-72';
      case 'bottom-right':
        return 'items-end justify-center pb-28';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
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
                    title="Click to spotlight this UI element"
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
