import { ChildProcess, execFile, execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  AgentConnectionInstance,
  AgentOnboardingState,
  AgentSetupTerminalEvent,
  CourtListenerMcpAssuranceState,
  CustomLegalMcpServer,
  LLMProviderId,
  ProviderRuntimeStatus,
} from '../../../shared/types';

const execFileAsync = promisify(execFile);

/**
 * Replicates T3 Code's cross-platform CLI & ACP Agent Driver resolution, onboarding,
 * shadow-home multi-account management, and execution for:
 *  1. Antigravity ACP (`agy` / `agy_acp_server.par` / `agy_acp_server.exe`)
 *  2. OpenAI Codex Agent CLI (`codex exec` / `codex app-server` + T3 Shadow Home multi-account)
 *  3. Anthropic Claude Code Agent CLI (`claude` / `claude.exe` / `@anthropic-ai/claude-code`)
 */
export class CliAgentDriverManager {
  private static statusCache = new Map<
    LLMProviderId,
    { status: ProviderRuntimeStatus; timestamp: number }
  >();
  private static CACHE_TTL_MS = 30_000;
  private static cachedMachineLabel: string | null = null;
  private static activeSetupSessions = new Map<string, ChildProcess>();

  static getExtendedPathEnv(): NodeJS.ProcessEnv {
    const home = os.homedir();
    const isWin = process.platform === 'win32';
    const extraDirs = isWin
      ? [
          path.join(home, '.local', 'bin'),
          path.join(home, 'AppData', 'Roaming', 'npm'),
          path.join(home, 'AppData', 'Local', 'Programs', 'claude'),
          path.join(home, '.codex', 'bin'),
        ]
      : [
          '/opt/homebrew/bin',
          '/usr/local/bin',
          path.join(home, '.local', 'bin'),
          path.join(home, '.cargo', 'bin'),
          path.join(home, '.codex', 'bin'),
        ];

    const sep = isWin ? ';' : ':';
    const currentPath = process.env.PATH || '';
    const mergedPath = [...extraDirs, ...currentPath.split(sep)]
      .filter(Boolean)
      .join(sep);

    return {
      ...process.env,
      PATH: mergedPath,
    };
  }

  static resolveBinaryPath(
    providerId: 'agy-acp' | 'codex-cli' | 'claude-cli',
    customBinaryPath?: string
  ): string | null {
    if (customBinaryPath && customBinaryPath.trim().length > 0) {
      const expanded = customBinaryPath
        .trim()
        .replace(/^~(?=$|\/|\\)/, os.homedir());
      if (fs.existsSync(expanded)) {
        return this.resolveWindowsShimIfNeeded(providerId, expanded);
      }
    }

    const home = os.homedir();
    const isWin = process.platform === 'win32';
    const env = this.getExtendedPathEnv();
    const pathDirs = (env.PATH || '').split(isWin ? ';' : ':').filter(Boolean);

    const candidateNames: Record<'agy-acp' | 'codex-cli' | 'claude-cli', string[]> = {
      'agy-acp': isWin ? ['agy.exe', 'agy.cmd', 'agy'] : ['agy', 'antigravity'],
      'codex-cli': isWin ? ['codex.exe', 'codex.cmd', 'codex'] : ['codex'],
      'claude-cli': isWin ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude'],
    };

    for (const dir of pathDirs) {
      for (const name of candidateNames[providerId]) {
        const full = path.join(dir, name);
        try {
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            return this.resolveWindowsShimIfNeeded(providerId, full);
          }
        } catch {
          // Ignore inaccessible paths
        }
      }
    }

    // Check NVM node versions on macOS/Linux (replicates T3 executable lookup)
    if (!isWin) {
      const nvmVersionsDir = path.join(home, '.nvm', 'versions', 'node');
      if (fs.existsSync(nvmVersionsDir)) {
        try {
          const versions = fs.readdirSync(nvmVersionsDir).sort().reverse();
          for (const v of versions) {
            for (const name of candidateNames[providerId]) {
              const candidate = path.join(nvmVersionsDir, v, 'bin', name);
              if (fs.existsSync(candidate)) {
                return candidate;
              }
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    // Check T3 managed antigravity-acp directory if agy-acp is requested
    if (providerId === 'agy-acp') {
      const platformArch = `${process.platform}-${process.arch}`;
      const t3ManagedDir = path.join(
        home,
        '.t3',
        'tools',
        'antigravity-acp',
        platformArch
      );
      const activeJsonPath = path.join(t3ManagedDir, 'active.json');
      if (fs.existsSync(activeJsonPath)) {
        try {
          const active = JSON.parse(fs.readFileSync(activeJsonPath, 'utf8')) as {
            releaseId?: string;
          };
          if (active.releaseId) {
            const exeName = isWin ? 'agy_acp_server.exe' : 'agy_acp_server.par';
            const managedExe = path.join(
              t3ManagedDir,
              'versions',
              active.releaseId,
              exeName
            );
            if (fs.existsSync(managedExe)) {
              return managedExe;
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    return null;
  }

  /**
   * Replicates T3 Code's `ClaudeExecutable.ts` Windows shim resolution:
   * Node 20.12+ cannot spawn `.cmd`/`.bat`/`.ps1` directly without a shell;
   * resolves `@anthropic-ai/claude-code/bin/claude.exe` or `cli.js`.
   */
  private static resolveWindowsShimIfNeeded(
    providerId: 'agy-acp' | 'codex-cli' | 'claude-cli',
    resolvedPath: string
  ): string {
    if (process.platform !== 'win32') return resolvedPath;
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!['.cmd', '.bat', '.ps1'].includes(ext)) return resolvedPath;

    const shimDir = path.dirname(resolvedPath);
    if (providerId === 'claude-cli') {
      const candidates = [
        path.join(
          shimDir,
          'node_modules',
          '@anthropic-ai',
          'claude-code',
          'bin',
          'claude.exe'
        ),
        path.join(
          shimDir,
          'node_modules',
          '@anthropic-ai',
          'claude-code',
          'cli.js'
        ),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
    }
    return resolvedPath;
  }

  static probeProviderStatusSync(
    providerId: 'agy-acp' | 'codex-cli' | 'claude-cli',
    customBinaryPath?: string
  ): ProviderRuntimeStatus {
    const cached = this.statusCache.get(providerId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS && !customBinaryPath) {
      return cached.status;
    }

    const binary = this.resolveBinaryPath(providerId, customBinaryPath);
    const home = os.homedir();

    if (!binary) {
      const installHint =
        providerId === 'agy-acp'
          ? 'Install Antigravity CLI (`agy`) or point Binary Path to `~/.t3/tools/antigravity-acp/...`'
          : providerId === 'codex-cli'
            ? 'Install OpenAI Codex CLI (`npm i -g @openai/codex` or `brew install codex`)'
            : 'Install Anthropic Claude Code CLI (`npm i -g @anthropic-ai/claude-code`)';

      const status: ProviderRuntimeStatus = {
        installed: false,
        authenticated: false,
        version: 'Not Found',
        resolvedBinaryPath: '',
        authLabel: 'CLI Not Installed',
        statusDetail: installHint,
      };
      this.statusCache.set(providerId, { status, timestamp: Date.now() });
      return status;
    }

    let authenticated = false;
    let authLabel = 'Session Ready';
    let version = 'Installed';

    if (providerId === 'agy-acp') {
      const hasGeminiAuth =
        fs.existsSync(path.join(home, '.gemini')) ||
        fs.existsSync(path.join(home, '.config', 'antigravity')) ||
        fs.existsSync(path.join(home, '.t3', 'userdata', 'providers', 'antigravity'));
      authenticated = hasGeminiAuth;
      authLabel = hasGeminiAuth ? 'Google / Antigravity ACP Auth' : 'Run `agy acp --login`';
      version = binary.endsWith('.par') ? 'ACP Managed Server' : 'agy CLI + ACP';
    } else if (providerId === 'codex-cli') {
      const codexAuthFile = path.join(home, '.codex', 'auth.json');
      const codexConfigFile = path.join(home, '.codex', 'config.toml');
      authenticated =
        fs.existsSync(codexAuthFile) ||
        fs.existsSync(codexConfigFile) ||
        Boolean(process.env.OPENAI_API_KEY);
      authLabel = authenticated ? 'Codex Auth (`~/.codex`)' : 'Run `codex login`';
      version = 'codex-cli (app-server / exec)';
    } else if (providerId === 'claude-cli') {
      const claudeJson = path.join(home, '.claude.json');
      const claudeDir = path.join(home, '.claude');
      authenticated =
        fs.existsSync(claudeJson) ||
        fs.existsSync(claudeDir) ||
        Boolean(process.env.ANTHROPIC_API_KEY);
      authLabel = authenticated ? 'Claude Subscription / API Key' : 'Run `claude login`';
      version = 'claude-code CLI';
    }

    const status: ProviderRuntimeStatus = {
      installed: true,
      authenticated,
      version,
      resolvedBinaryPath: binary,
      authLabel,
      statusDetail: `Resolved binary: ${binary}`,
    };
    this.statusCache.set(providerId, { status, timestamp: Date.now() });
    return status;
  }

  static async probeProviderStatusAsync(
    providerId: 'agy-acp' | 'codex-cli' | 'claude-cli',
    customBinaryPath?: string
  ): Promise<ProviderRuntimeStatus> {
    const syncStatus = this.probeProviderStatusSync(providerId, customBinaryPath);
    if (!syncStatus.installed || !syncStatus.resolvedBinaryPath) {
      return syncStatus;
    }

    try {
      const env = this.getExtendedPathEnv();
      if (!syncStatus.resolvedBinaryPath.endsWith('.par')) {
        const { stdout, stderr } = await execFileAsync(
          syncStatus.resolvedBinaryPath,
          ['--version'],
          { env, timeout: 4000 }
        );
        const verOut = (stdout || stderr).trim().split('\n')[0];
        if (verOut) {
          syncStatus.version = verOut;
        }
      }
    } catch {
      // Keep sync version string
    }

    this.statusCache.set(providerId, {
      status: syncStatus,
      timestamp: Date.now(),
    });
    return syncStatus;
  }

  /**
   * Executes a legal prompt turn through one of the T3-style CLI agent harnesses:
   * - `codex-cli`: Replicates T3's `CodexTextGeneration.ts` (`codex exec --ephemeral --skip-git-repo-check -s read-only -m <model> -c model_reasoning_effort="<effort>" --output-last-message <tempFile> -`)
   * - `agy-acp`: Runs `agy --print --model <model> --effort <effort>` (or ACP stdio handshake if pointed at `agy_acp_server.par`)
   * - `claude-cli`: Runs `claude -p --output-format text --model <model> --system-prompt <systemPrompt>`
   */
  static async runCliTurn(params: {
    providerId: 'agy-acp' | 'codex-cli' | 'claude-cli';
    model: string;
    systemPrompt: string;
    userPrompt: string;
    binaryPath?: string;
    customArgs?: string;
    reasoningEffort?: string;
    cwd?: string;
    mcpInjection?: {
      claudeMcpConfigJson?: string;
      codexConfigFlags?: string[];
      mcpConfigFilePath?: string;
      courtlistenerToken?: string;
    };
  }): Promise<string> {
    const binary = this.resolveBinaryPath(params.providerId, params.binaryPath);
    if (!binary) {
      throw new Error(
        `CLI binary for ${params.providerId} was not found on this machine.`
      );
    }

    const baseEnv = this.getExtendedPathEnv();
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      ...(params.mcpInjection?.mcpConfigFilePath
        ? { LEXHARNESS_MCP_CONFIG_PATH: params.mcpInjection.mcpConfigFilePath }
        : {}),
      ...(params.mcpInjection?.courtlistenerToken
        ? { COURTLISTENER_API_TOKEN: params.mcpInjection.courtlistenerToken }
        : {}),
    };

    const effort = params.reasoningEffort || 'medium';
    const combinedPrompt = [
      `### MANDATORY LEGAL SYSTEM PROMPT & GOVERNANCE DIRECTIVE`,
      params.systemPrompt,
      '',
      `### ATTORNEY TASK & MATTER RECORD`,
      params.userPrompt,
    ].join('\n');

    if (params.providerId === 'codex-cli') {
      return this.runCodexExec({
        binary,
        model: params.model,
        effort,
        prompt: combinedPrompt,
        env,
        cwd: params.cwd,
        codexConfigFlags: params.mcpInjection?.codexConfigFlags,
      });
    }

    if (params.providerId === 'agy-acp') {
      return this.runAntigravityTurn({
        binary,
        model: params.model,
        effort,
        prompt: combinedPrompt,
        env,
        cwd: params.cwd,
      });
    }

    return this.runClaudeCliTurn({
      binary,
      model: params.model,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      env,
      cwd: params.cwd,
      claudeMcpConfigJson: params.mcpInjection?.claudeMcpConfigJson,
    });
  }

  private static async runCodexExec(input: {
    binary: string;
    model: string;
    effort: string;
    prompt: string;
    env: NodeJS.ProcessEnv;
    cwd?: string;
    codexConfigFlags?: string[];
  }): Promise<string> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexharness-codex-'));
    const outputPath = path.join(tmpDir, 'last-message.txt');

    // Replicates T3 Code's exact `CodexTextGeneration.ts` non-interactive invocation + Legal MCP server injection
    const args = [
      'exec',
      '--config',
      'features.plugins=false',
      '--config',
      'features.apps=false',
      ...(input.codexConfigFlags || []),
      '--ephemeral',
      '--skip-git-repo-check',
      '-s',
      'read-only',
      '--model',
      input.model,
      '--config',
      `model_reasoning_effort="${input.effort}"`,
      '--output-last-message',
      outputPath,
      '-',
    ];

    try {
      await this.spawnWithStdin(input.binary, args, input.prompt, input.env, input.cwd, 120_000);
      if (fs.existsSync(outputPath)) {
        const text = fs.readFileSync(outputPath, 'utf8').trim();
        if (text) return text;
      }
      throw new Error('Codex CLI completed without writing an output message.');
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private static async runAntigravityTurn(input: {
    binary: string;
    model: string;
    effort: string;
    prompt: string;
    env: NodeJS.ProcessEnv;
    cwd?: string;
  }): Promise<string> {
    // If pointed at the standalone `agy` CLI, use non-interactive `--print` mode with `--model` and `--effort`
    const args = [
      '--disable-slash-commands',
      '--model',
      input.model,
      '--effort',
      input.effort,
      '--output-format',
      'text',
      '--print',
      input.prompt,
    ];

    const out = await this.spawnWithStdin(
      input.binary,
      args,
      '',
      {
        ...input.env,
        AGY_ACP_FORCE_FILE_STORAGE: '1',
        PYTHONUNBUFFERED: '1',
      },
      input.cwd,
      120_000
    );
    return out.trim();
  }

  private static async runClaudeCliTurn(input: {
    binary: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    env: NodeJS.ProcessEnv;
    cwd?: string;
    claudeMcpConfigJson?: string;
  }): Promise<string> {
    const args = [
      '-p',
      '--output-format',
      'text',
      '--model',
      input.model,
      '--system-prompt',
      input.systemPrompt,
      ...(input.claudeMcpConfigJson
        ? ['--mcp-config', input.claudeMcpConfigJson]
        : []),
      input.userPrompt,
    ];

    const out = await this.spawnWithStdin(
      input.binary,
      args,
      '',
      input.env,
      input.cwd,
      120_000
    );
    return out.trim();
  }

  private static spawnWithStdin(
    command: string,
    args: string[],
    stdinText: string,
    env: NodeJS.ProcessEnv,
    cwd?: string,
    timeoutMs = 120_000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const useShell =
        process.platform === 'win32' &&
        ['.cmd', '.bat', '.ps1'].includes(path.extname(command).toLowerCase());

      const child = spawn(command, args, {
        env,
        cwd: cwd || os.homedir(),
        shell: useShell,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`CLI Agent process timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(
              (stderr || stdout || `Exited with code ${code}`).trim().slice(0, 400)
            )
          );
        }
      });

      if (stdinText.length > 0) {
        child.stdin.write(stdinText, 'utf8');
      }
      child.stdin.end();
    });
  }

  static invalidateStatusCache(): void {
    this.statusCache.clear();
  }

  /**
   * Replicates T3 Code's local environment machine label (e.g., "Brett's MacBook Pro").
   */
  static getMachineLabel(): string {
    if (this.cachedMachineLabel) return this.cachedMachineLabel;
    if (process.platform === 'darwin') {
      try {
        const name = execFileSync('scutil', ['--get', 'ComputerName'], {
          encoding: 'utf8',
          timeout: 1500,
        }).trim();
        if (name) {
          this.cachedMachineLabel = name;
          return name;
        }
      } catch {
        // Fallback below
      }
    }
    const host = os.hostname().replace(/\.local$/i, '');
    this.cachedMachineLabel = host || 'Local Computer';
    return this.cachedMachineLabel;
  }

  /**
   * Replicates T3 Code's `formatCodexPlanType` subscription label mapping.
   */
  private static formatCodexPlanType(planType?: string | null): string | null {
    switch (planType) {
      case 'free':
        return 'ChatGPT Free Subscription';
      case 'go':
        return 'ChatGPT Go Subscription';
      case 'plus':
        return 'ChatGPT Plus Subscription';
      case 'pro':
        return 'ChatGPT Pro 200 Subscription';
      case 'prolite':
        return 'ChatGPT Pro 100 Subscription';
      case 'promax':
        return 'ChatGPT Pro 500 Subscription';
      case 'self_serve_business_prolite':
        return 'ChatGPT Business Premium Subscription';
      case 'team':
      case 'self_serve_business_usage_based':
      case 'business':
        return 'ChatGPT Business Subscription';
      case 'ent26':
      case 'enterprise_cbp_automation':
      case 'enterprise_cbp_usage_based':
      case 'enterprise':
        return 'ChatGPT Enterprise Subscription';
      case 'edu':
        return 'ChatGPT Education Subscription';
      default:
        return planType ? `ChatGPT (${planType})` : null;
    }
  }

  /**
   * Reads a Codex home directory (`~/.codex` or a T3 shadow home directory) and extracts
   * authentication status, account email, and subscription tier from `auth.json`.
   */
  static parseCodexAuthInfo(codexHomeDir: string): {
    authenticated: boolean;
    email: string | null;
    subscriptionLabel: string | null;
  } {
    const authFile = path.join(codexHomeDir, 'auth.json');
    if (!fs.existsSync(authFile)) {
      return {
        authenticated: Boolean(process.env.OPENAI_API_KEY),
        email: null,
        subscriptionLabel: process.env.OPENAI_API_KEY ? 'OpenAI API Key' : null,
      };
    }

    try {
      const raw = JSON.parse(fs.readFileSync(authFile, 'utf8')) as {
        OPENAI_API_KEY?: string | null;
        tokens?: {
          id_token?: string;
          access_token?: string;
        };
      };
      const idToken = raw.tokens?.id_token;
      if (idToken && idToken.includes('.')) {
        const parts = idToken.split('.');
        if (parts[1]) {
          const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf8')
          ) as {
            email?: string;
            'https://api.openai.com/auth'?: {
              chatgpt_plan_type?: string;
            };
          };
          const email = payload.email?.trim() || null;
          const planType =
            payload['https://api.openai.com/auth']?.chatgpt_plan_type || null;
          return {
            authenticated: true,
            email,
            subscriptionLabel: this.formatCodexPlanType(planType),
          };
        }
      }
      if (raw.tokens?.access_token || raw.OPENAI_API_KEY) {
        return {
          authenticated: true,
          email: null,
          subscriptionLabel: raw.OPENAI_API_KEY ? 'OpenAI API Key' : 'ChatGPT Subscription',
        };
      }
    } catch {
      // Ignore malformed auth.json
    }
    return {
      authenticated: false,
      email: null,
      subscriptionLabel: null,
    };
  }

  /**
   * Replicates T3 Code's `CodexHomeLayout.ts` (`resolveCodexHomeLayout` + `ensureShadowAuthIsPrivate` + `ensureSymlink`):
   * Creates an account-isolated Shadow Home directory that symlinks shared Codex configuration/skills
   * from `~/.codex` while ensuring `auth.json` is strictly private to the shadow home.
   */
  static ensureCodexShadowHomeLayout(
    sharedHomePath: string,
    shadowHomePath: string
  ): void {
    const resolvedShared = path.resolve(sharedHomePath);
    const resolvedShadow = path.resolve(shadowHomePath);
    if (resolvedShared === resolvedShadow) return;

    fs.mkdirSync(resolvedShadow, { recursive: true });

    // Ensure auth.json in shadow home is never a symlink (`ensureShadowAuthIsPrivate`)
    const shadowAuthPath = path.join(resolvedShadow, 'auth.json');
    try {
      const stat = fs.lstatSync(shadowAuthPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(shadowAuthPath);
      }
    } catch {
      // Missing is expected prior to sign-in
    }

    // Symlink shared configuration & skill entries from `~/.codex`
    const sharedEntriesToLink = [
      'config.toml',
      'skills',
      'instructions.md',
      'rules',
      'memories',
    ];
    for (const entryName of sharedEntriesToLink) {
      const target = path.join(resolvedShared, entryName);
      const link = path.join(resolvedShadow, entryName);
      if (!fs.existsSync(target)) continue;
      try {
        const lstat = fs.lstatSync(link);
        if (lstat.isSymbolicLink()) {
          const currentTarget = path.resolve(path.dirname(link), fs.readlinkSync(link));
          if (currentTarget !== target) {
            fs.unlinkSync(link);
            fs.symlinkSync(
              target,
              link,
              process.platform === 'win32' && fs.statSync(target).isDirectory()
                ? 'junction'
                : undefined
            );
          }
        }
      } catch {
        try {
          fs.symlinkSync(
            target,
            link,
            process.platform === 'win32' && fs.statSync(target).isDirectory()
              ? 'junction'
              : undefined
          );
        } catch {
          // Ignore symlink permission errors on restricted systems
        }
      }
    }
  }

  /**
   * Checks whether any agent runtime has the CourtListener MCP toolset configured,
   * inspecting Codex `~/.codex/config.toml`, Claude `~/.claude.json`, or Antigravity skills.
   */
  static probeCourtListenerMcp(options?: {
    homeDir?: string;
    token?: string | null;
    preferredDriver?: 'codex' | 'claudeAgent' | 'antigravity';
  }): CourtListenerMcpAssuranceState {
    const home = options?.homeDir || os.homedir();
    const token = options?.token ?? process.env.COURTLISTENER_API_TOKEN ?? null;
    const hasToken = Boolean(token && token.trim().length > 0);
    const maskedAuthToken = hasToken
      ? `${token!.trim().slice(0, 4)}••••••••${token!.trim().slice(-4)}`
      : null;
    const signupUrl = 'https://www.courtlistener.com/help/api/rest/';

    const installedDrivers: ('codex' | 'claudeAgent' | 'antigravity')[] = [];
    let configHasToken = hasToken;

    // 1. Check Codex config (~/.codex/config.toml)
    const codexConfigPath = path.join(home, '.codex', 'config.toml');
    if (fs.existsSync(codexConfigPath)) {
      try {
        const content = fs.readFileSync(codexConfigPath, 'utf8');
        if (
          content.includes('[mcp_servers.courtlistener]') ||
          content.includes('courtlistener-mcp') ||
          content.includes('[mcp_servers."courtlistener"]')
        ) {
          installedDrivers.push('codex');
          if (content.includes('COURTLISTENER_API_TOKEN')) {
            configHasToken = true;
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // 2. Check Claude config (~/.claude.json)
    const claudeJsonPath = path.join(home, '.claude.json');
    if (fs.existsSync(claudeJsonPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
        if (raw?.mcpServers?.courtlistener) {
          installedDrivers.push('claudeAgent');
          if (raw.mcpServers.courtlistener.env?.COURTLISTENER_API_TOKEN) {
            configHasToken = true;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // 3. Check Antigravity / Gemini
    const agySkillsDir = path.join(
      home,
      '.gemini',
      'antigravity-cli',
      'skills'
    );
    if (fs.existsSync(path.join(agySkillsDir, 'courtlistener'))) {
      installedDrivers.push('antigravity');
    }

    const hasInstalled = installedDrivers.length > 0;
    const displayNameMap: Record<'codex' | 'claudeAgent' | 'antigravity', string> = {
      codex: 'OpenAI Codex CLI',
      claudeAgent: 'Claude Code CLI',
      antigravity: 'Antigravity ACP (agy)',
    };

    let activeDriver: 'codex' | 'claudeAgent' | 'antigravity' | null = options?.preferredDriver || null;
    if (!activeDriver || !installedDrivers.includes(activeDriver)) {
      activeDriver = installedDrivers[0] || null;
    }

    return {
      hasInstalledAgent: hasInstalled,
      configuredAgentDisplayName: activeDriver ? displayNameMap[activeDriver] : null,
      configuredAgentDriver: activeDriver,
      installedDrivers,
      hasAuthToken: configHasToken,
      maskedAuthToken: hasToken
        ? maskedAuthToken
        : configHasToken
          ? 'Configured in agent settings'
          : null,
      signupUrl,
      status: !hasInstalled ? 'not_configured' : configHasToken ? 'ready' : 'needs_token',
      statusHeadline: !hasInstalled
        ? 'CourtListener MCP not yet installed.'
        : configHasToken
          ? `CourtListener MCP active on ${displayNameMap[activeDriver!]}.`
          : `CourtListener configured on ${displayNameMap[activeDriver!]} · Free API token recommended.`,
      statusDetail: !hasInstalled
        ? 'LexHarness will automatically ensure CourtListener is installed on your default agent.'
        : configHasToken
          ? 'Live case law search, citation verification, and opinion retrieval active (5,000 req/hr).'
          : 'Sign up for a free CourtListener account to unlock full API limits.',
    };
  }

  /**
   * Installs or updates the CourtListener MCP toolset configuration in the specified agent's config.
   */
  static installCourtListenerMcpOnAgent(params: {
    driver: 'codex' | 'claudeAgent' | 'antigravity' | 'all';
    token?: string | null;
    homeDir?: string;
  }): void {
    if (params.driver === 'all') {
      this.installCourtListenerMcpOnAgent({ ...params, driver: 'codex' });
      this.installCourtListenerMcpOnAgent({ ...params, driver: 'claudeAgent' });
      this.installCourtListenerMcpOnAgent({ ...params, driver: 'antigravity' });
      return;
    }

    const home = params.homeDir || os.homedir();
    const token =
      params.token?.trim() || process.env.COURTLISTENER_API_TOKEN?.trim() || null;

    if (params.driver === 'codex') {
      const codexDir = path.join(home, '.codex');
      fs.mkdirSync(codexDir, { recursive: true });
      const configPath = path.join(codexDir, 'config.toml');

      let existing = '';
      if (fs.existsSync(configPath)) {
        try {
          existing = fs.readFileSync(configPath, 'utf8');
        } catch {
          existing = '';
        }
      }

      const mcpBlock = [
        '[mcp_servers.courtlistener]',
        'command = "npx"',
        'args = ["-y", "courtlistener-mcp"]',
        ...(token ? [`env = { COURTLISTENER_API_TOKEN = "${token}" }`] : []),
      ].join('\n');

      const blockRegex = /\[mcp_servers\.courtlistener\][\s\S]*?(?=(\n\[|$))/;
      if (blockRegex.test(existing)) {
        existing = existing.replace(blockRegex, mcpBlock);
      } else {
        existing =
          existing.trimEnd() +
          (existing.trim().length > 0 ? '\n\n' : '') +
          mcpBlock +
          '\n';
      }

      fs.writeFileSync(configPath, existing, 'utf8');
      return;
    }

    if (params.driver === 'claudeAgent') {
      const configPath = path.join(home, '.claude.json');
      let data: Record<string, any> = {};
      if (fs.existsSync(configPath)) {
        try {
          data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {
          data = {};
        }
      }
      data.mcpServers = data.mcpServers || {};
      data.mcpServers.courtlistener = {
        command: 'npx',
        args: ['-y', 'courtlistener-mcp'],
        ...(token ? { env: { COURTLISTENER_API_TOKEN: token } } : {}),
      };
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
      return;
    }

    if (params.driver === 'antigravity') {
      const skillDir = path.join(
        home,
        '.gemini',
        'antigravity-cli',
        'skills',
        'courtlistener'
      );
      fs.mkdirSync(skillDir, { recursive: true });
      const skillMd = `---
name: courtlistener
description: CourtListener MCP toolset for legal case law searches, citation verification, and opinions.
---

# CourtListener MCP Toolset
Provides access to federal and state case law, opinions, oral arguments, and citations.
Command: npx -y courtlistener-mcp
${token ? `COURTLISTENER_API_TOKEN: ${token}\n` : ''}
`;
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
    }
  }

  /**
   * Installs or updates a custom legal MCP server on the specified agent's configuration.
   */
  static installCustomMcpServerOnAgent(params: {
    server: CustomLegalMcpServer;
    homeDir?: string;
  }): void {
    const home = params.homeDir || os.homedir();
    const { server } = params;
    const drivers =
      server.targetDriver === 'all'
        ? (['codex', 'claudeAgent', 'antigravity'] as const)
        : ([server.targetDriver] as const);

    for (const d of drivers) {
      if (d === 'codex') {
        const codexDir = path.join(home, '.codex');
        fs.mkdirSync(codexDir, { recursive: true });
        const configPath = path.join(codexDir, 'config.toml');
        let existing = '';
        if (fs.existsSync(configPath)) {
          try {
            existing = fs.readFileSync(configPath, 'utf8');
          } catch {
            existing = '';
          }
        }
        const envStr =
          server.env && Object.keys(server.env).length > 0
            ? `env = { ${Object.entries(server.env)
                .map(([k, v]) => `"${k}" = "${v}"`)
                .join(', ')} }`
            : '';
        const argsStr = JSON.stringify(server.args);
        const block = [
          `[mcp_servers.${server.id}]`,
          `command = "${server.command}"`,
          `args = ${argsStr}`,
          ...(envStr ? [envStr] : []),
        ].join('\n');

        const regex = new RegExp(
          `\\[mcp_servers\\.${server.id}\\][\\s\\S]*?(?=(\\n\\[|$))`
        );
        if (regex.test(existing)) {
          existing = existing.replace(regex, block);
        } else {
          existing =
            existing.trimEnd() +
            (existing.trim().length > 0 ? '\n\n' : '') +
            block +
            '\n';
        }
        fs.writeFileSync(configPath, existing, 'utf8');
      } else if (d === 'claudeAgent') {
        const configPath = path.join(home, '.claude.json');
        let data: Record<string, any> = {};
        if (fs.existsSync(configPath)) {
          try {
            data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          } catch {
            data = {};
          }
        }
        data.mcpServers = data.mcpServers || {};
        data.mcpServers[server.id] = {
          command: server.command,
          args: server.args,
          ...(server.env && Object.keys(server.env).length > 0
            ? { env: server.env }
            : {}),
        };
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
      } else if (d === 'antigravity') {
        const skillDir = path.join(
          home,
          '.gemini',
          'antigravity-cli',
          'skills',
          server.id
        );
        fs.mkdirSync(skillDir, { recursive: true });
        const skillMd = `---
name: ${server.id}
description: ${server.description || server.name}
---

# ${server.name}
Command: ${server.command} ${server.args.join(' ')}
`;
        fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
      }
    }
  }

  /**
   * Removes a custom legal MCP server from the specified agent's configuration.
   */
  static removeCustomMcpServerFromAgent(params: {
    serverId: string;
    serverName?: string;
    targetDriver?: 'codex' | 'claudeAgent' | 'antigravity' | 'all';
    homeDir?: string;
  }): void {
    const home = params.homeDir || os.homedir();
    const targetDriver = params.targetDriver || 'all';
    const drivers =
      targetDriver === 'all'
        ? (['codex', 'claudeAgent', 'antigravity'] as const)
        : ([targetDriver] as const);

    for (const d of drivers) {
      if (d === 'codex') {
        const configPath = path.join(home, '.codex', 'config.toml');
        if (fs.existsSync(configPath)) {
          try {
            let content = fs.readFileSync(configPath, 'utf8');
            const regex = new RegExp(
              `\\[mcp_servers\\.${params.serverId}\\][\\s\\S]*?(?=(\\n\\[|$))`
            );
            if (regex.test(content)) {
              content = content.replace(regex, '').trimEnd() + '\n';
              fs.writeFileSync(configPath, content, 'utf8');
            }
          } catch {}
        }
      } else if (d === 'claudeAgent') {
        const configPath = path.join(home, '.claude.json');
        if (fs.existsSync(configPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (data?.mcpServers?.[params.serverId]) {
              delete data.mcpServers[params.serverId];
              fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
            }
          } catch {}
        }
      } else if (d === 'antigravity') {
        const skillDir = path.join(
          home,
          '.gemini',
          'antigravity-cli',
          'skills',
          params.serverId
        );
        if (fs.existsSync(skillDir)) {
          fs.rmSync(skillDir, { recursive: true, force: true });
        }
      }
    }
  }

  /**
   * Assures at startup and onboarding that at least one agent has CourtListener MCP installed.
   * If none is found, it automatically installs it on the default agent (Codex > Claude > Antigravity).
   */
  static ensureCourtListenerAssurance(params?: {
    token?: string | null;
    homeDir?: string;
  }): CourtListenerMcpAssuranceState {
    const probe = this.probeCourtListenerMcp(params);
    if (probe.hasInstalledAgent) {
      if (params?.token && !probe.hasAuthToken && probe.configuredAgentDriver) {
        this.installCourtListenerMcpOnAgent({
          driver: probe.configuredAgentDriver,
          token: params.token,
          homeDir: params.homeDir,
        });
        return this.probeCourtListenerMcp(params);
      }
      return probe;
    }

    // Determine the default agent driver
    const codexStatus = this.probeProviderStatusSync('codex-cli');
    const claudeStatus = this.probeProviderStatusSync('claude-cli');
    const agyStatus = this.probeProviderStatusSync('agy-acp');

    let targetDriver: 'codex' | 'claudeAgent' | 'antigravity' = 'codex';
    if (codexStatus.installed) {
      targetDriver = 'codex';
    } else if (claudeStatus.installed) {
      targetDriver = 'claudeAgent';
    } else if (agyStatus.installed) {
      targetDriver = 'antigravity';
    }

    try {
      this.installCourtListenerMcpOnAgent({
        driver: targetDriver,
        token: params?.token,
        homeDir: params?.homeDir,
      });
    } catch {
      // Ignore directory write issues on restricted environments
    }

    return this.probeCourtListenerMcp(params);
  }

  /**
   * Builds T3 Code's `Connect your agents` onboarding & connection state (`welcome-BH9_mGm9.js` + `CodexSetupSection-D8WpB4Jb.js`).
   */
  static buildAgentOnboardingState(params: {
    completedAt: string | null;
    setupModes: Record<string, 'existing' | 'managed'>;
    additionalCodexAccounts: {
      instanceId: string;
      displayName: string;
      shadowHomePath: string;
      setupMode: 'existing' | 'managed';
      createdAt: string;
    }[];
    cliOverrides: Record<string, { binaryPath?: string }>;
    courtListenerToken?: string | null;
    homeDir?: string;
  }): AgentOnboardingState {
    const home = params.homeDir || os.homedir();
    const isWin = process.platform === 'win32';
    const platformOs: 'darwin' | 'windows' | 'linux' = isWin
      ? 'windows'
      : process.platform === 'darwin'
        ? 'darwin'
        : 'linux';

    const sharedCodexHome = path.join(home, '.codex');
    const codexStatus = this.probeProviderStatusSync(
      'codex-cli',
      params.cliOverrides['codex-cli']?.binaryPath
    );
    const codexAuth = this.parseCodexAuthInfo(sharedCodexHome);
    const codexBin = codexStatus.resolvedBinaryPath || 'codex';
    const codexInstallCmd = isWin
      ? 'irm https://chatgpt.com/codex/install.ps1 | iex'
      : 'curl -fsSL https://chatgpt.com/codex/install.sh | sh';

    const primaryCodexReady = codexStatus.installed && codexAuth.authenticated;
    const primaryCodexInstance: AgentConnectionInstance = {
      instanceId: 'codex-cli',
      driver: 'codex',
      providerId: 'codex-cli',
      displayName: 'Codex',
      setupMode: params.setupModes['codex-cli'] ?? 'existing',
      enabled: true,
      installed: codexStatus.installed,
      authenticated: codexAuth.authenticated,
      status: primaryCodexReady
        ? 'ready'
        : codexStatus.installed
          ? 'signIn'
          : 'install',
      headline: primaryCodexReady
        ? 'Connected with your Codex CLI.'
        : codexStatus.installed
          ? 'Code with your ChatGPT subscription.'
          : 'Not found · CLI not detected on PATH.',
      detail: primaryCodexReady
        ? codexAuth.subscriptionLabel
        : 'Run `codex login` or install Codex CLI.',
      email: codexAuth.email,
      subscriptionLabel: codexAuth.subscriptionLabel,
      version: codexStatus.version,
      resolvedBinaryPath: codexStatus.resolvedBinaryPath,
      homePath: sharedCodexHome,
      shadowHomePath: '',
      installCommand: codexInstallCmd,
      loginCommand: `${codexBin} login`,
      isAdditionalAccount: false,
    };

    const extraCodexInstances: AgentConnectionInstance[] =
      params.additionalCodexAccounts.map((acct) => {
        this.ensureCodexShadowHomeLayout(sharedCodexHome, acct.shadowHomePath);
        const shadowAuth = this.parseCodexAuthInfo(acct.shadowHomePath);
        const ready = codexStatus.installed && shadowAuth.authenticated;
        const loginCmd = isWin
          ? `$env:CODEX_HOME="${acct.shadowHomePath}"; ${codexBin} login`
          : `CODEX_HOME="${acct.shadowHomePath}" ${codexBin} login`;

        return {
          instanceId: acct.instanceId,
          driver: 'codex',
          providerId: 'codex-cli',
          displayName: acct.displayName,
          setupMode: acct.setupMode,
          enabled: true,
          installed: codexStatus.installed,
          authenticated: shadowAuth.authenticated,
          status: ready ? 'ready' : codexStatus.installed ? 'signIn' : 'install',
          headline: ready
            ? 'Connected with your Codex CLI.'
            : 'Code with your ChatGPT subscription.',
          detail: ready
            ? shadowAuth.subscriptionLabel || `Shadow Home: ${acct.shadowHomePath}`
            : `Isolated account profile (${acct.displayName})`,
          email: shadowAuth.email,
          subscriptionLabel: shadowAuth.subscriptionLabel,
          version: codexStatus.version,
          resolvedBinaryPath: codexStatus.resolvedBinaryPath,
          homePath: sharedCodexHome,
          shadowHomePath: acct.shadowHomePath,
          installCommand: codexInstallCmd,
          loginCommand: loginCmd,
          isAdditionalAccount: true,
        };
      });

    // Claude Agent CLI (`claudeAgent` in T3)
    const claudeStatus = this.probeProviderStatusSync(
      'claude-cli',
      params.cliOverrides['claude-cli']?.binaryPath
    );
    const claudeBin = claudeStatus.resolvedBinaryPath || 'claude';
    const claudeInstallCmd = isWin
      ? 'irm https://claude.ai/install.ps1 | iex'
      : 'curl -fsSL https://claude.ai/install.sh | bash';
    const claudeReady = claudeStatus.installed && claudeStatus.authenticated;

    const claudeInstance: AgentConnectionInstance = {
      instanceId: 'claude-cli',
      driver: 'claudeAgent',
      providerId: 'claude-cli',
      displayName: 'Claude',
      setupMode: 'existing',
      enabled: true,
      installed: claudeStatus.installed,
      authenticated: claudeStatus.authenticated,
      status: claudeReady
        ? 'ready'
        : claudeStatus.installed
          ? 'signIn'
          : 'install',
      headline: claudeReady
        ? 'Ready to code.'
        : claudeStatus.installed
          ? 'Not authenticated'
          : 'Not found',
      detail: claudeReady
        ? null
        : claudeStatus.installed
          ? 'Run `claude auth login` to connect your Claude subscription.'
          : 'CLI not detected on PATH.',
      email: null,
      subscriptionLabel: claudeReady ? 'Claude Code CLI' : null,
      version: claudeStatus.version,
      resolvedBinaryPath: claudeStatus.resolvedBinaryPath,
      homePath: path.join(home, '.claude'),
      shadowHomePath: '',
      installCommand: claudeInstallCmd,
      loginCommand: `${claudeBin} auth login`,
    };

    // Antigravity ACP (`antigravity` in T3)
    const agyStatus = this.probeProviderStatusSync(
      'agy-acp',
      params.cliOverrides['agy-acp']?.binaryPath
    );
    const agyReady = agyStatus.installed && agyStatus.authenticated;
    const agyBin = agyStatus.resolvedBinaryPath || 'agy';

    const agyInstance: AgentConnectionInstance = {
      instanceId: 'agy-acp',
      driver: 'antigravity',
      providerId: 'agy-acp',
      displayName: 'Antigravity',
      setupMode: 'existing',
      enabled: true,
      installed: agyStatus.installed,
      authenticated: agyStatus.authenticated,
      status: agyReady ? 'ready' : agyStatus.installed ? 'signIn' : 'install',
      headline: agyReady
        ? 'Connected with your Antigravity ACP CLI.'
        : agyStatus.installed
          ? 'Installed · Sign-in required'
          : 'Not found',
      detail: agyReady
        ? null
        : agyStatus.installed
          ? 'Sign in with Google or configure Gemini API key.'
          : 'CLI not detected on PATH.',
      email: null,
      subscriptionLabel: agyReady ? agyStatus.version : null,
      version: agyStatus.version,
      resolvedBinaryPath: agyStatus.resolvedBinaryPath,
      homePath: path.join(home, '.gemini'),
      shadowHomePath: '',
      installCommand: 'agy --version',
      loginCommand: `${agyBin} login`,
    };

    const courtListenerAssurance = this.ensureCourtListenerAssurance({
      token: params.courtListenerToken,
      homeDir: params.homeDir,
    });

    return {
      completedAt: params.completedAt,
      machineLabel: this.getMachineLabel(),
      platformOs,
      agentInstances: [
        primaryCodexInstance,
        ...extraCodexInstances,
        claudeInstance,
        agyInstance,
      ],
      courtListenerAssurance,
    };
  }

  /**
   * Replicates T3 Code's inline onboarding setup terminal (`Vt` in `welcome-BH9_mGm9.js`),
   * executing install or sign-in commands (`codex login`, `claude auth login`, install scripts)
   * and streaming live terminal output + any detected OAuth sign-in URL back to the renderer.
   */
  static startSetupTerminalSession(params: {
    sessionId: string;
    instance: AgentConnectionInstance;
    mode: 'install' | 'login' | 'custom';
    customCommand?: string;
    onEvent: (event: AgentSetupTerminalEvent) => void;
  }): void {
    const command =
      params.customCommand ||
      (params.mode === 'install'
        ? params.instance.installCommand
        : params.instance.loginCommand);

    const existing = this.activeSetupSessions.get(params.sessionId);
    if (existing) {
      try {
        existing.kill('SIGTERM');
      } catch {
        // Ignore
      }
      this.activeSetupSessions.delete(params.sessionId);
    }

    let output = `$ ${command}\n`;
    let detectedAuthUrl: string | null = null;

    params.onEvent({
      sessionId: params.sessionId,
      instanceId: params.instance.instanceId,
      driver: params.instance.driver,
      command,
      phase: 'running',
      output,
      detectedAuthUrl: null,
    });

    const isWin = process.platform === 'win32';
    const baseEnv = this.getExtendedPathEnv();
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      ...(params.instance.shadowHomePath
        ? { CODEX_HOME: params.instance.shadowHomePath }
        : {}),
    };

    const shellCmd = isWin ? 'powershell.exe' : process.env.SHELL || '/bin/zsh';
    const shellArgs = isWin
      ? ['-NoProfile', '-NonInteractive', '-Command', command]
      : ['-lc', command];

    const child = spawn(shellCmd, shellArgs, {
      env,
      cwd: os.homedir(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.activeSetupSessions.set(params.sessionId, child);

    const extractUrl = (text: string) => {
      const urlMatch = text.match(/https:\/\/[^\s"'<>]+/i);
      if (urlMatch && urlMatch[0]) {
        detectedAuthUrl = urlMatch[0];
      }
    };

    child.stdout.on('data', (chunk: Buffer) => {
      const str = chunk.toString('utf8');
      output += str;
      extractUrl(str);
      params.onEvent({
        sessionId: params.sessionId,
        instanceId: params.instance.instanceId,
        driver: params.instance.driver,
        command,
        phase: 'running',
        output,
        detectedAuthUrl,
      });
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const str = chunk.toString('utf8');
      output += str;
      extractUrl(str);
      params.onEvent({
        sessionId: params.sessionId,
        instanceId: params.instance.instanceId,
        driver: params.instance.driver,
        command,
        phase: 'running',
        output,
        detectedAuthUrl,
      });
    });

    child.on('error', (err) => {
      this.activeSetupSessions.delete(params.sessionId);
      this.invalidateStatusCache();
      output += `\n[Error]: ${err.message}\n`;
      params.onEvent({
        sessionId: params.sessionId,
        instanceId: params.instance.instanceId,
        driver: params.instance.driver,
        command,
        phase: 'failed',
        output,
        exitCode: 1,
        detectedAuthUrl,
      });
    });

    child.on('close', (code) => {
      this.activeSetupSessions.delete(params.sessionId);
      this.invalidateStatusCache();
      output += `\n[Process exited with code ${code ?? 0}]\n`;
      params.onEvent({
        sessionId: params.sessionId,
        instanceId: params.instance.instanceId,
        driver: params.instance.driver,
        command,
        phase: code === 0 ? 'completed' : 'failed',
        output,
        exitCode: code,
        detectedAuthUrl,
      });
    });
  }

  static stopSetupTerminalSession(sessionId: string): void {
    const child = this.activeSetupSessions.get(sessionId);
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {
        // Ignore
      }
      this.activeSetupSessions.delete(sessionId);
    }
    this.invalidateStatusCache();
  }
}
