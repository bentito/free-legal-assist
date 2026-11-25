import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  RotateCw,
  X,
} from 'lucide-react';
import {
  DesktopUpdateReleaseNote,
  DesktopUpdateState,
} from '../../shared/types';
import { ipcBridge } from '../lib/bridge';

const GITHUB_RELEASES_BASE_URL =
  'https://github.com/bentito/free-legal-assist/releases';

export function buildReleaseTagUrl(version: string): string {
  const clean = version.trim().replace(/^v/i, '');
  return `${GITHUB_RELEASES_BASE_URL}/tag/v${encodeURIComponent(clean)}`;
}

export function formatReleasedAge(releasedAt?: string): string | null {
  if (!releasedAt) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releasedAt.slice(0, 10));
  if (!match) return releasedAt;
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const targetUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  const diffDays = Math.round((todayUtc - targetUtc) / 86_400_000);
  return diffDays <= 0 ? 'today' : `${diffDays}d ago`;
}

export function getUpdateAction(
  state: DesktopUpdateState | null
): 'install' | 'download' | 'none' {
  if (!state) return 'none';
  if (
    state.downloadedVersion &&
    (state.status === 'downloaded' ||
      (state.status === 'error' &&
        (state.errorContext === null || state.errorContext === 'install')))
  ) {
    return 'install';
  }
  if (
    state.status === 'available' ||
    (state.status === 'error' &&
      state.errorContext === 'download' &&
      state.availableVersion)
  ) {
    return 'download';
  }
  return 'none';
}

export function getUpdateBannerHeadline(state: DesktopUpdateState): string {
  const targetVersion = state.downloadedVersion ?? state.availableVersion;
  if (
    state.notAppliedVersion &&
    (state.status === 'available' || state.status === 'downloaded') &&
    targetVersion === state.notAppliedVersion
  ) {
    return `Update ${state.notAppliedVersion} did not apply. Click to retry.`;
  }
  if (
    (state.status === 'available' || state.status === 'error') &&
    state.errorContext === 'download' &&
    state.availableVersion
  ) {
    return `Download failed for ${state.availableVersion}. Click to retry.`;
  }
  if (state.status === 'available') {
    return state.availableVersion
      ? `Update ${state.availableVersion} ready to download`
      : 'Update available ready to download';
  }
  if (state.status === 'downloading') {
    return typeof state.downloadPercent === 'number'
      ? `Downloading update (${Math.floor(state.downloadPercent)}%)`
      : 'Downloading update';
  }
  if (state.status === 'downloaded') {
    return targetVersion
      ? `Update ${targetVersion} downloaded. Click to restart and install.`
      : 'Update downloaded. Click to restart and install.';
  }
  if (state.status === 'error') {
    if (state.errorContext === 'install' && state.downloadedVersion) {
      return `Install failed for ${state.downloadedVersion}. Click to retry.`;
    }
    if (state.downloadedVersion) {
      return `Update ${state.downloadedVersion} downloaded. Click to restart and install.`;
    }
    return state.message ?? 'Update check failed';
  }
  if (state.status === 'checking') {
    return 'Checking for updates…';
  }
  return 'Up to date';
}

export function shouldShowReleaseNotesPopover(
  state: DesktopUpdateState | null
): boolean {
  if (!state) return false;
  const action = getUpdateAction(state);
  const showUpdateDetails =
    action !== 'none' || state.status === 'downloading';
  return showUpdateDetails && state.releaseNotes.length > 0;
}

const renderReleaseNoteBullet = (item: string, key: string): React.ReactNode => {
  const boldLeadMatch = /^\*\*([^*]+)\*\*\s*(.+)$/.exec(item);
  return (
    <li key={key} className="list-disc break-words text-zinc-300/95">
      {boldLeadMatch ? (
        <>
          <strong className="font-semibold text-zinc-100">
            {boldLeadMatch[1]}
          </strong>{' '}
          <span>{boldLeadMatch[2]}</span>
        </>
      ) : (
        <span>{item}</span>
      )}
    </li>
  );
};

export const DesktopUpdateButton: React.FC = () => {
  const [updateState, setUpdateState] = useState<DesktopUpdateState | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isConfirmInstallOpen, setIsConfirmInstallOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    ipcBridge
      .getUpdateState()
      .then((initial) => {
        if (mounted && initial) {
          setUpdateState(initial);
        }
      })
      .catch(() => {});

    const unsubscribe = ipcBridge.onUpdateState((nextState) => {
      if (mounted) {
        setUpdateState(nextState);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimer();
    setIsPopoverOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsPopoverOpen(false);
    }, 150);
  };

  const action = getUpdateAction(updateState);
  const isChecking = updateState?.status === 'checking' || isBusy;
  const isDownloading = updateState?.status === 'downloading';
  const isDownloaded =
    updateState?.status === 'downloaded' || action === 'install';
  const isAvailable =
    updateState?.status === 'available' || action === 'download';
  const hasActiveUpdate = isAvailable || isDownloading || isDownloaded;
  const canShowReleaseNotes = shouldShowReleaseNotesPopover(updateState);

  const displayNotes: DesktopUpdateReleaseNote[] =
    updateState?.releaseNotes ?? [];

  const headline = updateState
    ? isChecking
      ? 'Checking for updates…'
      : updateState.status === 'idle'
        ? 'Check for updates'
        : getUpdateBannerHeadline(updateState)
    : 'Check for updates';

  const handleButtonClick = async () => {
    if (isBusy || isChecking || isDownloading) return;

    if (action === 'install') {
      setIsPopoverOpen(false);
      setIsConfirmInstallOpen(true);
      return;
    }

    if (action === 'download') {
      setIsBusy(true);
      try {
        const res = await ipcBridge.downloadUpdate();
        if (res?.state) setUpdateState(res.state);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    setIsBusy(true);
    try {
      const res = await ipcBridge.checkForUpdate();
      if (res?.state) {
        setUpdateState(res.state);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmInstall = async () => {
    setIsConfirmInstallOpen(false);
    setIsBusy(true);
    try {
      const res = await ipcBridge.installUpdate();
      if (res?.state) setUpdateState(res.state);
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenExternalRelease = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    void ipcBridge.openReleaseNotesUrl(url);
  };

  const percent = Math.max(
    0,
    Math.min(100, updateState?.downloadPercent ?? 0)
  );
  const radius = 13.25;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percent / 100);

  const targetVersion =
    updateState?.downloadedVersion ??
    updateState?.availableVersion ??
    updateState?.currentVersion ??
    '0.9.1';

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* T3-Style 32x32 Circular Sidebar Update Button */}
      <button
        id="tour-update-button"
        type="button"
        onClick={handleButtonClick}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label={headline}
        title={headline}
        className={`relative inline-flex w-7 h-7 items-center justify-center rounded-full outline-none transition-colors cursor-pointer ${
          hasActiveUpdate
            ? 'bg-white/[0.08] text-zinc-100 hover:bg-white/[0.14]'
            : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200'
        }`}
      >
        {isDownloading ? (
          <span className="relative grid w-7 h-7 place-items-center">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 32 32"
            >
              <circle
                cx="16"
                cy="16"
                r={radius}
                fill="none"
                className="stroke-current opacity-20"
                strokeWidth="1.75"
              />
              <circle
                cx="16"
                cy="16"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="1.75"
                className="transition-[stroke-dashoffset] duration-300 ease-out"
              />
            </svg>
            <Download className="w-3.5 h-3.5 text-amber-300" />
          </span>
        ) : isDownloaded ? (
          <span className="relative grid w-4 h-4 place-items-center">
            <RotateCw className="w-3.5 h-3.5 text-zinc-100" />
            <span className="absolute -right-1 -bottom-1 grid w-2.5 h-2.5 place-items-center rounded-full bg-zinc-100 text-[#09090b] ring-2 ring-[#09090b]">
              <Check className="w-2 h-2" strokeWidth={3.2} />
            </span>
          </span>
        ) : isAvailable ? (
          <span className="relative grid w-4 h-4 place-items-center">
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
          </span>
        ) : (
          <RefreshCw
            className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-zinc-200' : ''}`}
          />
        )}
      </button>

      {/* T3-Style Compact Release Notes Hover Popover Card (only when an update is available/downloading/downloaded) */}
      {isPopoverOpen && canShowReleaseNotes && (
        <div
          role="dialog"
          aria-label="Update release notes"
          className="absolute bottom-9 left-0 z-50 w-[23rem] max-w-[calc(100vw-2rem)] rounded-xl bg-[#111114] border border-white/[0.1] shadow-2xl p-3.5 text-left text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Top Action / Status Line */}
          <div className="shrink-0 px-0.5">
            {updateState?.status === 'available' ? (
              <div>
                <div className="text-[13.5px] leading-5 font-medium text-zinc-100">
                  Update ready to download
                </div>
                {updateState.availableVersion && (
                  <div className="mt-0.5 text-xs leading-4 text-zinc-400">
                    {(() => {
                      const age = formatReleasedAge(
                        displayNotes.find(
                          (n) => n.version === updateState.availableVersion
                        )?.releasedAt
                      );
                      return age
                        ? `${updateState.availableVersion} · ${age}`
                        : updateState.availableVersion;
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13.5px] leading-5 font-medium text-zinc-100">
                  {isDownloaded
                    ? `Update ${targetVersion} downloaded. Click to restart and install.`
                    : headline}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Release Notes Sections */}
          <div className="min-h-0 max-h-[24rem] overflow-y-auto px-0.5 pt-2.5 pb-0.5 space-y-3.5">
            {displayNotes.map((note, idx) => {
              const releaseUrl = buildReleaseTagUrl(note.version);
              const omittedItems = Math.max(
                0,
                note.totalItems - note.items.length
              );
              const linkLabel =
                note.stats ??
                (omittedItems === 0
                  ? 'View release on GitHub'
                  : `${omittedItems} more ${omittedItems === 1 ? 'change' : 'changes'} on GitHub`);
              const hasStatsOrIntro =
                note.stats !== undefined || note.intro !== undefined;
              const ageLabel = formatReleasedAge(note.releasedAt);

              return (
                <section key={note.version} className={idx > 0 ? 'mt-3.5' : undefined}>
                  {hasStatsOrIntro ? (
                    idx > 0 && (
                      <h3 className="mb-1 text-xs leading-4 font-medium text-zinc-400">
                        {ageLabel ? `${note.version} · ${ageLabel}` : note.version}
                      </h3>
                    )
                  ) : (
                    <h3 className="mb-1.5 text-xs leading-4 font-semibold text-zinc-200">
                      {idx === 0 ? "What's changed" : `Changes in ${note.version}`}
                    </h3>
                  )}

                  {note.intro ? (
                    <p className="break-words text-xs leading-5 text-zinc-200">
                      {note.intro}
                    </p>
                  ) : note.items.length > 0 ? (
                    <ul className="space-y-1.5 pl-4 text-xs leading-5">
                      {note.items.map((item, itemIdx) =>
                        renderReleaseNoteBullet(
                          item,
                          `${note.version}-${itemIdx}`
                        )
                      )}
                    </ul>
                  ) : null}

                  {note.footer && (
                    <p className="mt-2.5 text-xs leading-5 font-semibold text-zinc-100">
                      {note.footer}
                    </p>
                  )}

                  <a
                    href={releaseUrl}
                    onClick={(e) => handleOpenExternalRelease(e, releaseUrl)}
                    className="mt-1 inline-flex items-center gap-1 rounded-sm text-xs leading-5 text-zinc-400 underline-offset-2 outline-none transition-colors hover:text-zinc-200 hover:underline"
                  >
                    <span>{linkLabel}</span>
                    <ExternalLink
                      aria-hidden="true"
                      className="w-3 h-3 shrink-0"
                      strokeWidth={2}
                    />
                  </a>
                </section>
              );
            })}

            {(updateState?.omittedReleaseCount ?? 0) > 0 && (
              <div className="mt-2.5">
                <a
                  href={GITHUB_RELEASES_BASE_URL}
                  onClick={(e) =>
                    handleOpenExternalRelease(e, GITHUB_RELEASES_BASE_URL)
                  }
                  className="inline-flex items-center gap-1 rounded-sm text-xs leading-5 text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  <span>
                    {updateState!.omittedReleaseCount} older{' '}
                    {updateState!.omittedReleaseCount === 1
                      ? 'release'
                      : 'releases'}{' '}
                    on GitHub
                  </span>
                  <ExternalLink
                    aria-hidden="true"
                    className="w-3 h-3 shrink-0"
                    strokeWidth={2}
                  />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* T3-Style Safe Restart & Install Confirmation Modal */}
      {isConfirmInstallOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121216] border border-white/[0.1] shadow-2xl p-5 text-zinc-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-100">
                Install update {targetVersion} and restart LexHarness?
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmInstallOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              Any running drafting or peer review tasks will be interrupted.
              Make sure you&apos;re ready before continuing.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmInstallOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInstall}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-zinc-950 transition cursor-pointer"
              >
                Restart &amp; Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
