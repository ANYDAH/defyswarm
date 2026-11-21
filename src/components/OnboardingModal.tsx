import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import { useConsole } from '../context/ConsoleContext.tsx';

export const OnboardingModal: React.FC = () => {
  const { showOnboarding, setShowOnboarding, apiFetch, pushToast, setActivePage } = useConsole();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveAndVerify = async () => {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, message: 'Enter your Groq API key (gsk_...) or choose Skip for Now.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const testRes = await apiFetch<{ ok: boolean; message: string }>('/api/settings/llm/test', {
        method: 'POST',
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      await apiFetch('/api/settings/llm', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          onboardingCompleted: true,
        }),
      });
      setTestResult({ ok: true, message: testRes.message });
      pushToast({
        title: 'Groq BYOK Connected',
        detail: 'openai/gpt-oss-120b verified with free-tier rate guard active.',
        tone: 'success',
      });
      setTimeout(() => setStep(3), 450);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Verification failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/settings/llm', {
        method: 'POST',
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      setShowOnboarding(false);
    } catch {
      setShowOnboarding(false);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = (destination: 'war-room' | 'setup') => {
    setShowOnboarding(false);
    setActivePage(destination);
  };

  return (
    <AnimatePresence>
      {showOnboarding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="pane-elevated relative w-full max-w-[540px] overflow-hidden rounded-[6px] border border-[var(--border-hairline)]"
          >
            {/* Header Bar */}
            <div className="flex h-[44px] items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5">
              <div className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
                <span className={step === 1 ? 'text-[var(--ink-primary)] font-medium' : ''}>01 Posture</span>
                <span>·</span>
                <span className={step === 2 ? 'text-[var(--ink-primary)] font-medium' : ''}>02 Groq BYOK</span>
                <span>·</span>
                <span className={step === 3 ? 'text-[var(--ink-primary)] font-medium' : ''}>03 Ready</span>
              </div>
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Close onboarding"
                className="rounded-[5px] p-1 text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--accent-indigo)]/30 bg-[var(--accent-indigo)]/15 text-[var(--accent-text)]">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <h2 className="text-[18px] font-semibold text-[var(--ink-primary)]">
                        DefySwarm Control Plane Initialized
                      </h2>
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                      Out-of-band ransomware defense for cloud object storage. Every entropy delta,
                      HTTP 403 revocation, and SHA-256 restore is cryptographically executed and
                      measured.
                    </p>

                    <div className="mt-5 divide-y divide-[var(--border-hairline)] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] text-[13px]">
                      <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                        <div>
                          <p className="font-medium text-[var(--ink-primary)]">Versioned Object Store &amp; MinIO Adapter</p>
                          <p className="text-[13px] text-[var(--ink-muted)]">Synthetic alert replays and SHA-256 recovery checks</p>
                        </div>
                        <span className="font-mono text-[13px] font-medium text-[var(--signal-emerald)]">READY</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                        <div>
                          <p className="font-medium text-[var(--ink-primary)]">Isolated WORM Vault &amp; Clean Manifest</p>
                          <p className="text-[13px] text-[var(--ink-muted)]">Tenant credentials denied; poisoning guard armed</p>
                        </div>
                        <span className="font-mono text-[13px] font-medium text-[var(--signal-emerald)]">LOCKED</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                        <div>
                          <p className="font-medium text-[var(--ink-primary)]">Simulator Blast-Radius Lock</p>
                          <p className="text-[13px] text-[var(--ink-muted)]">Enforces env=ransomware-sim-only bucket tag</p>
                        </div>
                        <span className="font-mono text-[13px] font-medium text-[var(--signal-emerald)]">ARMED</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={saving}
                        className="text-[13px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                      >
                        Skip onboarding
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-4 py-2 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
                      >
                        Configure Groq BYOK
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--accent-indigo)]/30 bg-[var(--accent-indigo)]/15 text-[var(--accent-text)]">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <h2 className="text-[18px] font-semibold text-[var(--ink-primary)]">
                        Connect Groq API (BYOK)
                      </h2>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                      Generate adaptive canaries using{' '}
                      <span className="font-mono text-[var(--ink-primary)]">openai/gpt-oss-120b</span>. Saved privately on this Mac, separately from{' '}
                      <span className="font-mono">policies.yaml</span> or browser storage.
                    </p>

                    <div className="mt-4 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] p-3.5">
                      <div className="flex items-center justify-between text-[13px] text-[var(--ink-secondary)]">
                        <span>Free-Tier Rate Guardrails</span>
                        <span className="font-mono text-[var(--ink-primary)] tabular-nums">
                          30 RPM · 8,000 TPM · 200K TPD
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
                        Single-batch structured prompts (~2,200 tokens/run) and automatic cooldown
                        throttling protect your free-tier budget.
                      </p>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor="onboarding-groq-key"
                        className="block text-[13px] font-medium text-[var(--ink-primary)]"
                      >
                        Groq API Key
                      </label>
                      <div className="relative mt-1.5">
                        <input
                          id="onboarding-groq-key"
                          type="password"
                          autoComplete="off"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="w-full rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-3 py-2 pr-9 font-mono text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-indigo)] focus:outline-none"
                        />
                        <Lock className="pointer-events-none absolute right-3 top-2.5 h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      </div>
                      {testResult && (
                        <p
                          className={`mt-2 text-[13px] ${
                            testResult.ok ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-crimson)]'
                          }`}
                        >
                          {testResult.message}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={testing || saving}
                        className="text-[13px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                      >
                        Skip for Now
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          disabled={testing}
                          className="rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAndVerify}
                          disabled={testing}
                          className="rounded-[6px] bg-[var(--accent-indigo)] px-4 py-1.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] disabled:opacity-50"
                        >
                          {testing ? 'Verifying…' : 'Verify & Save Key'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.14 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--signal-emerald)]/30 bg-[var(--signal-emerald)]/15 text-[var(--signal-emerald)]">
                        <Check className="h-4.5 w-4.5" />
                      </div>
                      <h2 className="text-[18px] font-semibold text-[var(--ink-primary)]">
                        Workbench Ready
                      </h2>
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
                      Groq <span className="font-mono text-[var(--ink-primary)]">openai/gpt-oss-120b</span> is
                      verified with free-tier rate guardrails. Press{' '}
                      <kbd className="rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-1 font-mono text-[13px] text-[var(--ink-primary)]">
                        ⌘K
                      </kbd>{' '}
                      anytime to navigate or launch drills.
                    </p>

                    <div className="mt-6 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleFinish('setup')}
                        className="rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)]"
                      >
                        Open Setup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFinish('war-room')}
                        className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-4 py-1.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
                      >
                        Enter Live War Room
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
