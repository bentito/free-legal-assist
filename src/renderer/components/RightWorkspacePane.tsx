import React, { useState } from 'react';
import {
  AdversarialConfig,
  ChronologyFact,
  DocumentCategory,
  DocumentVersion,
  Matter,
  MatterDocument,
} from '../../shared/types';
import {
  BookOpen,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  FileDiff,
  FileText,
  Folder,
  GitBranch,
  GitCommit,
  Monitor,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
}

export type RightTab = 'redline' | 'corpus' | 'chronology';

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
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('EXHIBIT');
  const [newDocBates, setNewDocBates] = useState('EX-0100');
  const [newDocContent, setNewDocContent] = useState('');

  // T3-style collapsible inspector sections
  const [isLineageExpanded, setIsLineageExpanded] = useState(false);
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
  const [factDate, setFactDate] = useState('2026-09-10');
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

  // Compute T3-style +added / -removed line stats for the active version
  const diffStats = React.useMemo(() => {
    if (!activeVersion) return { added: 0, removed: 0 };
    if (!activeVersion.previousContent) {
      const lines = (activeVersion.content || '').split('\n').filter(Boolean).length;
      return { added: lines * 12, removed: 0 };
    }
    const diff = computeParagraphDiff(
      activeVersion.previousContent,
      activeVersion.content
    );
    const addedCount = diff.keptOrAdded
      .filter((k) => k.isAdded)
      .reduce((acc, k) => acc + Math.max(1, Math.ceil(k.text.length / 45)), 0);
    const removedCount = diff.removed.reduce(
      (acc, r) => acc + Math.max(1, Math.ceil(r.length / 45)),
      0
    );
    return { added: addedCount || 24, removed: removedCount };
  }, [activeVersion]);

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
            Select or create a matter in the sidebar to view corpus files, redlines, and chronology.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 space-y-3">
          {/* T3 Code Style Floating Context & Lineage Card */}
          <div
            id="tour-matter-overview"
            className="rounded-xl bg-[#121216] border border-white/[0.07] p-3 space-y-2.5 text-[12px] shadow-sm shrink-0"
          >
            {/* Row 1: Forum / Workspace Location */}
            <div className="flex items-center justify-between gap-2 text-zinc-400">
              <div className="flex items-center gap-2 min-w-0">
                <Monitor className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate text-[11.5px]" title={activeMatter?.jurisdiction}>
                  {shortForumLabel}
                </span>
              </div>
              {activeMatter && onEditMatter && (
                <button
                  onClick={() => onEditMatter(activeMatter)}
                  title="Edit Matter Folder & Forum Settings"
                  className="p-1 rounded hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-200 transition cursor-pointer shrink-0"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Row 2: Open Corpus Browser */}
            <button
              id="tour-corpus-tab"
              onClick={() => {
                setActiveTab('corpus');
                setIsInspectorDetailOpen(true);
              }}
              className="w-full flex items-center justify-between gap-2 py-0.5 text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-medium truncate">
                  Open Matter Corpus ({documents.length})
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            </button>

            {/* Row 3: Quick Add Exhibit / Script */}
            <button
              onClick={() => {
                setActiveTab('corpus');
                setIsInspectorDetailOpen(true);
                setShowAddDocForm(true);
              }}
              className="w-full flex items-center gap-2 py-0.5 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Add discovery exhibit</span>
            </button>

            <div className="border-t border-white/[0.06] my-1" />

            {/* Row 4: Docket Branch / Practice Task */}
            <div className="flex items-center justify-between gap-2 text-zinc-300">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="font-mono text-[11.5px] truncate">
                  {activeMatter?.matterNumber || '26-CR-04118'}
                </span>
              </div>
              <span className="text-[10.5px] text-zinc-500 truncate max-w-[110px]">
                {activeMatter?.practiceArea.replace(/^vt_|^general_/g, '').replace(/_/g, '-')}
              </span>
            </div>

            {/* Row 5: Latest Version Commit Line */}
            {activeVersion && (
              <div className="space-y-1.5 pl-0.5">
                <div className="flex items-start gap-2 text-zinc-300">
                  <GitCommit className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[11.5px] leading-snug line-clamp-2">
                    {activeVersion.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-5 text-[11px] text-zinc-500 font-mono">
                  <span>#v{activeVersion.versionNumber}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            )}

            {/* Row 6: Chronology Quick Switch */}
            <button
              onClick={() => {
                setActiveTab('chronology');
                setIsInspectorDetailOpen(true);
              }}
              className="w-full flex items-center justify-between gap-2 py-0.5 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Chronology & Record Facts</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {chronologyFacts.length}
              </span>
            </button>

            {/* Row 7: T3-style "Changes +294 -0" Redline Toggle */}
            <button
              id="tour-redline-tab"
              onClick={() => {
                setActiveTab('redline');
                setIsInspectorDetailOpen(true);
              }}
              className="w-full flex items-center justify-between gap-2 py-0.5 text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileDiff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Changes</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11.5px]">
                <span className="text-emerald-400">+{diffStats.added}</span>
                <span className="text-rose-400">-{diffStats.removed}</span>
              </div>
            </button>

            <div className="border-t border-white/[0.06] my-1" />

            {/* Row 8: Lineage & Previous / Review Agents (Tucked Away!) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Lineage</span>
                {onConfigureAgents && (
                  <button
                    onClick={onConfigureAgents}
                    className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                    title="Configure Review Team Models"
                  >
                    &bull;&bull;&bull;
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsLineageExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 py-0.5 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Review agents</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-500 text-[11.5px]">
                  <span>3</span>
                  {isLineageExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {isLineageExpanded && adversarialConfig && (
                <div className="pt-1.5 pl-2 space-y-1.5 text-[11px] border-l border-white/[0.06] ml-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Lead Drafter</span>
                    <span className="font-mono text-zinc-300 truncate max-w-[140px]">
                      {adversarialConfig.primaryModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Citation Auditor</span>
                    <span className="font-mono text-zinc-400 truncate max-w-[140px]">
                      {adversarialConfig.citationAuditorModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Opposing Critic</span>
                    <span className="font-mono text-zinc-400 truncate max-w-[140px]">
                      {adversarialConfig.opposingCounselModel}
                    </span>
                  </div>
                  {onConfigureAgents && (
                    <button
                      onClick={onConfigureAgents}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline pt-0.5 cursor-pointer"
                    >
                      Configure models &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quiet Segmented Tab Bar for Detail Inspector */}
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex items-center gap-1 bg-[#121216] p-0.5 rounded-lg border border-white/[0.06] text-[11px]">
              <button
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
                Corpus ({documents.length})
              </button>
              <button
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
              {/* TAB 1: REDLINE & VERSIONS */}
              {activeTab === 'redline' && (
                <div id="tour-redline-pane" className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={activeVersion?.id || ''}
                      onChange={(e) => setSelectedVersionId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#121216] border border-white/[0.07] text-xs text-zinc-200 focus:outline-none"
                    >
                      {documentVersions.map((ver) => (
                        <option key={ver.id} value={ver.id} className="bg-[#121216]">
                          v{ver.versionNumber}: {ver.title.slice(0, 34)}
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
                          Diff
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
                <div className="space-y-2.5">
                  {showAddDocForm && (
                    <div className="p-3 rounded-xl bg-[#121216] border border-white/[0.12] space-y-2">
                      <div className="text-xs font-medium text-zinc-200">
                        Add Document to Corpus
                      </div>
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
                        rows={4}
                        placeholder="Paste document text or transcript excerpt..."
                        className="w-full p-2.5 rounded-lg bg-[#0b0b0e] border border-white/[0.08] text-xs text-zinc-200 font-mono focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowAddDocForm(false)}
                          className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!newDocTitle.trim() || !newDocContent.trim()) return;
                            await onCreateDocument({
                              matterId,
                              title: newDocTitle.trim(),
                              fileName: `${newDocTitle
                                .trim()
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '_')}.txt`,
                              category: newDocCategory,
                              batesRange: newDocBates.trim() || 'DOC-001',
                              summary: newDocContent.trim().slice(0, 140),
                              content: newDocContent.trim(),
                            });
                            setNewDocTitle('');
                            setNewDocContent('');
                            setShowAddDocForm(false);
                          }}
                          className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-950 font-medium text-xs"
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
