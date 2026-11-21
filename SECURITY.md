# Security & Client Confidentiality Policy

At **LexHarness**, we understand that attorneys, public defenders, and legal aid professionals have strict ethical duties under **ABA Model Rule 1.6 (Confidentiality of Information)**, state equivalents, and court confidentiality orders.

Our security model is built around **local-first control and transparency**.

---

## Architecture & Confidentiality Guarantees

### 1. Local-First Matter Storage
- **No Centralized Cloud Database**: LexHarness does not run a hosted multi-tenant backend that stores your clients' data.
- **Local On-Disk Database**: All case dockets, pleadings, discovery exhibits, deposition transcripts, notes, and work-product drafts remain stored directly on your computer inside a local SQLite database (`<userData>/lexharness-data/lexharness.sqlite`).
- **Offline / Zero-Cloud Capability**: LexHarness includes a built-in offline test engine, and can connect directly to local models (e.g., Ollama / local endpoints) so you can draft and review without sending any data over the internet.

### 2. Client Name & PII Scrubbing
- When you choose to connect an external AI provider (such as Anthropic Claude, OpenAI, or Google Gemini), LexHarness includes a local privacy gateway.
- Case rosters and confidential client identifiers can be pseudonymized locally before external dispatch, and re-hydrated with your client's real name upon response return.

### 3. Operating System-Encrypted API Keys
- Any API credentials you choose to provide are encrypted using your computer's native operating system security:
  - **macOS**: Apple Keychain via Electron `safeStorage`
  - **Windows**: Windows Data Protection API (DPAPI) via Electron `safeStorage`
- Keys are never logged in plain text or shared with third parties.

---

## Supported Versions

| Version | Supported |
| :--- | :--- |
| **0.5.x (Latest)** | ✅ Yes |
| < 0.5.0 | ❌ Upgrade to latest release |

---

## Reporting a Security Concern or Vulnerability

If you discover a security issue or potential confidentiality risk in LexHarness:

1. **Please do not open a public issue.**
2. **Submit a Private Vulnerability Report**:
   - Go to the [**Security Advisory tab**](https://github.com/bentito/free-legal-assist/security/advisories/new) on our GitHub repository and click **Report a vulnerability**.
   - Alternatively, email the maintainer directly at the email listed on their GitHub profile.
3. **What to Include**:
   - A description of the issue and potential impact on user data or confidentiality.
   - Clear steps or sample mock files to reproduce the behavior (never use real client data).
   - Your operating system (macOS or Windows) and LexHarness version.

We take security and legal confidentiality seriously and will acknowledge reports promptly and coordinate a fix and release.
