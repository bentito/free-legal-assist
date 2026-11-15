import React, { useState } from 'react';
import {
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
import { Matter, PrivacyRoutingSettings, RoutingDecisionLog } from '../../shared/types';

interface RoutingDebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeMatter?: Matter | null;
  settings: PrivacyRoutingSettings;
  recentLogs: RoutingDecisionLog[];
  onClearLogs: () => Promise<void>;
  onExportLogs: () => Promise<void>;
  onSaveSettings: (updated: Partial<PrivacyRoutingSettings>) => Promise<void>;
}

export const RoutingDebugDrawer: React.FC<RoutingDebugDrawerProps> = ({
  isOpen,
  onClose,
  activeMatter,
  settings,
  recentLogs,
  onClearLogs,
  onExportLogs,
  onSaveSettings,
}) => {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    recentLogs[0]?.id ?? null
  );
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const activeLog =
    recentLogs.find((l) => l.id === selectedLogId) || recentLogs[0] || null;

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

      {/* Drawer Content */}
      <div className="flex flex-1 min-h-0 divide-x divide-slate-800">
        {/* Left: Log History List */}
        <div className="w-72 overflow-y-auto p-2 space-y-1.5 bg-slate-950/60">
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
                  className={`w-full text-left p-2.5 rounded-lg border transition text-xs ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500/50 shadow'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${tierBadgeColor}`}>
                      {log.selectedTier === 'FRONTIER_REASONING'
                        ? 'Frontier'
                        : log.selectedTier === 'FAST_ECONOMY'
                        ? 'Fast Economy'
                        : 'Local Private'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="font-medium text-slate-200 truncate">
                    {log.classification.inferredIntent}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                    <span>{log.selectedModel}</span>
                    {log.costEstimate.estimatedSavingsUSD > 0 && (
                      <span className="text-emerald-400 font-medium">
                        -${log.costEstimate.estimatedSavingsUSD.toFixed(3)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
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
