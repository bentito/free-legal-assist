import { DesktopUpdateReleaseNote } from '../../shared/types';

export const MAX_RELEASE_NOTE_ITEMS_PER_GROUP = 4;
export const MAX_RELEASE_NOTE_GROUPS = 3;
export const MAX_RELEASE_NOTE_ITEM_LENGTH = 220;

export interface RawReleaseNoteEntry {
  version: string;
  note?: string | null;
  releaseDate?: string;
}

const PRERELEASE_BUILD_DAY = /-(?:nightly|preview)\.(\d{4})(\d{2})(\d{2})\.\d+$/;

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

export function stripMarkup(input: string, keepBold = false): string {
  const markdown = decodeBasicHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<\/?(?:ul|ol|blockquote)>/gi, '\n')
      .replace(/<\/?(?:strong|b)\b[^>]*>/gi, '**')
      .replace(/<[^>]*>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  );
  return keepBold ? markdown : markdown.replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function truncateReleaseNoteItem(item: string): string {
  if (item.length <= MAX_RELEASE_NOTE_ITEM_LENGTH) return item;
  return `${item.slice(0, MAX_RELEASE_NOTE_ITEM_LENGTH - 3).trimEnd()}...`;
}

export function normalizeReleaseNoteLine(line: string): string {
  return line.toLowerCase().replace(/[*_`#]/g, '').trim();
}

export function isIgnoredReleaseNoteLine(line: string): boolean {
  const normalized = normalizeReleaseNoteLine(line);
  return (
    normalized === '' ||
    normalized === "what's changed" ||
    normalized === 'whats changed' ||
    normalized.startsWith('compare: ') ||
    normalized.includes('/compare/') ||
    /^full changelog:?\s*\S+\.\.\.\S+$/i.test(normalized)
  );
}

/**
 * Extracts structured summary items, leading bold topic bullets, "Plus N more..." footer,
 * and "vX.Y.Z · N changes from M contributors" stats line, matching T3 Code's release notes parser.
 */
export function extractReleaseNoteSummary(summary: string): Omit<DesktopUpdateReleaseNote, 'version'> {
  let stats: string | undefined;
  let footer: string | undefined;
  const intro: string[] = [];
  const items: string[] = [];

  for (const rawLine of stripMarkup(summary, true).split('\n')) {
    const line = rawLine
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*\((?:#\d+(?:,\s*)?)+\)\.?$/, '')
      .trim();
    const plain = line.replace(/\*\*([^*]+)\*\*/g, '$1');

    if (/^(?:###\s+)?Plus \d+ more /i.test(plain)) {
      footer = plain.replace(/^###\s+/, '');
      continue;
    }
    if (plain === '' || /^#{1,6}\s+/.test(plain)) {
      continue;
    }
    if (stats === undefined && /^v?\d+\.\d+\.\d+\S*\s*·\s*/i.test(plain)) {
      const sepIdx = plain.indexOf(' · ');
      if (sepIdx >= 0) {
        stats = plain.slice(sepIdx + 3).trim();
        continue;
      }
    }
    if (stats === undefined && /^\d+\s+changes?\s+from\s+\d+\s+contributors?$/i.test(plain)) {
      stats = plain;
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      const cleanedBullet = truncateReleaseNoteItem(line.replace(/^[-*•]\s+/, '').trim());
      if (cleanedBullet) {
        items.push(cleanedBullet);
      }
    } else if (!isIgnoredReleaseNoteLine(plain)) {
      intro.push(plain);
    }
  }

  const totalItems = items.length + intro.length;
  const displayedItems = items.slice(0, MAX_RELEASE_NOTE_ITEMS_PER_GROUP);
  const omittedBullets = Math.max(0, items.length - displayedItems.length);
  const resolvedFooter =
    footer ??
    (omittedBullets > 0
      ? `Plus ${omittedBullets} more ${omittedBullets === 1 ? 'improvement' : 'improvements'}.`
      : undefined);

  return {
    items: displayedItems,
    totalItems,
    ...(intro.length > 0 && displayedItems.length === 0 ? { intro: intro.join(' ') } : {}),
    ...(stats ? { stats } : {}),
    ...(resolvedFooter ? { footer: resolvedFooter } : {}),
  };
}

export function extractReleaseNoteItems(
  note: string | null | undefined
): Omit<DesktopUpdateReleaseNote, 'version'> {
  if (!note || !note.trim()) {
    return {
      items: [],
      totalItems: 0,
    };
  }

  const summaryEnd = note.search(/<details>\s*<summary>\s*Full changelog\s*<\/summary>/i);
  if (summaryEnd >= 0) {
    return extractReleaseNoteSummary(note.slice(0, summaryEnd));
  }

  // If the note contains bold lead-in bullets ("- **Topic.** ..."), a "### Plus N more..." footer, or a stats line, use summary extraction
  if (
    /[-*•]\s+\*\*[^*]+\*\*/.test(note) ||
    /^###\s+Plus \d+ more /im.test(note) ||
    /^v?\d+\.\d+\.\d+\S*\s*·\s*/im.test(note)
  ) {
    return extractReleaseNoteSummary(note);
  }

  const items: string[] = [];
  let totalItems = 0;

  for (const rawLine of stripMarkup(note, true).split('\n')) {
    const item = rawLine
      .trim()
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*\((?:#\d+(?:,\s*)?)+\)\.?$/, '')
      .trim();
    const plain = item.replace(/\*\*([^*]+)\*\*/g, '$1');
    const normalized = normalizeReleaseNoteLine(plain);
    if (
      normalized === 'new contributors' ||
      normalized === 'full changelog' ||
      normalized === 'downloads' ||
      normalized === 'installers'
    ) {
      break;
    }
    if (/^#{1,6}\s+/.test(plain)) continue;
    if (isIgnoredReleaseNoteLine(plain)) continue;
    totalItems += 1;
    items.push(truncateReleaseNoteItem(item));
    if (items.length > MAX_RELEASE_NOTE_ITEMS_PER_GROUP) {
      items.shift();
    }
  }

  const displayed = items;
  const omittedCount = Math.max(0, totalItems - displayed.length);

  return {
    items: displayed,
    totalItems,
    ...(omittedCount > 0
      ? {
          footer: `Plus ${omittedCount} more ${omittedCount === 1 ? 'change' : 'changes'}.`,
        }
      : {}),
  };
}

export function resolveReleasedAt(
  version: string,
  offeredVersion: string,
  releaseDate?: string
): string | undefined {
  if (version.replace(/^v/i, '') === offeredVersion.replace(/^v/i, '') && releaseDate) {
    return releaseDate.slice(0, 10);
  }
  const day = PRERELEASE_BUILD_DAY.exec(version);
  return day ? `${day[1]}-${day[2]}-${day[3]}` : releaseDate ? releaseDate.slice(0, 10) : undefined;
}

export function normalizeDesktopUpdateReleaseNotes(
  releaseNotes: string | RawReleaseNoteEntry[] | null | undefined,
  fallbackVersion: string,
  releaseDate?: string
): {
  releaseNotes: DesktopUpdateReleaseNote[];
  omittedReleaseCount: number;
} {
  const cleanFallback = fallbackVersion.replace(/^v/i, '');
  const entries: RawReleaseNoteEntry[] =
    typeof releaseNotes === 'string'
      ? [{ version: cleanFallback, note: releaseNotes, releaseDate }]
      : Array.isArray(releaseNotes)
        ? releaseNotes.filter(
            (e): e is RawReleaseNoteEntry =>
              Boolean(e && typeof e === 'object' && typeof e.version === 'string')
          )
        : [];

  const normalizedNotes: DesktopUpdateReleaseNote[] = entries.flatMap((entry) => {
    const cleanVersion = entry.version.replace(/^v/i, '');
    const parsed = extractReleaseNoteItems(entry.note);
    if (parsed.totalItems === 0 && !parsed.stats && !parsed.intro) {
      return [];
    }
    const releasedAt = resolveReleasedAt(
      cleanVersion,
      cleanFallback,
      entry.releaseDate ?? releaseDate
    );
    return [
      {
        version: cleanVersion,
        ...parsed,
        ...(releasedAt ? { releasedAt } : {}),
      },
    ];
  });

  return {
    releaseNotes: normalizedNotes.slice(0, MAX_RELEASE_NOTE_GROUPS),
    omittedReleaseCount: Math.max(0, normalizedNotes.length - MAX_RELEASE_NOTE_GROUPS),
  };
}
