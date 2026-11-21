import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const HealthView: React.FC = () => {
  const { state, wsConnected, apiFetch, pushToast } = useConsole();
  const [auditQuery, setAuditQuery] = useState('');
  const [togglingGap, setTogglingGap] = useState(false);

  const filteredAudit = useMemo(() => {
    const list = state?.auditLog ?? [];
    const q = auditQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [state?.auditLog, auditQuery]);

  if (!state) return null;

  const h = state.health;

  const toggleStreamGap = async () => {
    setTogglingGap(true);
    try {
      await apiFetch('/api/health/stream-gap', {
        method: 'POST',
        body: JSON.stringify({ simulated: !h.streamGapSimulated }),
      });
      pushToast({
        title: !h.streamGapSimulated ? 'Stream-Gap Alarm Triggered' : 'Stream Ingestion Restored',
        detail: !h.streamGapSimulated
          ? 'Degraded banner active across War Room and Health console.'
          : 'Live event ingestion resumed normally.',
        tone: !h.streamGapSimulated ? 'warning' : 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Action denied',
        detail: err instanceof Error ? err.message : 'Operator or Admin role required.',
        tone: 'error',
      });
    } finally {
      setTogglingGap(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--bg-base)]">
      {/* Flush Institutional Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink-primary)] leading-tight">
            Usage &amp; Health
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">
            Ingestion telemetry, out-of-band component health, Groq free-tier quota utilization, and
            immutable operator audit trail.
          </p>
        </div>

        <button
          type="button"
          disabled={togglingGap}
          onClick={toggleStreamGap}
          className={`inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border px-3 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
            h.streamGapSimulated
              ? 'border-[var(--signal-emerald)]/40 bg-[var(--signal-emerald)]/15 text-[var(--signal-emerald)] hover:bg-[var(--signal-emerald)]/20'
              : 'border-[var(--signal-amber)]/35 bg-[var(--signal-amber)]/10 text-[var(--signal-amber)] hover:bg-[var(--signal-amber)]/15'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          {h.streamGapSimulated ? 'Restore Stream Health' : 'Simulate Stream Gap'}
        </button>
      </div>

      {/* Flush 4-Cell Operational KPI Ledger */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-4">
        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Events Ingested (60s)
          </p>
          <p className="mt-1.5 font-mono text-[22px] font-semibold text-[var(--ink-primary)] tabular-nums leading-tight">
            {h.eventsPerMinute} / min
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
            Avg ingestion latency: {h.avgIngestionLatencyMs} ms
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Monitored Inventory
          </p>
          <p className="mt-1.5 font-mono text-[22px] font-semibold text-[var(--ink-primary)] tabular-nums leading-tight">
            {h.monitoredObjects}
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
            {h.monitoredBuckets} buckets · {h.activeCanaries} active canaries
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            WORM Vault Footprint
          </p>
          <p className="mt-1.5 font-mono text-[22px] font-semibold text-[var(--ink-primary)] tabular-nums leading-tight">
            {formatBytes(h.vaultSizeBytes)}
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
            {state.vault.manifestCount} clean snapshots verified
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Control Plane Uptime
          </p>
          <p className="mt-1.5 font-mono text-[22px] font-semibold text-[var(--signal-emerald)] tabular-nums leading-tight">
            {h.uptimeSeconds}s
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
            Heartbeat {h.lastHeartbeatAt.slice(11, 19)} UTC
          </p>
        </div>
      </div>

      {/* Flush 4-Column Component Health Strip */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] md:grid-cols-2 md:divide-y-0 md:divide-x xl:grid-cols-4">
        {[
          {
            name: 'Detection Engine',
            healthy: h.engineStatus === 'healthy',
            detail: h.streamGapSimulated
              ? 'Degraded — ingestion gap simulated'
              : '4 signals & swarm windows active',
          },
          {
            name: 'Control Plane API',
            healthy: h.apiStatus === 'healthy',
            detail: 'REST + RBAC enforcement online',
          },
          {
            name: 'Live WebSocket (/ws/live)',
            healthy: wsConnected,
            detail: wsConnected
              ? 'Sub-second event push connected'
              : 'Disconnected — auto-retrying',
          },
          {
            name: 'Alert Delivery',
            healthy: state.alerts.lastDeliveryStatus !== 'error',
            detail: state.alerts.enabled
              ? `${state.alerts.deliveredCount} webhook(s) delivered`
              : 'Console feed active · webhooks optional',
          },
        ].map((comp) => (
          <div key={comp.name} className="flex items-start justify-between gap-3 px-5 py-3.5">
            <div>
              <p className="text-[13px] font-semibold text-[var(--ink-primary)]">{comp.name}</p>
              <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">{comp.detail}</p>
            </div>
            {comp.healthy ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-emerald)]" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-amber)]" />
            )}
          </div>
        ))}
      </div>

      {/* Full-Width High-Density 34px Operator Audit Log */}
      <section className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
              Operator Audit Log ({filteredAudit.length})
            </h2>
            <span className="text-[13px] text-[var(--ink-muted)]">
              Every privileged action and RBAC denial recorded with role and timestamp
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <input
              type="text"
              value={auditQuery}
              onChange={(e) => setAuditQuery(e.target.value)}
              placeholder="Filter action, role, target…"
              className="h-[28px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] pl-8 pr-3 text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-[var(--bg-base)]">
          <table className="w-full min-w-[740px] text-left text-[13px]">
            <thead>
              <tr className="h-[30px] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                <th className="pl-5 pr-3">Timestamp</th>
                <th className="px-3">Role</th>
                <th className="px-3">Action</th>
                <th className="px-3">Target</th>
                <th className="px-3">Outcome</th>
                <th className="pl-3 pr-5">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredAudit.map((entry) => (
                <tr key={entry.id} className="h-[40px] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="pl-5 pr-3 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                    {entry.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="px-3 font-mono text-[13px] capitalize text-[var(--ink-primary)]">
                    {entry.role}
                  </td>
                  <td className="px-3 font-mono text-[13px] text-[var(--accent-text)]">{entry.action}</td>
                  <td className="px-3 font-mono text-[13px] text-[var(--ink-secondary)]">{entry.target}</td>
                  <td className="px-3 font-mono text-[13px] uppercase">
                    <span
                      className={
                        entry.outcome === 'success'
                          ? 'text-[var(--signal-emerald)]'
                          : entry.outcome === 'denied'
                            ? 'text-[var(--signal-amber)]'
                            : 'text-[var(--signal-crimson)]'
                      }
                    >
                      {entry.outcome}
                    </span>
                  </td>
                  <td className="pl-3 pr-5 text-[13px] text-[var(--ink-secondary)]">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
