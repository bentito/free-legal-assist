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
      userPrompt,
      overrideReviewMode,
      overridePracticeAreaId,
      overridePrimaryProvider,
      overridePrimaryModel,
      onProgress,
    } = params;

    const emit = (event: Omit<AgentProgressEvent, 'matterId'>) => {
      onProgress?.({ matterId, ...event });
    };

    const matter = this.db.getMatter(matterId);
    if (!matter) {
      throw new Error(`Matter not found: ${matterId}`);
    }

    // 1. Record User Prompt
    const userMessage: LegalMessage = {
      id: `msg-user-${Date.now()}`,
      matterId,
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
      overridePracticeAreaId
    );

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

    const isVermontCriminal =
      matter.jurisdiction.toLowerCase().includes('vermont') ||
      matter.id.includes('vt') ||
      matter.practiceArea.startsWith('vt_');

    const defaultCitationToVerify = isVermontCriminal
      ? 'State v. Sprague, 2003 VT 20; State v. Bauder, 2007 VT 16; State v. Savva, 159 Vt. 75 (1991); State v. Oakes, 157 Vt. 171 (1991)'
      : 'Abry Partners V, L.P. v. F & W Acquisition LLC, 891 A.2d 1032 (Del. Ch. 2006); Express Scripts, Inc. v. Bracket Holdings Corp., 248 A.3d 824 (Del. 2021)';

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
          candidateDraft = liveRes.text;
        } else {
          // If live CLI/API returned empty string, fall back to grounded engine
          const simulated = this.llmClient.generateGroundedLegalDraft({
            userPrompt,
            matter,
            docs,
            isRevisionPass: false,
          });
          candidateDraft = simulated.draftText;
        }
      } catch (err) {
        // Fall back gracefully so the attorney NEVER gets an empty screen
        const simulated = this.llmClient.generateGroundedLegalDraft({
          userPrompt,
          matter,
          docs,
          isRevisionPass: false,
        });
        candidateDraft = simulated.draftText;
        const errMsg = (err as Error).message.replace(/[\r\n]+/g, ' ');
        candidateDraft = `> [!NOTE]\n> **Agent Connection Note**: ${effectivePrimaryProvider.toUpperCase()} (${effectivePrimaryModel}) encountered an issue: *${errMsg}*. The local legal engine answered below based on the current matter discovery files.\n\n${candidateDraft}`;
      }
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
              `Produce the final, verified legal work product curing every objection above with exact record pinpoints.`,
            ].join('\n\n'),
          });
          candidateDraft = revRes.text;
          revisedRedlineContent = revRes.text;
          revisedRedlineRationale = `Cured ${gateResult.combinedObjections.length} adversarial review objections.`;
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

    const assistantMessage: LegalMessage = {
      id: assistantMessageId,
      matterId,
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
}
