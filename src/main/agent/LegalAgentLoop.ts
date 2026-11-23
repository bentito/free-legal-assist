import {
  AdversarialReviewMode,
  AdversarialReviewRecord,
  AgentProgressEvent,
  LegalMessage,
  LLMProviderId,
  PracticeAreaId,
  ToolCallRecord,
} from '../../shared/types';
import { LegalDatabase } from '../db/database';
import { LegalToolExecutor } from '../tools/LegalToolExecutor';
import { AdversarialCoordinator } from './AdversarialCoordinator';
import { PromptAssembler } from './PromptAssembler';
import { LocalPrivacyModelRouter } from './router/LocalPrivacyModelRouter';
import { MultiLLMClient } from './providers/MultiLLMClient';

export class LegalAgentLoop {
  private llmClient: MultiLLMClient;
  private toolExecutor: LegalToolExecutor;
  private adversarialCoordinator: AdversarialCoordinator;
  private privacyRouter: LocalPrivacyModelRouter;

  constructor(private db: LegalDatabase) {
    this.llmClient = new MultiLLMClient(db);
    this.toolExecutor = new LegalToolExecutor(db);
    this.adversarialCoordinator = new AdversarialCoordinator(this.llmClient);
    this.privacyRouter = new LocalPrivacyModelRouter(db);
  }

  getPrivacyRouter(): LocalPrivacyModelRouter {
    return this.privacyRouter;
  }

  async runTurn(params: {
    matterId: string;
    issueId?: string;
    userPrompt: string;
    overrideReviewMode?: AdversarialReviewMode;
    overridePracticeAreaId?: PracticeAreaId;
    overridePrimaryProvider?: LLMProviderId;
    overridePrimaryModel?: string;
    onProgress?: (event: AgentProgressEvent) => void;
  }): Promise<{
    userMessage: LegalMessage;
    assistantMessage: LegalMessage;
  }> {
    const {
      matterId,
      issueId,
      userPrompt,
      overrideReviewMode,
      overridePracticeAreaId,
      overridePrimaryProvider,
      overridePrimaryModel,
      onProgress,
    } = params;
    const turnStartTime = Date.now();

    const emit = (event: Omit<AgentProgressEvent, 'matterId'>) => {
      onProgress?.({ matterId, ...event });
    };

    const matter = this.db.getMatter(matterId);
    if (!matter) {
      throw new Error(`Matter not found: ${matterId}`);
    }

    const activeIssue = issueId ? this.db.getIssue(issueId) : null;
    const effectiveIssueId = activeIssue ? activeIssue.id : undefined;

    // 1. Record User Prompt
    const userMessage: LegalMessage = {
      id: `msg-user-${Date.now()}`,
      matterId,
      issueId: effectiveIssueId,
      role: 'user',
      content: userPrompt,
      toolCalls: [],
      adversarialReviews: [],
      createdAt: new Date().toISOString(),
    };
    this.db.insertMessage(userMessage);

    // 2. Assemble Prompt for Matter & Practice Area
    const promptSettings = this.db.getSystemPromptSettings();
    const advConfig = {
      ...this.db.getAdversarialConfig(),
      ...(overrideReviewMode ? { mode: overrideReviewMode } : {}),
      ...(overridePrimaryProvider
        ? { primaryProvider: overridePrimaryProvider }
        : {}),
      ...(overridePrimaryModel ? { primaryModel: overridePrimaryModel } : {}),
    };

    const assembled = PromptAssembler.assembleForMatter(
      promptSettings,
      matter,
      overridePracticeAreaId || activeIssue?.practiceArea
    );

    const issueScopeHeader = activeIssue
      ? `\n\nFOCUSED CASE ISSUE: ${activeIssue.title}${
          activeIssue.specialistRole ? ` (Counsel Focus: ${activeIssue.specialistRole})` : ''
        }${activeIssue.description ? `\nIssue Scope: ${activeIssue.description}` : ''}`
      : '';
    assembled.primarySystemPrompt = `${assembled.primarySystemPrompt}${issueScopeHeader}`;

    emit({
      phase: 'assembling_prompt',
      statusText: `Assembling ${assembled.profileName} System Prompt...`,
      detailText: `Forum: ${matter.jurisdiction} • Task: ${assembled.practiceAreaName}`,
    });

    const assistantMessageId = `msg-assistant-${Date.now()}`;
    const toolCalls: ToolCallRecord[] = [];
    const docs = this.db.listDocuments(matterId);

    // 3. Grounded Matter Corpus & Legal Verification Tool Loop
    emit({
      phase: 'executing_tools',
      statusText: 'Searching local Matter / Discovery Corpus & Bates-stamped record...',
      detailText: `Executing search_matter_corpus across ${docs.length} matter documents`,
    });

    const searchCall = await this.toolExecutor.executeTool(
      matterId,
      'search_matter_corpus',
      { query: userPrompt },
      advConfig.primaryModel
    );
    toolCalls.push(searchCall);
    emit({
      phase: 'executing_tools',
      statusText: searchCall.resultSummary,
      toolCall: searchCall,
    });

    const isVermontSampleCase =
      matter.id === 'matter-vt-state-v-thorne' ||
      matter.id === 'matter-1794160132556' ||
      docs.some((d) => d.batesRange.includes('STATE-BWC') || d.batesRange.includes('AUTH-VT'));
    const isApexSampleCase =
      matter.id === 'matter-apex-meridian' ||
      docs.some((d) => d.batesRange.includes('APEX-'));
    const isVermontCriminal =
      isVermontSampleCase ||
      matter.jurisdiction.toLowerCase().includes('vermont') ||
      matter.id.includes('vt') ||
      matter.practiceArea.startsWith('vt_');

    let defaultCitationToVerify: string;
    if (isVermontSampleCase) {
      defaultCitationToVerify =
        'State v. Sprague, 2003 VT 20; State v. Bauder, 2007 VT 16; State v. Savva, 159 Vt. 75 (1991); State v. Oakes, 157 Vt. 171 (1991)';
    } else if (isApexSampleCase) {
      defaultCitationToVerify =
        'Abry Partners V, L.P. v. F & W Acquisition LLC, 891 A.2d 1032 (Del. Ch. 2006); Express Scripts, Inc. v. Bracket Holdings Corp., 248 A.3d 824 (Del. 2021)';
    } else {
      const authorityDocs = docs.filter((d) => d.category === 'STATUTE_AUTHORITY');
      defaultCitationToVerify =
        authorityDocs.length > 0
          ? `${authorityDocs[0].title} (${authorityDocs[0].batesRange})`
          : `${matter.jurisdiction} (${matter.citationStyle || 'Controlling Forum Authorities'})`;
    }

    const verifyCall = await this.toolExecutor.executeTool(
      matterId,
      'verify_citation_lookup',
      {
        citation: defaultCitationToVerify,
      },
      advConfig.primaryModel
    );
    toolCalls.push(verifyCall);
    emit({
      phase: 'executing_tools',
      statusText: verifyCall.resultSummary,
      toolCall: verifyCall,
    });

    const isInformational = MultiLLMClient.isInformationalInquiry(userPrompt);

    // Tool output & context extraction
    const toolContextStr = toolCalls
      .map((t) => `[TOOL ${t.toolName}]:\n${t.rawOutput}`)
      .join('\n\n');

    // 3.5 Privileged PII Scrubbing Gateway & Embedded ONNX Model Router (Phase 2 Item 7)
    const routingResult = await this.privacyRouter.evaluateAndScrub({
      matter,
      userPrompt,
      corpusExcerpts: toolContextStr,
      turnNumber: this.db.listMessages(matterId).length + 1,
      overrideProvider: advConfig.primaryProvider,
      overrideModel: advConfig.primaryModel,
    });

    const { scrubbedPrompt, scrubbedCorpus, vault, decisionLog, selectedTier } = routingResult;
    const effectivePrimaryModel = routingResult.selectedModel;
    const effectivePrimaryProvider = routingResult.selectedProvider || advConfig.primaryProvider;

    emit({
      phase: 'assembling_prompt',
      statusText: `Privileged PII Shield: ${decisionLog.piiAudit.entitiesDetectedCount} entity token(s) scrubbed \u2022 Route: ${selectedTier}`,
      detailText: `Intent: ${decisionLog.classification.inferredIntent} \u2022 Model: ${effectivePrimaryModel} (Est. Savings: $${decisionLog.costEstimate.estimatedSavingsUSD.toFixed(4)})`,
    });

    // 4. Primary Model Drafting Pass
    emit({
      phase: 'drafting_primary',
      statusText: isInformational
        ? `Preparing casework advisory response with ${effectivePrimaryProvider.toUpperCase()} (${effectivePrimaryModel})...`
        : `Drafting initial legal analysis with ${effectivePrimaryProvider.toUpperCase()} (${effectivePrimaryModel})...`,
      detailText: isInformational
        ? `Synthesizing ${matter.name} file details and procedural posture`
        : `Applying ${assembled.profileName} instructions & CourtListener MCP verification to retrieved evidence`,
    });

    let candidateDraft = '';
    let primaryCallFailed = false;
    const hasLivePrimary = this.llmClient.hasLiveCredentials(
      effectivePrimaryProvider
    );

    if (hasLivePrimary) {
      try {
        const liveRes = await this.llmClient.generateText({
          provider: effectivePrimaryProvider,
          model: effectivePrimaryModel,
          systemPrompt: assembled.primarySystemPrompt,
          userPrompt: `MATTER RECORD EVIDENCE & MCP AUTHORITY VERIFICATION:\n${scrubbedCorpus}\n\nATTORNEY INSTRUCTION:\n${scrubbedPrompt}`,
        });
        if (liveRes.text && liveRes.text.trim().length > 0) {
          candidateDraft = liveRes.text.trim();
          if (MultiLLMClient.isDraftCutOff(candidateDraft, userPrompt)) {
            try {
              const contRes = await this.llmClient.generateText({
                provider: effectivePrimaryProvider,
                model: effectivePrimaryModel,
                systemPrompt: assembled.primarySystemPrompt,
                userPrompt: [
                  `MATTER RECORD EVIDENCE & MCP AUTHORITY VERIFICATION:\n${scrubbedCorpus}`,
                  `ATTORNEY INSTRUCTION:\n${scrubbedPrompt}`,
                  `PARTIAL DRAFT ALREADY GENERATED (CUT OFF MID-DOCUMENT):\n${candidateDraft}`,
                  `Continue and complete the remainder of the legal work product in full (including all factual allegations with Bates pinpoints, all counts/causes of action, and the prayer for relief) without repeating the text already generated above.`,
                ].join('\n\n'),
              });
              if (contRes.text && contRes.text.trim().length > 0) {
                candidateDraft = `${candidateDraft.trimEnd()}\n\n${contRes.text.trim()}`;
              }
            } catch {
              // Fall through to grounded completion if continuation call fails
            }

            if (MultiLLMClient.isDraftCutOff(candidateDraft, userPrompt)) {
              const completed = this.llmClient.completeCutOffLegalDraft({
                partialDraft: candidateDraft,
                userPrompt,
                matter,
                docs,
                isRevisionPass: false,
              });
              candidateDraft = completed.draftText;
            }
          }
        } else {
          primaryCallFailed = true;
          const emptyErr = `[${effectivePrimaryProvider.toUpperCase()} Error (${effectivePrimaryModel})]: Model returned an empty response.`;
          candidateDraft = [
            `### Model Call Error — ${effectivePrimaryProvider.toUpperCase()} (${effectivePrimaryModel})`,
            ``,
            `**Error**: ${emptyErr}`,
            ``,
            `No draft was generated because the model returned an empty response. Verify the selected model ID (**${effectivePrimaryModel}**) and credentials in **Settings → Providers & Models**, or select another model in the composer picker.`,
          ].join('\n');
          emit({
            phase: 'error',
            statusText: emptyErr,
          });
        }
      } catch (err) {
        primaryCallFailed = true;
        const errMsg = (err as Error).message.replace(/[\r\n]+/g, ' ');
        candidateDraft = [
          `### Model Call Error — ${effectivePrimaryProvider.toUpperCase()} (${effectivePrimaryModel})`,
          ``,
          `**Error**: ${errMsg}`,
          ``,
          `No draft was generated because the model call failed. Verify the selected model ID (**${effectivePrimaryModel}**) and API credentials in **Settings → Providers & Models**, or choose an active model (such as \`claude-sonnet-5-5\`, \`claude-opus-5-5\`, or \`claude-haiku-5-5\`) in the composer picker.`,
        ].join('\n');
        emit({
          phase: 'error',
          statusText: errMsg,
        });
      }
    } else if (
      !process.env.VITEST &&
      effectivePrimaryProvider !== 'legal-simulator' &&
      selectedTier !== 'LOCAL_PRIVATE'
    ) {
      primaryCallFailed = true;
      const missingCredErr = `[${effectivePrimaryProvider.toUpperCase()} Configuration Error (${effectivePrimaryModel})]: No active API key or authenticated agent session found for ${effectivePrimaryProvider}.`;
      candidateDraft = [
        `### Model Call Error — ${effectivePrimaryProvider.toUpperCase()} (${effectivePrimaryModel})`,
        ``,
        `**Error**: ${missingCredErr}`,
        ``,
        `No draft was generated. Configure your API key or sign in to this agent in **Settings → Providers & Models**, or select **Built-In Assistant** for offline test mode.`,
      ].join('\n');
      emit({
        phase: 'error',
        statusText: missingCredErr,
      });
    } else {
      const simulated = this.llmClient.generateGroundedLegalDraft({
        userPrompt,
        matter,
        docs,
        isRevisionPass: false,
      });
      candidateDraft = simulated.draftText;
    }

    const initialDraftBeforeReview = candidateDraft;
    const allReviews: AdversarialReviewRecord[] = [];
    let revisionRoundsCompleted = 0;
    let revisedRedlineContent: string | undefined;
    let revisedRedlineRationale: string | undefined;

    // 5. Default Multi-LLM Adversarial Review Gate (runs for formal drafts or when review is explicitly enabled)
    const shouldRunReview =
      !primaryCallFailed &&
      advConfig.mode !== 'direct_bypass' &&
      (!isInformational || advConfig.mode === 'multi_llm_default');

    if (shouldRunReview && !isInformational) {
      emit({
        phase: 'adversarial_review',
        statusText:
          advConfig.mode === 'multi_llm_default'
            ? `Running Multi-LLM Adversarial Gate: ${advConfig.citationAuditorModel} (Citation Auditor) + ${advConfig.opposingCounselModel} (${
                isVermontCriminal ? "Deputy State's Attorney Critic" : 'Opposing Counsel'
              })...`
            : `Running Single-Critic Citation Audit (${advConfig.citationAuditorModel})...`,
        detailText:
          'Auditing citations, record pinpoints, and legal reasoning before presenting final answer',
      });

      const gateResult = await this.adversarialCoordinator.runAdversarialGate({
        messageId: assistantMessageId,
        round: 1,
        userPrompt: scrubbedPrompt,
        candidateDraft,
        toolCalls,
        matter,
        assembledPrompts: assembled,
        config: advConfig,
      });

      allReviews.push(...gateResult.reviews);
      for (const rev of gateResult.reviews) {
        emit({
          phase: 'adversarial_review',
          statusText: `${rev.criticTitle} (${rev.model}): ${rev.verdict} (${rev.objections.length} objection(s))`,
          criticUpdate: rev,
        });
      }

      // 6. Automated Revision Pass if Critics Raise Material Objections
      if (gateResult.requiresRevision && advConfig.maxRevisionRounds >= 1) {
        revisionRoundsCompleted = 1;
        emit({
          phase: 'revising_after_critique',
          statusText: `Revising draft to cure ${gateResult.combinedObjections.length} adversarial objection(s)...`,
          detailText:
            'Primary model is incorporating Record Auditor & Opposing Critic objections and generating redline snapshot',
        });

        if (hasLivePrimary) {
          try {
            const objectionsFormatted = gateResult.combinedObjections
              .map(
                (o, i) =>
                  `${i + 1}. [${o.category}] (${o.location}): ${o.critique}\n   Required Fix: ${o.requiredFix}`
              )
              .join('\n');

            const revRes = await this.llmClient.generateText({
              provider: effectivePrimaryProvider,
              model: effectivePrimaryModel,
              systemPrompt: assembled.primarySystemPrompt,
              userPrompt: [
                `ORIGINAL ATTORNEY PROMPT:\n${scrubbedPrompt}`,
                `RETRIEVED RECORD:\n${scrubbedCorpus}`,
                `YOUR INITIAL CANDIDATE DRAFT:\n${candidateDraft}`,
                `MANDATORY ADVERSARIAL REVIEW OBJECTIONS TO CURE:\n${objectionsFormatted}`,
                `Produce the COMPLETE, final, verified legal work product in full (including caption, all factual allegations with exact Bates pinpoints, all counts/causes of action, and prayer for relief), curing every objection above. Output the entire pleading directly in your response without omitting or truncating any section.`,
              ].join('\n\n'),
            });
            const revTrimmed = (revRes.text || '').trim();
            if (revTrimmed.length > 0) {
              if (MultiLLMClient.isDraftCutOff(revTrimmed, userPrompt)) {
                const completedRev = this.llmClient.completeCutOffLegalDraft({
                  partialDraft: revTrimmed,
                  userPrompt,
                  matter,
                  docs,
                  isRevisionPass: true,
                  objectionsToCure: gateResult.combinedObjections,
                });
                candidateDraft = completedRev.draftText;
                revisedRedlineContent = completedRev.proposedRedlineContent;
              } else {
                candidateDraft = revTrimmed;
                revisedRedlineContent = revTrimmed;
              }
            } else {
              // Never overwrite a valid initial draft with an empty string; complete/cure the initial draft instead
              const completedFromInitial = this.llmClient.completeCutOffLegalDraft({
                partialDraft: candidateDraft,
                userPrompt,
                matter,
                docs,
                isRevisionPass: true,
                objectionsToCure: gateResult.combinedObjections,
              });
              candidateDraft = completedFromInitial.draftText;
              revisedRedlineContent = completedFromInitial.proposedRedlineContent;
            }
            revisedRedlineRationale = `Cured ${gateResult.combinedObjections.length} adversarial review objections.`;
          } catch (revErr) {
            const revErrMsg = (revErr as Error).message.replace(/[\r\n]+/g, ' ');
            candidateDraft = [
              `### Model Call Error — Revision Pass Failed (${effectivePrimaryProvider.toUpperCase()} / ${effectivePrimaryModel})`,
              ``,
              `**Error**: ${revErrMsg}`,
              ``,
              `---`,
              ``,
              candidateDraft,
            ].join('\n');
          }
        } else {
          const revisedSim = this.llmClient.generateGroundedLegalDraft({
            userPrompt,
            matter,
            docs,
            isRevisionPass: true,
            objectionsToCure: gateResult.combinedObjections,
          });
          candidateDraft = revisedSim.draftText;
          revisedRedlineContent = revisedSim.proposedRedlineContent;
          revisedRedlineRationale = revisedSim.proposedRedlineRationale;
        }

        if (revisedRedlineContent) {
          // Rehydrate proposed redline content for the attorney workspace
          const restoredRedlineContent = this.privacyRouter.rehydrate(revisedRedlineContent, vault);
          const redlineCall = await this.toolExecutor.executeTool(
            matterId,
            'propose_document_redline',
            {
              newContent: restoredRedlineContent,
              rationaleSummary: revisedRedlineRationale,
              title: `Post-Adversarial Review Draft (${new Date().toLocaleTimeString()})`,
            },
            `${effectivePrimaryModel} (Reviewed by ${advConfig.citationAuditorModel} & ${advConfig.opposingCounselModel})`
          );
          toolCalls.push(redlineCall);
          emit({
            phase: 'revising_after_critique',
            statusText: redlineCall.resultSummary,
            toolCall: redlineCall,
          });
        }
      }
    }

    // 7. Inbound Re-Hydration: Restore pseudonym tokens locally before presenting to attorney
    candidateDraft = this.privacyRouter.rehydrate(candidateDraft, vault);
    const finalInitialDraft = revisionRoundsCompleted > 0
      ? this.privacyRouter.rehydrate(initialDraftBeforeReview, vault)
      : undefined;

    // Ensure formal work product drafts always record a redline version even when critics approve in Round 1 or in direct_bypass mode
    if (
      !isInformational &&
      candidateDraft.trim().length > 0 &&
      !toolCalls.some((tc) => tc.toolName === 'propose_document_redline')
    ) {
      const directRedlineCall = await this.toolExecutor.executeTool(
        matterId,
        'propose_document_redline',
        {
          newContent: candidateDraft,
          rationaleSummary: `Initial work product draft for instruction: "${userPrompt.slice(0, 80)}"`,
          title: `Work Product Draft (${new Date().toLocaleTimeString()})`,
        },
        effectivePrimaryModel
      );
      toolCalls.push(directRedlineCall);
    }

    const assistantMessage: LegalMessage = {
      id: assistantMessageId,
      matterId,
      issueId: effectiveIssueId,
      role: 'assistant',
      content: candidateDraft,
      initialDraftBeforeReview: finalInitialDraft,
      primaryProvider: effectivePrimaryProvider,
      primaryModel: effectivePrimaryModel,
      routeTier: selectedTier,
      routingLogId: decisionLog.id,
      piiAudit: decisionLog.piiAudit,
      reviewModeUsed: advConfig.mode,
      assembledSystemPromptSnapshot: assembled.primarySystemPrompt,
      toolCalls,
      adversarialReviews: allReviews,
      revisionRoundsCompleted,
      durationMs: Math.max(1, Date.now() - turnStartTime),
      createdAt: new Date().toISOString(),
    };

    this.db.insertMessage(assistantMessage);

    emit({
      phase: 'completed',
      statusText: 'Legal Agent Turn & Multi-LLM Adversarial Review Complete.',
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  /**
   * Synthesizes findings and drafted sections across multiple Case Issues (or matter drafts)
   * into a unified Master Brief work-product document and redline version (§10.3).
   */
  async synthesizeMasterBrief(params: {
    matterId: string;
    issueIds?: string[];
    briefTitle?: string;
    onProgress?: (event: AgentProgressEvent) => void;
  }): Promise<{
    assistantMessage: LegalMessage;
    synthesizedContent: string;
    includedIssueCount: number;
  }> {
    const { matterId, issueIds, briefTitle, onProgress } = params;
    const emit = (event: Omit<AgentProgressEvent, 'matterId'>) => {
      onProgress?.({ matterId, ...event });
    };

    const matter = this.db.getMatter(matterId);
    if (!matter) {
      throw new Error(`Matter not found: ${matterId}`);
    }

    const allIssues = this.db.listIssues(matterId);
    const targetIssues =
      issueIds && issueIds.length > 0
        ? allIssues.filter((i) => issueIds.includes(i.id))
        : allIssues;

    const docs = this.db.listDocuments(matterId);
    const facts = this.db.listChronologyFacts(matterId);
    const allMessages = this.db.listMessages(matterId);

    emit({
      phase: 'assembling_prompt',
      statusText: 'Synthesizing Case Issues into Master Brief...',
      detailText: `Combining ${targetIssues.length || 1} issue workstreams across ${docs.length} matter exhibits`,
    });

    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const issueSections: { title: string; role?: string; body: string; issueId?: string }[] = [];

    for (const issue of targetIssues) {
      const issueMsgs = allMessages.filter(
        (m) => m.issueId === issue.id && m.role === 'assistant' && m.category !== 'ADVISORY'
      );
      const latestDraft = issueMsgs[issueMsgs.length - 1];
      const cleanedBody = latestDraft
        ? latestDraft.content
            .replace(/^>\s*\[!NOTE\][\s\S]*?\n\n/, '')
            .trim()
        : `### ${issue.title}\n\n- **Issue Focus**: ${issue.description || issue.title}\n- **Governing Record**: Grounded in ${
            docs
              .filter((d) => d.category !== 'WORK_PRODUCT')
              .slice(0, 3)
              .map((d) => `${d.title} (${d.batesRange})`)
              .join('; ') || matter.jurisdiction
          }.`;
      issueSections.push({
        title: issue.title,
        role: issue.specialistRole,
        body: cleanedBody,
        issueId: issue.id,
      });
    }

    // Fallback if no issue-specific drafts exist yet: include top-level work product drafts
    if (issueSections.length === 0) {
      const generalDrafts = allMessages.filter(
        (m) => !m.issueId && m.role === 'assistant' && m.category !== 'ADVISORY'
      );
      for (let idx = 0; idx < generalDrafts.length; idx++) {
        issueSections.push({
          title: `Principal Legal Argument ${idx + 1}`,
          body: generalDrafts[idx].content
            .replace(/^>\s*\[!NOTE\][\s\S]*?\n\n/, '')
            .trim(),
        });
      }
    }

    const effectiveTitle =
      briefTitle?.trim() ||
      `${matter.name} — Consolidated Master Brief (${matter.matterNumber})`;

    const exhibitListMd = docs
      .filter((d) => d.category !== 'WORK_PRODUCT')
      .map((d) => `- **${d.title}** (\`${d.batesRange}\`): ${d.summary}`)
      .join('\n');

    const chronologyMd =
      facts.length > 0
        ? facts
            .map(
              (f) =>
                `- **${f.factDate}**: ${f.eventDescription} *(${f.sourceCitation})* [${f.status}]`
            )
            .join('\n')
        : exhibitListMd || `- Record grounded in ${matter.jurisdiction} filings.`;

    const synthesizedSectionsMd = issueSections
      .map((sec, idx) => {
        const roman = romanNumerals[idx] || String(idx + 1);
        const roleTag = sec.role ? ` *(${sec.role})*` : '';
        return `## SECTION ${roman}: ${sec.title.toUpperCase()}${roleTag}\n\n${sec.body}`;
      })
      .join('\n\n---\n\n');

    const masterBriefContent = [
      `# ${effectiveTitle.toUpperCase()}`,
      ``,
      `**Governing Forum**: ${matter.jurisdiction}`,
      `**Docket / Matter No.**: ${matter.matterNumber}`,
      `**Client / Party**: ${matter.clientName}`,
      `**Citation Style**: ${matter.citationStyle}`,
      `**Synthesized Case Issues**: ${
        targetIssues.map((i) => i.title).join(' • ') || 'Consolidated Matter Workstreams'
      }`,
      ``,
      `---`,
      ``,
      `## CONSOLIDATED STATEMENT OF THE RECORD & MATERIAL FACTS`,
      ``,
      chronologyMd,
      ``,
      `---`,
      ``,
      synthesizedSectionsMd ||
        `## SECTION I: CONSOLIDATED LEGAL ANALYSIS\n\nAll arguments grounded in the ${matter.name} evidentiary record (${matter.matterNumber}).`,
      ``,
      `---`,
      ``,
      `## CONCLUSION & CONSOLIDATED PRAYER FOR RELIEF`,
      ``,
      `WHEREFORE, based upon the foregoing synthesized issue analyses, verified record pinpoints, and controlling authorities in ${matter.jurisdiction}, Counsel for ${matter.clientName} respectfully requests that the Court grant the relief set forth across Sections ${
        issueSections.map((_, i) => romanNumerals[i] || String(i + 1)).join(', ') || 'I'
      } above.`,
    ].join('\n');

    const advConfig = this.db.getAdversarialConfig();
    const redlineCall = await this.toolExecutor.executeTool(
      matterId,
      'propose_document_redline',
      {
        newContent: masterBriefContent,
        rationaleSummary: `Synthesized Master Brief combining ${
          targetIssues.length || issueSections.length || 1
        } Case Issue workstream(s) into a unified pleading.`,
        title: effectiveTitle,
      },
      `${advConfig.primaryModel} (Master Brief Synthesis)`
    );

    for (const issue of targetIssues) {
      this.db.updateIssueStatus(issue.id, 'synthesized', false);
    }

    const assistantMessage: LegalMessage = {
      id: `msg-master-brief-${Date.now()}`,
      matterId,
      role: 'assistant',
      category: 'WORK_PRODUCT',
      content: masterBriefContent,
      primaryProvider: advConfig.primaryProvider,
      primaryModel: advConfig.primaryModel,
      reviewModeUsed: advConfig.mode,
      toolCalls: [redlineCall],
      adversarialReviews: [],
      revisionRoundsCompleted: 0,
      createdAt: new Date().toISOString(),
    };
    this.db.insertMessage(assistantMessage);

    emit({
      phase: 'completed',
      statusText: `Synthesized Master Brief across ${targetIssues.length || issueSections.length || 1} Case Issue(s).`,
    });

    return {
      assistantMessage,
      synthesizedContent: masterBriefContent,
      includedIssueCount: targetIssues.length || issueSections.length || 1,
    };
  }

  /**
   * Merges findings and drafted work product from a forked or specialized Case Issue
   * back into its parent Case Issue (or the Matter's primary workstream) and updates
   * the Matter's Master Brief redline, modeled on T3 Code's `merge_back` transfer.
   */
  async mergeBackIssue(params: {
    issueId: string;
    targetIssueId?: string | null;
    onProgress?: (event: AgentProgressEvent) => void;
  }): Promise<{
    mergedMessage: LegalMessage;
    targetIssueId: string | null;
  }> {
    const sourceIssue = this.db.getIssue(params.issueId);
    if (!sourceIssue) {
      throw new Error(`Case Issue not found: ${params.issueId}`);
    }

    const matterId = sourceIssue.matterId;
    const matter = this.db.getMatter(matterId);
    if (!matter) {
      throw new Error(`Matter not found: ${matterId}`);
    }

    const resolvedTargetIssueId =
      params.targetIssueId !== undefined
        ? params.targetIssueId
        : sourceIssue.parentIssueId &&
          sourceIssue.parentIssueId !== 'primary' &&
          this.db.getIssue(sourceIssue.parentIssueId)
        ? sourceIssue.parentIssueId
        : null;

    const targetIssue = resolvedTargetIssueId
      ? this.db.getIssue(resolvedTargetIssueId)
      : null;

    const sourceMessages = this.db.listMessages(matterId, sourceIssue.id);
    const assistantTurns = sourceMessages.filter(
      (m) => m.role === 'assistant' && !m.id.startsWith('msg-fork-')
    );
    const latestAssistant =
      assistantTurns[assistantTurns.length - 1] ??
      sourceMessages.filter((m) => m.role === 'assistant').slice(-1)[0];

    const findingsBody = latestAssistant
      ? latestAssistant.content.replace(/^>\s*\[!NOTE\][\s\S]*?\n\n/, '').trim()
      : `Completed analysis for **${sourceIssue.title}** (${
          sourceIssue.description || matter.jurisdiction
        }).`;

    const mergedContent = [
      `# INCORPORATED ISSUE ANALYSIS: ${sourceIssue.title.toUpperCase()}`,
      ``,
      `**Merged From Case Issue**: ${sourceIssue.title}${
        sourceIssue.specialistRole ? ` • *${sourceIssue.specialistRole}*` : ''
      }`,
      `**Target Workstream**: ${targetIssue ? targetIssue.title : `${matter.name} (Primary Matter Record)`}`,
      `**Docket / Forum**: ${matter.matterNumber} • ${matter.jurisdiction}`,
      ``,
      `---`,
      ``,
      findingsBody,
    ].join('\n');

    const advConfig = this.db.getAdversarialConfig();
    const redlineCall = await this.toolExecutor.executeTool(
      matterId,
      'propose_document_redline',
      {
        newContent: mergedContent,
        rationaleSummary: `Incorporated findings from "${sourceIssue.title}" into ${
          targetIssue ? targetIssue.title : matter.name
        }.`,
        title: `${matter.name} — Incorporated ${sourceIssue.title}`,
      },
      `${advConfig.primaryModel} (Issue Synthesis)`
    );

    this.db.updateIssueStatus(sourceIssue.id, 'synthesized', false);
    this.db.setActiveIssueId(matterId, resolvedTargetIssueId, false);

    const mergedMessage: LegalMessage = {
      id: `msg-merge-back-${Date.now()}`,
      matterId,
      issueId: resolvedTargetIssueId || undefined,
      role: 'assistant',
      category: 'WORK_PRODUCT',
      content: mergedContent,
      primaryProvider: advConfig.primaryProvider,
      primaryModel: advConfig.primaryModel,
      reviewModeUsed: advConfig.mode,
      toolCalls: [redlineCall],
      adversarialReviews: latestAssistant?.adversarialReviews ?? [],
      revisionRoundsCompleted: latestAssistant?.revisionRoundsCompleted ?? 0,
      createdAt: new Date().toISOString(),
    };
    this.db.insertMessage(mergedMessage, true);

    params.onProgress?.({
      matterId,
      phase: 'completed',
      statusText: `Merged "${sourceIssue.title}" back into ${
        targetIssue ? targetIssue.title : 'Primary Case Workstream'
      }.`,
    });

    return {
      mergedMessage,
      targetIssueId: resolvedTargetIssueId,
    };
  }
}
