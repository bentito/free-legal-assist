import { Matter, PiiMaskingAudit } from '../../../shared/types';
import { SecretEncryptor } from '../../db/database';

export interface MatterRosterEntity {
  name: string;
  category: 'CLIENT_NAME' | 'DOCKET_ID' | 'OFFICER_NAME' | 'JUDGE_NAME' | 'WITNESS_NAME';
  tokenPrefix: string;
}

export class PiiScrubberVault {
  private pseudonymToOriginal = new Map<string, string>();
  private originalToPseudonym = new Map<string, string>();
  private categoryCounts: Record<string, number> = {};
  private tokenIndexCounters: Record<string, number> = {};

  constructor(private encryptor?: SecretEncryptor) {}

  /**
   * Shields legal citations, Bates stamps, and BWC timestamps with temporary safe tokens
   * so they are never inadvertently matched by regex or pseudonym replacement.
   */
  private shieldProtectedEntities(input: string): { shieldedText: string; restore: (text: string) => string } {
    const shields: string[] = [];

    // 1. Bates stamps: e.g. [STATE-0001], [STATE-BWC-0014], [DEF-DEP-0018], [WP-0001]
    const batesRegex = /\[[A-Z0-9_-]+-\d{3,6}\]/g;

    // 2. Body-worn camera / discovery timestamps: e.g. 23:21:10, 02:14:22, 11:45:00
    const timestampRegex = /\b(?:[01]?\d|2[0-3]):[0-5]\d:[0-5]\d\b/g;

    // 3. Bluebook & statutory legal citations
    // e.g. 2003 VT 20, 159 Vt. 75, 434 U.S. 106, 891 A.2d 1032, 13 V.S.A. § 7554, V.R.Cr.P. 12(b)(3), Vt. Const. ch. I, art. 11
    const citationRegexes = [
      /\b\d{4}\s+VT\s+\d+\b/gi,
      /\b\d+\s+Vt\.\s+\d+\b/gi,
      /\b\d+\s+U\.S\.\s+\d+\b/gi,
      /\b\d+\s+A\.(?:2d|3d)\s+\d+\b/gi,
      /\b\d+\s+V\.S\.A\.\s*§+\s*\d+[a-z]?(?:\([a-z0-9]+\))*\b/gi,
      /\bV\.R\.Cr\.P\.\s*\d+(?:\([a-z0-9]+\))*\b/gi,
      /\bVt\.\s*Const\.\s*ch\.\s*I,\s*art\.\s*11\b/gi,
      /\bU\.S\.\s*Const\.\s*amend\.\s*IV\b/gi,
    ];

    let processed = input;

    const replaceWithShield = (match: string): string => {
      const idx = shields.length;
      shields.push(match);
      return `__LEX_SHIELD_${idx}__`;
    };

    // Shield Bates stamps first
    processed = processed.replace(batesRegex, replaceWithShield);

    // Shield Timestamps
    processed = processed.replace(timestampRegex, replaceWithShield);

    // Shield Citations
    for (const regex of citationRegexes) {
      processed = processed.replace(regex, replaceWithShield);
    }

    const restore = (text: string): string => {
      let restored = text;
      for (let i = 0; i < shields.length; i++) {
        restored = restored.split(`__LEX_SHIELD_${i}__`).join(shields[i]);
      }
      return restored;
    };

    return { shieldedText: processed, restore };
  }

  private registerMapping(original: string, category: string, tokenPrefix: string): string {
    const trimmed = original.trim();
    if (!trimmed || trimmed.length < 2) return original;

    if (this.originalToPseudonym.has(trimmed)) {
      return this.originalToPseudonym.get(trimmed)!;
    }

    const currentCount = (this.tokenIndexCounters[tokenPrefix] || 0) + 1;
    this.tokenIndexCounters[tokenPrefix] = currentCount;
    const pseudonym = `[${tokenPrefix}_${currentCount}]`;

    this.originalToPseudonym.set(trimmed, pseudonym);
    this.pseudonymToOriginal.set(pseudonym, trimmed);

    this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;
    return pseudonym;
  }

  /**
   * Pre-registers active Matter roster entities (client name, docket ID, known officers/judges).
   */
  public registerMatterRoster(matter: Matter, extraRoster: MatterRosterEntity[] = []): void {
    if (matter.clientName) {
      this.registerMapping(matter.clientName, 'CLIENT_NAME', 'CLIENT_DEFENDANT');
      // Also register individual parts if first & last name distinct
      const parts = matter.clientName.trim().split(/\s+/);
      if (parts.length > 1) {
        for (const part of parts) {
          if (part.length > 2 && !['and', 'the', 'von', 'del', 'van'].includes(part.toLowerCase())) {
            // Map individual name component to the client token
            const existingToken = this.originalToPseudonym.get(matter.clientName)!;
            this.originalToPseudonym.set(part, existingToken);
          }
        }
      }
    }

    if (matter.matterNumber) {
      this.registerMapping(matter.matterNumber, 'DOCKET_ID', 'DOCKET_ID');
      // If docket has suffix like 26-CR-04118-AM, also capture root 26-CR-04118
      const rootDocket = matter.matterNumber.replace(/-[A-Z]{2,3}$/, '');
      if (rootDocket !== matter.matterNumber && rootDocket.length >= 6) {
        const existingDocketToken = this.originalToPseudonym.get(matter.matterNumber)!;
        this.originalToPseudonym.set(rootDocket, existingDocketToken);
      }
    }

    for (const entity of extraRoster) {
      this.registerMapping(entity.name, entity.category, entity.tokenPrefix);
    }
  }

  /**
   * Scrubs PII from the provided legal text using deterministic roster matching,
   * structured regex scrubbers, and context tokens while strictly protecting
   * Bluebook citations, Bates stamps, and timestamps.
   */
  public scrub(text: string): { scrubbedText: string; audit: PiiMaskingAudit } {
    if (!text || text.trim().length === 0) {
      return {
        scrubbedText: text,
        audit: {
          entitiesDetectedCount: 0,
          categories: {},
          tokensMasked: [],
          rehydrationSuccessful: true,
        },
      };
    }

    // 1. Shield citations, Bates stamps, and timestamps
    const { shieldedText, restore } = this.shieldProtectedEntities(text);
    let working = shieldedText;

    // 2. Stage A1: Replace registered matter roster entities (longest matches first)
    const sortedRoster = Array.from(this.originalToPseudonym.entries()).sort(
      (a, b) => b[0].length - a[0].length
    );

    for (const [orig, token] of sortedRoster) {
      const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundaryRegex = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'g');
      working = working.replace(wordBoundaryRegex, token);
    }

    // 3. Stage A2: Structured regex scrubbers
    // SSN / Tax ID (e.g. 000-00-0000)
    working = working.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (match) => {
      return this.registerMapping(match, 'SSN', 'SSN_REDACTED');
    });

    // Phone Numbers (e.g. (802) 555-0199, 802-555-0199)
    working = working.replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (match) => {
      return this.registerMapping(match, 'PHONE', 'PHONE_REDACTED');
    });

    // Email Addresses
    working = working.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (match) => {
      return this.registerMapping(match, 'EMAIL', 'EMAIL_REDACTED');
    });

    // Dates of Birth explicitly labeled
    working = working.replace(/\b(?:DOB|Date of Birth|born|birthdate)[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/gi, (full, dateMatch) => {
      const token = this.registerMapping(dateMatch, 'DOB', 'DOB_REDACTED');
      return full.replace(dateMatch, token);
    });
    working = working.replace(/\b(?:born|birthdate)[:\s]+([A-Za-z]+\s+\d{1,2},\s+\d{4})\b/gi, (full, dateMatch) => {
      const token = this.registerMapping(dateMatch, 'DOB', 'DOB_REDACTED');
      return full.replace(dateMatch, token);
    });

    // Driver's License Numbers
    working = working.replace(/\b(?:DL|Driver'?s License)[:#\s]+([A-Z0-9]{6,12})\b/gi, (full, dlMatch) => {
      const token = this.registerMapping(dlMatch, 'DRIVER_LICENSE', 'DL_NUMBER');
      return full.replace(dlMatch, token);
    });

    // Physical Street Addresses (e.g. 142 North Main Street, 88 Elm Avenue, 12 Country Club Rd)
    working = working.replace(
      /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\s.,]+(?:Street|St\.|St|Avenue|Ave\.|Ave|Road|Rd\.|Rd|Boulevard|Blvd\.|Blvd|Lane|Ln\.|Ln|Drive|Dr\.|Dr|Way|Court|Ct\.)\b/g,
      (match) => {
        return this.registerMapping(match, 'ADDRESS', 'ADDRESS_REDACTED');
      }
    );

    // Financial accounts & Credit Card numbers
    working = working.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, (match) => {
      return this.registerMapping(match, 'FINANCIAL_ACCOUNT', 'ACCOUNT_REDACTED');
    });
    working = working.replace(/\b(?:Account|Acct)[:#\s]+(\d{8,16})\b/gi, (full, acctMatch) => {
      const token = this.registerMapping(acctMatch, 'FINANCIAL_ACCOUNT', 'ACCOUNT_REDACTED');
      return full.replace(acctMatch, token);
    });

    // 4. Restore shielded citations, Bates stamps, and timestamps
    const scrubbedText = restore(working);

    // 5. Build audit report
    const activePseudonyms = Array.from(this.pseudonymToOriginal.keys()).filter((tok) =>
      scrubbedText.includes(tok)
    );
    const tokensMasked = activePseudonyms;
    const entitiesDetectedCount = activePseudonyms.length;

    // Self-audit: verify rehydration restores correctly for active masked tokens
    const testRehydration = this.rehydrate(scrubbedText);
    const rehydrationSuccessful = activePseudonyms.length === 0 || activePseudonyms.every((tok) => {
      const orig = this.pseudonymToOriginal.get(tok);
      return !orig || testRehydration.includes(orig);
    });

    return {
      scrubbedText,
      audit: {
        entitiesDetectedCount,
        categories: { ...this.categoryCounts },
        tokensMasked,
        rehydrationSuccessful,
      },
    };
  }

  /**
   * Reverses pseudonymization in model responses and proposed redlines,
   * restoring original names, dockets, and confidential data for the attorney.
   */
  public rehydrate(text: string): string {
    if (!text || text.trim().length === 0) return text;
    let working = text;

    // Sort pseudonyms by length descending so longer tokens replace first
    const sortedTokens = Array.from(this.pseudonymToOriginal.entries()).sort(
      (a, b) => b[0].length - a[0].length
    );

    for (const [token, orig] of sortedTokens) {
      working = working.split(token).join(orig);
    }

    return working;
  }

  public getPseudonym(original: string): string | undefined {
    return this.originalToPseudonym.get(original);
  }

  public getOriginal(pseudonym: string): string | undefined {
    return this.pseudonymToOriginal.get(pseudonym);
  }

  public exportVaultEncrypted(): string {
    const raw = JSON.stringify(Array.from(this.pseudonymToOriginal.entries()));
    return this.encryptor ? this.encryptor.encrypt(raw) : Buffer.from(raw, 'utf8').toString('base64');
  }

  public importVaultDecrypted(cipher: string): void {
    const raw = this.encryptor ? this.encryptor.decrypt(cipher) : Buffer.from(cipher, 'base64').toString('utf8');
    const entries: [string, string][] = JSON.parse(raw);
    for (const [token, orig] of entries) {
      this.pseudonymToOriginal.set(token, orig);
      this.originalToPseudonym.set(orig, token);
    }
  }
}
