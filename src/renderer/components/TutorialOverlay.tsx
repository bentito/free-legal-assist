import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileSearch,
  FileText,
  Gavel,
  HelpCircle,
  Play,
  RotateCcw,
  Scale,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  subtitle: string;
  category: string;
  icon?: React.ReactNode;
  content: string[];
  keyHighlight?: string;
  cardPlacement: 'center' | 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';
  preferredTab?: 'redline' | 'corpus' | 'chronology';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome_docket',
    targetSelector: '#tour-matter-overview',
    title: 'Welcome to LexHarness',
    subtitle: 'Matters, Case Issues & Settled Drawer',
    category: 'Matters & Case Issues',
    icon: <Scale className="w-5 h-5 text-amber-400" />,
    content: [
      'LexHarness organizes your work by Matter and focused Case Issues (such as a Motion to Suppress vs. a Witness Impeachment Matrix) that share the same discovery exhibits.',
      'A criminal defense sample matter (John Doe v. State of Vermont) and a focused Case Issue (Trooper Keller BWC Impeachment Matrix) are loaded in the left sidebar.',
      'Use the top folder icon to create a New Matter, the pen icon to start a New Case Issue, or settle completed matters and issues into the lower Settled drawer.',
    ],
    keyHighlight:
      'Case Issues & Settled Inbox: Spin off focused legal issues under any matter and incorporate their findings back into your brief.',
    cardPlacement: 'center',
  },
  {
    id: 'corpus_discovery',
    targetSelector: '#tour-corpus-tab',
    title: '1. Exhibits, Multi-Format Import & Folder Sync',
    subtitle: 'Word (.docx), PDF, Excel, CSV, RTF & Auto-Sync',
    category: 'Evidence & Intake',
    icon: <FileSearch className="w-5 h-5 text-amber-400" />,
    content: [
      'Case files are indexed with Bates numbers (STATE-0001 to STATE-0005, STATE-BWC-0009, DEF-DEP-0018) so every factual claim is anchored to the record.',
      'Click Import File (or drag-and-drop) to ingest .docx (preserving headings, legal numbering, tables, footnotes, Word Tracked Changes, and comments), .pdf, .xlsx, .csv, .rtf, .txt, and .md files.',
      'Click Sync Folder (or link a local folder in Matter Settings) so new supplemental disclosures saved into your matter folder on disk are automatically indexed.',
    ],
    keyHighlight:
      'Multi-Format Intake & Folder Auto-Sync: Import Word, PDF, and spreadsheet exhibits directly or auto-sync from a local case folder.',
    cardPlacement: 'bottom-left',
    preferredTab: 'corpus',
  },
  {
    id: 'agents_composer',
    targetSelector: '#tour-composer',
    title: '2. Grounded Drafting & Client PII Shield',
    subtitle: 'Practitioner Profiles, Frontier Models & Confidentiality',
    category: 'Drafting & Privacy',
    icon: <Send className="w-5 h-5 text-amber-400" />,
    content: [
      'Use the vertically resizable composer to draft motions, briefs, or memos, or attach exhibits directly from the prompt bar.',
      'Select your Practice Task (e.g., Suppression & Art. 11, Bail, or Discovery) and preferred assistant (OpenAI Codex, Claude, Gemini, or Built-In Assistant).',
      'Substantive drafting stays on your chosen frontier model, while the Privileged PII Shield automatically scrubs client names, SSNs, DOBs, and addresses before cloud dispatch and restores them locally.',
    ],
    keyHighlight:
      'Privileged PII Shield: Client identifiers are masked before leaving your machine while Bates stamps and citations stay intact.',
    cardPlacement: 'top-left',
  },
  {
    id: 'adversarial_review_gate',
    targetSelector: '#tour-review-gate',
    title: '3. Peer Review & Checkpoint Issue Branching',
    subtitle: 'Citation Auditor, Opposing Counsel & Spin Off Issue',
    category: 'Peer Review',
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    content: [
      'Every draft can run through two independent review checks in parallel before you finish:',
      '• Citation & Record Auditor: Verifies Bates pinpoints, transcript timestamps, and controlling forum authorities.',
      '• Opposing Counsel Review: Challenges weak inferences and procedural gaps so the draft cures objections automatically.',
      'Click the quiet "Worked for..." trace line to inspect review objections and PII masking, or click "Spin Off Issue" on any response to branch a focused inquiry from that checkpoint.',
    ],
    keyHighlight:
      'Second-Chair Review & Spin Off Issue: Catch citation and record errors automatically or branch any turn into a dedicated Case Issue.',
    cardPlacement: 'bottom-right',
  },
  {
    id: 'work_product_editing',
    targetSelector: '#tour-redline-pane',
    title: '4. Redlines, Master Brief Synthesis & Word (.docx) Export',
    subtitle: 'In-Place Editing, Tracked Changes & Margin Comments',
    category: 'Redlines & Export',
    icon: <BookOpen className="w-5 h-5 text-amber-400" />,
    content: [
      'Inspect drafts in the right pane, compare pre- and post-review versions side by side, and edit text in-place at any time.',
      'Use the Case Issues section in the top summary card to incorporate individual issue findings or click "Synthesize Master Brief" to combine multiple Case Issues into a single consolidated pleading.',
      'Click "Export .docx" to export any draft or redline to Microsoft Word with native Word Tracked Changes and peer-review objections attached as margin comments.',
    ],
    keyHighlight:
      'Native Word (.docx) Export & Master Brief Synthesis: Combine Case Issues into a Master Brief and export native Word redlines with comments.',
    cardPlacement: 'bottom-left',
    preferredTab: 'redline',
  },
  {
    id: 'governance_settings',
    targetSelector: '#tour-settings-button',
    title: '5. Settings, Assistants & PII Shield Inspector',
    subtitle: 'Customize Prompts, CourtListener & Privacy Anytime',
    category: 'Settings & Governance',
    icon: <Settings2 className="w-5 h-5 text-amber-400" />,
    content: [
      'Use the bottom-left utility bar to open Settings (customizing Practitioner Profiles and 4-layer legal system prompts), Connected Assistants (Codex, Claude, Antigravity & CourtListener), and the Decision & PII Shield Inspector (Cmd+Shift+D).',
      'Reopen this Interactive Guided Tour anytime via the sparkles icon in the lower-left bar or from Settings.',
    ],
    keyHighlight:
      'Tour Complete: Keep exploring the sample casework and its Case Issues, or close it to work on your own matters.',
    cardPlacement: 'center',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  onClose,
  activeMatterId,
  isSampleCaseLoaded,
  onLoadSampleCase,
  onCloseSampleCase,
  onSelectTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [isClosingCase, setIsClosingCase] = useState(false);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Update spotlight target rect
  const updateTargetRect = () => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Ensure target element is smoothly brought into view if offscreen
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.preferredTab && onSelectTab) {
      onSelectTab(currentStep.preferredTab);
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 120);

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, currentStepIndex, currentStep?.preferredTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, onClose]);

  if (!isOpen) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

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
            top: Math.max(6, targetRect.top - 6),
            left: Math.max(6, targetRect.left - 6),
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
          currentStep.cardPlacement
        )}`}
      >
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-[#121216]/95 border border-amber-500/40 shadow-2xl p-6 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Card Top Navigation & Metadata */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
                {currentStep.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                    {currentStep.category}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                    Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 leading-tight">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              title="Skip or Close Tour (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle & Body */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-amber-300/90">
              {currentStep.subtitle}
            </p>

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              {currentStep.content.map((p, idx) => (
                <p key={idx} className="flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </p>
              ))}
            </div>

            {currentStep.keyHighlight && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>{currentStep.keyHighlight}</div>
              </div>
            )}
          </div>

          {/* Sample Casework Status & Actions (Available on Step 1 and Step 6) */}
          {(isFirstStep || isLastStep) && (
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
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
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
                disabled={isFirstStep}
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
                <span>{isLastStep ? 'Finish Tour' : 'Next'}</span>
                {!isLastStep && <ArrowRight className="w-3.5 h-3.5" />}
                {isLastStep && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
