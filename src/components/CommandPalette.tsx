import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertOctagon,
  BarChart3,
  CornerDownLeft,
  FlaskConical,
  HardDrive,
  HeartPulse,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Vault,
} from 'lucide-react';
import { type ConsolePage, useConsole } from '../context/ConsoleContext.tsx';
import type { Role } from '../shared/types.ts';

interface CommandEntry {
  id: string;
  group: 'Navigation' | 'Live Actions' | 'Switch Role' | 'Recent Incidents';
  label: string;
  hint?: string;
  keywords: string;
  icon: React.FC<{ className?: string }>;
  run: () => void | Promise<void>;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const {
    state,
    setActivePage,
    setSelectedIncidentId,
    role,
    setRole,
    apiFetch,
    pushToast,
    requestConfirm,
  } = useConsole();

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const navigate = (page: ConsolePage) => {
    setActivePage(page);
    onClose();
  };

  const commands = useMemo<CommandEntry[]>(() => {
    const navItems: CommandEntry[] = [
      { id: 'nav-war', group: 'Navigation', label: 'Security overview', hint: 'Real-time feed & entropy', keywords: 'war room live feed telemetry entropy risk', icon: Radio, run: () => navigate('war-room') },
      { id: 'nav-store', group: 'Navigation', label: 'Storage', hint: 'Upload files, curl CLI, S3 browser', keywords: 'live storage upload real files curl backblaze supabase minio s3 bucket', icon: HardDrive, run: () => navigate('live-storage') },
      { id: 'nav-sim', group: 'Navigation', label: 'Test lab', hint: 'Run safe scenarios', keywords: 'simulator attack test benign swarm ransomware', icon: FlaskConical, run: () => navigate('simulator') },
      { id: 'nav-inc', group: 'Navigation', label: 'Incidents & 1-Click Restore', hint: 'Forensics & SHA-256 rollback', keywords: 'incidents restore rollback forensics vault', icon: AlertOctagon, run: () => navigate('incidents') },
      { id: 'nav-ana', group: 'Navigation', label: 'Benchmark Analytics', hint: '30-run median & p95 scoreboard', keywords: 'analytics benchmark mttd mttc p95 scoreboard', icon: BarChart3, run: () => navigate('analytics') },
      { id: 'nav-can', group: 'Navigation', label: 'Canaries & Vault', hint: 'Adaptive decoys and vault snapshots', keywords: 'canaries vault worm groq llm', icon: Vault, run: () => navigate('canaries') },
      { id: 'nav-set', group: 'Navigation', label: 'Settings', hint: 'Storage, AI provider, and policies', keywords: 'setup settings policies yaml byok groq minio backblaze supabase ntfy allowlist', icon: Settings2, run: () => navigate('setup') },
      { id: 'nav-hlt', group: 'Navigation', label: 'Usage & Health', hint: 'Ingestion & operator audit log', keywords: 'health usage audit log stream gap', icon: HeartPulse, run: () => navigate('health') },
    ];

    const actionItems: CommandEntry[] = [
      {
        id: 'act-std',
        group: 'Live Actions',
        label: 'Run Versioning Alert Replay',
        hint: 'Scenario 02',
        keywords: 'run attack standard ransomware encryption sabotage',
        icon: ShieldAlert,
        run: async () => {
          onClose();
          setActivePage('simulator');
          try {
            await apiFetch('/api/simulator/run', {
              method: 'POST',
              body: JSON.stringify({ scenario: 'standard_ransomware', bucket: 'finance-prod' }),
            });
            pushToast({ title: 'Versioning Replay Started', detail: 'Results appear in the Simulator.', tone: 'info' });
          } catch (err) {
            pushToast({ title: 'Launch blocked', detail: err instanceof Error ? err.message : 'Error', tone: 'error' });
          }
        },
      },
      {
        id: 'act-swarm',
        group: 'Live Actions',
        label: 'Run Multi-Principal Alert Replay',
        hint: 'Scenario 03',
        keywords: 'run stealth ai swarm sse-c correlation',
        icon: ShieldAlert,
        run: async () => {
          onClose();
          setActivePage('simulator');
          try {
            await apiFetch('/api/simulator/run', {
              method: 'POST',
              body: JSON.stringify({ scenario: 'stealth_ai_swarm', bucket: 'finance-prod' }),
            });
            pushToast({ title: 'Multi-Principal Replay Started', detail: 'Results appear in the Simulator.', tone: 'info' });
          } catch (err) {
            pushToast({ title: 'Launch blocked', detail: err instanceof Error ? err.message : 'Error', tone: 'error' });
          }
        },
      },
      {
        id: 'act-benign',
        group: 'Live Actions',
        label: 'Run Benign Bulk Upload (finance-prod)',
        hint: 'Scenario 01 · 50 docs',
        keywords: 'run benign bulk upload zero false alarms',
        icon: Play,
        run: async () => {
          onClose();
          setActivePage('simulator');
          try {
            await apiFetch('/api/simulator/run', {
              method: 'POST',
              body: JSON.stringify({ scenario: 'benign_bulk', bucket: 'finance-prod' }),
            });
            pushToast({ title: 'Benign Workload Started', detail: 'Uploading 50 valid documents.', tone: 'info' });
          } catch (err) {
            pushToast({ title: 'Launch blocked', detail: err instanceof Error ? err.message : 'Error', tone: 'error' });
          }
        },
      },
      {
        id: 'act-harden',
        group: 'Live Actions',
        label: 'Run Auto-Harden on finance-prod',
        hint: 'Verify 4 posture checks',
        keywords: 'auto harden versioning vault canaries audit',
        icon: ShieldCheck,
        run: async () => {
          onClose();
          try {
            await apiFetch('/api/buckets/finance-prod/harden', { method: 'POST' });
            pushToast({ title: 'Auto-Harden Complete', detail: 'finance-prod passed all 4 checks.', tone: 'success' });
          } catch (err) {
            pushToast({ title: 'Auto-Harden failed', detail: err instanceof Error ? err.message : 'Error', tone: 'error' });
          }
        },
      },
      {
        id: 'act-canaries',
        group: 'Live Actions',
        label: 'Refresh Adaptive Canaries Now',
        hint: 'Self-loop protected',
        keywords: 'refresh rotate canaries decoys',
        icon: RefreshCw,
        run: async () => {
          onClose();
          try {
            await apiFetch('/api/canaries/refresh', {
              method: 'POST',
              body: JSON.stringify({ bucket: 'finance-prod' }),
            });
            pushToast({ title: 'Canaries Rotated', detail: 'Refreshed under defyswarm-service (0 alerts).', tone: 'success' });
          } catch (err) {
            pushToast({ title: 'Refresh failed', detail: err instanceof Error ? err.message : 'Error', tone: 'error' });
          }
        },
      },
      {
        id: 'act-reset',
        group: 'Live Actions',
        label: 'Reset Demo Environment',
        hint: 'Confirmation required',
        keywords: 'reset demo clean baseline restore',
        icon: RotateCcw,
        run: () => {
          onClose();
          requestConfirm({
            title: 'Reset Demo Environment?',
            message:
              'Restores baseline business objects, resets all principals to ACTIVE, clears live incidents/events, and resets policies.yaml.',
            confirmLabel: 'Reset Demo',
            destructive: true,
            onConfirm: async () => {
              await apiFetch('/api/simulator/reset', { method: 'POST' });
              pushToast({ title: 'Demo Reset Complete', tone: 'success' });
            },
          });
        },
      },
    ];

    const roleItems: CommandEntry[] = (['admin', 'operator', 'viewer'] as Role[]).map((r) => ({
      id: `role-${r}`,
      group: 'Switch Role',
      label: `Switch console role to ${r.charAt(0).toUpperCase() + r.slice(1)}`,
      hint: role === r ? 'Current' : undefined,
      keywords: `role rbac switch ${r}`,
      icon: UserCog,
      run: () => {
        setRole(r);
        pushToast({ title: `Active role: ${r}`, tone: 'info' });
        onClose();
      },
    }));

    const incidentItems: CommandEntry[] = (state?.incidents ?? []).slice(0, 5).map((inc) => ({
      id: `inc-${inc.id}`,
      group: 'Recent Incidents',
      label: `${inc.id} · ${inc.title}`,
      hint: inc.status,
      keywords: `incident ${inc.id} ${inc.bucket} ${inc.status} ${inc.principals.join(' ')}`,
      icon: AlertOctagon,
      run: () => {
        setSelectedIncidentId(inc.id);
        setActivePage('incidents');
        onClose();
      },
    }));

    return [...navItems, ...actionItems, ...roleItems, ...incidentItems];
  }, [state?.incidents, role, apiFetch, pushToast, requestConfirm, setActivePage, setSelectedIncidentId, setRole, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => (filtered.length === 0 ? 0 : (prev + 1) % filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) =>
          filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length,
        );
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault();
        void filtered[selectedIdx].run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, selectedIdx, onClose]);

  // Group filtered items preserving order
  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ item: CommandEntry; flatIdx: number }>>();
    filtered.forEach((item, flatIdx) => {
      const list = map.get(item.group) ?? [];
      list.push({ item, flatIdx });
      map.set(item.group, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 pt-[13vh] px-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.985, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="pane-elevated w-full max-w-[580px] overflow-hidden rounded-[6px] border border-[var(--border-hairline)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-2.5 border-b border-[var(--border-hairline)] px-3.5 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to view, run simulation, switch role, or inspect incident…"
                className="w-full bg-transparent text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none"
              />
              <kbd className="rounded-[4px] border border-[var(--border-hairline)] bg-[var(--bg-hover)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--ink-secondary)]">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto py-1.5">
              {grouped.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-[var(--ink-muted)]">
                  No commands match &ldquo;{query}&rdquo;.
                </div>
              ) : (
                grouped.map(([groupName, entries]) => (
                  <div key={groupName} className="mb-1.5 last:mb-0">
                    <div className="px-3.5 py-1 text-[13px] font-medium text-[var(--ink-muted)]">
                      {groupName}
                    </div>
                    {entries.map(({ item, flatIdx }) => {
                      const Icon = item.icon;
                      const isSelected = flatIdx === selectedIdx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setSelectedIdx(flatIdx)}
                          onClick={() => void item.run()}
                          className={`flex h-[40px] w-full items-center justify-between gap-3 px-3.5 text-left text-[13px] transition-colors ${
                            isSelected
                              ? 'bg-[var(--accent-indigo)]/20 text-[var(--ink-primary)]'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-primary)]'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isSelected ? 'text-[var(--accent-text)]' : 'text-[var(--ink-muted)]'
                              }`}
                            />
                            <span className="truncate font-medium">{item.label}</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {item.hint && (
                              <span className="font-mono text-[13px] text-[var(--ink-muted)]">
                                {item.hint}
                              </span>
                            )}
                            {isSelected && <CornerDownLeft className="h-3 w-3 text-[var(--accent-text)]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer Key Hints */}
            <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-rail)] px-3.5 py-2 text-[13px] text-[var(--ink-muted)]">
              <span>↑↓ Navigate · Enter Execute</span>
              <span className="font-mono">DefySwarm Command Bar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
