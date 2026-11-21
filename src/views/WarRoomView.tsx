import React, { useMemo, useState } from 'react';
import { ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ActivityChart } from '../components/ActivityChart.tsx';
import { EntropyTimeSeriesChart, RiskScoreGauge } from '../components/Charts.tsx';
import { ForensicDrawer, type ForensicTarget } from '../components/ForensicDrawer.tsx';
import { useConsole } from '../context/ConsoleContext.tsx';
import type { PrincipalStatus } from '../shared/types.ts';

function statusColor(status: PrincipalStatus): string {
  switch (status) {
    case 'REVOKED':
      return 'text-[var(--signal-crimson)]';
    case 'PENDING_APPROVAL':
    case 'WATCHLIST':
      return 'text-[var(--signal-amber)]';
    default:
      return 'text-[var(--signal-emerald)]';
  }
}

export const WarRoomView: React.FC = () => {
  const { state, setActivePage, setSelectedIncidentId } = useConsole();
  const [feedFilter, setFeedFilter] = useState<'all' | 'flagged' | 'blocked'>('all');
  const [inspected, setInspected] = useState<ForensicTarget>(null);

  if (!state) return null;

  const latestIncident = state.incidents[0];
  const swarmIncident = state.incidents.find(
    (i) => i.isSwarm && (i.status === 'ACTIVE' || i.status === 'CONTAINED'),
  );

  const currentBucketRisk = useMemo(() => {
    const latest = state.events.find((e) => !e.selfLoopIgnored);
    if (latestIncident && latestIncident.status === 'RESTORED') return 0;
    return latest?.bucketRiskScore ?? 0;
  }, [state.events, latestIncident]);

  const filteredEvents = useMemo(() => {
    return state.events.filter((evt) => {
      if (feedFilter === 'flagged') return evt.signals.length > 0 || evt.riskDelta > 0;
      if (feedFilter === 'blocked') return evt.httpStatus === 403;
      return true;
    });
  }, [state.events, feedFilter]);

  const openIncidentInConsole = (id: string) => {
    setSelectedIncidentId(id);
    setActivePage('incidents');
  };

  return (
    <div className="flex flex-col">
      {/* Sub-Header Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink-primary)] leading-tight">
            Security overview
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
            {state.buckets.length} monitored buckets · Adapter:{' '}
            <span className="font-mono text-[var(--ink-secondary)]">
              {state.storage.activeAdapter === 'minio' ? state.storage.provider : 'Local object store'}
            </span>{' '}
            · Click any event or credential to open Forensic Inspector
          </p>
        </div>

        <div className="flex items-center gap-2">
          {latestIncident && (
            <button
              type="button"
              onClick={() => openIncidentInConsole(latestIncident.id)}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] px-3 text-[13px] font-medium text-[var(--ink-primary)] transition-colors hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
            >
              {latestIncident.status === 'CONTAINED' ? 'Open 1-Click Restore' : 'Inspect Latest Incident'}
              <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
            </button>
          )}
        </div>
      </div>

      {/* Flush Cross-Principal Swarm Alert Strip */}
      {swarmIncident && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--signal-crimson)]/30 bg-[var(--signal-crimson)]/[0.08] px-5 py-2.5">
          <div className="flex items-center gap-2.5 text-[13px]">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--signal-crimson)]" />
            <span className="font-semibold text-[var(--ink-primary)]">
              Cross-Principal Swarm Contained · {swarmIncident.bucket}
            </span>
            <span className="text-[var(--ink-secondary)]">
              {swarmIncident.principals.length} identities (
              <span className="font-mono text-[var(--ink-primary)]">{swarmIncident.principals.join(', ')}</span>)
              quarantined together
            </span>
          </div>
          <button
            type="button"
            onClick={() => openIncidentInConsole(swarmIncident.id)}
            className="rounded-[6px] bg-[var(--signal-crimson)] px-3 py-1 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--signal-crimson-hover)] whitespace-nowrap shrink-0"
          >
            Restore Vault Snapshots
          </button>
        </div>
      )}

      {/* Flush 4-Column Hairline-Divided KPI Ledger */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-4">
        <div className="px-5 py-3.5">
          <div className="text-[13px] font-medium text-[var(--ink-muted)]">Measured MTTD</div>
          <div className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-mono text-[22px] font-semibold text-[var(--ink-primary)]">
              {latestIncident ? `${latestIncident.mttdMs} ms` : '—'}
            </span>
            <span className="font-mono text-[13px] text-[var(--ink-muted)]">Target &lt; 5s</span>
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="text-[13px] font-medium text-[var(--ink-muted)]">Measured MTTC (to HTTP 403)</div>
          <div className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-mono text-[22px] font-semibold text-[var(--ink-primary)]">
              {latestIncident?.mttcMs !== undefined ? `${latestIncident.mttcMs} ms` : '—'}
            </span>
            <span className="font-mono text-[13px] text-[var(--ink-muted)]">Target &lt; 10s</span>
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="text-[13px] font-medium text-[var(--ink-muted)]">Files Preserved vs. Impacted</div>
          <div className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
            <span className="font-mono text-[22px] font-semibold text-[var(--signal-emerald)]">
              {latestIncident ? `${latestIncident.filesPreservedPct}%` : '100%'}
            </span>
            <span className="font-mono text-[13px] text-[var(--ink-secondary)]">
              {latestIncident
                ? `${latestIncident.filesPreserved} clean / ${latestIncident.filesImpacted} hit`
                : `${state.health.monitoredObjects} clean / 0 hit`}
            </span>
          </div>
        </div>

        <div className="px-5 py-3.5">
          <div className="text-[13px] font-medium text-[var(--ink-muted)]">WORM Vault Replication</div>
          <div className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
            <span
              className={`font-mono text-[22px] font-semibold ${
                state.vault.replicationPaused ? 'text-[var(--signal-amber)]' : 'text-[var(--signal-emerald)]'
              }`}
            >
              {state.vault.replicationPaused ? 'Held' : `${state.vault.avgReplicationLagMs} ms`}
            </span>
            <span className="font-mono text-[13px] text-[var(--ink-secondary)]">
              {state.vault.manifestCount} snapshots
            </span>
          </div>
        </div>
      </div>

      <div className="overview-activity"><ActivityChart events={state.events} /></div>

      {/* Split Pane Row 1: Entropy Time-Series (2/3) | Bucket Risk Gauge (1/3) */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        <div className="bg-[var(--bg-base)] p-5 lg:col-span-8">
          <EntropyTimeSeriesChart
            events={state.events}
            deltaThreshold={state.policy.detection.entropy.delta_threshold}
            onSelectEvent={(evt) => setInspected({ kind: 'event', event: evt })}
          />
        </div>

        <div className="flex flex-col justify-between bg-[var(--bg-rail)] p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--ink-primary)]">Bucket Risk Score</h3>
              <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">Decaying 4-signal composite</p>
            </div>
            <span className="font-mono text-[13px] text-[var(--ink-secondary)]">
              {state.policy.mode.toUpperCase()}
            </span>
          </div>
          <div className="mt-3">
            <RiskScoreGauge
              score={currentBucketRisk}
              watchlistThreshold={state.policy.detection.score.watchlist}
              containThreshold={state.policy.detection.score.contain}
              mode={state.policy.mode}
            />
          </div>
        </div>
      </div>

      {/* Split Pane Row 2: Monitored Credentials (1/2) | Attack & Response Timeline (1/2) */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* Monitored Credentials (compact 34px clickable rows) */}
        <div className="bg-[var(--bg-base)] lg:col-span-6">
          <div className="flex h-[38px] items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5">
            <h3 className="text-[13px] font-semibold text-[var(--ink-primary)]">Monitored Credentials</h3>
            <span className="font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
              {state.principals.filter((p) => p.status === 'REVOKED').length} revoked ·{' '}
              {state.principals.length} total
            </span>
          </div>
          <div className="max-h-[272px] overflow-y-auto divide-y divide-[var(--border-hairline)]">
            {state.principals.map((p) => {
              const isSelected =
                inspected?.kind === 'principal' && inspected.principalId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setInspected({ kind: 'principal', principalId: p.id })}
                  className={`flex h-[40px] w-full items-center justify-between gap-3 px-5 text-left text-[13px] transition-colors ${
                    isSelected ? 'bg-[var(--accent-indigo)]/15' : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-medium text-[var(--ink-primary)] truncate">{p.id}</span>
                    <span className="hidden sm:inline text-[13px] text-[var(--ink-muted)] truncate">
                      · {p.allowlisted ? 'Allowlisted' : p.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 font-mono text-[13px] tabular-nums">
                    <span className="text-[var(--ink-muted)]">Score {p.riskScore}</span>
                    <span className={`w-[78px] text-right font-semibold ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Attack & Response Timeline */}
        <div className="bg-[var(--bg-base)] lg:col-span-6">
          <div className="flex h-[38px] items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5">
            <h3 className="text-[13px] font-semibold text-[var(--ink-primary)] truncate">
              {latestIncident ? `Timeline · ${latestIncident.id}` : 'Attack & Response Timeline'}
            </h3>
            {latestIncident ? (
              <span
                className={`font-mono text-[13px] font-semibold ${
                  latestIncident.status === 'RESTORED'
                    ? 'text-[var(--signal-emerald)]'
                    : latestIncident.status === 'DRY_RUN_LOGGED'
                      ? 'text-[var(--signal-amber)]'
                      : 'text-[var(--signal-crimson)]'
                }`}
              >
                {latestIncident.status}
              </span>
            ) : (
              <span className="font-mono text-[13px] text-[var(--signal-emerald)]">NOMINAL</span>
            )}
          </div>

          {!latestIncident ? (
            <div className="flex h-[272px] flex-col items-center justify-center px-6 text-center">
              <ShieldCheck className="h-6 w-6 text-[var(--signal-emerald)]" />
              <p className="mt-2.5 text-[13px] font-medium text-[var(--ink-primary)]">No Active Threats</p>
              <p className="mt-1 max-w-sm text-[13px] text-[var(--ink-muted)]">
                Open the Simulator to check how the detector responds to synthetic alerts.
              </p>
              <button
                type="button"
                onClick={() => setActivePage('simulator')}
                className="mt-3.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
              >
                Open Simulator
              </button>
            </div>
          ) : (
            <div className="max-h-[272px] overflow-y-auto divide-y divide-[var(--border-hairline)]">
              {latestIncident.timeline.map((step, idx) => (
                <div key={`${step.timestamp}-${idx}`} className="flex items-start gap-3 px-5 py-2.5">
                  <span className="mt-0.5 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums shrink-0">
                    {step.timestamp.slice(11, 23)}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-[13px] font-medium ${
                        step.severity === 'critical'
                          ? 'text-[var(--signal-crimson)]'
                          : step.severity === 'warning'
                            ? 'text-[var(--signal-amber)]'
                            : step.severity === 'success'
                              ? 'text-[var(--signal-emerald)]'
                              : 'text-[var(--ink-primary)]'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)] leading-snug">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Compact 34px Live Activity Feed */}
      <div className="bg-[var(--bg-base)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2">
          <div className="flex items-center gap-2.5">
            <h3 className="text-[13px] font-semibold text-[var(--ink-primary)]">Live Activity Feed</h3>
            <span className="font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
              {filteredEvents.length} events · Click row to inspect
            </span>
          </div>

          <div className="flex items-center rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-0.5">
            {(['all', 'flagged', 'blocked'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFeedFilter(tab)}
                className={`rounded-[4px] px-2.5 py-0.5 text-[13px] font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  feedFilter === tab
                    ? 'bg-[var(--bg-hover)] text-[var(--ink-primary)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
                }`}
              >
                {tab === 'blocked' ? 'HTTP 403' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[380px] overflow-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg-rail)] text-[13px] font-medium text-[var(--ink-muted)]">
              <tr className="border-b border-[var(--border-hairline)] h-[30px]">
                <th className="pl-5 pr-3 font-medium">Time</th>
                <th className="pr-3 font-medium">Operation</th>
                <th className="pr-3 font-medium">Principal</th>
                <th className="pr-3 font-medium">Object / Target</th>
                <th className="pr-3 text-right font-medium">Entropy / ΔH</th>
                <th className="pr-3 font-medium">Magic</th>
                <th className="pr-3 text-right font-medium">HTTP</th>
                <th className="pr-5 font-medium">Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[13px] text-[var(--ink-muted)]">
                    No events match the current filter. Trigger a scenario in Simulator to stream
                    live telemetry.
                  </td>
                </tr>
              ) : (
                filteredEvents.slice(0, 60).map((evt) => {
                  const isSelected =
                    inspected?.kind === 'event' && inspected.event.id === evt.id;
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => setInspected({ kind: 'event', event: evt })}
                      className={`h-[40px] cursor-pointer transition-colors ${
                        isSelected ? 'bg-[var(--accent-indigo)]/15' : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <td className="pl-5 pr-3 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                        {evt.timestamp.slice(11, 23)}
                      </td>
                      <td className="pr-3 font-mono text-[13px] text-[var(--ink-primary)] whitespace-nowrap">
                        {evt.apiOp}
                      </td>
                      <td className="pr-3 font-mono text-[13px] text-[var(--ink-secondary)] whitespace-nowrap">
                        {evt.principalId}
                      </td>
                      <td className="pr-3 font-mono text-[13px] text-[var(--ink-primary)] max-w-[260px] truncate">
                        {evt.key ? `${evt.bucket}/${evt.key}` : evt.bucket}
                      </td>
                      <td className="pr-3 text-right font-mono text-[13px] tabular-nums whitespace-nowrap">
                        {typeof evt.entropy === 'number' ? (
                          <span
                            className={
                              typeof evt.deltaEntropy === 'number' &&
                              evt.deltaEntropy >= state.policy.detection.entropy.delta_threshold
                                ? 'text-[var(--signal-crimson)]'
                                : 'text-[var(--ink-primary)]'
                            }
                          >
                            {evt.entropy.toFixed(2)}
                            {typeof evt.deltaEntropy === 'number' &&
                              ` (${evt.deltaEntropy >= 0 ? '+' : ''}${evt.deltaEntropy.toFixed(2)})`}
                          </span>
                        ) : (
                          <span className="text-[var(--ink-muted)]">—</span>
                        )}
                      </td>
                      <td className="pr-3 font-mono text-[13px] whitespace-nowrap">
                        {evt.magicValid === undefined ? (
                          <span className="text-[var(--ink-muted)]">—</span>
                        ) : evt.magicValid ? (
                          <span className="text-[var(--signal-emerald)]">{evt.magicDetected || 'Valid'}</span>
                        ) : (
                          <span className="text-[var(--signal-crimson)]">Lost</span>
                        )}
                      </td>
                      <td className="pr-3 text-right font-mono text-[13px] tabular-nums whitespace-nowrap">
                        <span
                          className={
                            evt.httpStatus === 403
                              ? 'font-semibold text-[var(--signal-crimson)]'
                              : 'text-[var(--ink-secondary)]'
                          }
                        >
                          {evt.httpStatus}
                        </span>
                      </td>
                      <td className="pr-5 text-[13px] max-w-[220px] truncate">
                        {evt.selfLoopIgnored ? (
                          <span className="text-[var(--ink-muted)]">Self-loop ignored</span>
                        ) : evt.signals.length > 0 ? (
                          <span className="font-mono text-[var(--signal-crimson)]">
                            {evt.signals.join(' · ')}
                          </span>
                        ) : evt.note ? (
                          <span className="text-[var(--ink-secondary)]">{evt.note}</span>
                        ) : (
                          <span className="text-[var(--signal-emerald)]">Clean</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Docked Slide-Over Forensic Inspector Drawer */}
      <ForensicDrawer target={inspected} onClose={() => setInspected(null)} />
    </div>
  );
};
