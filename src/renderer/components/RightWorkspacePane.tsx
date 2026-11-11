import React, { useState } from 'react';
import {
  ChronologyFact,
  DocumentCategory,
  DocumentVersion,
  MatterDocument,
} from '../../shared/types';
import {
  BookOpen,
  CalendarClock,
  Clock,
  FileDiff,
  FilePlus2,
  FileText,
  Plus,
  ShieldCheck,
} from 'lucide-react';

interface RightWorkspacePaneProps {
  matterId: string;
  documents: MatterDocument[];
  documentVersions: DocumentVersion[];
  chronologyFacts: ChronologyFact[];
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onCreateDocument: (payload: {
    matterId: string;
    title: string;
    fileName: string;
    category: DocumentCategory;
    batesRange: string;
    summary: string;
    content: string;
  }) => Promise<void>;
  onAddChronologyFact: (payload: {
    matterId: string;
    factDate: string;
    eventDescription: string;
    sourceCitation: string;
    status: ChronologyFact['status'];
  }) => Promise<void>;
}

type RightTab = 'redline' | 'corpus' | 'chronology';

export const RightWorkspacePane: React.FC<RightWorkspacePaneProps> = ({
  matterId,
  documents,
  documentVersions,
  chronologyFacts,
  selectedDocId,
  onSelectDoc,
  onCreateDocument,
  onAddChronologyFact,
}) => {
  const [activeTab, setActiveTab] = useState<RightTab>('redline');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('EXHIBIT');
  const [newDocBates, setNewDocBates] = useState('EX-0100');
  const [newDocContent, setNewDocContent] = useState('');

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

  return (
    <div className="w-[430px] xl:w-[480px] shrink-0 bg-slate-900/90 border-l border-slate-800 flex flex-col h-full">
      {/* Top Tab Bar */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/70 px-2 pt-2">
        <button
          onClick={() => setActiveTab('redline')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'redline'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>Redline</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
            {documentVersions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('corpus')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'corpus'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Documents</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chronology')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
            activeTab === 'chronology'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Chronology</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
            {chronologyFacts.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Redline & Version Viewer */}
      {activeTab === 'redline' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Document Versions & Changes
              </h3>
              <p className="text-[11px] text-slate-400">
                Compare original drafts against revised versions.
              </p>
            </div>
            <select
              value={activeVersion?.id || ''}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
            >
              {documentVersions.map((ver) => (
                <option key={ver.id} value={ver.id}>
                  v{ver.versionNumber}: {ver.title.slice(0, 28)}
                </option>
              ))}
            </select>
          </div>

          {activeVersion ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center justify-between text-amber-300 font-semibold mb-1">
                  <span>
                    Snapshot v{activeVersion.versionNumber} — {activeVersion.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(activeVersion.createdAt).toLocaleDateString()}{' '}
                    {new Date(activeVersion.createdAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="font-semibold text-amber-200">Revision Summary: </span>
                  {activeVersion.rationaleSummary}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/20 text-[10px]">
                  <span className="text-slate-400 font-mono">
                    Created by: {activeVersion.createdByModel}
                  </span>
                  {activeVersion.versionNumber > 1 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      Peer Reviewed & Cured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Pre-Review Draft
                    </span>
                  )}
                </div>
              </div>

              {activeVersion.previousContent ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 font-serif text-xs leading-relaxed">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-800 font-sans text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 line-through">
                      Original Text (Removed)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 underline">
                      Revised Text (Added)
                    </span>
                  </div>

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
                            className="p-2 rounded bg-rose-950/35 border-l-2 border-rose-500 text-rose-300/90 line-through"
                          >
                            {rem}
                          </div>
                        ))}
                        {diff.keptOrAdded.map((item, i) => (
                          <div
                            key={`add-${i}`}
                            className={
                              item.isAdded
                                ? 'p-2 rounded bg-emerald-950/30 border-l-2 border-emerald-500 text-emerald-200 underline decoration-emerald-500/50'
                                : 'text-slate-300'
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
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-serif text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeVersion.content}
                </pre>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No draft revisions saved yet for this matter.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Matter Document Corpus */}
      {activeTab === 'corpus' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Matter Documents & Exhibits
              </h3>
              <p className="text-[11px] text-slate-400">
                Local case files searched during legal research.
              </p>
            </div>
            <button
              onClick={() => setShowAddDocForm((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 transition"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Add Exhibit / Doc</span>
            </button>
          </div>

          {showAddDocForm && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2.5">
              <div className="text-xs font-semibold text-amber-300">
                Add Document to Matter Files
              </div>
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document Title (e.g., Exhibit 18 — CISO Advisory Email)"
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newDocCategory}
                  onChange={(e) =>
                    setNewDocCategory(e.target.value as DocumentCategory)
                  }
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                >
                  <option value="CONTRACT">Contract</option>
                  <option value="DEPOSITION">Deposition</option>
                  <option value="EXHIBIT">Exhibit</option>
                  <option value="PLEADING">Pleading / Court Filing</option>
                  <option value="STATUTE_AUTHORITY">Statute / Legal Authority</option>
                  <option value="WORK_PRODUCT">Work Product / Draft</option>
                </select>
                <input
                  type="text"
                  value={newDocBates}
                  onChange={(e) => setNewDocBates(e.target.value)}
                  placeholder="Bates Range (e.g. APEX-0080)"
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                />
              </div>
              <textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                rows={4}
                placeholder="Paste document text, contract clause, or transcript excerpt..."
                className="w-full p-2.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddDocForm(false)}
                  className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
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
                  className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-semibold text-xs"
                >
                  Save Document
                </button>
              </div>
            </div>
          )}

          {/* Document Selector List */}
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className={`w-full p-2.5 rounded-xl border text-left transition ${
                  activeDoc?.id === doc.id
                    ? 'bg-amber-500/15 border-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-100 truncate">
                      {doc.title}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-amber-300 shrink-0">
                    {doc.batesRange}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {doc.summary}
                </p>
              </button>
            ))}
          </div>

          {/* Active Document Reader */}
          {activeDoc && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    {activeDoc.title}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{activeDoc.fileName} &bull; Bates: {activeDoc.batesRange}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Indexed: {new Date(activeDoc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {documentVersions.some((v) => v.documentId === activeDoc.id && v.versionNumber > 1) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      Peer Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Source Document
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300">
                    {activeDoc.category}
                  </span>
                </div>
              </div>
              <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {activeDoc.content}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fact & Chronology Table */}
      {activeTab === 'chronology' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Case Timeline & Facts
              </h3>
              <p className="text-[11px] text-slate-400">
                Key timeline events and record references.
              </p>
            </div>
            <button
              onClick={() => setShowAddFactForm((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          {showAddFactForm && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={factDate}
                  onChange={(e) => setFactDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
                />
                <select
                  value={factStatus}
                  onChange={(e) =>
                    setFactStatus(e.target.value as ChronologyFact['status'])
                  }
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
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
                placeholder="Factual event description..."
                className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
              />
              <input
                type="text"
                value={factCite}
                onChange={(e) => setFactCite(e.target.value)}
                placeholder="Record Pinpoint (e.g., Vance Dep. 41:12–21 [MERIDIAN-DEP-0041])"
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddFactForm(false)}
                  className="px-2.5 py-1 text-xs text-slate-400"
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
                  className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-semibold text-xs"
                >
                  Save Fact
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {chronologyFacts.map((fact) => (
              <div
                key={fact.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-amber-400">
                    {fact.factDate}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                      fact.status === 'UNDISPUTED'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : fact.status === 'DISPUTED'
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {fact.status}
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {fact.eventDescription}
                </p>
                <div className="text-[11px] font-mono text-slate-400">
                  Pinpoint: <span className="text-slate-300">{fact.sourceCitation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
