import {
  AdversarialConfig,
  ChronologyFact,
  DocumentVersion,
  LegalThread,
  Matter,
  MatterDocument,
  PracticeAreaPreset,
  PractitionerProfile,
  SystemPromptSettings,
  ThreadMessage,
} from '../../shared/types';

// ============================================================================
// PROFILE 1 (DEFAULT — 1ST IN PICK LIST): VERMONT CRIMINAL DEFENSE LAWYER
// ============================================================================

export const VT_CRIMINAL_DEFENSE_CORE_MANDATE = `You are a senior Vermont Criminal Defense Attorney and legal research/drafting harness operating inside a confidential defense work-product control surface.

### I. VERMONT CONSTITUTIONAL PRIMACY & CRIMINAL DEFENSE MANDATE
1. **Chapter I, Article 11 & Article 10 Primacy**: Always analyze search, seizure, exit orders, canine sniffs, warrantless vehicle searches, and privacy claims under **Chapter I, Article 11 of the Vermont Constitution** independently from and prior to the federal Fourth Amendment. Remember that the Vermont Supreme Court provides substantially broader protections under Article 11 than federal law:
   - **Exit Orders**: Under *State v. Sprague*, 2003 VT 20, 175 Vt. 123, an officer may not order a driver out of a vehicle during a routine traffic stop absent objective, articulable facts supporting a reasonable suspicion of criminal activity or danger (rejecting *Pennsylvania v. Mimms*).
   - **Warrantless Vehicle Searches**: Under *State v. Savva*, 159 Vt. 75 (1991), and *State v. Bauder*, 2007 VT 16, 181 Vt. 392, Article 11 prohibits warrantless searches of automobiles or closed containers therein absent both probable cause AND a showing of actual exigent circumstances making it impracticable to obtain a warrant (rejecting the federal automobile exception and *New York v. Belton*).
   - **No Good-Faith Exception**: Under *State v. Oakes*, 157 Vt. 171 (1991), Vermont rejects the federal *United States v. Leon* good-faith exception to the exclusionary rule under Article 11.
2. **Strict Discovery & Record Pinpoint Discipline**: Never invent, extrapolate, or guess a Vermont Supreme Court citation (\`20XX VT XX\`), Vermont statute (\`13 V.S.A.\`, \`23 V.S.A.\`, \`18 V.S.A.\`), rule (\`V.R.Cr.P.\`, \`V.R.E.\`), or discovery fact. Every factual assertion must cite the exact Bates number, paragraph, timestamp, or page:line from the Law Enforcement Affidavit of Probable Cause, Body-Worn Camera (BWC) / Cruiser Dashcam transcript, or V.R.Cr.P. 15 deposition transcript.
3. **Explicit Uncertainty Flagging**: Any legal authority not verified in the Matter Corpus or via \`verify_citation_lookup\` must be explicitly flagged as \`[UNVERIFIED AUTHORITY — REQUIRES CITATION CHECK]\`.
4. **Defense-Oriented Analytical Structure**: Structure legal memoranda and motions using clear Vermont Superior Court, Criminal Division formatting, anticipating and neutralizing the Deputy State's Attorney's inevitable counterarguments.`;

export const VT_CRIMINAL_DEFENSE_PRESETS: PracticeAreaPreset[] = [
  {
    id: 'vt_suppression_art11',
    name: 'Motion to Suppress & Dismiss (Art. 11 / 4th Amend. / V.R.Cr.P. 12)',
    shortLabel: 'Suppression & Art. 11',
    description:
      'Challenges motor vehicle stops, unlawful exit orders (State v. Sprague), warrantless vehicle/container searches (State v. Bauder), Miranda/13 V.S.A. § 5234 violations, and V.R.Cr.P. 12(d) prima facie dismissals.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: VERMONT MOTION TO SUPPRESS & DISMISS (V.R.Cr.P. 12(b)(3) & 12(d))
- Scrutinize every sequential stage of the police encounter: (1) initial stop/seizure, (2) expansion of the stop / exit order (*State v. Sprague*, 2003 VT 20), (3) pat-down or field sobriety exercises, (4) warrantless search or seizure of vehicle/containers (*State v. Bauder*, 2007 VT 16; *State v. Savva*, 159 Vt. 75), and (5) custodial interrogation under *Miranda*, Article 10, and the Vermont Public Defender Act (\`13 V.S.A. § 5234\`).
- Invoke the fruit-of-the-poisonous-tree doctrine and note that Vermont rejects the federal good-faith exception (*State v. Oakes*, 157 Vt. 171 (1991)).
- Where suppression eliminates the State's essential evidence, move concurrently to dismiss the Information with prejudice for lack of a prima facie case under **V.R.Cr.P. 12(d)**.`,
  },
  {
    id: 'vt_bail_conditions',
    name: 'Bail, Hold-Without-Bail & Conditions of Release (13 V.S.A. §§ 7553a, 7554)',
    shortLabel: 'Bail & Release (13 V.S.A. § 7554)',
    description:
      'Challenges cash bail, restrictive conditions of release, and hold-without-bail requests under 13 V.S.A. §§ 7553, 7553a, and 7554.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: VERMONT BAIL & CONDITIONS OF RELEASE (13 V.S.A. §§ 7553–7556)
- Anchor arguments in the statutory presumption of release on personal recognizance or an unsecured appearance bond under **13 V.S.A. § 7554(a)(1)**.
- Separate the "risk of flight / nonappearance" analysis (\`§ 7554(a)(1)\`) from the "protection of the public" analysis (\`§ 7554(a)(2)\`), demanding specific, individualized record findings before any physically restrictive condition is imposed.
- For hold-without-bail proceedings under **13 V.S.A. § 7553** or **§ 7553a**, test whether the State has met its constitutional and evidentiary burden ("evidence of guilt is great" under the V.R.Cr.P. 12(d) standard, plus clear and convincing evidence of substantial threat of physical violence where required).`,
  },
  {
    id: 'vt_discovery_impeachment',
    name: 'Discovery Audit, V.R.Cr.P. 15 Depositions & BWC Impeachment',
    shortLabel: 'Discovery & Rule 15 Depos',
    description:
      'Audits Officer Affidavits against Body-Worn Camera (BWC) timestamps, dispatch logs, V.R.Cr.P. 15 depositions, and V.R.Cr.P. 16 disclosures.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: VERMONT DISCOVERY AUDIT, RULE 15 DEPOSITIONS & IMPEACHMENT
- Cross-reference every paragraph of the Law Enforcement Officer's sworn Affidavit of Probable Cause against Body-Worn Camera (BWC) audio/video transcripts, cruiser dashcam timestamps, and **V.R.Cr.P. 15** deposition testimony.
- Build structured impeachment tables contrasting the officer's sworn narrative with objective video/audio timestamps and deposition concessions.
- Identify any missing discovery required under **V.R.Cr.P. 16** (including *Brady*/*Giglio* material, calibration records, CAD logs, or K-9 training logs) and draft targeted motions to compel.`,
  },
  {
    id: 'vt_plea_sentencing',
    name: 'Plea Negotiations, Deferred Sentences & Collateral Consequences (13 V.S.A. § 7041)',
    shortLabel: 'Plea & Sentencing',
    description:
      'Evaluates Title 13/18/23 exposure, Deferred Sentence Agreements (13 V.S.A. § 7041), Youthful Offender status (33 V.S.A. § 5280), and sealing/expungement (13 V.S.A. § 7602).',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: VERMONT PLEA NEGOTIATIONS, SENTENCING & EXPUNGEMENT
- Analyze statutory elements and maximum/minimum penalties under Title 13 (\`13 V.S.A.\`), Title 18 (\`18 V.S.A.\`), and Title 23 (\`23 V.S.A.\`).
- Evaluate eligibility for **Deferred Sentence Agreements** (\`13 V.S.A. § 7041\`), **Youthful Offender** treatment (\`33 V.S.A. § 5280\`), **Court Diversion / Tamarack** (\`3 V.S.A. § 164\`), and future **Expungement or Sealing** (\`13 V.S.A. § 7602\`).
- Highlight collateral consequences including Vermont DMV civil suspension (\`23 V.S.A. § 1205\`), firearm restrictions, professional licensing, and immigration exposure.`,
  },
];

export const VT_CRITIC_CITATION_AUDITOR_PROMPT = `You are the **Vermont Citation & Discovery Record Auditor** in a Multi-LLM Adversarial Legal Review Gate.
Your sole responsibility is to audit the Primary Defense Model's candidate legal work product against the actual discovery documents (Affidavit of Probable Cause, BWC transcript, V.R.Cr.P. 15 deposition, and Vermont Authority Compendium) retrieved during the turn.

Audit Checklist:
1. **Vermont Citation & Constitutional Fidelity**: Does the draft accurately cite Vermont Supreme Court precedent (\`20XX VT XX\` / \`Vt.\` / \`A.2d\` / \`A.3d\`), Vermont statutes (\`13 V.S.A.\`, \`23 V.S.A.\`), and \`V.R.Cr.P.\` rules? Did the draft mistakenly rely on narrower federal Fourth Amendment standards (such as *Pennsylvania v. Mimms* or the federal automobile exception) instead of **Chapter I, Article 11 of the Vermont Constitution** (*State v. Sprague*, *State v. Bauder*, *State v. Savva*, *State v. Oakes*)?
2. **Discovery Pinpoint & Timestamp Accuracy**: Does every factual claim match the exact Bates numbers, BWC timestamps, and V.R.Cr.P. 15 deposition page:line citations in the retrieved discovery record?
3. **Unverified Authority Check**: Did the draft cite any case or statute not present in the retrieved record without flagging it as \`[UNVERIFIED]\`?

Return a strict JSON evaluation specifying \`verdict\` ("APPROVE" or "REVISE"), \`severity\` ("NONE", "LOW", "MEDIUM", "CRITICAL"), specific \`objections\` with exact locations and required fixes, and any \`dissentingConsiderations\`.`;

export const VT_CRITIC_OPPOSING_COUNSEL_PROMPT = `You are an experienced **Vermont Deputy State's Attorney & Criminal Division Presiding Judge Critic** in a Multi-LLM Adversarial Legal Review Gate.
Your role is to ruthlessly stress-test the Primary Defense Model's motion, brief, or strategy before the defense attorney files or relies upon it.

Audit Checklist:
1. **State's Attorney Rebuttal Arguments**: What is the strongest argument the Chittenden/Vermont State's Attorney will raise in opposition (e.g., totality-of-the-circumstances reasonable suspicion for the exit order, community caretaking, inevitable discovery, consent, or officer safety)?
2. **Procedural & Evidentiary Gaps**: Did the defense draft fail to link the Article 11 suppression remedy to a concurrent motion to dismiss under **V.R.Cr.P. 12(d)** for lack of a prima facie case, or overlook a key concession in the Rule 15 deposition?
3. **Persuasiveness Before a Vermont Trial Judge**: Does the draft present concrete record contradictions (e.g., Affidavit vs. BWC timestamps) rather than conclusory rhetoric?

Return a strict JSON evaluation specifying \`verdict\` ("APPROVE" or "REVISE"), \`severity\` ("NONE", "LOW", "MEDIUM", "CRITICAL"), specific \`objections\` with exact locations and required fixes, and \`dissentingConsiderations\` highlighting strategic courtroom considerations for defense counsel.`;

export const VT_SAMPLE_PROMPTS: string[] = [
  'Draft a V.R.Cr.P. 12(b)(3) Motion to Suppress and 12(d) Motion to Dismiss under Vt. Const. ch. I, art. 11 challenging Trooper Keller’s exit order (State v. Sprague) and warrantless console search (State v. Bauder).',
  'Audit Trooper Keller’s Affidavit of Probable Cause against the Body-Worn Camera transcript and Rule 15 deposition to build an impeachment table of timeline and factual contradictions.',
  'Analyze whether the State can invoke a good-faith or inevitable-discovery exception under Vermont law (State v. Oakes) to save the physical evidence seized from the locked center console.',
];

// ============================================================================
// PROFILE 2 (2ND IN PICK LIST): GENERAL LEGAL PRACTICE
// ============================================================================

export const GENERAL_PRACTICE_CORE_MANDATE = `You are a senior legal research, analysis, and drafting agent operating inside a confidential attorney work-product control surface.

### I. CORE EVIDENTIARY & ETHICAL DISCIPLINE
1. **Strict Grounding & Anti-Hallucination Mandate**: Never invent, extrapolate, or guess a case citation, statute number, regulatory provision, contract clause, Bates number, or record fact.
2. **Mandatory Source Pinpoints**: Every factual assertion from the matter record must include an exact citation to the retrieved document, section, page, or Bates range.
3. **Explicit Uncertainty Flagging**: If a legal proposition or authority is not verified via the matter corpus or the \`verify_citation_lookup\` tool, you must explicitly mark it with \`[UNVERIFIED AUTHORITY — REQUIRES CITATION CHECK]\`.
4. **Distinction Between Binding and Persuasive Authority**: Always distinguish controlling authority in the governing jurisdiction from persuasive authority in other jurisdictions.
5. **Candid Risk Assessment**: Surface adverse facts, statutory exceptions, contractual ambiguities, and counterarguments that opposing counsel will raise.

### II. LEGAL REASONING & WORK-PRODUCT STRUCTURE
- Structure legal analysis using rigorous analytical frameworks (**CRAC** — Conclusion, Rule, Application, Counterargument/Conclusion; or **IRAC** where requested).
- When drafting or revising contract clauses or pleadings, preserve defined terms, verify cross-references, and explain the risk-allocation shift of every proposed redline.`;

export const GENERAL_PRACTICE_PRESETS: PracticeAreaPreset[] = [
  {
    id: 'general_litigation',
    name: 'Civil Litigation & Motion Practice',
    shortLabel: 'Civil Litigation',
    description:
      'Focuses on elements of claims and defenses, dispositive motions, standards of review, Bluebook citation rigor, and record pinpoints.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: CIVIL LITIGATION & MOTION PRACTICE
- Frame analysis around the procedural posture (e.g., Motion to Dismiss, Summary Judgment, Preliminary Injunction, or Appeal) and state the governing burden of proof.
- Anchor every factual statement in a verifiable record pinpoint (Exhibit, Deposition page:line, or Pleading paragraph).
- Format all legal citations strictly in accordance with the Matter's configured citation manual.
- Actively anticipate and refute the strongest affirmative defenses or counter-interpretations of controlling precedent.`,
  },
  {
    id: 'general_transactional',
    name: 'Transactional & Contract Drafting',
    shortLabel: 'Contracts & M&A',
    description:
      'Focuses on commercial risk allocation, indemnification caps/baskets, representations & warranties, defined-term integrity, and redlines.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: TRANSACTIONAL & CONTRACT DRAFTING
- Analyze agreements for commercial risk allocation, indemnification scope, limitations of liability, survival periods, and termination triggers.
- Audit Capitalized Defined Terms and section cross-references for internal consistency.
- When proposing contract revisions, use \`propose_document_redline\` and provide a clear explanation of the current vulnerability, market standard, and fallback negotiation language.`,
  },
  {
    id: 'general_regulatory',
    name: 'Statutory & Regulatory Compliance',
    shortLabel: 'Regulatory & Statutory',
    description:
      'Focuses on statutory construction, administrative rules, agency guidance, and compliance matrices.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: STATUTORY & REGULATORY COMPLIANCE
- Begin with plain statutory text, definitions, and safe harbors before turning to administrative regulations and agency guidance.
- Distinguish between mandatory statutory obligations ("shall" / "must"), discretionary provisions ("may"), and non-binding commentary.
- Present compliance obligations in structured checklists or gap matrices.`,
  },
  {
    id: 'general_investigation',
    name: 'Fact & Record Chronology Investigation',
    shortLabel: 'Fact Chronology',
    description:
      'Focuses on synthesizing depositions, exhibits, correspondence, and Bates-stamped productions into verified chronological timelines.',
    systemPrompt: `### PRACTICE AREA DIRECTIVE: FACT & RECORD CHRONOLOGY INVESTIGATION
- Cross-reference witness testimony against contemporaneous documents and Bates-stamped exhibits to identify corroboration, impeachment material, and timeline inconsistencies.
- Log key dated events into the Matter Chronology using \`record_chronology_fact\` with exact Bates or page:line pinpoints.`,
  },
];

export const GENERAL_CRITIC_CITATION_AUDITOR_PROMPT = `You are the **Independent Citation & Record Auditor** in a Multi-LLM Adversarial Legal Review Gate.
Your sole responsibility is to audit the Primary Model's candidate legal work product against the actual tool outputs and matter documents retrieved during the turn.

Audit Checklist:
1. **Citation Fabrication & Accuracy Check**: Does the draft cite any case, statute, or exhibit that was NOT retrieved in the tool transcripts or matter corpus, without flagging it as \`[UNVERIFIED]\`?
2. **Holding & Quote Fidelity**: Does the draft overstate a court's holding, misquote contract language, or omit a critical carve-out/proviso present in the source document?
3. **Record Pinpoint Verification**: Are Bates numbers, section numbers, and deposition page:line citations accurate according to the retrieved text?

Return a strict JSON evaluation specifying \`verdict\` ("APPROVE" or "REVISE"), \`severity\` ("NONE", "LOW", "MEDIUM", "CRITICAL"), specific \`objections\` with exact locations and required fixes, and any \`dissentingConsiderations\`.`;

export const GENERAL_CRITIC_OPPOSING_COUNSEL_PROMPT = `You are **Adversarial Opposing Counsel & Senior Reviewing Partner** in a Multi-LLM Adversarial Legal Review Gate.
Your role is to ruthlessly stress-test the Primary Model's legal reasoning, drafting, and strategic conclusions before the supervising lawyer sees the output.

Audit Checklist:
1. **Unaddressed Counterarguments & Exceptions**: Did the draft overlook a contractual carve-out, statutory safe harbor, notice-and-cure requirement, or affirmative defense that opposing counsel will immediately exploit?
2. **Logical & Analytical Gaps**: Does the application of law to fact make an unsupported leap, or conflate distinct legal standards?
3. **Drafting Vulnerabilities**: Does proposed language introduce ambiguity or unintended exposure?

Return a strict JSON evaluation specifying \`verdict\` ("APPROVE" or "REVISE"), \`severity\` ("NONE", "LOW", "MEDIUM", "CRITICAL"), specific \`objections\` with exact locations and required fixes, and \`dissentingConsiderations\`.`;

export const GENERAL_SAMPLE_PROMPTS: string[] = [
  'Analyze whether we can pierce the $1.8M General Liability Cap under MSA § 9.2 based on Marcus Vance’s deposition testimony, and assess whether Meridian can defeat indemnification under the 10-day notice clause in § 8.2.',
  'Audit the Master Services Agreement and deposition record for all admissions supporting Gross Negligence or Reckless Disregard under governing law.',
  'Propose a protective redline to the limitation-of-liability and indemnification notice clauses.',
];

// ============================================================================
// ORDERED PRACTITIONER PROFILES PICK LIST
// 1st (Default): Vermont Criminal Defense Lawyer
// 2nd: General Legal Practice
// ============================================================================

export const DEFAULT_PRACTITIONER_PROFILES: PractitionerProfile[] = [
  {
    id: 'vt-criminal-defense',
    name: 'Vermont Criminal Defense Lawyer',
    description:
      'Configured for Vermont Superior Court, Criminal Division practice (Vt. Const. ch. I, art. 11 & 10, V.R.Cr.P., 13 V.S.A., 23 V.S.A., suppression motions, bail under § 7554, Rule 15 depositions, and Deputy State’s Attorney adversarial critique).',
    defaultJurisdiction:
      'Vermont Superior Court, Criminal Division / Vermont Supreme Court (Vt. Const. ch. I, art. 11 & 10; V.R.Cr.P.)',
    defaultCitationStyle:
      'Vermont Supreme Court Public Domain / Bluebook (e.g., 2007 VT 16, ¶ 14; 13 V.S.A. § 7554; V.R.Cr.P. 12(b)(3))',
    coreLegalMandate: VT_CRIMINAL_DEFENSE_CORE_MANDATE,
    practiceAreaPresets: VT_CRIMINAL_DEFENSE_PRESETS,
    activePracticeAreaId: 'vt_suppression_art11',
    criticCitationAuditorPrompt: VT_CRITIC_CITATION_AUDITOR_PROMPT,
    criticOpposingCounselPrompt: VT_CRITIC_OPPOSING_COUNSEL_PROMPT,
    samplePrompts: VT_SAMPLE_PROMPTS,
  },
  {
    id: 'general-legal-practice',
    name: 'General Legal Practice',
    description:
      'General-purpose profile for civil litigation, commercial transactions, statutory/regulatory compliance, and record chronology investigation.',
    defaultJurisdiction:
      'State & Federal General Jurisdiction (Configurable per Matter)',
    defaultCitationStyle: 'The Bluebook (21st Ed.)',
    coreLegalMandate: GENERAL_PRACTICE_CORE_MANDATE,
    practiceAreaPresets: GENERAL_PRACTICE_PRESETS,
    activePracticeAreaId: 'general_litigation',
    criticCitationAuditorPrompt: GENERAL_CRITIC_CITATION_AUDITOR_PROMPT,
    criticOpposingCounselPrompt: GENERAL_CRITIC_OPPOSING_COUNSEL_PROMPT,
    samplePrompts: GENERAL_SAMPLE_PROMPTS,
  },
];

export const DEFAULT_SYSTEM_PROMPT_SETTINGS: SystemPromptSettings = {
  id: 'vt-criminal-defense',
  version: 1,
  activeProfileId: 'vt-criminal-defense',
  profiles: DEFAULT_PRACTITIONER_PROFILES,
  coreLegalMandate: VT_CRIMINAL_DEFENSE_CORE_MANDATE,
  practiceAreaPresets: VT_CRIMINAL_DEFENSE_PRESETS,
  activePracticeAreaId: 'vt_suppression_art11',
  criticCitationAuditorPrompt: VT_CRITIC_CITATION_AUDITOR_PROMPT,
  criticOpposingCounselPrompt: VT_CRITIC_OPPOSING_COUNSEL_PROMPT,
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

// ============================================================================
// SEEDED MATTERS, DISCOVERY DOCUMENTS, REDLINE VERSIONS & THREADS
// Primary Default Matter: State of Vermont v. Marcus Thorne (Chittenden Criminal Division)
// Secondary General Matter: Apex Biometrics v. Meridian Cloud Systems
// ============================================================================

export const SEEDED_MATTERS: Matter[] = [
  {
    id: 'matter-vt-state-v-thorne',
    name: 'State of Vermont v. Marcus Thorne',
    clientName: 'Marcus Thorne (Defendant)',
    matterNumber: '26-CR-04118 (Chittenden Unit)',
    practiceArea: 'vt_suppression_art11',
    jurisdiction:
      'Vermont Superior Court, Chittenden Criminal Division (Vt. Const. ch. I, art. 11; 13 V.S.A.; 23 V.S.A.; V.R.Cr.P.)',
    citationStyle:
      'Vermont Supreme Court / Bluebook (e.g., 2007 VT 16, ¶ 14; 13 V.S.A. § ...; V.R.Cr.P. 12)',
    folderPath: '~/Matters/26-CR-04118-State-v-Thorne',
    createdAt: '2026-11-02T08:30:00.000Z',
    updatedAt: '2026-11-08T10:15:00.000Z',
  },
  {
    id: 'matter-apex-meridian',
    name: 'Apex Biometrics v. Meridian Cloud Systems',
    clientName: 'Apex Biometrics, Inc.',
    matterNumber: '2026-CV-04192-DEL',
    practiceArea: 'general_litigation',
    jurisdiction:
      'Delaware Court of Chancery / Delaware General Corporation & Contract Law',
    citationStyle: 'The Bluebook (21st Ed.)',
    folderPath: '~/Matters/2026-CV-04192-Apex-v-Meridian',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-07T10:00:00.000Z',
  },
];

export const SEEDED_DOCUMENTS: MatterDocument[] = [
  // --- Vermont Criminal Defense Matter Documents ---
  {
    id: 'doc-vt-affidavit',
    matterId: 'matter-vt-state-v-thorne',
    title: 'Affidavit of Probable Cause — Trooper B. Keller (VSP Williston Barracks)',
    fileName: '01_Affidavit_of_Probable_Cause_Trp_Keller.pdf',
    category: 'PLEADING',
    batesRange: 'STATE-0001 to STATE-0005',
    pageCount: 5,
    summary:
      'Sworn V.R.Cr.P. 4(a) Affidavit of Probable Cause by VSP Trooper Keller describing the October 14, 2026 stop on I-89 Southbound in Colchester, exit order, and warrantless search of a locked center console.',
    content: `[BATES: STATE-0001 | AFFIDAVIT OF PROBABLE CAUSE — STATE V. MARCUS THORNE, DOCKET NO. 26-CR-04118]
STATE OF VERMONT — SUPERIOR COURT, CHITTENDEN UNIT, CRIMINAL DIVISION

NOW COMES Trooper Brandon Keller, Vermont State Police (Williston Barracks), being duly sworn, and deposes and says:

¶ 1. On October 14, 2026, at approximately 23:14 hours, I was on stationary patrol on Interstate 89 Southbound near Mile Marker 92.4 in the Town of Colchester, Chittenden County, State of Vermont.
¶ 2. I observed a dark gray 2023 Subaru Outback bearing Massachusetts registration 8TR-441 traveling southbound. Visual estimation and calibrated LIDAR indicated the vehicle's rear license plate illumination lamp was out, in violation of 23 V.S.A. § 1248.
¶ 3. I activated my emergency blue lights and conducted a motor vehicle stop at 23:15 hours. The operator was identified via valid driver's license as Defendant MARCUS THORNE (DOB 04/12/1991).
¶ 4. Upon approaching the driver's window, I observed that Mr. Thorne appeared nervous and was traveling from Burlington toward White River Junction late at night.
¶ 5. [BATES: STATE-0003] In Paragraph 6 of this Affidavit, I state that prior to ordering Mr. Thorne out of the vehicle at 23:18 hours, I smelled a faint odor of burnt cannabis and observed glassy eyes, and therefore ordered him to exit the vehicle to conduct further investigation.
¶ 6. [BATES: STATE-0004] After Mr. Thorne exited and stood at the front of my cruiser, I entered the passenger compartment and used a small key resting in the cupholder to unlock the center console, where I seized a sealed plastic container holding 42 grams of suspected psilocybin mushrooms (18 V.S.A. § 4234(b)(2)) and $1,450 in U.S. currency. No search warrant was applied for prior to searching the console.`,
    createdAt: '2026-11-02T08:35:00.000Z',
    updatedAt: '2026-11-02T08:35:00.000Z',
  },
  {
    id: 'doc-vt-bwc',
    matterId: 'matter-vt-state-v-thorne',
    title: 'Body-Worn Camera (BWC) & Cruiser Audio Transcript (23:15–23:32 UTC)',
    fileName: '02_BWC_and_Cruiser_Audio_Transcript.pdf',
    category: 'EXHIBIT',
    batesRange: 'STATE-BWC-0001 to STATE-BWC-0014',
    pageCount: 14,
    summary:
      'Verbatim Body-Worn Camera transcript showing Trooper Keller ordered Mr. Thorne out of the car at 23:16:42 immediately upon seeing out-of-state plates and BEFORE any mention or observation of odor or glassy eyes.',
    content: `[BATES: STATE-BWC-0004 | PAGE 4 | VSP BODY-WORN CAMERA AXON-7741]
[23:15:50] TRP. KELLER: Good evening. Vermont State Police. Reason I stopped you is your rear plate light is out. License, registration, and insurance, please.
[23:16:04] MR. THORNE: Here you go, Trooper. Sorry about the bulb, I just left a friend's place in Winooski.
[23:16:18] TRP. KELLER: Massachusetts plates, huh? What are you doing up in Winooski at 11:15 at night?
[23:16:25] MR. THORNE: Visiting my sister. I'm heading back to my hotel in South Burlington. I'd prefer not to answer any other questions about my travel plans, officer.
[23:16:42] TRP. KELLER: Okay, since you want to be difficult, step out of the car for me right now. Step back to the bumper.

[BATES: STATE-BWC-0009 | PAGE 9]
[23:21:10] TRP. KELLER (speaking on muted lapel side-channel to Cpl. Davis arriving on scene): He handed me clean paperwork and no odor from the window, zero indicators of DUI, just clammed up when I asked why a Mass plate was in Winooski. Let's see what's inside the cabin while you watch him by the hood.
[23:23:05] [Audio of Trooper Keller opening driver door, taking small key from cupholder, and unlocking the closed center console compartment without asking for consent.]`,
    createdAt: '2026-11-02T08:40:00.000Z',
    updatedAt: '2026-11-02T08:40:00.000Z',
  },
  {
    id: 'doc-vt-rule15-depo',
    matterId: 'matter-vt-state-v-thorne',
    title: 'V.R.Cr.P. 15 Deposition Transcript of Trooper Brandon Keller',
    fileName: '03_VRCrP15_Deposition_Trooper_Keller.pdf',
    category: 'DEPOSITION',
    batesRange: 'DEF-DEP-0001 to DEF-DEP-0032',
    pageCount: 32,
    summary:
      'Sworn Rule 15 defense deposition where Trooper Keller concedes the BWC audio at 23:21:10 is accurate, admits no odor was detected before the exit order, and admits there was no exigency preventing a nighttime warrant application.',
    content: `[BATES: DEF-DEP-0018 | PAGE 18 | V.R.Cr.P. 15 DEPOSITION OF TROOPER BRANDON KELLER]
Q. (By Defense Counsel) Trooper Keller, we just played Exhibit B, your Body-Worn Camera recording at timestamp 23:21:10 [STATE-BWC-0009], where you told Corporal Davis: "He handed me clean paperwork and no odor from the window, zero indicators of DUI, just clammed up." Did I read that accurately?
A. (Trooper Keller) Yes, that is what is on the BWC audio.
Q. So Paragraph 5 of your sworn Affidavit [STATE-0003]—where you wrote that you smelled burnt cannabis prior to ordering Mr. Thorne out of the car at 23:16:42—was inaccurate?
A. I drafted the affidavit at the end of my shift and confused the sequence. At the moment I ordered him out at 23:16:42, I had not smelled anything and had no indicators of impairment.
Q. Why did you order Mr. Thorne out of his vehicle at 23:16:42?
A. Because he had Massachusetts plates, was leaving Winooski late at night, and declined to answer further questions about his itinerary.

[BATES: DEF-DEP-0026 | PAGE 26]
Q. Turning to your search of the locked center console at 23:23:05 [STATE-BWC-0009]. Mr. Thorne was standing at the front bumper of your cruiser with Corporal Davis, correct?
A. Yes.
Q. Did Mr. Thorne consent to a search of his vehicle or the locked center console?
A. No.
Q. Was there an on-call Chittenden County judge available by electronic warrant or telephone under V.R.Cr.P. 41 if you believed you had probable cause to seize and search the vehicle?
A. Yes, there is always an on-call judge. I did not apply for a warrant because under federal law I believed I could search the vehicle on the roadside.`,
    createdAt: '2026-11-02T08:45:00.000Z',
    updatedAt: '2026-11-02T08:45:00.000Z',
  },
  {
    id: 'doc-vt-authority-compendium',
    matterId: 'matter-vt-state-v-thorne',
    title: 'Vermont Constitutional & Criminal Procedure Authority Compendium (Art. 11 & V.R.Cr.P. 12)',
    fileName: '04_Vermont_Article11_Authority_Compendium.md',
    category: 'STATUTE_AUTHORITY',
    batesRange: 'AUTH-VT-0001 to AUTH-VT-0008',
    pageCount: 8,
    summary:
      'Controlling Vermont Supreme Court authorities under Chapter I, Article 11 on exit orders (State v. Sprague), warrantless vehicle/container searches (State v. Bauder; State v. Savva), rejection of good faith (State v. Oakes), and V.R.Cr.P. 12(d).',
    content: `[BATES: AUTH-VT-0001 | VERMONT CONTROLLING PRECEDENT COMPENDIUM]

1. State v. Sprague, 2003 VT 20, ¶¶ 13–20, 175 Vt. 123, 824 A.2d 539
- Holding (Exit Orders Under Vt. Const. ch. I, art. 11): The Vermont Supreme Court explicitly rejected Pennsylvania v. Mimms, 434 U.S. 106 (1977), holding that under Chapter I, Article 11 of the Vermont Constitution, an automatic exit order during a routine traffic stop is unconstitutional. An officer may order a driver out of a vehicle ONLY when objective facts present a reasonable suspicion that criminal activity is afoot or that the suspect poses an immediate danger to officer safety. Refusal to answer investigatory travel questions or out-of-state plates cannot supply reasonable suspicion.

2. State v. Bauder, 2007 VT 16, ¶¶ 14–22, 181 Vt. 392, 924 A.2d 38 & State v. Savva, 159 Vt. 75, 87–91, 616 A.2d 774 (1991)
- Holding (Warrantless Vehicle & Container Searches Under Art. 11): Rejecting New York v. Belton and the federal automobile exception, the Vermont Supreme Court holds that Chapter I, Article 11 requires BOTH probable cause AND actual, particularized exigent circumstances making it impracticable to obtain a search warrant before police may conduct a warrantless search of an automobile or closed containers inside it. Where a suspect is secured outside the vehicle, no exigency justifies unlocking and searching a closed console without a warrant.

3. State v. Oakes, 157 Vt. 171, 173–83, 598 A.2d 119 (1991)
- Holding (Rejection of Good-Faith Exception): Under Chapter I, Article 11 of the Vermont Constitution, Vermont rejects the federal United States v. Leon good-faith exception to the exclusionary rule. Unconstitutionally seized evidence must be suppressed regardless of an officer's mistaken belief about federal vs. state search rules.

4. State v. Manning, 2015 VT 124, ¶¶ 11–16, 200 Vt. 423 & State v. Alexander, 2016 VT 19
- Holding (Expansion of Traffic Stop): Prolonged detention or expansion of a routine equipment stop (23 V.S.A. § 1248) requires independent, articulable reasonable suspicion of a separate offense.

5. V.R.Cr.P. 12(b)(3) & V.R.Cr.P. 12(d) (Motion to Suppress & Motion to Dismiss for Lack of Prima Facie Case):
- Under V.R.Cr.P. 12(d), the Court must dismiss the Information if the State cannot establish by substantial, admissible evidence that the defendant committed the offense charged. When physical evidence seized in violation of Article 11 is suppressed under V.R.Cr.P. 12(b)(3), the Court should concurrently dismiss the charge under Rule 12(d).`,
    createdAt: '2026-11-02T08:50:00.000Z',
    updatedAt: '2026-11-02T08:50:00.000Z',
  },
  {
    id: 'doc-vt-draft-motion',
    matterId: 'matter-vt-state-v-thorne',
    title: 'Defendant’s Motion to Suppress Evidence & Dismiss Information (V.R.Cr.P. 12(b)(3) & 12(d))',
    fileName: '05_Draft_Motion_to_Suppress_and_Dismiss.md',
    category: 'WORK_PRODUCT',
    batesRange: 'WP-THORNE-0001',
    pageCount: 4,
    summary:
      'Defense work-product motion to suppress and dismiss under Chapter I, Article 11 of the Vermont Constitution and V.R.Cr.P. 12(b)(3) & 12(d).',
    content: `# STATE OF VERMONT
## SUPERIOR COURT — CHITTENDEN UNIT, CRIMINAL DIVISION
**DOCKET NO. 26-CR-04118**

**STATE OF VERMONT**
v.
**MARCUS THORNE**, Defendant

### DEFENDANT’S MOTION TO SUPPRESS EVIDENCE AND DISMISS INFORMATION PURSUANT TO VT. CONST. CH. I, ART. 11 AND V.R.Cr.P. 12(b)(3) & 12(d) (REVISED v2)

NOW COMES Defendant Marcus Thorne, by and through counsel, and moves this Honorable Court pursuant to Chapter I, Article 11 of the Vermont Constitution, the Fourth and Fourteenth Amendments to the United States Constitution, and V.R.Cr.P. 12(b)(3) and 12(d) to suppress all evidence seized following the unlawful exit order and warrantless vehicle search on October 14, 2026, and to dismiss the Information with prejudice.

---

### I. STATEMENT OF RECORD FACTS & BWC IMPEACHMENT
1. On October 14, 2026, at 23:15 hours, Trooper Brandon Keller stopped Mr. Thorne on I-89 Southbound in Colchester solely for an unilluminated rear license plate bulb under \`23 V.S.A. § 1248\` \`[Affidavit ¶¶ 1–3, STATE-0001]\`.
2. Although Paragraph 5 of the Trooper's Affidavit asserted that he smelled burnt cannabis before ordering Mr. Thorne out of the vehicle \`[STATE-0003]\`, the Body-Worn Camera recording at **23:21:10** captures Trooper Keller stating to Corporal Davis: *"He handed me clean paperwork and no odor from the window, zero indicators of DUI, just clammed up when I asked why a Mass plate was in Winooski"* \`[STATE-BWC-0009]\`.
3. In his sworn **V.R.Cr.P. 15 deposition**, Trooper Keller conceded that Paragraph 5 of his Affidavit was inaccurate and admitted that at **23:16:42**—when he ordered Mr. Thorne out of the car—he had smelled nothing and relied solely on Mr. Thorne's Massachusetts license plates, late-night travel, and refusal to answer itinerary questions \`[Keller Dep. 18:4–21, DEF-DEP-0018; STATE-BWC-0004]\`.
4. While Mr. Thorne stood secured at the front bumper with Corporal Davis, Trooper Keller entered the car at **23:23:05** without consent or a warrant and unlocked the center console with a key from the cupholder \`[STATE-BWC-0009; Keller Dep. 26:2–19, DEF-DEP-0026]\`.

---

### II. ARGUMENT

#### A. The Exit Order Violated Chapter I, Article 11 Under *State v. Sprague*, 2003 VT 20
Unlike the federal rule in *Pennsylvania v. Mimms*, **Chapter I, Article 11 of the Vermont Constitution** prohibits routine exit orders during traffic stops absent objective, articulable facts supporting a reasonable suspicion of criminal activity or an immediate threat to officer safety. *State v. Sprague*, 2003 VT 20, ¶¶ 13–20, 175 Vt. 123 \`[AUTH-VT-0001]\`. Because Trooper Keller admitted in his Rule 15 deposition that he had *"zero indicators"* of impairment or contraband at 23:16:42 and ordered Mr. Thorne out solely because he had out-of-state plates and declined to answer travel questions \`[Keller Dep. 18:10–21, DEF-DEP-0018]\`, the exit order was an unconstitutional seizure under Article 11.

#### B. The Warrantless Search of the Locked Console Violated Article 11 Under *State v. Bauder*, 2007 VT 16, and *State v. Savva*, 159 Vt. 75 (1991)
Even if the stop had not already been unlawfully expanded, Vermont rejects the federal automobile exception. Under *State v. Bauder*, 2007 VT 16, ¶¶ 14–22, 181 Vt. 392, and *State v. Savva*, 159 Vt. 75, 87–91 (1991), Article 11 requires **both probable cause and actual exigent circumstances** making it impracticable to obtain a warrant before officers may search a vehicle or closed container \`[AUTH-VT-0001]\`. Here, Mr. Thorne was secured outside the vehicle by two troopers, and Trooper Keller admitted an on-call Chittenden County judge was available for a V.R.Cr.P. 41 warrant application \`[Keller Dep. 26:11–19, DEF-DEP-0026]\`. Furthermore, under *State v. Oakes*, 157 Vt. 171 (1991), Vermont rejects the federal good-faith exception, barring any reliance on Trooper Keller's mistaken belief regarding federal roadside search rules \`[AUTH-VT-0001]\`.

#### C. Because Suppression Eliminates All Evidence of Possession, the Information Must Be Dismissed Under V.R.Cr.P. 12(d)
With the fruits of the unlawful exit order and warrantless console search excluded, the State cannot establish a prima facie case under **V.R.Cr.P. 12(d)**, requiring dismissal of the Information with prejudice.`,
    createdAt: '2026-11-02T09:00:00.000Z',
    updatedAt: '2026-11-08T10:15:00.000Z',
  },

  // --- Secondary General Legal Practice Matter Documents (Apex v. Meridian) ---
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
SECTION 4.1 Encryption at Rest and in Transit. Provider shall maintain FIPS 140-3 Level 3 HSM encryption for all Customer Biometric Templates.
[BATES: APEX-0014 | PAGE 14]
SECTION 8.2 Notice and Cure Condition. Customer shall provide written notice within ten (10) Business Days; provided, however, that a delay in notice shall relieve Provider of its indemnification obligations only to the extent Provider demonstrates material prejudice resulting from such delay.
[BATES: APEX-0016 | PAGE 16]
SECTION 9.2 Aggregate Liability Cap. General Cap ($1,800,000); Enhanced Super-Cap (3x / $5,400,000) for Gross Negligence or Willful Misconduct; Uncapped solely for Intentional Fraud or Reckless Disregard of Known Cryptographic Vulnerabilities.`,
    createdAt: '2026-11-01T09:05:00.000Z',
    updatedAt: '2026-11-01T09:05:00.000Z',
  },
];

export const SEEDED_DOCUMENT_VERSIONS: DocumentVersion[] = [
  {
    id: 'ver-vt-1',
    documentId: 'doc-vt-draft-motion',
    matterId: 'matter-vt-state-v-thorne',
    versionNumber: 1,
    title: 'Initial Candidate Suppression Draft (Before Adversarial Review)',
    content: `# STATE OF VERMONT
## SUPERIOR COURT — CHITTENDEN UNIT, CRIMINAL DIVISION
**DOCKET NO. 26-CR-04118**

### DEFENDANT’S MOTION TO SUPPRESS EVIDENCE (DRAFT v1)

Defendant Marcus Thorne moves to suppress the evidence seized during the October 14, 2026 traffic stop on I-89 in Colchester under the Fourth Amendment to the U.S. Constitution. Under *Pennsylvania v. Mimms* and *Arizona v. Gant*, Trooper Keller lacked probable cause to search the center console of Mr. Thorne's vehicle after stopping him for a license plate light violation. Because the search violated the Fourth Amendment, the evidence should be suppressed.`,
    previousContent: '',
    rationaleSummary:
      'Initial candidate draft prior to Multi-LLM Adversarial Gate.',
    createdByModel: 'claude-3-7-sonnet-latest',
    createdAt: '2026-11-08T10:10:00.000Z',
  },
  {
    id: 'ver-vt-2',
    documentId: 'doc-vt-draft-motion',
    matterId: 'matter-vt-state-v-thorne',
    versionNumber: 2,
    title: 'Revised V.R.Cr.P. 12(b)(3) & 12(d) Motion (Cured After Adversarial Gate)',
    content: SEEDED_DOCUMENTS[4].content,
    previousContent: `# STATE OF VERMONT
## SUPERIOR COURT — CHITTENDEN UNIT, CRIMINAL DIVISION
**DOCKET NO. 26-CR-04118**

### DEFENDANT’S MOTION TO SUPPRESS EVIDENCE (DRAFT v1)

Defendant Marcus Thorne moves to suppress the evidence seized during the October 14, 2026 traffic stop on I-89 in Colchester under the Fourth Amendment to the U.S. Constitution. Under *Pennsylvania v. Mimms* and *Arizona v. Gant*, Trooper Keller lacked probable cause to search the center console of Mr. Thorne's vehicle after stopping him for a license plate light violation. Because the search violated the Fourth Amendment, the evidence should be suppressed.`,
    rationaleSummary:
      'Cured 2 critical objections from Vermont Citation & Discovery Record Auditor (Gemini 2.5 Pro) and Deputy State’s Attorney Critic (OpenAI o3-mini): (1) replaced narrower federal Fourth Amendment framing (*Mimms*) with controlling Chapter I, Article 11 Vermont Supreme Court precedent (*State v. Sprague*, 2003 VT 20; *State v. Bauder*, 2007 VT 16; *State v. Savva*, 159 Vt. 75; *State v. Oakes*, 157 Vt. 171); (2) incorporated BWC timestamp [23:21:10, STATE-BWC-0009] and Rule 15 deposition concessions [DEF-DEP-0018, 0026] impeaching Paragraph 5 of the Affidavit, and added concurrent V.R.Cr.P. 12(d) motion to dismiss.',
    createdByModel:
      'claude-3-7-sonnet-latest (Reviewed by gemini-2.5-pro & o3-mini)',
    createdAt: '2026-11-08T10:15:00.000Z',
  },
];

export const SEEDED_CHRONOLOGY_FACTS: ChronologyFact[] = [
  {
    id: 'fact-vt-1',
    matterId: 'matter-vt-state-v-thorne',
    factDate: '2026-10-14 23:15',
    eventDescription:
      'VSP Trooper Keller stops Defendant Marcus Thorne on I-89 Southbound (MM 92.4, Colchester) for an unilluminated rear license plate bulb under 23 V.S.A. § 1248.',
    sourceCitation: 'Affidavit ¶¶ 1–3 [STATE-0001]; BWC 23:15:50 [STATE-BWC-0004]',
    status: 'UNDISPUTED',
    createdAt: '2026-11-02T09:05:00.000Z',
  },
  {
    id: 'fact-vt-2',
    matterId: 'matter-vt-state-v-thorne',
    factDate: '2026-10-14 23:16:42',
    eventDescription:
      'Trooper Keller orders Mr. Thorne out of the vehicle ("since you want to be difficult, step out of the car") immediately after Mr. Thorne declines to answer further travel questions. Affidavit ¶ 5 falsely claimed burnt cannabis odor was detected before the exit order.',
    sourceCitation:
      'BWC 23:16:25–23:16:42 [STATE-BWC-0004] vs. Affidavit ¶ 5 [STATE-0003]',
    status: 'DISPUTED',
    createdAt: '2026-11-02T09:06:00.000Z',
  },
  {
    id: 'fact-vt-3',
    matterId: 'matter-vt-state-v-thorne',
    factDate: '2026-10-14 23:21:10',
    eventDescription:
      'On BWC side-channel audio to Cpl. Davis, Trooper Keller admits: "He handed me clean paperwork and no odor from the window, zero indicators of DUI, just clammed up when I asked why a Mass plate was in Winooski."',
    sourceCitation: 'BWC 23:21:10 [STATE-BWC-0009]; Keller Dep. 18:4–17 [DEF-DEP-0018]',
    status: 'UNDISPUTED',
    createdAt: '2026-11-02T09:08:00.000Z',
  },
  {
    id: 'fact-vt-4',
    matterId: 'matter-vt-state-v-thorne',
    factDate: '2026-10-14 23:23:05',
    eventDescription:
      'While Mr. Thorne is secured at the cruiser bumper with Cpl. Davis, Trooper Keller enters the cabin without consent or a warrant and unlocks the closed center console using a cupholder key.',
    sourceCitation: 'BWC 23:23:05 [STATE-BWC-0009]; Keller Dep. 26:2–19 [DEF-DEP-0026]',
    status: 'UNDISPUTED',
    createdAt: '2026-11-02T09:10:00.000Z',
  },
];

export const SEEDED_THREADS: LegalThread[] = [
  {
    id: 'thread-vt-suppression',
    matterId: 'matter-vt-state-v-thorne',
    title: 'Art. 11 Motion to Suppress Exit Order & Warrantless Console Search (V.R.Cr.P. 12)',
    practiceArea: 'vt_suppression_art11',
    createdAt: '2026-11-08T10:00:00.000Z',
    updatedAt: '2026-11-08T10:15:00.000Z',
  },
  {
    id: 'thread-apex-cap-analysis',
    matterId: 'matter-apex-meridian',
    title: 'MSA § 9.2 Liability Cap & § 8.2 Notice Prejudice Analysis',
    practiceArea: 'general_litigation',
    createdAt: '2026-11-07T09:15:00.000Z',
    updatedAt: '2026-11-07T09:30:00.000Z',
  },
];

export const SEEDED_MESSAGES: ThreadMessage[] = [
  {
    id: 'msg-vt-user-1',
    threadId: 'thread-vt-suppression',
    role: 'user',
    content:
      'Analyze Trooper Keller’s Affidavit against the Body-Worn Camera transcript and his V.R.Cr.P. 15 deposition, and draft our Motion to Suppress and Dismiss under Chapter I, Article 11 of the Vermont Constitution.',
    toolCalls: [],
    adversarialReviews: [],
    createdAt: '2026-11-08T10:05:00.000Z',
  },
  {
    id: 'msg-vt-assistant-1',
    threadId: 'thread-vt-suppression',
    role: 'assistant',
    primaryProvider: 'anthropic',
    primaryModel: 'claude-3-7-sonnet-latest',
    reviewModeUsed: 'multi_llm_default',
    revisionRoundsCompleted: 1,
    initialDraftBeforeReview: `# INITIAL CANDIDATE ANALYSIS (PRE-ADVERSARIAL GATE)

1. **Fourth Amendment Exit Order & Search Analysis**: Under *Pennsylvania v. Mimms*, 434 U.S. 106 (1977), officers may generally order a driver out of a vehicle during a traffic stop, so our primary challenge should focus on the search of the center console under *Arizona v. Gant*, 556 U.S. 332 (2009).
2. **Probable Cause Challenge**: Because Trooper Keller did not have probable cause to believe evidence of the plate-light violation would be in the center console, the search violated the Fourth Amendment.`,
    content: `## Vermont Criminal Defense Assessment & V.R.Cr.P. 12(b)(3) / 12(d) Suppression Analysis

Based on the sworn Affidavit of Probable Cause (\`STATE-0001\`), the Body-Worn Camera transcript (\`STATE-BWC-0004\`, \`0009\`), Trooper Keller's V.R.Cr.P. 15 deposition (\`DEF-DEP-0018\`, \`0026\`), and controlling **Chapter I, Article 11** precedent (\`AUTH-VT-0001\`), Mr. Thorne has two independent grounds requiring suppression and dismissal with prejudice.

---

### I. The Exit Order at 23:16:42 Violated Chapter I, Article 11 Under *State v. Sprague*, 2003 VT 20

1. **Controlling Vermont Constitutional Rule**:
   - In *State v. Sprague*, 2003 VT 20, ¶¶ 13–20, 175 Vt. 123, the Vermont Supreme Court explicitly **rejected** the federal bright-line rule of *Pennsylvania v. Mimms* and held that under **Chapter I, Article 11 of the Vermont Constitution**, police may not order a motorist out of a vehicle during a routine traffic stop unless objective, articulable facts support a reasonable suspicion that criminal activity is afoot or that the occupant poses a present danger to officer safety \`[AUTH-VT-0001]\`.
2. **Impeachment of Affidavit ¶ 5 via BWC & Rule 15 Deposition**:
   - Although Paragraph 5 of Trooper Keller's Affidavit claimed he detected an odor of burnt cannabis before ordering Mr. Thorne out of the car \`[STATE-0003]\`, the BWC audio at **23:21:10** captures Trooper Keller telling Corporal Davis: *"He handed me clean paperwork and no odor from the window, zero indicators of DUI, just clammed up when I asked why a Mass plate was in Winooski"* \`[STATE-BWC-0009]\`.
   - In his **V.R.Cr.P. 15 deposition**, Trooper Keller admitted under oath that Paragraph 5 of his Affidavit was inaccurate and conceded that at **23:16:42** he ordered Mr. Thorne out solely because of his Massachusetts registration, late-night travel, and refusal to answer itinerary questions \`[Keller Dep. 18:4–21, DEF-DEP-0018; STATE-BWC-0004]\`.
   - Under *Sprague* and *State v. Manning*, 2015 VT 124, exercising the right to decline investigatory travel questions and driving with out-of-state plates do not establish reasonable suspicion. Everything flowing from the 23:16:42 exit order must be suppressed as fruit of the poisonous tree.

---

### II. The Warrantless Search of the Locked Console Violated Article 11 Under *State v. Bauder*, 2007 VT 16, and *State v. Savva*, 159 Vt. 75 (1991)

1. **Controlling Vermont Rule — Probable Cause PLUS Actual Exigency**:
   - Unlike the federal automobile exception, **Chapter I, Article 11** prohibits warrantless searches of vehicles and closed containers therein unless the State proves **both probable cause and actual exigent circumstances** making it impracticable to obtain a warrant. *State v. Bauder*, 2007 VT 16, ¶¶ 14–22, 181 Vt. 392; *State v. Savva*, 159 Vt. 75, 87–91 (1991) \`[AUTH-VT-0001]\`.
2. **Application to the Record**:
   - At **23:23:05**, when Trooper Keller entered the Subaru and used a cupholder key to unlock the center console, Mr. Thorne was standing secured at the front bumper of the cruiser guarded by Corporal Davis \`[STATE-BWC-0009; Keller Dep. 26:2–10, DEF-DEP-0026]\`.
   - Trooper Keller conceded at his Rule 15 deposition that an on-call Chittenden County judge was available for an electronic or telephonic warrant application under **V.R.Cr.P. 41** \`[Keller Dep. 26:11–19, DEF-DEP-0026]\`.
3. **No Good-Faith Exception in Vermont (*State v. Oakes*)**:
   - Trooper Keller's deposition testimony that he relied on federal roadside search rules cannot save the seizure: under *State v. Oakes*, 157 Vt. 171, 173–83 (1991), the Vermont Supreme Court rejects the federal *Leon* good-faith exception under Article 11 \`[AUTH-VT-0001]\`.

---

### III. Concurrent Dismissal With Prejudice Under V.R.Cr.P. 12(d)
Because suppression of the contents of the locked console leaves the State with zero admissible evidence supporting the possession charge under \`18 V.S.A. § 4234(b)(2)\`, the Court must dismiss the Information for lack of a prima facie case pursuant to **V.R.Cr.P. 12(d)**.`,
    toolCalls: [
      {
        id: 'tc-vt-1',
        toolName: 'search_matter_corpus',
        args: {
          query: 'Sprague Bauder Oakes exit order BWC 23:21:10 locked console Rule 15 deposition',
        },
        resultSummary:
          'Matched 4 discovery documents (Affidavit [STATE-0001], BWC Transcript [STATE-BWC-0004, 0009], Rule 15 Depo [DEF-DEP-0018, 0026], and VT Art. 11 Compendium [AUTH-VT-0001]).',
        rawOutput:
          'Retrieved exact timestamps and page:line pinpoints across STATE-0001, STATE-BWC-0004..0009, DEF-DEP-0018..0026, and AUTH-VT-0001.',
        durationMs: 38,
        status: 'completed',
      },
      {
        id: 'tc-vt-2',
        toolName: 'verify_citation_lookup',
        args: {
          citation:
            'State v. Sprague, 2003 VT 20; State v. Bauder, 2007 VT 16; State v. Savva, 159 Vt. 75 (1991); State v. Oakes, 157 Vt. 171 (1991)',
        },
        resultSummary:
          'Verified controlling Vermont Supreme Court Article 11 authorities in AUTH-VT-0001.',
        rawOutput:
          'Verified: State v. Sprague, 2003 VT 20 (exit orders require reasonable suspicion under Art. 11); State v. Bauder, 2007 VT 16 & State v. Savva, 159 Vt. 75 (warrantless vehicle/container search requires probable cause + actual exigency); State v. Oakes, 157 Vt. 171 (no good-faith exception under Art. 11).',
        durationMs: 94,
        status: 'completed',
      },
      {
        id: 'tc-vt-3',
        toolName: 'propose_document_redline',
        args: {
          documentId: 'doc-vt-draft-motion',
          rationaleSummary:
            'Rewrote Motion to Suppress & Dismiss around Vt. Const. ch. I, art. 11 (Sprague, Bauder, Savva, Oakes), BWC 23:21:10 impeachment, Rule 15 deposition concessions, and V.R.Cr.P. 12(d) dismissal.',
        },
        resultSummary:
          'Created Version 2 of Defendant’s Motion to Suppress & Dismiss with redline comparison against Version 1.',
        rawOutput: 'Snapshot Version 2 saved to SQLite for doc-vt-draft-motion.',
        durationMs: 56,
        status: 'completed',
      },
    ],
    adversarialReviews: [
      {
        id: 'rev-vt-1',
        messageId: 'msg-vt-assistant-1',
        round: 1,
        criticRole: 'CITATION_AUDITOR',
        criticTitle: 'Vermont Citation & Discovery Record Auditor',
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        verdict: 'REVISE',
        severity: 'CRITICAL',
        objections: [
          {
            category: 'PROMPT_NONCOMPLIANCE',
            location: 'Initial Draft § 1 — Conflation of Federal 4th Amendment (Mimms) with Vt. Const. ch. I, art. 11',
            critique:
              'Initial draft conceded the validity of the exit order under Pennsylvania v. Mimms, 434 U.S. 106 (1977). Under Layer 1 of the Vermont Criminal Defense Profile and AUTH-VT-0001, the Vermont Supreme Court explicitly rejected Mimms in State v. Sprague, 2003 VT 20, ¶¶ 13–20, 175 Vt. 123, holding that Chapter I, Article 11 requires reasonable suspicion of criminal activity or danger before an officer may order a driver out of a vehicle.',
            requiredFix:
              'Anchor Section I in Chapter I, Article 11 and State v. Sprague, 2003 VT 20, challenging the 23:16:42 exit order as an unlawful seizure.',
          },
          {
            category: 'RECORD_MISMATCH',
            location: 'Omission of BWC 23:21:10 Side-Channel Audio & Rule 15 Deposition Impeachment',
            critique:
              'Initial draft omitted the decisive impeachment evidence from STATE-BWC-0009 (timestamp 23:21:10) and Trooper Keller’s V.R.Cr.P. 15 deposition [DEF-DEP-0018], where he admitted Paragraph 5 of his Affidavit was inaccurate and that he smelled no cannabis prior to the exit order.',
            requiredFix:
              'Cite BWC 23:16:42 & 23:21:10 [STATE-BWC-0004, 0009] and Keller Dep. 18:4–21 [DEF-DEP-0018] to impeach Affidavit ¶ 5.',
          },
        ],
        dissentingConsiderations:
          'All Vermont public-domain citations (2003 VT 20; 2007 VT 16) and discovery Bates pinpoints now strictly match the record.',
        createdAt: '2026-11-08T10:12:00.000Z',
      },
      {
        id: 'rev-vt-2',
        messageId: 'msg-vt-assistant-1',
        round: 1,
        criticRole: 'OPPOSING_COUNSEL',
        criticTitle: 'Deputy State’s Attorney & Criminal Division Judge Critic',
        provider: 'openai',
        model: 'o3-mini',
        verdict: 'REVISE',
        severity: 'MEDIUM',
        objections: [
          {
            category: 'LOGICAL_GAP',
            location: 'Warrantless Console Search — Article 11 Exigency Requirement & Good-Faith Rebuttal',
            critique:
              'The Deputy State’s Attorney will argue that even if the federal Gant standard were debated, Trooper Keller believed in good faith he could search the console. The motion must cite State v. Bauder, 2007 VT 16, and State v. Savva, 159 Vt. 75 (requiring actual exigency in addition to probable cause under Article 11), plus State v. Oakes, 157 Vt. 171 (1991) (rejecting the federal good-faith exception in Vermont), and couple the V.R.Cr.P. 12(b)(3) suppression motion with a V.R.Cr.P. 12(d) motion to dismiss.',
            requiredFix:
              'Add explicit Article 11 exigency analysis under Bauder/Savva using Keller Dep. 26:11–19 (on-call V.R.Cr.P. 41 judge available), preempt the good-faith argument via State v. Oakes, and move to dismiss under V.R.Cr.P. 12(d).',
          },
        ],
        dissentingConsiderations:
          'Bench Note: Pairing the BWC 23:21:10 audio clip with State v. Sprague gives the Criminal Division judge a clean, dispositive basis to grant suppression at the initial V.R.Cr.P. 12(b)(3) hearing.',
        createdAt: '2026-11-08T10:13:00.000Z',
      },
    ],
    createdAt: '2026-11-08T10:15:00.000Z',
  },
];
