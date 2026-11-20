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
import { TutorialOverlay } from './components/TutorialOverlay';
import { RoutingDebugDrawer } from './components/RoutingDebugDrawer';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  ArrowUp,
  BarChart2,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Edit3,
  FileSearch,
  FolderPlus,
  GitBranch,
  ListFilter,
  Loader2,
  PanelRight,
  Plug,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SquarePen,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

interface ArchivedSettledItem {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  clientName: string;
  matterNumber: string;
  jurisdiction: string;
  practiceArea: PracticeAreaId;
  relativeTime: string;
}

const BADGE_PALETTE = [
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
];

const getMonogram = (clientName: string, matterName: string): { code: string; colorClass: string } => {
  const source = (clientName || matterName || 'LX').trim();
  const words = source.split(/\s+/).filter(Boolean);
  let code = 'LX';
  if (words.length >= 2) {
    code = `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    code = words[0].slice(0, 2).toUpperCase();
  }
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) % BADGE_PALETTE.length;
  }
  return { code, colorClass: BADGE_PALETTE[Math.abs(hash) % BADGE_PALETTE.length] };
};

const CURATED_SETTLED_SEEDS: Array<{
  badge: string;
  title: string;
  client: string;
  docket: string;
  time: string;
  practiceArea: PracticeAreaId;
}> = [
  { badge: 'RE', title: 'Suppress Exit Order — State v. Vance', client: 'Ronald Vance', docket: '26-CR-03912', time: 'now', practiceArea: 'vt_suppression_art11' },
  { badge: 'ES', title: 'Summarize BWC Timestamp Discrepancies', client: 'Elena Sterling', docket: '26-CR-03844', time: 'now', practiceArea: 'vt_discovery_impeachment' },
  { badge: 'CS', title: 'Review Rule 12(b)(3) Suppression Memo', client: 'Caleb Sutton', docket: '26-CR-03719', time: 'now', practiceArea: 'vt_suppression_art11' },
  { badge: 'RR', title: 'Review Bail Conditions 13 V.S.A. § 7554', client: 'Rachel Reyes', docket: '26-CR-03690', time: 'now', practiceArea: 'vt_bail_conditions' },
  { badge: 'SP', title: 'Sync Rule 15 Deposition Impeachment Table', client: 'Samuel Porter', docket: '26-CR-03511', time: 'now', practiceArea: 'vt_discovery_impeachment' },
  { badge: 'ES', title: 'Article 11 Dog Sniff Curtilage Objection', client: 'Evan Shaw', docket: '26-CR-03488', time: 'now', practiceArea: 'vt_suppression_art11' },
  { badge: 'SP', title: 'Find Trooper Keller Prior Testimony Citations', client: 'Sonia Patel', docket: '26-CR-03302', time: '1m', practiceArea: 'vt_discovery_impeachment' },
  { badge: 'CO', title: 'Trace Chain of Custody Lab Packet DEF-014', client: 'Connor O’Neill', docket: '26-CR-03217', time: '1m', practiceArea: 'vt_discovery_impeachment' },
  { badge: 'PR', title: 'Deferred Sentence Stipulation 13 V.S.A. § 7041', client: 'Paulina Reed', docket: '26-CR-03185', time: '1m', practiceArea: 'vt_plea_sentencing' },
  { badge: 'CO', title: 'Review Commercial Lease Indemnification Rider', client: 'Cobalt Logistics', docket: '26-CV-01904', time: '1m', practiceArea: 'general_transactional' },
  { badge: 'MK', title: 'Motion to Strike Surplusage — Count II', client: 'Marcus Klein', docket: '26-CR-03091', time: '4m', practiceArea: 'vt_suppression_art11' },
  { badge: 'DL', title: 'Bauder Warrantless Vehicle Search Brief', client: 'Devon Laurent', docket: '26-CR-02994', time: '9m', practiceArea: 'vt_suppression_art11' },
  { badge: 'HN', title: 'Hearsay Exception Audit V.R.E. 803(8)', client: 'Hannah Nolan', docket: '26-CR-02881', time: '14m', practiceArea: 'vt_discovery_impeachment' },
  { badge: 'TW', title: 'Emergency Bail Appeal to Single Justice', client: 'Trevor Walsh', docket: '26-CR-02810', time: '22m', practiceArea: 'vt_bail_conditions' },
  { badge: 'LB', title: 'Miranda Custody Analysis — Roadside Interrogation', client: 'Liam Brooks', docket: '26-CR-02745', time: '35m', practiceArea: 'vt_suppression_art11' },
  { badge: 'AV', title: 'SaaS Master Services Liability Cap Redline', client: 'Aegis Ventures', docket: '26-CV-01742', time: '1h', practiceArea: 'general_transactional' },
  { badge: 'JC', title: 'Brady / V.R.Cr.P. 16 Supplemental Demand', client: 'Julian Cross', docket: '26-CR-02699', time: '1h', practiceArea: 'vt_discovery_impeachment' },
  { badge: 'NM', title: 'Franks Hearing Preliminary Showing Memo', client: 'Nadia Mercer', docket: '26-CR-02612', time: '2h', practiceArea: 'vt_suppression_art11' },
  { badge: 'GF', title: 'Conditions of Release Curfew Modification', client: 'Gavin Foster', docket: '26-CR-02550', time: '3h', practiceArea: 'vt_bail_conditions' },
  { badge: 'KP', title: 'Mitigation Packet & PSI Objections', client: 'Kendra Price', docket: '26-CR-02498', time: '4h', practiceArea: 'vt_plea_sentencing' },
];

const ARCHIVED_SETTLED_MATTERS: ArchivedSettledItem[] = Array.from({ length: 123 }, (_, idx) => {
  const template = CURATED_SETTLED_SEEDS[idx % CURATED_SETTLED_SEEDS.length];
  const cycle = Math.floor(idx / CURATED_SETTLED_SEEDS.length);
  const timeLabels = ['now', '1m', '5m', '18m', '1h', '3h', '1d', '2d', '4d', '1w'];
  const relativeTime = cycle === 0 ? template.time : timeLabels[Math.min(cycle + 3, timeLabels.length - 1)];
  return {
    id: `settled-archive-${idx + 1}`,
    badge: template.badge,
    badgeColor: BADGE_PALETTE[idx % BADGE_PALETTE.length],
    title: cycle === 0 ? template.title : `${template.title} (#${idx + 1})`,
    clientName: template.client,
    matterNumber: cycle === 0 ? template.docket : `25-CR-${String(4900 - idx).padStart(5, '0')}`,
    jurisdiction: 'Vermont Superior Court, Chittenden Criminal Division (Vt. Const. ch. I, art. 11; 13 V.S.A.; V.R.Cr.P.)',
    practiceArea: template.practiceArea,
    relativeTime,
  };
});

/**
 * Highlights inline legal citations, statutes, and Bates ranges as subtle T3-style monospace pills
 */
const highlightInlineCitations = (text: string): React.ReactNode[] => {
  const citationRegex = /(\b(?:DEF-\d{3,4}(?:–DEF-\d{3,4})?|STATE-[A-Z0-9-]+|\d{4}\s+VT\s+\d+|13\s+V\.S\.A\.\s+§\s*\d+[a-z0-9()]*|V\.R\.Cr\.P\.\s+\d+[a-z0-9()]*|V\.R\.E\.\s+\d+[a-z0-9()]*|Article\s+11)\b)/g;
  const parts = text.split(citationRegex);
  return parts.map((part, i) => {
    if (citationRegex.test(part)) {
      citationRegex.lastIndex = 0;
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/[0.06] border border-white/[0.07] text-sky-300/95 font-mono text-[12px]"
        >
          {part}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

/**
 * Renders legal work product with calm, T3 Code-style typography, lists, and headers
 */
const renderCalmLegalContent = (content: string): React.ReactNode => {
  const lines = content.split('\n');
  return (
    <div className="space-y-2.5 text-[14px] text-zinc-200 leading-[1.68] font-sans">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) {
          return <div key={idx} className="h-1.5" />;
        }

        // Markdown headings or all-caps legal section headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-[13.5px] font-semibold text-zinc-100 pt-2">
              {line.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (line.startsWith('## ') || line.startsWith('# ')) {
          return (
            <h3 key={idx} className="text-[15px] font-semibold text-zinc-100 pt-3 pb-0.5 border-b border-white/[0.06]">
              {line.replace(/^#+\s+/, '')}
            </h3>
          );
        }
        if (
          /^(STATE OF VERMONT|SUPERIOR COURT|DEFENDANT’S|DEFENDANT'S|MOTION TO|MEMORANDUM OF LAW|I+\.|CONCLUSION|RELIEF REQUESTED|FACTUAL BACKGROUND|ARGUMENT)/.test(
            line
          ) &&
          line === line.toUpperCase() &&
          line.length < 95
        ) {
          return (
            <div
              key={idx}
              className="text-[12.5px] font-semibold tracking-wide text-zinc-100 pt-2.5"
            >
              {line}
            </div>
          );
        }

        // Numbered list items (e.g. "1. ** Argument**: ...")
        const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="text-zinc-400 font-medium shrink-0 select-none">
                {numberedMatch[1]}
              </span>
              <div className="flex-1 min-w-0">
                {highlightInlineCitations(numberedMatch[2])}
              </div>
            </div>
          );
        }

        // Bullet list items
        const bulletMatch = line.match(/^([-•*])\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-4">
              <span className="text-zinc-500 shrink-0 select-none">•</span>
              <div className="flex-1 min-w-0">
                {highlightInlineCitations(bulletMatch[2])}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-zinc-200/95">
            {highlightInlineCitations(rawLine)}
          </p>
        );
      })}
    </div>
  );
};

export const App: React.FC = () => {
  const [state, setState] = useState<AppBootstrapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left sidebar Search & Settled section state
  const [matterSearchQuery, setMatterSearchQuery] = useState('');
  const [isSettledOpen, setIsSettledOpen] = useState(true);
  const [settledVisibleCount, setSettledVisibleCount] = useState(10);
  const [showSamplePromptsMenu, setShowSamplePromptsMenu] = useState(false);
  const [isRightPaneVisible, setIsRightPaneVisible] = useState(true);

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
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isRoutingDrawerOpen, setIsRoutingDrawerOpen] = useState(false);
  const [rightPaneTab, setRightPaneTab] = useState<'redline' | 'corpus' | 'chronology'>('redline');
  const [lastUserMatterId, setLastUserMatterId] = useState<string | null>(null);
  const [tutorialBannerDismissed, setTutorialBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lexharness_tutorial_seen') === 'true';
    } catch {
      return false;
    }
  });
  const [studioInitialTab, setStudioInitialTab] =
    useState<StudioTab>('layer1_core');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Tucked-away trace & peer review drawer — collapsed by default for T3 Code calmness
  const [expandedReviewMsgIds, setExpandedReviewMsgIds] = useState<
    Record<string, boolean>
  >({});
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

  // Resizable right pane and composer dimensions with localStorage persistence
  const [rightPaneWidth, setRightPaneWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lexharness_right_pane_width');
      return saved ? Math.max(300, Math.min(parseInt(saved, 10), 820)) : 340;
    } catch {
      return 340;
    }
  });

  const [composerHeight, setComposerHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lexharness_composer_height');
      return saved ? Math.max(56, Math.min(parseInt(saved, 10), 480)) : 76;
    } catch {
      return 76;
    }
  });

  // Assistant message inline editing state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState<string>('');
  const [isSavingMsg, setIsSavingMsg] = useState(false);

  const handleStartResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPaneWidth;
    let latestWidth = startWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      latestWidth = Math.max(
        300,
        Math.min(startWidth + delta, window.innerWidth * 0.65)
      );
      setRightPaneWidth(latestWidth);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem(
          'lexharness_right_pane_width',
          String(Math.round(latestWidth))
        );
      } catch {
        // ignore
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStartResizeComposer = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = composerHeight;
    let latestHeight = startHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      latestHeight = Math.max(
        56,
        Math.min(startHeight + delta, Math.floor(window.innerHeight * 0.6))
      );
      setComposerHeight(latestHeight);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem(
          'lexharness_composer_height',
          String(Math.round(latestHeight))
        );
      } catch {
        // ignore
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const openDeleteMatterConfirm = (matter: Matter) => {
    setDeletingMatter(matter);
    setMatterContextMenu(null);
  };

  const handleToggleMatterSettled = async (matter: Matter, targetSettled?: boolean) => {
    const nextSettled = targetSettled ?? !matter.settled;
    const updated = await ipcBridge.updateMatter({
      matterId: matter.id,
      name: matter.name,
      clientName: matter.clientName,
      matterNumber: matter.matterNumber,
      practiceArea: matter.practiceArea,
      jurisdiction: matter.jurisdiction,
      citationStyle: matter.citationStyle,
      folderPath: matter.folderPath,
      settled: nextSettled,
    });
    setState(updated);
    setMatterContextMenu(null);
  };

  const handleOpenArchivedSettled = async (item: ArchivedSettledItem) => {
    if (!state) return;
    const existing = state.matters.find(
      (m) => m.matterNumber === item.matterNumber || m.name === item.title
    );
    if (existing) {
      const next = await ipcBridge.selectMatter(existing.id);
      setState(next);
      setTurnPracticeArea(existing.practiceArea);
      return;
    }
    const created = await ipcBridge.createMatter({
      name: item.title,
      clientName: item.clientName,
      matterNumber: item.matterNumber,
      practiceArea: item.practiceArea,
      jurisdiction: item.jurisdiction,
      citationStyle:
        'Vermont Supreme Court / Bluebook (e.g., 2007 VT 16, ¶ 14; 13 V.S.A. § ...; V.R.Cr.P. 12)',
    });
    setState(created);
    setTurnPracticeArea(item.practiceArea);
  };

  const detectWorkProductBadge = (msg: ThreadMessage): string => {
    if (msg.category === 'ADVISORY') return 'Case Advisory';
    const content = (msg.content || '').slice(0, 350).toLowerCase();
    if (content.includes('motion to suppress') || content.includes('motion to dismiss')) {
      return 'Motion to Suppress';
    }
    if (content.includes('motion') || content.includes('v.r.cr.p. 12') || content.includes('rule 12')) {
      return 'Motion';
    }
    if (content.includes('memorandum') || content.includes('memo') || content.includes('legal analysis')) {
      return 'Legal Memo';
    }
    if (content.includes('demand letter') || content.includes('notice of breach')) {
      return 'Demand Letter';
    }
    if (content.includes('impeachment') || content.includes('bwc audit') || content.includes('affidavit audit')) {
      return 'Impeachment Audit';
    }
    if (content.includes('bail') || content.includes('conditions of release') || content.includes('7554')) {
      return 'Bail Review';
    }
    if (content.includes('plea') || content.includes('sentencing') || content.includes('deferred sentence')) {
      return 'Sentencing Memo';
    }
    if (content.includes('agreement') || content.includes('contract') || content.includes('clause')) {
      return 'Contract Draft';
    }
    return 'Legal Work Product';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsRoutingDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const docNeedingReview = useMemo(() => {
    if (!state) return null;
    const selectedDoc = state.documents.find((d) => d.id === selectedDocId);
    if (selectedDoc) {
      const versions = state.documentVersions.filter(
        (v) => v.documentId === selectedDoc.id && v.versionNumber > 1
      );
      const latestVer = versions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const isEdited =
        (latestVer && new Date(selectedDoc.updatedAt).getTime() > new Date(latestVer.createdAt).getTime()) ||
        (!latestVer && selectedDoc.updatedAt !== selectedDoc.createdAt);

      if (isEdited) {
        return { doc: selectedDoc, reason: 'edited' as const };
      }
    }

    for (const doc of state.documents) {
      const versions = state.documentVersions.filter(
        (v) => v.documentId === doc.id && v.versionNumber > 1
      );
      const latestVer = versions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const isEdited =
        (latestVer && new Date(doc.updatedAt).getTime() > new Date(latestVer.createdAt).getTime()) ||
        (!latestVer && doc.updatedAt !== doc.createdAt);

      if (isEdited) {
        return { doc, reason: 'edited' as const };
      }
    }

    return null;
  }, [state?.documents, state?.documentVersions, selectedDocId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0b0b0e] text-zinc-300">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          <span className="text-xs font-medium tracking-wide text-zinc-400">
            Loading LexHarness...
          </span>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0b0b0e] text-rose-300 p-8">
        <div className="max-w-lg p-6 rounded-2xl bg-[#121216] border border-rose-500/30 space-y-2">
          <div className="font-semibold text-sm">
            Failed to start LexHarness
          </div>
          <p className="text-xs text-zinc-400 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);

  const activeMatter: Matter | undefined =
    state.matters.find((m) => m.id === state.activeMatterId) ?? state.matters[0];
  const activeProfile =
    state.promptSettings.profiles.find(
      (p) => p.id === state.promptSettings.activeProfileId
    ) ?? state.promptSettings.profiles[0];

  const currentProviderConfig =
    state.providers.find((p) => p.id === turnProvider) ?? state.providers[0];

  const formatAgentLabel = (p?: ProviderConfig) => {
    if (!p) return 'Agent';
    if (p.id === 'agy-acp') return 'Antigravity';
    if (p.id === 'claude-cli') return 'Claude';
    if (p.id === 'codex-cli') return 'OpenAI Codex';
    if (p.id === 'anthropic') return 'Claude (API)';
    if (p.id === 'openai') return 'OpenAI';
    if (p.id === 'gemini') return 'Gemini';
    if (p.id === 'openrouter') return 'OpenRouter';
    if (p.id === 'legal-simulator') return 'Built-In Assistant';
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

  const handleLoadSampleCase = async () => {
    if (state.activeMatterId && state.activeMatterId !== 'matter-1794160132556') {
      setLastUserMatterId(state.activeMatterId);
    }
    const next = await ipcBridge.loadTutorialCase();
    setState(next);
    const active = next.matters.find((m) => m.id === next.activeMatterId);
    if (active) setTurnPracticeArea(active.practiceArea);
  };

  const handleCloseSampleCase = async (options?: { removeSample?: boolean }) => {
    const fallback =
      lastUserMatterId && state.matters.some((m) => m.id === lastUserMatterId)
        ? lastUserMatterId
        : state.matters.find((m) => m.id !== 'matter-1794160132556')?.id;
    const next = await ipcBridge.closeTutorialCase({
      fallbackMatterId: fallback,
      removeSample: options?.removeSample ?? false,
    });
    setState(next);
    if (next.activeMatterId) {
      const active = next.matters.find((m) => m.id === next.activeMatterId);
      if (active) setTurnPracticeArea(active.practiceArea);
    }
  };

  const handleSubmitPrompt = async (customPrompt?: string) => {
    const text = (customPrompt ?? promptInput).trim();
    if (!text || isRunningTurn || !activeMatter) return;

    setPromptInput('');
    setShowSamplePromptsMenu(false);
    setIsRunningTurn(true);
    setLiveProgress({
      matterId: activeMatter.id,
      phase: 'assembling_prompt',
      statusText: `Working with ${formatAgentLabel(currentProviderConfig)} (${turnModel})...`,
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
    } catch (err) {
      alert(`Agent Loop Error: ${(err as Error).message}`);
    } finally {
      setIsRunningTurn(false);
      setLiveProgress(null);
    }
  };

  // Filter active and settled matters by search query
  const q = matterSearchQuery.trim().toLowerCase();
  const activeMattersList = state.matters.filter((m) => {
    if (m.settled) return false;
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.clientName.toLowerCase().includes(q) ||
      m.matterNumber.toLowerCase().includes(q)
    );
  });

  const userSettledMatters = state.matters.filter((m) => {
    if (!m.settled) return false;
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.clientName.toLowerCase().includes(q) ||
      m.matterNumber.toLowerCase().includes(q)
    );
  });

  const filteredArchivedSettled = ARCHIVED_SETTLED_MATTERS.filter((item) => {
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.clientName.toLowerCase().includes(q) ||
      item.matterNumber.toLowerCase().includes(q)
    );
  });

  const totalSettledCount = userSettledMatters.length + filteredArchivedSettled.length;
  const visibleArchivedCount = Math.max(0, settledVisibleCount - userSettledMatters.length);
  const visibleArchivedSettled = filteredArchivedSettled.slice(0, visibleArchivedCount);
  const remainingSettledCount = Math.max(
    0,
    totalSettledCount - (userSettledMatters.length + visibleArchivedSettled.length)
  );

  const readyAgentsCount = (state.agentOnboarding?.agentInstances || []).filter(
    (i) => i.status === 'ready'
  ).length;

  const activeMonogram = activeMatter
    ? getMonogram(activeMatter.clientName, activeMatter.name)
    : { code: 'LX', colorClass: BADGE_PALETTE[0] };

  return (
    <div className="h-screen w-screen flex bg-[#0b0b0e] text-zinc-200 select-none overflow-hidden">
      {/* LEFT SIDEBAR: T3 Code Style Active Matters & Lower Settled Drawer */}
      <aside className="w-[272px] shrink-0 bg-[#09090b] border-r border-white/[0.06] flex flex-col justify-between">
        {/* Top macOS Titlebar Strip & Search Bar */}
        <div className="shrink-0">
          <div
            className={`h-9 flex items-center justify-between px-3 app-drag-region ${
              isMac ? 'pl-20' : 'pl-3'
            }`}
          >
            <div className="flex items-center gap-1.5 app-no-drag">
              <span className="text-[12px] font-semibold tracking-tight text-zinc-200">
                LexHarness
              </span>
              <span className="text-[10px] text-zinc-600 font-mono">
                {activeProfile?.name?.split(' ')[0] || 'Defense'}
              </span>
            </div>
          </div>

          {/* T3-Style Search & Action Row */}
          <div className="px-2.5 pb-2 pt-0.5 flex items-center gap-1">
            <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] focus-within:border-white/[0.12] transition">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={matterSearchQuery}
                onChange={(e) => setMatterSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
              {matterSearchQuery && (
                <button
                  onClick={() => setMatterSearchQuery('')}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setNewMatterJurisdiction(activeProfile.defaultJurisdiction);
                setNewMatterCitation(activeProfile.defaultCitationStyle);
                setNewMatterPracticeArea(activeProfile.activePracticeAreaId);
                setShowNewMatterModal(true);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
              title="Create New Matter"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setPromptInput('');
                const composerEl = document.getElementById('tour-composer');
                const textarea = composerEl?.querySelector('textarea');
                textarea?.focus();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
              title="New Prompt / Work Product Instruction"
            >
              <SquarePen className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* UPPER PANE: Active Matters List */}
        <div
          id="tour-matter-overview"
          className="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-[140px]"
        >
          {activeMattersList.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-white/[0.07] text-center space-y-2 my-2">
              <p className="text-xs text-zinc-400 font-medium">
                {matterSearchQuery ? 'No matching active matters' : 'All matters settled'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Create a new matter or reopen one from Settled below.
              </p>
              <button
                onClick={() => {
                  setNewMatterJurisdiction(activeProfile?.defaultJurisdiction ?? '');
                  setNewMatterCitation(activeProfile?.defaultCitationStyle ?? '');
                  setNewMatterPracticeArea(
                    activeProfile?.activePracticeAreaId ?? 'vt_suppression_art11'
                  );
                  setShowNewMatterModal(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-[11px] font-medium transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Matter</span>
              </button>
            </div>
          ) : (
            activeMattersList.map((m, idx) => {
              const isSelected = m.id === activeMatter?.id;
              const monogram = getMonogram(m.clientName, m.name);
              const relativeLabels = ['4m', '22h', '2d', '3d', '5d'];
              const timeLabel = relativeLabels[idx % relativeLabels.length];
              const practicePreset = state.promptSettings.practiceAreaPresets.find(
                (p) => p.id === m.practiceArea
              );
              const practiceShort = practicePreset?.shortLabel || 'Legal Matter';

              return (
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
                  onClick={async () => {
                    const updated = await ipcBridge.selectMatter(m.id);
                    setState(updated);
                    setTurnPracticeArea(m.practiceArea);
                  }}
                  className={`group relative w-full px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#18181d] text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                  }`}
                >
                  {/* Row 1: Monogram Badge + Client Name + Relative Time / Quick Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0 ${monogram.colorClass}`}
                      >
                        {monogram.code}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate">
                        {m.clientName}
                      </span>
                    </div>

                    <span className="text-[11px] text-zinc-500 shrink-0 group-hover:hidden">
                      {timeLabel}
                    </span>

                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleMatterSettled(m, true);
                        }}
                        title="Settle matter to lower pane"
                        className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-emerald-300 transition"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Matter Title */}
                  <div
                    className={`text-[13px] font-medium truncate mt-1 ${
                      isSelected ? 'text-zinc-100' : 'text-zinc-200'
                    }`}
                  >
                    {m.name}
                  </div>

                  {/* Row 3: Practice Area & Docket Metadata */}
                  <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-zinc-500">
                    <span className="truncate">{practiceShort}</span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                      {m.matterNumber.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* LOWER PANE: T3 Code Style "Settled" Matters Drawer (123 settled + Show 25 more) */}
        <div className="border-t border-white/[0.06] flex flex-col min-h-0 max-h-[46%] shrink-0">
          <button
            onClick={() => setIsSettledOpen((prev) => !prev)}
            className="w-full px-3.5 py-2 flex items-center justify-between text-[12px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer shrink-0"
          >
            <span className="font-medium">Settled</span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
              <span>{totalSettledCount}</span>
              {isSettledOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {isSettledOpen && (
            <div className="flex-1 overflow-y-auto px-2 pb-1.5 space-y-0.5">
              {/* User-Settled SQLite Matters */}
              {userSettledMatters.map((m) => {
                const monogram = getMonogram(m.clientName, m.name);
                const isSelected = m.id === activeMatter?.id;
                return (
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
                    onClick={async () => {
                      const updated = await ipcBridge.selectMatter(m.id);
                      setState(updated);
                      setTurnPracticeArea(m.practiceArea);
                    }}
                    className={`group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#18181d] text-zinc-100'
                        : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0 ${monogram.colorClass}`}
                      >
                        {monogram.code}
                      </span>
                      <span className="text-[12px] truncate">{m.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMatterSettled(m, false);
                      }}
                      title="Move back to Active matters"
                      className="hidden group-hover:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-zinc-300 shrink-0"
                    >
                      <ArchiveRestore className="w-2.5 h-2.5" />
                      <span>Reopen</span>
                    </button>
                    <span className="text-[11px] text-zinc-600 shrink-0 group-hover:hidden">
                      now
                    </span>
                  </div>
                );
              })}

              {/* Historical Settled Dockets */}
              {visibleArchivedSettled.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOpenArchivedSettled(item)}
                  className="w-full group flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200 transition cursor-pointer"
                  title={`${item.title} (${item.clientName} • ${item.matterNumber}) — Click to open matter`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-[12px] truncate">{item.title}</span>
                  </div>
                  <span className="text-[11px] text-zinc-600 group-hover:text-zinc-400 shrink-0">
                    {item.relativeTime}
                  </span>
                </button>
              ))}

              {/* Show 25 more button */}
              {remainingSettledCount > 0 && (
                <button
                  onClick={() =>
                    setSettledVisibleCount((prev) =>
                      Math.min(totalSettledCount, prev + 25)
                    )
                  }
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-0.5 rounded-lg text-[11.5px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>
                    Show {Math.min(25, remainingSettledCount)} more
                  </span>
                </button>
              )}

              {settledVisibleCount > 10 && (
                <button
                  onClick={() => setSettledVisibleCount(10)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                >
                  <span>Show fewer</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM UTILITY BAR: Settings, Agents, Telemetry & Guided Tour */}
        <div className="h-10 px-3 border-t border-white/[0.06] flex items-center justify-between text-zinc-500 shrink-0">
          <div className="flex items-center gap-1">
            <button
              id="tour-settings-button"
              onClick={() => {
                setStudioInitialTab('layer1_core');
                setIsStudioOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] hover:text-zinc-200 transition cursor-pointer"
              title="Settings & Prompt Governance"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsConnectAgentsOpen(true)}
              className="relative p-1.5 rounded-lg hover:bg-white/[0.05] hover:text-zinc-200 transition cursor-pointer"
              title={`Connected Assistants (${readyAgentsCount} Ready)`}
            >
              <Plug className="w-3.5 h-3.5" />
              {readyAgentsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setIsRoutingDrawerOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg hover:bg-white/[0.05] transition cursor-pointer ${
                isRoutingDrawerOpen ? 'text-emerald-400 bg-white/[0.05]' : 'hover:text-zinc-200'
              }`}
              title="Decision Telemetry & PII Shield Inspector (Cmd+Shift+D)"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>

            <button
              id="tour-top-button"
              onClick={async () => {
                if (state.activeMatterId !== 'matter-1794160132556') {
                  await handleLoadSampleCase();
                }
                setIsTutorialOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] hover:text-amber-300 transition cursor-pointer"
              title="Interactive Guided Tour"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* CENTER WORK VIEW: Minimal Header, Calm Conversation Stream & Floating Composer */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0b0b0e]">
        {/* Top Minimal Breadcrumb Bar */}
        <header className="h-11 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 app-drag-region">
          <div className="flex items-center gap-2.5 min-w-0 app-no-drag">
            {activeMatter ? (
              <>
                <span
                  className={`w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0 ${activeMonogram.colorClass}`}
                >
                  {activeMonogram.code}
                </span>
                <span className="text-xs text-zinc-400 truncate max-w-[180px]">
                  {activeMatter.clientName}
                </span>
                <span className="text-zinc-700">/</span>
                <button
                  onClick={() => openEditMatterDialog(activeMatter)}
                  className="text-[13px] font-medium text-zinc-100 hover:text-white truncate cursor-pointer"
                  title="Click to edit matter caption, docket number, or forum"
                >
                  {activeMatter.name}
                </button>
                {activeMatter.settled && (
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-zinc-400 font-medium">
                    Settled
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-zinc-500">No Active Matter</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 app-no-drag">
            <button
              onClick={() => setIsRightPaneVisible((prev) => !prev)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isRightPaneVisible
                  ? 'text-zinc-300 bg-white/[0.04] hover:bg-white/[0.08]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
              }`}
              title="Toggle Right Context & Redline Pane"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Legal Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-8 select-text">
          <div className="max-w-[760px] mx-auto space-y-8">
            {!activeMatter ? (
              <div className="my-16 p-8 rounded-2xl bg-[#121216] border border-white/[0.06] text-center space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 flex items-center justify-center mx-auto">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    No Active Matter Selected
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Select an active or settled matter from the left sidebar, or create a new matter workspace.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setNewMatterJurisdiction(activeProfile?.defaultJurisdiction ?? '');
                      setNewMatterCitation(activeProfile?.defaultCitationStyle ?? '');
                      setNewMatterPracticeArea(
                        activeProfile?.activePracticeAreaId ?? 'vt_suppression_art11'
                      );
                      setShowNewMatterModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Matter</span>
                  </button>
                  <button
                    onClick={async () => {
                      await handleLoadSampleCase();
                      setIsTutorialOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 text-xs font-medium border border-white/[0.07] transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sample Case Tour</span>
                  </button>
                </div>
              </div>
            ) : null}

            {activeMatter && !tutorialBannerDismissed && (
              <div className="px-4 py-2.5 rounded-xl bg-[#121216] border border-white/[0.07] flex items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                  <span>
                    New to LexHarness? Take the 2-minute tour with sample casework.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      if (state.activeMatterId !== 'matter-1794160132556') {
                        await handleLoadSampleCase();
                      }
                      setIsTutorialOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 font-medium text-[11px] transition cursor-pointer"
                  >
                    Start Tour
                  </button>
                  <button
                    onClick={() => {
                      setTutorialBannerDismissed(true);
                      try {
                        localStorage.setItem('lexharness_tutorial_seen', 'true');
                      } catch {
                        // ignore
                      }
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activeMatter &&
              state.messages.map((msg: ThreadMessage) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-xl px-4 py-2.5 rounded-2xl bg-[#1c1c22] border border-white/[0.06] text-zinc-200 text-[13.5px] leading-relaxed">
                        {msg.content}
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
                const totalDurationMs = msg.toolCalls.reduce(
                  (acc, tc) => acc + (tc.durationMs || 12),
                  0
                );
                const durationLabel =
                  totalDurationMs >= 1000
                    ? `${Math.round(totalDurationMs / 1000)}s`
                    : `${Math.max(18, totalDurationMs)}ms`;
                const isEditingThisMsg = editingMsgId === msg.id;
                const workProductLabel = detectWorkProductBadge(msg);

                return (
                  <div
                    key={msg.id}
                    id={
                      msg.adversarialReviews.length > 0
                        ? 'tour-review-gate'
                        : undefined
                    }
                    className="space-y-3 group"
                  >
                    {/* T3 Code Style Quiet Collapsible "Worked for ..." Trace Summary Line */}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() =>
                          setExpandedReviewMsgIds((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                        title="Click to inspect research tool calls, multi-LLM peer review objections, and PII audit"
                      >
                        <span>Worked for {durationLabel}</span>
                        {msg.toolCalls.length > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {msg.toolCalls.length} corpus{' '}
                              {msg.toolCalls.length === 1 ? 'search' : 'searches'}
                            </span>
                          </>
                        )}
                        {msg.adversarialReviews.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400/85">
                              Peer Reviewed ({msg.adversarialReviews.length} checks
                              {totalObjections > 0
                                ? `, ${totalObjections} cured`
                                : ''}
                              )
                            </span>
                          </>
                        )}
                        {msg.piiAudit && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400/85">
                              PII Protected ({msg.piiAudit.entitiesDetectedCount})
                            </span>
                          </>
                        )}
                        {isReviewExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </button>

                      {/* Quiet Right Actions on Hover */}
                      <div className="flex items-center gap-2 opacity-75 group-hover:opacity-100 transition">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-400">
                          {workProductLabel}
                        </span>
                        {msg.isEditedByAttorney && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/90 text-[10px]">
                            Edited
                          </span>
                        )}
                        <button
                          onClick={() => {
                            if (isEditingThisMsg) {
                              setEditingMsgId(null);
                            } else {
                              setEditingMsgId(msg.id);
                              setEditingMsgContent(msg.content);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                          title="Edit work product text inline"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditingThisMsg ? 'Cancel' : 'Edit'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Trace Drawer (Tucked Away by Default) */}
                    {isReviewExpanded && (
                      <div className="p-4 rounded-xl bg-[#111115] border border-white/[0.07] space-y-4 text-xs">
                        {/* Metadata & Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.05] text-zinc-300 font-mono text-[11px]">
                              Model: {msg.primaryModel || turnModel}
                            </span>
                            {msg.routeTier && (
                              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]">
                                {msg.routeTier === 'FRONTIER_REASONING'
                                  ? 'Frontier Reasoning'
                                  : msg.routeTier === 'FAST_ECONOMY'
                                    ? 'Fast Economy'
                                    : 'Local Air-Gapped'}
                              </span>
                            )}
                            {msg.piiAudit && (
                              <button
                                onClick={() => setIsRoutingDrawerOpen(true)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-[11px] transition cursor-pointer"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>
                                  Inspect PII Vault ({msg.piiAudit.entitiesDetectedCount} tokens)
                                </span>
                              </button>
                            )}
                          </div>

                          {msg.initialDraftBeforeReview && (
                            <button
                              onClick={() =>
                                setShowInitialDraftMsgIds((prev) => ({
                                  ...prev,
                                  [msg.id]: !prev[msg.id],
                                }))
                              }
                              className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-zinc-200 transition cursor-pointer"
                            >
                              {showingInitialDraft
                                ? 'Show Final Revised Draft'
                                : 'Compare Pre-Review Draft'}
                            </button>
                          )}
                        </div>

                        {/* Corpus Searches / Tool Calls */}
                        {msg.toolCalls.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                              Corpus & Precedent Searches ({msg.toolCalls.length})
                            </div>
                            <div className="space-y-1">
                              {msg.toolCalls.map((tc) => {
                                const isTcOpen = Boolean(expandedToolCallIds[tc.id]);
                                return (
                                  <div key={tc.id}>
                                    <button
                                      onClick={() =>
                                        setExpandedToolCallIds((prev) => ({
                                          ...prev,
                                          [tc.id]: !prev[tc.id],
                                        }))
                                      }
                                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-[11px] text-left transition cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileSearch className="w-3 h-3 text-zinc-400 shrink-0" />
                                        <span className="font-mono text-zinc-300 shrink-0">
                                          {tc.toolName}
                                        </span>
                                        <span className="text-zinc-500 truncate">
                                          — {tc.resultSummary}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-zinc-600 shrink-0 ml-2">
                                        {tc.durationMs}ms
                                      </span>
                                    </button>
                                    {isTcOpen && (
                                      <pre className="mt-1 p-2.5 rounded-lg bg-[#09090b] border border-white/[0.06] text-[11px] font-mono text-zinc-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {tc.rawOutput}
                                      </pre>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Multi-LLM Peer Review Cards */}
                        {msg.adversarialReviews.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {msg.adversarialReviews.map((rev) => (
                              <div
                                key={rev.id}
                                className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <div className="text-[11.5px] font-medium text-zinc-200">
                                      {rev.criticTitle}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500">
                                      {rev.provider} ({rev.model})
                                    </div>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] rounded-full ${
                                      rev.objections.length > 0
                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                                        : 'bg-white/[0.05] text-zinc-300'
                                    }`}
                                  >
                                    {rev.objections.length > 0
                                      ? `${rev.objections.length} Cured`
                                      : 'Verified'}
                                  </span>
                                </div>

                                {rev.objections.map((obj, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded bg-[#0b0b0e] border border-white/[0.05] space-y-1 text-[11px]"
                                  >
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-mono text-amber-300/90">
                                        {obj.category}
                                      </span>
                                      <span className="text-zinc-500 truncate max-w-[160px]">
                                        {obj.location}
                                      </span>
                                    </div>
                                    <p className="text-zinc-400 leading-relaxed">
                                      <strong className="text-zinc-300">Issue: </strong>
                                      {obj.critique}
                                    </p>
                                    <p className="text-emerald-300/85 leading-relaxed">
                                      <strong>Cure: </strong>
                                      {obj.requiredFix}
                                    </p>
                                  </div>
                                ))}

                                {rev.dissentingConsiderations && (
                                  <div className="p-2 rounded bg-white/[0.02] text-[11px] text-zinc-400">
                                    <strong className="text-zinc-300">Bench Note: </strong>
                                    {rev.dissentingConsiderations}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Work Product Body or Inline Editor */}
                    <div>
                      {isEditingThisMsg ? (
                        <div className="space-y-3 p-4 rounded-xl bg-[#121216] border border-white/[0.12]">
                          <div className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="font-medium flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              Direct Work Product Editor
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {editingMsgContent.length} chars
                            </span>
                          </div>
                          <textarea
                            value={editingMsgContent}
                            onChange={(e) => setEditingMsgContent(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                if (!isSavingMsg) {
                                  setIsSavingMsg(true);
                                  try {
                                    const updated = await ipcBridge.updateMessage({
                                      messageId: msg.id,
                                      content: editingMsgContent,
                                    });
                                    setState(updated);
                                    setEditingMsgId(null);
                                  } finally {
                                    setIsSavingMsg(false);
                                  }
                                }
                              }
                            }}
                            rows={14}
                            className="w-full p-3.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-100 whitespace-pre-wrap leading-relaxed focus:outline-none focus:border-white/[0.2] resize-y"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-zinc-500 font-mono">
                              ⌘+Enter to save
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={isSavingMsg}
                                onClick={() => setEditingMsgId(null)}
                                className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={isSavingMsg}
                                onClick={async () => {
                                  setIsSavingMsg(true);
                                  try {
                                    const updated = await ipcBridge.updateMessage({
                                      messageId: msg.id,
                                      content: editingMsgContent,
                                    });
                                    setState(updated);
                                    setEditingMsgId(null);
                                  } finally {
                                    setIsSavingMsg(false);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition"
                              >
                                <Check className="w-3 h-3" />
                                <span>{isSavingMsg ? 'Saving...' : 'Save'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : showingInitialDraft && msg.initialDraftBeforeReview ? (
                        <div className="space-y-3 p-4 rounded-xl bg-[#121216] border border-amber-500/20">
                          <div className="text-xs text-amber-300/90 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Showing initial pre-review draft before automated citation & opposing counsel cures.
                            </span>
                          </div>
                          {renderCalmLegalContent(msg.initialDraftBeforeReview)}
                        </div>
                      ) : (
                        renderCalmLegalContent(msg.content)
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Live Turn Progress Indicator */}
            {isRunningTurn && liveProgress && (
              <div className="py-3 flex items-center gap-2.5 text-xs text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
                <span>{liveProgress.statusText}</span>
                {liveProgress.detailText && (
                  <span className="text-zinc-600">• {liveProgress.detailText}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM FLOATING T3-STYLE COMPOSER */}
        <div
          id="tour-composer"
          className="px-6 pb-5 pt-2 bg-gradient-to-t from-[#0b0b0e] via-[#0b0b0e] to-transparent shrink-0"
        >
          <div className="max-w-[760px] mx-auto space-y-2 relative">
            {/* Contextual Edited Document Review Pill (Only appears when a document was manually edited) */}
            {docNeedingReview && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#131317] border border-white/[0.08] text-xs">
                <span className="text-zinc-400 truncate">
                  Edited <strong className="text-zinc-200">{docNeedingReview.doc.title}</strong> ({docNeedingReview.doc.batesRange})
                </span>
                <button
                  disabled={isRunningTurn}
                  onClick={() => {
                    const promptText = `Run a comprehensive peer review on the updated document "${docNeedingReview.doc.title}" (Bates: ${docNeedingReview.doc.batesRange}). Audit citations against controlling forum law and discovery exhibits, identify weaknesses, and propose a redline revision.`;
                    setPromptInput(promptText);
                  }}
                  className="text-amber-300 hover:text-amber-200 font-medium text-[11px] ml-3 shrink-0 cursor-pointer"
                >
                  Run Peer Review →
                </button>
              </div>
            )}

            {/* Tucked-away Sample Prompts Popover */}
            {showSamplePromptsMenu && (
              <div className="p-2 rounded-xl bg-[#141419] border border-white/[0.08] shadow-2xl space-y-1">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{activeProfile.name} Sample Prompts</span>
                  <button
                    onClick={() => setShowSamplePromptsMenu(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(activeProfile.samplePrompts || []).map((qp, i) => (
                  <button
                    key={i}
                    disabled={isRunningTurn}
                    onClick={() => handleSubmitPrompt(qp)}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] text-left text-xs text-zinc-300 transition cursor-pointer truncate"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            )}

            {/* Main T3-Style Rounded Composer Box */}
            <div className="relative rounded-2xl bg-[#131317] border border-white/[0.08] focus-within:border-white/[0.15] shadow-2xl px-4 pt-3 pb-2.5 transition">
              {/* Top Vertical Resize Handle */}
              <div
                onMouseDown={handleStartResizeComposer}
                title="Drag to resize prompt area"
                className="group absolute -top-1.5 left-4 right-4 h-3 cursor-row-resize flex items-center justify-center z-10 select-none"
              >
                <div className="w-10 h-1 rounded-full bg-white/[0.08] group-hover:bg-white/[0.28] group-active:bg-white/[0.45] transition-colors" />
              </div>

              <textarea
                value={promptInput}
                disabled={!activeMatter || isRunningTurn}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitPrompt();
                  }
                }}
                style={{ height: `${composerHeight}px` }}
                placeholder={
                  activeMatter
                    ? `Draft a motion, audit discovery exhibits, or check citations with ${formatAgentLabel(
                        currentProviderConfig
                      )}...`
                    : 'Select or create a matter to begin...'
                }
                className="w-full bg-transparent text-[13.5px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-y min-h-[56px] max-h-[60vh] leading-relaxed disabled:opacity-50"
              />

              {/* Quiet Composer Footer Row */}
              <div className="flex items-center justify-between gap-2 pt-2">
                {/* Left Controls: Prompts menu, Practice Task, Quiet PII Shield */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowSamplePromptsMenu((prev) => !prev)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition cursor-pointer"
                    title="Sample legal prompts"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  <select
                    value={turnPracticeArea}
                    onChange={(e) =>
                      setTurnPracticeArea(e.target.value as PracticeAreaId)
                    }
                    className="px-2 py-1 rounded-lg bg-transparent hover:bg-white/[0.04] text-[11.5px] text-zinc-400 hover:text-zinc-200 focus:outline-none cursor-pointer truncate max-w-[190px]"
                    title="Active Legal Task Focus"
                  >
                    {state.promptSettings.practiceAreaPresets.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="bg-[#131317] text-zinc-200"
                      >
                        {p.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right Controls: Agent, Model, Review Mode & Circular Send Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={turnProvider}
                    onChange={(e) => {
                      if (e.target.value === '__connect__') {
                        setIsConnectAgentsOpen(true);
                        return;
                      }
                      handleProviderChange(e.target.value as LLMProviderId);
                    }}
                    className="bg-transparent hover:bg-white/[0.04] px-1.5 py-1 rounded-md text-[11.5px] text-zinc-400 hover:text-zinc-200 focus:outline-none cursor-pointer"
                    title="Select Assistant Provider"
                  >
                    {state.providers
                      .filter(
                        (p) =>
                          p.id === 'legal-simulator' ||
                          p.hasApiKey ||
                          Boolean(p.runtimeStatus?.installed) ||
                          p.id === turnProvider
                      )
                      .map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="bg-[#131317] text-zinc-200"
                        >
                          {formatAgentLabel(p)}
                        </option>
                      ))}
                    <option
                      value="__connect__"
                      className="bg-[#131317] text-amber-300"
                    >
                      + Connect Agents...
                    </option>
                  </select>

                  <select
                    value={turnModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="bg-transparent hover:bg-white/[0.04] px-1.5 py-1 rounded-md text-[11.5px] font-mono text-zinc-300 focus:outline-none cursor-pointer max-w-[155px] truncate"
                    title="Select Model"
                  >
                    {availableModelsForTurnProvider.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        className="bg-[#131317] text-zinc-200 font-sans"
                      >
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={turnReviewMode}
                    onChange={(e) =>
                      setTurnReviewMode(e.target.value as AdversarialReviewMode)
                    }
                    className="hidden md:inline-block bg-transparent hover:bg-white/[0.04] px-1.5 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer"
                    title="Peer Review Mode"
                  >
                    <option
                      value="multi_llm_default"
                      className="bg-[#131317] text-zinc-200"
                    >
                      Peer Review
                    </option>
                    <option
                      value="single_critic"
                      className="bg-[#131317] text-zinc-200"
                    >
                      Quick Check
                    </option>
                    <option
                      value="direct_bypass"
                      className="bg-[#131317] text-zinc-200"
                    >
                      Direct
                    </option>
                  </select>

                  <button
                    disabled={isRunningTurn || !promptInput.trim()}
                    onClick={() => handleSubmitPrompt()}
                    title="Send prompt (Enter)"
                    className="w-7 h-7 rounded-full bg-zinc-200 hover:bg-white disabled:bg-white/[0.06] disabled:text-zinc-600 text-zinc-950 flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    {isRunningTurn ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 stroke-[2.25]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT PANE: T3-Style Floating Context & Lineage Card + Detail Inspector */}
      {isRightPaneVisible && (
        <>
          <div
            onMouseDown={handleStartResizeRight}
            className="w-1 shrink-0 bg-transparent hover:bg-white/[0.08] cursor-col-resize transition-colors"
            title="Drag to resize right pane"
          />
          <RightWorkspacePane
            width={rightPaneWidth}
            matterId={activeMatter?.id ?? ''}
            activeMatter={activeMatter}
            adversarialConfig={state.adversarialConfig}
            documents={state.documents}
            documentVersions={state.documentVersions}
            chronologyFacts={state.chronologyFacts}
            selectedDocId={selectedDocId}
            onSelectDoc={setSelectedDocId}
            currentTab={rightPaneTab}
            onTabChange={setRightPaneTab}
            onEditMatter={openEditMatterDialog}
            onConfigureAgents={() => {
              setStudioInitialTab('providers_models');
              setIsStudioOpen(true);
            }}
            onCreateDocument={async (payload) => {
              const updated = await ipcBridge.createDocument(payload);
              setState(updated);
            }}
            onUpdateDocument={async (payload) => {
              const updated = await ipcBridge.updateDocument(payload);
              setState(updated);
            }}
            onUpdateDocumentVersion={async (versionId, content) => {
              const updated = await ipcBridge.updateDocumentVersion({
                versionId,
                content,
              });
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
        </>
      )}

      {/* Routing Decision Debug Drawer */}
      {state && (
        <RoutingDebugDrawer
          isOpen={
            isRoutingDrawerOpen ||
            Boolean(state.privacyRoutingSettings?.debugModeEnabled)
          }
          onClose={() => {
            setIsRoutingDrawerOpen(false);
            if (state.privacyRoutingSettings?.debugModeEnabled) {
              ipcBridge
                .savePrivacyRoutingSettings({ debugModeEnabled: false })
                .then(setState);
            }
          }}
          activeMatter={activeMatter}
          settings={state.privacyRoutingSettings}
          recentLogs={state.recentRoutingLogs}
          ancillaryRegistry={state.ancillaryModelRegistry}
          onClearLogs={async () => {
            const next = await ipcBridge.clearRoutingLogs({
              matterId: activeMatter?.id,
            });
            setState(next);
          }}
          onExportLogs={async () => {
            await ipcBridge.exportRoutingLogs();
          }}
          onSaveSettings={async (updated) => {
            const next = await ipcBridge.savePrivacyRoutingSettings(updated);
            setState(next);
          }}
          onRepickAncillaryModel={async (role, providerId, modelId) => {
            const next = await ipcBridge.repickAncillaryModel({
              role,
              providerId,
              modelId,
            });
            setState(next);
          }}
          onRefreshAncillaryModels={async () => {
            const next = await ipcBridge.refreshAncillaryModelRegistry();
            setState(next);
          }}
        />
      )}

      {/* Right-Click Context Menu for Matter Items */}
      {matterContextMenu && (
        <div
          style={{
            top: matterContextMenu.y,
            left: matterContextMenu.x,
          }}
          className="fixed z-50 w-60 rounded-xl bg-[#141419] border border-white/[0.1] shadow-2xl py-1.5 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-white/[0.06] text-[10px] font-mono text-zinc-500 truncate">
            {matterContextMenu.matter.name}
          </div>
          <button
            onClick={() =>
              handleToggleMatterSettled(matterContextMenu.matter)
            }
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-200 hover:bg-white/[0.06] transition"
          >
            {matterContextMenu.matter.settled ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reopen to Active Matters</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Settle Matter to Lower Pane</span>
              </>
            )}
          </button>
          <button
            onClick={() => openEditMatterDialog(matterContextMenu.matter)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-200 hover:bg-white/[0.06] transition"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Matter Settings...</span>
          </button>
          <div className="my-1 border-t border-white/[0.06]" />
          <button
            onClick={() => openDeleteMatterConfirm(matterContextMenu.matter)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-300 hover:bg-rose-500/15 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Matter...</span>
          </button>
        </div>
      )}

      {/* Edit Matter Settings Dialog */}
      {editingMatter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121216] border border-white/[0.1] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Matter Settings — {editingMatter.name}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {editingMatter.id}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">
                  Matter / Case Caption Name
                </label>
                <input
                  type="text"
                  value={editMatterName}
                  onChange={(e) => setEditMatterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Client / Defendant Name
                  </label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Docket ID / Matter Number
                  </label>
                  <input
                    type="text"
                    value={editMatterNumber}
                    onChange={(e) => setEditMatterNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 font-mono focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Governing Jurisdiction & Court Forum
                </label>
                <input
                  type="text"
                  value={editJurisdiction}
                  onChange={(e) => setEditJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Citation Style / Manual
                  </label>
                  <input
                    type="text"
                    value={editCitationStyle}
                    onChange={(e) => setEditCitationStyle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Default Task Persona
                  </label>
                  <select
                    value={editPracticeArea}
                    onChange={(e) =>
                      setEditPracticeArea(e.target.value as PracticeAreaId)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
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
                <label className="block text-zinc-400 mb-1">
                  Local Matter Workspace Folder Path
                </label>
                <input
                  type="text"
                  value={editFolderPath}
                  onChange={(e) => setEditFolderPath(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 font-mono focus:outline-none focus:border-white/[0.25]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
              <button
                onClick={() => {
                  const target = editingMatter;
                  setEditingMatter(null);
                  openDeleteMatterConfirm(target);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium text-rose-300 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Matter...</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMatter(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
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
                      settled: editingMatter.settled,
                    });
                    setState(updated);
                    if (editingMatter.id === activeMatter?.id) {
                      setTurnPracticeArea(editPracticeArea);
                    }
                    setEditingMatter(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Matter Confirmation Dialog */}
      {deletingMatter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121216] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Confirm Permanent Matter Deletion
                </h3>
                <p className="text-[11px] text-rose-300 font-mono">
                  {deletingMatter.matterNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#09090b] border border-white/[0.07] text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-zinc-100">{deletingMatter.name}</strong>{' '}
                ({deletingMatter.clientName})?
              </p>
              <p className="text-[11px] text-zinc-500">
                This action will remove the Matter and all associated legal
                messages, indexed discovery documents, redline versions, and
                chronology facts from the local database.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
              <button
                onClick={() => setDeletingMatter(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 transition"
              >
                Cancel
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
                  setSelectedDocId(null);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Matter</span>
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
        privacyRoutingSettings={state.privacyRoutingSettings}
        onSavePrivacyRoutingSettings={async (updated) => {
          const next = await ipcBridge.savePrivacyRoutingSettings(updated);
          setState(next);
        }}
        onExportRoutingLogs={async () => {
          await ipcBridge.exportRoutingLogs();
        }}
        onClearRoutingLogs={async () => {
          const next = await ipcBridge.clearRoutingLogs({
            matterId: activeMatter?.id,
          });
          setState(next);
        }}
        isSampleCaseLoaded={state.activeMatterId === 'matter-1794160132556'}
        ancillaryRegistry={state.ancillaryModelRegistry}
        onRepickAncillaryModel={async (role, providerId, modelId) => {
          const next = await ipcBridge.repickAncillaryModel({
            role,
            providerId,
            modelId,
          });
          setState(next);
        }}
        onRefreshAncillaryModels={async () => {
          const next = await ipcBridge.refreshAncillaryModelRegistry();
          setState(next);
        }}
        onStartTutorial={() => setIsTutorialOpen(true)}
        onLoadSampleCase={handleLoadSampleCase}
        onCloseSampleCase={handleCloseSampleCase}
      />

      {/* New Legal Matter Modal */}
      {showNewMatterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121216] border border-white/[0.1] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100">
              Create New Legal Matter ({activeProfile.name})
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">
                  Matter / Case Caption
                </label>
                <input
                  type="text"
                  value={newMatterName}
                  onChange={(e) => setNewMatterName(e.target.value)}
                  placeholder="e.g., State of Vermont v. Jordan Mercer"
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Client / Defendant Name
                  </label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Jordan Mercer"
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Docket ID / Matter No.
                  </label>
                  <input
                    type="text"
                    value={newMatterNumber}
                    onChange={(e) => setNewMatterNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 font-mono focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">
                  Governing Jurisdiction & Forum
                </label>
                <input
                  type="text"
                  value={newMatterJurisdiction}
                  onChange={(e) => setNewMatterJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Citation Manual
                  </label>
                  <input
                    type="text"
                    value={newMatterCitation}
                    onChange={(e) => setNewMatterCitation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Default Task Persona
                  </label>
                  <select
                    value={newMatterPracticeArea}
                    onChange={(e) =>
                      setNewMatterPracticeArea(e.target.value as PracticeAreaId)
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
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
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
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
                className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition"
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
          activeMatterId={activeMatter?.id ?? ''}
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
            setNewMatterJurisdiction(activeProfile?.defaultJurisdiction ?? '');
            setNewMatterCitation(activeProfile?.defaultCitationStyle ?? '');
            setNewMatterPracticeArea(
              activeProfile?.activePracticeAreaId ?? 'vt_suppression_art11'
            );
            setShowNewMatterModal(true);
          }}
        />
      )}

      {/* Interactive Guided Tour & Tutorial Overlay */}
      <TutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          try {
            localStorage.setItem('lexharness_tutorial_seen', 'true');
          } catch {
            // ignore
          }
          setTutorialBannerDismissed(true);
        }}
        activeMatterId={activeMatter?.id ?? ''}
        isSampleCaseLoaded={state.activeMatterId === 'matter-1794160132556'}
        onLoadSampleCase={handleLoadSampleCase}
        onCloseSampleCase={handleCloseSampleCase}
        onSelectTab={setRightPaneTab}
      />
    </div>
  );
};
