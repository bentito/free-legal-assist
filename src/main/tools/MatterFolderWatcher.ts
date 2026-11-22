import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DocumentCategory,
  FolderSyncResult,
  MatterDocument,
} from '../../shared/types';
import { LegalDatabase } from '../db/database';
import {
  parseDocumentBuffer,
  SUPPORTED_IMPORT_EXTENSIONS,
} from './DocxParser';

export function isSupportedImportExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase().replace(/^\./, '');
  return (SUPPORTED_IMPORT_EXTENSIONS as readonly string[]).includes(ext);
}

export function inferCategoryFromFileName(fileName: string): DocumentCategory {
  const lower = fileName.toLowerCase();
  if (lower.includes('deposition') || lower.includes('transcript') || lower.includes('bwc')) {
    return 'DEPOSITION';
  }
  if (
    lower.includes('motion') ||
    lower.includes('brief') ||
    lower.includes('complaint') ||
    lower.includes('pleading') ||
    lower.includes('petition') ||
    lower.includes('answer')
  ) {
    return 'PLEADING';
  }
  if (
    lower.includes('contract') ||
    lower.includes('agreement') ||
    lower.includes('lease') ||
    lower.includes('nda') ||
    lower.includes('amendment')
  ) {
    return 'CONTRACT';
  }
  if (
    lower.includes('statute') ||
    lower.includes('authority') ||
    lower.includes('rule') ||
    lower.includes('opinion')
  ) {
    return 'STATUTE_AUTHORITY';
  }
  return 'EXHIBIT';
}

export class MatterFolderWatcher {
  private activeWatcher: fs.FSWatcher | null = null;
  private watchedMatterId: string | null = null;
  private watchedPath: string | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;

  constructor(private db: LegalDatabase, options?: { debounceMs?: number }) {
    this.debounceMs = options?.debounceMs ?? 200;
  }

  /**
   * Resolves a matter's folderPath (expanding leading `~` to os.homedir() or storageDir fallback)
   * without touching or creating directories on disk.
   */
  resolveFolderPath(folderPath: string): string {
    const trimmed = (folderPath || '').trim();
    if (!trimmed) return '';
    if (trimmed === '~') {
      return '';
    }
    if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
      const homeResolved = path.join(os.homedir(), trimmed.slice(2));
      if (fs.existsSync(homeResolved)) {
        return homeResolved;
      }
      // Fallback check inside <storageDir>/matters/<basename>
      const storageMattersCandidate = path.join(
        this.db.getStorageDir(),
        'matters',
        path.basename(trimmed)
      );
      if (fs.existsSync(storageMattersCandidate)) {
        return storageMattersCandidate;
      }
      return homeResolved;
    }
    return path.resolve(trimmed);
  }

  /**
   * Scans the matter's linked local folder and automatically indexes any newly discovered
   * supported documents (.docx, .pdf, .txt, .md, .rtf, .csv, .xlsx) into SQLite.
   */
  syncMatterFolder(matterId: string): FolderSyncResult {
    const matter = this.db.getMatter(matterId);
    if (!matter || matter.id !== matterId) {
      return {
        matterId,
        resolvedPath: '',
        folderExists: false,
        syncedCount: 0,
        newDocuments: [],
      };
    }

    const resolvedPath = this.resolveFolderPath(matter.folderPath);
    if (!resolvedPath || resolvedPath === os.homedir()) {
      return {
        matterId,
        resolvedPath,
        folderExists: false,
        syncedCount: 0,
        newDocuments: [],
      };
    }

    let isDir = false;
    try {
      isDir = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory();
    } catch {
      isDir = false;
    }

    if (!isDir) {
      return {
        matterId,
        resolvedPath,
        folderExists: false,
        syncedCount: 0,
        newDocuments: [],
      };
    }

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    } catch {
      return {
        matterId,
        resolvedPath,
        folderExists: false,
        syncedCount: 0,
        newDocuments: [],
      };
    }

    const existingDocs = this.db.listDocuments(matterId);
    const existingFileNames = new Set(
      existingDocs.map((d) => d.fileName.trim().toLowerCase())
    );

    const candidateFiles = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          !entry.name.startsWith('.') &&
          !entry.name.startsWith('~$') &&
          isSupportedImportExtension(entry.name) &&
          !existingFileNames.has(entry.name.trim().toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const newDocuments: MatterDocument[] = [];
    let nextBatesIndex = existingDocs.length + 1;

    for (const entry of candidateFiles) {
      const fullPath = path.join(resolvedPath, entry.name);
      try {
        const buffer = fs.readFileSync(fullPath);
        const parsed = parseDocumentBuffer(buffer, entry.name);
        const now = new Date().toISOString();
        const batesRange = `EX-${String(nextBatesIndex).padStart(4, '0')}`;
        nextBatesIndex++;

        const newDoc: MatterDocument = {
          id: `doc-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          matterId,
          title: parsed.suggestedTitle || entry.name,
          fileName: entry.name,
          category: inferCategoryFromFileName(entry.name),
          batesRange,
          pageCount: Math.max(
            1,
            parsed.pageCount || Math.ceil(parsed.content.length / 1800)
          ),
          summary:
            parsed.summary ||
            parsed.content.replace(/\s+/g, ' ').trim().slice(0, 140) ||
            `Auto-synced from matter folder (${entry.name})`,
          content: parsed.content,
          createdAt: now,
          updatedAt: now,
        };

        this.db.insertDocument(newDoc);
        existingFileNames.add(entry.name.trim().toLowerCase());
        newDocuments.push(newDoc);
      } catch {
        // Skip unreadable or malformed partial downloads
      }
    }

    return {
      matterId,
      resolvedPath,
      folderExists: true,
      syncedCount: newDocuments.length,
      newDocuments,
    };
  }

  /**
   * Runs an initial sync on the matter's folder and starts a live filesystem watcher
   * (`fs.watch`) if the directory exists on disk.
   */
  watchMatter(
    matterId: string,
    onAutoSynced?: (result: FolderSyncResult) => void
  ): FolderSyncResult {
    this.stopWatching();
    const initial = this.syncMatterFolder(matterId);
    if (initial.syncedCount > 0) {
      onAutoSynced?.(initial);
    }

    if (!initial.folderExists || !initial.resolvedPath) {
      return initial;
    }

    try {
      this.watchedMatterId = matterId;
      this.watchedPath = initial.resolvedPath;
      this.activeWatcher = fs.watch(
        initial.resolvedPath,
        { persistent: false },
        (_eventType, filename) => {
          if (filename && (filename.startsWith('.') || filename.startsWith('~$'))) {
            return;
          }
          if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
          }
          this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            if (!this.watchedMatterId) return;
            const res = this.syncMatterFolder(this.watchedMatterId);
            if (res.syncedCount > 0) {
              onAutoSynced?.(res);
            }
          }, this.debounceMs);
        }
      );
      this.activeWatcher.on('error', () => {
        this.stopWatching();
      });
    } catch {
      this.stopWatching();
    }

    return initial;
  }

  getWatchedMatterId(): string | null {
    return this.watchedMatterId;
  }

  getWatchedPath(): string | null {
    return this.watchedPath;
  }

  stopWatching(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.activeWatcher) {
      try {
        this.activeWatcher.close();
      } catch {
        // ignore close errors
      }
      this.activeWatcher = null;
    }
    this.watchedMatterId = null;
    this.watchedPath = null;
  }
}
