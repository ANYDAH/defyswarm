import React, { useEffect, useRef, useState } from 'react';
import type { ConsolePage } from '../context/ConsoleContext.tsx';

const LOG_LINES = [
  '[ingest]  PUT sample.txt → 201 · write accepted',
  '[ingest]  PUT sample.txt → 201 · overwrite 2/3',
  '[inspect] overwrite 3/3 → 201 · ΔH ≥ 1.5 & header destroyed',
  '[contain] threshold 100 reached · HTTP 403 principal revoked',
  '[guard]   following requests → 403 AccessDenied, 403',
  '[restore] 1-Click Restore clean version → storage bucket',
  '[verify]  recovered + WORM copy → bit-for-bit SHA-256 match ✓',
];

const FULL_LOG = LOG_LINES.join('\n');
const POLICY_ENGAGED_INDEX =
  FULL_LOG.indexOf('HTTP 403 principal revoked') + 'HTTP 403 principal revoked'.length;
const RESTORE_LINE_INDEX =
  FULL_LOG.indexOf('SHA-256 match ✓') + 'SHA-256 match ✓'.length;

function renderColoredLog(text: string): React.ReactNode[] {
  const tokens = text.split(/(201|403|✓)/g);
  return tokens.map((part, idx) => {
    if (part === '201' || part === '✓') {
      return (
        <span key={idx} className="ds-log-ok">
          {part}
        </span>
      );
    }
    if (part === '403') {
      return (
        <span key={idx} className="ds-log-err">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface LandingWorkflowSectionProps {
  onOpenConsole: (page?: ConsolePage) => void;
}

export const LandingWorkflowSection: React.FC<LandingWorkflowSectionProps> = ({
  onOpenConsole,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const desktopReturnPathRef = useRef<SVGPathElement | null>(null);
  const mobileReturnPathRef = useRef<SVGPathElement | null>(null);
  const desktopDotRef = useRef<SVGCircleElement | null>(null);
  const mobileDotRef = useRef<SVGCircleElement | null>(null);

  const [inView, setInView] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [policyEngaged, setPolicyEngaged] = useState(false);
  const [decisionFlash, setDecisionFlash] = useState(false);
  const [vaultActive, setVaultActive] = useState(false);

  // Start playback once the workflow diagram enters view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setInView(true);
      setTypedCount(FULL_LOG.length);
      setPolicyEngaged(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Synchronised typing log + diagram state transitions
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let timeoutId = 0;
    let flashTimer = 0;
    let boostTimer = 0;
    let rafId = 0;

    const animateReturnDot = () => {
      const start = performance.now();
      const duration = 800;

      const step = (now: number) => {
        if (cancelled) return;
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 2);

        const updateDot = (
          pathEl: SVGPathElement | null,
          dotEl: SVGCircleElement | null,
        ) => {
          if (!pathEl || !dotEl) return;
          const totalLen = pathEl.getTotalLength();
          const pt = pathEl.getPointAtLength(totalLen * (1 - eased));
          dotEl.setAttribute('cx', pt.x.toFixed(1));
          dotEl.setAttribute('cy', pt.y.toFixed(1));
          dotEl.style.opacity = progress < 0.96 ? '1' : '0';
        };

        updateDot(desktopReturnPathRef.current, desktopDotRef.current);
        updateDot(mobileReturnPathRef.current, mobileDotRef.current);

        if (progress < 1) {
          rafId = window.requestAnimationFrame(step);
        }
      };

      rafId = window.requestAnimationFrame(step);
    };

    const runCycle = () => {
      if (cancelled) return;
      let idx = 0;
      let triggeredPolicy = false;
      let triggeredRestore = false;

      setTypedCount(0);
      setPolicyEngaged(false);
      setDecisionFlash(false);
      setVaultActive(false);
      if (desktopDotRef.current) desktopDotRef.current.style.opacity = '0';
      if (mobileDotRef.current) mobileDotRef.current.style.opacity = '0';

      const stepChar = () => {
        if (cancelled) return;
        idx += 1;
        setTypedCount(idx);

        if (!triggeredPolicy && idx >= POLICY_ENGAGED_INDEX) {
          triggeredPolicy = true;
          setPolicyEngaged(true);
          setDecisionFlash(true);
          flashTimer = window.setTimeout(() => {
            if (!cancelled) setDecisionFlash(false);
          }, 900);
        }

        if (!triggeredRestore && idx >= RESTORE_LINE_INDEX) {
          triggeredRestore = true;
          setVaultActive(true);
          animateReturnDot();
          boostTimer = window.setTimeout(() => {
            if (!cancelled) setVaultActive(false);
          }, 1000);
        }

        if (idx < FULL_LOG.length) {
          const prevChar = FULL_LOG[idx - 1];
          const delay = prevChar === '\n' ? 100 : 16;
          timeoutId = window.setTimeout(stepChar, delay);
        } else {
          timeoutId = window.setTimeout(runCycle, 3200);
        }
      };

      timeoutId = window.setTimeout(stepChar, 220);
    };

    runCycle();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearTimeout(flashTimer);
      window.clearTimeout(boostTimer);
      window.cancelAnimationFrame(rafId);
    };
  }, [inView]);

  const visibleLog = FULL_LOG.slice(0, typedCount);

  return (
    <section id="how" ref={sectionRef} className="ds-dark-section">
      <div className="ds-dark-inner">
        {/* Header row */}
        <div className="ds-dark-header reveal">
          <h2 className="ds-dark-headline">
            <span>Out-of-band inspection. Zero inline latency penalty.</span>
            <span className="ds-dark-headline-muted">
              Quarantine compromised principals. Restore bit-for-bit from WORM storage.
            </span>
          </h2>
          <button
            type="button"
            className="ds-cream-pill"
            onClick={() => onOpenConsole('simulator')}
          >
            Run in Test Lab <span aria-hidden="true">›</span>
          </button>
        </div>

        {/* Centerpiece Flow Diagram */}
        <div className="ds-flow-stage reveal" style={{ '--d': '.12s' } as React.CSSProperties}>
          {/* Left Panel — Pipeline Log */}
          <div className="ds-log-card">
            <div className="ds-log-head">Real-time control plane replay · illustrative playback timing</div>
            <pre className="ds-log-body" aria-live="off">
              <code>
                {renderColoredLog(visibleLog)}
                <span className="ds-caret" aria-hidden="true" />
              </code>
            </pre>
          </div>

          {/* Desktop Horizontal Node Chain (hidden <= 820px) */}
          <div className="ds-diagram-desktop" aria-label="DefySwarm detection and recovery pipeline">
            <svg
              className="ds-flow-svg"
              viewBox="0 0 948 430"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {/* App write -> Detection */}
              <path d="M 156 176 L 309 176" className="ds-edge-base" />
              <path d="M 156 176 L 309 176" className="ds-edge-flow" />

              {/* Detection -> Decision */}
              <path d="M 443 176 L 549 176" className="ds-edge-base" />
              <path d="M 443 176 L 549 176" className="ds-edge-flow" />

              {/* Decision -> 200 write allowed */}
              <path
                d="M 675 162 C 718 162, 718 88, 760 88"
                className={`ds-edge-base ${policyEngaged ? 'dim' : ''}`}
              />
              <path
                d="M 675 162 C 718 162, 718 88, 760 88"
                className={`ds-edge-flow ${policyEngaged ? 'dim' : ''}`}
              />

              {/* Decision -> 403 write refused */}
              <path
                d="M 675 176 L 760 176"
                className={`ds-edge-base ${policyEngaged ? 'hot' : ''}`}
              />
              <path d="M 675 176 L 760 176" className="ds-edge-flow" />

              {/* Decision -> snapshot kept */}
              <path d="M 675 190 C 718 190, 718 264, 760 264" className="ds-edge-base" />
              <path d="M 675 190 C 718 190, 718 264, 760 264" className="ds-edge-flow" />

              {/* Detection -> Recovery vault */}
              <path
                ref={desktopReturnPathRef}
                d="M 376 202 L 376 326"
                className="ds-edge-vault-base"
              />
              <path d="M 376 202 L 376 326" className="ds-edge-flow" />

              {/* Returning volt dot travelling upward on restore (flat, zero glow) */}
              <circle
                ref={desktopDotRef}
                r="4"
                cx="376"
                cy="326"
                className="ds-return-dot"
              />
            </svg>

            {/* Node: App write */}
            <div className="ds-node ds-node-write">
              <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M8 12V3M4.5 6.5 8 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 13.5h10" strokeLinecap="round" />
              </svg>
              <span>Storage PUT</span>
            </div>

            {/* Edge label: policy checked */}
            <div className="ds-edge-label ds-label-policy">
              <span className="ds-check-sq" aria-hidden="true">
                <svg viewBox="0 0 12 12" fill="none" stroke="#101210" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 6.2 5 8.6 9.5 3.6" />
                </svg>
              </span>
              <span>policy checked</span>
            </div>

            {/* Node: Detection */}
            <div className="ds-node ds-node-detect">
              <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" />
                <circle cx="8" cy="8" r="2" />
              </svg>
              <span>Detection</span>
            </div>

            {/* Edge label: scored */}
            <div className="ds-edge-label ds-label-scored">
              <span>risk scored</span>
            </div>

            {/* Node: Decision */}
            <div className={`ds-node ds-node-decision ${decisionFlash ? 'flash' : ''}`}>
              <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M8 2.2 13.8 8 8 13.8 2.2 8 8 2.2Z" strokeLinejoin="round" />
              </svg>
              <span>Policy gate</span>
            </div>

            {/* Outcome chip: 200 · write allowed */}
            <div className={`ds-outcome-chip ds-outcome-200 ${policyEngaged ? 'dimmed' : ''}`}>
              <span className="ds-ok-text">201</span>
              <span className="ds-chip-sep">·</span>
              <span>write allowed</span>
            </div>

            {/* Outcome chip: 403 · write refused */}
            <div className={`ds-outcome-chip ds-outcome-403 ${policyEngaged ? 'bright' : ''}`}>
              <span className="ds-err-text">403</span>
              <span className="ds-chip-sep">·</span>
              <span>principal revoked</span>
            </div>

            {/* Outcome chip: vault paused */}
            <div className="ds-outcome-chip ds-outcome-snap">
              <span>vault paused</span>
            </div>

            {/* Edge label: clean manifest */}
            <div className="ds-edge-label ds-label-vault">
              <span>clean manifest</span>
            </div>

            {/* Highlight Node: WORM Vault (flat solid volt, zero pulsing halo) */}
            <div className={`ds-node ds-node-vault ${vaultActive ? 'boost' : ''}`}>
              <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2.5" y="3.5" width="11" height="9" rx="1.8" />
                <circle cx="8" cy="8" r="1.8" />
              </svg>
              <span>vault-finance</span>
            </div>
          </div>

          {/* Mobile Vertical Node Chain (shown <= 820px) */}
          <div className="ds-diagram-mobile" aria-label="DefySwarm vertical detection and recovery pipeline">
            <div className="ds-m-node-wrap">
              <div className="ds-node">
                <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M8 12V3M4.5 6.5 8 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 13.5h10" strokeLinecap="round" />
                </svg>
                <span>Storage PUT</span>
              </div>

              <div className="ds-m-edge">
                <svg viewBox="0 0 40 44" width="40" height="44" fill="none" aria-hidden="true">
                  <path d="M20 0 L20 44" className="ds-edge-base" />
                  <path d="M20 0 L20 44" className="ds-edge-flow" />
                </svg>
                <span className="ds-m-edge-label">
                  <span className="ds-check-sq" aria-hidden="true">
                    <svg viewBox="0 0 12 12" fill="none" stroke="#101210" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6.2 5 8.6 9.5 3.6" />
                    </svg>
                  </span>
                  policy checked
                </span>
              </div>

              <div className="ds-node">
                <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.5" />
                  <circle cx="8" cy="8" r="2" />
                </svg>
                <span>Detection</span>
              </div>

              <div className="ds-m-edge">
                <svg viewBox="0 0 40 44" width="40" height="44" fill="none" aria-hidden="true">
                  <path d="M20 0 L20 44" className="ds-edge-base" />
                  <path d="M20 0 L20 44" className="ds-edge-flow" />
                </svg>
                <span className="ds-m-edge-label">risk scored</span>
              </div>

              <div className={`ds-node ${decisionFlash ? 'flash' : ''}`}>
                <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M8 2.2 13.8 8 8 13.8 2.2 8 8 2.2Z" strokeLinejoin="round" />
                </svg>
                <span>Policy gate</span>
              </div>

              <div className="ds-m-edge ds-m-edge-short">
                <svg viewBox="0 0 40 32" width="40" height="32" fill="none" aria-hidden="true">
                  <path d="M20 0 L20 32" className="ds-edge-base" />
                  <path d="M20 0 L20 32" className="ds-edge-flow" />
                </svg>
              </div>

              <div className="ds-m-outcomes">
                <div className={`ds-outcome-chip ${policyEngaged ? 'dimmed' : ''}`}>
                  <span className="ds-ok-text">201</span>
                  <span className="ds-chip-sep">·</span>
                  <span>write allowed</span>
                </div>
                <div className={`ds-outcome-chip ${policyEngaged ? 'bright' : ''}`}>
                  <span className="ds-err-text">403</span>
                  <span className="ds-chip-sep">·</span>
                  <span>principal revoked</span>
                </div>
                <div className="ds-outcome-chip">
                  <span>vault paused</span>
                </div>
              </div>

              <div className="ds-m-edge">
                <svg viewBox="0 0 40 52" width="40" height="52" fill="none" aria-hidden="true">
                  <path
                    ref={mobileReturnPathRef}
                    d="M20 0 L20 52"
                    className="ds-edge-vault-base"
                  />
                  <path d="M20 0 L20 52" className="ds-edge-flow" />
                  <circle
                    ref={mobileDotRef}
                    r="3.5"
                    cx="20"
                    cy="52"
                    className="ds-return-dot"
                  />
                </svg>
                <span className="ds-m-edge-label">clean manifest</span>
              </div>

              <div className={`ds-node ds-node-vault ${vaultActive ? 'boost' : ''}`}>
                <svg className="ds-node-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="2.5" y="3.5" width="11" height="9" rx="1.8" />
                  <circle cx="8" cy="8" r="1.8" />
                </svg>
                <span>vault-finance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 3-column mini-features */}
        <div className="ds-dark-bottom reveal" style={{ '--d': '.16s' } as React.CSSProperties}>
          <div className="ds-dark-mini">
            <svg className="ds-mini-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 2.5 16.5 5v4.6c0 3.8-2.6 6.8-6.5 8-3.9-1.2-6.5-4.2-6.5-8V5L10 2.5Z" />
              <path d="m7.3 10.2 1.8 1.8 3.6-3.8" />
            </svg>
            <h3>Principal-scoped quarantine</h3>
            <p>Revokes compromised credentials with real HTTP 403 AccessDenied enforcement while allowlisted services stay online.</p>
          </div>
          <div className="ds-dark-mini">
            <svg className="ds-mini-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5Z" />
              <circle cx="10" cy="10" r="2.2" />
            </svg>
            <h3>4-Signal Behavioral Engine</h3>
            <p>Correlates adaptive canaries, control-plane triggers, 64 KB Shannon entropy deltas, and multi-principal AI swarms.</p>
          </div>
          <div className="ds-dark-mini">
            <svg className="ds-mini-ico" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3.5" y="2.8" width="13" height="14.4" rx="1.8" />
              <path d="M6.8 7h6.4M6.8 10.2h6.4M6.8 13.4h4" />
            </svg>
            <h3>1-Click Bit-for-Bit WORM Restore</h3>
            <p>Automated cleanup of attacker .locked artifacts, pre-flight previews, and verified SHA-256 recovery.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
