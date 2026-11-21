import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Lock,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';
import type { SimScenarioId } from '../shared/types.ts';

const BENIGN_VARIANTS: Array<{ id: SimScenarioId; label: string; desc: string }> = [
  { id: 'benign_bulk', label: '15 Mixed Docs', desc: '.pdf, .csv, .txt' },
  { id: 'benign_compressed', label: 'Compressed Media', desc: 'High-entropy valid .jpg & .docx' },
  { id: 'benign_rename', label: 'Bulk Rename', desc: 'Valid-header archival copies' },
  { id: 'benign_backup_sync', label: 'Backup Sync', desc: 'Allowlisted agent reads canaries' },
];

export const SimulatorView: React.FC = () => {
  const { state, apiFetch, pushToast, requestConfirm, setActivePage, setSelectedIncidentId } =
    useConsole();
  const [targetBucket, setTargetBucket] = useState('finance-prod');
  const [benignVariant, setBenignVariant] = useState<SimScenarioId>('benign_bulk');
  const [launching, setLaunching] = useState<string | null>(null);

  if (!state) return null;

  const selectedBucketObj = state.buckets.find((b) => b.name === targetBucket) ?? state.buckets[0];
  const blastLockPass = selectedBucketObj?.tags.env === 'ransomware-sim-only';

  const launchScenario = async (scenario: SimScenarioId) => {
    setLaunching(scenario);
    try {
      await apiFetch('/api/simulator/run', {
        method: 'POST',
        body: JSON.stringify({ scenario, bucket: targetBucket }),
      });
      pushToast({
        title: 'Simulation started',
        detail: `Executing ${scenario.replace(/_/g, ' ')} on ${targetBucket}.`,
        tone: 'info',
      });
    } catch (err) {
      pushToast({
        title: 'Simulation blocked',
        detail: err instanceof Error ? err.message : 'Unable to start scenario.',
        tone: 'error',
      });
    } finally {
      setLaunching(null);
    }
  };

  const triggerAdminGateTest = async () => {
    try {
      await apiFetch('/api/simulator/admin-gate-test', {
        method: 'POST',
        body: JSON.stringify({ bucket: targetBucket }),
      });
      pushToast({
        title: 'Human-Admin Approval Gate Triggered',
        detail: 'Review pending quarantine decision on admin-elena-chen in Incidents.',
        tone: 'warning',
      });
      setActivePage('incidents');
    } catch (err) {
      pushToast({
        title: 'Could not trigger admin gate',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    }
  };

  const handleResetDemo = () => {
    requestConfirm({
      title: 'Reset Demo Environment?',
      message:
        'Restores baseline business objects, resets all credentials to ACTIVE, clears live incidents and events, and reverts policies.yaml to default values.',
      confirmLabel: 'Reset Demo',
      destructive: true,
      onConfirm: async () => {
        await apiFetch('/api/simulator/reset', { method: 'POST' });
        pushToast({
          title: 'Demo Reset Complete',
          detail: 'All buckets, WORM vault snapshots, and credentials restored.',
          tone: 'success',
        });
      },
    });
  };

  return (
    <div className="flex flex-col">
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--ink-primary)] leading-tight">
            Defense Simulator
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
            Replay synthetic alerts and verify routine storage and recovery in an isolated local store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerAdminGateTest}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
          >
            <UserCheck className="h-3.5 w-3.5 text-[var(--signal-amber)]" />
            Test Admin Gate
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            disabled={state.simulator.running}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
            Reset Demo
          </button>
        </div>
      </div>

      {/* Flush Blast-Radius Lock Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-b px-5 py-2.5 ${
          blastLockPass
            ? 'border-[var(--signal-emerald)]/25 bg-[var(--signal-emerald)]/[0.05]'
            : 'border-[var(--signal-crimson)]/35 bg-[var(--signal-crimson)]/[0.08]'
        }`}
      >
        <div className="flex items-center gap-2.5 text-[13px]">
          {blastLockPass ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--signal-emerald)]" />
          ) : (
            <Lock className="h-4 w-4 shrink-0 text-[var(--signal-crimson)]" />
          )}
          <span className="font-semibold text-[var(--ink-primary)]">
            Blast-Radius Lock: {blastLockPass ? 'PASS' : 'BLOCKED'}
          </span>
          <span className="text-[var(--ink-secondary)]">
            {blastLockPass
              ? `Bucket "${targetBucket}" carries env=ransomware-sim-only · sensitivity=${selectedBucketObj?.tags.sensitivity}`
              : `Bucket "${targetBucket}" has env=${selectedBucketObj?.tags.env ?? 'unset'}. Simulator refuses production buckets.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sim-bucket-select" className="text-[13px] font-medium text-[var(--ink-secondary)]">
            Target Bucket
          </label>
          <select
            id="sim-bucket-select"
            value={targetBucket}
            onChange={(e) => setTargetBucket(e.target.value)}
            className="h-[28px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
          >
            {state.buckets.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name} ({b.tags.env || 'prod'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2x2 Hairline-Divided Scenario Matrix */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border-hairline)] border-b border-[var(--border-hairline)] lg:grid-cols-2 lg:divide-x">
        {/* Scenario 01 */}
        <div className="flex flex-col justify-between bg-[var(--bg-base)] p-5">
          <div>
            <div className="flex items-center justify-between text-[13px] font-mono">
              <span className="text-[var(--ink-muted)]">SCENARIO 01 · FALSE-POSITIVE TEST</span>
              <span className="text-[var(--signal-emerald)]">ZERO-ALERT TARGET</span>
            </div>
            <h2 className="mt-1.5 text-[15px] font-semibold text-[var(--ink-primary)]">Benign Bulk Upload</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-secondary)] leading-relaxed">
              Validates that high-entropy legitimate uploads, archival renames, and allowlisted
              backup syncs keep the risk score green.
            </p>

            <div className="mt-3.5 grid grid-cols-2 gap-1.5">
              {BENIGN_VARIANTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setBenignVariant(v.id)}
                  className={`rounded-[6px] border px-2.5 py-2 text-left transition-colors ${
                    benignVariant === v.id
                      ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo)]/15'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-pane)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="text-[13px] font-medium text-[var(--ink-primary)]">{v.label}</div>
                  <div className="text-[13px] text-[var(--ink-muted)] truncate">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3.5">
            <span className="font-mono text-[13px] text-[var(--ink-muted)]">Pass: 0 alerts · Risk &lt; 45</span>
            <button
              type="button"
              disabled={state.simulator.running || launching !== null}
              onClick={() => launchScenario(benignVariant)}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <Play className="h-3 w-3" />
              Run Benign Workload
            </button>
          </div>
        </div>

        {/* Scenario 02 */}
        <div className="flex flex-col justify-between bg-[var(--bg-base)] p-5">
          <div>
            <div className="flex items-center justify-between text-[13px] font-mono">
              <span className="text-[var(--ink-muted)]">SCENARIO 02 · VERSIONING ALERT</span>
              <span className="text-[var(--signal-crimson)]">P0 AUTO-CONTAINMENT</span>
            </div>
            <h2 className="mt-1.5 text-[15px] font-semibold text-[var(--ink-primary)]">Versioning Alert Replay</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-secondary)] leading-relaxed">
              Replays a versioning-suspension alert and checks whether the local adapter denies access to the test principal.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3.5">
            <span className="font-mono text-[13px] text-[var(--ink-muted)]">Checks local access denial and file integrity</span>
            <button
              type="button"
              disabled={state.simulator.running || launching !== null}
              onClick={() => launchScenario('standard_ransomware')}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--signal-crimson)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--signal-crimson-hover)] disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Run Versioning Replay
            </button>
          </div>
        </div>

        {/* Scenario 03 */}
        <div className="flex flex-col justify-between bg-[var(--bg-base)] p-5 border-t border-[var(--border-hairline)]">
          <div>
            <div className="flex items-center justify-between text-[13px] font-mono">
              <span className="text-[var(--ink-muted)]">SCENARIO 03 · MULTI-PRINCIPAL ACTIVITY</span>
              <span className="text-[var(--signal-amber)]">SWARM CORRELATION</span>
            </div>
            <h2 className="mt-1.5 text-[15px] font-semibold text-[var(--ink-primary)]">Multi-Principal Alert Replay</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-secondary)] leading-relaxed">
              Replays suspicious write records from sample principals and checks whether the detector correlates and contains them.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3.5">
            <span className="font-mono text-[13px] text-[var(--ink-muted)]">Checks correlation and local access denial</span>
            <button
              type="button"
              disabled={state.simulator.running || launching !== null}
              onClick={() => launchScenario('stealth_ai_swarm')}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--signal-crimson)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--signal-crimson-hover)] disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Run Multi-Principal Replay
            </button>
          </div>
        </div>

        {/* Scenario 04 */}
        <div className="flex flex-col justify-between bg-[var(--bg-base)] p-5 border-t border-[var(--border-hairline)]">
          <div>
            <div className="flex items-center justify-between text-[13px] font-mono">
              <span className="text-[var(--ink-muted)]">SCENARIO 04 · CRYPTOGRAPHIC ROLLBACK</span>
              <span className="text-[var(--signal-emerald)]">100% SHA-256 TARGET</span>
            </div>
            <h2 className="mt-1.5 text-[15px] font-semibold text-[var(--ink-primary)]">Recovery Verification</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-secondary)] leading-relaxed">
              Restores a disposable sample document from the local vault and compares its SHA-256 digest against the original.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-hairline)] pt-3.5">
            <span className="font-mono text-[13px] text-[var(--ink-muted)]">Pass: 100% SHA-256 match</span>
            <button
              type="button"
              disabled={state.simulator.running || launching !== null}
              onClick={() => launchScenario('recovery_verification')}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--signal-emerald)] px-3.5 text-[13px] font-semibold text-[var(--bg-pane)] hover:bg-[var(--signal-emerald)] disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verify Vault Recovery
            </button>
          </div>
        </div>
      </div>

      {/* Live Assertions Ledger */}
      <div className="bg-[var(--bg-base)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--ink-primary)]">Live Scenario Assertions</h3>
            <p className="text-[13px] text-[var(--ink-muted)]">
              {state.simulator.scenario
                ? `${state.simulator.scenario.replace(/_/g, ' ')} on ${state.simulator.bucket} · ${
                    state.simulator.running ? 'Executing…' : 'Completed'
                  }`
                : 'Select a scenario above to stream live pass/fail checks.'}
            </p>
          </div>

          {state.simulator.incidentId && (
            <button
              type="button"
              onClick={() => {
                setSelectedIncidentId(state.simulator.incidentId ?? null);
                setActivePage('incidents');
              }}
              className="h-[28px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
            >
              Inspect Incident {state.simulator.incidentId}
            </button>
          )}
        </div>

        {state.simulator.assertions.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[var(--ink-muted)]">
            Run a scenario to see its checks.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)]">
            {state.simulator.assertions.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                <div className="flex items-start gap-2.5">
                  {a.status === 'pass' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-emerald)]" />
                  ) : a.status === 'fail' ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-crimson)]" />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-amber)]" />
                  )}
                  <div>
                    <p className="text-[13px] font-medium text-[var(--ink-primary)]">{a.label}</p>
                    {a.detail && <p className="text-[13px] text-[var(--ink-secondary)]">{a.detail}</p>}
                  </div>
                </div>
                <span
                  className={`font-mono text-[13px] font-semibold uppercase whitespace-nowrap shrink-0 ${
                    a.status === 'pass'
                      ? 'text-[var(--signal-emerald)]'
                      : a.status === 'fail'
                        ? 'text-[var(--signal-crimson)]'
                        : 'text-[var(--signal-amber)]'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {state.simulator.summary && (
          <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-3 font-mono text-[13px] text-[var(--ink-primary)]">
            {state.simulator.summary}
          </div>
        )}
      </div>
    </div>
  );
};
