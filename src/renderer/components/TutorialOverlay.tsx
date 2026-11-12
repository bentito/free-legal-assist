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
    title: 'Welcome to Free Legal Assist (LexHarness)',
    subtitle: 'Confidential AI Control Surface for Legal Practice',
    category: 'Casework & Docket Administration',
    icon: <Scale className="w-5 h-5 text-amber-400" />,
    content: [
      'Free Legal Assist is an attorney-governed workbench designed for discovery review, legal research, and pleading preparation.',
      'We have pre-loaded a live criminal defense sample matter: John Doe v. State of Vermont (Docket No. 25-CR-00123).',
      'The left sidebar manages your active matters, forum jurisdictions (Vermont Superior Court), and citation manuals (The Bluebook).',
    ],
    keyHighlight:
      'Active Sample Case: John Doe v. State of Vermont with live work product, BWC transcripts, and adversarial audits.',
    cardPlacement: 'center',
  },
  {
    id: 'corpus_discovery',
    targetSelector: '#tour-corpus-tab',
    title: '1. Matter Corpus & Discovery Pinpoints',
    subtitle: 'Indexed Affidavits, Body-Worn Camera & Rule 15 Depositions',
    category: 'Evidentiary Record Integrity',
    icon: <FileSearch className="w-5 h-5 text-amber-400" />,
    content: [
      'All case files are cataloged in the Matter Corpus with verified Bates numbering (STATE-0001 to STATE-0005, STATE-BWC-0009, DEF-DEP-0018).',
      'AI agents use the search_matter_corpus tool to ground every factual assertion directly in the record rather than hallucinating.',
      'Notice the Body-Worn Camera (BWC) transcript and Rule 15 deposition of Trooper Keller, which establish key timeline contradictions.',
    ],
    keyHighlight:
      'Discovery Pinpoints: All claims cite exact Bates numbers, video timestamps, and deposition page:line references.',
    cardPlacement: 'bottom-left',
    preferredTab: 'corpus',
  },
  {
    id: 'agents_composer',
    targetSelector: '#tour-composer',
    title: '2. Directing Agents & Practice Tasks',
    subtitle: 'Practitioner Profiles & Multi-Model Execution',
    category: 'Agent Orchestration & Governance',
    icon: <Send className="w-5 h-5 text-amber-400" />,
    content: [
      'Use the bottom composer to instruct AI agents. Select your active Practitioner Profile (e.g. Vermont Criminal Defense Lawyer vs. General Practice).',
      'Choose a specialized Practice Task (e.g. Suppression & Art. 11, Bail Conditions, or Discovery Audit) to automatically inject controlling constitutional standards into the agent context.',
      'Select your lead drafter from local CLI agents (Codex gpt-6, Claude Agent, Antigravity ACP gemini-4) or API providers.',
    ],
    keyHighlight:
      'Governed Prompts: Controlling precedent (State v. Sprague, State v. Bauder) is enforced at the prompt layer.',
    cardPlacement: 'top-left',
  },
  {
    id: 'adversarial_review_gate',
    targetSelector: '#tour-review-gate',
    title: '3. Multi-LLM Adversarial Review Gate',
    subtitle: 'Pre-Presentation Cross-Examination by Specialized Critics',
    category: 'Ethical Quality Assurance',
    icon: <Gavel className="w-5 h-5 text-amber-400" />,
    content: [
      'Before a candidate draft reaches counsel, it passes through an automated Adversarial Review Gate.',
      'Two independent critic models stress-test the work in parallel:',
      '• Citation & Discovery Auditor (Gemini 2.5 Pro): Catches erroneous citations and enforces state constitutional primacy (Vt. Const. ch. I, art. 11 over federal Mimms).',
      '• Opposing Counsel Critic (OpenAI o3-mini): Anticipates State\'s Attorney counterarguments and spots procedural gaps.',
      'The lead drafter automatically cures objections and redlines the document before delivering it to you.',
    ],
    keyHighlight:
      'Peer-Reviewed Quality: Hallucinations and concessions are caught and resolved before attorney review.',
    cardPlacement: 'center',
  },
  {
    id: 'work_product_editing',
    targetSelector: '#tour-redline-pane',
    title: '4. Work Product & In-Place Editing',
    subtitle: 'Live Version Diffs & 1-Click Re-Audits',
    category: 'Interactive Drafting & Verification',
    icon: <BookOpen className="w-5 h-5 text-amber-400" />,
    content: [
      'In the right workspace pane, inspect the finalized memorandum and toggle between draft versions to inspect redline diffs.',
      'You can edit the document text directly in place at any time.',
      'Notice the status badge: editing a reviewed document marks it as "Changed • Needs Review" and surfaces a 1-click "Run Review" button to immediately re-audit your modifications against the corpus.',
    ],
    keyHighlight:
      'Seamless Re-Audit: Edit directly with full confidence that changes can be audited in seconds.',
    cardPlacement: 'bottom-right',
    preferredTab: 'redline',
  },
  {
    id: 'governance_settings',
    targetSelector: '#tour-settings-button',
    title: '5. Ready to Practice & Casework Control',
    subtitle: 'Revisit Anytime from Settings or Top Bar',
    category: 'Practice Governance & Next Steps',
    icon: <Settings2 className="w-5 h-5 text-amber-400" />,
    content: [
      'You now understand the complete Free Legal Assist workflow: Matter Corpus → Governed Prompting → Adversarial Review → Work Product & In-Place Editing.',
      'You can customize prompt profiles, add custom legal MCP servers, and configure review models anytime in Settings.',
      'You can reopen this Guided Tour at any time using the Tour button in the top bar or inside Settings.',
    ],
    keyHighlight:
      'Tour Complete: Keep exploring the John Doe sample case or close it to return to your matters.',
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
