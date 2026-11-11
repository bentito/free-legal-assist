import { LegalDatabase } from '../../db/database';
import {
  AdversarialObjection,
  LLMProviderId,
  Matter,
  MatterDocument,
} from '../../../shared/types';
import { CliAgentDriverManager } from './CliAgentDriverManager';

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

  private isCliAgentProvider(
    provider: LLMProviderId
  ): provider is 'agy-acp' | 'codex-cli' | 'claude-cli' {
    return (
      provider === 'agy-acp' ||
      provider === 'codex-cli' ||
      provider === 'claude-cli'
    );
  }

  hasLiveCredentials(provider: LLMProviderId): boolean {
    if (provider === 'legal-simulator') return false;
    if (process.env.VITEST && !process.env.TEST_LIVE_CLI) return false;
    if (this.isCliAgentProvider(provider)) {
      const overrides = this.db.getCliOverrides()[provider];
      const status = CliAgentDriverManager.probeProviderStatusSync(
        provider,
        overrides?.binaryPath
      );
      const key = this.db.getDecryptedApiKey(provider);
      return status.installed && (status.authenticated || Boolean(key));
    }
    const key = this.db.getDecryptedApiKey(provider);
    return Boolean(key && key.trim().length > 0);
  }

  async generateText(req: LLMCompletionRequest): Promise<{
    text: string;
    usedLiveApi: boolean;
    providerUsed: LLMProviderId;
    modelUsed: string;
  }> {
    if (this.isCliAgentProvider(req.provider)) {
      if (this.hasLiveCredentials(req.provider)) {
        try {
          const overrides = this.db.getCliOverrides()[req.provider];
          const cliText = await CliAgentDriverManager.runCliTurn({
            providerId: req.provider,
            model: req.model,
            systemPrompt: req.systemPrompt,
            userPrompt: req.userPrompt,
            binaryPath: overrides?.binaryPath,
            customArgs: overrides?.customArgs,
            reasoningEffort: overrides?.reasoningEffort || 'medium',
          });
          return {
            text: cliText,
            usedLiveApi: true,
            providerUsed: req.provider,
            modelUsed: req.model,
          };
        } catch (err) {
          throw new Error(
            `[${req.provider.toUpperCase()} CLI Harness Error (${req.model})]: ${(err as Error).message}`
          );
        }
      }
    }

    const apiKey = this.db.getDecryptedApiKey(req.provider);

    if (
      req.provider !== 'legal-simulator' &&
      !this.isCliAgentProvider(req.provider) &&
      apiKey &&
      apiKey.trim().length > 0
    ) {
      try {
        const liveText = await this.callLiveProvider(req, apiKey.trim());
        return {
          text: liveText,
          usedLiveApi: true,
          providerUsed: req.provider,
          modelUsed: req.model,
        };
      } catch (err) {
        throw new Error(
          `[${req.provider.toUpperCase()} API Error (${req.model})]: ${(err as Error).message}`
        );
      }
    }

    return {
      text: '',
      usedLiveApi: false,
      providerUsed: req.provider,
      modelUsed: `${req.model} (Local Legal Test Harness)`,
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
    const isVermontCriminal =
      matter.jurisdiction.toLowerCase().includes('vermont') ||
      matter.id.includes('vt') ||
      matter.practiceArea.startsWith('vt_');

    if (isVermontCriminal) {
      if (!isRevisionPass) {
        return {
          draftText: `## Initial Candidate Defense Analysis (${matter.name} — ${matter.matterNumber})

### 1. Overview of Suppression Issue
In response to your instruction (*"${userPrompt}"*), we have reviewed the discovery file in **${matter.name}** (${matter.matterNumber}) in **${matter.jurisdiction}**.

### 2. Fourth Amendment Search & Seizure Analysis
- **Motor Vehicle Stop & Exit Order**: Trooper Keller stopped Mr. Thorne on I-89 Southbound in Colchester for a rear plate light violation (\`23 V.S.A. § 1248\`). Under *Pennsylvania v. Mimms*, 434 U.S. 106 (1977), officers may routinely order a driver out of a vehicle during a traffic stop, so our challenge should focus primarily on the subsequent vehicle search.
- **Center Console Search**: Under *Arizona v. Gant*, 556 U.S. 332 (2009), Trooper Keller lacked probable cause to unlock and search the center console while Mr. Thorne was standing outside the cruiser.`,
        };
      }

      const curedSummary = (objectionsToCure || [])
        .map(
          (o, idx) =>
            `${idx + 1}. **Cured [${o.category}] (${o.location})**: ${o.requiredFix}`
        )
        .join('\n');

      const revisedVtMotion = `# REVISED VERMONT DEFENSE WORK PRODUCT & MOTION REDLINE (${matter.matterNumber})

## I. EXECUTIVE DEFENSE CONCLUSION (POST-ADVERSARIAL AUDIT)
Addressing your instruction (*"${userPrompt}"*) under **${matter.jurisdiction}**:

1. **Unlawful Exit Order Under Chapter I, Article 11 (*State v. Sprague*, 2003 VT 20)**:
   - Unlike the federal *Mimms* rule, the Vermont Supreme Court held in *State v. Sprague*, 2003 VT 20, ¶¶ 13–20, 175 Vt. 123 \`[AUTH-VT-0001]\`, that **Chapter I, Article 11 of the Vermont Constitution** prohibits routine exit orders absent objective, articulable facts supporting a reasonable suspicion of criminal activity or present danger to officer safety.
   - **Impeachment of Affidavit ¶ 5 via BWC & Rule 15 Deposition**: Although Trooper Keller's Affidavit claimed he smelled burnt cannabis before the exit order \`[STATE-0003]\`, the Body-Worn Camera recording at **23:21:10** captures him telling Corporal Davis: *"He handed me clean paperwork and no odor from the window, zero indicators of DUI, just clammed up when I asked why a Mass plate was in Winooski"* \`[STATE-BWC-0009]\`. In his **V.R.Cr.P. 15 deposition**, Trooper Keller conceded Paragraph 5 was inaccurate and admitted he ordered Mr. Thorne out at **23:16:42** solely due to Massachusetts plates and refusal to answer travel itinerary questions \`[Keller Dep. 18:4–21, DEF-DEP-0018; STATE-BWC-0004]\`.

2. **Unlawful Warrantless Console Search (*State v. Bauder*, 2007 VT 16 & *State v. Savva*, 159 Vt. 75) & No Good-Faith Exception (*State v. Oakes*, 157 Vt. 171)**:
   - Under *State v. Bauder*, 2007 VT 16, ¶¶ 14–22, 181 Vt. 392, and *State v. Savva*, 159 Vt. 75 (1991), Article 11 requires **both probable cause and actual exigent circumstances** before police may search a vehicle or closed container without a warrant \`[AUTH-VT-0001]\`.
   - Because Mr. Thorne was secured at the cruiser bumper guarded by Corporal Davis and an on-call judge was available for a **V.R.Cr.P. 41** telephonic/electronic warrant \`[Keller Dep. 26:2–19, DEF-DEP-0026]\`, no exigency existed to unlock the center console at **23:23:05** \`[STATE-BWC-0009]\`.
   - Furthermore, under *State v. Oakes*, 157 Vt. 171 (1991), Vermont rejects the federal *Leon* good-faith exception under Article 11 \`[AUTH-VT-0001]\`.

3. **Mandatory Dismissal With Prejudice Under V.R.Cr.P. 12(d)**:
   - Suppressing the contents of the center console under **V.R.Cr.P. 12(b)(3)** leaves the State unable to establish a prima facie case under **V.R.Cr.P. 12(d)**, requiring dismissal of the Information with prejudice.

---

### Revisions Applied After Multi-LLM Adversarial Gate
${curedSummary}`;

      return {
        draftText: revisedVtMotion,
        proposedRedlineContent: revisedVtMotion,
        proposedRedlineRationale: `Cured ${(objectionsToCure || []).length} adversarial objections from Vermont Citation & Discovery Record Auditor and Deputy State's Attorney Critic for prompt: "${userPrompt.slice(0, 80)}"`,
      };
    }

    // General Legal Practice simulation (e.g., Apex v. Meridian)
    const msaDoc = docs.find((d) => d.category === 'CONTRACT') ?? docs[0];
    if (!isRevisionPass) {
      return {
        draftText: `## Initial Candidate Legal Analysis (${matter.name})

In response to your instruction (*"${userPrompt}"*), we have examined the record in **${matter.name}** (${matter.matterNumber}) under **${matter.jurisdiction}**.

- **Governing Document**: Pursuant to **${msaDoc?.title ?? 'Master Agreement'}** (\`${msaDoc?.batesRange ?? 'APEX-0001'}\`), Section 4.1 requires FIPS 140-3 Level 3 HSM encryption.
- **Liability Cap & Notice**: Under *Abry Partners V, L.P. v. F & W Acquisition LLC*, 891 A.2d 1032 (Del. Ch. 2006), Delaware public policy voids limitation-of-liability clauses whenever a party acts with gross negligence, and Apex complied with Section 8.2 notice requirements.`,
      };
    }

    const curedSummary = (objectionsToCure || [])
      .map(
        (o, idx) =>
          `${idx + 1}. **Cured [${o.category}] (${o.location})**: ${o.requiredFix}`
      )
      .join('\n');

    const revisedGeneralDoc = `# REVISED LEGAL WORK PRODUCT & CLAUSE REDLINE (${matter.matterNumber})

## I. EXECUTIVE CONCLUSION (POST-ADVERSARIAL AUDIT)
1. **Tiered Cap Piercing Under MSA § 9.2 (\`APEX-0016\`)**: Anchored in the express negotiated tiers ($5.4M 3x Super-Cap for Gross Negligence/Willful Misconduct and Uncapped tier for Reckless Disregard of Known Cryptographic Vulnerabilities) rather than broad public-policy voidness.
2. **Notice Prejudice Proviso Under MSA § 8.2 (\`APEX-0014\`)**: Invokes the express material-prejudice savings proviso to defeat the 12-Business-Day notice defense.

---

### Revisions Applied After Multi-LLM Adversarial Gate
${curedSummary}`;

    return {
      draftText: revisedGeneralDoc,
      proposedRedlineContent: revisedGeneralDoc,
      proposedRedlineRationale: `Cured ${(objectionsToCure || []).length} adversarial objections from Citation Auditor & Opposing Counsel critics.`,
    };
  }
}
