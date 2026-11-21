import React, { useState } from 'react';
import {
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const CanariesVaultView: React.FC = () => {
  const { state, apiFetch, pushToast } = useConsole();
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!state) return null;

  const quota = state.groq.quota;

  const handleRefreshCanaries = async () => {
    setRefreshing(true);
    try {
      const res = await apiFetch<{ refreshedCount: number }>('/api/canaries/refresh', {
        method: 'POST',
        body: JSON.stringify({ bucket: 'finance-prod' }),
      });
      pushToast({
        title: 'Canaries Rotated (Self-Loop Safe)',
        detail: `Refreshed ${res.refreshedCount} canaries under defyswarm-service with 0 alerts.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Refresh failed',
        detail: err instanceof Error ? err.message : 'Unable to refresh canaries.',
        tone: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateCanaries = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch<{ installed: unknown[]; tokensUsed: number }>(
        '/api/canaries/generate',
        {
          method: 'POST',
          body: JSON.stringify({ bucket: 'finance-prod' }),
        },
      );
      pushToast({
        title: 'Adaptive Canaries Synthesized',
        detail: `Groq openai/gpt-oss-120b deployed ${res.installed.length} tenant-matched decoys (${res.tokensUsed} tokens).`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Groq Generation Notice',
        detail: err instanceof Error ? err.message : 'Generation failed.',
        tone: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--bg-base)]">
      {/* Flush Institutional Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink-primary)] leading-tight">
            Canaries &amp; Immutable Vault
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">
            Review decoy objects and verify clean snapshots. Groq can generate additional canaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={handleRefreshCanaries}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[var(--ink-secondary)] ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </button>

          <button
            type="button"
            disabled={generating || quota.cooldownSecondsRemaining > 0}
            onClick={handleGenerateCanaries}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {generating ? 'Synthesizing…' : 'Generate Adaptive Canaries'}
          </button>
        </div>
      </div>

      {/* Flush 4-Cell WORM Vault Telemetry Strip */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-3">
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            <span>WORM Vault Retention</span>
            <Lock className="h-3.5 w-3.5 text-[var(--signal-emerald)]" />
          </div>
          <p className="mt-1.5 font-mono text-[20px] font-semibold text-[var(--ink-primary)] tabular-nums leading-tight">
            {state.vault.retentionMode} · {state.vault.retentionDays}d
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--signal-emerald)] truncate">
            Tenant creds denied · {state.vault.vaultBucket}
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Measured Replication Lag
          </p>
          <p className="mt-1.5 font-mono text-[20px] font-semibold text-[var(--ink-primary)] tabular-nums leading-tight">
            {state.vault.avgReplicationLagMs} ms
          </p>
          <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
            {state.vault.replicationPaused
              ? 'Paused during active incident'
              : 'Recovery point continuously verified'}
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Clean-Version Manifest
          </p>
          <p className="mt-1.5 font-mono text-[20px] font-semibold text-[var(--signal-emerald)] tabular-nums leading-tight">
            {state.vault.manifestIntegrityPct}% SHA-256
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
            {state.vault.manifestCount} snapshots · {formatBytes(state.vault.totalVaultBytes)}
          </p>
        </div>

      </div>

      {/* Full-Width High-Density 34px Canary Inventory Table */}
      <section className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
          <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
            Active Canary Inventory ({state.canaries.length})
          </h2>
          <span className="font-mono text-[13px] text-[var(--ink-muted)]">
            Read trip +45 (P1 watchlist) · Write/Modify/SSE-C/Delete +100 (P0 containment)
          </span>
        </div>

        <div className="overflow-x-auto bg-[var(--bg-base)]">
          <table className="w-full min-w-[780px] text-left text-[13px]">
            <thead>
              <tr className="h-[30px] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                <th className="pl-5 pr-3">Location</th>
                <th className="px-3 text-right">Depth</th>
                <th className="px-3">Type</th>
                <th className="px-3 text-right">Size</th>
                <th className="px-3">Generator</th>
                <th className="px-3">Last Refreshed</th>
                <th className="pl-3 pr-5 text-right">Trips (R / W)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] tabular-nums">
              {state.canaries.map((c) => (
                <tr key={c.id} className="h-[40px] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="pl-5 pr-3 font-mono text-[var(--ink-primary)]">
                    {c.bucket}/{c.key}
                  </td>
                  <td className="px-3 text-right font-mono text-[var(--ink-secondary)]">{c.folderDepth}</td>
                  <td className="px-3 font-mono text-[var(--ink-secondary)]">{c.fileType}</td>
                  <td className="px-3 text-right font-mono text-[var(--ink-secondary)]">
                    {formatBytes(c.sizeBytes)}
                  </td>
                  <td className="px-3 font-mono">
                    <span
                      className={
                        c.generatedBy === 'groq-gpt-oss-120b' ? 'text-[var(--accent-text)]' : 'text-[var(--ink-secondary)]'
                      }
                    >
                      {c.generatedBy}
                    </span>
                  </td>
                  <td className="px-3 font-mono text-[var(--ink-muted)]">
                    {c.lastRefreshedAt.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="pl-3 pr-5 text-right font-mono">
                    <span className={c.writeTrips > 0 ? 'text-[var(--signal-crimson)]' : 'text-[var(--ink-secondary)]'}>
                      {c.readTrips} / {c.writeTrips}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
