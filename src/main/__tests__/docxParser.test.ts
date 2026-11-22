import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  buildZipArchive,
  exportDocxBuffer,
  parseDocumentBuffer,
  parseDocxBuffer,
} from '../tools/DocxParser';
import { LegalDatabase } from '../db/database';
import { LegalToolExecutor } from '../tools/LegalToolExecutor';

describe('DocxParser: Word (.docx) legal document extraction (Issue #2)', () => {
  const sampleStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="LegalSection">
    <w:name w:val="Legal Section Heading"/>
    <w:pPr>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
  </w:style>
</w:styles>`;

  const sampleNumberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="10">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="(%2)"/>
    </w:lvl>
    <w:lvl w:ilvl="2">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerRoman"/>
      <w:lvlText w:val="(%3)"/>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="20">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="10"/>
  </w:num>
  <w:num w:numId="2">
    <w:abstractNumId w:val="20"/>
  </w:num>
</w:numbering>`;

  const sampleFootnotesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnote w:type="separator" w:id="-1">
    <w:p><w:r><w:separator/></w:r></w:p>
  </w:footnote>
  <w:footnote w:type="continuationSeparator" w:id="0">
    <w:p><w:r><w:continuationSeparator/></w:r></w:p>
  </w:footnote>
  <w:footnote w:id="1">
    <w:p>
      <w:r><w:t>See State v. Sprague, 2003 VT 20, ¶ 16, 175 Vt. 123 (holding that exit orders require reasonable suspicion under Article 11).</w:t></w:r>
    </w:p>
  </w:footnote>
  <w:footnote w:id="2">
    <w:p>
      <w:r><w:t>Compare State v. Bauder, 2007 VT 16, ¶ 14, with federal automobile exception doctrine.</w:t></w:r>
    </w:p>
  </w:footnote>
</w:footnotes>`;

  const sampleDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>MOTION TO SUPPRESS EVIDENCE AND DISMISS</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>NOW COMES Defendant, by and through counsel, and moves to suppress all evidence seized during the roadside stop.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
      <w:r><w:t>I. STATEMENT OF FACTS</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>On October 14, 2026, Trooper Keller initiated a traffic stop on Interstate 89.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Without citing any specific safety concern, Trooper Keller ordered Defendant out of the vehicle</w:t></w:r>
      <w:r><w:footnoteReference w:id="1"/></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="1"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Defendant complied peacefully with the exit order.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="1"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>Trooper Keller then unlocked and searched the center console</w:t></w:r>
      <w:r><w:footnoteReference w:id="2"/></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:numPr>
          <w:ilvl w:val="2"/>
          <w:numId w:val="1"/>
        </w:numPr>
      </w:pPr>
      <w:r><w:t>No warrant was requested or obtained prior to the search.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="LegalSection"/></w:pPr>
      <w:r><w:t>Exhibit &amp; Timestamp Comparison Table</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Exhibit ID</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Timestamp</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Observation</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>STATE-BWC-01</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>22:14:08</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Driver hands steady; no furtive movement</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>DEF-004</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>22:16:45</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Console pried open without consent</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

  it('extracts headings, multi-level numbered paragraphs, tables, and footnotes from a .docx buffer', () => {
    const docxBuffer = buildZipArchive({
      'word/document.xml': sampleDocumentXml,
      'word/styles.xml': sampleStylesXml,
      'word/numbering.xml': sampleNumberingXml,
      'word/footnotes.xml': sampleFootnotesXml,
    });

    const parsed = parseDocxBuffer(docxBuffer, 'Defendant_Motion_to_Suppress.docx');

    expect(parsed.fileName).toBe('Defendant_Motion_to_Suppress.docx');
    expect(parsed.suggestedTitle).toBe('MOTION TO SUPPRESS EVIDENCE AND DISMISS');

    // Verify stats
    expect(parsed.stats.headingCount).toBe(3);
    expect(parsed.stats.numberedParagraphCount).toBe(5);
    expect(parsed.stats.tableCount).toBe(1);
    expect(parsed.stats.footnoteCount).toBe(2);

    // Verify headings (H1, H2, and custom outlineLvl=2 -> H3)
    expect(parsed.content).toContain('# MOTION TO SUPPRESS EVIDENCE AND DISMISS');
    expect(parsed.content).toContain('## I. STATEMENT OF FACTS');
    expect(parsed.content).toContain('### Exhibit & Timestamp Comparison Table');

    // Verify multi-level legal numbering: 1., 2., (a), (b), (i)
    expect(parsed.content).toContain(
      '1. On October 14, 2026, Trooper Keller initiated a traffic stop on Interstate 89.'
    );
    expect(parsed.content).toContain(
      '2. Without citing any specific safety concern, Trooper Keller ordered Defendant out of the vehicle[^1].'
    );
    expect(parsed.content).toContain(
      '  (a) Defendant complied peacefully with the exit order.'
    );
    expect(parsed.content).toContain(
      '  (b) Trooper Keller then unlocked and searched the center console[^2].'
    );
    expect(parsed.content).toContain(
      '    (i) No warrant was requested or obtained prior to the search.'
    );

    // Verify Markdown table extraction
    expect(parsed.content).toContain('| Exhibit ID | Timestamp | Observation |');
    expect(parsed.content).toContain(
      '| STATE-BWC-01 | 22:14:08 | Driver hands steady; no furtive movement |'
    );
    expect(parsed.content).toContain(
      '| DEF-004 | 22:16:45 | Console pried open without consent |'
    );

    // Verify footnotes section at the end
    expect(parsed.content).toContain('### Footnotes');
    expect(parsed.content).toContain(
      '[^1]: See State v. Sprague, 2003 VT 20, ¶ 16, 175 Vt. 123 (holding that exit orders require reasonable suspicion under Article 11).'
    );
    expect(parsed.content).toContain(
      '[^2]: Compare State v. Bauder, 2007 VT 16, ¶ 14, with federal automobile exception doctrine.'
    );
  });

  it('indexes uploaded .docx documents in LegalDatabase and makes them searchable via LegalToolExecutor', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-docx-test-'));
    try {
      const db = new LegalDatabase(tmpDir);
      await db.initialize();

      const docxBuffer = buildZipArchive({
        'word/document.xml': sampleDocumentXml,
        'word/styles.xml': sampleStylesXml,
        'word/numbering.xml': sampleNumberingXml,
        'word/footnotes.xml': sampleFootnotesXml,
      });

      const parsed = parseDocxBuffer(docxBuffer, 'Thorne_Draft_Suppression_Motion.docx');
      const now = new Date().toISOString();

      db.insertDocument({
        id: 'doc-docx-upload-1',
        matterId: 'matter-vt-state-v-thorne',
        title: parsed.suggestedTitle,
        fileName: parsed.fileName,
        category: 'PLEADING',
        batesRange: 'DEF-DOCX-001',
        pageCount: parsed.pageCount,
        summary: parsed.summary,
        content: parsed.content,
        createdAt: now,
        updatedAt: now,
      });

      const executor = new LegalToolExecutor(db);
      const searchResult = await executor.executeTool(
        'matter-vt-state-v-thorne',
        'search_matter_corpus',
        { query: 'Sprague console pried open' },
        'gemini-4-argon'
      );

      expect(searchResult.status).toBe('completed');
      expect(searchResult.rawOutput).toContain('Thorne_Draft_Suppression_Motion.docx');
      expect(searchResult.rawOutput).toContain('Console pried open without consent');
      expect(searchResult.rawOutput).toContain('[^1]: See State v. Sprague');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws a clear error if a non-zip or malformed buffer is uploaded', () => {
    expect(() =>
      parseDocxBuffer(Buffer.from('not a valid docx zip'), 'BadFile.docx')
    ).toThrow(/Invalid \.docx file/);
  });
});

describe('DocxParser: Tracked changes, comments, and exporting redlines back to .docx (Issue #4)', () => {
  const redlineDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>SETTLEMENT AND RELEASE AGREEMENT</w:t></w:r>
    </w:p>
    <w:p>
      <w:commentRangeStart w:id="10"/>
      <w:r><w:t>1. Payment Terms. Company shall pay Claimant </w:t></w:r>
      <w:del w:id="1" w:author="Opposing Counsel" w:date="2026-11-20T14:00:00Z">
        <w:r><w:delText>$25,000 within 60 days</w:delText></w:r>
      </w:del>
      <w:ins w:id="2" w:author="Lead Trial Counsel" w:date="2026-11-21T09:30:00Z">
        <w:r><w:t>$45,000 within 14 business days</w:t></w:r>
      </w:ins>
      <w:r><w:t> of execution.</w:t></w:r>
      <w:commentRangeEnd w:id="10"/>
      <w:r><w:commentReference w:id="10"/></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>2. Mutual Confidentiality. </w:t></w:r>
      <w:del w:id="3" w:author="Lead Trial Counsel" w:date="2026-11-21T10:15:00Z">
        <w:r><w:delText>Claimant waives all statutory disclosures.</w:delText></w:r>
      </w:del>
      <w:ins w:id="4" w:author="Lead Trial Counsel" w:date="2026-11-21T10:15:00Z">
        <w:r><w:t>Nothing herein restricts disclosures protected under 21 V.S.A. § 495h.</w:t></w:r>
      </w:ins>
    </w:p>
  </w:body>
</w:document>`;

  const redlineCommentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="10" w:author="Partner Review" w:date="2026-11-21T11:00:00Z" w:initials="PR">
    <w:p>
      <w:r><w:t>Confirm wire instructions and accelerate payment window to 14 business days.</w:t></w:r>
    </w:p>
  </w:comment>
</w:comments>`;

  it('extracts <w:ins>, <w:del>, and word/comments.xml with inline markers and structured summaries', () => {
    const docxBuffer = buildZipArchive({
      'word/document.xml': redlineDocumentXml,
      'word/comments.xml': redlineCommentsXml,
    });

    const parsed = parseDocxBuffer(docxBuffer, 'Settlement_Redline_v2.docx');

    expect(parsed.stats.trackedChangeCount).toBe(4);
    expect(parsed.stats.commentCount).toBe(1);
    expect(parsed.trackedChanges).toHaveLength(4);
    expect(parsed.comments).toHaveLength(1);

    // Check structured trackedChanges array
    expect(parsed.trackedChanges[0]).toMatchObject({
      id: '1',
      type: 'deletion',
      author: 'Opposing Counsel',
      text: '$25,000 within 60 days',
    });
    expect(parsed.trackedChanges[1]).toMatchObject({
      id: '2',
      type: 'insertion',
      author: 'Lead Trial Counsel',
      text: '$45,000 within 14 business days',
    });

    // Check structured comments array including anchored anchorText
    expect(parsed.comments[0]).toMatchObject({
      id: '10',
      author: 'Partner Review',
      initials: 'PR',
      text: 'Confirm wire instructions and accelerate payment window to 14 business days.',
    });
    expect(parsed.comments[0].anchorText).toContain('1. Payment Terms.');

    // Check inline markers and summary sections in extracted text
    expect(parsed.content).toContain('{~$25,000 within 60 days~}');
    expect(parsed.content).toContain('{+$45,000 within 14 business days+}');
    expect(parsed.content).toContain('[Comment #10]');
    expect(parsed.content).toContain('### Tracked Changes');
    expect(parsed.content).toContain('### Margin Comments');
    expect(parsed.summary).toContain('4 tracked changes');
    expect(parsed.summary).toContain('1 comment');
  });

  it('exports redlined versions back to .docx with native Word Tracked Changes (<w:ins>, <w:del>) and comments, and round-trips cleanly', () => {
    const previousDraft = [
      '# MOTION TO SUPPRESS EVIDENCE',
      '',
      '1. Trooper Keller stopped the vehicle on Interstate 89 without probable cause.',
      '2. Defendant requests a hearing at the Court convenience.',
    ].join('\n');

    const revisedDraft = [
      '# MOTION TO SUPPRESS EVIDENCE',
      '',
      '1. Trooper Keller stopped the vehicle on Interstate 89 without reasonable and articulable suspicion under Article 11.',
      '2. Defendant requests an evidentiary suppression hearing pursuant to V.R.Cr.P. 12(b)(3).',
      '3. All fruits of the warrantless console search must be excluded under State v. Bauder, 2007 VT 16.',
    ].join('\n');

    const exportedBuffer = exportDocxBuffer({
      title: 'Motion to Suppress — Article 11 Redline',
      content: revisedDraft,
      previousContent: previousDraft,
      author: 'LexHarness Adversarial Review',
      date: '2026-11-21T16:00:00Z',
      rationaleSummary:
        'Cured Citation Auditor objection by citing Article 11 reasonable suspicion standard and State v. Bauder.',
      comments: [
        {
          author: 'Citation & Authority Auditor',
          text: 'Verified pinpoint citation to State v. Bauder, 2007 VT 16, ¶ 14.',
          targetSnippet: 'State v. Bauder',
        },
      ],
    });

    // Re-parse the exported .docx buffer to verify full OpenXML compliance & round-trip fidelity
    const roundTripped = parseDocxBuffer(
      exportedBuffer,
      'Motion_to_Suppress_Redline.docx'
    );

    expect(roundTripped.suggestedTitle).toBe('MOTION TO SUPPRESS EVIDENCE');
    expect(roundTripped.stats.headingCount).toBeGreaterThanOrEqual(1);
    expect(roundTripped.stats.trackedChangeCount).toBeGreaterThan(0);
    expect(roundTripped.stats.commentCount).toBe(2); // rationaleSummary + explicit comment

    // Should contain both deletions from previousDraft and insertions from revisedDraft
    const deletions = roundTripped.trackedChanges.filter(
      (tc) => tc.type === 'deletion'
    );
    const insertions = roundTripped.trackedChanges.filter(
      (tc) => tc.type === 'insertion'
    );
    expect(deletions.length).toBeGreaterThan(0);
    expect(insertions.length).toBeGreaterThan(0);

    expect(deletions.map((d) => d.text).join(' ')).toContain('probable cause');
    expect(insertions.map((i) => i.text).join(' ')).toContain(
      'reasonable and articulable suspicion under Article 11.'
    );
    expect(insertions.map((i) => i.text).join(' ')).toContain('State v. Bauder');

    // Verify comments round-tripped in word/comments.xml
    expect(roundTripped.comments[0].text).toContain(
      'Cured Citation Auditor objection'
    );
    expect(roundTripped.comments[1].text).toContain(
      'Verified pinpoint citation to State v. Bauder'
    );
  });

  it('converts inline {+inserted+} and {~deleted~} markers into native Word Tracked Changes when exporting without previousContent', () => {
    const inlineRedlineContent = [
      '# COMMERCIAL LEASE AMENDMENT',
      'Tenant shall pay monthly rent of {~$3,200~}{+$3,450+} on the first business day of each month.',
    ].join('\n');

    const exportedBuffer = exportDocxBuffer({
      title: 'Commercial Lease Amendment',
      content: inlineRedlineContent,
      author: 'Transactional Counsel',
    });

    const parsed = parseDocxBuffer(exportedBuffer, 'Lease_Amendment.docx');
    expect(parsed.stats.trackedChangeCount).toBe(2);
    expect(parsed.trackedChanges).toEqual([
      expect.objectContaining({
        type: 'deletion',
        text: '$3,200',
        author: 'Transactional Counsel',
      }),
      expect.objectContaining({
        type: 'insertion',
        text: '$3,450',
        author: 'Transactional Counsel',
      }),
    ]);
  });
});

describe('Multi-format document & exhibit ingestion (.txt, .csv, .xlsx, .rtf, .pdf)', () => {
  it('parses plain text (.txt) and Markdown (.md) files with heading and numbered paragraph stats', () => {
    const txtBuffer = Buffer.from(
      [
        '# DEPOSITION TRANSCRIPT OF OFFICER KELLER',
        '',
        '1. Q: State your full name and badge number for the record.',
        '2. A: Trooper Marcus Keller, Badge #412, Vermont State Police.',
      ].join('\n'),
      'utf8'
    );

    const parsed = parseDocumentBuffer(txtBuffer, 'Keller_Deposition_Excerpt.txt');
    expect(parsed.fileName).toBe('Keller_Deposition_Excerpt.txt');
    expect(parsed.suggestedTitle).toBe('DEPOSITION TRANSCRIPT OF OFFICER KELLER');
    expect(parsed.stats.headingCount).toBe(1);
    expect(parsed.stats.numberedParagraphCount).toBe(2);
    expect(parsed.content).toContain('Trooper Marcus Keller, Badge #412');
  });

  it('parses CSV (.csv) exhibits with quoted commas and newlines into structured Markdown tables', () => {
    const csvText = [
      'Bates ID,Date,Amount,Description',
      'EX-101,2026-09-01,"$12,500.00","Initial retainer wire, escrow account"',
      'EX-102,2026-09-15,"$4,200.50","Forensic accounting invoice | Phase 1"',
    ].join('\r\n');

    const parsed = parseDocumentBuffer(
      Buffer.from(csvText, 'utf8'),
      'Damages_Ledger_2026.csv'
    );

    expect(parsed.suggestedTitle).toBe('Damages Ledger 2026');
    expect(parsed.stats.tableCount).toBe(1);
    expect(parsed.content).toContain('| Bates ID | Date | Amount | Description |');
    expect(parsed.content).toContain(
      '| EX-101 | 2026-09-01 | $12,500.00 | Initial retainer wire, escrow account |'
    );
    expect(parsed.content).toContain('Forensic accounting invoice \\| Phase 1');
    expect(parsed.summary).toContain('CSV table (2 rows');
  });

  it('parses Excel workbooks (.xlsx) with multiple sheets, shared strings, inline strings, and serial dates', () => {
    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Privilege Log" sheetId="1" r:id="rId1"/>
    <sheet name="Damages Calculation" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Target="worksheets/sheet2.xml"/>
</Relationships>`;

    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>Doc ID</t></si>
  <si><t>Date</t></si>
  <si><t>Privilege Basis</t></si>
  <si><t>PRIV-001</t></si>
  <si><t>Attorney-Client Communication re: Merger</t></si>
</sst>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cellXfs count="2">
    <xf numFmtId="0"/>
    <xf numFmtId="14"/>
  </cellXfs>
</styleSheet>`;

    // 46296 in Excel 1900 date system = 2026-10-01
    const sheet1Xml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>2</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>3</v></c>
      <c r="B2" s="1"><v>46296</v></c>
      <c r="C2" t="s"><v>4</v></c>
    </row>
  </sheetData>
</worksheet>`;

    const sheet2Xml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Category</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Amount</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Lost Profits</t></is></c>
      <c r="B2"><v>185000</v></c>
    </row>
  </sheetData>
</worksheet>`;

    const xlsxBuffer = buildZipArchive({
      'xl/workbook.xml': workbookXml,
      'xl/_rels/workbook.xml.rels': workbookRelsXml,
      'xl/sharedStrings.xml': sharedStringsXml,
      'xl/styles.xml': stylesXml,
      'xl/worksheets/sheet1.xml': sheet1Xml,
      'xl/worksheets/sheet2.xml': sheet2Xml,
    });

    const parsed = parseDocumentBuffer(xlsxBuffer, 'Matter_Privilege_and_Damages.xlsx');
    expect(parsed.stats.tableCount).toBe(2);
    expect(parsed.content).toContain('## Sheet: Privilege Log');
    expect(parsed.content).toContain(
      '| PRIV-001 | 2026-10-01 | Attorney-Client Communication re: Merger |'
    );
    expect(parsed.content).toContain('## Sheet: Damages Calculation');
    expect(parsed.content).toContain('| Lost Profits | 185000 |');
    expect(parsed.summary).toContain('Excel workbook (2 sheets');
  });

  it('parses Rich Text Format (.rtf) filings while stripping font/color tables and decoding escapes', () => {
    const rtfContent = [
      '{\\rtf1\\ansi\\deff0',
      '{\\fonttbl{\\f0 Times New Roman;}}',
      '{\\colortbl;\\red0\\green0\\blue0;}',
      '\\pard\\b AFFIDAVIT OF JANE DOE\\b0\\par',
      '1. I am the Chief Financial Officer of Apex Logistics.\\par',
      '2. On October 12\\\'2c 2026\\\'2c I reviewed the \\u167? 409A valuation report.\\par',
      '}',
    ].join('\n');

    const parsed = parseDocumentBuffer(
      Buffer.from(rtfContent, 'latin1'),
      'Affidavit_of_Jane_Doe.rtf'
    );

    expect(parsed.suggestedTitle).toBe('AFFIDAVIT OF JANE DOE');
    expect(parsed.content).not.toContain('Times New Roman');
    expect(parsed.content).toContain(
      '1. I am the Chief Financial Officer of Apex Logistics.'
    );
    expect(parsed.content).toContain(
      '2. On October 12, 2026, I reviewed the § 409A valuation report.'
    );
  });

  it('parses PDF (.pdf) documents with FlateDecode compressed text streams and BT/ET operators', () => {
    const contentStream = [
      'BT',
      '/F1 14 Tf',
      '72 720 Td',
      '(SUPERIOR COURT OF VERMONT) Tj',
      '0 -24 Td',
      '[(1. Plaintiff alleges breach of Section 4.2 ) -15 (of the Supply Agreement.)] TJ',
      'ET',
    ].join('\n');
    const compressed = zlib.deflateSync(Buffer.from(contentStream, 'latin1'));

    const header = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 3 0 R >>\nendobj\n3 0 obj\n<< /Length ' +
        compressed.length +
        ' /Filter /FlateDecode >>\nstream\r\n',
      'latin1'
    );
    const footer = Buffer.from('\r\nendstream\nendobj\n%%EOF', 'latin1');
    const pdfBuffer = Buffer.concat([header, compressed, footer]);

    const parsed = parseDocumentBuffer(pdfBuffer, 'Vermont_Complaint_Filing.pdf');
    expect(parsed.pageCount).toBe(1);
    expect(parsed.content).toContain('SUPERIOR COURT OF VERMONT');
    expect(parsed.content).toContain(
      '1. Plaintiff alleges breach of Section 4.2 of the Supply Agreement.'
    );
    expect(parsed.summary).toContain('SUPERIOR COURT OF VERMONT');
  });
});


