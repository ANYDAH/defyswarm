import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';
import type { PrincipalState, TelemetryEvent } from '../shared/types.ts';

export type ForensicTarget =
  | { kind: 'event'; event: TelemetryEvent }
  | { kind: 'principal'; principalId: string }
  | null;

interface ForensicDrawerProps {
  target: ForensicTarget;
  onClose: () => void;
}

export const ForensicDrawer: React.FC<ForensicDrawerProps> = ({ target, onClose }) => {
  const { state, apiFetch, pushToast, setActivePage, setSelectedIncidentId } = useConsole();
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!state) return null;

  const resolvedPrincipal: PrincipalState | undefined =
    target?.kind === 'principal'
      ? state.principals.find((p) => p.id === target.principalId)
      : target?.kind === 'event'
        ? state.principals.find((p) => p.id === target.event.principalId)
        : undefined;

  const relatedIncident =
    target?.kind === 'event'
      ? state.incidents.find(
          (i) => i.bucket === target.event.bucket && i.principals.includes(target.event.principalId),
        ) ?? state.incidents.find((i) => i.bucket === target.event.bucket)
      : target?.kind === 'principal'
        ? state.incidents.find((i) => i.principals.includes(target.principalId))
        : undefined;

  const deltaThreshold = state.policy.detection.entropy.delta_threshold;

  return (
    <AnimatePresence>
      {target && (
        <motion.aside
          initial={{ x: 420, opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 right-0 top-[48px] z-30 flex w-full max-w-[420px] flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-rail)] "
        >
          {/* Drawer Header */}
          <div className="flex h-[44px] items-center justify-between border-b border-[var(--border-hairline)] px-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-semibold text-[var(--ink-primary)] truncate">
                {target.kind === 'event' ? 'Event Forensic Inspector' : 'Principal Security Ledger'}
              </span>
              <span className="font-mono text-[13px] text-[var(--ink-muted)] truncate">
                {target.kind === 'event' ? target.event.apiOp : target.principalId}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close forensic inspector"
              className="rounded-[6px] p-1 text-[var(--ink-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)]">
            {target.kind === 'event' && (
              <>
                {/* Core Event Metadata */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-semibold text-[var(--ink-primary)]">
                      {target.event.apiOp}
                    </span>
                    <span
                      className={`font-mono text-[13px] font-semibold tabular-nums ${
                        target.event.httpStatus === 403 ? 'text-[var(--signal-crimson)]' : 'text-[var(--signal-emerald)]'
                      }`}
                    >
                      HTTP {target.event.httpStatus}
                    </span>
                  </div>

                  <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[13px]">
                    <dt className="text-[var(--ink-muted)]">Timestamp</dt>
                    <dd className="font-mono text-[var(--ink-primary)] tabular-nums">{target.event.timestamp}</dd>

                    <dt className="text-[var(--ink-muted)]">Plane</dt>
                    <dd className="font-mono text-[var(--ink-secondary)]">{target.event.plane}-plane</dd>

                    <dt className="text-[var(--ink-muted)]">Ingest Source</dt>
                    <dd className="font-mono text-[var(--accent-text)]">{target.event.source || 'simulator'}</dd>

                    <dt className="text-[var(--ink-muted)]">Bucket</dt>
                    <dd className="font-mono text-[var(--ink-primary)]">{target.event.bucket}</dd>

                    <dt className="text-[var(--ink-muted)]">Object Key</dt>
                    <dd className="font-mono text-[var(--ink-primary)] break-all">
                      {target.event.key || '— (bucket control call)'}
                    </dd>

                    <dt className="text-[var(--ink-muted)]">Principal</dt>
                    <dd className="font-mono text-[var(--ink-primary)]">{target.event.principalId}</dd>

                    <dt className="text-[var(--ink-muted)]">Canary Object</dt>
                    <dd className="font-mono text-[var(--ink-secondary)]">
                      {target.event.isCanary ? 'Yes (Adaptive Decoy)' : 'No'}
                    </dd>

                    {target.event.sseAlgorithm && (
                      <>
                        <dt className="text-[var(--ink-muted)]">Encryption</dt>
                        <dd className="font-mono text-[var(--signal-crimson)]">{target.event.sseAlgorithm}</dd>
                      </>
                    )}
                    {target.event.kmsKeyId && (
                      <>
                        <dt className="text-[var(--ink-muted)]">KMS Key ARN</dt>
                        <dd className="font-mono text-[var(--signal-amber)] break-all">{target.event.kmsKeyId}</dd>
                      </>
                    )}
                  </dl>
                </div>

                {/* Cryptographic Entropy & Magic-Byte Verdict */}
                <div className="p-4 space-y-3">
                  <div className="text-[13px] font-semibold text-[var(--ink-primary)]">
                    64 KB Payload Analysis
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] tabular-nums">
                    <div className="p-2.5">
                      <div className="text-[13px] text-[var(--ink-muted)]">H (Current)</div>
                      <div className="mt-0.5 font-mono text-[14px] font-semibold text-[var(--ink-primary)]">
                        {typeof target.event.entropy === 'number' ? target.event.entropy.toFixed(3) : '—'}
                      </div>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[13px] text-[var(--ink-muted)]">ΔH vs Prev</div>
                      <div
                        className={`mt-0.5 font-mono text-[14px] font-semibold ${
                          typeof target.event.deltaEntropy === 'number' &&
                          target.event.deltaEntropy >= deltaThreshold
                            ? 'text-[var(--signal-crimson)]'
                            : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {typeof target.event.deltaEntropy === 'number'
                          ? `${target.event.deltaEntropy >= 0 ? '+' : ''}${target.event.deltaEntropy.toFixed(2)}`
                          : '—'}
                      </div>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[13px] text-[var(--ink-muted)]">Magic Header</div>
                      <div
                        className={`mt-0.5 font-mono text-[13px] font-semibold ${
                          target.event.magicValid === false
                            ? 'text-[var(--signal-crimson)]'
                            : target.event.magicValid
                              ? 'text-[var(--signal-emerald)]'
                              : 'text-[var(--ink-muted)]'
                        }`}
                      >
                        {target.event.magicValid === undefined
                          ? 'N/A'
                          : target.event.magicValid
                            ? target.event.magicDetected || 'Valid'
                            : 'Lost'}
                      </div>
                    </div>
                  </div>

                  {typeof target.event.entropy === 'number' && (
                    <div>
                      <div className="mb-1 flex justify-between font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
                        <span>Shannon scale (0–8 bits/B)</span>
                        <span>Threshold ΔH ≥ {deltaThreshold.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-[var(--bg-hover)]">
                        <div
                          className={`h-full ${
                            target.event.magicValid === false ||
                            (target.event.deltaEntropy ?? 0) >= deltaThreshold
                              ? 'bg-[var(--signal-crimson)]'
                              : 'bg-[var(--accent-indigo)]'
                          }`}
                          style={{ width: `${Math.min(100, (target.event.entropy / 8) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Signals & Risk Attribution */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[var(--ink-primary)]">
                      Signals &amp; Risk Contribution
                    </span>
                    <span className="font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
                      +{target.event.riskDelta} risk · Bucket {target.event.bucketRiskScore}
                    </span>
                  </div>

                  {target.event.signals.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] px-3 py-2 text-[13px] text-[var(--signal-emerald)]">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {target.event.note || 'No threat signals triggered on this call.'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {target.event.signals.map((sig) => (
                        <div
                          key={sig}
                          className="flex items-center justify-between rounded-[6px] border border-[var(--signal-crimson)]/25 bg-[var(--signal-crimson)]/[0.07] px-3 py-2 font-mono text-[13px] text-[var(--signal-crimson)]"
                        >
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            {sig}
                          </span>
                          <span>TRIGGERED</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Associated Principal Ledger */}
            {resolvedPrincipal && (
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--ink-primary)]">
                    Principal Posture
                  </span>
                  <span
                    className={`font-mono text-[13px] font-semibold ${
                      resolvedPrincipal.status === 'REVOKED'
                        ? 'text-[var(--signal-crimson)]'
                        : resolvedPrincipal.status === 'ACTIVE'
                          ? 'text-[var(--signal-emerald)]'
                          : 'text-[var(--signal-amber)]'
                    }`}
                  >
                    {resolvedPrincipal.status}
                  </span>
                </div>

                <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[13px]">
                  <dt className="text-[var(--ink-muted)]">Identity</dt>
                  <dd className="font-mono text-[var(--ink-primary)]">{resolvedPrincipal.id}</dd>

                  <dt className="text-[var(--ink-muted)]">Role / Type</dt>
                  <dd className="text-[var(--ink-secondary)]">
                    {resolvedPrincipal.label} ({resolvedPrincipal.type})
                  </dd>

                  <dt className="text-[var(--ink-muted)]">Risk Score</dt>
                  <dd className="font-mono text-[var(--ink-primary)] tabular-nums">
                    {resolvedPrincipal.riskScore}
                  </dd>

                  <dt className="text-[var(--ink-muted)]">Quarantine Policy</dt>
                  <dd className="font-mono text-[var(--ink-secondary)]">
                    {resolvedPrincipal.quarantinePolicyAttached ? 'Deny-All Attached' : 'None'}
                  </dd>

                  {resolvedPrincipal.revokedAt && (
                    <>
                      <dt className="text-[var(--ink-muted)]">Revoked At</dt>
                      <dd className="font-mono text-[var(--signal-crimson)] tabular-nums">
                        {resolvedPrincipal.revokedAt.slice(11, 23)} UTC
                      </dd>
                    </>
                  )}
                  {resolvedPrincipal.first403At && (
                    <>
                      <dt className="text-[var(--ink-muted)]">First HTTP 403</dt>
                      <dd className="font-mono text-[var(--signal-emerald)] tabular-nums">
                        {resolvedPrincipal.first403At.slice(11, 23)} UTC
                      </dd>
                    </>
                  )}
                </dl>

                {resolvedPrincipal.triggeredSignals.length > 0 && (
                  <div className="pt-1 font-mono text-[13px] text-[var(--ink-secondary)]">
                    Correlated signals: {resolvedPrincipal.triggeredSignals.join(' · ')}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={statusBusy}
                    onClick={async () => {
                      setStatusBusy(true);
                      const nextStatus =
                        resolvedPrincipal.status === 'REVOKED' ? 'ACTIVE' : 'REVOKED';
                      try {
                        await apiFetch(
                          `/api/principals/${encodeURIComponent(resolvedPrincipal.id)}/status`,
                          {
                            method: 'POST',
                            body: JSON.stringify({ status: nextStatus }),
                          },
                        );
                        pushToast({
                          title:
                            nextStatus === 'REVOKED'
                              ? `Revoked ${resolvedPrincipal.id}`
                              : `Restored ${resolvedPrincipal.id}`,
                          detail:
                            nextStatus === 'REVOKED'
                              ? 'Subsequent uploads/writes from this principal now return HTTP 403.'
                              : 'Principal returned to ACTIVE standing.',
                          tone: nextStatus === 'REVOKED' ? 'warning' : 'success',
                        });
                      } catch (err) {
                        pushToast({
                          title: 'Could not update principal',
                          detail: err instanceof Error ? err.message : 'Operator or Admin required.',
                          tone: 'error',
                        });
                      } finally {
                        setStatusBusy(false);
                      }
                    }}
                    className={`h-[30px] w-full rounded-[6px] border text-[13px] font-medium transition-colors disabled:opacity-50 ${
                      resolvedPrincipal.status === 'REVOKED'
                        ? 'border-[var(--signal-emerald)]/40 bg-[var(--signal-emerald)]/10 text-[var(--signal-emerald)] hover:bg-[var(--signal-emerald)]/20'
                        : 'border-[var(--signal-crimson)]/40 bg-[var(--signal-crimson)]/10 text-[var(--signal-crimson)] hover:bg-[var(--signal-crimson)]/20'
                    }`}
                  >
                    {statusBusy
                      ? 'Updating Access…'
                      : resolvedPrincipal.status === 'REVOKED'
                        ? 'Restore Principal Access'
                        : 'Revoke Principal (HTTP 403 Lockout)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Action Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-pane)] px-4 py-3">
            {relatedIncident ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedIncidentId(relatedIncident.id);
                  setActivePage('incidents');
                  onClose();
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3 py-1.5 text-[13px] font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-indigo-hover)]"
              >
                Open Incident {relatedIncident.id}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActivePage('canaries');
                  onClose();
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
              >
                Inspect Vault &amp; Canaries
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
