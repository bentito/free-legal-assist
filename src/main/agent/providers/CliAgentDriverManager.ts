import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { LLMProviderId, ProviderRuntimeStatus } from '../../../shared/types';

const execFileAsync = promisify(execFile);

/**
 * Replicates T3 Code's cross-platform CLI & ACP Agent Driver resolution and execution
 * for:
 *  1. Antigravity ACP (`agy` / `agy_acp_server.par` / `agy_acp_server.exe`)
 *  2. OpenAI Codex Agent CLI (`codex exec` / `codex app-server`)
 *  3. Anthropic Claude Code Agent CLI (`claude` / `claude.exe` / `@anthropic-ai/claude-code`)
 */
export class CliAgentDriverManager {
  private static statusCache = new Map<
    LLMProviderId,
    { status: ProviderRuntimeStatus; timestamp: number }
  >();
  private static CACHE_TTL_MS = 30_000;

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
      '--print',
      '--disable-slash-commands',
      '--model',
      input.model,
      '--effort',
      input.effort,
      '--output-format',
      'text',
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
}
