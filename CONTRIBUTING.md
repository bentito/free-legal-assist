# Contributing to LexHarness

Welcome to **LexHarness**! We are building an open-source, local-first legal agent control surface designed specifically for solo practitioners and small law firms.

Whether you are a **practicing attorney, paralegal, or legal researcher** with domain knowledge, or a **software developer, AI engineer, or UI designer**, your contributions are deeply valuable.

---

## ⚖️ For Legal Professionals (Lawyers, Paralegals & Legal Scholars)

You don't need to write code to make a major impact on this project. The hardest part of applying AI to legal workflows is domain precision, ethical guardrails, and understanding practical practitioner friction.

Here are ways you can contribute:
1. **Practitioner Profiles & Local System Prompts**:
   - Suggest practice-area specific system prompts (e.g., immigration, family law, probate, civil litigation, transactional).
   - Help craft procedural guardrails and local citation rules for your jurisdiction.
2. **Adversarial Critique Workflows**:
   - Define checklist items for what an adversarial critic (like opposing counsel or a senior partner review) should examine before work product is finalized.
3. **Feature Requests & Workflow Feedback**:
   - Share real-world bottlenecks: how discovery review, chronology tracking, or redline comparison fits into your daily billing and drafting habits.
   - Use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.yml) on GitHub to describe legal use cases.
4. **Testing with Real Practice Scenarios**:
   - Test LexHarness on mock matters and tell us where the agent loop hallucinates, misses pinpoints, or suggests ungrounded language.

---

## 💻 For Developers & Engineers

LexHarness is built as a cross-platform desktop application using modern web technologies and a local agent orchestration architecture:
- **Desktop Shell**: Electron 33, TypeScript 5
- **Frontend / Control Surface**: React 18, Vite 6, Tailwind CSS, Lucide Icons
- **Local Persistence & Matter Storage**: SQLite (`sql.js`) in the Electron main process
- **In-Process AI & Routing**: Local ONNX Runtime (`onnxruntime-node`) for intent classification and privacy scrubbing
- **Testing**: Vitest (`npm test`), TypeScript strict checking (`npm run typecheck`)

### Development Setup

1. **Prerequisites**:
   - Node.js (v20+ recommended)
   - npm (v10+)
   - Git

2. **Clone and Install**:
   ```bash
   git clone https://github.com/bentito/free-legal-assist.git
   cd free-legal-assist
   npm install
   ```

3. **Running the App**:
   - **Live Development Mode (Renderer hot-reload + Electron)**:
     ```bash
     npm run dev
     ```
   - **Direct Test Run**:
     ```bash
     npm start
     ```

4. **Running Tests & Quality Checks**:
   ```bash
   npm run typecheck
   npm test
   ```

### Code Guidelines
- Write typed TypeScript; avoid using `any`.
- Keep the architecture local-first: confidential matter records, client notes, and database queries should never leave the local machine without explicit user configuration.
- Write unit tests under `src/main/__tests__/` or `src/renderer/__tests__/` for new business logic and agent tools.

---

## 🛠️ Contribution Workflow

1. **Check Existing Issues**: Check the GitHub issue tracker before opening a new thread.
2. **Open an Issue**: For non-trivial changes, open an issue first to discuss the design with maintainers.
3. **Fork & Branch**: Create a feature branch off `main` (e.g., `feat/immigration-profile` or `fix/sqlite-migration`).
4. **Commit Clearly**: Write descriptive commit messages.
5. **Open a Pull Request**: Submit your PR using the PR template and link any related issues.

Thank you for helping empower solo attorneys and small firms to safely harness AI!
