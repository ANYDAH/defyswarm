import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  FileUp,
  HardDrive,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';
import type { LiveObjectSummary, TelemetryEvent } from '../shared/types.ts';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type KitTab = 'curl' | 'backblaze' | 'supabase' | 'minio';

export const LiveStorageView: React.FC = () => {
  const { state, role, apiFetch, pushToast, setActivePage } = useConsole();

  const [selectedBucket, setSelectedBucket] = useState('finance-prod');
  const [actingPrincipal, setActingPrincipal] = useState('svc-billing-etl');
  const [customPrincipal, setCustomPrincipal] = useState('');
  const [objects, setObjects] = useState<LiveObjectSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'business' | 'canary' | 'flagged'>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'inspector' | 'cli'>('inspector');
  const [kitTab, setKitTab] = useState<KitTab>('curl');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<{
    httpStatus: number;
    key: string;
    principalId: string;
    entropy?: number;
    magicValid?: boolean;
    signals: string[];
    error?: string;
  } | null>(null);

  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectivePrincipal =
    actingPrincipal === '__custom__'
      ? customPrincipal.trim() || 'custom-cli-client'
      : actingPrincipal;

  const fetchObjects = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch<{ objects: LiveObjectSummary[] }>(
        `/api/storage/objects?bucket=${encodeURIComponent(selectedBucket)}`,
      );
      setObjects(res.objects);
      setSelectedKey((prev) =>
        prev && res.objects.some((o) => o.key === prev) ? prev : (res.objects[0]?.key ?? null),
      );
    } catch (err) {
      pushToast({
        title: 'Could not list bucket objects',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setLoadingList(false);
    }
  }, [apiFetch, pushToast, selectedBucket]);

  useEffect(() => {
    void fetchObjects();
  }, [fetchObjects, state?.events.length]);

  const filteredObjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return objects.filter((o) => {
      if (filterMode === 'business' && o.isCanary) return false;
      if (filterMode === 'canary' && !o.isCanary) return false;
      if (filterMode === 'flagged' && o.magicValid && o.entropy < 7.2) return false;
      if (!q) return true;
      return (
        o.key.toLowerCase().includes(q) ||
        o.principalId.toLowerCase().includes(q) ||
        o.magicDetected.toLowerCase().includes(q)
      );
    });
  }, [objects, searchQuery, filterMode]);

  if (!state) return null;

  const selectedObj = objects.find((o) => o.key === selectedKey) ?? null;
  const actingPrincipalState = state.principals.find((p) => p.id === effectivePrincipal);
  const isPrincipalRevoked =
    actingPrincipalState?.status === 'REVOKED' || actingPrincipalState?.quarantinePolicyAttached;
  const vaultProtectedCount = objects.filter((o) => o.vaultProtected).length;
  const canaryCount = objects.filter((o) => o.isCanary).length;

  const uploadRealFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          pushToast({
            title: `Skipped ${file.name}`,
            detail: 'Exceeds 10 MB per-file upload cap.',
            tone: 'warning',
          });
          continue;
        }
        const buf = await file.arrayBuffer();
        const key = `uploads/${file.name}`;
        const res = await fetch('/api/storage/objects', {
          method: 'POST',
          headers: {
            'x-defyswarm-role': role,
            'x-defyswarm-bucket': selectedBucket,
            'x-defyswarm-key': key,
            'x-defyswarm-principal': effectivePrincipal,
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: buf,
        });
        const data = (await res.json().catch(() => ({}))) as {
          httpStatus?: number;
          error?: string;
          event?: TelemetryEvent;
        };
        setLastVerdict({
          httpStatus: res.status,
          key,
          principalId: effectivePrincipal,
          entropy: data.event?.entropy,
          magicValid: data.event?.magicValid,
          signals: data.event?.signals ?? [],
          error: data.error,
        });

        if (res.status === 403) {
          pushToast({
            title: `HTTP 403 AccessDenied (${effectivePrincipal})`,
            detail: data.error || 'Principal is revoked/quarantined by DefySwarm.',
            tone: 'error',
          });
        } else if (!res.ok) {
          pushToast({
            title: `Upload failed (${res.status})`,
            detail: data.error || file.name,
            tone: 'error',
          });
        } else {
          setSelectedKey(key);
          pushToast({
            title: `Uploaded ${file.name} (HTTP 200)`,
            detail: `Entropy ${data.event?.entropy?.toFixed(2) ?? '—'} · Magic ${data.event?.magicDetected ?? 'OK'} · Streamed to War Room.`,
            tone: (data.event?.signals.length ?? 0) > 0 ? 'warning' : 'success',
          });
        }
      }
      await fetchObjects();
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedObj) return;
    setActionBusy(true);
    try {
      const res = await fetch(
        `/api/storage/objects?bucket=${encodeURIComponent(selectedBucket)}&key=${encodeURIComponent(selectedObj.key)}&principal=${encodeURIComponent(effectivePrincipal)}`,
        {
          method: 'DELETE',
          headers: { 'x-defyswarm-role': role },
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        event?: TelemetryEvent;
      };
      setLastVerdict({
        httpStatus: res.status,
        key: selectedObj.key,
        principalId: effectivePrincipal,
        signals: data.event?.signals ?? [],
        error: data.error,
      });

      if (res.status === 403) {
        pushToast({
          title: `Delete Blocked (HTTP 403)`,
          detail: data.error || 'Principal is revoked.',
          tone: 'error',
        });
      } else if (!res.ok) {
        pushToast({ title: 'Delete failed', detail: data.error, tone: 'error' });
      } else {
        pushToast({
          title: `Deleted ${selectedObj.key}`,
          detail: `Delete marker recorded under ${effectivePrincipal}; clean copy remains in WORM vault.`,
          tone: 'info',
        });
      }
      await fetchObjects();
    } finally {
      setActionBusy(false);
    }
  };

  const handleTogglePrincipalStatus = async (targetStatus: 'ACTIVE' | 'REVOKED') => {
    setActionBusy(true);
    try {
      await apiFetch(`/api/principals/${encodeURIComponent(effectivePrincipal)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: targetStatus }),
      });
      pushToast({
        title: `Principal ${effectivePrincipal} → ${targetStatus}`,
        detail:
          targetStatus === 'ACTIVE'
            ? 'Access restored; live uploads will succeed again.'
            : 'Principal revoked; live uploads will now return HTTP 403.',
        tone: targetStatus === 'ACTIVE' ? 'success' : 'warning',
      });
    } catch (err) {
      pushToast({
        title: 'Status update failed',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePollNow = async () => {
    setActionBusy(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/ingest/poll-now', { method: 'POST' });
      pushToast({ title: 'S3 Sync Complete', detail: res.message, tone: 'info' });
      await fetchObjects();
    } catch (err) {
      pushToast({
        title: 'Sync failed',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRevealToken = async () => {
    try {
      const res = await apiFetch<{ token: string }>('/api/settings/ingest/reveal', {
        method: 'POST',
      });
      setRevealedToken(res.token);
    } catch (err) {
      pushToast({
        title: 'Admin role required',
        detail: err instanceof Error ? err.message : 'Switch to Admin to reveal token.',
        tone: 'error',
      });
    }
  };

  const copySnippet = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const displayToken = revealedToken ?? '<CLICK_REVEAL_TOKEN_ABOVE>';

  const curlUploadCmd = `curl -i -X POST "${baseUrl}/api/storage/objects" \\
  -H "X-DefySwarm-Token: ${displayToken}" \\
  -H "X-DefySwarm-Bucket: ${selectedBucket}" \\
  -H "X-DefySwarm-Key: uploads/real_report.pdf" \\
  -H "X-DefySwarm-Principal: ${effectivePrincipal}" \\
  -H "Content-Type: application/pdf" \\
  --data-binary @./real_report.pdf`;

  const curlWebhookCmd = `curl -i -X POST "${baseUrl}/api/ingest/s3-event" \\
  -H "X-DefySwarm-Token: ${displayToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"Records":[{"eventName":"s3:ObjectCreated:Put","userIdentity":{"principalId":"${effectivePrincipal}"},"s3":{"bucket":{"name":"${selectedBucket}"},"object":{"key":"finance/2026/Q3/live_webhook_test.csv","size":4096}}}]}'`;

  const minioDockerCmd = `# 1. Start 100% free open-source MinIO locally (no card, $0 forever)
docker run -d --name defyswarm-minio \\
  -p 9000:9000 -p 9001:9001 \\
  -e MINIO_ROOT_USER=minioadmin \\
  -e MINIO_ROOT_PASSWORD=minioadmin \\
  quay.io/minio/minio server /data --console-address ":9001"

# 2. Configure MinIO webhook pointing to DefySwarm
mc alias set local http://localhost:9000 minioadmin minioadmin
mc admin config set local notify_webhook:defyswarm \\
  endpoint="${baseUrl}/api/ingest/s3-event" \\
  auth_token="${displayToken}"
mc admin service restart local
mc event add local/${selectedBucket} arn:minio:sqs::defyswarm:webhook --event put,get,delete`;

  return (
    <div className="flex flex-col min-h-full bg-[var(--bg-base)]">
      {/* Flush Institutional Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink-primary)] leading-tight">
            Storage
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">
            Browse your connected bucket and inspect file activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedBucket}
            onChange={(e) => setSelectedBucket(e.target.value)}
            aria-label="Select bucket"
            className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
          >
            {state.buckets.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={actingPrincipal}
            onChange={(e) => setActingPrincipal(e.target.value)}
            aria-label="Select acting principal"
            className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
          >
            {state.principals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} ({p.status})
              </option>
            ))}
            <option value="__custom__">+ Custom principal…</option>
          </select>

          {actingPrincipal === '__custom__' && (
            <input
              type="text"
              value={customPrincipal}
              onChange={(e) => setCustomPrincipal(e.target.value)}
              placeholder="e.g. svc-invoice-bot"
              className="h-[30px] w-40 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
            />
          )}

          {state.storage.minioConnected && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={handlePollNow}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[var(--ink-secondary)] ${actionBusy ? 'animate-spin' : ''}`} />
              Sync bucket
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadRealFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileUp className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : 'Upload files'}
          </button>
        </div>
      </div>

      {/* Flush 4-Cell Live Storage Posture Strip */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-4">
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            <span>Active Storage Backend</span>
            <HardDrive className="h-3.5 w-3.5 text-[var(--accent-text)]" />
          </div>
          <p className="mt-1.5 font-mono text-[16px] font-semibold text-[var(--ink-primary)] truncate">
            {state.storage.minioConnected
              ? `${state.storage.provider} (External)`
              : 'Built-in Live Store'}
          </p>
          <button
            type="button"
            onClick={() => setActivePage('setup')}
            className="mt-1 text-[13px] text-[var(--accent-text)] hover:underline"
          >
            {state.storage.minioConnected
              ? `Poller: ${state.storage.pollingEnabled ? `${state.storage.pollingIntervalSec}s` : 'Manual'} · ${state.storage.apiCallsToday} calls today`
              : 'Connect storage'}
          </button>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Objects in {selectedBucket}
          </p>
          <p className="mt-1.5 font-mono text-[20px] font-semibold text-[var(--ink-primary)] tabular-nums leading-tight">
            {objects.length}
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] tabular-nums">
            {objects.length - canaryCount} business · {canaryCount} active canaries
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            WORM Vault Coverage
          </p>
          <p className="mt-1.5 font-mono text-[20px] font-semibold text-[var(--signal-emerald)] tabular-nums leading-tight">
            {vaultProtectedCount} / {objects.length}
          </p>
          <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)]">
            SHA-256 verified clean snapshots
          </p>
        </div>

        <div className="px-5 py-3.5">
          <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Last Live Verdict
          </p>
          {lastVerdict ? (
            <>
              <p
                className={`mt-1.5 font-mono text-[16px] font-semibold tabular-nums leading-tight ${
                  lastVerdict.httpStatus === 403
                    ? 'text-[var(--signal-crimson)]'
                    : lastVerdict.signals.length > 0
                      ? 'text-[var(--signal-amber)]'
                      : 'text-[var(--signal-emerald)]'
                }`}
              >
                HTTP {lastVerdict.httpStatus} ·{' '}
                {lastVerdict.httpStatus === 403
                  ? 'AccessDenied'
                  : lastVerdict.entropy !== undefined
                    ? `H=${lastVerdict.entropy.toFixed(2)}`
                    : 'OK'}
              </p>
              <p className="mt-1 font-mono text-[13px] text-[var(--ink-secondary)] truncate">
                {lastVerdict.principalId} · {lastVerdict.key}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 font-mono text-[16px] font-semibold text-[var(--ink-secondary)] leading-tight">
                Awaiting live write
              </p>
              <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                Drop a file below or run curl CLI
              </p>
            </>
          )}
        </div>
      </div>

      {/* Main 2-Column Hairline Split Pane */}
      <div className="grid flex-1 grid-cols-1 divide-y divide-[var(--border-hairline)] lg:grid-cols-12 lg:divide-y-0 lg:divide-x">
        {/* Left Pane: Real Dropzone + 34px Object Table */}
        <section className="flex flex-col lg:col-span-7">
          {/* Interactive Drag-and-Drop Strip */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files) void uploadRealFiles(e.dataTransfer.files);
            }}
            className={`flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] px-5 py-3 transition-colors ${
              dragging ? 'bg-[var(--accent-indigo)]/15' : 'bg-[var(--bg-rail)]'
            }`}
          >
            <div className="flex items-center gap-2.5 text-[13px]">
              <FileUp className="h-4 w-4 text-[var(--accent-text)] shrink-0" />
              <div>
                <span className="font-medium text-[var(--ink-primary)]">
                  Drop any real local file here (up to 10 MB)
                </span>
                <span className="ml-2 font-mono text-[13px] text-[var(--ink-secondary)]">
                  acting as <strong className="text-[var(--ink-primary)]">{effectivePrincipal}</strong>
                </span>
                {isPrincipalRevoked && (
                  <span className="ml-2 font-mono text-[13px] font-semibold text-[var(--signal-crimson)]">
                    · REVOKED (next upload returns real HTTP 403)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actingPrincipalState && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() =>
                    handleTogglePrincipalStatus(isPrincipalRevoked ? 'ACTIVE' : 'REVOKED')
                  }
                  className={`inline-flex h-[26px] items-center gap-1 rounded-[5px] border px-2.5 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isPrincipalRevoked
                      ? 'border-[var(--signal-emerald)]/40 bg-[var(--signal-emerald)]/15 text-[var(--signal-emerald)] hover:bg-[var(--signal-emerald)]/20'
                      : 'border-[var(--signal-crimson)]/35 bg-[var(--signal-crimson)]/10 text-[var(--signal-crimson)] hover:bg-[var(--signal-crimson)]/15'
                  }`}
                >
                  {isPrincipalRevoked ? (
                    <>
                      <Unlock className="h-3 w-3" /> Unblock Principal
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> Revoke Now
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2">
            <div className="flex items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'business', label: 'Business' },
                  { id: 'canary', label: 'Canaries' },
                  { id: 'flagged', label: 'High Entropy / Invalid' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    filterMode === tab.id
                      ? 'bg-[var(--border-strong)] text-[var(--ink-primary)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter key, principal, type…"
                className="h-[28px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] pl-8 pr-2.5 text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
              />
            </div>
          </div>

          {/* 34px High-Density Object Table */}
          <div className="flex-1 overflow-x-auto bg-[var(--bg-base)]">
            {loadingList && objects.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-[var(--ink-muted)]">
                Loading objects from {selectedBucket}…
              </div>
            ) : filteredObjects.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-[var(--ink-muted)]">
                No objects match the current filter. Drop a real file above to test live ingestion.
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="h-[30px] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                    <th className="pl-5 pr-3">Object Key</th>
                    <th className="px-3 text-right">Size</th>
                    <th className="px-3 text-right">Entropy (H)</th>
                    <th className="px-3">Magic Header</th>
                    <th className="pl-3 pr-5 text-right">Vault</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] tabular-nums">
                  {filteredObjects.map((obj) => {
                    const selected = obj.key === selectedKey;
                    const highEntropy = obj.entropy >= 7.2;
                    return (
                      <tr
                        key={obj.key}
                        onClick={() => {
                          setSelectedKey(obj.key);
                          setRightTab('inspector');
                        }}
                        className={`h-[40px] cursor-pointer transition-colors ${
                          selected ? 'bg-[var(--accent-indigo)]/15' : 'hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <td className="pl-5 pr-3 font-mono text-[var(--ink-primary)] max-w-[290px] truncate">
                          {obj.key}
                          {obj.isCanary && (
                            <span className="ml-2 text-[13px] font-medium text-[var(--accent-text)]">
                              · CANARY
                            </span>
                          )}
                        </td>
                        <td className="px-3 text-right font-mono text-[var(--ink-secondary)]">
                          {formatBytes(obj.sizeBytes)}
                        </td>
                        <td
                          className={`px-3 text-right font-mono ${
                            highEntropy ? 'text-[var(--signal-crimson)] font-semibold' : 'text-[var(--ink-primary)]'
                          }`}
                        >
                          {obj.entropy > 0 ? obj.entropy.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 font-mono text-[13px]">
                          <span className={obj.magicValid ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-crimson)]'}>
                            {obj.magicValid ? obj.magicDetected : `INVALID (${obj.magicDetected})`}
                          </span>
                        </td>
                        <td className="pl-3 pr-5 text-right font-mono text-[13px]">
                          <span className={obj.vaultProtected ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-amber)]'}>
                            {obj.vaultProtected ? 'WORM OK' : 'None'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Right Pane: Object Inspector + Zero-Card Free CLI & Cloud Setup Kit */}
        <aside className="flex flex-col bg-[var(--bg-pane)] lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-4 py-2">
            <div className="flex items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-0.5">
              <button
                type="button"
                onClick={() => setRightTab('inspector')}
                className={`rounded-[4px] px-3 py-1 text-[13px] font-medium transition-colors whitespace-nowrap ${
                  rightTab === 'inspector'
                    ? 'bg-[var(--border-strong)] text-[var(--ink-primary)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
                }`}
              >
                Object Inspector
              </button>
              <button
                type="button"
                onClick={() => setRightTab('cli')}
                className={`inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1 text-[13px] font-medium transition-colors whitespace-nowrap ${
                  rightTab === 'cli'
                    ? 'bg-[var(--border-strong)] text-[var(--ink-primary)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]'
                }`}
              >
                <Terminal className="h-3 w-3" />
                Connection guides
              </button>
            </div>
          </div>

          {rightTab === 'inspector' ? (
            !selectedObj ? (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[13px] text-[var(--ink-muted)]">
                Select an object to inspect its signature or download the current version or vault copy.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--border-hairline)]">
                <div className="p-5">
                  <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                    Selected Object · {selectedObj.source === 'external-s3' ? 'External S3' : 'Local Real Store'}
                  </p>
                  <p className="mt-1 break-all font-mono text-[13px] font-semibold text-[var(--ink-primary)]">
                    {selectedObj.bucket}/{selectedObj.key}
                  </p>
                  {selectedObj.isCanary && (
                    <p className="mt-1.5 text-[13px] text-[var(--accent-text)]">
                      Adaptive Canary Decoy — writing or deleting this object triggers immediate P0
                      containment (+100 risk).
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-hairline)] pt-3.5 text-[13px] tabular-nums">
                    <div>
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        64 KB Entropy
                      </p>
                      <p
                        className={`mt-0.5 font-mono font-semibold ${
                          selectedObj.entropy >= 7.2 ? 'text-[var(--signal-crimson)]' : 'text-[var(--ink-primary)]'
                        }`}
                      >
                        {selectedObj.entropy > 0 ? `${selectedObj.entropy.toFixed(3)} bits/B` : 'Not sampled'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        Magic Header
                      </p>
                      <p
                        className={`mt-0.5 font-mono font-semibold ${
                          selectedObj.magicValid ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-crimson)]'
                        }`}
                      >
                        {selectedObj.magicValid ? `Valid (${selectedObj.magicDetected})` : 'Header Destroyed'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        Size / Version
                      </p>
                      <p className="mt-0.5 font-mono text-[var(--ink-primary)] truncate">
                        {formatBytes(selectedObj.sizeBytes)} · {selectedObj.versionId.slice(0, 14)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        Last Principal
                      </p>
                      <p className="mt-0.5 font-mono text-[var(--ink-primary)] truncate">
                        {selectedObj.principalId}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[var(--border-hairline)] pt-3">
                    <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Current SHA-256 Digest
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[13px] text-[var(--ink-secondary)]">
                      {selectedObj.sha256 || '—'}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-[var(--border-hairline)] pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        WORM Vault Clean Snapshot
                      </p>
                      <span
                        className={`font-mono text-[13px] font-medium ${
                          selectedObj.vaultProtected ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-amber)]'
                        }`}
                      >
                        {selectedObj.vaultProtected ? 'Verified Immutable' : 'Not Snapshotted'}
                      </span>
                    </div>
                    {selectedObj.vaultSha256 && (
                      <p className="mt-0.5 break-all font-mono text-[13px] text-[var(--ink-muted)]">
                        {selectedObj.vaultSha256}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live File Actions */}
                <div className="space-y-2.5 p-5">
                  <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                    Real Object Actions (Acting as <span className="font-mono text-[var(--ink-primary)]">{effectivePrincipal}</span>)
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`/api/storage/objects/download?bucket=${encodeURIComponent(selectedBucket)}&key=${encodeURIComponent(selectedObj.key)}&fromVault=false`}
                      className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                    >
                      <Download className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
                      Download Current
                    </a>
                    <a
                      href={`/api/storage/objects/download?bucket=${encodeURIComponent(selectedBucket)}&key=${encodeURIComponent(selectedObj.key)}&fromVault=true`}
                      className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-[6px] border border-[var(--signal-emerald)]/35 bg-[var(--signal-emerald)]/10 px-3 text-[13px] font-medium text-[var(--signal-emerald)] hover:bg-[var(--signal-emerald)]/15"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Download Vault Copy
                    </a>
                  </div>

                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={handleDeleteSelected}
                    className="inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-[6px] border border-[var(--signal-crimson)]/35 bg-[var(--signal-crimson)]/10 px-3 text-[13px] font-medium text-[var(--signal-crimson)] hover:bg-[var(--signal-crimson)]/15 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Object as {effectivePrincipal}
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Free Zero-Card CLI & Cloud Integration Kit */
            <div className="flex flex-col divide-y divide-[var(--border-hairline)]">
              {/* Token Bar */}
              <div className="flex items-center justify-between gap-2 bg-[var(--bg-rail)] px-5 py-3 text-[13px]">
                <div className="min-w-0">
                  <span className="text-[var(--ink-muted)]">Ingest Token: </span>
                  <span className="font-mono text-[var(--ink-primary)]">
                    {revealedToken ?? state.ingest.tokenMasked}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRevealToken}
                  className="inline-flex h-[26px] items-center gap-1 rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
                >
                  <Eye className="h-3 w-3 text-[var(--accent-text)]" />
                  {revealedToken ? 'Revealed' : 'Reveal Token'}
                </button>
              </div>

              {/* Zero-Card Kit Sub-Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2">
                {(
                  [
                    { id: 'curl', label: 'curl (Instant)' },
                    { id: 'backblaze', label: 'Backblaze B2 (10GB)' },
                    { id: 'supabase', label: 'Supabase S3 (1GB)' },
                    { id: 'minio', label: 'MinIO Docker ($0)' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setKitTab(t.id)}
                    className={`rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition-colors whitespace-nowrap ${
                      kitTab === t.id
                        ? 'bg-[var(--accent-indigo)]/25 text-[var(--ink-primary)]'
                        : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4 p-5 text-[13px] text-[var(--ink-secondary)]">
                {kitTab === 'curl' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--ink-primary)]">
                          1. Upload any real local file from your terminal
                        </p>
                        <button
                          type="button"
                          onClick={() => copySnippet('curl-put', curlUploadCmd)}
                          className="inline-flex items-center gap-1 font-mono text-[13px] text-[var(--accent-text)] hover:underline"
                        >
                          {copiedId === 'curl-put' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedId === 'curl-put' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="mt-1.5 overflow-x-auto rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-3 font-mono text-[13px] leading-relaxed text-[var(--ink-primary)]">
                        {curlUploadCmd}
                      </pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[var(--ink-primary)]">
                          2. Send a real authenticated S3/MinIO webhook event
                        </p>
                        <button
                          type="button"
                          onClick={() => copySnippet('curl-hook', curlWebhookCmd)}
                          className="inline-flex items-center gap-1 font-mono text-[13px] text-[var(--accent-text)] hover:underline"
                        >
                          {copiedId === 'curl-hook' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedId === 'curl-hook' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="mt-1.5 overflow-x-auto rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-3 font-mono text-[13px] leading-relaxed text-[var(--ink-primary)]">
                        {curlWebhookCmd}
                      </pre>
                    </div>
                  </>
                )}

                {kitTab === 'backblaze' && (
                  <div className="space-y-2.5 leading-relaxed">
                    <p className="font-semibold text-[var(--ink-primary)]">
                      Backblaze B2 · 10 GB Free, No Credit Card Required
                    </p>
                    <ol className="list-decimal space-y-1.5 pl-4">
                      <li>Create a free Backblaze B2 account (no card needed for private buckets).</li>
                      <li>
                        Create two private buckets: e.g. <code className="font-mono text-[var(--ink-primary)]">my-prod-files</code> and{' '}
                        <code className="font-mono text-[var(--ink-primary)]">my-worm-vault</code> (enable Object Lock on vault).
                      </li>
                      <li>
                        Under <strong>Application Keys</strong>, create one key for your prod bucket and an isolated key for your vault bucket.
                      </li>
                      <li>
                        Open <strong>Setup</strong> → select <strong>Backblaze B2</strong>, paste your S3 endpoint (e.g.{' '}
                        <code className="font-mono text-[var(--ink-primary)]">https://s3.us-west-004.backblazeb2.com</code>), and enable the <strong>60s Quota-Safe Poller</strong>.
                      </li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => setActivePage('setup')}
                      className="mt-2 inline-flex h-[30px] items-center rounded-[6px] bg-[var(--accent-indigo)] px-3 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
                    >
                      Configure Backblaze B2 in Setup →
                    </button>
                  </div>
                )}

                {kitTab === 'supabase' && (
                  <div className="space-y-2.5 leading-relaxed">
                    <p className="font-semibold text-[var(--ink-primary)]">
                      Supabase Storage S3 · 1 GB Free, No Credit Card Required
                    </p>
                    <ol className="list-decimal space-y-1.5 pl-4">
                      <li>Sign up at Supabase (free tier, no credit card) and create a project.</li>
                      <li>
                        Create a private Storage bucket (e.g. <code className="font-mono text-[var(--ink-primary)]">finance-prod</code>).
                      </li>
                      <li>
                        Go to <strong>Project Settings → Storage → S3 Access Keys</strong> and generate an Access Key ID + Secret.
                      </li>
                      <li>
                        Open <strong>Setup</strong> → select <strong>Supabase Storage S3</strong>, paste{' '}
                        <code className="font-mono text-[var(--ink-primary)]">https://&lt;project-ref&gt;.supabase.co/storage/v1/s3</code>, and click <strong>Verify &amp; Connect</strong>.
                      </li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => setActivePage('setup')}
                      className="mt-2 inline-flex h-[30px] items-center rounded-[6px] bg-[var(--accent-indigo)] px-3 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
                    >
                      Configure Supabase S3 in Setup →
                    </button>
                  </div>
                )}

                {kitTab === 'minio' && (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-[var(--ink-primary)]">
                        Self-Hosted MinIO (Open Source · $0 Forever)
                      </p>
                      <button
                        type="button"
                        onClick={() => copySnippet('minio-docker', minioDockerCmd)}
                        className="inline-flex items-center gap-1 font-mono text-[13px] text-[var(--accent-text)] hover:underline"
                      >
                        {copiedId === 'minio-docker' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedId === 'minio-docker' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="mt-1.5 overflow-x-auto rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] p-3 font-mono text-[13px] leading-relaxed text-[var(--ink-primary)]">
                      {minioDockerCmd}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
