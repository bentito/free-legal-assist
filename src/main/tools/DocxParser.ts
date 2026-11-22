import path from 'node:path';
import zlib from 'node:zlib';
import {
  DocxComment,
  DocxTrackedChange,
  ExportDocxPayload,
} from '../../shared/types';

export interface ParsedDocxResult {
  fileName: string;
  suggestedTitle: string;
  content: string;
  pageCount: number;
  summary: string;
  trackedChanges: DocxTrackedChange[];
  comments: DocxComment[];
  stats: {
    headingCount: number;
    numberedParagraphCount: number;
    tableCount: number;
    footnoteCount: number;
    trackedChangeCount: number;
    commentCount: number;
  };
}

interface NumberingLevelDef {
  numFmt: string;
  lvlText: string;
  start: number;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Extracts entries from a standard ZIP buffer (PKZIP format) using Node's built-in `node:zlib`.
 * Supports uncompressed (method 0) and deflate (method 8) entries, as well as data-descriptor
 * entries via Central Directory lookup.
 */
export function extractZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();

  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Invalid .docx file: not a valid ZIP archive.');
  }

  // Locate End of Central Directory (EOCD) record (signature 0x06054b50)
  let eocdOffset = -1;
  const minEocdOffset = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= minEocdOffset; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdSize = buffer.readUInt32LE(eocdOffset + 12);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    let ptr = cdOffset;
    const cdEnd = Math.min(buffer.length, cdOffset + cdSize);

    for (let idx = 0; idx < totalEntries && ptr + 46 <= cdEnd; idx++) {
      const sig = buffer.readUInt32LE(ptr);
      if (sig !== 0x02014b50) break;

      const compressionMethod = buffer.readUInt16LE(ptr + 10);
      const compressedSize = buffer.readUInt32LE(ptr + 20);
      const fileNameLength = buffer.readUInt16LE(ptr + 28);
      const extraFieldLength = buffer.readUInt16LE(ptr + 30);
      const fileCommentLength = buffer.readUInt16LE(ptr + 32);
      const localHeaderOffset = buffer.readUInt32LE(ptr + 42);

      const fileName = buffer
        .subarray(ptr + 46, ptr + 46 + fileNameLength)
        .toString('utf8');

      ptr += 46 + fileNameLength + extraFieldLength + fileCommentLength;

      if (fileName.endsWith('/')) continue;

      if (
        localHeaderOffset + 30 <= buffer.length &&
        buffer.readUInt32LE(localHeaderOffset) === 0x04034b50
      ) {
        const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const dataEnd = dataStart + compressedSize;

        if (dataEnd <= buffer.length) {
          const rawSlice = buffer.subarray(dataStart, dataEnd);
          if (compressionMethod === 0) {
            entries.set(fileName, rawSlice);
          } else if (compressionMethod === 8) {
            entries.set(fileName, zlib.inflateRawSync(rawSlice));
          }
        }
      }
    }

    if (entries.size > 0) {
      return entries;
    }
  }

  // Fallback linear scan of local file headers
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const fileName = buffer
      .subarray(nameStart, nameStart + fileNameLength)
      .toString('utf8');
    const dataStart = nameStart + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) break;

    if (!fileName.endsWith('/')) {
      const rawSlice = buffer.subarray(dataStart, dataEnd);
      if (compressionMethod === 0) {
        entries.set(fileName, rawSlice);
      } else if (compressionMethod === 8) {
        entries.set(fileName, zlib.inflateRawSync(rawSlice));
      }
    }

    offset = dataEnd;
  }

  return entries;
}

/**
 * Creates a valid .docx ZIP buffer with real CRC-32 checksums from a map of file paths to string/Buffer contents.
 */
export function buildZipArchive(files: Record<string, string | Buffer>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let currentOffset = 0;
  const fileNames = Object.keys(files);

  for (const name of fileNames) {
    const rawContent =
      typeof files[name] === 'string'
        ? Buffer.from(files[name] as string, 'utf8')
        : (files[name] as Buffer);
    const crc = computeCrc32(rawContent);
    const compressed = zlib.deflateRawSync(rawContent);
    const nameBuf = Buffer.from(name, 'utf8');

    // Local file header (30 bytes + name)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression method: deflate
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(compressed.length, 18); // compressed size
    localHeader.writeUInt32LE(rawContent.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    localParts.push(localHeader, nameBuf, compressed);

    // Central directory header (46 bytes + name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // compression method: deflate
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(compressed.length, 20); // compressed size
    centralHeader.writeUInt32LE(rawContent.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // file name length
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(currentOffset, 42); // relative offset of local header

    centralParts.push(centralHeader, nameBuf);
    currentOffset += 30 + nameBuf.length + compressed.length;
  }

  const centralDirBuffer = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(fileNames.length, 8); // entries on disk
  eocd.writeUInt16LE(fileNames.length, 10); // total entries
  eocd.writeUInt32LE(centralDirBuffer.length, 12); // size of central directory
  eocd.writeUInt32LE(currentOffset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDirBuffer, eocd]);
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_m, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getAttr(tagOrAttrs: string, attrName: string): string | null {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);
  const match = regex.exec(tagOrAttrs);
  if (!match) return null;
  return decodeXmlEntities(match[1] ?? match[2] ?? '');
}

function toRoman(num: number): string {
  if (num <= 0) return String(num);
  const lookup: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let result = '';
  let n = num;
  for (const [val, sym] of lookup) {
    while (n >= val) {
      result += sym;
      n -= val;
    }
  }
  return result;
}

function toAlpha(num: number): string {
  if (num <= 0) return String(num);
  let n = num;
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

function formatNumberingValue(val: number, numFmt: string): string {
  switch (numFmt) {
    case 'lowerLetter':
      return toAlpha(val);
    case 'upperLetter':
      return toAlpha(val).toUpperCase();
    case 'lowerRoman':
      return toRoman(val);
    case 'upperRoman':
      return toRoman(val).toUpperCase();
    case 'bullet':
      return '-';
    case 'none':
      return '';
    case 'decimalZero':
      return val < 10 ? `0${val}` : String(val);
    case 'decimal':
    default:
      return String(val);
  }
}

function parseStylesXml(stylesXml?: string): Map<string, number> {
  const headingStyles = new Map<string, number>();

  for (let i = 1; i <= 6; i++) {
    headingStyles.set(`heading${i}`, i);
    headingStyles.set(`Heading${i}`, i);
    headingStyles.set(`HEADING${i}`, i);
  }
  headingStyles.set('Title', 1);
  headingStyles.set('title', 1);
  headingStyles.set('Subtitle', 2);
  headingStyles.set('subtitle', 2);

  if (!stylesXml) return headingStyles;

  const styleBlockRegex = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
  let match: RegExpExecArray | null;
  while ((match = styleBlockRegex.exec(stylesXml)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const styleId = getAttr(attrs, 'w:styleId');
    if (!styleId) continue;

    const nameMatch = /<w:name\b[^>]*w:val="([^"]+)"/.exec(inner);
    const styleName = nameMatch ? nameMatch[1] : '';

    const headingMatch =
      /^heading\s*([1-6])$/i.exec(styleName) ||
      /^heading\s*([1-6])$/i.exec(styleId);
    if (headingMatch) {
      headingStyles.set(styleId, parseInt(headingMatch[1], 10));
      continue;
    }

    if (/^title$/i.test(styleName)) {
      headingStyles.set(styleId, 1);
      continue;
    }

    if (/^subtitle$/i.test(styleName)) {
      headingStyles.set(styleId, 2);
      continue;
    }

    const outlineMatch = /<w:outlineLvl\b[^>]*w:val="(\d+)"/.exec(inner);
    if (outlineMatch) {
      const lvl = parseInt(outlineMatch[1], 10);
      if (lvl >= 0 && lvl <= 5) {
        headingStyles.set(styleId, lvl + 1);
      }
    }
  }

  return headingStyles;
}

function parseNumberingXml(
  numberingXml?: string
): Map<string, Map<number, NumberingLevelDef>> {
  const abstractNums = new Map<string, Map<number, NumberingLevelDef>>();
  const numMap = new Map<string, Map<number, NumberingLevelDef>>();

  if (!numberingXml) return numMap;

  const abstractRegex = /<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g;
  let absMatch: RegExpExecArray | null;
  while ((absMatch = abstractRegex.exec(numberingXml)) !== null) {
    const absId = getAttr(absMatch[1], 'w:abstractNumId');
    if (!absId) continue;

    const levels = new Map<number, NumberingLevelDef>();
    const lvlRegex = /<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g;
    let lvlMatch: RegExpExecArray | null;
    while ((lvlMatch = lvlRegex.exec(absMatch[2])) !== null) {
      const ilvlStr = getAttr(lvlMatch[1], 'w:ilvl');
      if (ilvlStr === null) continue;
      const ilvl = parseInt(ilvlStr, 10);
      const lvlInner = lvlMatch[2];

      const numFmtMatch = /<w:numFmt\b[^>]*w:val="([^"]+)"/.exec(lvlInner);
      const lvlTextMatch = /<w:lvlText\b[^>]*w:val="([^"]*)"/.exec(lvlInner);
      const startMatch = /<w:start\b[^>]*w:val="(\d+)"/.exec(lvlInner);

      levels.set(ilvl, {
        numFmt: numFmtMatch ? numFmtMatch[1] : 'decimal',
        lvlText: lvlTextMatch ? lvlTextMatch[1] : `%${ilvl + 1}.`,
        start: startMatch ? parseInt(startMatch[1], 10) : 1,
      });
    }
    abstractNums.set(absId, levels);
  }

  const numRegex = /<w:num\b([^>]*)>([\s\S]*?)<\/w:num>/g;
  let numMatch: RegExpExecArray | null;
  while ((numMatch = numRegex.exec(numberingXml)) !== null) {
    const numId = getAttr(numMatch[1], 'w:numId');
    if (!numId) continue;
    const absIdMatch = /<w:abstractNumId\b[^>]*w:val="([^"]+)"/.exec(
      numMatch[2]
    );
    if (absIdMatch && abstractNums.has(absIdMatch[1])) {
      const cloned = new Map<number, NumberingLevelDef>();
      for (const [k, v] of abstractNums.get(absIdMatch[1])!.entries()) {
        cloned.set(k, { ...v });
      }
      numMap.set(numId, cloned);
    }
  }

  return numMap;
}

function extractRawTextAndDelText(xmlFragment: string): string {
  const tokenRegex =
    /<w:(?:t|delText)(?:\s[^>]*)?>([\s\S]*?)<\/w:(?:t|delText)>|<w:tab\b[^>]*\/?>|<w:(?:br|cr)\b[^>]*\/?>|<w:noBreakHyphen\b[^>]*\/?>/g;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(xmlFragment)) !== null) {
    const full = m[0];
    if (m[1] !== undefined) {
      out += decodeXmlEntities(m[1]);
    } else if (full.startsWith('<w:tab')) {
      out += '\t';
    } else if (full.startsWith('<w:br') || full.startsWith('<w:cr')) {
      out += '\n';
    } else if (full.startsWith('<w:noBreakHyphen')) {
      out += '-';
    }
  }
  return out;
}

function parseCommentsXml(commentsXml?: string): Map<string, DocxComment> {
  const comments = new Map<string, DocxComment>();
  if (!commentsXml) return comments;

  const commentRegex = /<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g;
  let match: RegExpExecArray | null;
  while ((match = commentRegex.exec(commentsXml)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const id = getAttr(attrs, 'w:id');
    if (!id) continue;

    const author = getAttr(attrs, 'w:author') || 'Reviewer';
    const date = getAttr(attrs, 'w:date') || undefined;
    const initials = getAttr(attrs, 'w:initials') || undefined;

    const paragraphs: string[] = [];
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pRegex.exec(inner)) !== null) {
      const pText = extractRawTextAndDelText(pMatch[1]).trim();
      if (pText) paragraphs.push(pText);
    }

    const text = paragraphs.join(' ').trim();
    if (text) {
      comments.set(id, {
        id,
        author,
        date,
        initials,
        text,
      });
    }
  }

  return comments;
}

interface InlineExtractionContext {
  referencedFootnotes?: Set<string>;
  referencedEndnotes?: Set<string>;
  trackedChanges?: DocxTrackedChange[];
  activeCommentAnchors?: Map<string, string[]>;
  completedCommentAnchors?: Map<string, string>;
  referencedComments?: Set<string>;
}

/**
 * Extracts inline text from a paragraph or table cell XML fragment, while:
 * - Recording `<w:ins>` and `<w:del>` tracked changes (with author/date) and rendering
 *   inline redline markup (`{+inserted+}` and `{~deleted~}`) when trackedChanges array is provided.
 * - Capturing `<w:commentRangeStart>`, `<w:commentRangeEnd>`, and `<w:commentReference>` anchors.
 * - Capturing `<w:footnoteReference>` and `<w:endnoteReference>` markers.
 */
function extractInlineTextFromXml(
  xmlFragment: string,
  ctx?: InlineExtractionContext
): string {
  // First pre-process <w:ins> and <w:del> spans so we capture tracked change metadata
  // and render inline redline markers
  let processedXml = xmlFragment;

  if (ctx?.trackedChanges) {
    processedXml = processedXml.replace(
      /<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/g,
      (_full, tag: 'ins' | 'del', attrs: string, inner: string) => {
        const changeText = extractRawTextAndDelText(inner);
        const trimmed = changeText.trim();
        const id =
          getAttr(attrs, 'w:id') ||
          `tc-${ctx.trackedChanges!.length + 1}`;
        const author = getAttr(attrs, 'w:author') || 'Author';
        const date = getAttr(attrs, 'w:date') || undefined;

        if (trimmed) {
          ctx.trackedChanges!.push({
            id,
            type: tag === 'ins' ? 'insertion' : 'deletion',
            author,
            date,
            text: trimmed,
          });
        }

        if (!changeText) return '';
        const markerText =
          tag === 'ins' ? `{+${changeText}+}` : `{~${changeText}~}`;
        return `<w:t>${escapeXml(markerText)}</w:t>`;
      }
    );
  } else {
    // Strip deleted tracked changes if not collecting trackedChanges
    processedXml = processedXml.replace(
      /<w:del\b[^>]*>[\s\S]*?<\/w:del>/g,
      ''
    );
  }

  const tokenRegex =
    /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:(?:br|cr)\b[^>]*\/?>|<w:footnoteReference\b([^>]*)\/?>|<w:endnoteReference\b([^>]*)\/?>|<w:commentRangeStart\b([^>]*)\/?>|<w:commentRangeEnd\b([^>]*)\/?>|<w:commentReference\b([^>]*)\/?>|<w:noBreakHyphen\b[^>]*\/?>/g;

  let out = '';
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(processedXml)) !== null) {
    const full = m[0];
    if (m[1] !== undefined) {
      const textChunk = decodeXmlEntities(m[1]);
      out += textChunk;
      if (ctx?.activeCommentAnchors && ctx.activeCommentAnchors.size > 0) {
        for (const chunks of ctx.activeCommentAnchors.values()) {
          chunks.push(textChunk);
        }
      }
    } else if (full.startsWith('<w:tab')) {
      out += '\t';
    } else if (full.startsWith('<w:br') || full.startsWith('<w:cr')) {
      out += '\n';
    } else if (full.startsWith('<w:noBreakHyphen')) {
      out += '-';
    } else if (full.startsWith('<w:footnoteReference')) {
      const id = getAttr(m[2] || '', 'w:id');
      if (id && id !== '0' && id !== '-1') {
        ctx?.referencedFootnotes?.add(id);
        out += `[^${id}]`;
      }
    } else if (full.startsWith('<w:endnoteReference')) {
      const id = getAttr(m[3] || '', 'w:id');
      if (id && id !== '0' && id !== '-1') {
        ctx?.referencedEndnotes?.add(id);
        out += `[^endnote-${id}]`;
      }
    } else if (full.startsWith('<w:commentRangeStart')) {
      const id = getAttr(m[4] || '', 'w:id');
      if (id && ctx?.activeCommentAnchors) {
        ctx.activeCommentAnchors.set(id, []);
        ctx.referencedComments?.add(id);
      }
    } else if (full.startsWith('<w:commentRangeEnd')) {
      const id = getAttr(m[5] || '', 'w:id');
      if (id && ctx?.activeCommentAnchors) {
        const chunks = ctx.activeCommentAnchors.get(id);
        if (chunks) {
          const anchor = chunks.join('').replace(/\s+/g, ' ').trim();
          if (anchor) {
            ctx.completedCommentAnchors?.set(id, anchor);
          }
          ctx.activeCommentAnchors.delete(id);
        }
        ctx.referencedComments?.add(id);
      }
    } else if (full.startsWith('<w:commentReference')) {
      const id = getAttr(m[6] || '', 'w:id');
      if (id) {
        ctx?.referencedComments?.add(id);
        out += `[Comment #${id}]`;
      }
    }
  }

  return out;
}

function parseNotesXml(
  notesXml: string | undefined,
  tagName: 'footnote' | 'endnote'
): Map<string, string> {
  const notes = new Map<string, string>();
  if (!notesXml) return notes;

  const noteRegex = new RegExp(
    `<w:${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/w:${tagName}>`,
    'g'
  );
  let match: RegExpExecArray | null;
  while ((match = noteRegex.exec(notesXml)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const id = getAttr(attrs, 'w:id');
    const type = getAttr(attrs, 'w:type');

    if (!id || id === '0' || id === '-1') continue;
    if (type === 'separator' || type === 'continuationSeparator') continue;

    const paragraphs: string[] = [];
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pRegex.exec(inner)) !== null) {
      const text = extractInlineTextFromXml(pMatch[1]).trim();
      if (text) {
        paragraphs.push(text);
      }
    }

    if (paragraphs.length > 0) {
      notes.set(id, paragraphs.join(' '));
    }
  }

  return notes;
}

function formatTableBlock(
  tblInnerXml: string,
  ctx: InlineExtractionContext
): string {
  const rows: string[][] = [];
  const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(tblInnerXml)) !== null) {
    const rowCells: string[] = [];
    const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
    let tcMatch: RegExpExecArray | null;

    while ((tcMatch = tcRegex.exec(trMatch[1])) !== null) {
      const cellParagraphs: string[] = [];
      const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = pRegex.exec(tcMatch[1])) !== null) {
        const pText = extractInlineTextFromXml(pMatch[1], ctx)
          .replace(/\s+/g, ' ')
          .trim();
        if (pText) {
          cellParagraphs.push(pText);
        }
      }
      const cellContent = cellParagraphs.join(' / ').replace(/\|/g, '\\|');
      rowCells.push(cellContent);
    }

    if (rowCells.length > 0) {
      rows.push(rowCells);
    }
  }

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map((r) => r.length));
  const normalizedRows = rows.map((r) => {
    const padded = [...r];
    while (padded.length < colCount) padded.push('');
    return padded;
  });

  const headerLine = `| ${normalizedRows[0].join(' | ')} |`;
  const dividerLine = `| ${normalizedRows[0].map(() => '---').join(' | ')} |`;
  const bodyLines = normalizedRows
    .slice(1)
    .map((r) => `| ${r.join(' | ')} |`);

  return [headerLine, dividerLine, ...bodyLines].join('\n');
}

/**
 * Parses a Word (.docx) file buffer and returns structured legal Markdown preserving:
 * - Headings (H1-H6 via styleId, style name, or outlineLvl)
 * - Numbered paragraphs & multi-level legal lists (via word/numbering.xml)
 * - Tables (converted to Markdown tables)
 * - Footnotes & endnotes (inline [^n] markers + Footnotes section at bottom)
 * - Tracked changes (<w:ins> and <w:del> with author & timestamp metadata + inline {+ins+}/{~del~} markup)
 * - Margin comments (word/comments.xml linked to commentRangeStart/commentRangeEnd/commentReference)
 */
export function parseDocxBuffer(
  buffer: Buffer,
  originalFileName = 'Document.docx'
): ParsedDocxResult {
  const entries = extractZipEntries(buffer);
  const documentXmlBuf = entries.get('word/document.xml');
  if (!documentXmlBuf) {
    throw new Error(
      'Invalid .docx file: missing word/document.xml inside archive.'
    );
  }

  const documentXml = documentXmlBuf.toString('utf8');
  const stylesXml = entries.get('word/styles.xml')?.toString('utf8');
  const numberingXml = entries.get('word/numbering.xml')?.toString('utf8');
  const footnotesXml = entries.get('word/footnotes.xml')?.toString('utf8');
  const endnotesXml = entries.get('word/endnotes.xml')?.toString('utf8');
  const commentsXml = entries.get('word/comments.xml')?.toString('utf8');

  const headingStyles = parseStylesXml(stylesXml);
  const numberingMap = parseNumberingXml(numberingXml);
  const footnotesMap = parseNotesXml(footnotesXml, 'footnote');
  const endnotesMap = parseNotesXml(endnotesXml, 'endnote');
  const commentsMap = parseCommentsXml(commentsXml);

  const referencedFootnotes = new Set<string>();
  const referencedEndnotes = new Set<string>();
  const trackedChanges: DocxTrackedChange[] = [];
  const activeCommentAnchors = new Map<string, string[]>();
  const completedCommentAnchors = new Map<string, string>();
  const referencedComments = new Set<string>();

  const inlineCtx: InlineExtractionContext = {
    referencedFootnotes,
    referencedEndnotes,
    trackedChanges,
    activeCommentAnchors,
    completedCommentAnchors,
    referencedComments,
  };

  // Track active counters per numId and level: Map<numId, Map<ilvl, number>>
  const listCounters = new Map<string, Map<number, number>>();

  const nextListMarker = (numId: string, ilvl: number): string => {
    let counters = listCounters.get(numId);
    if (!counters) {
      counters = new Map<number, number>();
      listCounters.set(numId, counters);
    }

    for (const existingLvl of Array.from(counters.keys())) {
      if (existingLvl > ilvl) {
        counters.delete(existingLvl);
      }
    }

    const levelDefs = numberingMap.get(numId);
    const levelDef = levelDefs?.get(ilvl);
    const startVal = levelDef?.start ?? 1;
    const currentVal = (counters.get(ilvl) ?? startVal - 1) + 1;
    counters.set(ilvl, currentVal);

    const indent = '  '.repeat(Math.max(0, ilvl));
    if (!levelDef) {
      return `${indent}${currentVal}. `;
    }

    if (levelDef.numFmt === 'bullet') {
      return `${indent}- `;
    }

    let formatted = levelDef.lvlText || `%${ilvl + 1}.`;
    formatted = formatted.replace(/%(\d+)/g, (_m, lvlIdxStr) => {
      const targetLvl = parseInt(lvlIdxStr, 10) - 1;
      const targetDef = levelDefs?.get(targetLvl);
      const targetStart = targetDef?.start ?? 1;
      const valAtLvl = counters.get(targetLvl) ?? targetStart;
      return formatNumberingValue(valAtLvl, targetDef?.numFmt ?? 'decimal');
    });

    return `${indent}${formatted} `;
  };

  let headingCount = 0;
  let numberedParagraphCount = 0;
  let tableCount = 0;
  let firstHeadingText = '';

  const blocks: string[] = [];

  const bodyMatch = /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/.exec(documentXml);
  const bodyXml = bodyMatch ? bodyMatch[1] : documentXml;

  const blockRegex =
    /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>|<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(bodyXml)) !== null) {
    if (blockMatch[1] !== undefined) {
      const mdTable = formatTableBlock(blockMatch[1], inlineCtx);
      if (mdTable) {
        tableCount++;
        blocks.push(mdTable);
      }
    } else if (blockMatch[2] !== undefined) {
      const pXml = blockMatch[2];
      const pPrMatch = /<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/.exec(pXml);
      const pPrXml = pPrMatch ? pPrMatch[1] : '';

      const pStyleMatch = /<w:pStyle\b[^>]*w:val="([^"]+)"/.exec(pPrXml);
      const pStyleId = pStyleMatch ? pStyleMatch[1] : null;

      const outlineLvlMatch = /<w:outlineLvl\b[^>]*w:val="(\d+)"/.exec(pPrXml);
      let headingLevel: number | undefined = pStyleId
        ? headingStyles.get(pStyleId)
        : undefined;
      if (!headingLevel && outlineLvlMatch) {
        const lvl = parseInt(outlineLvlMatch[1], 10);
        if (lvl >= 0 && lvl <= 5) headingLevel = lvl + 1;
      }

      const numPrMatch = /<w:numPr\b[^>]*>([\s\S]*?)<\/w:numPr>/.exec(pPrXml);
      let numId: string | null = null;
      let ilvl = 0;
      if (numPrMatch) {
        const numIdMatch = /<w:numId\b[^>]*w:val="([^"]+)"/.exec(numPrMatch[1]);
        const ilvlMatch = /<w:ilvl\b[^>]*w:val="(\d+)"/.exec(numPrMatch[1]);
        if (numIdMatch && numIdMatch[1] !== '0') {
          numId = numIdMatch[1];
          ilvl = ilvlMatch ? parseInt(ilvlMatch[1], 10) : 0;
        }
      }

      const rawText = extractInlineTextFromXml(pXml, inlineCtx).trim();

      if (!rawText) continue;

      if (headingLevel) {
        headingCount++;
        const hashes = '#'.repeat(Math.min(6, Math.max(1, headingLevel)));
        if (numId) {
          numberedParagraphCount++;
          const prefix = nextListMarker(numId, ilvl).trim();
          blocks.push(`${hashes} ${prefix} ${rawText}`);
        } else {
          blocks.push(`${hashes} ${rawText}`);
        }
        if (!firstHeadingText) {
          firstHeadingText = rawText
            .replace(/\{\+([\s\S]*?)\+\}/g, '$1')
            .replace(/\{~[\s\S]*?~\}/g, '')
            .replace(/\[Comment #\d+\]/g, '')
            .trim();
        }
      } else if (numId) {
        numberedParagraphCount++;
        const marker = nextListMarker(numId, ilvl);
        blocks.push(`${marker}${rawText}`);
      } else {
        blocks.push(rawText);
      }
    }
  }

  // Assemble comments list with anchor text
  const comments: DocxComment[] = [];
  for (const [id, commentObj] of commentsMap.entries()) {
    const anchorText = completedCommentAnchors.get(id);
    comments.push({
      ...commentObj,
      ...(anchorText ? { anchorText } : {}),
    });
  }

  // Append Footnotes and Endnotes section if any exist
  const footnoteLines: string[] = [];
  for (const [id, noteText] of footnotesMap.entries()) {
    footnoteLines.push(`[^${id}]: ${noteText}`);
  }
  for (const [id, noteText] of endnotesMap.entries()) {
    footnoteLines.push(`[^endnote-${id}]: ${noteText}`);
  }

  const footnoteCount = footnoteLines.length;
  if (footnoteLines.length > 0) {
    blocks.push(`### Footnotes\n\n${footnoteLines.join('\n')}`);
  }

  // Append Tracked Changes Audit section if any exist
  if (trackedChanges.length > 0) {
    const changeLines = trackedChanges.map((tc) => {
      const dateSuffix = tc.date ? ` (${tc.date.slice(0, 10)})` : '';
      const label = tc.type === 'insertion' ? 'Inserted' : 'Deleted';
      return `- **[${label} by ${tc.author}${dateSuffix}]**: "${tc.text}"`;
    });
    blocks.push(`### Tracked Changes\n\n${changeLines.join('\n')}`);
  }

  // Append Comments section if any exist
  if (comments.length > 0) {
    const commentLines = comments.map((c) => {
      const dateSuffix = c.date ? ` (${c.date.slice(0, 10)})` : '';
      const anchorPrefix = c.anchorText ? ` on *"${c.anchorText}"*` : '';
      return `- **[Comment #${c.id} — ${c.author}${dateSuffix}]**${anchorPrefix}: ${c.text}`;
    });
    blocks.push(`### Margin Comments\n\n${commentLines.join('\n')}`);
  }

  const content = blocks.join('\n\n').trim();
  const baseName = path
    .basename(originalFileName, path.extname(originalFileName))
    .replace(/[_-]+/g, ' ')
    .trim();

  const suggestedTitle =
    firstHeadingText && firstHeadingText.length <= 90
      ? firstHeadingText
      : baseName || 'Imported Word Document';

  const pageCount = Math.max(1, Math.ceil(content.length / 1800));
  const summarySource = blocks
    .find((b) => !b.startsWith('#') && !b.startsWith('|'))
    ?.replace(/\s+/g, ' ')
    .trim();
  const redlineBadges: string[] = [];
  if (trackedChanges.length > 0) {
    redlineBadges.push(
      `${trackedChanges.length} tracked change${trackedChanges.length === 1 ? '' : 's'}`
    );
  }
  if (comments.length > 0) {
    redlineBadges.push(
      `${comments.length} comment${comments.length === 1 ? '' : 's'}`
    );
  }
  const rawSummary = summarySource || content.replace(/\s+/g, ' ');
  const summary =
    redlineBadges.length > 0
      ? `[${redlineBadges.join(', ')}] ${rawSummary.slice(0, 130)}`
      : rawSummary.slice(0, 160);

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle,
    content,
    pageCount,
    summary,
    trackedChanges,
    comments,
    stats: {
      headingCount,
      numberedParagraphCount,
      tableCount,
      footnoteCount,
      trackedChangeCount: trackedChanges.length,
      commentCount: comments.length,
    },
  };
}

export const SUPPORTED_IMPORT_EXTENSIONS = [
  'docx',
  'pdf',
  'txt',
  'md',
  'rtf',
  'csv',
  'xlsx',
] as const;

export function parseCsvBuffer(
  buffer: Buffer,
  originalFileName = 'Table.csv'
): ParsedDocxResult {
  let raw = buffer.toString('utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  raw = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < raw.length && raw[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }
  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  const baseName =
    path
      .basename(originalFileName, path.extname(originalFileName))
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported CSV Table';

  const MAX_CSV_ROWS = 500;
  const totalDataRows = Math.max(0, rows.length - 1);
  const displayRows = rows.slice(0, MAX_CSV_ROWS + 1);

  let mdTable = '';
  if (displayRows.length > 0) {
    const colCount = Math.max(...displayRows.map((r) => r.length));
    const normalized = displayRows.map((r) => {
      const padded = r.map((c) => c.replace(/\s+/g, ' ').replace(/\|/g, '\\|'));
      while (padded.length < colCount) padded.push('');
      return padded;
    });
    const headerLine = `| ${normalized[0].join(' | ')} |`;
    const dividerLine = `| ${normalized[0].map(() => '---').join(' | ')} |`;
    const bodyLines = normalized.slice(1).map((r) => `| ${r.join(' | ')} |`);
    mdTable = [headerLine, dividerLine, ...bodyLines].join('\n');
    if (rows.length > MAX_CSV_ROWS + 1) {
      mdTable += `\n\n*(Showing first ${MAX_CSV_ROWS} of ${totalDataRows} rows)*`;
    }
  }

  const content = `# ${baseName}\n\n${mdTable}`.trim();
  const headersPreview =
    rows[0]?.filter(Boolean).slice(0, 6).join(', ') || 'Tabular data';
  const summary = `CSV table (${totalDataRows} row${totalDataRows === 1 ? '' : 's'}, columns: ${headersPreview})`.slice(
    0,
    160
  );

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle: baseName,
    content,
    pageCount: Math.max(1, Math.ceil(content.length / 1800)),
    summary,
    trackedChanges: [],
    comments: [],
    stats: {
      headingCount: 1,
      numberedParagraphCount: totalDataRows,
      tableCount: rows.length > 0 ? 1 : 0,
      footnoteCount: 0,
      trackedChangeCount: 0,
      commentCount: 0,
    },
  };
}

function colRefToIndex(colLetters: string): number {
  let idx = 0;
  for (let i = 0; i < colLetters.length; i++) {
    idx = idx * 26 + (colLetters.toUpperCase().charCodeAt(i) - 64);
  }
  return Math.max(0, idx - 1);
}

function formatExcelSerialDate(serial: number): string {
  // Excel 1900 epoch (accounting for 1900 leap year bug)
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const dateInfo = new Date(utcValue);
  if (Number.isNaN(dateInfo.getTime())) return String(serial);
  return dateInfo.toISOString().slice(0, 10);
}

export function parseXlsxBuffer(
  buffer: Buffer,
  originalFileName = 'Workbook.xlsx'
): ParsedDocxResult {
  const entries = extractZipEntries(buffer);
  const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8');
  if (!workbookXml) {
    throw new Error(
      'Invalid .xlsx file: missing xl/workbook.xml inside archive.'
    );
  }

  // 1. Parse Shared Strings (xl/sharedStrings.xml)
  const sharedStrings: string[] = [];
  const sharedStringsXml = entries
    .get('xl/sharedStrings.xml')
    ?.toString('utf8');
  if (sharedStringsXml) {
    const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let siMatch: RegExpExecArray | null;
    while ((siMatch = siRegex.exec(sharedStringsXml)) !== null) {
      const tRegex = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
      let text = '';
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tRegex.exec(siMatch[1])) !== null) {
        text += decodeXmlEntities(tMatch[1]);
      }
      sharedStrings.push(text);
    }
  }

  // 2. Parse Styles (xl/styles.xml) to detect date number formats
  const dateStyleIndices = new Set<number>();
  const stylesXml = entries.get('xl/styles.xml')?.toString('utf8');
  if (stylesXml) {
    const customDateNumFmts = new Set<number>();
    const numFmtRegex = /<numFmt\b([^>]*)\/?>/g;
    let nfMatch: RegExpExecArray | null;
    while ((nfMatch = numFmtRegex.exec(stylesXml)) !== null) {
      const idStr = getAttr(nfMatch[1], 'numFmtId');
      const code = getAttr(nfMatch[1], 'formatCode') || '';
      if (
        idStr &&
        /[ymd]/i.test(code) &&
        !/[0#]/.test(code.replace(/\[[^\]]*\]/g, ''))
      ) {
        customDateNumFmts.add(parseInt(idStr, 10));
      }
    }

    const cellXfsMatch = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(
      stylesXml
    );
    if (cellXfsMatch) {
      const xfRegex = /<xf\b([^>]*)\/?>/g;
      let xfMatch: RegExpExecArray | null;
      let xfIdx = 0;
      while ((xfMatch = xfRegex.exec(cellXfsMatch[1])) !== null) {
        const numFmtIdStr = getAttr(xfMatch[1], 'numFmtId');
        if (numFmtIdStr) {
          const nfId = parseInt(numFmtIdStr, 10);
          if (
            (nfId >= 14 && nfId <= 22) ||
            (nfId >= 45 && nfId <= 47) ||
            customDateNumFmts.has(nfId)
          ) {
            dateStyleIndices.add(xfIdx);
          }
        }
        xfIdx++;
      }
    }
  }

  // 3. Map workbook relationships (xl/_rels/workbook.xml.rels)
  const relTargetById = new Map<string, string>();
  const relsXml = entries
    .get('xl/_rels/workbook.xml.rels')
    ?.toString('utf8');
  if (relsXml) {
    const relRegex = /<Relationship\b([^>]*)\/?>/g;
    let relMatch: RegExpExecArray | null;
    while ((relMatch = relRegex.exec(relsXml)) !== null) {
      const id = getAttr(relMatch[1], 'Id');
      const target = getAttr(relMatch[1], 'Target');
      if (id && target) {
        const cleanTarget = target.replace(/^\/+/, '');
        relTargetById.set(
          id,
          cleanTarget.startsWith('xl/') ? cleanTarget : `xl/${cleanTarget}`
        );
      }
    }
  }

  // 4. Discover sheets in xl/workbook.xml
  const sheets: Array<{ name: string; path: string }> = [];
  const sheetRegex = /<sheet\b([^>]*)\/?>/g;
  let sheetMatch: RegExpExecArray | null;
  let fallbackIdx = 1;
  while ((sheetMatch = sheetRegex.exec(workbookXml)) !== null) {
    const name =
      getAttr(sheetMatch[1], 'name') || `Sheet ${fallbackIdx}`;
    const rId =
      getAttr(sheetMatch[1], 'r:id') || getAttr(sheetMatch[1], 'id');
    const resolvedPath =
      (rId && relTargetById.get(rId)) ||
      `xl/worksheets/sheet${fallbackIdx}.xml`;
    sheets.push({ name, path: resolvedPath });
    fallbackIdx++;
  }

  if (sheets.length === 0) {
    for (const key of entries.keys()) {
      if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(key)) {
        sheets.push({ name: `Sheet ${sheets.length + 1}`, path: key });
      }
    }
  }

  const baseName =
    path
      .basename(originalFileName, path.extname(originalFileName))
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported Spreadsheet';

  const blocks: string[] = [`# ${baseName}`];
  let tableCount = 0;
  let totalRowsAcrossSheets = 0;

  for (const sheet of sheets) {
    const sheetXml = entries.get(sheet.path)?.toString('utf8');
    if (!sheetXml) continue;

    const rows: string[][] = [];
    const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let rMatch: RegExpExecArray | null;

    while ((rMatch = rowRegex.exec(sheetXml)) !== null) {
      const rowCells: string[] = [];
      const cellRegex = /<c\b([^>]*)(?:>([\s\S]*?)<\/c>|\/>)/g;
      let cMatch: RegExpExecArray | null;

      while ((cMatch = cellRegex.exec(rMatch[1])) !== null) {
        const cAttrs = cMatch[1];
        const cInner = cMatch[2] || '';
        const ref = getAttr(cAttrs, 'r') || '';
        const colLettersMatch = /^([A-Za-z]+)/.exec(ref);
        const colIdx = colLettersMatch
          ? colRefToIndex(colLettersMatch[1])
          : rowCells.length;

        const cellType = getAttr(cAttrs, 't') || '';
        const styleIdxStr = getAttr(cAttrs, 's');
        const styleIdx = styleIdxStr ? parseInt(styleIdxStr, 10) : -1;

        let cellValue = '';
        if (cellType === 'inlineStr') {
          const tRegex = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
          let tMatch: RegExpExecArray | null;
          while ((tMatch = tRegex.exec(cInner)) !== null) {
            cellValue += decodeXmlEntities(tMatch[1]);
          }
        } else {
          const vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(cInner);
          const rawVal = vMatch ? decodeXmlEntities(vMatch[1]).trim() : '';
          if (cellType === 's') {
            const sIdx = parseInt(rawVal, 10);
            cellValue =
              !Number.isNaN(sIdx) && sharedStrings[sIdx] !== undefined
                ? sharedStrings[sIdx]
                : rawVal;
          } else if (cellType === 'b') {
            cellValue = rawVal === '1' ? 'TRUE' : 'FALSE';
          } else if (
            cellType === '' &&
            styleIdx >= 0 &&
            dateStyleIndices.has(styleIdx) &&
            /^\d+(\.\d+)?$/.test(rawVal)
          ) {
            const num = parseFloat(rawVal);
            cellValue =
              num > 1000 && num < 100000
                ? formatExcelSerialDate(num)
                : rawVal;
          } else {
            cellValue = rawVal;
          }
        }

        while (rowCells.length <= colIdx) {
          rowCells.push('');
        }
        rowCells[colIdx] = cellValue
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\|/g, '\\|');
      }

      if (rowCells.some((c) => c.length > 0)) {
        rows.push(rowCells);
      }
    }

    if (rows.length > 0) {
      tableCount++;
      totalRowsAcrossSheets += Math.max(0, rows.length - 1);
      const colCount = Math.max(...rows.map((r) => r.length));
      const normalized = rows.slice(0, 501).map((r) => {
        const padded = [...r];
        while (padded.length < colCount) padded.push('');
        return padded;
      });
      const headerLine = `| ${normalized[0].join(' | ')} |`;
      const dividerLine = `| ${normalized[0].map(() => '---').join(' | ')} |`;
      const bodyLines = normalized.slice(1).map((r) => `| ${r.join(' | ')} |`);
      blocks.push(`## Sheet: ${sheet.name}\n\n${[headerLine, dividerLine, ...bodyLines].join('\n')}`);
    }
  }

  const content = blocks.join('\n\n').trim();
  const sheetNames = sheets.map((s) => s.name).join(', ');
  const summary = `Excel workbook (${tableCount} sheet${tableCount === 1 ? '' : 's'}: ${sheetNames}; ${totalRowsAcrossSheets} data rows)`.slice(
    0,
    160
  );

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle: baseName,
    content,
    pageCount: Math.max(1, Math.ceil(content.length / 1800)),
    summary,
    trackedChanges: [],
    comments: [],
    stats: {
      headingCount: blocks.length,
      numberedParagraphCount: totalRowsAcrossSheets,
      tableCount,
      footnoteCount: 0,
      trackedChangeCount: 0,
      commentCount: 0,
    },
  };
}

export function parseRtfBuffer(
  buffer: Buffer,
  originalFileName = 'Document.rtf'
): ParsedDocxResult {
  const raw = buffer.toString('latin1');
  const skipDestinations = new Set([
    'fonttbl',
    'colortbl',
    'stylesheet',
    'info',
    'pict',
    'object',
    'header',
    'footer',
    'headerl',
    'headerr',
    'footerl',
    'footerr',
    'footnote',
    'xmlnstbl',
    'rsidtbl',
    'generator',
    'mmathPr',
    'fldinst',
  ]);

  interface RtfGroupState {
    skip: boolean;
    ucSkip: number;
  }

  const stack: RtfGroupState[] = [{ skip: false, ucSkip: 1 }];
  let out = '';
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];
    const current = stack[stack.length - 1] || { skip: false, ucSkip: 1 };

    if (ch === '{') {
      stack.push({ ...current });
      i++;
      if (raw[i] === '\\' && raw[i + 1] === '*') {
        stack[stack.length - 1].skip = true;
        i += 2;
      }
      continue;
    }

    if (ch === '}') {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    if (ch === '\\') {
      i++;
      if (i >= raw.length) break;
      const next = raw[i];

      if (next === '\\' || next === '{' || next === '}') {
        if (!current.skip) out += next;
        i++;
        continue;
      }
      if (next === '~') {
        if (!current.skip) out += ' ';
        i++;
        continue;
      }
      if (next === '-') {
        i++;
        continue;
      }
      if (next === '_') {
        if (!current.skip) out += '-';
        i++;
        continue;
      }
      if (next === '\n' || next === '\r') {
        if (!current.skip) out += '\n';
        i++;
        continue;
      }
      if (next === "'") {
        const hex = raw.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          if (!current.skip) {
            out += String.fromCharCode(parseInt(hex, 16));
          }
          i += 3;
          continue;
        }
      }

      // Parse control word and optional numeric parameter
      const cwMatch = /^([a-zA-Z]+)(-?\d+)?(?:\s)?/.exec(raw.slice(i));
      if (cwMatch) {
        const word = cwMatch[1];
        const paramStr = cwMatch[2];
        i += cwMatch[0].length;

        if (skipDestinations.has(word)) {
          current.skip = true;
          continue;
        }

        if (word === 'uc' && paramStr !== undefined) {
          current.ucSkip = Math.max(0, parseInt(paramStr, 10));
          continue;
        }

        if (word === 'u' && paramStr !== undefined) {
          let codePoint = parseInt(paramStr, 10);
          if (codePoint < 0) codePoint += 65536;
          if (!current.skip) {
            out += String.fromCodePoint(codePoint);
          }
          // Skip fallback ANSI characters
          let skipCount = current.ucSkip;
          while (skipCount > 0 && i < raw.length) {
            if (raw[i] === '\\' && raw[i + 1] === "'") {
              i += 4;
            } else {
              i++;
            }
            skipCount--;
          }
          continue;
        }

        if (!current.skip) {
          if (word === 'par' || word === 'sect' || word === 'line' || word === 'row') {
            out += '\n';
          } else if (word === 'tab' || word === 'cell') {
            out += '\t';
          } else if (word === 'emdash') {
            out += '—';
          } else if (word === 'endash') {
            out += '–';
          } else if (word === 'lquote') {
            out += '‘';
          } else if (word === 'rquote') {
            out += '’';
          } else if (word === 'ldblquote') {
            out += '“';
          } else if (word === 'rdblquote') {
            out += '”';
          } else if (word === 'bullet') {
            out += '• ';
          }
        }
        continue;
      }
      i++;
      continue;
    }

    if (ch !== '\r' && ch !== '\n') {
      if (!current.skip) out += ch;
    }
    i++;
  }

  const paragraphs = out
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  const content = paragraphs.join('\n\n').trim();
  const baseName =
    path
      .basename(originalFileName, path.extname(originalFileName))
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported RTF Document';

  const firstLine = paragraphs[0] || '';
  const suggestedTitle =
    firstLine.length >= 4 && firstLine.length <= 90 ? firstLine : baseName;

  const summary = (paragraphs.slice(0, 2).join(' ') || content).slice(0, 160);

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle,
    content,
    pageCount: Math.max(1, Math.ceil(content.length / 1800)),
    summary,
    trackedChanges: [],
    comments: [],
    stats: {
      headingCount: 0,
      numberedParagraphCount: paragraphs.filter((p) => /^\d+\./.test(p)).length,
      tableCount: 0,
      footnoteCount: 0,
      trackedChangeCount: 0,
      commentCount: 0,
    },
  };
}

function decodePdfLiteralString(literal: string): string {
  let out = '';
  let i = 0;
  while (i < literal.length) {
    const ch = literal[i];
    if (ch === '\\') {
      i++;
      if (i >= literal.length) break;
      const esc = literal[i];
      if (esc === 'n') {
        out += '\n';
        i++;
      } else if (esc === 'r') {
        out += '\r';
        i++;
      } else if (esc === 't') {
        out += '\t';
        i++;
      } else if (esc === 'b') {
        out += '\b';
        i++;
      } else if (esc === 'f') {
        out += '\f';
        i++;
      } else if (esc === '(' || esc === ')' || esc === '\\') {
        out += esc;
        i++;
      } else if (esc === '\r' || esc === '\n') {
        if (esc === '\r' && literal[i + 1] === '\n') i++;
        i++;
      } else if (/[0-7]/.test(esc)) {
        const oct = literal.slice(i, i + 3).match(/^[0-7]{1,3}/)?.[0] || esc;
        out += String.fromCharCode(parseInt(oct, 8));
        i += oct.length;
      } else {
        out += esc;
        i++;
      }
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function extractTextFromPdfContentStream(
  streamText: string,
  cMap: Map<string, string>
): string {
  const decodeHexToken = (hexRaw: string): string => {
    const clean = hexRaw.replace(/\s+/g, '').toUpperCase();
    if (!clean) return '';
    if (cMap.size > 0) {
      let decoded = '';
      let ptr = 0;
      while (ptr < clean.length) {
        const four = clean.slice(ptr, ptr + 4);
        const two = clean.slice(ptr, ptr + 2);
        if (four.length === 4 && cMap.has(four)) {
          decoded += cMap.get(four)!;
          ptr += 4;
        } else if (two.length === 2 && cMap.has(two)) {
          decoded += cMap.get(two)!;
          ptr += 2;
        } else if (two.length === 2) {
          const code = parseInt(two, 16);
          if (code >= 32 && code <= 126) decoded += String.fromCharCode(code);
          ptr += 2;
        } else {
          break;
        }
      }
      if (decoded) return decoded;
    }
    // Check UTF-16BE BOM
    if (clean.startsWith('FEFF')) {
      let u16 = '';
      for (let i = 4; i + 3 < clean.length; i += 4) {
        u16 += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
      }
      return u16;
    }
    let ascii = '';
    for (let i = 0; i + 1 < clean.length; i += 2) {
      const code = parseInt(clean.slice(i, i + 2), 16);
      if (code >= 32 && code <= 255) ascii += String.fromCharCode(code);
    }
    return ascii;
  };

  const lines: string[] = [];
  const btEtRegex = /\bBT\b([\s\S]*?)\bET\b/g;
  let btMatch: RegExpExecArray | null;

  const processBlock = (block: string) => {
    let currentLine = '';
    const opRegex =
      /\[([\s\S]*?)\]\s*TJ|\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*Tj|\b(?:T\*|TD|Td|newline)\b/g;
    let opMatch: RegExpExecArray | null;

    while ((opMatch = opRegex.exec(block)) !== null) {
      const token = opMatch[0];
      if (opMatch[1] !== undefined) {
        // TJ array
        const arrInner = opMatch[1];
        const elemRegex = /\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>|(-?\d+(?:\.\d+)?)/g;
        let elemMatch: RegExpExecArray | null;
        while ((elemMatch = elemRegex.exec(arrInner)) !== null) {
          const el = elemMatch[0];
          if (el.startsWith('(')) {
            currentLine += decodePdfLiteralString(el.slice(1, -1));
          } else if (elemMatch[1] !== undefined) {
            currentLine += decodeHexToken(elemMatch[1]);
          } else if (elemMatch[2] !== undefined) {
            const kerning = parseFloat(elemMatch[2]);
            if (kerning < -180 && !currentLine.endsWith(' ')) {
              currentLine += ' ';
            }
          }
        }
      } else if (opMatch[2] !== undefined) {
        currentLine += decodeHexToken(opMatch[2]);
      } else if (token.startsWith('(')) {
        const endParen = token.lastIndexOf(')');
        const lit = token.slice(1, endParen);
        if (token.endsWith("'") || token.endsWith('"')) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = decodePdfLiteralString(lit);
        } else {
          currentLine += decodePdfLiteralString(lit);
        }
      } else if (/\b(?:T\*|TD|Td)\b/.test(token)) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
  };

  let foundBt = false;
  while ((btMatch = btEtRegex.exec(streamText)) !== null) {
    foundBt = true;
    processBlock(btMatch[1]);
  }
  if (!foundBt) {
    processBlock(streamText);
  }

  return lines.join('\n');
}

export function parsePdfBuffer(
  buffer: Buffer,
  originalFileName = 'Document.pdf'
): ParsedDocxResult {
  const header = buffer.subarray(0, 1024).toString('latin1');
  if (!header.includes('%PDF-')) {
    throw new Error('Invalid .pdf file: missing %PDF- header signature.');
  }

  const rawLatin = buffer.toString('latin1');

  // Count pages via /Type /Page (excluding /Type /Pages)
  const pageMatches = rawLatin.match(/\/Type\s*\/Page\b(?!s)/g);
  const detectedPageCount = pageMatches ? pageMatches.length : 0;

  // Decompress all PDF streams first so we can extract ToUnicode CMaps and page text
  const decodedStreams: string[] = [];
  const streamRegex = /<<([\s\S]*?)>>\s*stream\r?\n/g;
  let sMatch: RegExpExecArray | null;

  while ((sMatch = streamRegex.exec(rawLatin)) !== null) {
    const dict = sMatch[1];
    // Skip binary images or font binaries
    if (/\/Subtype\s*\/Image\b/.test(dict) || /\/Length1\b/.test(dict)) {
      continue;
    }
    const startOffset = sMatch.index + sMatch[0].length;
    const endIdx = rawLatin.indexOf('endstream', startOffset);
    if (endIdx === -1) continue;

    let streamEnd = endIdx;
    if (rawLatin[streamEnd - 1] === '\n') streamEnd--;
    if (rawLatin[streamEnd - 1] === '\r') streamEnd--;

    const slice = buffer.subarray(startOffset, streamEnd);
    const isFlate = /\/FlateDecode\b/.test(dict);

    if (isFlate) {
      try {
        const inflated = zlib.inflateSync(slice);
        decodedStreams.push(inflated.toString('latin1'));
      } catch {
        try {
          const inflatedRaw = zlib.inflateRawSync(slice);
          decodedStreams.push(inflatedRaw.toString('latin1'));
        } catch {
          // Ignore undecodable binary stream
        }
      }
    } else if (!/\/Filter\b/.test(dict)) {
      decodedStreams.push(slice.toString('latin1'));
    }
  }

  // Build ToUnicode CMap from any CMap streams
  const cMap = new Map<string, string>();
  const parseHexTarget = (hex: string): string => {
    const clean = hex.replace(/\s+/g, '');
    let res = '';
    for (let i = 0; i < clean.length; i += 4) {
      const chunk = clean.slice(i, i + 4);
      if (chunk.length === 4) {
        res += String.fromCodePoint(parseInt(chunk, 16));
      } else if (chunk.length === 2) {
        res += String.fromCharCode(parseInt(chunk, 16));
      }
    }
    return res;
  };

  for (const st of decodedStreams) {
    if (!st.includes('beginbfchar') && !st.includes('beginbfrange')) continue;

    const bfCharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
    let charBlock: RegExpExecArray | null;
    while ((charBlock = bfCharRegex.exec(st)) !== null) {
      const pairRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let pair: RegExpExecArray | null;
      while ((pair = pairRegex.exec(charBlock[1])) !== null) {
        cMap.set(pair[1].toUpperCase(), parseHexTarget(pair[2]));
      }
    }

    const bfRangeRegex = /beginbfrange([\s\S]*?)endbfrange/g;
    let rangeBlock: RegExpExecArray | null;
    while ((rangeBlock = bfRangeRegex.exec(st)) !== null) {
      const rangeRegex = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let rPair: RegExpExecArray | null;
      while ((rPair = rangeRegex.exec(rangeBlock[1])) !== null) {
        const startCode = parseInt(rPair[1], 16);
        const endCode = parseInt(rPair[2], 16);
        const targetStart = parseInt(rPair[3], 16);
        const keyLen = rPair[1].length;
        for (
          let code = startCode;
          code <= endCode && code - startCode <= 512;
          code++
        ) {
          const key = code.toString(16).toUpperCase().padStart(keyLen, '0');
          cMap.set(
            key,
            String.fromCodePoint(targetStart + (code - startCode))
          );
        }
      }
    }
  }

  // Extract text from content streams
  const extractedChunks: string[] = [];
  for (const st of decodedStreams) {
    if (st.includes('beginbfchar') || st.includes('beginbfrange')) continue;
    const text = extractTextFromPdfContentStream(st, cMap).trim();
    if (text) {
      extractedChunks.push(text);
    }
  }

  const baseName =
    path
      .basename(originalFileName, path.extname(originalFileName))
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported PDF Document';

  const rawBody = extractedChunks.join('\n\n').trim();
  const content =
    rawBody.length > 0
      ? rawBody
      : `# ${baseName}\n\n[Note: This PDF appears to be a scanned image without an embedded text layer.]`;

  const lines = rawBody
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const firstLine = lines[0] || '';
  const suggestedTitle =
    firstLine.length >= 4 && firstLine.length <= 90 ? firstLine : baseName;

  const pageCount =
    detectedPageCount > 0
      ? detectedPageCount
      : Math.max(1, Math.ceil(content.length / 1800));
  const summary =
    rawBody.length > 0
      ? rawBody.replace(/\s+/g, ' ').slice(0, 160)
      : `Scanned PDF document (${pageCount} page${pageCount === 1 ? '' : 's'}).`;

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle,
    content,
    pageCount,
    summary,
    trackedChanges: [],
    comments: [],
    stats: {
      headingCount: lines.filter((l) => l === l.toUpperCase() && l.length > 4 && l.length < 80).length,
      numberedParagraphCount: lines.filter((l) => /^\d+\./.test(l)).length,
      tableCount: 0,
      footnoteCount: 0,
      trackedChangeCount: 0,
      commentCount: 0,
    },
  };
}

export function parseTxtBuffer(
  buffer: Buffer,
  originalFileName = 'Document.txt'
): ParsedDocxResult {
  let raw = buffer.toString('utf8');
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  const content = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const baseName =
    path
      .basename(originalFileName, path.extname(originalFileName))
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported Text Document';

  const lines = content
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const firstHeading = lines
    .find((l) => l.startsWith('#'))
    ?.replace(/^#+\s*/, '')
    .trim();
  const suggestedTitle =
    firstHeading && firstHeading.length <= 90 ? firstHeading : baseName;

  const pageCount = Math.max(1, Math.ceil(content.length / 1800));
  const summarySource =
    lines.find((l) => !l.startsWith('#')) || content.replace(/\s+/g, ' ');
  const summary = summarySource.replace(/\s+/g, ' ').slice(0, 160);

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle,
    content,
    pageCount,
    summary,
    trackedChanges: [],
    comments: [],
    stats: {
      headingCount: lines.filter((l) => l.startsWith('#')).length,
      numberedParagraphCount: lines.filter((l) => /^\d+\./.test(l)).length,
      tableCount: 0,
      footnoteCount: 0,
      trackedChangeCount: 0,
      commentCount: 0,
    },
  };
}

/**
 * Unified multi-format legal document & exhibit parser.
 * Supports Word (.docx), PDF (.pdf), Excel (.xlsx), CSV (.csv), Rich Text (.rtf), and Text/Markdown (.txt, .md).
 */
export function parseDocumentBuffer(
  buffer: Buffer,
  originalFileName = 'Document.docx'
): ParsedDocxResult {
  const ext = path.extname(originalFileName).toLowerCase().replace(/^\./, '');
  switch (ext) {
    case 'docx':
      return parseDocxBuffer(buffer, originalFileName);
    case 'pdf':
      return parsePdfBuffer(buffer, originalFileName);
    case 'xlsx':
      return parseXlsxBuffer(buffer, originalFileName);
    case 'csv':
      return parseCsvBuffer(buffer, originalFileName);
    case 'rtf':
      return parseRtfBuffer(buffer, originalFileName);
    case 'txt':
    case 'md':
      return parseTxtBuffer(buffer, originalFileName);
    default:
      throw new Error(
        `Unsupported file format ".${ext || 'unknown'}". Supported formats: .docx, .pdf, .txt, .md, .rtf, .csv, .xlsx`
      );
  }
}

// ============================================================================
// Native Word (.docx) Exporter with Tracked Changes (<w:ins>/<w:del>) & Comments
// ============================================================================

interface WordTokenDiffOp {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

/**
 * Computes word-level diff operations between two strings so we can emit
 * granular `<w:ins>` and `<w:del>` runs inside a modified paragraph.
 */
function computeWordDiff(oldText: string, newText: string): WordTokenDiffOp[] {
  const tokenize = (s: string): string[] =>
    s.match(/\S+\s*|\s+/g) || (s ? [s] : []);

  const a = tokenize(oldText);
  const b = tokenize(newText);

  // Guard against overly huge token arrays by falling back to full replacement
  if (a.length * b.length > 250000) {
    const ops: WordTokenDiffOp[] = [];
    if (oldText) ops.push({ type: 'delete', text: oldText });
    if (newText) ops.push({ type: 'insert', text: newText });
    return ops;
  }

  const m = a.length;
  const n = b.length;
  const dp: Uint16Array[] = Array.from(
    { length: m + 1 },
    () => new Uint16Array(n + 1)
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const rawOps: WordTokenDiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rawOps.push({ type: 'equal', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rawOps.push({ type: 'delete', text: a[i] });
      i++;
    } else {
      rawOps.push({ type: 'insert', text: b[j] });
      j++;
    }
  }
  while (i < m) {
    rawOps.push({ type: 'delete', text: a[i++] });
  }
  while (j < n) {
    rawOps.push({ type: 'insert', text: b[j++] });
  }

  // Coalesce adjacent operations of the same type
  const merged: WordTokenDiffOp[] = [];
  for (const op of rawOps) {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === op.type) {
      prev.text += op.text;
    } else {
      merged.push({ ...op });
    }
  }

  return merged;
}

interface ParagraphDiffBlock {
  mode: 'unchanged' | 'added' | 'removed' | 'modified';
  text: string;
  oldText?: string;
}

function stripTrailingAuditSections(markdown: string): string {
  return markdown
    .replace(/\n### Tracked Changes\n[\s\S]*?(?=\n### |\s*$)/g, '')
    .replace(/\n### Margin Comments\n[\s\S]*?(?=\n### |\s*$)/g, '')
    .trim();
}

function splitIntoLogicalBlocks(markdown: string): string[] {
  const cleaned = stripTrailingAuditSections(markdown || '');
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/);
  const blocks: string[] = [];
  let currentTable: string[] = [];
  let currentPara: string[] = [];

  const flushPara = () => {
    if (currentPara.length > 0) {
      blocks.push(currentPara.join('\n').trim());
      currentPara = [];
    }
  };

  const flushTable = () => {
    if (currentTable.length > 0) {
      blocks.push(currentTable.join('\n').trim());
      currentTable = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushPara();
      currentTable.push(trimmed);
    } else if (!trimmed) {
      flushTable();
      flushPara();
    } else {
      flushTable();
      if (/^#{1,6}\s+/.test(trimmed) || /^(\d+\.|\([a-z0-9]+\)|-)\s+/i.test(trimmed)) {
        flushPara();
        blocks.push(trimmed);
      } else {
        currentPara.push(trimmed);
      }
    }
  }

  flushTable();
  flushPara();
  return blocks.filter(Boolean);
}

function computeBlockSequenceDiff(
  oldBlocks: string[],
  newBlocks: string[]
): ParagraphDiffBlock[] {
  const m = oldBlocks.length;
  const n = newBlocks.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldBlocks[i] === newBlocks[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const raw: Array<{ type: 'equal' | 'add' | 'remove'; text: string }> = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldBlocks[i] === newBlocks[j]) {
      raw.push({ type: 'equal', text: newBlocks[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ type: 'remove', text: oldBlocks[i] });
      i++;
    } else {
      raw.push({ type: 'add', text: newBlocks[j] });
      j++;
    }
  }
  while (i < m) {
    raw.push({ type: 'remove', text: oldBlocks[i++] });
  }
  while (j < n) {
    raw.push({ type: 'add', text: newBlocks[j++] });
  }

  // Pair adjacent remove + add blocks into word-level 'modified' blocks when appropriate
  const result: ParagraphDiffBlock[] = [];
  let idx = 0;
  while (idx < raw.length) {
    const curr = raw[idx];
    const next = raw[idx + 1];
    if (
      curr.type === 'remove' &&
      next &&
      next.type === 'add' &&
      !curr.text.startsWith('|') &&
      !next.text.startsWith('|')
    ) {
      result.push({
        mode: 'modified',
        oldText: curr.text,
        text: next.text,
      });
      idx += 2;
    } else if (curr.type === 'equal') {
      result.push({ mode: 'unchanged', text: curr.text });
      idx++;
    } else if (curr.type === 'add') {
      result.push({ mode: 'added', text: curr.text });
      idx++;
    } else {
      result.push({ mode: 'removed', text: curr.text });
      idx++;
    }
  }

  return result;
}

/**
 * Generates a valid Microsoft Word (.docx) binary buffer from Markdown/legal text,
 * including native Word Tracked Changes (`<w:ins>` and `<w:del>`) when `previousContent`
 * or inline `{+insert+}` / `{~delete~}` syntax is provided, and native Word Margin Comments
 * (`word/comments.xml`) for rationale summaries and critic objections.
 */
export function exportDocxBuffer(payload: ExportDocxPayload): Buffer {
  const author = payload.author || 'LexHarness Peer Review';
  const nowIso = new Date().toISOString();
  let revisionIdCounter = 1;

  // Normalize comment items
  const commentsToEmbed: Array<{
    id: string;
    author: string;
    date: string;
    text: string;
    anchorText?: string;
  }> = [];

  if (payload.rationaleSummary && payload.rationaleSummary.trim()) {
    commentsToEmbed.push({
      id: '1',
      author,
      date: nowIso,
      text: payload.rationaleSummary.trim(),
    });
  }

  if (payload.comments && payload.comments.length > 0) {
    for (const c of payload.comments) {
      if (!c.text.trim()) continue;
      commentsToEmbed.push({
        id: String(commentsToEmbed.length + 1),
        author: c.author || author,
        date: c.date || nowIso,
        text: c.text.trim(),
        anchorText: c.anchorText,
      });
    }
  }

  const attachedCommentIds = new Set<string>();

  const buildRunXml = (text: string): string => {
    if (!text) return '';
    // Also support inline {+inserted+} and {~deleted~} markers inside text
    const inlineChangeRegex = /\{\+([\s\S]*?)\+\}|\{~([\s\S]*?)~\}/g;
    if (inlineChangeRegex.test(text)) {
      inlineChangeRegex.lastIndex = 0;
      let resultXml = '';
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = inlineChangeRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          const plain = text.slice(lastIndex, match.index);
          resultXml += `<w:r><w:t xml:space="preserve">${escapeXml(plain)}</w:t></w:r>`;
        }
        const revId = revisionIdCounter++;
        if (match[1] !== undefined) {
          resultXml += `<w:ins w:id="${revId}" w:author="${escapeXml(author)}" w:date="${nowIso}"><w:r><w:t xml:space="preserve">${escapeXml(match[1])}</w:t></w:r></w:ins>`;
        } else if (match[2] !== undefined) {
          resultXml += `<w:del w:id="${revId}" w:author="${escapeXml(author)}" w:date="${nowIso}"><w:r><w:delText xml:space="preserve">${escapeXml(match[2])}</w:delText></w:r></w:del>`;
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        const trailing = text.slice(lastIndex);
        resultXml += `<w:r><w:t xml:space="preserve">${escapeXml(trailing)}</w:t></w:r>`;
      }
      return resultXml;
    }

    return `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  };

  const parseParagraphHeadingAndPrefix = (
    rawLine: string
  ): { styleId?: string; cleanText: string } => {
    const headingMatch = /^(#{1,6})\s+([\s\S]+)$/.exec(rawLine);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length);
      return {
        styleId: `Heading${level}`,
        cleanText: headingMatch[2].trim(),
      };
    }
    return { cleanText: rawLine };
  };

  const buildTableXml = (tableMarkdown: string): string => {
    const lines = tableMarkdown
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|') && l.endsWith('|'));

    const dataRows = lines.filter(
      (l) => !/^\|\s*[-:]+(\s*\|\s*[-:]+)*\s*\|$/.test(l)
    );
    if (dataRows.length === 0) return '';

    const rowsXml = dataRows
      .map((rowLine) => {
        const cells = rowLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        const cellsXml = cells
          .map(
            (cellText) =>
              `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p>${buildRunXml(cellText)}</w:p></w:tc>`
          )
          .join('');
        return `<w:tr>${cellsXml}</w:tr>`;
      })
      .join('');

    return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/></w:tblBorders></w:tblPr>${rowsXml}</w:tbl>`;
  };

  const diffBlocks: ParagraphDiffBlock[] = payload.previousContent
    ? computeBlockSequenceDiff(
        splitIntoLogicalBlocks(payload.previousContent),
        splitIntoLogicalBlocks(payload.content)
      )
    : splitIntoLogicalBlocks(payload.content).map((text) => ({
        mode: 'unchanged',
        text,
      }));

  const bodyElementsXml: string[] = [];

  diffBlocks.forEach((block, blockIdx) => {
    if (block.text.startsWith('|') && block.text.endsWith('|')) {
      bodyElementsXml.push(buildTableXml(block.text));
      return;
    }

    const { styleId, cleanText } = parseParagraphHeadingAndPrefix(block.text);
    const pPr = styleId
      ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>`
      : '';

    // Check if any comment should anchor to this paragraph
    const matchingComments = commentsToEmbed.filter((c) => {
      if (attachedCommentIds.has(c.id)) return false;
      if (c.anchorText && cleanText.includes(c.anchorText)) return true;
      if (!c.anchorText && blockIdx === 0) return true;
      return false;
    });

    let commentStartTags = '';
    let commentEndTags = '';
    for (const mc of matchingComments) {
      attachedCommentIds.add(mc.id);
      commentStartTags += `<w:commentRangeStart w:id="${mc.id}"/>`;
      commentEndTags += `<w:commentRangeEnd w:id="${mc.id}"/><w:r><w:commentReference w:id="${mc.id}"/></w:r>`;
    }

    if (block.mode === 'added') {
      const revId = revisionIdCounter++;
      const innerRuns = `<w:ins w:id="${revId}" w:author="${escapeXml(author)}" w:date="${nowIso}"><w:r><w:t xml:space="preserve">${escapeXml(cleanText)}</w:t></w:r></w:ins>`;
      bodyElementsXml.push(
        `<w:p>${pPr}${commentStartTags}${innerRuns}${commentEndTags}</w:p>`
      );
    } else if (block.mode === 'removed') {
      const revId = revisionIdCounter++;
      const innerRuns = `<w:del w:id="${revId}" w:author="${escapeXml(author)}" w:date="${nowIso}"><w:r><w:delText xml:space="preserve">${escapeXml(cleanText)}</w:delText></w:r></w:del>`;
      bodyElementsXml.push(
        `<w:p>${pPr}${commentStartTags}${innerRuns}${commentEndTags}</w:p>`
      );
    } else if (block.mode === 'modified' && block.oldText !== undefined) {
      const oldParsed = parseParagraphHeadingAndPrefix(block.oldText);
      const wordOps = computeWordDiff(oldParsed.cleanText, cleanText);
      const runsXml = wordOps
        .map((op) => {
          if (op.type === 'equal') {
            return `<w:r><w:t xml:space="preserve">${escapeXml(op.text)}</w:t></w:r>`;
          }
          const revId = revisionIdCounter++;
          if (op.type === 'insert') {
            return `<w:ins w:id="${revId}" w:author="${escapeXml(author)}" w:date="${nowIso}"><w:r><w:t xml:space="preserve">${escapeXml(op.text)}</w:t></w:r></w:ins>`;
          }
          return `<w:del w:id="${revId}" w:author="${escapeXml(author)}" w:date="${nowIso}"><w:r><w:delText xml:space="preserve">${escapeXml(op.text)}</w:delText></w:r></w:del>`;
        })
        .join('');
      bodyElementsXml.push(
        `<w:p>${pPr}${commentStartTags}${runsXml}${commentEndTags}</w:p>`
      );
    } else {
      bodyElementsXml.push(
        `<w:p>${pPr}${commentStartTags}${buildRunXml(cleanText)}${commentEndTags}</w:p>`
      );
    }
  });

  // Attach any remaining unanchored comments to the first paragraph (or a dedicated paragraph)
  const unattached = commentsToEmbed.filter(
    (c) => !attachedCommentIds.has(c.id)
  );
  if (unattached.length > 0) {
    let startTags = '';
    let endTags = '';
    for (const c of unattached) {
      attachedCommentIds.add(c.id);
      startTags += `<w:commentRangeStart w:id="${c.id}"/>`;
      endTags += `<w:commentRangeEnd w:id="${c.id}"/><w:r><w:commentReference w:id="${c.id}"/></w:r>`;
    }
    if (bodyElementsXml.length > 0) {
      bodyElementsXml[0] = bodyElementsXml[0].replace(
        /<\/w:p>$/,
        `${startTags}${endTags}</w:p>`
      );
    } else {
      bodyElementsXml.push(
        `<w:p>${startTags}<w:r><w:t>${escapeXml(payload.title || 'Document')}</w:t></w:r>${endTags}</w:p>`
      );
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyElementsXml.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`;

  const hasComments = commentsToEmbed.length > 0;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${
    hasComments
      ? '\n  <Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>'
      : ''
  }
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${
    hasComments
      ? '\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>'
      : ''
  }
</Relationships>`;

  const files: Record<string, string> = {
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': rootRelsXml,
    'word/_rels/document.xml.rels': docRelsXml,
    'word/document.xml': documentXml,
    'word/styles.xml': stylesXml,
  };

  if (hasComments) {
    const commentNodes = commentsToEmbed
      .map(
        (c) =>
          `<w:comment w:id="${escapeXml(c.id)}" w:author="${escapeXml(c.author)}" w:date="${escapeXml(c.date)}"><w:p><w:r><w:t xml:space="preserve">${escapeXml(c.text)}</w:t></w:r></w:p></w:comment>`
      )
      .join('\n  ');
    files['word/comments.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  ${commentNodes}
</w:comments>`;
  }

  return buildZipArchive(files);
}
