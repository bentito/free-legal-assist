import React, { useEffect, useState } from 'react';
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
import {
  RightWorkspacePane,
  inferCategoryFromFileName,
} from './components/RightWorkspacePane';
import { TutorialOverlay } from './components/TutorialOverlay';
import { RoutingDebugDrawer } from './components/RoutingDebugDrawer';
import { DesktopUpdateButton } from './components/DesktopUpdateButton';
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
  Compass,
  Cpu,
  Download,
  Edit3,
  FileCheck2,
  FileSearch,
  FileUp,
  FolderPlus,
  GitBranch,
  ListFilter,
  Loader2,
  PanelRight,
  Plug,
  Plus,
  RotateCcw,
  Scale,
  ScrollText,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

const BADGE_PALETTE = [
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
];

const formatRelativeTime = (isoDate?: string): string => {
  if (!isoDate) return 'now';
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return 'now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
};

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

/**
 * Highlights inline legal citations, statutes, and Bates ranges as subtle T3-style monospace pills
 * and formats inline Markdown (**bold**, *italic*, `code`) without showing raw asterisks.
 */
const highlightCitationsOnly = (text: string, keyPrefix = 'c'): React.ReactNode[] => {
  const citationRegex = /(\b(?:(?:DEF|STATE|EX|DOC|WP|AUTH|APEX)-[A-Z0-9-]+(?:–[A-Z0-9-]+)?|\d{4}\s+VT\s+\d+|\d+\s+V\.S\.A\.\s+§\s*\d+[a-z0-9()]*|T\.C\.A\.\s+§\s*[\d-]+|Tenn\.\s+Code\s+Ann\.\s+§\s*[\d-a-z()]+|V\.R\.Cr\.P\.\s+\d+[a-z0-9()]*|V\.R\.E\.\s+\d+[a-z0-9()]*|Article\s+11)\b)/g;
  const parts = text.split(citationRegex);
  return parts.map((part, i) => {
    if (citationRegex.test(part)) {
      citationRegex.lastIndex = 0;
      return (
        <code
          key={`${keyPrefix}-${i}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/[0.06] border border-white/[0.07] text-sky-300/95 font-mono text-[12px]"
        >
          {part}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
};

const highlightInlineCitations = (text: string): React.ReactNode[] => {
  if (!text) return [];
  const inlineMarkdownRegex =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^\s*](?:[\s\S]*?[^\s*])?\*|`[^`]+`)/g;
  const tokens = text.split(inlineMarkdownRegex);
  return tokens.map((tok, idx) => {
    if (!tok) return null;
    if (tok.startsWith('***') && tok.endsWith('***') && tok.length > 6) {
      return (
        <strong key={idx} className="font-semibold italic text-zinc-100">
          {highlightCitationsOnly(tok.slice(3, -3), `bi-${idx}`)}
        </strong>
      );
    }
    if (
      ((tok.startsWith('**') && tok.endsWith('**')) ||
        (tok.startsWith('__') && tok.endsWith('__'))) &&
      tok.length > 4
    ) {
      return (
        <strong key={idx} className="font-semibold text-zinc-100">
          {highlightCitationsOnly(tok.slice(2, -2), `b-${idx}`)}
        </strong>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return (
        <em key={idx} className="italic text-zinc-300">
          {highlightCitationsOnly(tok.slice(1, -1), `i-${idx}`)}
        </em>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-white/[0.06] border border-white/[0.07] text-sky-300/95 font-mono text-[12px]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return (
      <React.Fragment key={idx}>
        {highlightCitationsOnly(tok.replace(/\*\*/g, ''), `p-${idx}`)}
      </React.Fragment>
    );
  });
};

/**
 * Renders legal work product with calm, T3 Code-style typography, lists, tables, and headers
 */
const renderCalmLegalContent = (content: string): React.ReactNode => {
  const safeContent = content || '';
  const isModelError = safeContent.startsWith('### Model Call Error');
  const lines = safeContent.split('\n');
  const elements: React.ReactNode[] = [];
  let idx = 0;

  while (idx < lines.length) {
    const rawLine = lines[idx];
    const line = rawLine.trim();

    if (!line) {
      elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
      idx++;
      continue;
    }

    // Markdown table block
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      const startIdx = idx;
      while (idx < lines.length) {
        const tl = lines[idx].trim();
        if (tl.startsWith('|') && tl.endsWith('|')) {
          tableLines.push(tl);
          idx++;
        } else {
          break;
        }
      }
      const dataRows = tableLines
        .filter((l) => !/^\|\s*[-:]+(\s*\|\s*[-:]+)*\s*\|$/.test(l))
        .map((r) =>
          r
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())
        );
      if (dataRows.length > 0) {
        const header = dataRows[0];
        const body = dataRows.slice(1);
        elements.push(
          <div
            key={`tbl-${startIdx}`}
            className="my-2 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111115]"
          >
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] text-zinc-200 font-semibold">
                  {header.map((cell, ci) => (
                    <th key={ci} className="px-3 py-2 align-top">
                      {highlightInlineCitations(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {body.map((row, ri) => (
                  <tr key={ri} className="hover:bg-white/[0.015]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 align-top text-zinc-300">
                        {highlightInlineCitations(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line)) {
      elements.push(<hr key={`hr-${idx}`} className="border-white/[0.08] my-3" />);
      idx++;
      continue;
    }

    // Skip standalone GitHub alert header line like "> [!NOTE]"
    if (/^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i.test(line)) {
      idx++;
      continue;
    }

    // Blockquote line
    if (line.startsWith('>')) {
      const cleanedQuote = line
        .replace(/^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '')
        .replace(/^>\s?/, '');
      elements.push(
        <div
          key={`bq-${idx}`}
          className="px-3.5 py-2 rounded-lg bg-white/[0.03] border-l-2 border-amber-400/60 text-[13px] text-zinc-300"
        >
          {highlightInlineCitations(cleanedQuote)}
        </div>
      );
      idx++;
      continue;
    }

    // Markdown headings or all-caps legal section headers
    if (line.startsWith('#### ')) {
      const hText = line.replace(/^####\s+/, '').replace(/^\*\*([\s\S]+)\*\*$/, '$1');
      elements.push(
        <h5 key={`h4-${idx}`} className="text-[13px] font-semibold text-zinc-200 pt-1.5">
          {highlightInlineCitations(hText)}
        </h5>
      );
      idx++;
      continue;
    }
    if (line.startsWith('### ')) {
      const hText = line.replace(/^###\s+/, '').replace(/^\*\*([\s\S]+)\*\*$/, '$1');
      elements.push(
        <h4
          key={`h3-${idx}`}
          className={`text-[13.5px] font-semibold pt-1 ${
            isModelError ? 'text-rose-300' : 'text-zinc-100 pt-2'
          }`}
        >
          {highlightInlineCitations(hText)}
        </h4>
      );
      idx++;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      const hText = line.replace(/^#+\s+/, '').replace(/^\*\*([\s\S]+)\*\*$/, '$1');
      elements.push(
        <h3
          key={`h2-${idx}`}
          className="text-[15px] font-semibold text-zinc-100 pt-3 pb-0.5 border-b border-white/[0.06]"
        >
          {highlightInlineCitations(hText)}
        </h3>
      );
      idx++;
      continue;
    }
    if (
      /^(STATE OF VERMONT|SUPERIOR COURT|IN THE CIRCUIT COURT|DEFENDANT’S|DEFENDANT'S|PLAINTIFF’S|PLAINTIFF'S|COMPLAINT FOR|MOTION TO|MEMORANDUM OF LAW|I+\.|CONCLUSION|RELIEF REQUESTED|PRAYER FOR RELIEF|FACTUAL BACKGROUND|ARGUMENT)/.test(
        line.replace(/^\*\*|\*\*$/g, '')
      ) &&
      line === line.toUpperCase() &&
      line.length < 110
    ) {
      elements.push(
        <div
          key={`cap-${idx}`}
          className="text-[12.5px] font-semibold tracking-wide text-zinc-100 pt-2.5"
        >
          {highlightInlineCitations(line)}
        </div>
      );
      idx++;
      continue;
    }

    // Numbered list items (e.g. "1. **Argument**: ...")
    const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/);
    if (numberedMatch) {
      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2.5 pl-1">
          <span className="text-zinc-400 font-medium shrink-0 select-none">
            {numberedMatch[1]}
          </span>
          <div className="flex-1 min-w-0">
            {highlightInlineCitations(numberedMatch[2])}
          </div>
        </div>
      );
      idx++;
      continue;
    }

    // Bullet list items (excluding lines starting with **bold**)
    const bulletMatch = !line.startsWith('**') ? line.match(/^([-•*])\s+(.*)$/) : null;
    if (bulletMatch) {
      elements.push(
        <div key={`bul-${idx}`} className="flex items-start gap-2.5 pl-4">
          <span className="text-zinc-500 shrink-0 select-none">•</span>
          <div className="flex-1 min-w-0">
            {highlightInlineCitations(bulletMatch[2])}
          </div>
        </div>
      );
      idx++;
      continue;
    }

    elements.push(
      <p key={`p-${idx}`} className="text-zinc-200/95">
        {highlightInlineCitations(rawLine)}
      </p>
    );
    idx++;
  }

  return (
    <div
      className={
        isModelError
          ? 'p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-[13.5px] text-rose-100 leading-[1.65] font-sans'
          : 'space-y-2.5 text-[14px] text-zinc-200 leading-[1.68] font-sans'
      }
    >
      {elements}
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

  // Case Issues, Master Brief Synthesis & Folder Auto-Sync state
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [newIssueTargetMatterId, setNewIssueTargetMatterId] = useState<string>('');
  const [newIssueForkFromMessageId, setNewIssueForkFromMessageId] = useState<
    string | undefined
  >(undefined);
  const [newIssueSourceIssueId, setNewIssueSourceIssueId] = useState<
    string | null | undefined
  >(undefined);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssuePracticeArea, setNewIssuePracticeArea] =
    useState<PracticeAreaId>('vt_suppression_art11');
  const [newIssueSpecialistRole, setNewIssueSpecialistRole] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newIssueInitialPrompt, setNewIssueInitialPrompt] = useState('');
  const [folderSyncNotice, setFolderSyncNotice] = useState<string | null>(null);

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

  const detectWorkProductBadge = (msg: ThreadMessage): string => {
    if ((msg.content || '').startsWith('### Model Call Error')) {
      return 'Model Error';
    }
    if (msg.category === 'ADVISORY') return 'Case Advisory';
    const content = (msg.content || '').slice(0, 350).toLowerCase();
    if (content.includes('complaint') || content.includes('causes of action') || content.includes('prayer for relief')) {
      return 'Complaint';
    }
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

    const unsubscribeFolderSync = ipcBridge.onMatterFolderSynced((evt) => {
      setState(evt.state);
      if (evt.result.syncedCount > 0) {
        setFolderSyncNotice(
          `Auto-indexed ${evt.result.syncedCount} new discovery file(s) from matter folder`
        );
        setTimeout(() => setFolderSyncNotice(null), 5000);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeFolderSync();
    };
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

  useEffect(() => {
    if (!state?.adversarialConfig) return;
    if (state.adversarialConfig.primaryProvider) {
      setTurnProvider(state.adversarialConfig.primaryProvider);
    }
    if (state.adversarialConfig.primaryModel) {
      setTurnModel(state.adversarialConfig.primaryModel);
    }
  }, [
    state?.adversarialConfig?.primaryProvider,
    state?.adversarialConfig?.primaryModel,
  ]);

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

  const computeNextMatterNumber = (
    mattersList: Matter[],
    practiceArea?: PracticeAreaId
  ): string => {
    const existing = new Set(
      mattersList.map((m) => m.matterNumber.split(' ')[0].trim().toUpperCase())
    );
    const yearPrefix = String(new Date().getFullYear()).slice(-2);
    const isCriminal = !practiceArea || practiceArea.startsWith('vt_');
    const typeCode = isCriminal ? 'CR' : 'CV';
    let seq = 1;
    while (seq < 99999) {
      const candidate = `${yearPrefix}-${typeCode}-${String(seq).padStart(5, '0')}`;
      if (!existing.has(candidate)) {
        return candidate;
      }
      seq++;
    }
    return `${yearPrefix}-${typeCode}-${Date.now().toString().slice(-5)}`;
  };

  const openNewMatterModal = () => {
    const defaultArea =
      activeProfile?.activePracticeAreaId ?? 'vt_suppression_art11';
    setNewMatterJurisdiction(activeProfile?.defaultJurisdiction ?? '');
    setNewMatterCitation(activeProfile?.defaultCitationStyle ?? '');
    setNewMatterPracticeArea(defaultArea);
    setNewMatterNumber(computeNextMatterNumber(state.matters, defaultArea));
    setShowNewMatterModal(true);
  };

  const formatAgentLabel = (p?: ProviderConfig) => {
    if (!p) return 'Agent';
    if (p.id === 'agy-acp') return 'Antigravity';
    if (p.id === 'claude-cli') return 'Claude';
    if (p.id === 'codex-cli') return 'Codex';
    return p.name;
  };

  const availableModelsForTurnProvider = (() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const m of currentProviderConfig?.availableModels ?? []) {
      if (m.id) map.set(m.id, m);
    }
    for (const wm of state.ancillaryModelRegistry?.availableWorkingModels ?? []) {
      if (wm.providerId === turnProvider && wm.modelId && !map.has(wm.modelId)) {
        map.set(wm.modelId, {
          id: wm.modelId,
          label: wm.modelLabel || wm.modelId,
        });
      }
    }
    if (
      state.adversarialConfig.primaryProvider === turnProvider &&
      state.adversarialConfig.primaryModel &&
      !map.has(state.adversarialConfig.primaryModel)
    ) {
      map.set(state.adversarialConfig.primaryModel, {
        id: state.adversarialConfig.primaryModel,
        label: `${state.adversarialConfig.primaryModel} (Settings)`,
      });
    }
    if (
      currentProviderConfig?.defaultModel &&
      !map.has(currentProviderConfig.defaultModel)
    ) {
      map.set(currentProviderConfig.defaultModel, {
        id: currentProviderConfig.defaultModel,
        label: currentProviderConfig.defaultModel,
      });
    }
    if (turnModel && !map.has(turnModel)) {
      map.set(turnModel, { id: turnModel, label: turnModel });
    }
    return Array.from(map.values());
  })();

  const handleProviderChange = async (providerId: LLMProviderId) => {
    setTurnProvider(providerId);
    const providerObj = state.providers.find((p) => p.id === providerId);
    const settingsModelForProvider =
      state.adversarialConfig.primaryProvider === providerId
        ? state.adversarialConfig.primaryModel
        : undefined;
    const newModel =
      settingsModelForProvider ||
      providerObj?.defaultModel ||
      providerObj?.availableModels[0]?.id ||
      turnModel;
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
        issueId: state.activeIssueId || undefined,
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

  const handleSyncMatterFolder = async () => {
    if (!activeMatter) return;
    try {
      const res = await ipcBridge.syncMatterFolder(activeMatter.id);
      if (!res.result.folderExists) {
        const picked = await ipcBridge.pickMatterFolder(activeMatter.id);
        setState(picked.state);
        if (picked.chosenPath) {
          const count = picked.result?.syncedCount ?? 0;
          setFolderSyncNotice(
            count > 0
              ? `Linked matter folder & indexed ${count} discovery file(s)`
              : `Linked matter folder for auto-sync`
          );
          setTimeout(() => setFolderSyncNotice(null), 5000);
        }
        return;
      }
      setState(res.state);
      setFolderSyncNotice(
        res.result.syncedCount > 0
          ? `Indexed ${res.result.syncedCount} new discovery file(s) from matter folder`
          : `Matter folder is up to date`
      );
      setTimeout(() => setFolderSyncNotice(null), 4000);
    } catch (err) {
      setFolderSyncNotice(
        err instanceof Error ? err.message : 'Failed to sync matter folder'
      );
      setTimeout(() => setFolderSyncNotice(null), 4000);
    }
  };

  const handleSynthesizeMasterBrief = async () => {
    if (!activeMatter || isRunningTurn) return;
    setIsRunningTurn(true);
    setLiveProgress({
      matterId: activeMatter.id,
      phase: 'assembling_prompt',
      statusText: 'Synthesizing Case Issues into Consolidated Master Brief...',
    });
    try {
      const updated = await ipcBridge.synthesizeMasterBrief({
        matterId: activeMatter.id,
      });
      setState(updated);
      setRightPaneTab('redline');
      setIsRightPaneVisible(true);
    } catch (err) {
      alert(`Synthesis Error: ${(err as Error).message}`);
    } finally {
      setIsRunningTurn(false);
      setLiveProgress(null);
    }
  };

  const handleMergeBackIssue = async (issueId: string) => {
    if (!activeMatter || isRunningTurn) return;
    setIsRunningTurn(true);
    setLiveProgress({
      matterId: activeMatter.id,
      phase: 'assembling_prompt',
      statusText: 'Incorporating Case Issue findings into primary workstream & redline...',
    });
    try {
      const updated = await ipcBridge.mergeBackIssue({ issueId });
      setState(updated);
      setRightPaneTab('redline');
      setIsRightPaneVisible(true);
    } catch (err) {
      alert(`Incorporate Error: ${(err as Error).message}`);
    } finally {
      setIsRunningTurn(false);
      setLiveProgress(null);
    }
  };

  const openNewIssueDialog = (opts?: {
    matter?: Matter;
    forkFromMessageId?: string;
    sourceIssueId?: string | null;
  }) => {
    const targetMatter = opts?.matter ?? activeMatter;
    if (!targetMatter) return;
    setNewIssueTargetMatterId(targetMatter.id);
    setNewIssueForkFromMessageId(opts?.forkFromMessageId);
    setNewIssueSourceIssueId(opts?.sourceIssueId);
    setNewIssueTitle('');
    setNewIssuePracticeArea(
      targetMatter.practiceArea || 'vt_suppression_art11'
    );
    setNewIssueSpecialistRole('');
    setNewIssueDescription('');
    setNewIssueInitialPrompt('');
    setMatterContextMenu(null);
    setShowNewIssueModal(true);
  };

  const matterIssues = state.issues ?? [];
  const allWorkspaceIssues = state.allIssues ?? matterIssues;
  const activeIssue =
    matterIssues.find((i) => i.id === state.activeIssueId) ?? null;
  const visibleMessages = state.activeIssueId
    ? state.messages.filter((m) => m.issueId === state.activeIssueId)
    : state.messages.filter((m) => !m.issueId);

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

  const settledIssuesList = allWorkspaceIssues.filter((iss) => {
    if (!iss.settled) return false;
    const parentMatter = state.matters.find((m) => m.id === iss.matterId);
    if (!parentMatter || parentMatter.settled) return false;
    if (!q) return true;
    return (
      iss.title.toLowerCase().includes(q) ||
      parentMatter.name.toLowerCase().includes(q) ||
      parentMatter.clientName.toLowerCase().includes(q)
    );
  });

  const totalSettledCount = userSettledMatters.length + settledIssuesList.length;
  const visibleSettledMatters = userSettledMatters.slice(0, settledVisibleCount);
  const remainingSlotsForIssues = Math.max(
    0,
    settledVisibleCount - visibleSettledMatters.length
  );
  const visibleSettledIssues = settledIssuesList.slice(
    0,
    remainingSlotsForIssues
  );
  const remainingSettledCount = Math.max(
    0,
    totalSettledCount -
      (visibleSettledMatters.length + visibleSettledIssues.length)
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
              id="tour-new-matter-btn"
              onClick={openNewMatterModal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
              title="Create New Matter"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            <button
              id="tour-new-issue-btn"
              onClick={() => openNewIssueDialog()}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
              title="New Case Issue in Active Matter"
            >
              <SquarePen className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* UPPER PANE: Active Matters & Case Issues List (T3 Code Style) */}
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
                onClick={openNewMatterModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-[11px] font-medium transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>New Matter</span>
              </button>
            </div>
          ) : (
            activeMattersList.map((m) => {
              const isPrimarySelected =
                m.id === activeMatter?.id && !state.activeIssueId;
              const monogram = getMonogram(m.clientName, m.name);
              const timeLabel = formatRelativeTime(m.updatedAt || m.createdAt);
              const practicePreset = state.promptSettings.practiceAreaPresets.find(
                (p) => p.id === m.practiceArea
              );
              const practiceShort = practicePreset?.shortLabel || 'Legal Matter';
              const activeIssuesForMatter = allWorkspaceIssues.filter(
                (iss) => iss.matterId === m.id && !iss.settled
              );
              const topLevelIssues = activeIssuesForMatter.filter(
                (iss) => !iss.parentIssueId || iss.parentIssueId === 'primary'
              );

              return (
                <div key={m.id} className="space-y-0.5">
                  <div
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
                      const updated = await ipcBridge.selectIssue(m.id, null);
                      setState(updated);
                      setTurnPracticeArea(m.practiceArea);
                    }}
                    className={`group relative w-full px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                      isPrimarySelected
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
                            openNewIssueDialog({ matter: m });
                          }}
                          title="New Case Issue in this matter"
                          className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition"
                        >
                          <SquarePen className="w-3 h-3" />
                        </button>
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
                        isPrimarySelected ? 'text-zinc-100' : 'text-zinc-200'
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

                  {/* Nested & Peer Case Issues for this Matter (T3 Code Thread Sidebar Style) */}
                  {topLevelIssues.map((iss) => {
                    const isIssueSelected =
                      m.id === activeMatter?.id && state.activeIssueId === iss.id;
                    const issPreset = state.promptSettings.practiceAreaPresets.find(
                      (p) => p.id === iss.practiceArea
                    );
                    const issPracticeShort =
                      iss.specialistRole || issPreset?.shortLabel || practiceShort;
                    const childSubIssues = activeIssuesForMatter.filter(
                      (child) => child.parentIssueId === iss.id
                    );

                    return (
                      <div key={iss.id} className="space-y-0.5">
                        <div
                          onClick={async () => {
                            const updated = await ipcBridge.selectIssue(
                              m.id,
                              iss.id
                            );
                            setState(updated);
                            setTurnPracticeArea(iss.practiceArea);
                          }}
                          className={`group relative ml-3 pl-2.5 pr-2.5 py-2 rounded-xl border-l border-white/[0.08] text-left transition cursor-pointer ${
                            isIssueSelected
                              ? 'bg-[#18181d] text-zinc-100 shadow-sm border-l-amber-400/60'
                              : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`w-3.5 h-3.5 rounded text-[8px] font-bold border flex items-center justify-center shrink-0 ${monogram.colorClass}`}
                              >
                                {monogram.code}
                              </span>
                              <span className="text-[10.5px] text-zinc-500 truncate">
                                {m.name}
                              </span>
                            </div>

                            <span className="text-[10.5px] text-zinc-600 shrink-0 group-hover:hidden">
                              {formatRelativeTime(iss.updatedAt || iss.createdAt)}
                            </span>

                            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openNewIssueDialog({
                                    matter: m,
                                    sourceIssueId: iss.id,
                                  });
                                }}
                                title="Spin off sub-issue"
                                className="p-0.5 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const updated = await ipcBridge.settleIssue(
                                    iss.id,
                                    true
                                  );
                                  setState(updated);
                                }}
                                title="Settle Case Issue to lower pane"
                                className="p-0.5 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-emerald-300 transition"
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div
                            className={`text-[12.5px] font-medium truncate mt-0.5 ${
                              isIssueSelected ? 'text-zinc-100' : 'text-zinc-200'
                            }`}
                          >
                            {iss.title}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-0.5 text-[10.5px] text-zinc-500">
                            <span className="truncate">{issPracticeShort}</span>
                            <span className="shrink-0 font-mono text-[9.5px] text-zinc-600">
                              {m.matterNumber.split(' ')[0]}
                            </span>
                          </div>
                        </div>

                        {/* Second-level child inquiries nested under this Case Issue */}
                        {childSubIssues.map((child) => {
                          const isChildSelected =
                            m.id === activeMatter?.id &&
                            state.activeIssueId === child.id;
                          return (
                            <div
                              key={child.id}
                              onClick={async () => {
                                const updated = await ipcBridge.selectIssue(
                                  m.id,
                                  child.id
                                );
                                setState(updated);
                                setTurnPracticeArea(child.practiceArea);
                              }}
                              className={`group relative ml-6 pl-2.5 pr-2.5 py-1.5 rounded-lg border-l border-white/[0.07] text-left transition cursor-pointer ${
                                isChildSelected
                                  ? 'bg-[#18181d] text-zinc-100 border-l-amber-400/60'
                                  : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-medium truncate">
                                  {child.title}
                                </span>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const updated = await ipcBridge.settleIssue(
                                      child.id,
                                      true
                                    );
                                    setState(updated);
                                  }}
                                  title="Settle sub-issue"
                                  className="hidden group-hover:inline-flex p-0.5 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-emerald-300"
                                >
                                  <Archive className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* LOWER PANE: T3 Code Style "Settled" Matters Drawer (123 settled + Show 25 more) */}
        <div
          id="tour-settled-drawer"
          className="border-t border-white/[0.06] flex flex-col min-h-0 max-h-[46%] shrink-0"
        >
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
              {/* User-Settled SQLite Matters & Settled Case Issues */}
              {visibleSettledMatters.length === 0 &&
              visibleSettledIssues.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-zinc-600">
                  No settled matters yet.
                </div>
              ) : (
                <>
                  {visibleSettledIssues.map((iss) => {
                    const parentMatter = state.matters.find(
                      (m) => m.id === iss.matterId
                    );
                    const monogram = parentMatter
                      ? getMonogram(parentMatter.clientName, parentMatter.name)
                      : { code: 'CI', colorClass: BADGE_PALETTE[0] };
                    const isSelected =
                      parentMatter?.id === activeMatter?.id &&
                      state.activeIssueId === iss.id;
                    return (
                      <div
                        key={iss.id}
                        onClick={async () => {
                          if (!parentMatter) return;
                          const updated = await ipcBridge.selectIssue(
                            parentMatter.id,
                            iss.id
                          );
                          setState(updated);
                          setTurnPracticeArea(iss.practiceArea);
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
                          <span className="text-[12px] truncate">
                            {iss.title}
                          </span>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const updated = await ipcBridge.settleIssue(
                              iss.id,
                              false
                            );
                            setState(updated);
                          }}
                          title="Reopen Case Issue to Active"
                          className="hidden group-hover:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[10px] text-zinc-300 shrink-0"
                        >
                          <ArchiveRestore className="w-2.5 h-2.5" />
                          <span>Reopen</span>
                        </button>
                        <span className="text-[11px] text-zinc-600 shrink-0 group-hover:hidden">
                          {formatRelativeTime(iss.settledAt || iss.updatedAt)}
                        </span>
                      </div>
                    );
                  })}

                  {visibleSettledMatters.map((m) => {
                    const monogram = getMonogram(m.clientName, m.name);
                    const isSelected =
                      m.id === activeMatter?.id && !state.activeIssueId;
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
                          const updated = await ipcBridge.selectIssue(m.id, null);
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
                          {formatRelativeTime(m.settledAt || m.updatedAt)}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

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
              id="tour-agents-button"
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
              id="tour-routing-button"
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
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>

          <DesktopUpdateButton />
        </div>
      </aside>

      {/* CENTER WORK VIEW: Minimal Header, Calm Conversation Stream & Floating Composer */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0b0b0e]">
        {/* Top Minimal Breadcrumb Bar (T3 Code Style: [Badge] Matter / Case Issue) */}
        <header className="h-11 px-6 border-b border-white/[0.06] flex items-center justify-between shrink-0 app-drag-region">
          <div className="flex items-center gap-2.5 min-w-0 app-no-drag">
            {activeMatter ? (
              <>
                <span
                  className={`w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0 ${activeMonogram.colorClass}`}
                >
                  {activeMonogram.code}
                </span>
                {activeIssue ? (
                  <>
                    <button
                      onClick={async () => {
                        const updated = await ipcBridge.selectIssue(
                          activeMatter.id,
                          null
                        );
                        setState(updated);
                        setTurnPracticeArea(activeMatter.practiceArea);
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-200 truncate max-w-[200px] cursor-pointer"
                      title="Return to primary matter workstream"
                    >
                      {activeMatter.name}
                    </button>
                    <span className="text-zinc-700">/</span>
                    <span className="text-[13px] font-medium text-zinc-100 truncate">
                      {activeIssue.title}
                    </span>
                    {activeIssue.specialistRole && (
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-[10px] text-zinc-400 font-medium shrink-0">
                        {activeIssue.specialistRole}
                      </span>
                    )}
                  </>
                ) : (
                  <>
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
                  </>
                )}
                {(activeMatter.settled || activeIssue?.settled) && (
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
            {activeIssue && activeIssue.status !== 'synthesized' && (
              <button
                disabled={isRunningTurn}
                onClick={() => handleMergeBackIssue(activeIssue.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-zinc-200 transition cursor-pointer disabled:opacity-50"
                title="Incorporate findings from this Case Issue back into the parent/primary workstream and update the Master Brief"
              >
                <FileCheck2 className="w-3 h-3 text-amber-400" />
                <span>Incorporate into Brief</span>
              </button>
            )}

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
                    onClick={openNewMatterModal}
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
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sample Case Tour</span>
                  </button>
                </div>
              </div>
            ) : null}

            {activeMatter && !tutorialBannerDismissed && (
              <div className="px-4 py-2.5 rounded-xl bg-[#121216] border border-white/[0.07] flex items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
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

            {folderSyncNotice && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2 text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{folderSyncNotice}</span>
                </div>
                <button
                  onClick={() => setFolderSyncNotice(null)}
                  className="text-emerald-400/70 hover:text-emerald-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {activeMatter &&
              visibleMessages.map((msg: ThreadMessage) => {
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
                const toolCallsDurationMs = msg.toolCalls.reduce(
                  (acc, tc) => acc + (tc.durationMs || 12),
                  0
                );
                const totalDurationMs =
                  msg.durationMs && msg.durationMs > toolCallsDurationMs
                    ? msg.durationMs
                    : toolCallsDurationMs;
                const durationLabel =
                  totalDurationMs >= 60_000
                    ? `${Math.floor(totalDurationMs / 60_000)}m ${Math.round(
                        (totalDurationMs % 60_000) / 1000
                      )}s`
                    : totalDurationMs >= 1000
                    ? `${
                        totalDurationMs < 10_000
                          ? (totalDurationMs / 1000).toFixed(1).replace(/\.0$/, '')
                          : Math.round(totalDurationMs / 1000)
                      }s`
                    : `${Math.max(18, totalDurationMs)}ms`;
                const effectiveMsgContent =
                  msg.content && msg.content.trim().length > 0
                    ? msg.content
                    : msg.initialDraftBeforeReview || '';
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
                        id={
                          msg.adversarialReviews.length > 0
                            ? 'tour-trace-summary-btn'
                            : undefined
                        }
                        onClick={() =>
                          setExpandedReviewMsgIds((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                        title="Click to inspect research tool calls, multi-LLM peer review objections, and PII audit"
                      >
                        {(msg.content || '').startsWith('### Model Call Error') ? (
                          <span className="text-rose-400 font-medium inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>
                              Model call failed ({msg.primaryModel || turnModel})
                            </span>
                          </span>
                        ) : (
                          <span>Worked for {durationLabel}</span>
                        )}
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
                          id={
                            msg.adversarialReviews.length > 0
                              ? 'tour-spin-off-issue-btn'
                              : undefined
                          }
                          onClick={() =>
                            openNewIssueDialog({
                              matter: activeMatter,
                              forkFromMessageId: msg.id,
                              sourceIssueId: state.activeIssueId,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                          title="Spin off a new Case Issue starting from this checkpoint"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Spin Off Issue</span>
                        </button>
                        <button
                          onClick={() => {
                            if (isEditingThisMsg) {
                              setEditingMsgId(null);
                            } else {
                              setEditingMsgId(msg.id);
                              setEditingMsgContent(effectiveMsgContent);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                          title="Edit work product text inline"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditingThisMsg ? 'Cancel' : 'Edit'}</span>
                        </button>
                        <button
                          id={
                            msg.adversarialReviews.length > 0
                              ? 'tour-export-docx-msg-btn'
                              : undefined
                          }
                          onClick={async () => {
                            const reviewComments = msg.adversarialReviews.flatMap(
                              (rev) =>
                                rev.objections.map((obj) => ({
                                  author: `${rev.criticTitle} (${rev.model})`,
                                  text: `[${rev.severity} • ${obj.category}] (${obj.location}): ${obj.critique} — Cure: ${obj.requiredFix}`,
                                  targetSnippet: obj.location,
                                }))
                            );
                            const previousForRedline =
                              msg.content &&
                              msg.content.trim().length > 0 &&
                              msg.initialDraftBeforeReview &&
                              msg.initialDraftBeforeReview.trim() !==
                                msg.content.trim()
                                ? msg.initialDraftBeforeReview
                                : undefined;
                            await ipcBridge.exportDocx({
                              title: `${activeMatter.name} — ${workProductLabel}`,
                              suggestedFileName: `${activeMatter.name.replace(
                                /[^a-zA-Z0-9-_]+/g,
                                '_'
                              )}_${workProductLabel.replace(
                                /[^a-zA-Z0-9-_]+/g,
                                '_'
                              )}.docx`,
                              content: effectiveMsgContent,
                              previousContent: previousForRedline,
                              author: msg.primaryModel || 'LexHarness Peer Review',
                              comments:
                                reviewComments.length > 0
                                  ? reviewComments
                                  : undefined,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                          title="Export work product to Word (.docx) with native Tracked Changes and peer-review comments"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export .docx</span>
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
                        renderCalmLegalContent(effectiveMsgContent)
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
                    id="tour-sample-prompts-btn"
                    type="button"
                    onClick={() => setShowSamplePromptsMenu((prev) => !prev)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition cursor-pointer"
                    title="Sample legal prompts"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                  </button>

                  <button
                    id="tour-composer-import-btn"
                    type="button"
                    disabled={!activeMatter || isRunningTurn}
                    onClick={async () => {
                      if (!activeMatter) return;
                      if (ipcBridge.isElectron()) {
                        const parsed = await ipcBridge.pickDocxFile();
                        if (parsed) {
                          const docCount = state.documents.length + 1;
                          const bates = `EX-${String(docCount).padStart(4, '0')}`;
                          const updated = await ipcBridge.createDocument({
                            matterId: activeMatter.id,
                            title: parsed.suggestedTitle,
                            fileName: parsed.fileName,
                            category: inferCategoryFromFileName(parsed.fileName),
                            batesRange: bates,
                            summary: parsed.summary,
                            content: parsed.content,
                          });
                          setState(updated);
                          setIsRightPaneVisible(true);
                          setRightPaneTab('corpus');
                          if (updated.documents.length > 0) {
                            setSelectedDocId(
                              updated.documents[updated.documents.length - 1].id
                            );
                          }
                        }
                      } else {
                        setIsRightPaneVisible(true);
                        setRightPaneTab('corpus');
                      }
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition cursor-pointer disabled:opacity-40"
                    title="Import document or exhibit (.docx, .pdf, .txt, .rtf, .csv, .xlsx) into matter corpus"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                  </button>

                  <select
                    id="tour-task-selector"
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
                  <div
                    id="tour-model-selector"
                    className="flex items-center gap-1.5"
                  >
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
                            p.id !== 'legal-simulator' &&
                            (p.hasApiKey ||
                              Boolean(p.runtimeStatus?.installed) ||
                              p.id === turnProvider)
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
                      id="tour-review-mode-selector"
                      value={turnReviewMode}
                      onChange={(e) =>
                        setTurnReviewMode(e.target.value as AdversarialReviewMode)
                      }
                      className="hidden md:inline-block bg-transparent hover:bg-white/[0.04] px-1.5 py-1 rounded-md text-[11.5px] text-zinc-400 hover:text-zinc-200 focus:outline-none cursor-pointer"
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
                  </div>

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
            onSyncMatterFolder={handleSyncMatterFolder}
            issues={matterIssues}
            activeIssueId={state.activeIssueId}
            onSelectIssue={async (issueId) => {
              if (!activeMatter) return;
              const updated = await ipcBridge.selectIssue(
                activeMatter.id,
                issueId
              );
              setState(updated);
            }}
            onNewIssue={() => openNewIssueDialog({ matter: activeMatter })}
            onMergeBackIssue={handleMergeBackIssue}
            onSynthesizeMasterBrief={handleSynthesizeMasterBrief}
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
              openNewIssueDialog({ matter: matterContextMenu.matter })
            }
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-zinc-200 hover:bg-white/[0.06] transition"
          >
            <SquarePen className="w-3.5 h-3.5 text-amber-400" />
            <span>New Case Issue in Matter...</span>
          </button>
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
                  Local Matter Workspace Folder Path (Auto-Syncs Discovery Files)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editFolderPath}
                    onChange={(e) => setEditFolderPath(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 font-mono focus:outline-none focus:border-white/[0.25]"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const picked = await ipcBridge.pickMatterFolder(
                        editingMatter.id
                      );
                      if (picked.chosenPath) {
                        setEditFolderPath(picked.chosenPath);
                        setState(picked.state);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-zinc-200 transition cursor-pointer shrink-0"
                  >
                    Browse...
                  </button>
                </div>
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
        onOpenConnectAgents={() => {
          setIsStudioOpen(false);
          setIsConnectAgentsOpen(true);
        }}
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
          if (updated.primaryProvider !== undefined) {
            setTurnProvider(next.adversarialConfig.primaryProvider);
          }
          if (
            updated.primaryModel !== undefined ||
            updated.primaryProvider !== undefined
          ) {
            setTurnModel(next.adversarialConfig.primaryModel);
          }
        }}
        onSaveProviderCredential={async (payload) => {
          const next = await ipcBridge.saveProviderCredential(payload);
          setState(next);
        }}
        onAddProviderInstance={async (payload) => {
          const res = await ipcBridge.addProviderInstance(payload);
          setState(res.state);
          return res.createdId;
        }}
        onDeleteProviderInstance={async (providerId) => {
          const next = await ipcBridge.deleteProviderInstance(providerId);
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
                  const fallbackNumber = computeNextMatterNumber(
                    state.matters,
                    newMatterPracticeArea
                  );
                  const updated = await ipcBridge.createMatter({
                    name: newMatterName.trim(),
                    clientName: newClientName.trim() || 'Client',
                    matterNumber: newMatterNumber.trim() || fallbackNumber,
                    practiceArea: newMatterPracticeArea,
                    jurisdiction: newMatterJurisdiction.trim(),
                    citationStyle: newMatterCitation.trim(),
                  });
                  setState(updated);
                  setNewMatterName('');
                  setNewClientName('');
                  setNewMatterNumber(
                    computeNextMatterNumber(
                      updated.matters,
                      newMatterPracticeArea
                    )
                  );
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

      {/* New Case Issue / Focused Counsel Inquiry Modal */}
      {showNewIssueModal && activeMatter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#121216] border border-white/[0.1] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  New Case Issue / Focused Counsel Inquiry
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Isolates a motion or legal issue while sharing all exhibits and authorities in{' '}
                  <span className="text-zinc-200 font-medium">{activeMatter.name}</span>.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1.5">
                  Quick Issue Templates
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      title: 'Motion to Suppress / Rule 12 Challenge',
                      role: 'Suppression & Constitutional Counsel',
                      desc: 'Evaluate search, seizure, and threshold suppression arguments grounded in discovery exhibits.',
                    },
                    {
                      title: 'Witness Impeachment Matrix',
                      role: 'Discovery & Deposition Impeachment Analyst',
                      desc: 'Cross-reference affidavits, transcripts, and exhibits to surface contradictions.',
                    },
                    {
                      title: 'Sentencing & Mitigation Memorandum',
                      role: 'Sentencing Mitigation Researcher',
                      desc: 'Analyze statutory factors, mitigation authorities, and collateral consequences.',
                    },
                    {
                      title: 'Appellate Preservation & Standard of Review',
                      role: 'Appellate Preservation Auditor',
                      desc: 'Audit procedural objections, standards of review, and controlling precedent.',
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => {
                        setNewIssueTitle(tpl.title);
                        setNewIssueSpecialistRole(tpl.role);
                        setNewIssueDescription(tpl.desc);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-zinc-300 transition cursor-pointer"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Case Issue / Motion Title
                </label>
                <input
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="e.g., Art. 11 Exit Order Suppression or Damages Calculation"
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Practice Area Focus
                  </label>
                  <select
                    value={newIssuePracticeArea}
                    onChange={(e) =>
                      setNewIssuePracticeArea(e.target.value as PracticeAreaId)
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
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Specialized Counsel Role (Optional)
                  </label>
                  <input
                    type="text"
                    value={newIssueSpecialistRole}
                    onChange={(e) => setNewIssueSpecialistRole(e.target.value)}
                    placeholder="e.g., Appellate Preservation Counsel"
                    className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Issue Scope & Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={newIssueDescription}
                  onChange={(e) => setNewIssueDescription(e.target.value)}
                  placeholder="Brief note on the factual or procedural focus of this issue"
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">
                  Initial Drafting or Research Instruction (Optional — runs immediately)
                </label>
                <textarea
                  rows={2}
                  value={newIssueInitialPrompt}
                  onChange={(e) => setNewIssueInitialPrompt(e.target.value)}
                  placeholder="Leave blank to open the empty Case Issue workspace, or enter an instruction to draft right away..."
                  className="w-full px-3 py-2 rounded-lg bg-[#09090b] border border-white/[0.1] text-zinc-100 focus:outline-none focus:border-white/[0.25]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
              <button
                onClick={() => setShowNewIssueModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newIssueTitle.trim()) return;
                  const targetMatterId =
                    newIssueTargetMatterId || activeMatter.id;
                  const initialInstruction = newIssueInitialPrompt.trim();
                  const updated =
                    newIssueForkFromMessageId !== undefined ||
                    newIssueSourceIssueId !== undefined
                      ? await ipcBridge.forkIssue({
                          matterId: targetMatterId,
                          sourceIssueId: newIssueSourceIssueId,
                          upToMessageId: newIssueForkFromMessageId,
                          title: newIssueTitle.trim(),
                          practiceArea: newIssuePracticeArea,
                          specialistRole:
                            newIssueSpecialistRole.trim() || undefined,
                          description: newIssueDescription.trim() || undefined,
                          relationshipToParent: newIssueSpecialistRole.trim()
                            ? 'specialist'
                            : 'fork',
                        })
                      : await ipcBridge.createIssue({
                          matterId: targetMatterId,
                          title: newIssueTitle.trim(),
                          practiceArea: newIssuePracticeArea,
                          specialistRole:
                            newIssueSpecialistRole.trim() || undefined,
                          description: newIssueDescription.trim() || undefined,
                        });
                  setState(updated);
                  setTurnPracticeArea(newIssuePracticeArea);
                  setShowNewIssueModal(false);

                  if (initialInstruction && updated.activeIssueId) {
                    setIsRunningTurn(true);
                    setLiveProgress({
                      matterId: targetMatterId,
                      phase: 'assembling_prompt',
                      statusText: `Drafting Case Issue "${newIssueTitle.trim()}"...`,
                    });
                    try {
                      const afterTurn = await ipcBridge.runTurn({
                        matterId: targetMatterId,
                        issueId: updated.activeIssueId,
                        userPrompt: initialInstruction,
                        overrideReviewMode: turnReviewMode,
                        overridePracticeAreaId: newIssuePracticeArea,
                        overridePrimaryProvider: turnProvider,
                        overridePrimaryModel: turnModel,
                      });
                      setState(afterTurn);
                    } finally {
                      setIsRunningTurn(false);
                      setLiveProgress(null);
                    }
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition"
              >
                {newIssueInitialPrompt.trim()
                  ? 'Create Issue & Run Draft'
                  : newIssueForkFromMessageId
                  ? 'Spin Off Case Issue'
                  : 'Create Case Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* T3-Style Connect Your Agents Onboarding & Multi-Account Modal */}
      {state.agentOnboarding && (
        <ConnectAgentsModal
          isOpen={isConnectAgentsOpen}
          isTutorialActive={isTutorialOpen}
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
          onOpenNewMatterModal={openNewMatterModal}
        />
      )}

      {/* Interactive Guided Tour & Tutorial Overlay */}
      <TutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => {
          setIsTutorialOpen(false);
          setIsStudioOpen(false);
          setIsConnectAgentsOpen(false);
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
        onSyncTourUiState={(uiState) => {
          if (uiState.preferredTab) {
            setIsRightPaneVisible(true);
            setRightPaneTab(uiState.preferredTab);
          }
          if (uiState.openDialog === 'settings') {
            setIsConnectAgentsOpen(false);
            if (uiState.settingsTab) {
              setStudioInitialTab(uiState.settingsTab);
            }
            setIsStudioOpen(true);
          } else if (uiState.openDialog === 'connect_agents') {
            setIsStudioOpen(false);
            setIsConnectAgentsOpen(true);
          } else {
            setIsStudioOpen(false);
            setIsConnectAgentsOpen(false);
          }
        }}
      />
    </div>
  );
};
