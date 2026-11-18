import {
  LLMProviderId,
  Matter,
  PrivacyRoutingSettings,
  RouteTier,
  RoutingDecisionLog,
} from '../../../shared/types';
import { LegalDatabase } from '../../db/database';
import { AncillaryModelManager } from '../providers/AncillaryModelManager';
import { OnnxPiiClassifier } from './OnnxPiiClassifier';
import { OnnxRouterEngine } from './OnnxRouterEngine';
import { PiiScrubberVault } from './PiiScrubberVault';
import { RoutingDebugLogger } from './RoutingDebugLogger';

export interface RoutingEvaluationResult {
  scrubbedPrompt: string;
  scrubbedCorpus: string;
  vault: PiiScrubberVault;
  decisionLog: RoutingDecisionLog;
  selectedTier: RouteTier;
  selectedModel: string;
  selectedProvider?: LLMProviderId;
}

export class LocalPrivacyModelRouter {
  private routerEngine: OnnxRouterEngine;
  private piiClassifier: OnnxPiiClassifier;
  private debugLogger: RoutingDebugLogger;

  constructor(private db: LegalDatabase) {
    this.routerEngine = new OnnxRouterEngine();
    this.piiClassifier = new OnnxPiiClassifier();
    this.debugLogger = new RoutingDebugLogger(db);
  }

  /**
   * Evaluates an agent turn, strips outbound PII with the vault,
   * classifies complexity, resolves the target route tier, and logs decision telemetry.
   */
  public async evaluateAndScrub(params: {
    matter: Matter;
    userPrompt: string;
    corpusExcerpts?: string;
    turnNumber?: number;
    overrideProvider?: LLMProviderId;
    overrideModel?: string;
  }): Promise<RoutingEvaluationResult> {
    const {
      matter,
      userPrompt,
      corpusExcerpts = '',
      turnNumber = 1,
      overrideProvider,
      overrideModel,
    } = params;

    const settings = this.db.getPrivacyRoutingSettings();
    const vault = new PiiScrubberVault();

    // 1. Pre-register active Matter roster (client, docket)
    vault.registerMatterRoster(matter);

    // 2. Extract contextual entities (officers, judges) from prompt and corpus
    const contextualEntities = await this.piiClassifier.extractContextualEntities(
      `${userPrompt}\n${corpusExcerpts}`
    );
    for (const ent of contextualEntities) {
      vault.registerMatterRoster(matter, [ent]);
    }

    // 3. Bidirectional PII stripping pass
    const scrubbedPromptResult = vault.scrub(userPrompt);
    const scrubbedCorpusResult = vault.scrub(corpusExcerpts);

    // 4. Token metrics estimation (~4 characters per token)
    const rawPromptLength = userPrompt.length;
    const corpusExcerptTokens = Math.ceil(corpusExcerpts.length / 4);
    const totalInputTokens = Math.ceil((userPrompt.length + corpusExcerpts.length) / 4);

    // 5. Complexity classification & intent inference
    const isAirGapped =
      settings.policyMode === 'local_only_airgapped' ||
      matter.jurisdiction.toLowerCase().includes('air-gapped') ||
      matter.folderPath.toLowerCase().includes('airgap');

    const classification = await this.routerEngine.classify({
      userPrompt,
      corpusExcerpt: corpusExcerpts,
      isAirGappedMatter: isAirGapped,
    });

    // 6. Policy resolution
    let selectedTier: RouteTier = classification.recommendedTier;
    if (settings.policyMode === 'force_frontier') {
      selectedTier = 'FRONTIER_REASONING';
    } else if (settings.policyMode === 'local_only_airgapped' || isAirGapped) {
      selectedTier = 'LOCAL_PRIVATE';
    }

    // 7. Resolve target model & provider
    // Note: The main model choice is 100% up to the user for frontier tasks.
    // Ancillary checker models (e.g. low-cost economy for citation formatting) are resolved dynamically.
    const advConfig = this.db.getAdversarialConfig();
    let selectedModel = overrideModel || advConfig.primaryModel;
    let selectedProvider: LLMProviderId | undefined = overrideProvider || advConfig.primaryProvider;

    if (selectedTier === 'FAST_ECONOMY') {
      const ancillaryManager = AncillaryModelManager.getInstance(this.db);
      const economyResolution = ancillaryManager.resolveWorkingEconomyModel(selectedProvider);
      selectedModel = economyResolution.modelId;
      selectedProvider = economyResolution.providerId;
    } else if (selectedTier === 'LOCAL_PRIVATE') {
      selectedModel = 'local-legal-engine';
      selectedProvider = 'legal-simulator';
    }

    // 8. Cost estimation
    // Frontier baseline: ~$0.015 / 1k tokens
    const frontierRatePer1k = 0.015;
    const economyRatePer1k = 0.002;

    const frontierBaselineCostUSD = Number(
      ((totalInputTokens / 1000) * frontierRatePer1k).toFixed(4)
    );

    let selectedModelCostUSD = frontierBaselineCostUSD;
    if (selectedTier === 'FAST_ECONOMY') {
      selectedModelCostUSD = Number(
        ((totalInputTokens / 1000) * economyRatePer1k).toFixed(4)
      );
    } else if (selectedTier === 'LOCAL_PRIVATE') {
      selectedModelCostUSD = 0.0;
    }

    const estimatedSavingsUSD = Number(
      Math.max(0, frontierBaselineCostUSD - selectedModelCostUSD).toFixed(4)
    );

    // 9. Structured Decision Log
    const decisionLog: RoutingDecisionLog = {
      id: `route-evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      matterId: matter.id,
      turnNumber,
      metrics: {
        rawPromptLength,
        corpusExcerptTokens,
        totalInputTokens,
      },
      classification: {
        inferredIntent: classification.inferredIntent,
        onnxComplexityScore: classification.onnxComplexityScore,
        onnxLogits: classification.onnxLogits,
        decisionReason: classification.decisionReason,
      },
      selectedTier,
      selectedModel,
      costEstimate: {
        selectedModelCostUSD,
        frontierBaselineCostUSD,
        estimatedSavingsUSD,
      },
      piiAudit: scrubbedPromptResult.audit,
    };

    // 10. Record decision telemetry to SQLite & JSONL
    await this.debugLogger.logDecision(decisionLog);

    return {
      scrubbedPrompt: scrubbedPromptResult.scrubbedText,
      scrubbedCorpus: scrubbedCorpusResult.scrubbedText,
      vault,
      decisionLog,
      selectedTier,
      selectedModel,
      selectedProvider,
    };
  }

  /**
   * Rehydrates a text payload, restoring all pseudonym tokens back to original names and dockets.
   */
  public rehydrate(text: string, vault: PiiScrubberVault): string {
    return vault.rehydrate(text);
  }

  public getDebugLogger(): RoutingDebugLogger {
    return this.debugLogger;
  }
}
