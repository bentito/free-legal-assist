import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Lock,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  AncillaryCheckerRole,
  AncillaryModelRegistryState,
  LLMProviderId,
  Matter,
  PrivacyRoutingSettings,
  RoutingDecisionLog,
} from '../../shared/types';

interface RoutingDebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeMatter?: Matter | null;
  settings: PrivacyRoutingSettings;
  recentLogs: RoutingDecisionLog[];
  ancillaryRegistry?: AncillaryModelRegistryState;
  onClearLogs: () => Promise<void>;
  onExportLogs: () => Promise<void>;
  onSaveSettings: (updated: Partial<PrivacyRoutingSettings>) => Promise<void>;
  onRepickAncillaryModel?: (
    role: AncillaryCheckerRole,
    providerId: LLMProviderId,
    modelId: string
  ) => Promise<void>;
  onRefreshAncillaryModels?: () => Promise<void>;
}

export const RoutingDebugDrawer: React.FC<RoutingDebugDrawerProps> = ({
  isOpen,
  onClose,
  activeMatter,
  settings,
  recentLogs,
  ancillaryRegistry,
  onClearLogs,
  onExportLogs,
  onSaveSettings,
  onRepickAncillaryModel,
  onRefreshAncillaryModels,
}) => {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    recentLogs[0]?.id ?? null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [repickingRole, setRepickingRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeLog =
    recentLogs.find((l) => l.id === selectedLogId) || recentLogs[0] || null;
  const activeAdvisories = ancillaryRegistry?.advisories || [];

  return (
    <div className="border-t border-slate-700/80 bg-slate-950/95 backdrop-blur-md shadow-2xl flex flex-col max-h-[380px] min-h-[220px] transition-all z-20">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Decision Telemetry & PII Shield Inspector</span>
          </div>
          <span className="text-xs text-slate-400">
            {recentLogs.length} evaluation{recentLogs.length === 1 ? '' : 's'} recorded
          </span>

          {ancillaryRegistry && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ancillary Models Confirmed</span>
              <button
                onClick={async () => {
                  if (onRefreshAncillaryModels) {
                    setIsRefreshingModels(true);
                    try {
                      await onRefreshAncillaryModels();
                    } finally {
                      setIsRefreshingModels(false);
                    }
                  }
                }}
                disabled={isRefreshingModels}
                title="Confirm background models & check availability now"
                className="hover:text-indigo-300 ml-0.5 text-slate-400 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingModels ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setIsExporting(true);
              try {
                await onExportLogs();
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Export sanitized diagnostic bundle (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Audit (JSON)</span>
          </button>

          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 transition"
            title="Clear routing telemetry history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ancillary Model Advisory Banner: Flags unavailable background models & prompts user to repick with usage explanation */}
      {activeAdvisories.length > 0 && (
        <div className="bg-amber-950/60 border-b border-amber-500/40 px-4 py-2 flex flex-col gap-1.5 shrink-0">
          {activeAdvisories.map((advisory) => (
            <div key={advisory.id} className="flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-200 flex items-center gap-2">
                    <span>{advisory.roleTitle} Notice:</span>
                    <span className="font-normal text-amber-300/90">{advisory.message}</span>
                  </div>
                  <div className="text-[11px] text-amber-400/80 mt-0.5">
                    <span className="font-medium text-amber-300">Intended Usage: </span>
                    {advisory.usageExplanation}
                  </div>
                </div>
              </div>

              {advisory.suggestedAlternatives.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-amber-400/90 uppercase font-semibold">Repick:</span>
                  {advisory.suggestedAlternatives.slice(0, 2).map((alt) => (
                    <button
                      key={`${alt.providerId}-${alt.modelId}`}
                      onClick={async () => {
                        if (onRepickAncillaryModel) {
                          setRepickingRole(advisory.role);
                          try {
                            await onRepickAncillaryModel(advisory.role, alt.providerId, alt.modelId);
                          } finally {
                            setRepickingRole(null);
                          }
                        }
                      }}
                      disabled={repickingRole === advisory.role}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] text-amber-200 transition font-medium flex items-center gap-1"
                    >
                      <span>Switch to {alt.modelId} ({alt.providerId})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drawer Content */}
      <div className="flex flex-1 min-h-0 divide-x divide-slate-800">
        {/* Left: Log History List */}
        <div className="w-80 flex flex-col bg-slate-950/70 shrink-0">
          <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/70 flex items-center justify-between shrink-0">
            <span>Prompt Evaluation History</span>
            <span className="text-[9px] text-slate-500 font-normal">
              {recentLogs.length} turn{recentLogs.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="overflow-y-auto flex-1 p-1.5 space-y-1">
            {recentLogs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No routing decisions recorded yet. Submit a prompt to view live telemetry.
              </div>
            ) : (
              recentLogs.map((log) => {
                const isSelected = (activeLog?.id ?? '') === log.id;
                const tierBadgeColor =
                  log.selectedTier === 'FRONTIER_REASONING'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : log.selectedTier === 'FAST_ECONOMY'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';

                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded border transition flex items-center justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-slate-800/95 border-indigo-500/60 shadow-sm text-slate-100 ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border shrink-0 ${tierBadgeColor}`}>
                        {log.selectedTier === 'FRONTIER_REASONING'
                          ? 'Frontier'
                          : log.selectedTier === 'FAST_ECONOMY'
                          ? 'Economy'
                          : 'Local'}
                      </span>
                      <span className="font-medium text-[11px] truncate text-slate-200">
                        {log.classification.inferredIntent}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px]">
                      {log.costEstimate.estimatedSavingsUSD > 0 && (
                        <span className="text-emerald-400 font-medium">
                          +${log.costEstimate.estimatedSavingsUSD.toFixed(3)}
                        </span>
                      )}
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Inspection Card */}
        {activeLog ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/40 text-xs text-slate-300">
            {/* Top Stat Row */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  Inferred Intent
                </div>
                <div className="text-xs font-semibold text-indigo-300 mt-1 truncate">
                  {activeLog.classification.inferredIntent}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  ONNX Complexity Score
                </div>
                <div className="text-xs font-semibold text-amber-300 mt-1">
                  {(activeLog.classification.onnxComplexityScore * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  PII Tokens Masked
                </div>
                <div className="text-xs font-semibold text-emerald-300 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeLog.piiAudit.entitiesDetectedCount} token(s)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  API Cost Savings
                </div>
                <div className="text-xs font-semibold text-emerald-400 mt-1">
                  ${activeLog.costEstimate.estimatedSavingsUSD.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Normalized Logits Bar */}
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>ONNX Routing Logits across Tiers</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Decision: {activeLog.classification.decisionReason}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Local Private</span>
                    <span className="font-mono text-cyan-300">
                      {((activeLog.classification.onnxLogits.LOCAL_PRIVATE || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{
                        width: `${Math.round((activeLog.classification.onnxLogits.LOCAL_PRIVATE || 0) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Fast Economy</span>
                    <span className="font-mono text-emerald-300">
                      {((activeLog.classification.onnxLogits.FAST_ECONOMY || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full"
                      style={{
                        width: `${Math.round((activeLog.classification.onnxLogits.FAST_ECONOMY || 0) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Frontier Reasoning</span>
                    <span className="font-mono text-amber-300">
                      {((activeLog.classification.onnxLogits.FRONTIER_REASONING || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{
                        width: `${Math.round((activeLog.classification.onnxLogits.FRONTIER_REASONING || 0) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Masked Tokens Breakdown */}
            {activeLog.piiAudit.tokensMasked.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Masked Tokens in Vault (Inbound Re-Hydrated)</span>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Re-Hydration: {activeLog.piiAudit.rehydrationSuccessful ? 'Verified 100%' : 'Pending'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeLog.piiAudit.tokensMasked.map((tok, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono border border-slate-800 text-amber-300/90"
                    >
                      {tok}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
