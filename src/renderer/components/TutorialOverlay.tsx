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

interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  subtitle: string;
  category: string;
  icon: React.ReactNode;
  content: string[];
  keyHighlight?: string;
  cardPlacement: 'center' | 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left';
  preferredTab?: 'redline' | 'corpus' | 'chronology';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome_docket',
    targetSelector: '#tour-matter-overview',
    title: 'Welcome to LexHarness',
    subtitle: 'Legal Drafting & Review Workspace',
    category: 'Matters & Dockets',
    icon: <Scale className="w-5 h-5 text-amber-400" />,
    content: [
      'LexHarness helps you review discovery, verify citations, and draft legal motions and memos.',
      'A criminal defense sample matter (John Doe v. State of Vermont) is loaded to explore.',
      'Use the left sidebar to switch matters, jurisdictions, and citation rules.',
    ],
    keyHighlight:
      'Sample Case: John Doe v. State of Vermont loaded with sample discovery and drafts.',
    cardPlacement: 'center',
  },
  {
    id: 'corpus_discovery',
    targetSelector: '#tour-corpus-tab',
    title: '1. Case Documents',
    subtitle: 'Exhibits, Transcripts & Depositions',
    category: 'Evidence',
    icon: <FileSearch className="w-5 h-5 text-amber-400" />,
    content: [
      'Case files are indexed with Bates numbers (STATE-0001 to STATE-0005, STATE-BWC-0009, DEF-DEP-0018).',
      'Assistants reference these exhibits directly to anchor claims in the record.',
      'Check the Body-Worn Camera transcript and Trooper Keller\'s deposition for timeline contradictions.',
    ],
    keyHighlight:
      'Pinpoint Citations: Claims cite exact Bates numbers, video timestamps, and transcript lines.',
    cardPlacement: 'bottom-left',
    preferredTab: 'corpus',
  },
  {
    id: 'agents_composer',
    targetSelector: '#tour-composer',
    title: '2. Drafting & Practice Tasks',
    subtitle: 'Profiles & Task Focus',
    category: 'Drafting',
    icon: <Send className="w-5 h-5 text-amber-400" />,
    content: [
      'Use the composer below to draft. Select your Practitioner Profile (e.g., Criminal Defense vs. General Practice).',
      'Choose a Practice Task (e.g., Suppression & Art. 11, Bail, or Discovery) to focus the legal analysis.',
      'Pick a connected assistant (such as OpenAI Codex, Claude, or Gemini) or the local assistant.',
    ],
    keyHighlight:
      'Legal Focus: Precedents like State v. Sprague and State v. Bauder are applied automatically.',
    cardPlacement: 'top-left',
  },
  {
    id: 'adversarial_review_gate',
    targetSelector: '#tour-review-gate',
    title: '3. Peer Review',
    subtitle: 'Citation Checks & Counterarguments',
    category: 'Review',
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    content: [
      'Drafts can undergo automatic review before presentation.',
      'Two review checks run in parallel:',
      '• Citation Auditor: Verifies citations and checks state authority primacy.',
      '• Opposing Perspective: Anticipates counterarguments and procedural issues.',
      'The assistant addresses objections and provides a redline.',
    ],
    keyHighlight:
      'Automated Review: Uncited claims and counterarguments are flagged before counsel review.',
    cardPlacement: 'center',
  },
  {
    id: 'work_product_editing',
    targetSelector: '#tour-redline-pane',
    title: '4. Documents & Redlines',
    subtitle: 'Versions & In-Place Edits',
    category: 'Editing',
    icon: <BookOpen className="w-5 h-5 text-amber-400" />,
    content: [
      'Inspect drafts in the right pane and toggle versions to view redlines.',
      'Edit document text directly at any time.',
      'Editing a reviewed document marks it "Changed • Needs Review" with a 1-click button to re-run review.',
    ],
    keyHighlight:
      'Direct Editing: Edit text directly and re-run reviews on demand.',
    cardPlacement: 'bottom-right',
    preferredTab: 'redline',
  },
  {
    id: 'governance_settings',
    targetSelector: '#tour-settings-button',
    title: '5. Settings & Next Steps',
    subtitle: 'Configure Anytime',
    category: 'Settings',
    icon: <Settings2 className="w-5 h-5 text-amber-400" />,
    content: [
      'Workflow: Documents → Drafting → Review → Editing.',
      'Configure practice rules, research tools, and models in Settings.',
      'Reopen this tour anytime from the top bar or Settings.',
    ],
    keyHighlight:
      'Tour Complete: Keep exploring the sample case or close it to start your own matters.',
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      {/* Translucent backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-300" />

      {/* Spotlight cutout / focus ring around target element */}
      {targetRect && (
        <div
          style={{
            top: Math.max(8, targetRect.top - 6),
            left: Math.max(8, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className="absolute rounded-2xl border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_50px_rgba(245,158,11,0.35)] pointer-events-none transition-all duration-300 ease-out animate-pulse"
        />
      )}

      {/* Floating Tutorial Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xl rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl p-6 text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
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
