import { BrandLogo } from '../components/BrandLogo.tsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsolePage } from '../context/ConsoleContext.tsx';
import { LandingWorkflowSection } from '../components/LandingWorkflowSection.tsx';
import { LandingDocsSheet, type LandingSheetTopic } from '../components/LandingDocsSheet.tsx';

interface LandingPageProps {
  onOpenConsole: (initialPage?: ConsolePage) => void;
}

const PRINCIPAL_ROWS = [
  { name: 'ci-deployer', role: 'Service', allowlisted: true, standing: 'Active', revoked: false },
  { name: 'backup-agent', role: 'Service', allowlisted: true, standing: 'Active', revoked: false },
  { name: 'dlp-scanner', role: 'Service', allowlisted: true, standing: 'Active', revoked: false },
  { name: 'admin-elena-chen', role: 'Human Admin', allowlisted: false, standing: 'Approval Gate', revoked: false },
  { name: 'svc-billing-etl', role: 'Service', allowlisted: false, standing: 'Monitored', revoked: false },
  { name: 'swarm-node-1..4', role: 'Swarm Worker', allowlisted: false, standing: 'Revoked (403)', revoked: true },
] as const;

const CONTAINMENT_ROWS = [
  { scenario: 'Adaptive Canary Write', signal: 'canary_write', principal: 'svc-billing-etl', score: '+100', status: 'Revoked (403)' },
  { scenario: 'Versioning Sabotage', signal: 'versioning_suspend', principal: 'svc-billing-etl', score: '+100', status: 'Revoked (403)' },
  { scenario: '64 KB Entropy Spike', signal: 'entropy_delta', principal: 'svc-billing-etl', score: '+100', status: 'Revoked (403)' },
  { scenario: 'Distributed AI Swarm', signal: 'swarm_correlation', principal: 'swarm-node-1..4', score: '+95', status: 'Revoked (403)' },
  { scenario: 'Human Admin Trigger', signal: 'human_admin_gate', principal: 'admin-elena-chen', score: '+45', status: 'Approval Gate' },
] as const;

const REPLAY_ROWS = [
  { step: '01', event: 'Pause vault replication & lock clean manifest', chip: 'vault paused', tone: 'neutral' as const },
  { step: '02', event: 'Revoke offending principal → deny-all policy', chip: '403', tone: 'err' as const },
  { step: '03', event: 'Block subsequent attacker overwrite attempts', chip: '403', tone: 'err' as const },
  { step: '04', event: '1-Click Restore / Restore All clean versions', chip: 'restore', tone: 'volt' as const },
  { step: '05', event: 'Verify pre-attack SHA-256 digests bit-for-bit', chip: 'sha256 ✓', tone: 'ok' as const },
];

const FAQ_ITEMS = [
  {
    q: 'What is DefySwarm and how does out-of-band defense work?',
    a: 'DefySwarm is an out-of-band cloud object storage security control plane. Unlike inline proxies that add latency bottlenecks and single points of failure to high-throughput S3 traffic, DefySwarm operates out-of-band using quota-safe 64 KB range polling, authenticated S3/MinIO webhooks, and live telemetry to detect ransomware and AI swarms without running inline on the storage data path.',
  },
  {
    q: 'How does 100% free, zero-credit-card operation work?',
    a: 'DefySwarm is built for 100% free, zero-credit-card operation end-to-end: storage runs on Backblaze B2 (10 GB free) or Supabase S3 (1 GB free) or local MinIO ($0); adaptive decoy generation and blind audits use Groq free-tier (openai/gpt-oss-120b); real-time alerts fire via ntfy.sh, Discord, or Slack webhooks; and the Express control plane runs locally with zero cloud dependencies.',
  },
  {
    q: 'What is an AI-orchestrated swarm attack and how does DefySwarm detect it?',
    a: 'Modern attackers coordinate multiple autonomous agents or compromised credentials to execute slow, distributed encryption—keeping each individual key below single-principal threshold limits. DefySwarm Signal 4 maintains a 120-second sliding-window bucket correlation that detects multi-principal coordination (≥ 3 distinct principals writing flagged objects) and triggers immediate P0 containment across the swarm.',
  },
  {
    q: 'How are storage credentials, policies, and keys secured?',
    a: 'Credentials are stored exclusively on your local server in data/.private-config.json (git-ignored and never exposed over client APIs). Groq BYOK keys are held in server memory. Security policies are declared in data/policies.yaml with strict schema validation rejecting unknown keys or out-of-range thresholds, and all operator actions are recorded in an immutable RBAC audit log.',
  },
  {
    q: 'What happens during containment, and how does 1-Click Restore work?',
    a: 'Upon crossing containment thresholds, DefySwarm revokes the principal immediately with real HTTP 403 AccessDenied enforcement, freezes replication to the WORM vault to prevent poisoned versions, and dispatches webhooks. Operators can inspect affected files, preview restore plans, and execute 1-Click Restore (or Restore All across incidents) with automated cleanup of .locked attacker artifacts and bit-for-bit SHA-256 verification.',
  },
];

const STATS_DATA = [
  { target: 10, suffix: ' GB', line1: 'Free B2 & Supabase tier', line2: 'zero-credit-card verified' },
  { target: 0, suffix: ' ms', line1: 'Inline latency penalty', line2: 'out-of-band control plane' },
  { target: 100, suffix: '%', line1: 'SHA-256 restore accuracy', line2: 'verified WORM vault rollback' },
  { target: 0, suffix: '%', line1: 'False-positive rate', line2: 'on valid ZIP, PNG, and JPEG' },
];

const LogoMark: React.FC = () => (
  <span className="ds-logo-sq" aria-hidden="true">
    <svg viewBox="0 0 22 22" fill="none">
      <path
        d="M6.2 11c0-2 1.5-3.4 3.3-3.4 1.9 0 3 1.4 3.9 3.4.9 2 2 3.4 3.9 3.4 1.8 0 3.2-1.4 3.2-3.4s-1.4-3.4-3.2-3.4c-1.9 0-3 1.4-3.9 3.4-.9 2-2 3.4-3.9 3.4-1.8 0-3.3-1.4-3.3-3.4Z"
        stroke="#ffffff"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(-2.3 0) scale(1.0)"
      />
    </svg>
  </span>
);

const NavChevron: React.FC = () => (
  <svg className="ds-nav-chev" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path
      d="M2 3.5 l3 3 3-3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckSvg: React.FC = () => (
  <svg className="ds-mark-ico ds-mark-ok" viewBox="0 0 16 16" fill="none" aria-label="Allowlisted">
    <path
      d="M3.5 8.4 6.6 11.4 12.6 4.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashSvg: React.FC = () => (
  <svg className="ds-mark-ico ds-mark-muted" viewBox="0 0 16 16" fill="none" aria-label="Not allowlisted">
    <path
      d="M4.5 8h7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const KeySvg: React.FC = () => (
  <svg className="ds-key-ico" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="5.5" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.35" />
    <path d="M8.1 8h5.4M11.2 8v2.2M13.2 8v1.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenConsole }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containPanelRef = useRef<HTMLDivElement | null>(null);
  const replayPanelRef = useRef<HTMLDivElement | null>(null);
  const statsSectionRef = useRef<HTMLElement | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Interactive hero Policy toggles (Window B — real policies.yaml switches)
  const [heroToggles, setHeroToggles] = useState([true, true, false]);

  // Containment panel first-row flip Active -> Revoked (403)
  const [containRevealed, setContainRevealed] = useState(false);
  const [firstRowFlipping, setFirstRowFlipping] = useState(false);
  const [firstRowContained, setFirstRowContained] = useState(false);
  const [firstRowSweep, setFirstRowSweep] = useState(false);

  // Recovery replay 8s loop + interactive pause/play
  const [replayRevealed, setReplayRevealed] = useState(false);
  const [replayCycle, setReplayCycle] = useState(0);
  const [replayPaused, setReplayPaused] = useState(false);

  // Stats count-up
  const [statValues, setStatValues] = useState<number[]>([0, 0, 0, 0]);

  // FAQ accordion open index
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Docs / Quickstart / Roadmap / Scope modal
  const [sheetTopic, setSheetTopic] = useState<LandingSheetTopic | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReduced);

    const updateUnit = () => {
      const w = document.documentElement.clientWidth || window.innerWidth;
      const u = w <= 820 ? w / 390 : w / 1440;
      if (rootRef.current) {
        rootRef.current.style.setProperty('--u', `${u}px`);
      }
      document.documentElement.style.setProperty('--u', `${u}px`);
    };

    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    const prevOverflowX = document.body.style.overflowX;

    document.body.style.background = '#ffffff';
    document.body.style.color = '#101210';
    document.body.style.overflowX = 'hidden';

    updateUnit();
    window.addEventListener('resize', updateUnit, { passive: true });

    const onScroll = () => {
      const w = document.documentElement.clientWidth || window.innerWidth;
      const u = w <= 820 ? w / 390 : w / 1440;
      setScrolled(window.scrollY > 40 * u);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    let readyTimer = 0;
    if (prefersReduced) {
      setPageReady(true);
      setFirstRowContained(true);
      setFirstRowSweep(true);
      setStatValues(STATS_DATA.map((s) => s.target));
    } else {
      readyTimer = window.setTimeout(() => {
        setPageReady(true);
      }, 60);
    }

    return () => {
      window.removeEventListener('resize', updateUnit);
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(readyTimer);
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
      document.body.style.overflowX = prevOverflowX;
    };
  }, []);

  // Global IntersectionObserver adding .in once then unobserving
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>('.reveal, .ds-checker'));
    if (reducedMotion) {
      revealNodes.forEach((node) => node.classList.add('in'));
      setContainRevealed(true);
      setReplayRevealed(true);
      return;
    }

    if (!pageReady) return;

    const revealIfVisible = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.98 && rect.bottom > 0) {
        node.classList.add('in');
        if (node === containPanelRef.current) setContainRevealed(true);
        if (node === replayPanelRef.current) setReplayRevealed(true);
        return true;
      }
      return false;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.classList.add('in');
            observer.unobserve(target);

            if (target === containPanelRef.current) {
              setContainRevealed(true);
            }
            if (target === replayPanelRef.current) {
              setReplayRevealed(true);
            }
          }
        });
      },
      { threshold: 0.05 },
    );

    revealNodes.forEach((node) => {
      if (!revealIfVisible(node)) {
        observer.observe(node);
      }
    });
    return () => observer.disconnect();
  }, [pageReady, reducedMotion]);

  // Containment panel: first row flips Active -> Revoked (403) ~1s after reveal
  useEffect(() => {
    if (!containRevealed || reducedMotion) return;
    const t1 = window.setTimeout(() => {
      setFirstRowFlipping(true);
    }, 1000);
    const t2 = window.setTimeout(() => {
      setFirstRowContained(true);
    }, 1125);
    const t3 = window.setTimeout(() => {
      setFirstRowFlipping(false);
      setFirstRowSweep(true);
    }, 1260);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [containRevealed, reducedMotion]);

  // Recovery replay loop restarts every 8s when revealed & not paused
  useEffect(() => {
    if (!replayRevealed || replayPaused || reducedMotion) return;
    const interval = window.setInterval(() => {
      setReplayCycle((c) => c + 1);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [replayRevealed, replayPaused, reducedMotion]);

  // Stats count-up over 1.2s easeOutCubic when revealed
  useEffect(() => {
    const el = statsSectionRef.current;
    if (!el || reducedMotion) return;

    let rafId = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1200;

        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setStatValues(STATS_DATA.map((s) => Math.round(s.target * eased)));
          if (t < 1) {
            rafId = window.requestAnimationFrame(tick);
          }
        };
        rafId = window.requestAnimationFrame(tick);
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  const scrollToSection = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, [reducedMotion]);

  const toggleHeroPolicy = (idx: number) => {
    setHeroToggles((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  return (
    <div
      ref={rootRef}
      className={`ds-landing ${pageReady ? 'ds-ready' : ''}`}
    >
      {/* Fixed Navigation */}
      <header className={`ds-nav ${scrolled ? 'scrolled' : ''}`}>
        <a
          href="#top"
          className="ds-logo"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
          }}
        >
          <BrandLogo />
        </a>

        <nav className="ds-nav-center" aria-label="Primary">
          <a
            href="#how"
            className="ds-nav-item"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('how');
            }}
          >
            <span>How it works</span>
            <NavChevron />
          </a>
          <a
            href="#features-detect"
            className="ds-nav-item"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('features-detect');
            }}
          >
            <span>Features</span>
            <NavChevron />
          </a>
          <a
            href="#demo"
            className="ds-nav-item"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('demo');
            }}
          >
            <span>Architecture</span>
            <NavChevron />
          </a>
          <a
            href="#faq"
            className="ds-nav-item"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('faq');
            }}
          >
            <span>FAQ</span>
          </a>
        </nav>

        <div className="ds-nav-right">
          <button
            type="button"
            className="ds-nav-docs"
            onClick={() => setSheetTopic('scope')}
          >
            Scope &amp; limits
          </button>

          <button
            type="button"
            className="ds-nav-docs"
            onClick={() => setSheetTopic('docs')}
          >
            Quickstart
          </button>

          <button
            type="button"
            className="ds-nav-cta"
            onClick={() => onOpenConsole('war-room')}
          >
            Open Console
          </button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="top" className="ds-hero">
          <div className="ds-hero-grid">
            <div className="ds-hero-copy">
              <h1 className="ds-hero-h1">
                <span className="ds-line-mask">
                  <span className="ds-line-rise" style={{ '--ld': '.12s' } as React.CSSProperties}>
                    Out-of-band
                  </span>
                </span>
                <span className="ds-line-mask">
                  <span className="ds-line-rise" style={{ '--ld': '.22s' } as React.CSSProperties}>
                    storage defense for
                  </span>
                </span>
                <span className="ds-line-mask">
                  <span className="ds-line-rise" style={{ '--ld': '.32s' } as React.CSSProperties}>
                    <mark className="ds-mark" style={{ '--md': '.48s' } as React.CSSProperties}>Ransomware</mark> &amp; <mark className="ds-mark" style={{ '--md': '.62s' } as React.CSSProperties}>AI Swarms</mark>.
                  </span>
                </span>
              </h1>

              <p className="ds-hero-sub reveal" style={{ '--d': '.36s' } as React.CSSProperties}>
                DefySwarm is an out-of-band cloud object storage security control plane designed to
                detect, contain, and recover from both conventional encryption ransomware and slow-moving,
                distributed AI-orchestrated swarm attacks—without ever running inline on the storage data path.
              </p>

              <div className="ds-hero-actions reveal" style={{ '--d': '.46s' } as React.CSSProperties}>
                <button
                  type="button"
                  className="ds-btn-primary"
                  onClick={() => onOpenConsole('war-room')}
                >
                  <span className="ds-btn-chev" aria-hidden="true">›</span>
                  <span>Open Console</span>
                </button>
                <button
                  type="button"
                  className="ds-btn-secondary"
                  onClick={() => onOpenConsole('simulator')}
                >
                  <span className="ds-btn-chev" aria-hidden="true">›</span>
                  <span>Run Attack Simulator</span>
                </button>
              </div>

              <p className="ds-trust-line reveal" style={{ '--d': '.56s' } as React.CSSProperties}>
                100% Free · Zero-Credit-Card Operation · Built-in Store + S3 Adapters · Bit-for-Bit SHA-256 Verification
              </p>
            </div>

            {/* Cascading Console Windows */}
            <div className="ds-hero-visual" aria-label="Illustrative policy and fixture-principal panels">
              <p style={{ fontSize: 11, color: "var(--ds-ink-3)", marginBottom: 12 }}>Illustrative policy and fixture-principal panels; live zero-card storage results appear below.</p>
              <div className="ds-dot-grid" aria-hidden="true" />

              {/* Window A — Live Policy Rules */}
              <div className="ds-win-slot ds-win-a" style={{ '--wd': '.14s' } as React.CSSProperties}>
                <div className="ds-win-float ds-float-a">
                  <div className="ds-win-card">
                    <div className="ds-win-tabs">
                      <span className="ds-win-tab active">
                        <span className="ds-tab-dot volt" aria-hidden="true" />
                        Detection
                      </span>
                      <span className="ds-win-tab">Overview</span>
                      <span className="ds-win-tab">Policies</span>
                      <span className="ds-win-tab">Vault</span>
                    </div>
                    <div className="ds-win-table">
                      <div className="ds-wt-head">
                        <span>Rule (policies.yaml)</span>
                        <span>Layer</span>
                        <span>Score</span>
                        <span>Action</span>
                      </div>
                      <div className="ds-wt-row reveal" style={{ '--d': '.1s' } as React.CSSProperties}>
                        <span className="ds-wt-name">Canary write / delete</span>
                        <span>Signal 1</span>
                        <span className="ds-mono tabular-nums">+100</span>
                        <span className="ds-status-pill ok" style={{ '--pd': '.22s' } as React.CSSProperties}>
                          P0 Contain
                        </span>
                      </div>
                      <div className="ds-wt-row reveal" style={{ '--d': '.18s' } as React.CSSProperties}>
                        <span className="ds-wt-name">Versioning suspend</span>
                        <span>Signal 2</span>
                        <span className="ds-mono tabular-nums">+100</span>
                        <span className="ds-status-pill ok" style={{ '--pd': '.30s' } as React.CSSProperties}>
                          P0 Contain
                        </span>
                      </div>
                      <div className="ds-wt-row reveal" style={{ '--d': '.26s' } as React.CSSProperties}>
                        <span className="ds-wt-name">64 KB Entropy ΔH ≥ 1.5</span>
                        <span>Signal 3</span>
                        <span className="ds-mono tabular-nums">+45</span>
                        <span className="ds-status-pill muted" style={{ '--pd': '.38s' } as React.CSSProperties}>
                          Watchlist
                        </span>
                      </div>
                      <div className="ds-wt-row reveal" style={{ '--d': '.34s' } as React.CSSProperties}>
                        <span className="ds-wt-name">AI Swarm correlation</span>
                        <span>Signal 4</span>
                        <span className="ds-mono tabular-nums">+95</span>
                        <span className="ds-status-pill ok" style={{ '--pd': '.44s' } as React.CSSProperties}>
                          P0 Contain
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Window B — Policies */}
              <div className="ds-win-slot ds-win-b" style={{ '--wd': '.24s' } as React.CSSProperties}>
                <div className="ds-win-float ds-float-b">
                  <div className="ds-win-card">
                    <div className="ds-win-tabs ds-win-tabs-compact">
                      <span className="ds-win-tab active-plain">
                        <span className="ds-tab-dot red" aria-hidden="true" />
                        data/policies.yaml
                      </span>
                    </div>
                    <div className="ds-policy-rows">
                      {[
                        'Auto-contain on canary write (+100)',
                        'Pause WORM vault on P0 incident',
                        'Blast-radius lock (env=ransomware-sim-only)',
                      ].map((label, idx) => (
                        <div className="ds-policy-row" key={label}>
                          <span className="ds-policy-label">{label}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={heroToggles[idx]}
                            aria-label={label}
                            className={`ds-toggle ${heroToggles[idx] ? 'on' : ''}`}
                            style={{ '--td': `${0.4 + idx * 0.08}s` } as React.CSSProperties}
                            onClick={() => toggleHeroPolicy(idx)}
                          >
                            <span className="ds-toggle-knob" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Window C — Recovery Vault */}
              <div className="ds-win-slot ds-win-c" style={{ '--wd': '.34s' } as React.CSSProperties}>
                <div className="ds-win-float ds-float-c">
                  <div className="ds-win-card">
                    <div className="ds-win-tabs ds-win-tabs-compact">
                      <span className="ds-win-tab muted-only">vault-finance · Clean-Only Manifest</span>
                    </div>
                    <div className="ds-recovery-mini">
                      <div className="ds-recovery-file-row">
                        <span className="ds-recovery-fname">consolidated_balance_sheet.pdf</span>
                        <span className="ds-sha-chip">
                          sha256 verified <span className="ds-sha-check">✓</span>
                        </span>
                      </div>
                      <div className="ds-recovery-track" aria-hidden="true">
                        <span className="ds-recovery-fill" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Strip — Real Supported Backends Only */}
          <div className="ds-integrations reveal">
            <span className="ds-int-label">Zero-Card Storage</span>
            <div className="ds-int-list">
              <span className="ds-int-item reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="2.5" y="4" width="13" height="10" rx="2" />
                  <path d="M5.5 9h7M12.5 11.5h.01" strokeLinecap="round" />
                </svg>
                <span>Real Object Store</span>
              </span>
              <span className="ds-int-item reveal" style={{ '--d': '.06s' } as React.CSSProperties}>
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M9 2.2c2.8 2.6 4.5 5 4.5 7.7a4.5 4.5 0 1 1-9 0c0-2.7 1.7-5.1 4.5-7.7Z" />
                </svg>
                <span>Backblaze B2 (10GB Free)</span>
              </span>
              <span className="ds-int-item reveal" style={{ '--d': '.12s' } as React.CSSProperties}>
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M10.2 2.4 4.2 10h4.6l-1 5.6L13.8 8H9.2l1-5.6Z" strokeLinejoin="round" />
                </svg>
                <span>Supabase S3 (1GB Free)</span>
              </span>
              <span className="ds-int-item reveal" style={{ '--d': '.18s' } as React.CSSProperties}>
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M3 13.5V4.5l4 5 4-5v9M14.5 4.5v9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>MinIO ($0 Self-Hosted)</span>
              </span>
              <span className="ds-int-item reveal" style={{ '--d': '.24s' } as React.CSSProperties}>
                <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="12" height="12" rx="3" />
                  <circle cx="9" cy="9" r="2.5" />
                </svg>
                <span>Groq Free-Tier (gpt-oss-120b)</span>
              </span>
            </div>
          </div>
        </section>

        {/* Checkerboard Divider #1 */}
        <div className="ds-checker" aria-hidden="true" />

        {/* Feature Section — DETECTION */}
        <section id="features-detect" className="ds-feat-section">
          <div className="ds-feat-grid">
            <div className="ds-feat-list">
              <article className="ds-feat-item reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 3.2 16.8 15.5H3.2L10 3.2Z" />
                  <path d="M10 8.2v3.3M10 13.6h.01" />
                </svg>
                <h2 className="ds-feat-title">SIGNAL 1 · ADAPTIVE CANARIES</h2>
                <p className="ds-feat-desc">
                  Context-matched corporate decoys placed across nested prefixes without trap keywords.
                  Read trips add +45 (watchlist); Write, Modify, SSE-C, or Delete triggers +100
                  (immediate P0 containment). Self-loop protected under defyswarm-service.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('canaries')}
                >
                  <span>Open canary inventory</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>

              <article className="ds-feat-item reveal" style={{ '--d': '.08s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="14" height="12" rx="2" />
                  <path d="M7 8h6M7 12h4" />
                </svg>
                <h2 className="ds-feat-title">SIGNAL 2 · CONTROL-PLANE HARD TRIPS</h2>
                <p className="ds-feat-desc">
                  Immediate P0 containment on PutBucketVersioning(Suspended), DeleteObject(versionId)
                  version purges, aggressive PutBucketLifecycle expiry, Object Lock tampering, or
                  audit-log tampering.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('setup')}
                >
                  <span>Inspect policies.yaml</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>

              <article className="ds-feat-item reveal" style={{ '--d': '.16s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 13.5 6.5 8l3.5 4 3.5-6.5L17 11" />
                  <path d="M3 16.5h14" />
                </svg>
                <h2 className="ds-feat-title">SIGNAL 3 · 64 KB ENTROPY + MAGIC CHECKS</h2>
                <p className="ds-feat-desc">
                  Samples up to 64 KB of every write for Shannon entropy deltas (ΔH ≥ 1.5 bits/byte),
                  verifies magic-byte headers (PDF, PNG, ZIP, DOCX), catches .locked rename bursts,
                  and maintains 0% false positives on valid media.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('war-room')}
                >
                  <span>Inspect live telemetry</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>

              <article className="ds-feat-item reveal" style={{ '--d': '.24s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="5" cy="6" r="2.2" />
                  <circle cx="15" cy="6" r="2.2" />
                  <circle cx="10" cy="14.5" r="2.2" />
                  <path d="M6.8 7.4 8.8 12.6M13.2 7.4 11.2 12.6M7.2 6h5.6" />
                </svg>
                <h2 className="ds-feat-title">SIGNAL 4 · DISTRIBUTED AI SWARM CORRELATION</h2>
                <p className="ds-feat-desc">
                  Sliding-window bucket correlation catching slow, multi-principal attacks (≥ 3 distinct
                  principals writing flagged objects within a 120s window) even when each stays below
                  single-key thresholds.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('incidents')}
                >
                  <span>Explore incidents</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>
            </div>

            {/* Right Panel — Principal Posture (Real DefySwarm Principals) */}
            <div className="ds-panel ds-panel-leftbar reveal">
              <div className="ds-grad-bar ds-grad-v ds-grad-detect" aria-hidden="true" />
              <div className="ds-panel-content">
                <div className="ds-panel-head">
                  <h3>Principal posture</h3>
                  <p>governed by data/policies.yaml · enforced at the storage path</p>
                </div>

                <div className="ds-table-scroll">
                  <table className="ds-matrix-table">
                    <thead>
                      <tr>
                        <th>Principal</th>
                        <th>Type</th>
                        <th>Allowlist</th>
                        <th>Standing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PRINCIPAL_ROWS.map((row, rIdx) => (
                        <tr
                          key={row.name}
                          className={`ds-matrix-row ${row.revoked ? 'revoked' : ''}`}
                          style={{ '--rd': `${rIdx * 0.06}s` } as React.CSSProperties}
                        >
                          <td>
                            <span className="ds-principal-cell">
                              <KeySvg />
                              <span className={row.revoked ? 'ds-strike' : ''}>{row.name}</span>
                            </span>
                          </td>
                          <td className="ds-mono">{row.role}</td>
                          <td>
                            <span
                              className="ds-mark-pop"
                              style={{ '--mpd': `${0.16 + rIdx * 0.08}s` } as React.CSSProperties}
                            >
                              {row.allowlisted ? <CheckSvg /> : <DashSvg />}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`ds-status-pill ${
                                row.revoked
                                  ? 'err'
                                  : row.standing === 'Active'
                                    ? 'ok'
                                    : 'muted'
                              }`}
                            >
                              {row.standing}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ds-panel-foot">
                  data/policies.yaml · strict schema validated · operator RBAC audited
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Section — CONTAINMENT (mirrored: panel left, text right) */}
        <section id="features-contain" className="ds-feat-section ds-feat-contain">
          <div className="ds-feat-grid ds-feat-grid-mirrored">
            {/* Left Panel — Enforcement Policy Rules */}
            <div ref={containPanelRef} className="ds-panel ds-panel-topbar reveal">
              <div className="ds-grad-bar ds-grad-h ds-grad-contain" aria-hidden="true" />
              <div className="ds-panel-content">
                <div className="ds-contain-toolbar">
                  <h3>Containment rules</h3>
                  <button
                    type="button"
                    className="ds-volt-btn"
                    onClick={() => onOpenConsole('setup')}
                  >
                    Edit policies.yaml
                  </button>
                </div>

                <div className="ds-table-scroll">
                  <table className="ds-inc-table">
                    <thead>
                      <tr>
                        <th>Trigger Scenario</th>
                        <th>Signal</th>
                        <th>Principal</th>
                        <th>Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CONTAINMENT_ROWS.map((row, idx) => {
                        const isFirst = idx === 0;
                        const pillContained = isFirst
                          ? firstRowContained
                          : row.status === 'Revoked (403)';
                        return (
                          <tr
                            key={row.scenario}
                            className={`ds-inc-row ${isFirst && firstRowSweep ? 'swept' : ''}`}
                            style={{ '--rd': `${idx * 0.07}s` } as React.CSSProperties}
                          >
                            <td className="ds-inc-name">
                              <strong>{row.scenario}</strong>
                            </td>
                            <td className="ds-mono">{row.signal}</td>
                            <td className="ds-mono">{row.principal}</td>
                            <td className="ds-mono tabular-nums">{row.score}</td>
                            <td>
                              <span
                                className={`ds-status-pill ${pillContained ? 'ok' : 'muted'} ${
                                  isFirst && firstRowFlipping ? 'flipping' : ''
                                }`}
                              >
                                {isFirst
                                  ? firstRowContained
                                    ? 'Revoked (403)'
                                    : 'Detecting'
                                  : row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Text */}
            <div className="ds-contain-copy reveal" style={{ '--d': '.1s' } as React.CSSProperties}>
              <div className="ds-contain-top-link">
                <button
                  type="button"
                  className="ds-grey-pill"
                  onClick={() => onOpenConsole('incidents')}
                >
                  Open Incident Queue <span aria-hidden="true">›</span>
                </button>
              </div>
              <h2 className="ds-contain-h2">
                Real HTTP 403 <mark className="ds-mark" style={{ '--md': '.15s' } as React.CSSProperties}>Lockout</mark>, zero-loss containment, and human guardrails.
              </h2>
              <p className="ds-contain-body">
                When an attacker or rogue principal trips detection, DefySwarm revokes their access
                immediately with real HTTP 403 AccessDenied enforcement, freezes replication to the
                WORM vault to stop poisoned versions, and dispatches real-time webhooks (ntfy.sh, Discord,
                Slack)—while human-admin credentials require operator approval before lockout.
              </p>
            </div>
          </div>
        </section>

        {/* Checkerboard Divider #2 */}
        <div className="ds-checker" aria-hidden="true" />

        {/* Feature Section — RECOVERY */}
        <section id="features-recover" className="ds-feat-section">
          <div className="ds-feat-grid">
            <div className="ds-feat-list">
              <article className="ds-feat-item reveal" style={{ '--d': '0s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4.2" width="14" height="11.6" rx="2" />
                  <circle cx="10" cy="10" r="2.6" />
                  <path d="M10 7.4V6M10 14v-1.4" />
                </svg>
                <h2 className="ds-feat-title">ISOLATED WORM VAULT</h2>
                <p className="ds-feat-desc">
                  Clean object versions are held in an isolated WORM Vault refusing tenant credentials.
                  Replication pauses instantly during active P0 incidents to eliminate any risk of
                  vault poisoning.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('canaries')}
                >
                  <span>Inspect vault status</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>

              <article className="ds-feat-item reveal" style={{ '--d': '.12s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 2.6 16.5 5v4.5c0 3.7-2.6 6.7-6.5 7.9-3.9-1.2-6.5-4.2-6.5-7.9V5L10 2.6Z" />
                  <path d="m7.2 10.1 2 2 3.8-4.2" />
                </svg>
                <h2 className="ds-feat-title">1-CLICK SHA-256 RESTORE &amp; RESTORE ALL</h2>
                <p className="ds-feat-desc">
                  Pre-flight restore previews + automated cleanup of attacker .locked artifacts,
                  verified bit-for-bit restoration from the clean manifest, and one-click batch recovery
                  across all active incidents.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('live-storage')}
                >
                  <span>Browse live storage</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>

              <article className="ds-feat-item reveal" style={{ '--d': '.24s' } as React.CSSProperties}>
                <svg className="ds-feat-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4.5" y="9" width="11" height="8" rx="1.6" />
                  <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
                </svg>
                <h2 className="ds-feat-title">BLAST-RADIUS LOCK &amp; 30-RUN BENCHMARKS</h2>
                <p className="ds-feat-desc">
                  The built-in Defense Simulator strictly enforces an explicit env=ransomware-sim-only
                  bucket tag to protect production data. 30-run statistical benchmark harness measures
                  MTTD, MTTC, and recovery integrity.
                </p>
                <button
                  type="button"
                  className="ds-feat-link"
                  onClick={() => onOpenConsole('simulator')}
                >
                  <span>Open Test Lab</span>
                  <span className="ds-link-chev" aria-hidden="true">›</span>
                </button>
              </article>
            </div>

            {/* Right Panel — Recovery Sequence */}
            <div ref={replayPanelRef} className="ds-panel ds-panel-leftbar reveal">
              <div className="ds-grad-bar ds-grad-v ds-grad-recover" aria-hidden="true" />
              <div className="ds-panel-content ds-replay-pad">
                <h3 className="ds-replay-title">Recovery sequence</h3>

                <div
                  key={replayCycle}
                  className={`ds-replay-body ${replayRevealed ? 'playing' : ''} ${
                    replayPaused ? 'paused' : ''
                  }`}
                >
                  <div className="ds-replay-list">
                    {REPLAY_ROWS.map((row, idx) => (
                      <div
                        key={row.step}
                        className="ds-replay-row"
                        style={{ '--rrd': `${idx * 0.12}s` } as React.CSSProperties}
                      >
                        <span className="ds-replay-time tabular-nums">STEP {row.step}</span>
                        <span className="ds-replay-evt">{row.event}</span>
                        <span
                          className={`ds-replay-chip ${row.tone}`}
                          style={{ '--rcd': `${idx * 0.12 + 0.28}s` } as React.CSSProperties}
                        >
                          {row.chip}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Step Playback Bar */}
                  <div className="ds-media-bar">
                    <button
                      type="button"
                      className="ds-pause-btn"
                      aria-label={replayPaused ? 'Play recovery sequence' : 'Pause recovery sequence'}
                      onClick={() => setReplayPaused((p) => !p)}
                    >
                      {replayPaused ? (
                        <svg viewBox="0 0 12 12" fill="#ffffff" aria-hidden="true">
                          <polygon points="3,2 10,6 3,10" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 12 12" fill="#ffffff" aria-hidden="true">
                          <rect x="2.6" y="2.2" width="2.4" height="7.6" rx="0.6" />
                          <rect x="7" y="2.2" width="2.4" height="7.6" rx="0.6" />
                        </svg>
                      )}
                    </button>
                    <span className="ds-media-time tabular-nums">01</span>
                    <div className="ds-media-track" aria-hidden="true">
                      <span className="ds-media-fill">
                        <span className="ds-media-knob" />
                      </span>
                    </div>
                    <span className="ds-media-time tabular-nums">05</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dark Workflow Section — THE CENTERPIECE */}
        <LandingWorkflowSection onOpenConsole={onOpenConsole} />

        {/* Architecture & Harness Specs Band */}
        <section id="demo" ref={statsSectionRef} className="ds-stats-band">
          <p className="ds-stats-label reveal">
            Out-of-Band Zero-Card Architecture &amp; 30-Run Statistical Harness
          </p>

          <div className="ds-stats-grid reveal" style={{ '--d': '.1s' } as React.CSSProperties}>
            {STATS_DATA.map((stat, idx) => (
              <div className="ds-stat-cell" key={stat.line1}>
                <div className="ds-stat-num tabular-nums">
                  {statValues[idx]}
                  {stat.suffix && <span>{stat.suffix}</span>}
                </div>
                <p className="ds-stat-cap">
                  {stat.line1}
                  <br />
                  {stat.line2}
                </p>
              </div>
            ))}
          </div>

          <p className="ds-scope-line reveal" style={{ '--d': '.18s' } as React.CSSProperties}>
            Scope: DefySwarm operates out-of-band via quota-safe polling (64 KB range reads) and authenticated
            webhooks. Real HTTP 403 enforcement runs on the built-in object store and monitored application path.
            Direct cloud IAM revocation for raw unmonitored keys is on the{' '}
            <button
              type="button"
              className="ds-scope-link"
              onClick={() => setSheetTopic('roadmap')}
            >
              roadmap →
            </button>
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="ds-faq-band">
          <div className="ds-faq-inner">
            <h2 className="ds-faq-h2 reveal">
              Questions, <mark className="ds-mark" style={{ '--md': '.15s' } as React.CSSProperties}>answered.</mark>
            </h2>

            <div className="ds-faq-list reveal">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className={`ds-faq-item ${isOpen ? 'open' : ''}`}
                    data-faq-item={idx}
                    style={{ '--d': `${idx * 0.06}s` } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      className="ds-faq-q"
                      id={`faq-question-${idx}`}
                      aria-controls={`faq-answer-${idx}`}
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq((curr) => (curr === idx ? null : idx))}
                    >
                      <span>{item.q}</span>
                      <svg className="ds-faq-plus" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M8 2.5v11M2.5 8h11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <div className="ds-faq-a-wrap" id={`faq-answer-${idx}`} role="region" aria-labelledby={`faq-question-${idx}`} inert={!isOpen}>
                      <div className="ds-faq-a-inner">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="end" className="ds-cta-section">
          <h2 className="ds-cta-h2 reveal">
            Out-of-band storage defense.
            <br />
            <mark className="ds-mark" style={{ '--md': '.15s' } as React.CSSProperties}>Zero credit cards.</mark>
          </h2>
          <p className="ds-cta-sub reveal" style={{ '--d': '.15s' } as React.CSSProperties}>
            Launch the institutional control plane, run real ransomware and AI swarm simulations
            against tagged sandbox buckets, and verify the 1-Click SHA-256 restore.
          </p>
          <div className="ds-cta-actions reveal" style={{ '--d': '.25s' } as React.CSSProperties}>
            <button
              type="button"
              className="ds-btn-primary"
              onClick={() => onOpenConsole('war-room')}
            >
              <span className="ds-btn-chev" aria-hidden="true">›</span>
              <span>Open Console</span>
            </button>
            <button
              type="button"
              className="ds-btn-secondary"
              onClick={() => onOpenConsole('analytics')}
            >
              <span className="ds-btn-chev" aria-hidden="true">›</span>
              <span>Run Benchmark Suite</span>
            </button>
          </div>
          <p className="ds-cta-note reveal" style={{ '--d': '.35s' } as React.CSSProperties}>
            100% Free · Built-in Object Store + S3 Adapters · Groq BYOK Free-Tier · WORM Vault Rollback
          </p>
        </section>

        {/* Checkerboard Divider #3 */}
        <div className="ds-checker" aria-hidden="true" />
      </main>

      {/* Footer */}
      <footer className="ds-footer reveal">
        <div className="ds-footer-grid">
          <div className="ds-footer-brand">
            <a
              href="#top"
              className="ds-logo"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
              }}
            >
              <BrandLogo />
            </a>
            <p>Out-of-band cloud object storage security control plane for ransomware and distributed AI swarm defense.</p>
          </div>

          <div className="ds-footer-col">
            <h4>CONSOLE</h4>
            <button type="button" onClick={() => onOpenConsole('war-room')}>Overview</button>
            <button type="button" onClick={() => onOpenConsole('incidents')}>Incidents</button>
            <button type="button" onClick={() => onOpenConsole('canaries')}>Canaries &amp; Vault</button>
            <button type="button" onClick={() => onOpenConsole('live-storage')}>Live Storage</button>
          </div>

          <div className="ds-footer-col">
            <h4>VERIFICATION</h4>
            <button type="button" onClick={() => onOpenConsole('simulator')}>Test Lab</button>
            <button type="button" onClick={() => onOpenConsole('analytics')}>30-Run Benchmarks</button>
            <button type="button" onClick={() => setSheetTopic('docs')}>Local Quickstart</button>
            <button type="button" onClick={() => scrollToSection('faq')}>FAQ</button>
          </div>

          <div className="ds-footer-col">
            <h4>ARCHITECTURE</h4>
            <button type="button" onClick={() => setSheetTopic('scope')}>Scope &amp; Limits</button>
            <button type="button" onClick={() => setSheetTopic('roadmap')}>Roadmap</button>
            <button type="button" onClick={() => onOpenConsole('setup')}>Storage &amp; Policy Setup</button>
            <button type="button" onClick={() => onOpenConsole('health')}>System Health</button>
          </div>
        </div>

        <div className="ds-footer-legal">
          <span>© 2026 DefySwarm — 100% free, zero-credit-card storage defense.</span>
          <span className="ds-mono">policy file: data/policies.yaml · vault: vault-finance · WORM retention</span>
        </div>
      </footer>

      <LandingDocsSheet
        topic={sheetTopic}
        onClose={() => setSheetTopic(null)}
        onOpenConsole={onOpenConsole}
      />
    </div>
  );
};
