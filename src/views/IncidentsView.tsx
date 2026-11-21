import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Download,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';
import type { RestorePreview, RestoreReport } from '../shared/types.ts';

export const IncidentsView: React.FC = () => {
  const {
    state,
    selectedIncidentId,
    setSelectedIncidentId,
    apiFetch,
    pushToast,
    setActivePage,
  } = useConsole();

  const [filter, setFilter] = useState<'all' | 'CONTAINED' | 'RESTORED' | 'DRY_RUN_LOGGED'>('all');
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [restoring, setRestoring] = useState(false);

  const incidents = state?.incidents ?? [];

  const filtered = useMemo(() => {
    if (filter === 'all') return incidents;
    return incidents.filter((i) => i.status === filter);
  }, [incidents, filter]);

  useEffect(() => {
    if (!selectedIncidentId && filtered.length > 0) {
      setSelectedIncidentId(filtered[0].id);
    }
  }, [filtered, selectedIncidentId, setSelectedIncidentId]);

  const activeIncident =
    incidents.find((i) => i.id === selectedIncidentId) ?? filtered[0] ?? null;

  const openRestorePreview = async (incidentId: string) => {
    try {
      const data = await apiFetch<RestorePreview>(`/api/incidents/${incidentId}/restore-preview`);
      setPreview(data);
    } catch (err) {
      pushToast({
        title: 'Preview unavailable',
        detail: err instanceof Error ? err.message : 'Unable to generate restore preview.',
        tone: 'error',
      });
    }
  };

  const confirmRestore = async () => {
    if (!preview) return;
    setRestoring(true);
    try {
      const res = await apiFetch<{ ok: boolean; report: RestoreReport }>(
        `/api/incidents/${preview.incidentId}/restore`,
        { method: 'POST' },
      );
      setPreview(null);
      pushToast({
        title: '1-Click Restore Verified',
        detail: `${res.report.filesRestored} object(s) restored · ${res.report.restoreAccuracyPct}% SHA-256 match.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Restore failed',
        detail: err instanceof Error ? err.message : 'Could not complete restore.',
        tone: 'error',
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleAdminDecision = async (incidentId: string, decision: 'approved' | 'denied') => {
    try {
      await apiFetch(`/api/incidents/${incidentId}/approve-admin`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      pushToast({
        title: decision === 'approved' ? 'Quarantine Approved' : 'Quarantine Released',
        detail: `Recorded ${decision} decision in operator audit log.`,
        tone: decision === 'approved' ? 'warning' : 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Action denied',
        detail: err instanceof Error ? err.message : 'Unable to update approval.',
        tone: 'error',
      });
    }
  };

  const exportForensicJson = (incidentId: string) => {
    window.location.href = `/api/incidents/${incidentId}/export`;
  };

  if (!state) return null;

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink-primary)] leading-tight">
            Incidents &amp; One-Click Restore
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
            Master-detail forensic ledger · Human-admin quarantine approvals · SHA-256 verified
            vault rollbacks
          </p>
        </div>

        <div className="flex items-center rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-0.5">
          {(['all', 'CONTAINED', 'RESTORED', 'DRY_RUN_LOGGED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === tab
                  ? 'bg-[var(--bg-hover)] text-[var(--ink-primary)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'DRY_RUN_LOGGED' ? 'Dry-Run' : tab}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20 px-6 text-center">
          <ShieldCheck className="h-7 w-7 text-[var(--signal-emerald)]" />
          <h3 className="mt-3 text-[14px] font-semibold text-[var(--ink-primary)]">No Incidents Recorded</h3>
          <p className="mt-1 max-w-md text-[13px] text-[var(--ink-muted)]">
            Use the Simulator to check detection, local containment, and sample recovery.
          </p>
          <button
            type="button"
            onClick={() => setActivePage('simulator')}
            className="mt-4 rounded-[6px] bg-[var(--accent-indigo)] px-4 py-1.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
          >
            Open Simulator
          </button>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 divide-y divide-[var(--border-hairline)] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          {/* Left Master Queue (340px / 4 cols) */}
          <div className="bg-[var(--bg-rail)] lg:col-span-4 divide-y divide-[var(--border-hairline)]">
            {filtered.map((inc) => {
              const selected = activeIncident?.id === inc.id;
              return (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selected ? 'bg-[var(--accent-indigo)]/15' : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[13px] tabular-nums">
                    <span className="text-[var(--ink-secondary)]">{inc.id}</span>
                    <span
                      className={`font-semibold ${
                        inc.status === 'RESTORED'
                          ? 'text-[var(--signal-emerald)]'
                          : inc.status === 'DRY_RUN_LOGGED'
                            ? 'text-[var(--signal-amber)]'
                            : 'text-[var(--signal-crimson)]'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--ink-primary)] leading-snug">
                    {inc.title}
                  </p>
                  <p className="mt-1 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
                    MTTD {inc.mttdMs}ms · Preserved {inc.filesPreservedPct}% · {inc.principals.length}{' '}
                    principal(s)
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Forensic Detail Pane (8 cols) */}
          {activeIncident && (
            <div className="bg-[var(--bg-base)] lg:col-span-8 flex flex-col">
              {/* Detail Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-muted)]">
                    <span className="text-[var(--ink-secondary)]">{activeIncident.id}</span>
                    <span>·</span>
                    <span>{activeIncident.bucket}</span>
                    <span>·</span>
                    <span>mode={activeIncident.mode}</span>
                  </div>
                  <h2 className="mt-1 text-[16px] font-semibold text-[var(--ink-primary)]">
                    {activeIncident.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportForensicJson(activeIncident.id)}
                    className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
                    Forensic JSON
                  </button>

                  {activeIncident.status !== 'RESTORED' && (
                    <button
                      type="button"
                      onClick={() => openRestorePreview(activeIncident.id)}
                      className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      1-Click Restore
                    </button>
                  )}
                </div>
              </div>

              {/* Pending Human-Admin Approval Banner */}
              {activeIncident.pendingAdminApproval && !activeIncident.pendingAdminApproval.decision && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--signal-amber)]/30 bg-[var(--signal-amber)]/[0.08] px-5 py-3">
                  <div className="flex items-start gap-2.5 text-[13px]">
                    <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-amber)]" />
                    <div>
                      <span className="font-semibold text-[var(--ink-primary)]">
                        Human-Admin Quarantine Approval Required
                      </span>
                      <p className="text-[13px] text-[var(--ink-secondary)]">
                        {activeIncident.pendingAdminApproval.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdminDecision(activeIncident.id, 'denied')}
                      className="rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] px-3 py-1 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                    >
                      Release Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDecision(activeIncident.id, 'approved')}
                      className="rounded-[6px] bg-[var(--signal-crimson)] px-3 py-1 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--signal-crimson-hover)]"
                    >
                      Approve Revocation
                    </button>
                  </div>
                </div>
              )}

              {/* Flush 4-Cell Incident KPI Row */}
              <div className="grid grid-cols-2 divide-x divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] sm:grid-cols-4 tabular-nums">
                <div className="px-5 py-3">
                  <div className="text-[13px] text-[var(--ink-muted)]">MTTD</div>
                  <div className="mt-0.5 font-mono text-[16px] font-semibold text-[var(--ink-primary)]">
                    {activeIncident.mttdMs} ms
                  </div>
                </div>
                <div className="px-5 py-3">
                  <div className="text-[13px] text-[var(--ink-muted)]">MTTC (to 403)</div>
                  <div className="mt-0.5 font-mono text-[16px] font-semibold text-[var(--ink-primary)]">
                    {activeIncident.mttcMs !== undefined ? `${activeIncident.mttcMs} ms` : '—'}
                  </div>
                </div>
                <div className="px-5 py-3">
                  <div className="text-[13px] text-[var(--ink-muted)]">Files Preserved</div>
                  <div className="mt-0.5 font-mono text-[16px] font-semibold text-[var(--signal-emerald)]">
                    {activeIncident.filesPreservedPct}%
                  </div>
                </div>
                <div className="px-5 py-3">
                  <div className="text-[13px] text-[var(--ink-muted)]">Principals</div>
                  <div className="mt-0.5 font-mono text-[13px] font-medium text-[var(--ink-primary)] truncate">
                    {activeIncident.principals.join(', ')}
                  </div>
                </div>
              </div>

              {/* Verified Restore Strip */}
              {activeIncident.restoreReport && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--signal-emerald)]/25 bg-[var(--signal-emerald)]/[0.06] px-5 py-2.5 text-[13px] tabular-nums">
                  <div className="flex items-center gap-2 font-medium text-[var(--signal-emerald)]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      SHA-256 Vault Restore Verified ({activeIncident.restoreReport.restoreAccuracyPct}%) —{' '}
                      {activeIncident.restoreReport.filesRestored} restored,{' '}
                      {activeIncident.restoreReport.artifactsRemoved} artifacts purged
                    </span>
                  </div>
                  <span className="font-mono text-[13px] text-[var(--ink-secondary)]">
                    {activeIncident.restoreReport.durationMs} ms · Max recovery gap{' '}
                    {activeIncident.restoreReport.maxDataLossWindowMs} ms
                  </span>
                </div>
              )}

              {/* Chronological Timeline */}
              <div className="border-b border-[var(--border-hairline)]">
                <div className="flex h-[40px] items-center border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 text-[13px] font-semibold text-[var(--ink-primary)]">
                  Incident Timeline
                </div>
                <div className="divide-y divide-[var(--border-hairline)]">
                  {activeIncident.timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-2.5 text-[13px]">
                      <span className="mt-0.5 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums shrink-0">
                        {t.timestamp.slice(11, 23)}
                      </span>
                      <div>
                        <span className="font-medium text-[var(--ink-primary)]">{t.label}</span>
                        <p className="text-[13px] text-[var(--ink-secondary)]">{t.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Affected Objects Compact 34px Table */}
              <div>
                <div className="flex h-[40px] items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 text-[13px] font-semibold text-[var(--ink-primary)]">
                  <span>Affected Objects ({activeIncident.affectedObjects.length})</span>
                  <span className="font-mono text-[13px] font-normal text-[var(--ink-muted)]">
                    Pre-attack manifest SHA-256 &amp; replication gap
                  </span>
                </div>

                {activeIncident.affectedObjects.length === 0 ? (
                  <div className="px-5 py-6 text-[13px] text-[var(--signal-emerald)]">
                    Contained before any business file was encrypted (0 impacted objects).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
                      <thead className="bg-[var(--bg-rail)] text-[13px] font-medium text-[var(--ink-muted)]">
                        <tr className="h-[30px] border-b border-[var(--border-hairline)]">
                          <th className="pl-5 pr-3 font-medium">Object Key</th>
                          <th className="pr-3 font-medium">Impact Type</th>
                          <th className="pr-3 font-medium">Manifest SHA-256</th>
                          <th className="pr-3 text-right font-medium">Gap</th>
                          <th className="pr-5 text-right font-medium">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-hairline)]">
                        {activeIncident.affectedObjects.map((obj) => (
                          <tr key={obj.key} className="h-[40px] hover:bg-[var(--bg-hover)]">
                            <td className="pl-5 pr-3 font-mono text-[13px] text-[var(--ink-primary)] max-w-[240px] truncate">
                              {obj.key}
                            </td>
                            <td className="pr-3 font-mono text-[13px] text-[var(--ink-secondary)]">
                              {obj.artifactType}
                            </td>
                            <td className="pr-3 font-mono text-[13px] text-[var(--ink-muted)]">
                              {obj.preAttackSha256 ? `${obj.preAttackSha256.slice(0, 14)}…` : '—'}
                            </td>
                            <td className="pr-3 text-right font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
                              {obj.replicationLagMs} ms
                            </td>
                            <td className="pr-5 text-right font-mono text-[13px]">
                              {obj.restored ? (
                                <span className="text-[var(--signal-emerald)]">
                                  {obj.verifiedSha256Match ? 'SHA-256 Match' : 'Mismatch'}
                                </span>
                              ) : (
                                <span className="text-[var(--signal-amber)]">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1-Click Restore Preview Precision Dialog */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
            onClick={() => !restoring && setPreview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="pane-elevated w-full max-w-[620px] overflow-hidden rounded-[6px] border border-[var(--border-hairline)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-[var(--accent-text)]" />
                  <div>
                    <h3 className="text-[14px] font-semibold text-[var(--ink-primary)]">
                      1-Click Vault Restore Preview
                    </h3>
                    <p className="font-mono text-[13px] text-[var(--ink-muted)]">
                      {preview.incidentId} · {preview.bucket} · Max recovery gap{' '}
                      {preview.maxDataLossWindowMs} ms
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !restoring && setPreview(null)}
                  className="rounded-[5px] p-1 text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] tabular-nums">
                <div className="px-5 py-3">
                  <span className="text-[13px] text-[var(--ink-muted)]">Objects to Roll Back</span>
                  <p className="mt-0.5 font-mono text-[17px] font-semibold text-[var(--ink-primary)]">
                    {preview.objectsToRestore.length}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <span className="text-[13px] text-[var(--ink-muted)]">Artifacts to Purge</span>
                  <p className="mt-0.5 font-mono text-[17px] font-semibold text-[var(--signal-amber)]">
                    {preview.artifactsToRemove.length}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <span className="text-[13px] text-[var(--ink-muted)]">Unrecoverable</span>
                  <p className="mt-0.5 font-mono text-[17px] font-semibold text-[var(--signal-emerald)]">
                    {preview.unrecoverableCount}
                  </p>
                </div>
              </div>

              <div className="max-h-[220px] overflow-y-auto divide-y divide-[var(--border-hairline)] px-5 py-2 font-mono text-[13px]">
                {preview.objectsToRestore.length === 0 ? (
                  <p className="py-3 text-[var(--signal-emerald)]">
                    0 encrypted objects to roll back; confirming resolves the incident and resumes
                    vault replication.
                  </p>
                ) : (
                  preview.objectsToRestore.map((obj) => (
                    <div
                      key={obj.key}
                      className="flex h-[32px] items-center justify-between gap-4"
                    >
                      <span className="truncate text-[var(--ink-primary)]">{obj.key}</span>
                      <span className="shrink-0 text-[var(--ink-muted)] tabular-nums">
                        {obj.preAttackSha256.slice(0, 12)}… · gap {obj.dataLossWindowMs}ms
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-3">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => setPreview(null)}
                  className="rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={confirmRestore}
                  className="rounded-[6px] bg-[var(--accent-indigo)] px-4 py-1.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] disabled:opacity-50"
                >
                  {restoring ? 'Restoring & Verifying…' : 'Confirm 1-Click Restore'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
