import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  AncillaryCheckerRole,
  AncillaryModelAdvisory,
  AncillaryModelOption,
  AncillaryModelRegistryState,
  LLMProviderId,
  RouteTier,
} from '../../../shared/types';
import {
  LegalDatabase,
  migrateLegacyDirectProviderId,
  migrateRetiredModelId,
  RETIRED_CLAUDE_MODEL_MIGRATIONS,
} from '../../db/database';
import { CliAgentDriverManager } from './CliAgentDriverManager';

export class AncillaryModelManager {
  private static instance: AncillaryModelManager | null = null;
  private cachedRegistry: AncillaryModelRegistryState | null = null;
  private discoveredAnthropicModels: AncillaryModelOption[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private db: LegalDatabase) {}

  public static getInstance(db: LegalDatabase): AncillaryModelManager {
    if (!this.instance) {
      this.instance = new AncillaryModelManager(db);
    } else {
      this.instance.db = db;
    }
    return this.instance;
  }

  public static resetInstance(): void {
    if (this.instance) {
      this.instance.stopTimer();
      this.instance = null;
    }
  }

  /**
   * Initializes periodic daily checking and runs the initial model discovery.
   */
  public async initialize(): Promise<AncillaryModelRegistryState> {
    const state = await this.refreshModelRegistry();

    // Check periodically every 24 hours (86,400,000 ms)
    if (!this.timer) {
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      this.timer = setInterval(async () => {
        try {
          await this.refreshModelRegistry();
        } catch {
          // Keep previous registry cache if periodic check throws
        }
      }, TWENTY_FOUR_HOURS_MS);

      // Prevent timer from holding process open during test runs
      if (this.timer.unref) {
        this.timer.unref();
      }
    }

    return state;
  }

  public stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Probes background agents and models across all configured providers.
   */
  public probeAvailableModels(): AncillaryModelOption[] {
    const home = os.homedir();
    const options: AncillaryModelOption[] = [];

    // 1. OpenAI Codex Agent
    const codexStatus = CliAgentDriverManager.probeProviderStatusSync('codex-cli');
    const hasCodexKey = this.db.hasStoredApiKey('codex-cli');
    if ((codexStatus.installed && codexStatus.authenticated) || hasCodexKey) {
      const codexAuthPath = path.join(home, '.codex', 'auth.json');
      let isChatGPTAuth = false;
      if (fs.existsSync(codexAuthPath)) {
        try {
          const authData = JSON.parse(fs.readFileSync(codexAuthPath, 'utf8'));
          isChatGPTAuth = authData.auth_mode === 'chatgpt';
        } catch {
          // Ignore parse errors
        }
      }

      options.push({
        providerId: 'codex-cli',
        providerName: 'Codex',
        modelId: 'gpt-6.2-sol',
        modelLabel: 'GPT-6.2 Sol',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'codex-cli',
        providerName: 'Codex',
        modelId: 'gpt-6-luna',
        modelLabel: 'GPT-6 Luna',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'codex-cli',
        providerName: 'Codex',
        modelId: 'o4-mini',
        modelLabel: 'OpenAI o4-mini',
        tier: 'FAST_ECONOMY',
        isAvailable: !isChatGPTAuth,
        statusDetail: isChatGPTAuth
          ? "The 'o4-mini' model is not supported when using Codex with a ChatGPT account."
          : undefined,
        costPer1kTokensUSD: 0.002,
      });

      options.push({
        providerId: 'codex-cli',
        providerName: 'Codex',
        modelId: 'o3',
        modelLabel: 'OpenAI o3',
        tier: 'FRONTIER_REASONING',
        isAvailable: !isChatGPTAuth,
        statusDetail: isChatGPTAuth
          ? "The 'o3' model is not supported when using Codex with a ChatGPT account."
          : undefined,
        costPer1kTokensUSD: 0.015,
      });
    }

    // 2. Antigravity Agent (agy)
    const agyStatus = CliAgentDriverManager.probeProviderStatusSync('agy-acp');
    const hasAgyKey = this.db.hasStoredApiKey('agy-acp');
    if ((agyStatus.installed && agyStatus.authenticated) || hasAgyKey) {
      options.push({
        providerId: 'agy-acp',
        providerName: 'Antigravity',
        modelId: 'gemini-3.8-flash',
        modelLabel: 'Gemini 3.8 Flash',
        tier: 'FAST_ECONOMY',
        isAvailable: true,
        costPer1kTokensUSD: 0.002,
      });

      options.push({
        providerId: 'agy-acp',
        providerName: 'Antigravity',
        modelId: 'gemini-4-argon',
        modelLabel: 'Gemini 4 Argon',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'agy-acp',
        providerName: 'Antigravity',
        modelId: 'gemini-4-neon',
        modelLabel: 'Gemini 4 Neon',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'agy-acp',
        providerName: 'Antigravity',
        modelId: 'claude-sonnet-5-5',
        modelLabel: 'Claude Sonnet 5.5',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'agy-acp',
        providerName: 'Antigravity',
        modelId: 'claude-opus-5-5',
        modelLabel: 'Claude Opus 5.5',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'agy-acp',
        providerName: 'Antigravity',
        modelId: 'claude-haiku-5-5',
        modelLabel: 'Claude Haiku 5.5',
        tier: 'FAST_ECONOMY',
        isAvailable: true,
        costPer1kTokensUSD: 0.002,
      });
    }

    // 3. Claude Agent (claude)
    const claudeStatus = CliAgentDriverManager.probeProviderStatusSync('claude-cli');
    const hasClaudeKey = this.db.hasStoredApiKey('claude-cli');
    if ((claudeStatus.installed && claudeStatus.authenticated) || hasClaudeKey) {
      options.push({
        providerId: 'claude-cli',
        providerName: 'Claude',
        modelId: 'claude-sonnet-5-5',
        modelLabel: 'Claude Sonnet 5.5',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'claude-cli',
        providerName: 'Claude',
        modelId: 'claude-opus-5-5',
        modelLabel: 'Claude Opus 5.5',
        tier: 'FRONTIER_REASONING',
        isAvailable: true,
        costPer1kTokensUSD: 0.015,
      });

      options.push({
        providerId: 'claude-cli',
        providerName: 'Claude',
        modelId: 'claude-haiku-5-5',
        modelLabel: 'Claude Haiku 5.5',
        tier: 'FAST_ECONOMY',
        isAvailable: true,
        costPer1kTokensUSD: 0.002,
      });

      for (const discovered of this.discoveredAnthropicModels) {
        if (
          !options.some(
            (o) =>
              o.providerId === 'claude-cli' && o.modelId === discovered.modelId
          )
        ) {
          options.push(discovered);
        }
      }
    }

    // Fallback when running in headless CI where no CLI binaries are on PATH
    if (options.length === 0) {
      options.push(
        {
          providerId: 'codex-cli',
          providerName: 'Codex',
          modelId: 'gpt-6-luna',
          modelLabel: 'GPT-6 Luna',
          tier: 'FRONTIER_REASONING',
          isAvailable: true,
          costPer1kTokensUSD: 0.015,
        },
        {
          providerId: 'agy-acp',
          providerName: 'Antigravity',
          modelId: 'gemini-3.8-flash',
          modelLabel: 'Gemini 3.8 Flash',
          tier: 'FAST_ECONOMY',
          isAvailable: true,
          costPer1kTokensUSD: 0.002,
        }
      );
    }

    return options;
  }

  /**
   * Queries Anthropic's Models API (`GET https://api.anthropic.com/v1/models`)
   * when an environment API key is configured for the Claude agent to discover live non-retired model IDs.
   */
  public async fetchAnthropicModelsFromApi(
    apiKey: string
  ): Promise<AncillaryModelOption[]> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as {
        data?: Array<{ id?: string; display_name?: string }>;
      };
      const items = Array.isArray(payload.data) ? payload.data : [];
      const discovered: AncillaryModelOption[] = [];
      for (const item of items) {
        const id = (item.id || '').trim();
        if (
          !id ||
          id.startsWith('claude-3-') ||
          id.startsWith('claude-2') ||
          Boolean(RETIRED_CLAUDE_MODEL_MIGRATIONS[id])
        ) {
          continue;
        }
        const isHaiku = id.toLowerCase().includes('haiku');
        discovered.push({
          providerId: 'claude-cli',
          providerName: 'Claude',
          modelId: id,
          modelLabel: item.display_name || id,
          tier: isHaiku ? 'FAST_ECONOMY' : 'FRONTIER_REASONING',
          isAvailable: true,
          costPer1kTokensUSD: isHaiku ? 0.002 : 0.015,
        });
      }
      this.discoveredAnthropicModels = discovered;
      return discovered;
    } catch {
      return [];
    }
  }

  /**
   * Refreshes the model registry, checks the 3 ancillary roles, auto-picks
   * working models on initial runs, and generates advisories with explanations.
   */
  public async refreshModelRegistry(): Promise<AncillaryModelRegistryState> {
    if (this.db.hasStoredApiKey('claude-cli') || !process.env.VITEST) {
      const claudeKey = this.db.getDecryptedApiKey('claude-cli');
      if (claudeKey && claudeKey.trim().length > 0) {
        await this.fetchAnthropicModelsFromApi(claudeKey);
      }
    }

    const availableOptions = this.probeAvailableModels();
    const workingEconomyModels = availableOptions.filter(
      (m) => m.tier === 'FAST_ECONOMY' && m.isAvailable
    );
    const workingFrontierModels = availableOptions.filter(
      (m) => m.tier === 'FRONTIER_REASONING' && m.isAvailable
    );

    const privacySettings = this.db.getPrivacyRoutingSettings();
    const advConfig = this.db.getAdversarialConfig();
    const advisories: AncillaryModelAdvisory[] = [];

    // --- Role 1: Low-Cost Economy Checker ---
    let configuredEconomyProv = privacySettings.economyModelProvider
      ? migrateLegacyDirectProviderId(privacySettings.economyModelProvider)
      : undefined;
    let configuredEconomyModel = privacySettings.economyModel;

    // Migrate retired Claude 3.x slugs (e.g. 'claude-3-5-haiku', 'claude-3-5-haiku-latest') to 'claude-haiku-5-5'
    if (configuredEconomyModel) {
      const migratedEconomy = migrateRetiredModelId(configuredEconomyModel);
      if (migratedEconomy && migratedEconomy !== configuredEconomyModel) {
        configuredEconomyModel = migratedEconomy;
        this.db.savePrivacyRoutingSettings({
          economyModelProvider: configuredEconomyProv,
          economyModel: configuredEconomyModel,
        });
      }
    }

    // Default initial assignment if unset
    if (!configuredEconomyProv || !configuredEconomyModel) {
      const bestEconomy =
        workingEconomyModels.find((m) => m.providerId === 'agy-acp') ||
        workingEconomyModels.find((m) => m.providerId === 'claude-cli') ||
        workingEconomyModels.find((m) => m.providerId === 'codex-cli') ||
        workingEconomyModels[0];

      if (bestEconomy) {
        configuredEconomyProv = bestEconomy.providerId;
        configuredEconomyModel = bestEconomy.modelId;
      } else {
        configuredEconomyProv = 'legal-simulator';
        configuredEconomyModel = 'lexharness-local-v1';
      }

      this.db.savePrivacyRoutingSettings({
        economyModelProvider: configuredEconomyProv,
        economyModel: configuredEconomyModel,
      });
    }

    // Verify health of configured low-cost economy checker
    const economyMatch = availableOptions.find(
      (m) => m.providerId === configuredEconomyProv && m.modelId === configuredEconomyModel
    );

    let economyStatus: 'healthy' | 'restricted' | 'unavailable' = 'healthy';
    if (!economyMatch || !economyMatch.isAvailable) {
      economyStatus = economyMatch?.statusDetail ? 'restricted' : 'unavailable';
      const reasonDetail =
        economyMatch?.statusDetail ||
        `The model '${configuredEconomyModel}' is currently not available on ${configuredEconomyProv}.`;

      advisories.push({
        id: 'advisory-low-cost-economy',
        role: 'low_cost_economy',
        roleTitle: 'Fast Economy & Citation Checker',
        usageExplanation:
          'Executes rapid, low-cost citation formatting, statutory pinpoints, and mechanical procedural checks without incurring frontier reasoning latency or API expense.',
        configuredProvider: configuredEconomyProv,
        configuredModel: configuredEconomyModel,
        status: economyStatus,
        message: `${configuredEconomyModel} seems unavailable (${reasonDetail}). You should choose another low-cost model for Citation Formatting & Procedural Rule checks.`,
        suggestedAlternatives: workingEconomyModels,
        detectedAt: new Date().toISOString(),
      });
    }

    // --- Role 2: Citation & Record Auditor ---
    const auditorProv = advConfig.citationAuditorProvider;
    const auditorModel = advConfig.citationAuditorModel;
    const auditorMatch = availableOptions.find(
      (m) => m.providerId === auditorProv && m.modelId === auditorModel
    );

    let auditorStatus: 'healthy' | 'restricted' | 'unavailable' = 'healthy';
    if (!auditorMatch || !auditorMatch.isAvailable) {
      auditorStatus = auditorMatch?.statusDetail ? 'restricted' : 'unavailable';
      advisories.push({
        id: 'advisory-citation-auditor',
        role: 'citation_auditor',
        roleTitle: 'Citation & Record Auditor',
        usageExplanation:
          'Verifies caselaw pinpoints, statutory citations, and cross-references deposition transcripts and Bates stamps during adversarial review.',
        configuredProvider: auditorProv,
        configuredModel: auditorModel,
        status: auditorStatus,
        message: `${auditorModel} seems unavailable on ${auditorProv}. You should choose an available auditor model for adversarial verification.`,
        suggestedAlternatives: [
          ...workingEconomyModels,
          ...workingFrontierModels,
        ],
        detectedAt: new Date().toISOString(),
      });
    }

    // --- Role 3: Opposing Counsel / Judicial Critic ---
    const opposingProv = advConfig.opposingCounselProvider;
    const opposingModel = advConfig.opposingCounselModel;
    const opposingMatch = availableOptions.find(
      (m) => m.providerId === opposingProv && m.modelId === opposingModel
    );

    let opposingStatus: 'healthy' | 'restricted' | 'unavailable' = 'healthy';
    if (!opposingMatch || !opposingMatch.isAvailable) {
      opposingStatus = opposingMatch?.statusDetail ? 'restricted' : 'unavailable';
      advisories.push({
        id: 'advisory-opposing-counsel',
        role: 'opposing_counsel',
        roleTitle: 'Opposing Counsel / Judicial Critic',
        usageExplanation:
          'Formulates adversarial objections and stress-tests legal theories to find logical gaps and procedural pitfalls before filing.',
        configuredProvider: opposingProv,
        configuredModel: opposingModel,
        status: opposingStatus,
        message: `${opposingModel} seems unavailable on ${opposingProv}. You should choose an active critic model for adversarial review.`,
        suggestedAlternatives: workingFrontierModels,
        detectedAt: new Date().toISOString(),
      });
    }

    const now = new Date();
    const nextCheck = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const state: AncillaryModelRegistryState = {
      lastConfirmedAt: now.toISOString(),
      nextScheduledCheckAt: nextCheck.toISOString(),
      roles: {
        low_cost_economy: {
          providerId: configuredEconomyProv,
          modelId: configuredEconomyModel,
          roleTitle: 'Fast Economy & Citation Checker',
          usageExplanation:
            'Executes rapid, low-cost citation formatting, statutory pinpoints, and mechanical procedural checks.',
          status: economyStatus,
        },
        citation_auditor: {
          providerId: auditorProv,
          modelId: auditorModel,
          roleTitle: 'Citation & Record Auditor',
          usageExplanation:
            'Verifies caselaw pinpoints, statutory citations, and cross-references deposition transcripts.',
          status: auditorStatus,
        },
        opposing_counsel: {
          providerId: opposingProv,
          modelId: opposingModel,
          roleTitle: 'Opposing Counsel / Judicial Critic',
          usageExplanation:
            'Formulates adversarial objections and stress-tests legal theories.',
          status: opposingStatus,
        },
      },
      advisories,
      availableWorkingModels: availableOptions,
    };

    this.cachedRegistry = state;
    this.db.saveAncillaryModelRegistry(state);
    return state;
  }

  /**
   * Returns the current cached registry or generates it.
   */
  public getState(): AncillaryModelRegistryState {
    if (this.cachedRegistry) return this.cachedRegistry;
    const stored = this.db.getAncillaryModelRegistry();
    if (stored) {
      this.cachedRegistry = stored;
      return stored;
    }
    // Synchronous fallback until async refresh completes
    const available = this.probeAvailableModels();
    const privacy = this.db.getPrivacyRoutingSettings();
    const adv = this.db.getAdversarialConfig();
    return {
      lastConfirmedAt: new Date().toISOString(),
      nextScheduledCheckAt: new Date(Date.now() + 86400000).toISOString(),
      roles: {
        low_cost_economy: {
          providerId: privacy.economyModelProvider || 'agy-acp',
          modelId: privacy.economyModel || 'gemini-3.8-flash',
          roleTitle: 'Fast Economy & Citation Checker',
          usageExplanation: 'Executes rapid, low-cost citation formatting and procedural checks.',
          status: 'healthy',
        },
        citation_auditor: {
          providerId: adv.citationAuditorProvider,
          modelId: adv.citationAuditorModel,
          roleTitle: 'Citation & Record Auditor',
          usageExplanation: 'Verifies caselaw pinpoints and citations.',
          status: 'healthy',
        },
        opposing_counsel: {
          providerId: adv.opposingCounselProvider,
          modelId: adv.opposingCounselModel,
          roleTitle: 'Opposing Counsel / Judicial Critic',
          usageExplanation: 'Formulates adversarial objections and stress-tests legal theories.',
          status: 'healthy',
        },
      },
      advisories: [],
      availableWorkingModels: available,
    };
  }

  /**
   * Repicks a model for an ancillary checker role based on user selection.
   */
  public async repickAncillaryModel(
    role: AncillaryCheckerRole,
    providerId: LLMProviderId,
    modelId: string
  ): Promise<AncillaryModelRegistryState> {
    if (role === 'low_cost_economy') {
      this.db.savePrivacyRoutingSettings({
        economyModelProvider: providerId,
        economyModel: modelId,
      });
    } else if (role === 'citation_auditor') {
      this.db.saveAdversarialConfig({
        citationAuditorProvider: providerId,
        citationAuditorModel: modelId,
      });
    } else if (role === 'opposing_counsel') {
      this.db.saveAdversarialConfig({
        opposingCounselProvider: providerId,
        opposingCounselModel: modelId,
      });
    }

    return this.refreshModelRegistry();
  }

  /**
   * Resolves a guaranteed working model for the Fast Economy tier so execution
   * never errors out even if a model is temporarily restricted.
   */
  public resolveWorkingEconomyModel(preferredProvider?: LLMProviderId): {
    providerId: LLMProviderId;
    modelId: string;
    wasAdapted: boolean;
    adaptationNote?: string;
  } {
    const state = this.getState();
    const configured = state.roles.low_cost_economy;

    // 1. If configured economy model is healthy, use it directly
    if (configured.status === 'healthy') {
      return {
        providerId: configured.providerId,
        modelId: configured.modelId,
        wasAdapted: false,
      };
    }

    // 2. If configured is restricted (e.g. o4-mini on ChatGPT account), find best working alternative
    const workingEconomy = state.availableWorkingModels.filter(
      (m) => m.tier === 'FAST_ECONOMY' && m.isAvailable
    );

    const alternative =
      workingEconomy.find((m) => m.providerId === 'agy-acp') ||
      workingEconomy.find((m) => m.providerId === 'claude-cli') ||
      workingEconomy.find((m) => m.providerId === 'codex-cli') ||
      workingEconomy[0];

    if (alternative) {
      return {
        providerId: alternative.providerId,
        modelId: alternative.modelId,
        wasAdapted: true,
        adaptationNote: `Slotted ${alternative.modelLabel} for Fast Economy (configured ${configured.modelId} restricted on ${configured.providerId})`,
      };
    }

    // 3. Fallback: if preferred is codex-cli, use gpt-6-luna (which is verified on ChatGPT accounts)
    if (preferredProvider === 'codex-cli') {
      return {
        providerId: 'codex-cli',
        modelId: 'gpt-6-luna',
        wasAdapted: true,
        adaptationNote: 'Slotted GPT-6 Luna with low reasoning effort on Codex account',
      };
    }

    // 4. Default to local legal engine
    return {
      providerId: 'legal-simulator',
      modelId: 'lexharness-local-v1',
      wasAdapted: true,
      adaptationNote: 'Slotted local offline legal engine',
    };
  }
}
