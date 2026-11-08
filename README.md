# LexHarness — Legal Agent Harness Control Surface (macOS & Windows)

**LexHarness** is a local-first desktop control surface for lawyers, built with Electron, React, TypeScript, and SQLite. It provides an autonomous legal agent loop with **4-layer user-governed legal system prompts**, **local matter tooling**, **side-by-side redline tracking**, and a **default Multi-LLM Adversarial Review Gate**.

---

## Quick Start (macOS Test App)

### Option 1: Launch the Packaged macOS `.app`
```bash
open release/mac-arm64/LexHarness.app
```

### Option 2: Run Directly from Terminal
```bash
npm start
```

### Option 3: Run in Live Development Mode (Hot Reload)
```bash
npm run dev
```

---

## Key Capabilities Included in Phase 1

1. **Three-Pane Legal Control Surface**:
   - **Left Pane**: Matter Workspaces (`Apex Biometrics v. Meridian Cloud Systems` and `Helios Energy`), Matter Threads, and Active Multi-LLM Gate status.
   - **Center Pane**: Autonomous Legal Agent Loop stream displaying real-time local tool calls (`search_matter_corpus`, `verify_citation_lookup`, `propose_document_redline`), expandable **Multi-LLM Adversarial Review Scorecards**, and pre-review vs. post-review draft comparison.
   - **Right Pane**: **Work-Product Redline Viewer** (visualizing struck pre-audit text vs. inserted cured language), **Matter Document Corpus Reader** (with Bates ranges), and **Matter Fact & Pinpoint Chronology**.

2. **4-Layer User-Governed Legal System Prompts (`Prompt Governance & Models` button)**:
   - **Layer 1**: Core Legal Mandate & Ethical Guardrails (strict grounding, mandatory Bates/page pinpoints, explicit uncertainty flagging).
   - **Layer 2**: Practice Area Personas (*Litigation & Appellate Briefs*, *Transactional & Commercial Contracts*, *Regulatory & Compliance*, *Discovery & Fact Investigation*).
   - **Layer 3**: Matter Jurisdiction, Forum & Citation Manual (e.g., *Delaware Court of Chancery*, *The Bluebook 21st Ed.*).
   - **Layer 4**: Independent Adversarial Reviewer Prompts (*Citation & Record Auditor* + *Opposing Counsel & Reviewing Partner*).
   - **Live Assembled Prompt Inspector**: Inspect the exact combined system prompts sent to each model on every turn.

3. **Default Multi-LLM Adversarial Review Gate**:
   - Supports live API keys (encrypted via macOS Keychain / Windows DPAPI `safeStorage`) for **Anthropic Claude**, **OpenAI (o3-mini / GPT-4o)**, **Google Gemini 2.5 Pro**, and **OpenRouter / Local Endpoints**, plus a **Built-In Local Mac Test Engine** so you can test the entire agent loop, adversarial critique, and redline generation immediately before entering external API keys.
