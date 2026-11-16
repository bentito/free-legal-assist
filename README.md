# LexHarness

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)

> **Open-source, local-first legal agent control surface designed to empower solo practitioners and small law firms to safely harness AI agents for their practice.**

---

## 🎯 The Mission

Large law firms have entire innovation departments, dedicated tech budgets, and bespoke data engineering teams. Meanwhile, **solo practitioners and small law firms** handle the vast majority of everyday legal representation without those resources.

General-purpose chatbots (like basic ChatGPT, Claude web apps, or generic chat interfaces) were not built for legal practice. Using generic consumer chat for client matters creates serious hazards:
- **Lack of Matter Grounding**: Chatbots answer from generalized training data and frequently invent citations, case law, or record details.
- **No Evidence Verification**: Standard chatbots cannot navigate Bates-stamped document corpora, verify deposition transcripts, or trace citations directly to local record pages.
- **Privacy & Privilege Risks**: Pasting privileged client records into cloud web forms risks exposing work product or waiving attorney-client privilege.
- **Single-Turn Bias**: Chatbots want to give immediate, pleasing answers rather than subjecting arguments to adversarial stress-testing.

**LexHarness changes this.** It provides an autonomous, multi-step **agent harness control surface** running directly on your local computer (macOS and Windows), combining local matter evidence with rigorous multi-model review gates.

---

## ⚖️ Features & Benefits: LexHarness vs. Generic Chatbots

| Dimension | Generic Chatbots | LexHarness Agent Control Surface |
| :--- | :--- | :--- |
| **Execution Model** | Single-turn conversational text generation | Multi-step autonomous agent loop with local tool execution |
| **Data Privacy & Privilege** | Matter data pasted into browser tabs / cloud memory | Local-first: matter database, evidence, and state stay on your machine |
| **Evidence Grounding** | Guesses or paraphrases without pinpoint tracking | Direct Bates-range and transcript pinpoint verification via local tools |
| **Review & Quality Control** | Single model that agrees with itself | **Default Multi-LLM Adversarial Review Gate**: Opposing Counsel & Citation Auditor critique candidate drafts before presentation |
| **Work-Product Tracking** | Unformatted text blocks | Side-by-side redline viewer showing exact additions and struck text |
| **Jurisdiction & Rules** | Generic federal-centric or hallucinated state law | Configurable 4-layer practitioner profiles with jurisdiction-specific rules |
| **Cost & Flexibility** | Locked into one proprietary vendor subscription | Bring-your-own-keys (Claude, OpenAI, Gemini, Local models via Ollama) |

---

## 🚀 Key Capabilities

1. **Three-Pane Practitioner Control Surface**:
   - **Left Pane**: Matter management, case metadata, active practitioner profiles, and review gate status.
   - **Center Pane**: Live agent reasoning loop, tool execution cards (`search_matter_corpus`, `verify_citation_lookup`, `propose_document_redline`), and adversarial scorecards.
   - **Right Pane**: Interactive side-by-side work-product redline viewer, document corpus reader with Bates ranges, and chronological fact tracker.

2. **4-Layer User-Governed System Prompts**:
   - **Layer 1: Core Legal Mandate & Ethical Guardrails**: Strict grounding, mandatory pinpoint citations, explicit uncertainty flagging.
   - **Layer 2: Practice Area Personas**: Litigation, criminal defense, commercial contracts, regulatory, or discovery investigation.
   - **Layer 3: Matter Jurisdiction & Forum**: Tailored procedural and evidentiary rules (e.g., Vermont Superior Court, Delaware Chancery).
   - **Layer 4: Adversarial Critics**: Independent reviewer prompts simulating opposing counsel and a meticulous citation auditor.

3. **Multi-LLM Adversarial Review Gate**:
   - Candidate work product is automatically audited by independent models before reaching you.
   - Catches ungrounded factual assertions, questionable legal precedents, and procedural gaps.

4. **Zero-Key Test Engine**:
   - Includes a built-in local harness simulation engine so you can evaluate the full control surface, agent loop, and redline visualizer immediately without entering API keys.

---

## 💻 Quick Start for Users & Developers

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/bentito/free-legal-assist.git
cd free-legal-assist

# Install dependencies
npm install

# Option 1: Run in live development mode (hot-reload renderer)
npm run dev

# Option 2: Run directly
npm start

# Run tests and type checking
npm run typecheck
npm test
```

### Packaging Desktop Apps

```bash
# Package for macOS
npm run dist:mac

# Package for Windows
npm run dist:win
```

---

## 🤝 Community & Contributing

We actively welcome contributions from **both legal professionals and software developers**!

- **Lawyers, Paralegals & Legal Scholars**: Share practice-area workflows, propose jurisdiction-specific prompt layers, and identify gaps in legal reasoning.
- **Developers & Engineers**: Help expand local tool executors, improve privacy filtering, and enhance the desktop control surface.

Please read our [**Contributing Guide (CONTRIBUTING.md)**](CONTRIBUTING.md) for full details on how to get involved.

---

## 📜 License

LexHarness is released under the [Apache License 2.0](LICENSE).
