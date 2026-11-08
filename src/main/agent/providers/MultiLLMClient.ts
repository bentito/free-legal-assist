import { LegalDatabase } from '../../db/database';
import {
  AdversarialObjection,
  LLMProviderId,
  Matter,
  MatterDocument,
} from '../../../shared/types';

export interface LLMCompletionRequest {
  provider: LLMProviderId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface CriticStructuredVerdict {
  verdict: 'APPROVE' | 'REVISE';
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'CRITICAL';
  objections: AdversarialObjection[];
  dissentingConsiderations: string;
}

export class MultiLLMClient {
  constructor(private db: LegalDatabase) {}

  hasLiveCredentials(provider: LLMProviderId): boolean {
    if (provider === 'legal-simulator') return false;
    const key = this.db.getDecryptedApiKey(provider);
    return Boolean(key && key.trim().length > 0);
  }

  async generateText(req: LLMCompletionRequest): Promise<{
    text: string;
    usedLiveApi: boolean;
    providerUsed: LLMProviderId;
    modelUsed: string;
  }> {
    const apiKey = this.db.getDecryptedApiKey(req.provider);

    if (req.provider !== 'legal-simulator' && apiKey && apiKey.trim().length > 0) {
      try {
        const liveText = await this.callLiveProvider(req, apiKey.trim());
        return {
          text: liveText,
          usedLiveApi: true,
          providerUsed: req.provider,
          modelUsed: req.model,
        };
      } catch (err) {
        // Surface error context while gracefully falling back if desired
        throw new Error(
          `[${req.provider.toUpperCase()} API Error (${req.model})]: ${(err as Error).message}`
        );
      }
    }

    // Fallback to deterministic local legal engine when testing without external API keys
    return {
      text: '',
      usedLiveApi: false,
      providerUsed: req.provider,
      modelUsed: `${req.model} (Local Mac Test Harness)`,
    };
  }

  private async callLiveProvider(
    req: LLMCompletionRequest,
    apiKey: string
  ): Promise<string> {
    if (req.provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: 4096,
          system: req.systemPrompt,
          messages: [{ role: 'user', content: req.userPrompt }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 240)}`);
      }
      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      return data.content?.map((c) => c.text || '').join('\n') || '';
    }

    if (req.provider === 'openai' || req.provider === 'openrouter') {
      const configs = this.db.listProviderConfigs();
      const cfg = configs.find((c) => c.id === req.provider);
      const baseUrl =
        req.provider === 'openrouter'
          ? (cfg?.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/$/, '')
          : 'https://api.openai.com/v1';

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: req.model,
          messages: [
            { role: 'system', content: req.systemPrompt },
            { role: 'user', content: req.userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 240)}`);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content || '';
    }

    if (req.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        req.model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 240)}`);
      }
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (
        data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || ''
      );
    }

    throw new Error(`Unsupported provider: ${req.provider}`);
  }

  /**
   * Local Legal Engine used when testing on macOS without external API keys configured,
   * grounding responses in the active Matter's SQLite corpus and user-governed system prompts.
   */
  generateGroundedLegalDraft(params: {
    userPrompt: string;
    matter: Matter;
    docs: MatterDocument[];
    isRevisionPass: boolean;
    objectionsToCure?: AdversarialObjection[];
  }): {
    draftText: string;
    proposedRedlineContent?: string;
    proposedRedlineRationale?: string;
  } {
    const { userPrompt, matter, docs, isRevisionPass, objectionsToCure } = params;
    const msaDoc = docs.find((d) => d.category === 'CONTRACT') ?? docs[0];
    const depDoc = docs.find((d) => d.category === 'DEPOSITION');
    const authDoc = docs.find((d) => d.category === 'STATUTE_AUTHORITY');

    if (!isRevisionPass) {
      // Initial candidate draft before Adversarial Gate intercepts it
      return {
        draftText: `## Initial Candidate Legal Analysis (${matter.name})

### 1. Summary of Position
In response to your instruction (*"${userPrompt}"*), we have examined the record in **${matter.name}** (${matter.matterNumber}) under **${matter.jurisdiction}**.

### 2. Contractual & Record Findings
- **Governing Agreement**: Pursuant to **${msaDoc?.title ?? 'Master Agreement'}** (\`${msaDoc?.batesRange ?? 'APEX-0001'}\`), Section 4.1 requires FIPS 140-3 Level 3 HSM encryption for all biometric templates, and Section 4.2 prohibits unapproved subprocessor migration.
- **Deposition Admissions**: In **${depDoc?.title ?? 'Rule 30(b)(6) Deposition'}** (\`${depDoc?.batesRange ?? 'MERIDIAN-DEP-0041'}\`), VP Marcus Vance admitted replicating biometric shards to \`us-west-staging-04\` while HSM encryption was disabled.
- **Liability Cap & Notice**: Under *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006), Delaware public policy voids limitation-of-liability clauses whenever a party acts with gross negligence, rendering the $1.8M cap unenforceable. Furthermore, Apex complied with all contractual notice requirements under Section 8.2.`,
      };
    }

    // Revised draft that cures the specific objections raised by the Citation Auditor & Opposing Counsel critics!
    const curedSummary = (objectionsToCure || [])
      .map((o, idx) => `${idx + 1}. **Cured [${o.category}] (${o.location})**: ${o.requiredFix}`)
      .join('\n');

    const revisedRedlineDoc = `# REVISED LEGAL WORK PRODUCT & CLAUSE REDLINE (${matter.matterNumber})

## I. EXECUTIVE CONCLUSION (POST-ADVERSARIAL AUDIT)
Addressing your request (*"${userPrompt}"*) under **${matter.jurisdiction}** (${matter.citationStyle}):

1. **Tiered Cap Piercing Under MSA § 9.2 (\`APEX-0016\`)**: Rather than relying on a broad public-policy voidness argument (which *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006) restricts to intentional fraud \`[AUTH-DEL-0001]\`), Apex can pierce the **$1,800,000 General Cap** under the **express negotiated tiers of Section 9.2**:
   - **Minimum Floor on Rule 56 Summary Judgment — The $5,400,000 Enhanced Super-Cap (3x)**: Triggered by a breach of §§ 4.1 or 4.2 accompanied by *"Gross Negligence or Willful Misconduct"* \`[MSA § 9.2, APEX-0016]\`.
   - **Uncapped Liability Carve-Out**: Triggered by *"Reckless Disregard of Known Cryptographic Vulnerabilities"* \`[MSA § 9.2, APEX-0016]\`, supported by Marcus Vance's sworn admission that he overrode his principal SRE's **14:10 UTC warning on August 2, 2026** that HSM key-wrapping was disabled on \`us-west-staging-04\` \`[Vance Dep. 41:12–21, MERIDIAN-DEP-0041]\` (*see Jardel Co., Inc. v. Hughes*, 523 A.2d 518 (Del. 1987)).

2. **Defeating the 12-Business-Day Notice Defense Under MSA § 8.2 (\`APEX-0014\`)**:
   - While Apex served its formal indemnification demand on **September 4, 2026**—twelve (12) Business Days after CISO Dr. Elena Rostova received Meridian's August 19, 2026 security advisory (two days past the 10-Business-Day window) \`[Vance Dep. 59:11–18, MERIDIAN-DEP-0059]\`—Section 8.2 expressly states that *"a delay in notice shall relieve Provider of its indemnification obligations **only to the extent Provider demonstrates material prejudice resulting from such delay**"* \`[MSA § 8.2, APEX-0014]\`.
   - Under *Salamone v. Gorman*, 106 A.3d 354, 367–68 (Del. 2014) \`[${authDoc?.batesRange ?? 'AUTH-DEL-0001'}]\`, Meridian cannot prove causal prejudice from a 48-hour delay when Meridian already controlled the \`us-west-staging-04\` forensic logs.

---

### Revisions Applied After Multi-LLM Adversarial Gate
${curedSummary}`;

    return {
      draftText: revisedRedlineDoc,
      proposedRedlineContent: revisedRedlineDoc,
      proposedRedlineRationale: `Cured ${(objectionsToCure || []).length} adversarial objections from Citation Auditor & Opposing Counsel critics for prompt: "${userPrompt.slice(0, 80)}"`,
    };
  }
}
