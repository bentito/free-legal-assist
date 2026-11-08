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
    const activeProfile =
      settings.profiles?.find((p) => p.id === settings.activeProfileId) ??
      settings.profiles?.[0];
    const profileName =
      activeProfile?.name ?? 'Vermont Criminal Defense Lawyer';

    const activePracticeId =
      overridePracticeAreaId ?? matter.practiceArea ?? settings.activePracticeAreaId;
    const preset =
      settings.practiceAreaPresets.find((p) => p.id === activePracticeId) ??
      settings.practiceAreaPresets[0];

    const primarySystemPrompt = [
      `# PRACTITIONER PROFILE: ${profileName.toUpperCase()}`,
      `# LAYER 1: CORE LEGAL MANDATE & ETHICAL GUARDRAILS`,
      settings.coreLegalMandate.trim(),
      '',
      `# LAYER 2: TASK & PRACTICE AREA DIRECTIVE — ${preset.name.toUpperCase()}`,
      preset.systemPrompt.trim(),
      '',
      `# LAYER 3: MATTER / DOCKET JURISDICTION, FORUM & CITATION RULES`,
      `- **Active Matter / Case**: ${matter.name} (${matter.matterNumber})`,
      `- **Client / Represented Party**: ${matter.clientName}`,
      `- **Governing Jurisdiction & Forum**: ${matter.jurisdiction}`,
      `- **Mandatory Citation Manual**: ${matter.citationStyle}`,
      `- **Local Matter Corpus Scope**: All factual claims, record pinpoints, and citations must be grounded in the discovery/matter files indexed in \`${matter.folderPath}\` or verified via external legal authority lookup.`,
    ].join('\n');

    const citationAuditorSystemPrompt = [
      `# LAYER 4A: ADVERSARIAL CITATION & RECORD AUDITOR SYSTEM PROMPT (${profileName.toUpperCase()})`,
      settings.criticCitationAuditorPrompt.trim(),
      '',
      `### ACTIVE MATTER CONTEXT FOR AUDIT`,
      `- Matter / Docket: ${matter.name} (${matter.matterNumber})`,
      `- Governing Jurisdiction: ${matter.jurisdiction}`,
      `- Required Citation Format: ${matter.citationStyle}`,
    ].join('\n');

    const opposingCounselSystemPrompt = [
      `# LAYER 4B: ADVERSARIAL OPPOSING COUNSEL / REVIEWING CRITIC SYSTEM PROMPT (${profileName.toUpperCase()})`,
      settings.criticOpposingCounselPrompt.trim(),
      '',
      `### ACTIVE MATTER CONTEXT FOR CRITIQUE`,
      `- Matter / Docket: ${matter.name} (${matter.matterNumber})`,
      `- Client Position Being Stress-Tested: ${matter.clientName}`,
      `- Governing Jurisdiction: ${matter.jurisdiction}`,
      `- Active Task Directive: ${preset.name}`,
    ].join('\n');

    return {
      profileName,
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
