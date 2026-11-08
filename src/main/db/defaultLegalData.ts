import {
  AdversarialConfig,
  ChronologyFact,
  DocumentVersion,
  LegalThread,
  Matter,
  MatterDocument,
  PracticeAreaPreset,
  SystemPromptSettings,
  ThreadMessage,
} from '../../shared/types';

export const DEFAULT_CORE_LEGAL_MANDATE = `You are a senior legal research, analysis, and drafting agent operating inside a confidential attorney work-product control surface.

### I. CORE EVIDENTIARY & ETHICAL DISCIPLINE
1. **Strict Grounding & Anti-Hallucination Mandate**: Never invent, extrapolate, or guess a case citation, statute number, regulatory provision, contract clause, Bates number, or record fact.
2. **Mandatory Source Pinpoints**: Every factual assertion from the matter record must include an exact citation to the retrieved document, section, page, or Bates range (e.g., \`[MSA § 8.2, APEX-0014]\` or \`[Vance Dep. 42:11–18]\`).
3. **Explicit Uncertainty Flagging**: If a legal proposition or authority is not verified via the matter corpus or the \`verify_citation_lookup\` tool, you must explicitly mark it with \`[UNVERIFIED AUTHORITY — REQUIRES SHEPARDIZING / CITATION CHECK]\`.
4. **Distinction Between Binding and Persuasive Authority**: Always distinguish controlling authority in the governing jurisdiction from persuasive authority in other jurisdictions.
5. **Candid Risk Assessment**: Do not merely tell the supervising attorney what supports their position; surface adverse facts, statutory exceptions, contractual ambiguities, and counterarguments that opposing counsel will raise.

### II. LEGAL REASONING & WORK-PRODUCT STRUCTURE
- Structure legal analysis using rigorous analytical frameworks (**CRAC** — Conclusion, Rule, Application, Counterargument/Conclusion; or **IRAC** where requested).
- When drafting or revising contract clauses, preserve defined terms (Capitalized Terms), verify cross-references, and explain the risk-allocation shift of every proposed redline.`;

export const DEFAULT_PRACTICE_AREA_PRESETS: PracticeAreaPreset[] = [
  {
    id: 'litigation_appellate',
    name: 'Litigation & Appellate Brief Counsel',
    shortLabel: 'Litigation & Briefs',
    description:
      'Focuses on elements of claims/affirmative defenses, procedural posture, standard of review, Bluebook citation rigor, and record pinpoints.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: LITIGATION & APPELLATE BRIEF COUNSEL
- Frame analysis around the procedural posture (e.g., Rule 12(b)(6) Motion to Dismiss, Rule 56 Summary Judgment, Preliminary Injunction, or Appellate Review) and state the governing burden of proof.
- Anchor every factual statement in a verifiable record pinpoint (Exhibit, Deposition page:line, or Complaint paragraph).
- Format all legal citations strictly in accordance with the Matter's configured citation manual (e.g., The Bluebook).
- Actively anticipate and refute the strongest affirmative defenses or counter-interpretations of controlling precedent.`,
  },
  {
    id: 'transactional_contracts',
    name: 'Transactional & Commercial Contracts Counsel',
    shortLabel: 'Transactional & M&A',
    description:
      'Focuses on risk allocation, indemnification caps/baskets, representations & warranties, defined-term integrity, and redline drafting.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: TRANSACTIONAL & COMMERCIAL CONTRACTS COUNSEL
- Analyze agreements for commercial risk allocation, indemnification scope, limitations of liability, survival periods, termination triggers, and IP ownership.
- Audit Capitalized Defined Terms and section cross-references for internal consistency and unintended loopholes.
- When proposing contract revisions, use the \`propose_document_redline\` tool and provide a clear "Counsel's Note" explaining: (1) the vulnerability in the current text, (2) the market-standard position, and (3) fallback language for negotiation.`,
  },
  {
    id: 'regulatory_compliance',
    name: 'Regulatory & Statutory Compliance Counsel',
    shortLabel: 'Regulatory & Compliance',
    description:
      'Focuses on statutory construction, administrative rules, agency enforcement guidance, and compliance matrices.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: REGULATORY & STATUTORY COMPLIANCE COUNSEL
- Apply canons of statutory construction: begin with the plain text, statutory definitions, and safe harbors before turning to administrative regulations and agency guidance.
- Distinguish between mandatory statutory obligations ("shall" / "must"), discretionary provisions ("may"), and non-binding agency commentary.
- Present compliance obligations in structured checklists or gap matrices mapping statutory cites to concrete client actions.`,
  },
  {
    id: 'discovery_investigation',
    name: 'Discovery & Fact Chronology Investigator',
    shortLabel: 'Fact Investigation',
    description:
      'Focuses on synthesizing depositions, exhibits, emails, and Bates-stamped productions into verified chronological timelines.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: DISCOVERY & FACT CHRONOLOGY INVESTIGATOR
- Cross-reference witness testimony against contemporaneous documents and Bates-stamped exhibits to identify corroboration, impeachment material, and timeline inconsistencies.
- Log key dated events into the Matter Chronology using \`record_chronology_fact\` with exact Bates or page:line pinpoints.
- Clearly separate undisputed documentary facts from contested witness assertions.`,
  },
];

export const DEFAULT_CRITIC_CITATION_AUDITOR_PROMPT = `You are the **Independent Citation & Record Auditor** in a Multi-LLM Adversarial Legal Review Gate.
Your sole responsibility is to audit the Primary Model's candidate legal work product against the actual tool outputs and matter documents retrieved during the turn.

Audit Checklist:
1. **Citation Fabrication & Accuracy Check**: Does the draft cite any case, statute, or exhibit that was NOT retrieved in the tool transcripts or matter corpus, without flagging it as \`[UNVERIFIED]\`?
2. **Holding & Quote Fidelity**: Does the draft overstate a court's holding, misquote contract language, or omit a critical carve-out/proviso present in the source document?
3. **Record Pinpoint Verification**: Are Bates numbers, section numbers, and deposition page:line citations accurate according to the retrieved text?
4. **System Prompt Compliance**: Did the draft violate any jurisdictional, citation-format, or ethical guardrail established by the supervising attorney?

Return a strict JSON evaluation specifying \`verdict\` ("APPROVE" or "REVISE"), \`severity\` ("NONE", "LOW", "MEDIUM", "CRITICAL"), specific \`objections\` with exact locations and required fixes, and any \`dissentingConsiderations\`.`;

export const DEFAULT_CRITIC_OPPOSING_COUNSEL_PROMPT = `You are **Adversarial Opposing Counsel & Senior Reviewing Partner** in a Multi-LLM Adversarial Legal Review Gate.
Your role is to ruthlessly stress-test the Primary Model's legal reasoning, contract drafting, and strategic conclusions before the supervising lawyer sees the output.

Audit Checklist:
1. **Unaddressed Counterarguments & Exceptions**: Did the draft overlook a contractual carve-out, statutory safe harbor, notice-and-cure requirement, or affirmative defense that opposing counsel will immediately exploit?
2. **Logical & Analytical Gaps**: Does the application of law to fact make an unsupported leap, or conflate distinct legal standards (e.g., direct vs. consequential damages, gross negligence vs. willful misconduct)?
3. **Drafting Vulnerabilities**: If contract or brief language is proposed, does it introduce ambiguity, circular definitions, or unintended liability exposure?

Return a strict JSON evaluation specifying \`verdict\` ("APPROVE" or "REVISE"), \`severity\` ("NONE", "LOW", "MEDIUM", "CRITICAL"), specific \`objections\` with exact locations and required fixes, and \`dissentingConsiderations\` highlighting strategic trade-offs for the lawyer's judgment.`;

export const DEFAULT_SYSTEM_PROMPT_SETTINGS: SystemPromptSettings = {
  id: 'default-legal-prompt-profile',
  version: 1,
  coreLegalMandate: DEFAULT_CORE_LEGAL_MANDATE,
  practiceAreaPresets: DEFAULT_PRACTICE_AREA_PRESETS,
  activePracticeAreaId: 'litigation_appellate',
  criticCitationAuditorPrompt: DEFAULT_CRITIC_CITATION_AUDITOR_PROMPT,
  criticOpposingCounselPrompt: DEFAULT_CRITIC_OPPOSING_COUNSEL_PROMPT,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_ADVERSARIAL_CONFIG: AdversarialConfig = {
  mode: 'multi_llm_default',
  primaryProvider: 'anthropic',
  primaryModel: 'claude-3-7-sonnet-latest',
  citationAuditorProvider: 'gemini',
  citationAuditorModel: 'gemini-2.5-pro',
  opposingCounselProvider: 'openai',
  opposingCounselModel: 'o3-mini',
  maxRevisionRounds: 2,
};

export const SEEDED_MATTERS: Matter[] = [
  {
    id: 'matter-apex-meridian',
    name: 'Apex Biometrics v. Meridian Cloud Systems',
    clientName: 'Apex Biometrics, Inc.',
    matterNumber: '2026-CV-04192-DEL',
    practiceArea: 'litigation_appellate',
    jurisdiction: 'Delaware Court of Chancery / Delaware General Corporation & Contract Law',
    citationStyle: 'The Bluebook (21st Ed.)',
    folderPath: '~/Matters/2026-CV-04192-Apex-v-Meridian',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-08T10:00:00.000Z',
  },
  {
    id: 'matter-helios-acquisition',
    name: 'Helios Energy — Series C & Commercial Licensing',
    clientName: 'Helios Grid Storage LLC',
    matterNumber: '2026-TX-08814-NY',
    practiceArea: 'transactional_contracts',
    jurisdiction: 'State of New York (Commercial Division / NY GOL § 5-1401)',
    citationStyle: 'New York Official Law Reports / Bluebook',
    folderPath: '~/Matters/2026-TX-08814-Helios-Licensing',
    createdAt: '2026-11-03T14:30:00.000Z',
    updatedAt: '2026-11-07T16:45:00.000Z',
  },
];

export const SEEDED_DOCUMENTS: MatterDocument[] = [
  {
    id: 'doc-msa-apex',
    matterId: 'matter-apex-meridian',
    title: 'Master Cloud Infrastructure & BAA Agreement (2024)',
    fileName: '01_Master_Services_Agreement_Executed.pdf',
    category: 'CONTRACT',
    batesRange: 'APEX-0001 to APEX-0024',
    pageCount: 24,
    summary:
      'Executed Master Services Agreement between Apex Biometrics, Inc. and Meridian Cloud Systems LLC governing biometric data hosting, uptime SLAs, indemnification (§ 8), and limitation of liability (§ 9).',
    content: `[BATES: APEX-0001 | PAGE 1]
MASTER CLOUD INFRASTRUCTURE AND SERVICES AGREEMENT
This Master Cloud Infrastructure and Services Agreement ("Agreement") is entered into as of March 15, 2024 ("Effective Date"), by and between Apex Biometrics, Inc., a Delaware corporation ("Customer" or "Apex"), and Meridian Cloud Systems LLC, a Delaware limited liability company ("Provider" or "Meridian").

SECTION 4. DATA SECURITY AND BIOMETRIC ENCRYPTION OBLIGATIONS.
4.1 Encryption at Rest and in Transit. Provider shall maintain FIPS 140-3 Level 3 hardware security module (HSM) encryption for all Customer Biometric Templates at all times.
4.2 Subprocessor Restrictions. Provider shall not migrate or replicate Customer Biometric Templates to any third-party subprocessor or secondary regional data center without Customer's prior written consent delivered at least thirty (30) days in advance.

[BATES: APEX-0014 | PAGE 14]
SECTION 8. INDEMNIFICATION.
8.1 Provider Security Indemnity. Provider shall defend, indemnify, and hold harmless Customer from and against any third-party regulatory fines, statutory damages, and reasonable attorneys' fees directly resulting from Provider's breach of Section 4 (Data Security and Biometric Encryption Obligations).
8.2 Notice and Cure Condition. As a condition precedent to Provider's obligations under Section 8.1, Customer shall provide written notice of any claimed Security Breach within ten (10) Business Days of Customer's Chief Information Security Officer ("CISO") obtaining actual knowledge of the breach; provided, however, that a delay in notice shall relieve Provider of its indemnification obligations only to the extent Provider demonstrates material prejudice resulting from such delay.

[BATES: APEX-0016 | PAGE 16]
SECTION 9. LIMITATION OF LIABILITY.
9.1 Consequential Damages Waiver. EXCEPT FOR CLAIMS ARISING UNDER SECTION 8.1 (PROVIDER SECURITY INDEMNITY) OR A PARTY'S WILLFUL MISCONDUCT OR GROSS NEGLIGENCE, NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS OR LOSS OF REPUTATION.
9.2 Aggregate Liability Cap. Provider's aggregate cumulative liability under this Agreement shall not exceed the total fees paid by Customer in the twelve (12) months preceding the event giving rise to liability ($1,800,000) ("General Cap"); PROVIDED THAT for claims arising out of a breach of Section 4.1 or Section 4.2 accompanied by Gross Negligence or Willful Misconduct, Provider's liability shall be subject to an enhanced Super-Cap equal to three times (3x) the General Cap ($5,400,000), and shall be uncapped solely in the event of Intentional Fraud or Reckless Disregard of Known Cryptographic Vulnerabilities.`,
    createdAt: '2026-11-01T09:05:00.000Z',
    updatedAt: '2026-11-01T09:05:00.000Z',
  },
  {
    id: 'doc-vance-dep',
    matterId: 'matter-apex-meridian',
    title: 'Deposition Transcript of Marcus Vance (Meridian VP of Infrastructure)',
    fileName: '02_Deposition_Marcus_Vance_2026-10-18.pdf',
    category: 'DEPOSITION',
    batesRange: 'MERIDIAN-DEP-0001 to 0088',
    pageCount: 88,
    summary:
      'Rule 30(b)(6) deposition testimony of Meridian VP of Infrastructure admitting unapproved failover replication to an unencrypted staging cluster in August 2026.',
    content: `[BATES: MERIDIAN-DEP-0041 | PAGE 41]
Q. (By Ms. Chen, Counsel for Apex) Mr. Vance, turning to Exhibit 14, the August 4, 2026 internal Slack escalation log. Did Meridian replicate Apex's biometric production database to the 'us-west-staging-04' cluster on August 2, 2026?
A. (Mr. Vance) Yes, during the emergency latency migration we mirrored the shards to us-west-staging-04.
Q. Did us-west-staging-04 have FIPS 140-3 Level 3 HSM encryption active on August 2, 2026?
A. No. The HSM key-wrapping daemon had been disabled on that staging cluster two weeks earlier because of a firmware patch conflict.
Q. And you knew on August 2, 2026, before initiating the replication, that HSM encryption was disabled on us-west-staging-04?
A. My principal SRE warned me in the ticket at 14:10 UTC that HSM wrapping was off, yes. I authorized temporary plaintext-volume fallback for 48 hours to prevent SLA uptime penalties, intending to re-enable HSM on Monday.

[BATES: MERIDIAN-DEP-0059 | PAGE 59]
Q. Did Meridian ever request or obtain Apex's written consent under Section 4.2 before replicating the biometric shards to the third-party colocation subprocessor hosting us-west-staging-04?
A. No. We treated it as an internal disaster-recovery failover.
Q. When did Apex's CISO, Dr. Elena Rostova, first learn that the staging cluster had been accessed by an unauthorized external IP?
A. Meridian sent the initial security advisory email to Dr. Rostova on August 19, 2026. Apex served its formal indemnification demand letter twelve Business Days later, on September 4, 2026.`,
    createdAt: '2026-11-01T09:10:00.000Z',
    updatedAt: '2026-11-01T09:10:00.000Z',
  },
  {
    id: 'doc-delaware-precedent',
    matterId: 'matter-apex-meridian',
    title: 'Delaware Case Law Authority Compendium (Contractual Caps, Gross Negligence & Notice Prejudice)',
    fileName: '03_Delaware_Authority_Compendium.md',
    category: 'STATUTE_AUTHORITY',
    batesRange: 'AUTH-DEL-0001 to 0012',
    pageCount: 12,
    summary:
      'Verified Delaware Court of Chancery and Supreme Court authorities on willful misconduct, reckless disregard in limitation-of-liability clauses, and notice-prejudice rules.',
    content: `[BATES: AUTH-DEL-0001 | PAGE 1]
VERIFIED DELAWARE PRECEDENT COMPENDIUM

1. Abry Partners V, L.P. v. F & W Acquisition LLC, 891 A.2d 1032 (Del. Ch. 2006)
- Holding: Delaware courts respect sophisticated parties' contractual allocation of risk and liability caps, except that public policy precludes insulating a party from its own intentional fraud. Where a contract explicitly carves out "reckless disregard" or "gross negligence" into a higher tier or uncapped tier, the court enforces the plain meaning of the tiered cap structure negotiated by the parties.

2. Genuine Parts Co. v. Cepec, 137 A.3d 123 (Del. 2016) & Jardel Co., Inc. v. Hughes, 523 A.2d 518 (Del. 1987)
- Holding on Civil Gross Negligence & Reckless Disregard under Delaware Law: Under Delaware law, "gross negligence" is defined as an extreme departure from the ordinary standard of care that signifies more than ordinary inadvertence. "Reckless disregard" requires a conscious indifference to the rights or safety of others—specifically, an "I-don't-care-attitude" where the actor knows of a substantial risk of harm and consciously chooses to proceed in the face of that known risk.

3. Express Scripts, Inc. v. Bracket Holdings Corp., 248 A.3d 824 (Del. 2021)
- Holding: When sophisticated commercial contracts distinguish between "deliberate fraud," "reckless disregard," and "gross negligence" to trigger different liability caps, the Court must give independent meaning to each negotiated tier rather than collapsing negligence into fraud.

4. Notice-and-Cure Express Proviso Enforcement (Delaware Contract Interpretation):
- Under Delaware's objective theory of contracts (Salamone v. Gorman, 106 A.3d 354, 367–68 (Del. 2014)), where a contractual notice clause contains an express proviso stating that late notice relieves the indemnitor "only to the extent Provider demonstrates material prejudice resulting from such delay," the burden rests squarely on the indemnitor (Meridian) to prove concrete, causal prejudice attributable to the two-day delay.`,
    createdAt: '2026-11-01T09:15:00.000Z',
    updatedAt: '2026-11-01T09:15:00.000Z',
  },
  {
    id: 'doc-draft-memo-apex',
    matterId: 'matter-apex-meridian',
    title: 'Draft Summary Judgment & Indemnification Brief Section (Work Product)',
    fileName: '04_Draft_SJ_Brief_Liability_Cap_Analysis.md',
    category: 'WORK_PRODUCT',
    batesRange: 'WP-APEX-0001',
    pageCount: 4,
    summary:
      'Attorney work-product memorandum & draft brief section analyzing whether Meridian is subject to the $1.8M General Cap, the $5.4M 3x Super-Cap, or Uncapped Liability under MSA § 9.2.',
    content: `# MEMORANDUM OF LAW IN SUPPORT OF PARTIAL SUMMARY JUDGMENT (DRAFT v2)

## I. PRELIMINARY STATEMENT
Plaintiff Apex Biometrics, Inc. ("Apex") moves for partial summary judgment declaring that Defendant Meridian Cloud Systems LLC ("Meridian") breached Sections 4.1 and 4.2 of the Master Cloud Infrastructure Agreement ("MSA") [APEX-0001] and that Meridian's liability is not limited to the $1,800,000 General Cap under Section 9.2 [APEX-0016].

## II. ARGUMENT

### A. Meridian's Conscious Authorization of Unencrypted Staging Replication Triggers Either the $5.4M Super-Cap or the Uncapped Carve-Out Under MSA § 9.2
Under Delaware law, sophisticated commercial contracts with tiered limitation-of-liability provisions are enforced according to their plain, negotiated text. *See Express Scripts, Inc. v. Bracket Holdings Corp.*, 248 A.3d 824 (Del. 2021) [AUTH-DEL-0001]. Section 9.2 of the MSA establishes three distinct liability tiers:
1. **The $1.8M General Cap** (12 months' trailing fees);
2. **The $5.4M Enhanced Super-Cap (3x General Cap)** for breaches of Section 4.1 or 4.2 accompanied by "Gross Negligence or Willful Misconduct"; and
3. **Uncapped Liability** solely for "Intentional Fraud or Reckless Disregard of Known Cryptographic Vulnerabilities" [MSA § 9.2, APEX-0016].

Here, the undisputed Rule 30(b)(6) testimony of Meridian's VP of Infrastructure, Marcus Vance, establishes that on August 2, 2026, Meridian's principal SRE explicitly warned Mr. Vance at 14:10 UTC that FIPS 140-3 HSM key-wrapping was disabled on \`us-west-staging-04\` [Vance Dep. 41:12–21, MERIDIAN-DEP-0041]. Mr. Vance consciously overrode that warning and ordered plaintext-volume replication solely to avoid SLA uptime penalties [Id.]. Under *Jardel Co., Inc. v. Hughes*, 523 A.2d 518 (Del. 1987), consciously proceeding in the face of a known cryptographic vulnerability constitutes "Reckless Disregard" and, at an absolute minimum, establishes "Gross Negligence or Willful Misconduct" triggering the $5,400,000 Super-Cap as a matter of law.

### B. Apex's Two-Business-Day Notice Delay Does Not Bar Indemnification Under the Express Material-Prejudice Proviso of MSA § 8.2
Although Apex served its formal indemnification demand twelve (12) Business Days after CISO Dr. Elena Rostova received Meridian's August 19, 2026 advisory—two days beyond the ten-day window in Section 8.2 [Vance Dep. 59:11–18, MERIDIAN-DEP-0059]—Section 8.2 expressly provides that *"a delay in notice shall relieve Provider of its indemnification obligations only to the extent Provider demonstrates material prejudice resulting from such delay"* [MSA § 8.2, APEX-0014]. Because Meridian already controlled the \`us-west-staging-04\` forensic logs prior to August 19, Meridian cannot demonstrate any causal prejudice from the two-day interval between September 1 and September 4, 2026.`,
    createdAt: '2026-11-02T11:00:00.000Z',
    updatedAt: '2026-11-08T09:30:00.000Z',
  },
];

export const SEEDED_DOCUMENT_VERSIONS: DocumentVersion[] = [
  {
    id: 'ver-1',
    documentId: 'doc-draft-memo-apex',
    matterId: 'matter-apex-meridian',
    versionNumber: 1,
    title: 'Initial Draft (Before Adversarial Review)',
    content: `# MEMORANDUM OF LAW IN SUPPORT OF PARTIAL SUMMARY JUDGMENT (DRAFT v1)

## I. PRELIMINARY STATEMENT
Plaintiff Apex Biometrics, Inc. ("Apex") moves for partial summary judgment declaring that Defendant Meridian Cloud Systems LLC ("Meridian") breached Sections 4.1 and 4.2 of the Master Cloud Infrastructure Agreement ("MSA") and is subject to completely uncapped liability for all damages under Delaware public policy.

## II. ARGUMENT
Under *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006), Delaware public policy voids any contractual limitation of liability whenever a party acts with gross negligence. Because Marcus Vance admitted disabling encryption on August 2, 2026, the $1.8M cap is void in its entirety and Apex is entitled to uncapped recovery. Furthermore, Apex timely complied with all notice requirements under Section 8.2.`,
    previousContent: '',
    rationaleSummary: 'Initial primary model draft prior to Multi-LLM Adversarial Gate.',
    createdByModel: 'claude-3-7-sonnet-latest',
    createdAt: '2026-11-08T09:25:00.000Z',
  },
  {
    id: 'ver-2',
    documentId: 'doc-draft-memo-apex',
    matterId: 'matter-apex-meridian',
    versionNumber: 2,
    title: 'Revised Draft (Cured After Multi-LLM Adversarial Review)',
    content: SEEDED_DOCUMENTS[3].content,
    previousContent: `# MEMORANDUM OF LAW IN SUPPORT OF PARTIAL SUMMARY JUDGMENT (DRAFT v1)

## I. PRELIMINARY STATEMENT
Plaintiff Apex Biometrics, Inc. ("Apex") moves for partial summary judgment declaring that Defendant Meridian Cloud Systems LLC ("Meridian") breached Sections 4.1 and 4.2 of the Master Cloud Infrastructure Agreement ("MSA") and is subject to completely uncapped liability for all damages under Delaware public policy.

## II. ARGUMENT
Under *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006), Delaware public policy voids any contractual limitation of liability whenever a party acts with gross negligence. Because Marcus Vance admitted disabling encryption on August 2, 2026, the $1.8M cap is void in its entirety and Apex is entitled to uncapped recovery. Furthermore, Apex timely complied with all notice requirements under Section 8.2.`,
    rationaleSummary:
      'Cured 2 critical objections from Citation Auditor (Gemini 2.5 Pro) and Opposing Counsel (OpenAI o3-mini): (1) corrected Abry Partners holding (public policy voids caps for intentional fraud, whereas gross negligence triggers the negotiated $5.4M 3x Super-Cap and reckless disregard triggers the contractual uncapped carve-out under MSA § 9.2); (2) addressed the 12-Business-Day notice timing under the express material-prejudice proviso of MSA § 8.2.',
    createdByModel: 'claude-3-7-sonnet-latest (Reviewed by gemini-2.5-pro & o3-mini)',
    createdAt: '2026-11-08T09:30:00.000Z',
  },
];

export const SEEDED_CHRONOLOGY_FACTS: ChronologyFact[] = [
  {
    id: 'fact-1',
    matterId: 'matter-apex-meridian',
    factDate: '2024-03-15',
    eventDescription:
      'Apex and Meridian execute Master Cloud Infrastructure Agreement requiring FIPS 140-3 Level 3 HSM encryption (§ 4.1) and prior written consent for third-party subprocessor replication (§ 4.2).',
    sourceCitation: 'MSA §§ 4.1–4.2 [APEX-0001]',
    status: 'UNDISPUTED',
    createdAt: '2026-11-01T09:20:00.000Z',
  },
  {
    id: 'fact-2',
    matterId: 'matter-apex-meridian',
    factDate: '2026-08-02',
    eventDescription:
      'Meridian VP Marcus Vance authorizes replication of Apex biometric shards to us-west-staging-04 after being warned at 14:10 UTC that HSM key-wrapping was disabled.',
    sourceCitation: 'Vance Dep. 41:12–21 [MERIDIAN-DEP-0041]',
    status: 'UNDISPUTED',
    createdAt: '2026-11-01T09:22:00.000Z',
  },
  {
    id: 'fact-3',
    matterId: 'matter-apex-meridian',
    factDate: '2026-08-19',
    eventDescription:
      'Meridian sends initial security advisory email to Apex CISO Dr. Elena Rostova disclosing unauthorized external IP access to us-west-staging-04.',
    sourceCitation: 'Vance Dep. 59:11–16 [MERIDIAN-DEP-0059]',
    status: 'UNDISPUTED',
    createdAt: '2026-11-01T09:25:00.000Z',
  },
  {
    id: 'fact-4',
    matterId: 'matter-apex-meridian',
    factDate: '2026-09-04',
    eventDescription:
      'Apex serves formal written indemnification demand on Meridian (12 Business Days after August 19 advisory; 2 Business Days after the 10-day window in MSA § 8.2).',
    sourceCitation: 'Vance Dep. 59:16–18 [MERIDIAN-DEP-0059]; MSA § 8.2 [APEX-0014]',
    status: 'DISPUTED',
    createdAt: '2026-11-01T09:28:00.000Z',
  },
];

export const SEEDED_THREADS: LegalThread[] = [
  {
    id: 'thread-apex-cap-analysis',
    matterId: 'matter-apex-meridian',
    title: 'MSA § 9.2 Liability Cap & § 8.2 Notice Prejudice Analysis',
    practiceArea: 'litigation_appellate',
    createdAt: '2026-11-08T09:15:00.000Z',
    updatedAt: '2026-11-08T09:30:00.000Z',
  },
];

export const SEEDED_MESSAGES: ThreadMessage[] = [
  {
    id: 'msg-seed-user-1',
    threadId: 'thread-apex-cap-analysis',
    role: 'user',
    content:
      'Analyze whether we can pierce the $1.8M General Liability Cap under MSA § 9.2 based on Marcus Vance’s deposition testimony, and assess whether Meridian can defeat indemnification under the 10-day notice clause in § 8.2.',
    toolCalls: [],
    adversarialReviews: [],
    createdAt: '2026-11-08T09:20:00.000Z',
  },
  {
    id: 'msg-seed-assistant-1',
    threadId: 'thread-apex-cap-analysis',
    role: 'assistant',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-3-7-sonnet-latest',
    reviewModeUsed: 'multi_llm_default',
    revisionRoundsCompleted: 1,
    initialDraftBeforeReview: `# INITIAL CANDIDATE ANALYSIS (PRE-ADVERSARIAL GATE)

1. **Liability Cap Piercing**: Under *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006), Delaware public policy voids limitation-of-liability clauses whenever a party engages in gross negligence. Because Marcus Vance admitted replicating biometric data without encryption on August 2, 2026, the $1.8M cap is void as a matter of public policy.
2. **Notice Compliance**: Apex timely notified Meridian of its indemnification claim under Section 8.2 following the security incident.`,
    content: `## Executive Legal Assessment: MSA § 9.2 Tiered Liability Cap & § 8.2 Notice Proviso

Based on the executed Master Cloud Infrastructure Agreement (\`APEX-0001\`), the Rule 30(b)(6) deposition testimony of Meridian VP Marcus Vance (\`MERIDIAN-DEP-0041\`, \`0059\`), and controlling Delaware precedent (\`AUTH-DEL-0001\`), below is our verified analysis.

---

### I. Piercing the $1.8M General Cap Under MSA § 9.2 (CRAC Analysis)

#### 1. Conclusion
Apex has a high probability of securing partial summary judgment piercing the **$1,800,000 General Cap** in favor of at least the **$5,400,000 Enhanced Super-Cap (3x)**—and a triable claim for **Uncapped Liability**—not under a generalized public-policy voidness theory, but through the **express contractual tiers negotiated in MSA § 9.2** \`[MSA § 9.2, APEX-0016]\`.

#### 2. Controlling Rule (Delaware Contract & Tort Standards)
- **Enforcement of Tiered Commercial Caps**: Under *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006), and *Express Scripts, Inc. v. Bracket Holdings Corp.*, 248 A.3d 824 (Del. 2021), Delaware courts enforce sophisticated parties' negotiated liability tiers according to their plain meaning and only void contractual caps on *public policy* grounds for **intentional fraud** \`[AUTH-DEL-0001]\`.
- **MSA § 9.2 Negotiated Tiers**:
  1. **General Cap ($1.8M)**: Default ceiling for ordinary contract breaches \`[MSA § 9.2, APEX-0016]\`.
  2. **Enhanced Super-Cap ($5.4M / 3x)**: Triggered by a breach of Section 4.1 or 4.2 accompanied by *"Gross Negligence or Willful Misconduct"* \`[MSA § 9.2, APEX-0016]\`.
  3. **Uncapped Liability**: Triggered solely by *"Intentional Fraud or Reckless Disregard of Known Cryptographic Vulnerabilities"* \`[MSA § 9.2, APEX-0016]\`.
- **Delaware Definition of "Reckless Disregard"**: In *Jardel Co., Inc. v. Hughes*, 523 A.2d 518 (Del. 1987), the Delaware Supreme Court defined reckless disregard as a conscious indifference (an *"I-don't-care attitude"*) where the actor knows of a substantial risk and consciously chooses to proceed \`[AUTH-DEL-0001]\`.

#### 3. Application to the Record
- **Undisputed Breach of §§ 4.1 & 4.2**: Meridian mirrored Apex's biometric shards to \`us-west-staging-04\` without FIPS 140-3 Level 3 HSM encryption (violating § 4.1) and to a third-party colocation subprocessor without 30 days' prior written consent (violating § 4.2) \`[Vance Dep. 41:4–11, 59:1–7, MERIDIAN-DEP-0041, 0059]\`.
- **Conscious Override of Known Cryptographic Warning**: Mr. Vance admitted under oath that his principal SRE warned him in writing at **14:10 UTC on August 2, 2026** that the HSM key-wrapping daemon was disabled on \`us-west-staging-04\`, and that he nonetheless authorized plaintext-volume fallback for 48 hours to avoid SLA penalties \`[Vance Dep. 41:12–21, MERIDIAN-DEP-0041]\`.
- This admission directly satisfies the contractual phrase *"Reckless Disregard of Known Cryptographic Vulnerabilities"* (Uncapped Tier) and, at a minimum, establishes *"Gross Negligence or Willful Misconduct"* ($5.4M Super-Cap) as a matter of law.

---

### II. Defeating Meridian's Late-Notice Defense Under MSA § 8.2

#### 1. The Record Discrepancy (2-Business-Day Delay)
Opposing counsel will argue that Section 8.2 makes 10-Business-Day notice a *"condition precedent"* to indemnification, and that Apex CISO Dr. Elena Rostova received Meridian's advisory on **August 19, 2026** but served Apex's formal indemnification demand **twelve (12) Business Days later on September 4, 2026** \`[Vance Dep. 59:11–18, MERIDIAN-DEP-0059]\`.

#### 2. The Express Material-Prejudice Proviso
Section 8.2 contains an explicit negotiated savings proviso:
> *"...provided, however, that a delay in notice shall relieve Provider of its indemnification obligations **only to the extent Provider demonstrates material prejudice resulting from such delay**."* \`[MSA § 8.2, APEX-0014]\`

Under Delaware's objective contract principles (*Salamone v. Gorman*, 106 A.3d 354, 367–68 (Del. 2014)), Meridian bears the affirmative burden of proving concrete, causal prejudice from the two-day period between September 1 and September 4, 2026. Because Meridian itself discovered the breach, controlled the \`us-west-staging-04\` server logs, and notified Apex on August 19, Meridian cannot show that a 48-hour delay in Apex's formal demand letter impaired its ability to investigate or mitigate the breach.`,
    toolCalls: [
      {
        id: 'tc-seed-1',
        toolName: 'search_matter_corpus',
        args: { query: 'limitation of liability super-cap reckless disregard notice prejudice' },
        resultSummary: 'Matched 3 documents across 5 relevant sections (MSA §§ 8.2, 9.2; Vance Dep. pp. 41, 59; Delaware Authority Compendium).',
        rawOutput: 'Found matches in 01_Master_Services_Agreement_Executed.pdf [APEX-0014, APEX-0016], 02_Deposition_Marcus_Vance_2026-10-18.pdf [MERIDIAN-DEP-0041, 0059], and 03_Delaware_Authority_Compendium.md [AUTH-DEL-0001].',
        durationMs: 42,
        status: 'completed',
      },
      {
        id: 'tc-seed-2',
        toolName: 'verify_citation_lookup',
        args: {
          citation: 'Abry Partners V, L.P. v. F & W Acquisition LLC, 891 A.2d 1032 (Del. Ch. 2006)',
        },
        resultSummary:
          'Verified citation (Del. Ch. 2006): Holds that Delaware public policy precludes contractual immunization for intentional fraud, while enforcing sophisticated parties’ negotiated risk tiers for lesser culpability.',
        rawOutput:
          'CourtListener / Authority Match: Abry Partners V, L.P. v. F & W Acquisition LLC, 891 A.2d 1032 (Del. Ch. 2006). Holding verified.',
        durationMs: 118,
        status: 'completed',
      },
      {
        id: 'tc-seed-3',
        toolName: 'propose_document_redline',
        args: {
          documentId: 'doc-draft-memo-apex',
          rationaleSummary:
            'Updated Draft Summary Judgment Brief to rely on MSA § 9.2 negotiated tiers ($5.4M Super-Cap / Uncapped Reckless Disregard) and added § 8.2 material-prejudice notice analysis.',
        },
        resultSummary: 'Created Version 2 of Draft SJ Brief with redline comparison against Version 1.',
        rawOutput: 'Snapshot Version 2 saved to SQLite for doc-draft-memo-apex.',
        durationMs: 65,
        status: 'completed',
      },
    ],
    adversarialReviews: [
      {
        id: 'rev-seed-1',
        messageId: 'msg-seed-assistant-1',
        round: 1,
        criticRole: 'CITATION_AUDITOR',
        criticTitle: 'Citation & Record Auditor',
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        verdict: 'REVISE',
        severity: 'CRITICAL',
        objections: [
          {
            category: 'UNVERIFIED_CITATION',
            location: 'Initial Draft § 1 (Abry Partners holding)',
            critique:
              'Initial draft overstated Abry Partners V, L.P. v. F & W Acquisition LLC, 891 A.2d 1032 (Del. Ch. 2006), claiming Delaware public policy voids liability caps for gross negligence. Per AUTH-DEL-0001, Abry Partners voids caps on public policy grounds only for intentional fraud; gross negligence and reckless disregard must be analyzed under the express negotiated tiers of MSA § 9.2 [APEX-0016].',
            requiredFix:
              'Correct the description of Abry Partners and ground the cap-piercing argument in the express language of MSA § 9.2 ($5.4M Super-Cap for Gross Negligence/Willful Misconduct and Uncapped tier for Reckless Disregard of Known Cryptographic Vulnerabilities).',
          },
          {
            category: 'RECORD_MISMATCH',
            location: 'Initial Draft § 2 (Section 8.2 Notice Timing)',
            critique:
              'Initial draft asserted that Apex "timely notified Meridian" under § 8.2. However, Vance Dep. 59:11–18 [MERIDIAN-DEP-0059] states that Apex served its demand 12 Business Days after the August 19 advisory (2 days past the 10-Business-Day window in § 8.2).',
            requiredFix:
              'Acknowledge the 12-Business-Day timing from Vance Dep. 59:11–18 and invoke the express material-prejudice savings proviso in MSA § 8.2 [APEX-0014].',
          },
        ],
        dissentingConsiderations:
          'All citations and Bates pinpoints in the revised output now strictly match the retrieved record.',
        createdAt: '2026-11-08T09:28:00.000Z',
      },
      {
        id: 'rev-seed-2',
        messageId: 'msg-seed-assistant-1',
        round: 1,
        criticRole: 'OPPOSING_COUNSEL',
        criticTitle: 'Opposing Counsel & Senior Partner Critic',
        provider: 'openai',
        model: 'o3-mini',
        verdict: 'REVISE',
        severity: 'MEDIUM',
        objections: [
          {
            category: 'LOGICAL_GAP',
            location: 'Uncapped Tier vs. $5.4M Super-Cap on Summary Judgment',
            critique:
              'On summary judgment (Rule 56), Delaware courts often treat "reckless disregard" state-of-mind determinations as a fact question if the defendant claims it acted in good faith to preserve service uptime. Relying solely on the Uncapped Tier risks denial of summary judgment.',
            requiredFix:
              'Structure the motion in the alternative: seek immediate Rule 56 partial summary judgment establishing at least the $5.4M Super-Cap (given the undisputed intentional override of § 4.1/4.2), while preserving the Uncapped "Reckless Disregard" tier.',
          },
        ],
        dissentingConsiderations:
          'Strategic Note for Supervising Counsel: While Mr. Vance’s admission of overriding the SRE’s 14:10 UTC warning is strong evidence of "Reckless Disregard of Known Cryptographic Vulnerabilities," Meridian will argue he intended a temporary 48-hour workaround. Pleading the $5.4M Super-Cap as a floor on summary judgment maximizes leverage.',
        createdAt: '2026-11-08T09:29:00.000Z',
      },
    ],
    createdAt: '2026-11-08T09:30:00.000Z',
  },
];
