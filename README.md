# LexHarness

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> **Free, open-source legal drafting and case review software built to help solo practitioners and small law firms safely put AI to work for their clients.**

---

## Why LexHarness Exists

Big law firms spend millions on proprietary legal AI subscriptions and custom technology teams. Meanwhile, **solo practitioners, public defenders, legal aid attorneys, and small firms** handle the vast majority of everyday legal work without those budgets.

Many lawyers try to close that gap with consumer chatbots like standard ChatGPT or Claude web tabs—and quickly run into serious professional risks:
- **Hallucinated Case Law & Facts**: Chatbots sound confident even when inventing case citations, misstating holdings, or fabricating facts that aren't in the record.
- **No Connection to Discovery**: A chat window doesn't track Bates numbers, deposition page-and-line citations, or contradictions between a police affidavit and body-camera footage.
- **Yes-Man Answers**: Consumer chatbots are designed to agree with you. They rarely warn you when an argument is procedurally flawed or vulnerable to an obvious counterargument from opposing counsel.
- **Client Confidentiality**: Pasting sensitive client facts and privileged strategy into browser chat windows creates real ethical and confidentiality concerns.

**LexHarness was built to solve these problems.** It is a free desktop workspace for Mac and Windows that lets you use AI assistants the way good lawyers actually practice: grounded in the record, checked by a second pair of eyes, and kept under your control.

---

## How LexHarness Compares to Standard Chatbots

| What Matters in Practice | Consumer Chatbots | LexHarness |
| :--- | :--- | :--- |
| **Factual Grounding** | Paraphrases or guesses without checking the record | Reads your case exhibits and cites exact Bates numbers, transcript lines, and timestamps |
| **Citation & Record Accuracy** | Single AI pass that can hallucinate authorities | **Automatic Peer Review**: A separate Citation Auditor checks every factual and legal claim before you finish |
| **Stress-Testing Arguments** | Tends to validate whatever you ask | **Opposing Counsel Review**: Challenges your draft from the perspective of opposing counsel or the bench |
| **Reviewing Revisions** | Forces you to copy-paste blocks of text back and forth | Built-in **Redline & Document Editor** shows exact additions and deletions side by side |
| **Local Court & Practice Rules** | Defaults to generic or federal summaries | Tailored **Practitioner Profiles** for your specific jurisdiction, court rules, and citation format |
| **Client Confidentiality** | Stored in consumer browser history and cloud tabs | **Local-First**: Your matters, exhibits, and drafts live on your computer, with automatic client-name scrubbing |
| **Cost** | Expensive per-seat enterprise legal tech contracts | Free and open-source—use your own AI accounts or run local models on your machine |

---

## How It Works for Your Practice

### 1. Grounded in Your Discovery and Exhibits
Organize your work by matter and docket. Load police reports, affidavits, deposition transcripts, contracts, or exhibits directly into your case file. When you ask LexHarness to draft a motion, brief, or client memo, it searches your actual record and anchors factual assertions to specific Bates numbers, pages, and timestamps—while building a clean **Fact Chronology** along the way.

### 2. Automatic Second-Chair & Opposing Counsel Review
Solo and small-firm lawyers don't always have a colleague down the hall to mark up a brief before filing. In LexHarness, every draft can automatically go through two independent review checks before it lands on your desk:
- **Citation & Record Auditor**: Checks that every factual claim matches your exhibits and flags unsupported or questionable citations.
- **Opposing Counsel & Judicial Perspective**: Anticipates how the other side—or the judge—will attack your argument, flagging procedural weak spots so the draft can be strengthened immediately.

### 3. Redlines and In-Place Document Editing
Review your work product in a dedicated document pane. Toggle between the initial draft, the peer-reviewed revision, and a **full redline view** showing every change made to address review objections. You can edit the text directly at any time and re-run peer review with a single click whenever you add new arguments.

### 4. Built Around Your Jurisdiction and Practice Area
Every court has its own rules, constitutional doctrines, and citation habits. LexHarness lets you select or customize **Practitioner Profiles**—defining your governing forum, citation manual, and practice focus (such as criminal defense motions to suppress, civil litigation, contract review, or discovery analysis) so you never have to re-explain your local rules in every prompt.

### 5. Protect Client Privilege
Your case database and documents stay on your computer. Before a question is sent to an external AI model, LexHarness can automatically replace client and party names with neutral placeholders and restore them locally when the draft returns.

---

## Getting Started

You can explore LexHarness right away—it comes pre-loaded with a complete sample case (including discovery exhibits, transcripts, and sample motions) so you can see the full workflow before connecting any external AI accounts.

### Running From Source (Mac & Windows)

1. **Install [Node.js](https://nodejs.org/) (v20 or newer)** if you don't already have it.
2. **Download and launch LexHarness**:
   ```bash
   git clone https://github.com/bentito/free-legal-assist.git
   cd free-legal-assist
   npm install
   npm start
   ```

### Building a Standalone Desktop App

```bash
# Build a macOS application (.dmg / .app)
npm run dist:mac

# Build a Windows installer (.exe)
npm run dist:win
```

---

## Get Involved: Lawyers & Developers Welcome

LexHarness is a community project, and **the most valuable contributions come from practicing lawyers**.

- **For Attorneys, Paralegals & Legal Scholars**: Tell us what motions, contract workflows, or local court profiles would save you the most time. Share where AI assistants fall short in real practice, or contribute jurisdiction-specific guidance and review checklists—no coding required.
- **For Software Developers**: Help us make the workspace faster, simpler, and more helpful for solo and small-firm practitioners.

See our [**Contributor Guide (CONTRIBUTING.md)**](CONTRIBUTING.md) for how to share ideas, report issues, or contribute improvements.

---

## License

LexHarness is free and open-source software released under the [Apache License 2.0](LICENSE).
