<p align="center">
  <img src="public/favicon.png" width="112" height="112" alt="LexHarness Logo" />
</p>

<h1 align="center">LexHarness</h1>

<p align="center">
  <b>Free, open-source legal drafting and review workspace built to help solo practitioners, public defenders, and small law firms safely put AI to work for their clients.</b>
</p>

<p align="center">
  <a href="https://github.com/bentito/free-legal-assist/releases/latest"><img src="https://img.shields.io/github/v/release/bentito/free-legal-assist?label=Latest%20Release&color=blue" alt="Latest Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License" /></a>
  <a href="https://github.com/bentito/free-legal-assist/releases/latest"><img src="https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple" alt="macOS Apple Silicon" /></a>
  <a href="https://github.com/bentito/free-legal-assist/releases/latest"><img src="https://img.shields.io/badge/Windows-64--bit-0078D6?logo=windows" alt="Windows 64-bit" /></a>
  <a href="https://github.com/bentito/free-legal-assist/discussions"><img src="https://img.shields.io/badge/Community-Discussions-orange?logo=github" alt="Discussions" /></a>
</p>

---

## 📥 Download LexHarness

LexHarness is a desktop application for Mac and Windows. It comes pre-loaded with a complete sample matter (*John Doe v. State of Vermont* with police affidavits, body-camera transcripts, and sample suppression motions) so you can test the full workflow offline immediately.

| Platform | Recommended Installer | Alternative |
| :--- | :--- | :--- |
| **macOS** (Apple Silicon / M1, M2, M3, M4) | [**📥 Download `.dmg` Installer**](https://github.com/bentito/free-legal-assist/releases/download/v0.4.0/LexHarness-0.4.0-arm64.dmg) | [Portable `.zip`](https://github.com/bentito/free-legal-assist/releases/download/v0.4.0/LexHarness-0.4.0-arm64-mac.zip) |
| **Windows 10 / 11** (64-bit) | [**📥 Download `.exe` Installer**](https://github.com/bentito/free-legal-assist/releases/download/v0.4.0/LexHarness.Setup.0.4.0.exe) | [Portable `.zip`](https://github.com/bentito/free-legal-assist/releases/download/v0.4.0/LexHarness-0.4.0-win.zip) |

👉 *Looking for older versions or release notes? View all releases on the [Releases page](https://github.com/bentito/free-legal-assist/releases).*

---

## Why LexHarness Exists

Big law firms spend millions on proprietary legal AI subscriptions and custom technology teams. Meanwhile, **solo practitioners, public defenders, legal aid attorneys, and small firms** handle the vast majority of everyday legal work without those budgets.

Many lawyers try to close that gap with consumer chatbots like standard ChatGPT or Claude web tabs—and quickly run into serious professional risks:
- **Hallucinated Case Law & Facts**: Chatbots sound confident even when inventing case citations, misstating holdings, or fabricating facts that aren't in the record.
- **No Connection to Discovery**: A chat window doesn't track Bates numbers, deposition page-and-line citations, or contradictions between a police affidavit and body-camera footage.
- **Yes-Man Answers**: Consumer chatbots are designed to agree with you. They rarely warn you when an argument is procedurally flawed or vulnerable to an obvious counterargument from opposing counsel.
- **Client Confidentiality**: Pasting sensitive client facts and privileged strategy into browser chat windows creates real ethical and confidentiality concerns.

**LexHarness was built to solve these problems.** It is a free desktop workspace that lets you use AI assistants the way good lawyers actually practice: grounded in the record, checked by a second pair of eyes, and kept under your control on your own machine.

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
Your case database and documents stay on your computer. Before a question is sent to an external AI model, LexHarness can automatically replace client and party names with neutral placeholders and restore them locally when the draft returns. See our [Security & Confidentiality Policy](SECURITY.md) for details.

---

## 💬 Community & Discussion

Have an idea for a practice-area profile, want to ask a question, or discuss how you use LexHarness in your practice?

- **Join the conversation**: Visit [**GitHub Discussions**](https://github.com/bentito/free-legal-assist/discussions) to connect with other practitioners and contributors.
- **Report an issue**: Use our [Issue Tracker](https://github.com/bentito/free-legal-assist/issues) to report bugs or request new features.
- **Contribute**: Read our [Contributor Guide (CONTRIBUTING.md)](CONTRIBUTING.md) to see how lawyers and developers can participate.

---

## 🛠️ For Developers: Building From Source

If you want to contribute code or build the latest development version:

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or newer)
- npm (v10+)
- Git

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/bentito/free-legal-assist.git
cd free-legal-assist

# Install dependencies
npm install

# Run in live development mode (hot reload)
npm run dev

# Or run directly
npm start

# Run automated checks
npm run typecheck
npm test
```

### Packaging Installers Locally
```bash
# Package for macOS (Apple Silicon .dmg)
npm run dist:mac

# Package for Windows (.exe installer)
npm run dist:win
```

---

## License

LexHarness is free and open-source software released under the [Apache License 2.0](LICENSE).
