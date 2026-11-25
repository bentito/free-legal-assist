import {
  DesktopRuntimeArch,
  DesktopUpdateReleaseNote,
  DesktopUpdateState,
} from '../../shared/types';

export interface DesktopUpdateRuntimeInfo {
  hostArch: DesktopRuntimeArch;
  appArch: DesktopRuntimeArch;
  runningUnderArm64Translation: boolean;
}

export interface DesktopUpdateInstallRecord {
  fromVersion: string;
  targetVersion: string;
}

export function nextStatusAfterDownloadFailure(
  currentState: DesktopUpdateState
): DesktopUpdateState['status'] {
  return currentState.availableVersion ? 'available' : 'error';
}

export function getCanRetryAfterDownloadFailure(
  currentState: DesktopUpdateState
): boolean {
  return currentState.availableVersion !== null;
}

export function createInitialDesktopUpdateState(
  currentVersion: string,
  runtimeInfo: DesktopUpdateRuntimeInfo
): DesktopUpdateState {
  return {
    enabled: false,
    status: 'disabled',
    currentVersion,
    hostArch: runtimeInfo.hostArch,
    appArch: runtimeInfo.appArch,
    runningUnderArm64Translation: runtimeInfo.runningUnderArm64Translation,
    availableVersion: null,
    downloadedVersion: null,
    releaseNotes: [],
    omittedReleaseCount: 0,
    downloadPercent: null,
    checkedAt: null,
    message: null,
    errorContext: null,
    canRetry: false,
  };
}

export function reduceDesktopUpdateStateOnCheckStart(
  state: DesktopUpdateState,
  checkedAt: string
): DesktopUpdateState {
  const hasDownloadedUpdate = state.downloadedVersion !== null;
  return {
    ...state,
    status: 'checking',
    checkedAt,
    releaseNotes: hasDownloadedUpdate ? state.releaseNotes : [],
    omittedReleaseCount: hasDownloadedUpdate ? state.omittedReleaseCount : 0,
    message: null,
    downloadPercent: hasDownloadedUpdate ? 100 : null,
    errorContext: null,
    canRetry: false,
  };
}

export function reduceDesktopUpdateStateOnCheckFailure(
  state: DesktopUpdateState,
  message: string,
  checkedAt: string
): DesktopUpdateState {
  if (state.downloadedVersion !== null) {
    return {
      ...state,
      status: 'downloaded',
      message: null,
      checkedAt,
      downloadPercent: 100,
      errorContext: null,
      canRetry: true,
    };
  }
  return {
    ...state,
    status: 'error',
    message,
    checkedAt,
    downloadPercent: null,
    errorContext: 'check',
    canRetry: true,
  };
}

export function reduceDesktopUpdateStateOnUpdateAvailable(
  state: DesktopUpdateState,
  version: string,
  checkedAt: string,
  releaseNotes: DesktopUpdateReleaseNote[] = [],
  omittedReleaseCount = 0
): DesktopUpdateState {
  const cleanVersion = version.replace(/^v/i, '');
  const isDownloadedVersion = state.downloadedVersion === cleanVersion;
  const preserveReleaseNotes = isDownloadedVersion && releaseNotes.length === 0;
  return {
    ...state,
    status: isDownloadedVersion ? 'downloaded' : 'available',
    availableVersion: cleanVersion,
    downloadedVersion: isDownloadedVersion ? cleanVersion : null,
    releaseNotes: preserveReleaseNotes ? state.releaseNotes : releaseNotes,
    omittedReleaseCount: preserveReleaseNotes
      ? state.omittedReleaseCount
      : omittedReleaseCount,
    downloadPercent: isDownloadedVersion ? 100 : null,
    checkedAt,
    message: null,
    errorContext: null,
    canRetry: isDownloadedVersion,
  };
}

export function reduceDesktopUpdateStateOnNoUpdate(
  state: DesktopUpdateState,
  checkedAt: string
): DesktopUpdateState {
  if (state.downloadedVersion !== null) {
    return {
      ...state,
      status: 'downloaded',
      availableVersion: state.downloadedVersion,
      downloadPercent: 100,
      checkedAt,
      message: null,
      errorContext: null,
      canRetry: true,
    };
  }
  return {
    ...state,
    status: 'up-to-date',
    availableVersion: null,
    downloadedVersion: null,
    releaseNotes: [],
    omittedReleaseCount: 0,
    downloadPercent: null,
    checkedAt,
    message: null,
    errorContext: null,
    canRetry: false,
  };
}

export function reduceDesktopUpdateStateOnDownloadStart(
  state: DesktopUpdateState
): DesktopUpdateState {
  return {
    ...state,
    status: 'downloading',
    downloadPercent: 0,
    message: null,
    errorContext: null,
    canRetry: false,
  };
}

export function reduceDesktopUpdateStateOnDownloadFailure(
  state: DesktopUpdateState,
  message: string
): DesktopUpdateState {
  return {
    ...state,
    status: nextStatusAfterDownloadFailure(state),
    message,
    downloadPercent: null,
    errorContext: 'download',
    canRetry: getCanRetryAfterDownloadFailure(state),
  };
}

export function reduceDesktopUpdateStateOnDownloadProgress(
  state: DesktopUpdateState,
  percent: number
): DesktopUpdateState {
  const clamped = Math.max(0, Math.min(100, percent));
  return {
    ...state,
    status: 'downloading',
    downloadPercent: clamped,
    message: null,
    errorContext: null,
    canRetry: false,
  };
}

export function reduceDesktopUpdateStateOnDownloadComplete(
  state: DesktopUpdateState,
  version: string
): DesktopUpdateState {
  const cleanVersion = version.replace(/^v/i, '');
  return {
    ...state,
    status: 'downloaded',
    availableVersion: cleanVersion,
    downloadedVersion: cleanVersion,
    downloadPercent: 100,
    message: null,
    errorContext: null,
    canRetry: true,
  };
}

export function reduceDesktopUpdateStateOnInstallFailure(
  state: DesktopUpdateState,
  message: string
): DesktopUpdateState {
  return {
    ...state,
    status: 'downloaded',
    message,
    errorContext: 'install',
    canRetry: true,
  };
}

export function shouldBroadcastDownloadProgress(
  currentState: DesktopUpdateState,
  nextPercent: number
): boolean {
  if (currentState.status !== 'downloading') return true;
  const currentPercent = currentState.downloadPercent;
  if (currentPercent === null) return true;
  const previousStep = Math.floor(currentPercent / 10);
  return Math.floor(nextPercent / 10) !== previousStep || nextPercent >= 100;
}

export function resolveNotAppliedInstallVersion(
  record: DesktopUpdateInstallRecord | null | undefined,
  appVersion: string
): string | null {
  if (!record) return null;
  const cleanApp = appVersion.replace(/^v/i, '');
  const cleanFrom = record.fromVersion.replace(/^v/i, '');
  const cleanTarget = record.targetVersion.replace(/^v/i, '');
  return cleanFrom === cleanApp && cleanTarget !== cleanApp ? cleanTarget : null;
}

export function compareSemverVersions(a: string, b: string): number {
  const parse = (v: string): [number, number, number] => {
    const clean = v.replace(/^v/i, '').split('-')[0];
    const parts = clean.split('.').map((n) => parseInt(n, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
  if (aMin !== bMin) return aMin > bMin ? 1 : -1;
  if (aPat !== bPat) return aPat > bPat ? 1 : -1;
  return 0;
}
