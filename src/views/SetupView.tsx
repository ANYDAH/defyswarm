import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';
import type { AutoHardenResult, StorageProviderPreset } from '../shared/types.ts';

const PROVIDER_PRESETS: Record<
  StorageProviderPreset,
  {
    label: string;
    tierNote: string;
    endpoint: string;
    region: string;
    forcePathStyle: boolean;
  }
> = {
  local: {
    label: 'Built-in Live Store',
    tierNote: '$0 · Zero accounts · Real binary uploads & HTTP 403',
    endpoint: '',
    region: 'us-east-1',
    forcePathStyle: true,
  },
  'backblaze-b2': {
    label: 'Backblaze B2',
    tierNote: '10 GB Free · Private S3 + Object Lock · No Card',
    endpoint: 'https://s3.us-west-004.backblazeb2.com',
    region: 'us-west-004',
    forcePathStyle: false,
  },
  'supabase-s3': {
    label: 'Supabase Storage S3',
    tierNote: '1 GB Free + 5 GB Egress · Built-in S3 · No Card',
    endpoint: 'https://<project-ref>.supabase.co/storage/v1/s3',
    region: 'us-east-1',
    forcePathStyle: true,
  },
  minio: {
    label: 'Self-Hosted MinIO',
    tierNote: '$0 Forever · Docker S3 + Native Webhooks & WORM',
    endpoint: 'https://minio.yourdomain.com:9000',
    region: 'us-east-1',
    forcePathStyle: true,
  },
  'custom-s3': {
    label: 'Custom S3',
    tierNote: 'Any S3-compatible HTTPS endpoint',
    endpoint: 'https://s3.example.com',
    region: 'us-east-1',
    forcePathStyle: true,
  },
};

export const SetupView: React.FC = () => {
  const { state, apiFetch, pushToast, requestConfirm } = useConsole();

  // Groq BYOK state
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium'>('low');
  const [batchSize, setBatchSize] = useState(6);
  const [groqBusy, setGroqBusy] = useState(false);

  // Zero-Card Storage Adapter + Quota-Safe Poller state
  const [settingsSection, setSettingsSection] = useState('storage');
  const [provider, setProvider] = useState<StorageProviderPreset>('local');
  const [s3Endpoint, setS3Endpoint] = useState('https://s3.us-west-004.backblazeb2.com');
  const [s3Region, setS3Region] = useState('us-west-004');
  const [forcePathStyle, setForcePathStyle] = useState(false);
  const [productionBucket, setProductionBucket] = useState('finance-prod');
  const [vaultBucket, setVaultBucket] = useState('');
  const [monitorAccessKeyId, setMonitorAccessKeyId] = useState('');
  const [monitorSecretAccessKey, setMonitorSecretAccessKey] = useState('');
  const [vaultAccessKeyId, setVaultAccessKeyId] = useState('');
  const [vaultSecretAccessKey, setVaultSecretAccessKey] = useState('');
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [pollingIntervalSec, setPollingIntervalSec] = useState(60);
  const [storageBusy, setStorageBusy] = useState(false);
  const [pollBusy, setPollBusy] = useState(false);

  // Authenticated Ingest & Signed Containment Webhook state
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [ingestBusy, setIngestBusy] = useState(false);
  const [containmentUrl, setContainmentUrl] = useState('');
  const [containmentEnabled, setContainmentEnabled] = useState(false);

  // Bucket registration & Auto-Harden
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketSensitivity, setNewBucketSensitivity] = useState<'critical' | 'sandbox'>(
    'critical',
  );
  const [newBucketSimOnly, setNewBucketSimOnly] = useState(true);
  const [hardenResults, setHardenResults] = useState<Record<string, AutoHardenResult>>({});

  // Allowlist state
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newKmsKey, setNewKmsKey] = useState('');

  // policies.yaml editor
  const [yamlDraft, setYamlDraft] = useState('');
  const [yamlErrors, setYamlErrors] = useState<string[]>([]);
  const [savingYaml, setSavingYaml] = useState(false);

  // Free Alert destinations
  const [ntfyTopic, setNtfyTopic] = useState('');
  const [discordUrl, setDiscordUrl] = useState('');
  const [slackUrl, setSlackUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setYamlDraft(state.policyYaml);
  }, [state?.policyYaml]);

  useEffect(() => {
    if (!state) return;
    setReasoningEffort(state.groq.reasoningEffort);
    setBatchSize(state.groq.canaryBatchSize);
  }, [state?.groq.reasoningEffort, state?.groq.canaryBatchSize]);

  useEffect(() => {
    if (!state) return;
    setProvider(state.storage.provider || 'local');
    setS3Endpoint(state.storage.minioEndpoint || PROVIDER_PRESETS['backblaze-b2'].endpoint);
    setS3Region(state.storage.minioRegion || 'us-west-004');
    setForcePathStyle(Boolean(state.storage.forcePathStyle));
    setProductionBucket(state.storage.productionBucket || 'finance-prod');
    setVaultBucket(state.storage.vaultBucket || '');
    setPollingEnabled(Boolean(state.storage.pollingEnabled));
    setPollingIntervalSec(state.storage.pollingIntervalSec || 60);

  }, [
    state?.storage.provider, state?.storage.minioEndpoint, state?.storage.minioRegion,
    state?.storage.forcePathStyle, state?.storage.productionBucket, state?.storage.vaultBucket,
    state?.storage.pollingEnabled, state?.storage.pollingIntervalSec,
  ]);

  useEffect(() => {
    if (!state) return;
    if (state.ingest) {
      setContainmentUrl(state.ingest.containmentWebhookUrl || '');
      setContainmentEnabled(Boolean(state.ingest.containmentWebhookEnabled));
    }

  }, [state?.ingest?.containmentWebhookUrl, state?.ingest?.containmentWebhookEnabled]);

  useEffect(() => {
    if (!state) return;
    setNtfyTopic(state.alerts.ntfyTopic || '');
    setDiscordUrl(state.alerts.discordWebhookUrl || '');
    setSlackUrl(state.alerts.slackWebhookUrl || '');
    setWebhookUrl(state.alerts.webhookUrl || '');
    setAlertsEnabled(Boolean(state.alerts.enabled));
  }, [state?.alerts.ntfyTopic, state?.alerts.discordWebhookUrl, state?.alerts.slackWebhookUrl,
    state?.alerts.webhookUrl, state?.alerts.enabled]);

  if (!state) return null;

  const webhookEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/ingest/s3-event`
      : 'http://localhost:3000/api/ingest/s3-event';

  const copyText = (text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      pushToast({ title: `${label} copied`, tone: 'info' });
    });
  };

  const selectProviderPreset = (next: StorageProviderPreset) => {
    setProvider(next);
    if (next !== 'local') {
      const preset = PROVIDER_PRESETS[next];
      setS3Endpoint(preset.endpoint);
      setS3Region(preset.region);
      setForcePathStyle(preset.forcePathStyle);
    }
  };

  const handleModeToggle = (targetMode: 'active' | 'dry-run') => {
    if (targetMode === state.policy.mode) return;
    if (targetMode === 'active') {
      requestConfirm({
        title: 'Switch to Active Containment Mode?',
        message:
          'In Active mode, DefySwarm automatically revokes compromised credentials and attaches deny-all quarantine policies on P0 triggers and swarm alerts.',
        confirmLabel: 'Enable Active Mode',
        destructive: true,
        onConfirm: async () => {
          await apiFetch('/api/policy/mode', {
            method: 'POST',
            body: JSON.stringify({ mode: 'active' }),
          });
          pushToast({
            title: 'Active Mode Enabled',
            detail: 'Automatic credential revocation and quarantine enforcement active.',
            tone: 'success',
          });
        },
      });
    } else {
      void apiFetch('/api/policy/mode', {
        method: 'POST',
        body: JSON.stringify({ mode: 'dry-run' }),
      })
        .then(() =>
          pushToast({
            title: 'Dry-Run (Shadow) Mode Enabled',
            detail: 'Containment actions will be logged without revoking keys.',
            tone: 'warning',
          }),
        )
        .catch((err) =>
          pushToast({
            title: 'Permission denied',
            detail: err instanceof Error ? err.message : 'Admin role required.',
            tone: 'error',
          }),
        );
    }
  };

  const saveGroqSettings = async (clearKey = false) => {
    setGroqBusy(true);
    try {
      await apiFetch('/api/settings/llm', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: clearKey ? undefined : groqKeyInput.trim() || undefined,
          clearKey,
          reasoningEffort,
          canaryBatchSize: batchSize,
          onboardingCompleted: true,
        }),
      });
      setGroqKeyInput('');
      pushToast({
        title: clearKey ? 'Groq BYOK Key Cleared' : 'Groq Settings Saved',
        detail: clearKey
          ? 'Removed the saved key.'
          : `Model ${state.groq.model} · reasoning=${reasoningEffort} · batch=${batchSize}.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Could not save Groq settings',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setGroqBusy(false);
    }
  };

  const testGroqConnection = async () => {
    setGroqBusy(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/settings/llm/test', {
        method: 'POST',
        body: JSON.stringify({ apiKey: groqKeyInput.trim() || undefined }),
      });
      pushToast({
        title: 'Groq Connection Verified',
        detail: res.message,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Groq Verification Failed',
        detail: err instanceof Error ? err.message : 'Connection failed.',
        tone: 'error',
      });
    } finally {
      setGroqBusy(false);
    }
  };

  const handleSaveStorage = async (clearCreds = false) => {
    if (!clearCreds && provider !== 'local') {
      const monitorId = Boolean(monitorAccessKeyId.trim());
      const monitorSecret = Boolean(monitorSecretAccessKey.trim());
      const vaultId = Boolean(vaultAccessKeyId.trim());
      const vaultSecret = Boolean(vaultSecretAccessKey.trim());
      let missing = '';
      if (monitorId !== monitorSecret || (!state.storage.minioMonitorConfigured && !monitorId)) {
        missing = monitorId ? 'Monitor Secret Access Key' : 'Monitor Access Key ID and its matching Monitor Secret Access Key';
      } else if (vaultId !== vaultSecret || (vaultBucket.trim() && !state.storage.minioVaultConfigured && !vaultId)) {
        missing = vaultId ? 'Isolated Vault Secret Key' : 'Isolated Vault Key ID and its matching Isolated Vault Secret Key';
      }
      if (missing) {
        pushToast({ title: 'Complete the key pair', detail: `Enter ${missing}, then verify again.`, tone: 'warning' });
        return;
      }
    }
    setStorageBusy(true);
    try {
      const res = await apiFetch<{
        storage: { minioConnected: boolean; lastConnectionMessage?: string };
      }>('/api/settings/storage', {
        method: 'POST',
        body: JSON.stringify({
          activeAdapter: provider === 'local' ? 'local' : 'minio',
          provider,
          minioEndpoint: provider === 'local' ? undefined : s3Endpoint.trim(),
          minioRegion: s3Region.trim() || 'us-east-1',
          forcePathStyle,
          productionBucket: productionBucket.trim() || 'finance-prod',
          vaultBucket: vaultBucket.trim(),
          monitorAccessKeyId: clearCreds ? undefined : monitorAccessKeyId.trim() || undefined,
          monitorSecretAccessKey: clearCreds ? undefined : monitorSecretAccessKey.trim() || undefined,
          vaultAccessKeyId: clearCreds ? undefined : vaultAccessKeyId.trim() || undefined,
          vaultSecretAccessKey: clearCreds ? undefined : vaultSecretAccessKey.trim() || undefined,
          clearMonitorCreds: clearCreds,
          clearVaultCreds: clearCreds,
          pollingEnabled: provider === 'local' ? false : pollingEnabled,
          pollingIntervalSec,
        }),
      });
      if (clearCreds || res.storage.minioConnected || provider === 'local') {
        setMonitorAccessKeyId('');
        setMonitorSecretAccessKey('');
        setVaultAccessKeyId('');
        setVaultSecretAccessKey('');
      }
      pushToast({
        title: clearCreds
          ? 'Saved credentials removed'
          : res.storage.minioConnected || provider === 'local'
            ? 'Storage Adapter Verified'
            : 'Connection Failed — Fallback Active',
        detail: res.storage.lastConnectionMessage,
        tone: res.storage.minioConnected || provider === 'local' ? 'success' : 'warning',
      });
    } catch (err) {
      pushToast({
        title: 'Storage update failed',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setStorageBusy(false);
    }
  };

  const handlePollNow = async () => {
    setPollBusy(true);
    try {
      const res = await apiFetch<{ changedCount: number; apiCallsToday: number }>(
        '/api/ingest/poll-now',
        { method: 'POST' },
      );
      pushToast({
        title: 'External S3 Sync Complete',
        detail: `${res.changedCount} changed object(s) inspected · ${res.apiCallsToday} API calls today.`,
        tone: res.changedCount > 0 ? 'warning' : 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Sync failed',
        detail: err instanceof Error ? err.message : 'Connect an external S3 bucket first.',
        tone: 'error',
      });
    } finally {
      setPollBusy(false);
    }
  };

  const handleRevealToken = async () => {
    if (revealedToken) {
      setRevealedToken(null);
      return;
    }
    setIngestBusy(true);
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
    } finally {
      setIngestBusy(false);
    }
  };

  const handleRotateToken = async () => {
    setIngestBusy(true);
    try {
      const res = await apiFetch<{ token: string }>('/api/settings/ingest/rotate', {
        method: 'POST',
      });
      setRevealedToken(res.token);
      pushToast({
        title: 'Ingest Token Rotated',
        detail: 'Update your MinIO webhook and CLI scripts with the new secret.',
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Rotate failed',
        detail: err instanceof Error ? err.message : 'Admin role required.',
        tone: 'error',
      });
    } finally {
      setIngestBusy(false);
    }
  };

  const handleTestWebhook = async () => {
    setIngestBusy(true);
    try {
      const res = await apiFetch<{ processed: number }>('/api/settings/ingest/test', {
        method: 'POST',
        body: JSON.stringify({ bucket: productionBucket || 'finance-prod' }),
      });
      pushToast({
        title: 'Webhook Pipeline Verified',
        detail: `Processed ${res.processed} synthetic S3:ObjectCreated event into Live War Room.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Webhook self-test failed',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setIngestBusy(false);
    }
  };

  const handleSaveContainment = async () => {
    setIngestBusy(true);
    try {
      await apiFetch('/api/settings/containment', {
        method: 'POST',
        body: JSON.stringify({
          containmentWebhookUrl: containmentUrl.trim(),
          containmentWebhookEnabled: containmentEnabled,
        }),
      });
      pushToast({
        title: 'Signed Containment Webhook Saved',
        detail: containmentEnabled
          ? 'P0 revocations will dispatch HMAC-SHA256 signed actions.'
          : 'Saved in disabled state.',
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Containment URL rejected',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setIngestBusy(false);
    }
  };

  const handleRegisterBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    try {
      await apiFetch('/api/buckets', {
        method: 'POST',
        body: JSON.stringify({
          name: newBucketName.trim(),
          sensitivity: newBucketSensitivity,
          simOnly: newBucketSimOnly,
          vault: 'vault-finance',
        }),
      });
      setNewBucketName('');
      pushToast({
        title: 'Bucket Registered',
        detail: `Added ${newBucketName.trim()} to policies.yaml.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Could not register bucket',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    }
  };

  const handleAutoHarden = async (bucketName: string) => {
    try {
      const res = await apiFetch<AutoHardenResult>(`/api/buckets/${bucketName}/harden`, {
        method: 'POST',
      });
      setHardenResults((prev) => ({ ...prev, [bucketName]: res }));
      pushToast({
        title: `Auto-Harden: ${bucketName}`,
        detail: res.allPassed
          ? 'All 4 posture checks passed (Versioning, WORM Vault, Audit, Canaries).'
          : 'Some checks require attention.',
        tone: res.allPassed ? 'success' : 'warning',
      });
    } catch (err) {
      pushToast({
        title: 'Auto-Harden failed',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    }
  };

  const updateAllowlist = async (principals: string[], kmsKeys: string[]) => {
    try {
      await apiFetch('/api/policy/allowlist', {
        method: 'POST',
        body: JSON.stringify({ principals, kmsKeys }),
      });
      pushToast({ title: 'Allowlist Updated', tone: 'success' });
    } catch (err) {
      pushToast({
        title: 'Allowlist update denied',
        detail: err instanceof Error ? err.message : 'Admin role required.',
        tone: 'error',
      });
    }
  };

  const handleSavePolicyYaml = async () => {
    setSavingYaml(true);
    setYamlErrors([]);
    try {
      await apiFetch('/api/policy', {
        method: 'PUT',
        body: JSON.stringify({ yaml: yamlDraft }),
      });
      pushToast({
        title: 'policies.yaml Validated & Saved',
        detail: 'Strict schema check passed with 0 unknown keys.',
        tone: 'success',
      });
    } catch (err) {
      const details = (err as Error & { details?: string[] }).details;
      setYamlErrors(
        details && details.length > 0
          ? details
          : [err instanceof Error ? err.message : 'Invalid YAML'],
      );
    } finally {
      setSavingYaml(false);
    }
  };

  const handleSaveAlerts = async () => {
    setAlertBusy(true);
    try {
      await apiFetch('/api/settings/alerts', {
        method: 'POST',
        body: JSON.stringify({
          ntfyTopic: ntfyTopic.trim(),
          discordWebhookUrl: discordUrl.trim(),
          slackWebhookUrl: slackUrl.trim(),
          webhookUrl: webhookUrl.trim(),
          enabled: alertsEnabled,
        }),
      });
      pushToast({
        title: 'Zero-Card Alert Channels Saved',
        detail: alertsEnabled ? 'Outbound P0 alerts armed.' : 'Saved in disabled state.',
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Alert configuration rejected',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setAlertBusy(false);
    }
  };

  const handleSendTestAlert = async () => {
    setAlertBusy(true);
    try {
      const res = await apiFetch<{ delivered: number; channels: string[] }>(
        '/api/settings/alerts/test',
        { method: 'POST' },
      );
      pushToast({
        title: `Test Alert Sent (${res.delivered})`,
        detail: `Delivered to: ${res.channels.join(', ')}.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Test Alert Failed',
        detail: err instanceof Error ? err.message : 'Save an ntfy topic or webhook URL first.',
        tone: 'error',
      });
    } finally {
      setAlertBusy(false);
    }
  };

  const q = state.groq.quota;
  const activePresetMeta = PROVIDER_PRESETS[provider];

  return (
    <div className="settings-page flex flex-col min-h-full bg-[var(--bg-base)]" data-settings-section={settingsSection}>
      {/* Flush Institutional Sub-Header + Dry-Run / Active Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink-primary)] leading-tight">
            Settings
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">
            Manage your storage connections, credentials, and security policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
            Enforcement
          </span>
          <div className="flex items-center rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-0.5">
            <button
              type="button"
              onClick={() => handleModeToggle('dry-run')}
              className={`rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                state.policy.mode === 'dry-run'
                  ? 'bg-[var(--signal-amber)]/20 text-[var(--signal-amber)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              Dry-Run (Shadow)
            </button>
            <button
              type="button"
              onClick={() => handleModeToggle('active')}
              className={`rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                state.policy.mode === 'active'
                  ? 'bg-[var(--signal-emerald)]/20 text-[var(--signal-emerald)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              Active Containment
            </button>
          </div>
        </div>
      </div>

      <nav className="settings-navigation" aria-label="Settings sections">
        {[['storage', 'Storage'], ['ai', 'AI provider'], ['events', 'Events & alerts'], ['policy', 'Policy & access']].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={settingsSection === id} onClick={() => setSettingsSection(id)}>{label}</button>
        ))}
      </nav>

      {/* Section 1: Groq BYOK Settings Workbench */}
      <section data-setting-group="ai" className="border-b border-[var(--border-hairline)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
              AI provider · Groq (<span className="font-mono">{state.groq.model}</span>)
            </h2>
            <span className="hidden text-[13px] text-[var(--ink-muted)] md:inline">
              · Keys saved privately on this Mac
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[13px]">
            <span className={state.groq.configured ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-amber)]'}>
              {state.groq.configured
                ? `Connected (${state.groq.source.toUpperCase()} · ${state.groq.maskedKey})`
                : 'Not Configured'}
            </span>
            {q.cooldownSecondsRemaining > 0 && (
              <span className="text-[var(--signal-amber)]">Cooldown: {q.cooldownSecondsRemaining}s</span>
            )}
          </div>
        </div>

        {/* Flush 4-Cell Free-Tier Quota Telemetry Bar */}
        <div className="grid grid-cols-2 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] sm:grid-cols-4 sm:divide-y-0 sm:divide-x tabular-nums">
          {[
            { label: 'RPM (60s)', used: q.rpmUsed, limit: q.rpmLimit },
            { label: 'TPM (60s)', used: q.tpmUsed, limit: q.tpmLimit },
            { label: 'RPD (24h)', used: q.rpdUsed, limit: q.rpdLimit },
            { label: 'TPD (24h)', used: q.tpdUsed, limit: q.tpdLimit },
          ].map((m) => {
            const pct = Math.min(100, Math.round((m.used / m.limit) * 100));
            return (
              <div key={m.label} className="px-5 py-3">
                <div className="flex items-center justify-between text-[13px] text-[var(--ink-muted)]">
                  <span className="uppercase tracking-[0.04em]">{m.label}</span>
                  <span className="font-mono">{pct}%</span>
                </div>
                <p className="mt-1 font-mono text-[13px] font-medium text-[var(--ink-primary)]">
                  {m.used.toLocaleString()} / {m.limit.toLocaleString()}
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-[2px] bg-[var(--bg-hover)]">
                  <div
                    className={`h-full ${
                      pct > 80 ? 'bg-[var(--signal-crimson)]' : pct > 55 ? 'bg-[var(--signal-amber)]' : 'bg-[var(--accent-indigo)]'
                    }`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls Row */}
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label
                htmlFor="setup-groq-key"
                className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]"
              >
                Groq API Key (Set or Rotate)
              </label>
              <div className="relative mt-1.5">
                <input
                  id="setup-groq-key"
                  type="password"
                  autoComplete="off"
                  value={groqKeyInput}
                  onChange={(e) => setGroqKeyInput(e.target.value)}
                  placeholder={
                    state.groq.configured ? '•••••••• (enter new key to rotate)' : 'gsk_...'
                  }
                  className="h-[32px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-3 pr-8 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
                <Lock className="pointer-events-none absolute right-2.5 top-2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="groq-reasoning"
                className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]"
              >
                Reasoning Effort (TPM Guard)
              </label>
              <select
                id="groq-reasoning"
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value as 'low' | 'medium')}
                className="mt-1.5 h-[32px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
              >
                <option value="low">Low (Recommended · 8K TPM)</option>
                <option value="medium">Medium (Higher Token Use)</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="groq-batch"
                className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]"
              >
                Canary Batch Size (3–8)
              </label>
              <input
                id="groq-batch"
                type="number"
                min={3}
                max={8}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="mt-1.5 h-[32px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-3 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {state.groq.configured && state.groq.source === 'byok' && (
              <button
                type="button"
                disabled={groqBusy}
                onClick={() => saveGroqSettings(true)}
                className="h-[30px] rounded-[6px] border border-[var(--signal-crimson)]/35 px-3 text-[13px] font-medium text-[var(--signal-crimson)] hover:bg-[var(--signal-crimson)]/10 transition-colors"
              >
                Clear Key
              </button>
            )}
            <button
              type="button"
              disabled={groqBusy}
              onClick={testGroqConnection}
              className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Test Connection
            </button>
            <button
              type="button"
              disabled={groqBusy}
              onClick={() => saveGroqSettings(false)}
              className="h-[30px] rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors"
            >
              Save Groq Config
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: 2-Column Hairline Split — Buckets & Auto-Harden | Zero-Card S3 Storage Connector */}
      <div data-setting-group="storage" className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] lg:grid-cols-12 lg:divide-y-0 lg:divide-x">
        {/* Monitored Buckets & Auto-Harden */}
        <section className="flex flex-col lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
            <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
              Monitored Buckets &amp; Auto-Harden ({state.buckets.length})
            </h2>
            <span className="text-[13px] text-[var(--ink-muted)]">
              Versioning · WORM Vault · Audit · Canaries
            </span>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            {state.buckets.map((b) => {
              const hr = hardenResults[b.name];
              return (
                <div key={b.name} className="px-5 py-3.5 hover:bg-[var(--bg-pane)]/40 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-[13px] font-semibold text-[var(--ink-primary)]">
                          {b.name}
                        </span>
                        <span className="font-mono text-[13px] text-[var(--ink-secondary)]">
                          · sensitivity={b.tags.sensitivity} · env={b.tags.env}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
                        vault={b.vault} · {b.objectCount} objects · {b.canaryCount} canaries
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutoHarden(b.name)}
                      className="inline-flex h-[28px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[var(--signal-emerald)]" />
                      Auto-Harden
                    </button>
                  </div>

                  {hr && (
                    <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[var(--border-hairline)] pt-2.5 sm:grid-cols-2">
                      {hr.checks.map((chk) => (
                        <div key={chk.id} className="flex items-start gap-2 text-[13px]">
                          {chk.passed ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--signal-emerald)]" />
                          ) : (
                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--signal-crimson)]" />
                          )}
                          <div>
                            <p className="font-medium text-[var(--ink-primary)]">{chk.label}</p>
                            <p className="text-[var(--ink-secondary)]">{chk.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Register New Bucket Strip */}
          <form
            onSubmit={handleRegisterBucket}
            className="mt-auto flex flex-wrap items-end gap-2.5 border-t border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3.5"
          >
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Register Bucket
              </label>
              <input
                type="text"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="e.g. payroll-staging"
                className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Sensitivity
              </label>
              <select
                value={newBucketSensitivity}
                onChange={(e) => setNewBucketSensitivity(e.target.value as 'critical' | 'sandbox')}
                className="mt-1 h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-2.5 text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
              >
                <option value="critical">critical (auto-revoke)</option>
                <option value="sandbox">sandbox (alert-only)</option>
              </select>
            </div>
            <label className="flex h-[30px] items-center gap-1.5 text-[13px] text-[var(--ink-secondary)]">
              <input
                type="checkbox"
                checked={newBucketSimOnly}
                onChange={(e) => setNewBucketSimOnly(e.target.checked)}
                className="accent-[var(--accent-indigo)]"
              />
              sim-only tag
            </label>
            <button
              type="submit"
              className="inline-flex h-[30px] items-center gap-1 rounded-[6px] bg-[var(--accent-indigo)] px-3 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </form>
        </section>

        {/* Zero-Card S3 Storage Connector & Quota-Safe Poller */}
        <section className="flex flex-col lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                Storage connection
              </h2>
            </div>
            <span
              className={`font-mono text-[13px] uppercase ${
                state.storage.minioConnected || state.storage.provider === 'local'
                  ? 'text-[var(--signal-emerald)]'
                  : 'text-[var(--signal-amber)]'
              }`}
            >
              {state.storage.provider} · {state.storage.minioConnected ? 'Connected' : 'Local'}
            </span>
          </div>

          <div className="space-y-3.5 p-5">
            <p className="text-[13px] text-[var(--ink-secondary)]">{state.storage.lastConnectionMessage}</p>

            {/* Zero-Card Preset Bar */}
            <div>
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Storage provider
              </label>
              <select aria-label="Storage provider" value={provider}
                onChange={event => selectProviderPreset(event.target.value as StorageProviderPreset)}
                className="mt-1.5 h-[36px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-3 text-[13px]">
                {(Object.keys(PROVIDER_PRESETS) as StorageProviderPreset[]).map(key => (
                  <option key={key} value={key}>{PROVIDER_PRESETS[key].label}</option>
                ))}
              </select>
            </div>

            {provider !== 'local' && (
              <div className="space-y-3 border-t border-[var(--border-hairline)] pt-3.5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      S3 Endpoint URL (HTTPS)
                    </label>
                    <input
                      type="url"
                      value={s3Endpoint}
                      onChange={(e) => setS3Endpoint(e.target.value)}
                      placeholder={activePresetMeta.endpoint}
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Region
                    </label>
                    <input
                      type="text"
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      placeholder="us-west-004"
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Production Bucket Name
                    </label>
                    <input
                      type="text"
                      value={productionBucket}
                      onChange={(e) => setProductionBucket(e.target.value)}
                      placeholder="my-b2-or-supabase-bucket"
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      WORM Vault Bucket (Optional)
                    </label>
                    <input
                      type="text"
                      value={vaultBucket}
                      onChange={(e) => setVaultBucket(e.target.value)}
                      placeholder="my-worm-vault-bucket"
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Monitor Credentials */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Monitor Access Key ID{' '}
                      {state.storage.minioMonitorConfigured && (
                        <span className="text-[var(--signal-emerald)]">(Saved)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={monitorAccessKeyId}
                      onChange={(e) => setMonitorAccessKeyId(e.target.value)}
                      placeholder={
                        state.storage.minioMonitorConfigured ? '•••••••• (saved)' : 'keyID / access key'
                      }
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Monitor Secret Access Key{' '}
                      {state.storage.minioMonitorConfigured && <span className="text-[var(--signal-emerald)]">(Saved)</span>}
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={monitorSecretAccessKey}
                      onChange={(e) => setMonitorSecretAccessKey(e.target.value)}
                      placeholder={
                        state.storage.minioMonitorConfigured ? '•••••••• (saved)' : 'applicationKey / secret'
                      }
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Optional Isolated Vault Credentials */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Isolated Vault Key ID (Optional){' '}
                      {state.storage.minioVaultConfigured && (
                        <span className="text-[var(--signal-emerald)]">(Saved)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={vaultAccessKeyId}
                      onChange={(e) => setVaultAccessKeyId(e.target.value)}
                      placeholder={state.storage.minioVaultConfigured ? '•••••••• (saved)' : 'Separate vault keyID'}
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                      Isolated Vault Secret Key{' '}
                      {state.storage.minioVaultConfigured && <span className="text-[var(--signal-emerald)]">(Saved)</span>}
                    </label>
                    <input
                      type="password"
                      autoComplete="off"
                      value={vaultSecretAccessKey}
                      onChange={(e) => setVaultSecretAccessKey(e.target.value)}
                      placeholder={state.storage.minioVaultConfigured ? '•••••••• (saved)' : 'Separate vault secret'}
                      className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quota-Safe Poller + Path Style */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-3 py-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[13px] text-[var(--ink-primary)]">
                      <input
                        type="checkbox"
                        checked={pollingEnabled}
                        onChange={(e) => setPollingEnabled(e.target.checked)}
                        className="accent-[var(--accent-indigo)]"
                      />
                      ETag Poller (64 KB Range)
                    </label>
                    <select
                      value={pollingIntervalSec}
                      onChange={(e) => setPollingIntervalSec(Number(e.target.value))}
                      className="h-[26px] rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 font-mono text-[13px] text-[var(--ink-primary)]"
                    >
                      <option value={30}>30s</option>
                      <option value={60}>60s (B2/Supabase Free-Safe)</option>
                      <option value={300}>300s (Low Quota)</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-[13px] text-[var(--ink-secondary)]">
                      <input
                        type="checkbox"
                        checked={forcePathStyle}
                        onChange={(e) => setForcePathStyle(e.target.checked)}
                        className="accent-[var(--accent-indigo)]"
                      />
                      Force Path-Style
                    </label>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
                    <span>Calls today: {state.storage.apiCallsToday ?? 0}</span>
                    {state.storage.minioConnected && (
                      <button
                        type="button"
                        disabled={pollBusy}
                        onClick={handlePollNow}
                        className="inline-flex h-[24px] items-center gap-1 rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 text-[13px] text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                      >
                        <RefreshCw className={`h-3 w-3 ${pollBusy ? 'animate-spin' : ''}`} />
                        Sync Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {(state.storage.minioMonitorConfigured || state.storage.minioVaultConfigured) && (
                <button
                  type="button"
                  disabled={storageBusy}
                  onClick={() => handleSaveStorage(true)}
                  className="h-[30px] rounded-[6px] border border-[var(--signal-crimson)]/35 px-3 text-[13px] font-medium text-[var(--signal-crimson)] hover:bg-[var(--signal-crimson)]/10 transition-colors"
                >
                  Clear S3 Creds
                </button>
              )}
              <button
                type="button"
                disabled={storageBusy}
                onClick={() => handleSaveStorage(false)}
                className="h-[30px] rounded-[6px] bg-[var(--accent-indigo)] px-4 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors disabled:opacity-50"
              >
                {storageBusy
                  ? 'Verifying S3 Bucket…'
                  : provider === 'local'
                    ? 'Activate Built-in Store'
                    : 'Verify & Connect Bucket'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2.5: Authenticated Webhook Ingest & Signed Containment | Zero-Card Free Alerts */}
      <div data-setting-group="events" className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] lg:grid-cols-12 lg:divide-y-0 lg:divide-x">
        {/* Left: Authenticated Webhook Receiver & Signed Containment */}
        <section className="flex flex-col lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
            <div className="flex items-center gap-2">
              <Webhook className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                Authenticated S3/MinIO Webhook &amp; Containment
              </h2>
            </div>
            <span className="font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
              {state.ingest?.webhookEventsReceived ?? 0} webhooks ·{' '}
              {state.ingest?.directUploadsProcessed ?? 0} live PUTs ·{' '}
              {state.ingest?.polledDiffsDetected ?? 0} polled
            </span>
          </div>

          <div className="space-y-3.5 p-5">
            <div>
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                S3 / MinIO Event Webhook URL
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookEndpointUrl}
                  className="h-[30px] flex-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)]"
                />
                <button
                  type="button"
                  onClick={() => copyText(webhookEndpointUrl, 'Webhook URL')}
                  className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 text-[13px] text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Ingest Bearer / HMAC Secret (Memory / Env)
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="flex h-[30px] flex-1 items-center rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] min-w-[160px] truncate">
                  {revealedToken || state.ingest?.tokenMasked || '••••••••'}
                </div>
                <button
                  type="button"
                  disabled={ingestBusy}
                  onClick={handleRevealToken}
                  className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 text-[13px] text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  {revealedToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {revealedToken ? 'Hide' : 'Reveal'}
                </button>
                {revealedToken && (
                  <button
                    type="button"
                    onClick={() => copyText(revealedToken, 'Ingest Token')}
                    className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 text-[13px] text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={ingestBusy}
                  onClick={handleRotateToken}
                  className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 text-[13px] text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Rotate
                </button>
                <button
                  type="button"
                  disabled={ingestBusy}
                  onClick={handleTestWebhook}
                  className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[var(--accent-indigo)]/45 bg-[var(--accent-indigo)]/15 px-2.5 text-[13px] font-medium text-[var(--accent-text)] hover:bg-[var(--accent-indigo)]/25"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test Webhook
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--border-hairline)] pt-3">
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Signed External Containment Webhook (HMAC-SHA256)
              </label>
              <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
                Fires signed <span className="font-mono text-[var(--ink-secondary)]">REVOKE_PRINCIPAL</span>{' '}
                payloads on P0 containment (e.g. to trigger free MinIO{' '}
                <span className="font-mono text-[var(--ink-secondary)]">mc admin policy</span> scripts).
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="url"
                  value={containmentUrl}
                  onChange={(e) => setContainmentUrl(e.target.value)}
                  placeholder="https://your-containment-hook.example.com/revoke"
                  className="h-[30px] flex-1 min-w-[200px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
                <label className="flex items-center gap-1.5 text-[13px] text-[var(--ink-secondary)]">
                  <input
                    type="checkbox"
                    checked={containmentEnabled}
                    onChange={(e) => setContainmentEnabled(e.target.checked)}
                    className="accent-[var(--accent-indigo)]"
                  />
                  Armed
                </label>
                <button
                  type="button"
                  disabled={ingestBusy}
                  onClick={handleSaveContainment}
                  className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  Save Hook
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Free Alert destinations */}
        <section className="flex flex-col lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                Alert destinations
              </h2>
            </div>
            <span className="font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
              {alertsEnabled ? 'Armed' : 'Disabled'} · {state.alerts.deliveredCount} delivered
            </span>
          </div>

          <div className="space-y-2.5 p-5">
            <div>
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                ntfy.sh Topic (100% Free Push · No Account · No Card)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[13px] text-[var(--ink-muted)]">https://ntfy.sh/</span>
                <input
                  type="text"
                  value={ntfyTopic}
                  onChange={(e) => setNtfyTopic(e.target.value)}
                  placeholder="defyswarm-ops-your-secret-topic"
                  className="h-[30px] flex-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                  Discord Webhook URL (Free)
                </label>
                <input
                  type="url"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                  Slack Webhook URL (Free)
                </label>
                <input
                  type="url"
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Custom SIEM / JSON Webhook URL (Optional)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://siem.example.com/ingest"
                className="mt-1 h-[30px] w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
              <label className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
                <input
                  type="checkbox"
                  checked={alertsEnabled}
                  onChange={(e) => setAlertsEnabled(e.target.checked)}
                  className="accent-[var(--accent-indigo)]"
                />
                Enable real-time P0 &amp; swarm alerts
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={alertBusy}
                  onClick={handleSendTestAlert}
                  className="inline-flex h-[28px] items-center gap-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <Send className="h-3 w-3" />
                  Send Test Alert
                </button>
                <button
                  type="button"
                  disabled={alertBusy}
                  onClick={handleSaveAlerts}
                  className="h-[28px] rounded-[6px] bg-[var(--accent-indigo)] px-3 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
                >
                  Save Alerts
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: 2-Column Hairline Split — Allowlist Editor | policies.yaml Policy-as-Code */}
      <div data-setting-group="policy" className="grid flex-1 grid-cols-1 divide-y divide-[var(--border-hairline)] lg:grid-cols-12 lg:divide-y-0 lg:divide-x">
        {/* Identity & KMS Allowlist */}
        <section className="flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
            <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
              Identity &amp; KMS Allowlist
            </h2>
            <span className="text-[13px] text-[var(--ink-muted)]">Exact match · no wildcards</span>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            <div className="p-5">
              <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Trusted Principals ({state.policy.allowlist.principals.length})
              </p>
              <div className="mt-2 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                {state.policy.allowlist.principals.map((pid) => (
                  <div
                    key={pid}
                    className="flex h-[40px] items-center justify-between text-[13px] hover:bg-[var(--bg-hover)] px-1 transition-colors"
                  >
                    <span className="font-mono text-[var(--ink-primary)]">{pid}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateAllowlist(
                          state.policy.allowlist.principals.filter((x) => x !== pid),
                          state.policy.allowlist.kms_keys,
                        )
                      }
                      className="text-[var(--ink-muted)] hover:text-[var(--signal-crimson)] transition-colors"
                      aria-label={`Remove ${pid}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={newPrincipal}
                  onChange={(e) => setNewPrincipal(e.target.value)}
                  placeholder="Add principal ID"
                  className="h-[30px] flex-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPrincipal.trim()) return;
                    void updateAllowlist(
                      [...state.policy.allowlist.principals, newPrincipal.trim()],
                      state.policy.allowlist.kms_keys,
                    );
                    setNewPrincipal('');
                  }}
                  className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="p-5">
              <p className="text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                Trusted KMS Key ARNs / IDs ({state.policy.allowlist.kms_keys.length})
              </p>
              <div className="mt-2 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                {state.policy.allowlist.kms_keys.map((k) => (
                  <div
                    key={k}
                    className="flex h-[40px] items-center justify-between gap-2 text-[13px] hover:bg-[var(--bg-hover)] px-1 transition-colors"
                  >
                    <span className="font-mono text-[var(--ink-primary)] truncate">{k}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateAllowlist(
                          state.policy.allowlist.principals,
                          state.policy.allowlist.kms_keys.filter((x) => x !== k),
                        )
                      }
                      className="text-[var(--ink-muted)] hover:text-[var(--signal-crimson)] transition-colors shrink-0"
                      aria-label={`Remove ${k}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={newKmsKey}
                  onChange={(e) => setNewKmsKey(e.target.value)}
                  placeholder="Add KMS key ARN"
                  className="h-[30px] flex-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newKmsKey.trim()) return;
                    void updateAllowlist(state.policy.allowlist.principals, [
                      ...state.policy.allowlist.kms_keys,
                      newKmsKey.trim(),
                    ]);
                    setNewKmsKey('');
                  }}
                  className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* policies.yaml Editor */}
        <section className="flex flex-col lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2">
            <div>
              <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                Policy as Code (<span className="font-mono">policies.yaml</span>)
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[13px] text-[var(--ink-muted)] sm:inline">
                Strict schema · rejects unknown keys
              </span>
              <button
                type="button"
                disabled={savingYaml}
                onClick={handleSavePolicyYaml}
                className="inline-flex h-[28px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                {savingYaml ? 'Validating…' : 'Validate & Save'}
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <textarea
              value={yamlDraft}
              onChange={(e) => setYamlDraft(e.target.value)}
              spellCheck={false}
              rows={20}
              className="w-full flex-1 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-rail)] p-3.5 font-mono text-[13px] leading-relaxed text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
            />

            {yamlErrors.length > 0 && (
              <div className="mt-3 rounded-[6px] border border-[var(--signal-crimson)]/35 bg-[var(--signal-crimson)]/10 p-3 text-[13px] text-[var(--signal-crimson)]">
                <p className="font-semibold">Schema Validation Rejected:</p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 font-mono text-[13px]">
                  {yamlErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
