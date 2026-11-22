import React, { useRef, useState } from 'react';
import {
  AdversarialConfig,
  ChronologyFact,
  DocumentCategory,
  DocumentVersion,
  Matter,
  MatterDocument,
  MatterIssue,
  ParsedDocxPreview,
} from '../../shared/types';
import { ipcBridge } from '../lib/bridge';
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  FileUp,
  FolderSync,
  Gavel,
  Loader2,
  Plus,
  Scale,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';

interface RightWorkspacePaneProps {
  matterId: string;
  activeMatter?: Matter;
  adversarialConfig?: AdversarialConfig;
  documents: MatterDocument[];
  documentVersions: DocumentVersion[];
  chronologyFacts: ChronologyFact[];
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  width?: number;
  onEditMatter?: (matter: Matter) => void;
  onConfigureAgents?: () => void;
  onCreateDocument: (payload: {
    matterId: string;
    title: string;
    fileName: string;
    category: DocumentCategory;
    batesRange: string;
    summary: string;
    content: string;
  }) => Promise<void>;
  onUpdateDocument?: (payload: {
    docId: string;
    title?: string;
    content?: string;
    category?: DocumentCategory;
    batesRange?: string;
    summary?: string;
  }) => Promise<void>;
  onUpdateDocumentVersion?: (
    versionId: string,
    content: string
  ) => Promise<void>;
  onRequestReview?: (doc: MatterDocument) => void;
  onAddChronologyFact: (payload: {
    matterId: string;
    factDate: string;
    eventDescription: string;
    sourceCitation: string;
    status: ChronologyFact['status'];
  }) => Promise<void>;
  currentTab?: RightTab;
  onTabChange?: (tab: RightTab) => void;
  onSyncMatterFolder?: () => Promise<void>;
  issues?: MatterIssue[];
  activeIssueId?: string | null;
  onSelectIssue?: (issueId: string | null) => void;
  onNewIssue?: () => void;
  onMergeBackIssue?: (issueId: string) => void;
  onSynthesizeMasterBrief?: () => void;
}

export type RightTab = 'redline' | 'corpus' | 'chronology';

const formatPracticeAreaLabel = (practiceArea?: string): string => {
  switch (practiceArea) {
    case 'vt_suppression_art11':
      return 'Suppression & Art. 11';
    case 'vt_discovery_impeachment':
      return 'Discovery & Impeachment';
    case 'vt_bail_conditions':
      return 'Bail & Release';
    case 'vt_plea_sentencing':
      return 'Plea & Sentencing';
    case 'general_litigation':
    case 'general_litigation_adr':
      return 'Civil Litigation';
    case 'general_transactional':
      return 'Contracts & M&A';
    case 'general_regulatory':
      return 'Regulatory & Statutory';
    case 'general_investigation':
      return 'Fact Chronology';
    default:
      return 'General Practice';
  }
};

const ALLOWED_EXTENSIONS = [
  '.docx',
  '.pdf',
  '.txt',
  '.md',
  '.rtf',
  '.csv',
  '.xlsx',
];

function isSupportedFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function inferCategoryFromFileName(name: string): DocumentCategory {
  const lower = name.toLowerCase();
  if (
    lower.includes('contract') ||
    lower.includes('agreement') ||
    lower.includes('lease') ||
    lower.includes('engagement') ||
    lower.includes('settlement')
  ) {
    return 'CONTRACT';
  }
  if (
    lower.includes('motion') ||
    lower.includes('pleading') ||
    lower.includes('complaint') ||
    lower.includes('brief') ||
    lower.includes('petition')
  ) {
    return 'PLEADING';
  }
  if (lower.includes('depo') || lower.includes('transcript')) {
    return 'DEPOSITION';
  }
  if (
    lower.includes('memo') ||
    lower.includes('demand') ||
    lower.includes('draft') ||
    lower.includes('letter')
  ) {
    return 'WORK_PRODUCT';
  }
  return 'EXHIBIT';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export const RightWorkspacePane: React.FC<RightWorkspacePaneProps> = ({
  matterId,
  activeMatter,
  adversarialConfig,
  documents,
  documentVersions,
  chronologyFacts,
  selectedDocId,
  onSelectDoc,
  width,
  onEditMatter,
  onConfigureAgents,
  onCreateDocument,
  onUpdateDocument,
  onUpdateDocumentVersion,
  onRequestReview,
  onAddChronologyFact,
  currentTab,
  onTabChange,
  onSyncMatterFolder,
  issues = [],
  activeIssueId = null,
  onSelectIssue,
  onNewIssue,
  onMergeBackIssue,
  onSynthesizeMasterBrief,
}) => {
  const [internalTab, setInternalTab] = useState<RightTab>('redline');
  const activeTab = currentTab ?? internalTab;
  const setActiveTab = (t: RightTab) => {
    setInternalTab(t);
    onTabChange?.(t);
  };
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('EXHIBIT');
  const [newDocBates, setNewDocBates] = useState('EX-0100');
  const [newDocContent, setNewDocContent] = useState('');
  const [docxPreviewMeta, setDocxPreviewMeta] = useState<ParsedDocxPreview | null>(null);
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [isDraggingDocx, setIsDraggingDocx] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [docxExportNotice, setDocxExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportDocx = async (payload: {
    title: string;
    suggestedFileName?: string;
    content: string;
    previousContent?: string;
    rationaleSummary?: string;
    author?: string;
  }) => {
    setIsExportingDocx(true);
    setDocxError(null);
    setDocxExportNotice(null);
    try {
      const res = await ipcBridge.exportDocx(payload);
      if (res.saved && res.filePath) {
        const shortName = res.filePath.split(/[\\/]/).pop() || res.filePath;
        setDocxExportNotice(`Exported Word redline to ${shortName}`);
        setTimeout(() => setDocxExportNotice(null), 5000);
      }
    } catch (err) {
      setDocxError(
        err instanceof Error ? err.message : 'Failed to export .docx file.'
      );
    } finally {
      setIsExportingDocx(false);
    }
  };

  const saveParsedDocxDirectly = async (parsed: ParsedDocxPreview) => {
    const nextBatesNum = documents.length + 1;
    const autoBates = `EX-${String(nextBatesNum).padStart(4, '0')}`;
    const category = inferCategoryFromFileName(parsed.fileName);
    await onCreateDocument({
      matterId,
      title: parsed.suggestedTitle || parsed.fileName,
      fileName: parsed.fileName,
      category,
      batesRange: autoBates,
      summary: parsed.summary || parsed.content.slice(0, 140),
      content: parsed.content,
    });
    setDocxPreviewMeta(parsed);
    setDocxError(null);
    setActiveTab('corpus');
    setIsInspectorDetailOpen(true);
    setShowAddDocForm(false);
  };

  const handleUploadDocxFileObject = async (file: File) => {
    if (!isSupportedFileName(file.name)) {
      setDocxError(
        'Please select a supported file (.docx, .pdf, .txt, .md, .rtf, .csv, .xlsx).'
      );
      return;
    }
    setIsParsingDocx(true);
    setDocxError(null);
    try {
      const arrayBuf = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuf);
      const parsed = await ipcBridge.parseDocxBuffer({
        fileName: file.name,
        base64Data,
      });
      await saveParsedDocxDirectly(parsed);
    } catch (err) {
      setDocxError(
        err instanceof Error ? err.message : 'Failed to parse document.'
      );
    } finally {
      setIsParsingDocx(false);
    }
  };

  const handlePickDocxClick = async () => {
    setDocxError(null);
    if (ipcBridge.isElectron()) {
      setIsParsingDocx(true);
      try {
        const parsed = await ipcBridge.pickDocxFile();
        if (parsed) {
          await saveParsedDocxDirectly(parsed);
        }
      } catch (err) {
        setDocxError(
          err instanceof Error ? err.message : 'Failed to import document.'
        );
      } finally {
        setIsParsingDocx(false);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Collapsible inspector sections
  const [isReviewPanelExpanded, setIsReviewPanelExpanded] = useState(false);
  const [isIssuesLineageExpanded, setIsIssuesLineageExpanded] = useState(false);
  const [isInspectorDetailOpen, setIsInspectorDetailOpen] = useState(true);

  // In-line document edit state
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocContent, setEditDocContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // In-line draft revision edit state
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [editVersionContent, setEditVersionContent] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Chronology form state
  const [showAddFactForm, setShowAddFactForm] = useState(false);
  const [factDate, setFactDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [factDesc, setFactDesc] = useState('');
  const [factCite, setFactCite] = useState('');
  const [factStatus, setFactStatus] =
    useState<ChronologyFact['status']>('UNDISPUTED');

  const activeDoc =
    documents.find((d) => d.id === selectedDocId) ?? documents[0] ?? null;

  const activeVersion =
    documentVersions.find((v) => v.id === selectedVersionId) ??
    documentVersions[0] ??
    null;

  const computeParagraphDiff = (oldText: string, newText: string) => {
    const oldLines = (oldText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const newLines = (newText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    const removed = oldLines.filter((l) => !newSet.has(l));
    const keptOrAdded = newLines.map((l) => ({
      text: l,
      isAdded: !oldSet.has(l),
    }));

    return { removed, keptOrAdded };
  };

  const shortForumLabel = activeMatter
    ? activeMatter.jurisdiction.split('(')[0].trim()
    : 'No Forum Selected';

  return (
    <div
      id="tour-workspace-pane"
      className="w-[340px] xl:w-[370px] shrink-0 bg-[#0b0b0e] border-l border-white/[0.06] flex flex-col h-full overflow-hidden text-zinc-300"
      style={width ? { width: `${width}px` } : undefined}
    >
      {!matterId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
          <BookOpen className="w-7 h-7 text-zinc-700 mb-2" />
          <p className="text-xs font-medium text-zinc-400">No Active Matter</p>
          <p className="text-[11px] text-zinc-600 mt-1 max-w-xs">
            Select or create a matter in the sidebar to view case files, redlines, and chronology.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 space-y-3">
          {/* Calm Legal Matter & Case File Summary Card */}
          <div
            id="tour-summary-card"
            className="rounded-xl bg-[#121216] border border-white/[0.07] p-3 space-y-2.5 text-[12px] shadow-sm shrink-0"
          >
            {/* Row 1: Court Forum (Click to edit matter settings) */}
            <button
              onClick={() => activeMatter && onEditMatter?.(activeMatter)}
              className="w-full flex items-center justify-between gap-2 text-zinc-400 hover:text-zinc-200 transition cursor-pointer text-left"
              title="Click to edit matter caption, docket, or forum"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Scale className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate text-[11.5px]">
                  {shortForumLabel}
                </span>
              </div>
              <span className="text-[10.5px] text-zinc-500 shrink-0">Edit</span>
            </button>

            {/* Row 2: Docket Number & Practice Focus */}
            <div className="flex items-center justify-between gap-2 text-zinc-300">
              <div className="flex items-center gap-2 min-w-0">
                <Gavel className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-[11.5px] truncate">
                  {activeMatter?.matterNumber || 'No Docket ID'}
                </span>
              </div>
              <span className="text-[10.5px] text-zinc-500 truncate max-w-[135px]">
                {formatPracticeAreaLabel(activeMatter?.practiceArea)}
              </span>
            </div>

            <div className="border-t border-white/[0.06] my-1" />

            {/* Row 3: Quick Add Exhibit or Upload Document/Filing */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setActiveTab('corpus');
                  setIsInspectorDetailOpen(true);
                  setShowAddDocForm(true);
                }}
                className="flex items-center gap-2 py-0.5 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Add discovery exhibit or authority</span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {onSyncMatterFolder && (
                  <button
                    id="tour-sync-folder-btn"
                    onClick={onSyncMatterFolder}
                    title={`Sync discovery files from local matter folder (${activeMatter?.folderPath || 'choose folder'})`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] text-[10.5px] text-zinc-300 transition cursor-pointer shrink-0"
                  >
                    <FolderSync className="w-3 h-3 text-zinc-400" />
                    <span>Sync Folder</span>
                  </button>
                )}
                <button
                  id="tour-import-file-btn"
                  onClick={handlePickDocxClick}
                  disabled={isParsingDocx}
                  title="Import document or exhibit (.docx, .pdf, .txt, .rtf, .csv, .xlsx)"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[10.5px] text-zinc-200 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isParsingDocx ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileUp className="w-3 h-3 text-zinc-400" />
                  )}
                  <span>Import File</span>
                </button>
              </div>
            </div>

            {/* Row 4: Current Work Product Draft Status */}
            {activeVersion && (
              <div className="flex items-start gap-2 pt-0.5 text-zinc-300">
                <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] leading-snug truncate">
                    {activeVersion.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-zinc-500">
                    <span>Draft v{activeVersion.versionNumber}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400/90">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Peer Reviewed</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-white/[0.06] my-1" />

            {/* Row 5: Peer Review Panel (Tucked Away) */}
            <div id="tour-peer-review-panel" className="space-y-1.5">
              <button
                onClick={() => setIsReviewPanelExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 py-0.5 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
                  <span>Peer Review Panel</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-500 text-[11px]">
                  <span>2 reviewers</span>
                  {isReviewPanelExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {isReviewPanelExpanded && adversarialConfig && (
                <div className="pt-1.5 pl-2 space-y-1.5 text-[11px] border-l border-white/[0.06] ml-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Lead Drafter</span>
                    <span className="text-zinc-300 truncate max-w-[140px]">
                      {adversarialConfig.primaryModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Citation & Authority Check</span>
                    <span className="text-zinc-400 truncate max-w-[140px]">
                      {adversarialConfig.citationAuditorModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Opposing Counsel Check</span>
                    <span className="text-zinc-400 truncate max-w-[140px]">
                      {adversarialConfig.opposingCounselModel}
                    </span>
                  </div>
                  {onConfigureAgents && (
                    <button
                      onClick={onConfigureAgents}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline pt-0.5 cursor-pointer"
                    >
                      Configure review panel →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Row 6: T3-Style Case Issue Lineage & Workstreams */}
            {(issues.length > 0 || onNewIssue) && (
              <>
                <div className="border-t border-white/[0.06] my-1" />
                <div id="tour-case-issues-lineage" className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 py-0.5">
                    <button
                      onClick={() => setIsIssuesLineageExpanded((v) => !v)}
                      className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>Case Issues</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {onNewIssue && (
                        <button
                          onClick={onNewIssue}
                          className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-[10.5px] text-zinc-300 transition cursor-pointer"
                          title="Spin off a new Case Issue or Focused Counsel Inquiry"
                        >
                          + Issue
                        </button>
                      )}
                      <button
                        onClick={() => setIsIssuesLineageExpanded((v) => !v)}
                        className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        <span>{issues.length + 1}</span>
                        {isIssuesLineageExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isIssuesLineageExpanded && (
                    <div className="pt-1 pl-2 space-y-1.5 text-[11px] border-l border-white/[0.06] ml-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => onSelectIssue?.(null)}
                          className={`truncate text-left cursor-pointer ${
                            !activeIssueId
                              ? 'text-zinc-100 font-medium'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Primary Case Workstream
                        </button>
                        {!activeIssueId && (
                          <span className="text-[10px] text-emerald-400/90 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {issues.map((issue) => {
                        const isCurrent = activeIssueId === issue.id;
                        return (
                          <div
                            key={issue.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <button
                              onClick={() => onSelectIssue?.(issue.id)}
                              className={`truncate text-left cursor-pointer ${
                                isCurrent
                                  ? 'text-amber-200 font-medium'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                              title={issue.title}
                            >
                              {issue.parentIssueId ? '└ ' : ''}
                              {issue.title}
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              {issue.status !== 'synthesized' && onMergeBackIssue && (
                                <button
                                  onClick={() => onMergeBackIssue(issue.id)}
                                  className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.12] text-[10px] text-zinc-300 transition cursor-pointer"
                                  title="Incorporate findings back into parent/primary workstream"
                                >
                                  Incorporate
                                </button>
                              )}
                              {issue.status === 'synthesized' && (
                                <span className="text-[10px] text-zinc-500">
                                  Incorporated
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {issues.length > 0 && onSynthesizeMasterBrief && (
                        <button
                          onClick={onSynthesizeMasterBrief}
                          className="w-full mt-1 px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-[10.5px] font-medium text-center transition cursor-pointer"
                        >
                          Synthesize Master Brief →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quiet Segmented Tab Bar for Detail Inspector */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-1 bg-[#121216] p-0.5 rounded-lg border border-white/[0.06] text-[11px]">
              <button
                id="tour-redline-tab"
                onClick={() => {
                  setActiveTab('redline');
                  setIsInspectorDetailOpen(true);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'redline' && isInspectorDetailOpen
                    ? 'bg-white/[0.08] text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Redline ({documentVersions.length})
              </button>
              <button
                id="tour-corpus-tab"
                onClick={() => {
                  setActiveTab('corpus');
                  setIsInspectorDetailOpen(true);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'corpus' && isInspectorDetailOpen
                    ? 'bg-white/[0.08] text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Exhibits ({documents.length})
              </button>
              <button
                id="tour-chronology-tab"
                onClick={() => {
                  setActiveTab('chronology');
                  setIsInspectorDetailOpen(true);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'chronology' && isInspectorDetailOpen
                    ? 'bg-white/[0.08] text-zinc-100 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Timeline ({chronologyFacts.length})
              </button>
            </div>

            <button
              onClick={() => setIsInspectorDetailOpen((v) => !v)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 cursor-pointer"
              title={isInspectorDetailOpen ? 'Tuck away detail view' : 'Expand detail view'}
            >
              {isInspectorDetailOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Detail Inspector Body (Tucked or Expanded) */}
          {isInspectorDetailOpen && (
            <div className="space-y-3 pb-4">
              {docxExportNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/30 flex items-center gap-2 text-[11px] text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{docxExportNotice}</span>
                </div>
              )}

              {/* TAB 1: REDLINE & VERSIONS */}
              {activeTab === 'redline' && (
                <div id="tour-redline-pane" className="space-y-3">
                  <div
                    id="tour-redline-version-bar"
                    className="flex items-center justify-between gap-2"
                  >
                    <select
                      value={activeVersion?.id || ''}
                      onChange={(e) => setSelectedVersionId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#121216] border border-white/[0.07] text-xs text-zinc-200 focus:outline-none"
                    >
                      {documentVersions.map((ver) => (
                        <option key={ver.id} value={ver.id} className="bg-[#121216]">
                          Draft v{ver.versionNumber}: {ver.title.slice(0, 34)}
                        </option>
                      ))}
                    </select>

                    {activeVersion && (
                      <div className="flex items-center gap-1 bg-[#121216] p-0.5 rounded-lg border border-white/[0.07] text-[11px] shrink-0">
                        <button
                          onClick={() => setIsEditingVersion(false)}
                          className={`px-2 py-1 rounded transition cursor-pointer ${
                            !isEditingVersion
                              ? 'bg-white/[0.08] text-zinc-100'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Redline
                        </button>
                        <button
                          onClick={() => {
                            setEditVersionContent(activeVersion.content);
                            setIsEditingVersion(true);
                          }}
                          className={`px-2 py-1 rounded transition cursor-pointer ${
                            isEditingVersion
                              ? 'bg-white/[0.08] text-zinc-100'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          disabled={isExportingDocx}
                          onClick={() =>
                            handleExportDocx({
                              title: activeVersion.title,
                              suggestedFileName: `${activeVersion.title.replace(
                                /[^a-zA-Z0-9-_]+/g,
                                '_'
                              )}_v${activeVersion.versionNumber}_Redline.docx`,
                              content: activeVersion.content,
                              previousContent: activeVersion.previousContent,
                              rationaleSummary: activeVersion.rationaleSummary,
                              author:
                                activeVersion.createdByModel ||
                                'LexHarness Peer Review',
                            })
                          }
                          title="Export to Word (.docx) with native Tracked Changes (<w:ins>, <w:del>) and margin comments"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 transition cursor-pointer disabled:opacity-50"
                        >
                          {isExportingDocx ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 text-zinc-400" />
                          )}
                          <span>.docx</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeVersion ? (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#121216] border border-white/[0.07] text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-zinc-200 font-medium">
                          <span className="truncate">
                            v{activeVersion.versionNumber} &mdash; {activeVersion.title}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">
                            {new Date(activeVersion.createdAt).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {activeVersion.rationaleSummary}
                        </p>
                      </div>

                      {isEditingVersion ? (
                        <div className="p-3 rounded-xl bg-[#121216] border border-white/[0.12] space-y-2">
                          <textarea
                            value={editVersionContent}
                            onChange={(e) => setEditVersionContent(e.target.value)}
                            rows={14}
                            className="w-full p-2.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs font-serif text-zinc-200 whitespace-pre-wrap leading-relaxed focus:outline-none resize-y"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={isSavingVersion}
                              onClick={() => setIsEditingVersion(false)}
                              className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={isSavingVersion}
                              onClick={async () => {
                                if (!onUpdateDocumentVersion) return;
                                setIsSavingVersion(true);
                                try {
                                  await onUpdateDocumentVersion(
                                    activeVersion.id,
                                    editVersionContent
                                  );
                                  setIsEditingVersion(false);
                                } finally {
                                  setIsSavingVersion(false);
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isSavingVersion ? 'Saving...' : 'Save'}</span>
                            </button>
                          </div>
                        </div>
                      ) : activeVersion.previousContent ? (
                        <div className="p-3.5 rounded-xl bg-[#121216] border border-white/[0.07] space-y-2 text-xs leading-relaxed">
                          {(() => {
                            const diff = computeParagraphDiff(
                              activeVersion.previousContent,
                              activeVersion.content
                            );
                            return (
                              <div className="space-y-2">
                                {diff.removed.map((rem, i) => (
                                  <div
                                    key={`rem-${i}`}
                                    className="p-2 rounded bg-rose-950/25 border-l-2 border-rose-500/70 text-rose-300/80 line-through text-[11.5px]"
                                  >
                                    {rem}
                                  </div>
                                ))}
                                {diff.keptOrAdded.map((item, i) => (
                                  <div
                                    key={`add-${i}`}
                                    className={
                                      item.isAdded
                                        ? 'p-2 rounded bg-emerald-950/25 border-l-2 border-emerald-500/70 text-emerald-200/90 text-[11.5px]'
                                        : 'text-zinc-300 text-[11.5px]'
                                    }
                                  >
                                    {item.text}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <pre className="p-3.5 rounded-xl bg-[#121216] border border-white/[0.07] text-[11.5px] font-sans text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {activeVersion.content}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="p-5 text-center text-xs text-zinc-500">
                      No draft revisions saved yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MATTER DOCUMENT CORPUS */}
              {activeTab === 'corpus' && (
                <div
                  className="space-y-2.5"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocx(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocx(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingDocx(false);
                    const droppedFile = e.dataTransfer?.files?.[0];
                    if (droppedFile) {
                      await handleUploadDocxFileObject(droppedFile);
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf,.txt,.md,.rtf,.csv,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown,application/rtf,text/rtf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleUploadDocxFileObject(file);
                      }
                      e.target.value = '';
                    }}
                  />

                  {/* Quick Corpus Action Bar: Import File or Add Text */}
                  <div
                    className={`p-2.5 rounded-xl border border-dashed transition ${
                      isDraggingDocx
                        ? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-200'
                        : 'bg-[#121216] border-white/[0.1] text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Upload className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-[11px] truncate">
                          {isDraggingDocx
                            ? 'Drop file (.docx, .pdf, .xlsx, .csv, .rtf, .txt) to import...'
                            : 'Drop a file (.docx, .pdf, .xlsx, .csv, .rtf, .txt) or upload'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isParsingDocx}
                          onClick={handlePickDocxClick}
                          title="Import document or exhibit (.docx, .pdf, .txt, .rtf, .csv, .xlsx)"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-[11px] transition cursor-pointer disabled:opacity-50"
                        >
                          {isParsingDocx ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileUp className="w-3 h-3" />
                          )}
                          <span>Import File</span>
                        </button>
                        {!showAddDocForm && (
                          <button
                            type="button"
                            onClick={() => {
                              setDocxPreviewMeta(null);
                              setNewDocFileName('');
                              setShowAddDocForm(true);
                            }}
                            className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[11px] transition cursor-pointer"
                          >
                            Paste Text
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {docxError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-2 text-[11px] text-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{docxError}</span>
                    </div>
                  )}

                  {docxPreviewMeta && !showAddDocForm && (
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Indexed {docxPreviewMeta.fileName}:</span>
                        <span>{docxPreviewMeta.stats.headingCount} headings</span>
                        <span>•</span>
                        <span>
                          {docxPreviewMeta.stats.numberedParagraphCount} numbered paras
                        </span>
                        <span>•</span>
                        <span>{docxPreviewMeta.stats.tableCount} tables</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocxPreviewMeta(null)}
                        className="text-zinc-400 hover:text-zinc-200 ml-1"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {showAddDocForm && (
                    <div className="p-3 rounded-xl bg-[#121216] border border-white/[0.12] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-zinc-200">
                          {docxPreviewMeta
                            ? `Import Document (${docxPreviewMeta.fileName})`
                            : 'Add Document to Corpus'}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10.5px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                        >
                          Choose file (.docx, .pdf, .xlsx, .csv, .rtf, .txt)
                        </button>
                      </div>

                      {docxPreviewMeta && (
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                          <span>Parsed file:</span>
                          <span>{docxPreviewMeta.stats.headingCount} headings</span>
                          <span>•</span>
                          <span>
                            {docxPreviewMeta.stats.numberedParagraphCount} numbered paras
                          </span>
                          <span>•</span>
                          <span>{docxPreviewMeta.stats.tableCount} tables</span>
                          <span>•</span>
                          <span>{docxPreviewMeta.stats.footnoteCount} footnotes</span>
                          {docxPreviewMeta.stats.trackedChangeCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-amber-300">
                                {docxPreviewMeta.stats.trackedChangeCount} tracked changes
                              </span>
                            </>
                          )}
                          {docxPreviewMeta.stats.commentCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-sky-300">
                                {docxPreviewMeta.stats.commentCount} comments
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      <input
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Document Title"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-100 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newDocCategory}
                          onChange={(e) =>
                            setNewDocCategory(e.target.value as DocumentCategory)
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200"
                        >
                          <option value="CONTRACT">Contract</option>
                          <option value="DEPOSITION">Deposition</option>
                          <option value="EXHIBIT">Exhibit</option>
                          <option value="PLEADING">Pleading</option>
                          <option value="STATUTE_AUTHORITY">Authority</option>
                          <option value="WORK_PRODUCT">Work Product</option>
                        </select>
                        <input
                          type="text"
                          value={newDocBates}
                          onChange={(e) => setNewDocBates(e.target.value)}
                          placeholder="Bates (e.g. EX-01)"
                          className="px-2.5 py-1.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200 font-mono"
                        />
                      </div>
                      <textarea
                        value={newDocContent}
                        onChange={(e) => setNewDocContent(e.target.value)}
                        rows={6}
                        placeholder="Paste document text or upload a .docx file..."
                        className="w-full p-2.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200 font-mono focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowAddDocForm(false);
                            setDocxPreviewMeta(null);
                            setNewDocFileName('');
                          }}
                          className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!newDocTitle.trim() || !newDocContent.trim()) return;
                            const resolvedFileName =
                              newDocFileName.trim() ||
                              `${newDocTitle
                                .trim()
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '_')}.txt`;
                            await onCreateDocument({
                              matterId,
                              title: newDocTitle.trim(),
                              fileName: resolvedFileName,
                              category: newDocCategory,
                              batesRange: newDocBates.trim() || 'DOC-001',
                              summary:
                                docxPreviewMeta?.summary ||
                                newDocContent.trim().slice(0, 140),
                              content: newDocContent.trim(),
                            });
                            setNewDocTitle('');
                            setNewDocFileName('');
                            setNewDocContent('');
                            setDocxPreviewMeta(null);
                            setShowAddDocForm(false);
                          }}
                          className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-950 font-medium text-xs cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onSelectDoc(doc.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                          activeDoc?.id === doc.id
                            ? 'bg-white/[0.07] text-zinc-100'
                            : 'hover:bg-white/[0.03] text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="text-xs font-medium truncate">
                              {doc.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {doc.batesRange}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {activeDoc && (
                    <div className="p-3 rounded-xl bg-[#121216] border border-white/[0.07] space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {activeDoc.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(() => {
                            const latestVersion = documentVersions
                              .filter((v) => v.documentId === activeDoc.id && v.versionNumber > 1)
                              .sort(
                                (a, b) =>
                                  new Date(b.createdAt).getTime() -
                                  new Date(a.createdAt).getTime()
                              )[0];

                            const isOutdated =
                              latestVersion &&
                              new Date(activeDoc.updatedAt).getTime() >
                                new Date(latestVersion.createdAt).getTime();

                            if (isOutdated) {
                              return (
                                <button
                                  onClick={() => onRequestReview?.(activeDoc)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-pointer"
                                >
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Needs Review</span>
                                </button>
                              );
                            }
                            if (latestVersion) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-400">
                                  <ShieldCheck className="w-3 h-3" />
                                  Reviewed
                                </span>
                              );
                            }
                            return (
                              <button
                                onClick={() => onRequestReview?.(activeDoc)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Review</span>
                              </button>
                            );
                          })()}

                          {isEditingDoc ? (
                            <button
                              disabled={isSavingEdit}
                              onClick={async () => {
                                if (!onUpdateDocument) return;
                                setIsSavingEdit(true);
                                try {
                                  await onUpdateDocument({
                                    docId: activeDoc.id,
                                    title: editDocTitle,
                                    content: editDocContent,
                                  });
                                  setIsEditingDoc(false);
                                } finally {
                                  setIsSavingEdit(false);
                                }
                              }}
                              className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-950 font-medium text-[10px] cursor-pointer"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditDocTitle(activeDoc.title);
                                setEditDocContent(activeDoc.content);
                                setIsEditingDoc(true);
                              }}
                              className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[10px] cursor-pointer"
                            >
                              Edit
                            </button>
                          )}

                          <button
                            disabled={isExportingDocx}
                            onClick={() => {
                              const latestVer = documentVersions
                                .filter((v) => v.documentId === activeDoc.id)
                                .sort(
                                  (a, b) =>
                                    new Date(b.createdAt).getTime() -
                                    new Date(a.createdAt).getTime()
                                )[0];
                              handleExportDocx({
                                title: activeDoc.title,
                                suggestedFileName: `${activeDoc.title.replace(
                                  /[^a-zA-Z0-9-_]+/g,
                                  '_'
                                )}.docx`,
                                content: activeDoc.content,
                                previousContent: latestVer?.previousContent,
                                rationaleSummary:
                                  latestVer?.rationaleSummary || activeDoc.summary,
                                author:
                                  latestVer?.createdByModel || 'LexHarness',
                              });
                            }}
                            title="Export to Word (.docx) with native Tracked Changes and comments"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            <span>.docx</span>
                          </button>
                        </div>
                      </div>

                      {isEditingDoc ? (
                        <textarea
                          value={editDocContent}
                          onChange={(e) => setEditDocContent(e.target.value)}
                          rows={12}
                          className="w-full p-2.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs font-mono text-zinc-200 focus:outline-none"
                        />
                      ) : (
                        <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                          {activeDoc.content}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CHRONOLOGY */}
              {activeTab === 'chronology' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">
                      Record timeline & pinpoints
                    </span>
                    <button
                      onClick={() => setShowAddFactForm((v) => !v)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-zinc-300 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Fact</span>
                    </button>
                  </div>

                  {showAddFactForm && (
                    <div className="p-3 rounded-xl bg-[#121216] border border-white/[0.12] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={factDate}
                          onChange={(e) => setFactDate(e.target.value)}
                          className="px-2 py-1 rounded bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200"
                        />
                        <select
                          value={factStatus}
                          onChange={(e) =>
                            setFactStatus(e.target.value as ChronologyFact['status'])
                          }
                          className="px-2 py-1 rounded bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200"
                        >
                          <option value="UNDISPUTED">Undisputed</option>
                          <option value="DISPUTED">Disputed</option>
                          <option value="NEEDS_CORROBORATION">Needs Corroboration</option>
                        </select>
                      </div>
                      <textarea
                        value={factDesc}
                        onChange={(e) => setFactDesc(e.target.value)}
                        rows={2}
                        placeholder="Event description..."
                        className="w-full p-2 rounded bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200"
                      />
                      <input
                        type="text"
                        value={factCite}
                        onChange={(e) => setFactCite(e.target.value)}
                        placeholder="Record Pinpoint (e.g. [STATE-BWC-0004])"
                        className="w-full px-2 py-1 rounded bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200 font-mono"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowAddFactForm(false)}
                          className="px-2 py-1 text-xs text-zinc-400"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!factDesc.trim()) return;
                            await onAddChronologyFact({
                              matterId,
                              factDate,
                              eventDescription: factDesc.trim(),
                              sourceCitation: factCite.trim() || 'Matter Record',
                              status: factStatus,
                            });
                            setFactDesc('');
                            setFactCite('');
                            setShowAddFactForm(false);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-950 font-medium text-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {chronologyFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className="p-2.5 rounded-xl bg-[#121216] border border-white/[0.07] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-zinc-400">
                            {fact.factDate}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[9.5px] rounded font-mono ${
                              fact.status === 'UNDISPUTED'
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : fact.status === 'DISPUTED'
                                ? 'text-rose-400 bg-rose-500/10'
                                : 'text-amber-400 bg-amber-500/10'
                            }`}
                          >
                            {fact.status}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-zinc-200 leading-relaxed">
                          {fact.eventDescription}
                        </p>
                        <div className="text-[10.5px] font-mono text-zinc-500">
                          {fact.sourceCitation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
