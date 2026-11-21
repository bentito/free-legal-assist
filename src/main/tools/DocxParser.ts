import path from 'node:path';
import zlib from 'node:zlib';

export interface ParsedDocxResult {
  fileName: string;
  suggestedTitle: string;
  content: string;
  pageCount: number;
  summary: string;
  stats: {
    headingCount: number;
    numberedParagraphCount: number;
    tableCount: number;
    footnoteCount: number;
  };
}

interface NumberingLevelDef {
  numFmt: string;
  lvlText: string;
  start: number;
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
 * Creates a valid minimal .docx ZIP buffer from a map of file paths to string/Buffer contents.
 * Useful for testing and exporting.
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
    localHeader.writeUInt32LE(0, 14); // crc32 (0 is accepted by standard inflate readers)
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
    centralHeader.writeUInt32LE(0, 16); // crc32
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

  // Common built-in Word heading style IDs
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

    const headingMatch = /^heading\s*([1-6])$/i.exec(styleName) || /^heading\s*([1-6])$/i.exec(styleId);
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
      // Clone levels map so per-num overrides can be applied if present
      const cloned = new Map<number, NumberingLevelDef>();
      for (const [k, v] of abstractNums.get(absIdMatch[1])!.entries()) {
        cloned.set(k, { ...v });
      }
      numMap.set(numId, cloned);
    }
  }

  return numMap;
}

function extractInlineTextFromXml(
  xmlFragment: string,
  referencedFootnotes?: Set<string>,
  referencedEndnotes?: Set<string>
): string {
  // Strip deleted tracked changes (<w:del>...</w:del>) so deleted text doesn't pollute active text
  const withoutDeletions = xmlFragment.replace(
    /<w:del\b[^>]*>[\s\S]*?<\/w:del>/g,
    ''
  );

  const tokenRegex =
    /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:(?:br|cr)\b[^>]*\/?>|<w:footnoteReference\b([^>]*)\/?>|<w:endnoteReference\b([^>]*)\/?>|<w:noBreakHyphen\b[^>]*\/?>/g;

  let out = '';
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(withoutDeletions)) !== null) {
    const full = m[0];
    if (m[1] !== undefined) {
      out += decodeXmlEntities(m[1]);
    } else if (full.startsWith('<w:tab')) {
      out += '\t';
    } else if (full.startsWith('<w:br') || full.startsWith('<w:cr')) {
      out += '\n';
    } else if (full.startsWith('<w:noBreakHyphen')) {
      out += '-';
    } else if (full.startsWith('<w:footnoteReference')) {
      const id = getAttr(m[2] || '', 'w:id');
      if (id && id !== '0' && id !== '-1') {
        referencedFootnotes?.add(id);
        out += `[^${id}]`;
      }
    } else if (full.startsWith('<w:endnoteReference')) {
      const id = getAttr(m[3] || '', 'w:id');
      if (id && id !== '0' && id !== '-1') {
        referencedEndnotes?.add(id);
        out += `[^endnote-${id}]`;
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
  referencedFootnotes: Set<string>,
  referencedEndnotes: Set<string>
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
        const pText = extractInlineTextFromXml(
          pMatch[1],
          referencedFootnotes,
          referencedEndnotes
        )
          .replace(/\s+/g, ' ')
          .trim();
        if (pText) {
          cellParagraphs.push(pText);
        }
      }
      // Escape pipes inside markdown table cells
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

  const headingStyles = parseStylesXml(stylesXml);
  const numberingMap = parseNumberingXml(numberingXml);
  const footnotesMap = parseNotesXml(footnotesXml, 'footnote');
  const endnotesMap = parseNotesXml(endnotesXml, 'endnote');

  const referencedFootnotes = new Set<string>();
  const referencedEndnotes = new Set<string>();

  // Track active counters per numId and level: Map<numId, Map<ilvl, number>>
  const listCounters = new Map<string, Map<number, number>>();

  const nextListMarker = (numId: string, ilvl: number): string => {
    let counters = listCounters.get(numId);
    if (!counters) {
      counters = new Map<number, number>();
      listCounters.set(numId, counters);
    }

    // Reset deeper levels when an outer level increments
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

    // Replace %1, %2, ... in lvlText with formatted values for each level
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

  // Match top-level tables and paragraphs in document order
  const bodyMatch = /<w:body\b[^>]*>([\s\S]*?)<\/w:body>/.exec(documentXml);
  const bodyXml = bodyMatch ? bodyMatch[1] : documentXml;

  const blockRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>|<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(bodyXml)) !== null) {
    if (blockMatch[1] !== undefined) {
      // Table block
      const mdTable = formatTableBlock(
        blockMatch[1],
        referencedFootnotes,
        referencedEndnotes
      );
      if (mdTable) {
        tableCount++;
        blocks.push(mdTable);
      }
    } else if (blockMatch[2] !== undefined) {
      // Paragraph block
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

      // Check for numbering (<w:numPr>)
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

      const rawText = extractInlineTextFromXml(
        pXml,
        referencedFootnotes,
        referencedEndnotes
      ).trim();

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
          firstHeadingText = rawText;
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
  const summary = (summarySource || content.replace(/\s+/g, ' ')).slice(0, 160);

  return {
    fileName: path.basename(originalFileName),
    suggestedTitle,
    content,
    pageCount,
    summary,
    stats: {
      headingCount,
      numberedParagraphCount,
      tableCount,
      footnoteCount,
    },
  };
}
