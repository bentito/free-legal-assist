import {
  AssembledPromptPreview,
  Matter,
  PracticeAreaId,
  SystemPromptSettings,
} from '../../shared/types';

export class PromptAssembler {
  static assembleForMatter(
    settings: SystemPromptSettings,
    matter: Matter,
    overridePracticeAreaId?: PracticeAreaId
  ): AssembledPromptPreview {
    const activePracticeId =
      overridePracticeAreaId ?? matter.practiceArea ?? settings.activePracticeAreaId;
    const preset =
      settings.practiceAreaPresets.find((p) => p.id === activePracticeId) ??
      settings.practiceAreaPresets[0];

    const primarySystemPrompt = [
      `# LAYER 1: CORE LEGAL MANDATE & ETHICAL GUARDRAILS (USER-GOVERNED v${settings.version})`,
      settings.coreLegalMandate.trim(),
      '',
      `# LAYER 2: PRACTICE AREA PERSONA — ${preset.name.toUpperCase()}`,
      preset.systemPrompt.trim(),
      '',
      `# LAYER 3: MATTER JURISDICTION, FORUM & CITATION RULES`,
      `- **Active Matter**: ${matter.name} (${matter.matterNumber})`,
      `- **Client**: ${matter.clientName}`,
      `- **Governing Jurisdiction & Forum**: ${matter.jurisdiction}`,
      `- **Mandatory Citation Manual**: ${matter.citationStyle}`,
      `- **Local Matter Corpus Scope**: All factual claims and contractual citations must be grounded in the documents indexed in \`${matter.folderPath}\` or verified via external legal authority lookup.`,
    ].join('\n');

    const citationAuditorSystemPrompt = [
      `# LAYER 4A: ADVERSARIAL CITATION & RECORD AUDITOR SYSTEM PROMPT`,
      settings.criticCitationAuditorPrompt.trim(),
      '',
      `### ACTIVE MATTER CONTEXT FOR AUDIT`,
      `- Matter: ${matter.name} (${matter.matterNumber})`,
      `- Governing Jurisdiction: ${matter.jurisdiction}`,
      `- Required Citation Format: ${matter.citationStyle}`,
    ].join('\n');

    const opposingCounselSystemPrompt = [
      `# LAYER 4B: ADVERSARIAL OPPOSING COUNSEL & REVIEWING PARTNER SYSTEM PROMPT`,
      settings.criticOpposingCounselPrompt.trim(),
      '',
      `### ACTIVE MATTER CONTEXT FOR CRITIQUE`,
      `- Matter: ${matter.name} (${matter.matterNumber})`,
      `- Client Position Being Stress-Tested: ${matter.clientName}`,
      `- Governing Jurisdiction: ${matter.jurisdiction}`,
      `- Active Practice Area Directive: ${preset.name}`,
    ].join('\n');

    return {
      matterName: matter.name,
      jurisdiction: matter.jurisdiction,
      citationStyle: matter.citationStyle,
      practiceAreaName: preset.name,
      primarySystemPrompt,
      citationAuditorSystemPrompt,
      opposingCounselSystemPrompt,
    };
  }
}
