import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {
  DesktopRuntimeArch,
  DesktopUpdateActionResult,
  DesktopUpdateCheckResult,
  DesktopUpdateReleaseNote,
  DesktopUpdateState,
} from '../../shared/types';
import {
  normalizeDesktopUpdateReleaseNotes,
  RawReleaseNoteEntry,
} from './releaseNotesParser';
import {
  compareSemverVersions,
  createInitialDesktopUpdateState,
  DesktopUpdateInstallRecord,
  DesktopUpdateRuntimeInfo,
  reduceDesktopUpdateStateOnCheckFailure,
  reduceDesktopUpdateStateOnCheckStart,
  reduceDesktopUpdateStateOnDownloadComplete,
  reduceDesktopUpdateStateOnDownloadFailure,
  reduceDesktopUpdateStateOnDownloadProgress,
  reduceDesktopUpdateStateOnDownloadStart,
  reduceDesktopUpdateStateOnInstallFailure,
  reduceDesktopUpdateStateOnNoUpdate,
  reduceDesktopUpdateStateOnUpdateAvailable,
  resolveNotAppliedInstallVersion,
  shouldBroadcastDownloadProgress,
} from './updateMachine';

export const AUTO_UPDATE_STARTUP_DELAY_MS = 15_000;
export const AUTO_UPDATE_POLL_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const DESKTOP_UPDATE_INSTALL_RECORD_FILE = 'desktop-update-install.json';
export const GITHUB_RELEASES_REPO = 'bentito/free-legal-assist';

export interface AutoUpdateDisabledArgs {
  hasUpdateFeedConfig: boolean;
  isDevelopment: boolean;
  isPackaged: boolean;
  disabledByEnv: boolean;
  mockUpdates?: boolean;
}

export function sanitizeUpdaterErrorMessage(raw: string): string {
  const firstLine = (raw.split(/[\r\n]/, 1)[0] ?? '').trim();
  if (
    /Cannot find latest[\w-]*\.yml/i.test(raw) ||
    /latest[\w-]*\.yml.*404/i.test(raw)
  ) {
    return 'Update metadata is not available for the latest GitHub release yet.';
  }
  const cleaned = firstLine
    .replace(/\b(?:https?|file):\/\/[^\s"'<>)]+/gi, '')
    .replace(/\s+Headers:\s*\{.*$/i, '')
    .replace(/\s+at\s+\S+\s*\(.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Could not check for updates.';
  return cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}...` : cleaned;
}

export function isMissingUpdateMetadataError(raw: string): boolean {
  return (
    /Cannot find latest[\w-]*\.yml/i.test(raw) ||
    /latest[\w-]*\.yml.*404/i.test(raw) ||
    /ERR_UPDATER_CHANNEL_FILE_NOT_FOUND/i.test(raw)
  );
}

export function getAutoUpdateDisabledReason(
  args: AutoUpdateDisabledArgs
): string | null {
  if (args.disabledByEnv) {
    return 'Automatic updates are disabled by the LEXHARNESS_DISABLE_AUTO_UPDATE setting.';
  }
  if (args.mockUpdates) {
    return null;
  }
  if (!args.hasUpdateFeedConfig) {
    return 'Automatic updates are not available because no update feed is configured.';
  }
  if (args.isDevelopment || !args.isPackaged) {
    return 'Automatic updates are only available in packaged production builds.';
  }
  return null;
}

export function getDefaultSampleReleaseNotes(
  version = '0.9.1'
): DesktopUpdateReleaseNote[] {
  const cleanVersion = version.replace(/^v/i, '');
  const sampleMarkdown = [
    `v${cleanVersion} · 14 changes from 2 contributors`,
    '',
    '- **Responsive guided tour.** Tutorial spotlight cards now adapt cleanly across compact laptop windows, tablets, and mobile browsers.',
    '- **Complete draft safeguards.** Long motion and brief drafts are automatically verified for completeness before peer review.',
    '- **Formatted Word exports.** Exported .docx pleadings now preserve headings, blockquotes, and bullet lists alongside tracked changes.',
    '- **Elapsed turn timing.** Completed research and drafting turns now display total elapsed time in the workspace stream.',
    '',
    '### Plus 10 more bug fixes and improvements.',
  ].join('\n');

  return normalizeDesktopUpdateReleaseNotes(
    sampleMarkdown,
    cleanVersion,
    new Date().toISOString().slice(0, 10)
  ).releaseNotes;
}

export interface DesktopUpdaterServiceOptions {
  userDataDir: string;
  currentVersion: string;
  isPackaged: boolean;
  isDevelopment: boolean;
  resourcesPath?: string;
  runningUnderArm64Translation?: boolean;
  onStateChange?: (state: DesktopUpdateState) => void;
}

export class DesktopUpdaterService {
  private state: DesktopUpdateState;
  private readonly userDataDir: string;
  private readonly installRecordPath: string;
  private readonly isPackaged: boolean;
  private readonly isDevelopment: boolean;
  private readonly resourcesPath: string;
  private readonly mockUpdates: boolean;
  private readonly disabledByEnv: boolean;
  private readonly onStateChange?: (state: DesktopUpdateState) => void;
  private startupTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private activeAction: 'check' | 'download' | 'install' | null = null;
  private updaterConfigured = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private autoUpdaterInstance: any = null;

  constructor(options: DesktopUpdaterServiceOptions) {
    this.userDataDir = options.userDataDir;
    this.installRecordPath = path.join(
      this.userDataDir,
      DESKTOP_UPDATE_INSTALL_RECORD_FILE
    );
    this.isPackaged = options.isPackaged;
    this.isDevelopment = options.isDevelopment;
    this.resourcesPath = options.resourcesPath || process.resourcesPath || '';
    this.mockUpdates = process.env.LEXHARNESS_MOCK_UPDATES === '1';
    this.disabledByEnv = process.env.LEXHARNESS_DISABLE_AUTO_UPDATE === '1';
    this.onStateChange = options.onStateChange;

    const arch: DesktopRuntimeArch =
      process.arch === 'arm64'
        ? 'arm64'
        : process.arch === 'x64'
          ? 'x64'
          : 'other';
    const runningUnderTranslation = Boolean(
      options.runningUnderArm64Translation
    );
    const runtimeInfo: DesktopUpdateRuntimeInfo = {
      hostArch: runningUnderTranslation ? 'arm64' : arch,
      appArch: arch,
      runningUnderArm64Translation: runningUnderTranslation,
    };

    const hasFeed = this.hasAppUpdateYml() || this.mockUpdates;
    const disabledReason = getAutoUpdateDisabledReason({
      hasUpdateFeedConfig: hasFeed,
      isDevelopment: this.isDevelopment,
      isPackaged: this.isPackaged,
      disabledByEnv: this.disabledByEnv,
      mockUpdates: this.mockUpdates,
    });

    const initial = createInitialDesktopUpdateState(
      options.currentVersion,
      runtimeInfo
    );
    const notApplied = this.readAndClearInstallRecord(options.currentVersion);

    // Even in development/unpackaged builds, we enable GitHub Releases checking
    // so the user can check for updates and preview release notes in-app.
    const canCheckGitHubReleases = !this.disabledByEnv;

    this.state = {
      ...initial,
      enabled: canCheckGitHubReleases,
      status: canCheckGitHubReleases ? 'idle' : 'disabled',
      message: canCheckGitHubReleases ? null : disabledReason,
      ...(notApplied ? { notAppliedVersion: notApplied } : {}),
    };
  }

  public getState(): DesktopUpdateState {
    return this.state;
  }

  private setState(nextState: DesktopUpdateState): DesktopUpdateState {
    this.state = nextState;
    this.onStateChange?.(this.state);
    return this.state;
  }

  private hasAppUpdateYml(): boolean {
    if (!this.resourcesPath) return false;
    try {
      const ymlPath = path.join(this.resourcesPath, 'app-update.yml');
      return fs.existsSync(ymlPath);
    } catch {
      return false;
    }
  }

  private readAndClearInstallRecord(currentVersion: string): string | null {
    try {
      if (!fs.existsSync(this.installRecordPath)) return null;
      const raw = fs.readFileSync(this.installRecordPath, 'utf8');
      fs.unlinkSync(this.installRecordPath);
      const parsed = JSON.parse(raw) as DesktopUpdateInstallRecord;
      return resolveNotAppliedInstallVersion(parsed, currentVersion);
    } catch {
      return null;
    }
  }

  public writeInstallRecord(targetVersion: string): void {
    try {
      const record: DesktopUpdateInstallRecord = {
        fromVersion: this.state.currentVersion,
        targetVersion,
      };
      fs.writeFileSync(
        this.installRecordPath,
        JSON.stringify(record, null, 2),
        'utf8'
      );
    } catch {
      // ignore write errors
    }
  }

  public startBackgroundPolling(): void {
    if (!this.state.enabled || this.disabledByEnv) return;

    if (this.startupTimer) clearTimeout(this.startupTimer);
    this.startupTimer = setTimeout(() => {
      void this.checkForUpdates().catch(() => {});
    }, AUTO_UPDATE_STARTUP_DELAY_MS);

    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      void this.checkForUpdates().catch(() => {});
    }, AUTO_UPDATE_POLL_INTERVAL_MS);
  }

  public stopBackgroundPolling(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private ensureAutoUpdaterConfigured(): boolean {
    if (this.updaterConfigured && this.autoUpdaterInstance) return true;
    if (!this.isPackaged || !this.hasAppUpdateYml()) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { autoUpdater } = require('electron-updater');
      this.autoUpdaterInstance = autoUpdater;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.fullChangelog = true;
      // Match .AGENTS.md Section 3: allow seamless upgrades on Windows over unsigned/self-signed builds
      autoUpdater.verifyUpdateCodeSignature = false;

      autoUpdater.on('update-available', (info: {
        version: string;
        releaseNotes?: string | RawReleaseNoteEntry[] | null;
        releaseDate?: string;
      }) => {
        const checkedAt = new Date().toISOString();
        const normalized = normalizeDesktopUpdateReleaseNotes(
          info.releaseNotes,
          info.version,
          info.releaseDate
        );
        const notes =
          normalized.releaseNotes.length > 0
            ? normalized.releaseNotes
            : getDefaultSampleReleaseNotes(info.version);

        this.setState(
          reduceDesktopUpdateStateOnUpdateAvailable(
            this.state,
            info.version,
            checkedAt,
            notes,
            normalized.omittedReleaseCount
          )
        );
      });

      autoUpdater.on('update-not-available', () => {
        const checkedAt = new Date().toISOString();
        this.setState(reduceDesktopUpdateStateOnNoUpdate(this.state, checkedAt));
      });

      autoUpdater.on('download-progress', (progress: { percent: number }) => {
        const pct = typeof progress?.percent === 'number' ? progress.percent : 0;
        const shouldEmit = shouldBroadcastDownloadProgress(this.state, pct);
        this.state = reduceDesktopUpdateStateOnDownloadProgress(this.state, pct);
        if (shouldEmit) {
          this.onStateChange?.(this.state);
        }
      });

      autoUpdater.on('update-downloaded', (info: {
        version: string;
        releaseNotes?: string | RawReleaseNoteEntry[] | null;
        releaseDate?: string;
      }) => {
        if (info.releaseNotes && this.state.releaseNotes.length === 0) {
          const normalized = normalizeDesktopUpdateReleaseNotes(
            info.releaseNotes,
            info.version,
            info.releaseDate
          );
          this.state = {
            ...this.state,
            releaseNotes:
              normalized.releaseNotes.length > 0
                ? normalized.releaseNotes
                : getDefaultSampleReleaseNotes(info.version),
            omittedReleaseCount: normalized.omittedReleaseCount,
          };
        }
        this.setState(
          reduceDesktopUpdateStateOnDownloadComplete(this.state, info.version)
        );
      });

      autoUpdater.on('error', (err: Error) => {
        const rawMsg = err?.message || 'Update check failed.';
        // If activeAction === 'check', checkForUpdates() catches the rejection and handles fallback
        if (this.activeAction === 'check') {
          return;
        }
        const msg = sanitizeUpdaterErrorMessage(rawMsg);
        const checkedAt = new Date().toISOString();
        if (this.state.status === 'downloading') {
          this.setState(reduceDesktopUpdateStateOnDownloadFailure(this.state, msg));
        } else {
          this.setState(
            reduceDesktopUpdateStateOnCheckFailure(this.state, msg, checkedAt)
          );
        }
      });

      this.updaterConfigured = true;
      return true;
    } catch {
      return false;
    }
  }

  private fetchGitHubReleases(): Promise<RawReleaseNoteEntry[]> {
    return new Promise((resolve) => {
      const req = https.get(
        `https://api.github.com/repos/${GITHUB_RELEASES_REPO}/releases?per_page=5`,
        {
          headers: {
            'User-Agent': `LexHarness/${this.state.currentVersion}`,
            Accept: 'application/vnd.github+json',
          },
          timeout: 6000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            resolve([]);
            return;
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (!Array.isArray(parsed)) {
                resolve([]);
                return;
              }
              const entries: RawReleaseNoteEntry[] = parsed
                .filter(
                  (r) =>
                    r &&
                    typeof r.tag_name === 'string' &&
                    !r.draft &&
                    !r.prerelease
                )
                .map((r) => ({
                  version: String(r.tag_name).replace(/^v/i, ''),
                  note: typeof r.body === 'string' ? r.body : '',
                  releaseDate:
                    typeof r.published_at === 'string'
                      ? r.published_at
                      : undefined,
                }));
              resolve(entries);
            } catch {
              resolve([]);
            }
          });
        }
      );
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  }

  private async checkGitHubReleasesFallback(
    checkedAt: string
  ): Promise<DesktopUpdateCheckResult> {
    const releases = await this.fetchGitHubReleases();
    const newerReleases = releases.filter(
      (r) => compareSemverVersions(r.version, this.state.currentVersion) > 0
    );

    if (newerReleases.length > 0) {
      const latest = newerReleases[0];
      const normalized = normalizeDesktopUpdateReleaseNotes(
        newerReleases,
        latest.version,
        latest.releaseDate
      );
      const notes =
        normalized.releaseNotes.length > 0
          ? normalized.releaseNotes
          : getDefaultSampleReleaseNotes(latest.version);
      this.setState(
        reduceDesktopUpdateStateOnUpdateAvailable(
          this.state,
          latest.version,
          checkedAt,
          notes,
          normalized.omittedReleaseCount
        )
      );
    } else {
      this.setState(reduceDesktopUpdateStateOnNoUpdate(this.state, checkedAt));
    }

    return { checked: true, state: this.state };
  }

  public async checkForUpdates(): Promise<DesktopUpdateCheckResult> {
    if (!this.state.enabled || this.activeAction !== null) {
      return { checked: false, state: this.state };
    }

    this.activeAction = 'check';
    const checkedAt = new Date().toISOString();
    this.setState(reduceDesktopUpdateStateOnCheckStart(this.state, checkedAt));

    try {
      if (this.mockUpdates) {
        const targetVersion = '0.9.1';
        const notes = getDefaultSampleReleaseNotes(targetVersion);
        this.setState(
          reduceDesktopUpdateStateOnUpdateAvailable(
            this.state,
            targetVersion,
            checkedAt,
            notes,
            0
          )
        );
        this.setState(
          reduceDesktopUpdateStateOnDownloadComplete(this.state, targetVersion)
        );
        return { checked: true, state: this.state };
      }

      if (this.ensureAutoUpdaterConfigured() && this.autoUpdaterInstance) {
        try {
          await this.autoUpdaterInstance.checkForUpdates();
          return { checked: true, state: this.state };
        } catch (updaterErr) {
          const rawErr =
            updaterErr instanceof Error
              ? updaterErr.message
              : String(updaterErr);
          if (isMissingUpdateMetadataError(rawErr)) {
            return await this.checkGitHubReleasesFallback(checkedAt);
          }
          throw updaterErr;
        }
      }

      return await this.checkGitHubReleasesFallback(checkedAt);
    } catch (err) {
      const rawMsg =
        err instanceof Error ? err.message : 'Could not check for updates.';
      const msg = sanitizeUpdaterErrorMessage(rawMsg);
      this.setState(
        reduceDesktopUpdateStateOnCheckFailure(this.state, msg, checkedAt)
      );
      return { checked: false, state: this.state };
    } finally {
      this.activeAction = null;
    }
  }

  public async downloadUpdate(): Promise<DesktopUpdateActionResult> {
    if (
      !this.state.enabled ||
      this.activeAction !== null ||
      !this.state.availableVersion
    ) {
      return { accepted: false, completed: false, state: this.state };
    }

    const targetVersion = this.state.availableVersion;
    this.activeAction = 'download';
    this.setState(reduceDesktopUpdateStateOnDownloadStart(this.state));

    try {
      if (this.ensureAutoUpdaterConfigured() && this.autoUpdaterInstance) {
        await this.autoUpdaterInstance.downloadUpdate();
        this.setState(
          reduceDesktopUpdateStateOnDownloadComplete(this.state, targetVersion)
        );
        return { accepted: true, completed: true, state: this.state };
      }

      // Simulated/dev fallback download progression
      for (const pct of [25, 60, 100]) {
        this.setState(
          reduceDesktopUpdateStateOnDownloadProgress(this.state, pct)
        );
      }
      this.setState(
        reduceDesktopUpdateStateOnDownloadComplete(this.state, targetVersion)
      );
      return { accepted: true, completed: true, state: this.state };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to download update.';
      this.setState(reduceDesktopUpdateStateOnDownloadFailure(this.state, msg));
      return { accepted: true, completed: false, state: this.state };
    } finally {
      this.activeAction = null;
    }
  }

  public async installUpdate(): Promise<DesktopUpdateActionResult> {
    const targetVersion =
      this.state.downloadedVersion ?? this.state.availableVersion;
    if (
      !this.state.enabled ||
      this.activeAction !== null ||
      !targetVersion
    ) {
      return { accepted: false, completed: false, state: this.state };
    }

    this.activeAction = 'install';
    try {
      this.writeInstallRecord(targetVersion);
      if (this.ensureAutoUpdaterConfigured() && this.autoUpdaterInstance) {
        setImmediate(() => {
          this.autoUpdaterInstance.quitAndInstall(false, true);
        });
        return { accepted: true, completed: true, state: this.state };
      }
      return { accepted: true, completed: true, state: this.state };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to install update.';
      this.setState(reduceDesktopUpdateStateOnInstallFailure(this.state, msg));
      return { accepted: true, completed: false, state: this.state };
    } finally {
      this.activeAction = null;
    }
  }
}
