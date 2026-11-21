import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { TelemetryEvent } from '../shared/types.ts';

interface EntropyChartProps {
  events: TelemetryEvent[];
  deltaThreshold: number;
  onSelectEvent?: (event: TelemetryEvent) => void;
}

export const EntropyTimeSeriesChart: React.FC<EntropyChartProps> = ({
  events,
  deltaThreshold,
  onSelectEvent,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = useMemo(() => {
    return [...events]
      .filter((e) => typeof e.entropy === 'number' && e.entropy > 0)
      .slice(0, 56)
      .reverse();
  }, [events]);

  const width = 680;
  const height = 186;
  const pad = { top: 14, right: 14, bottom: 22, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yMin = 3.0;
  const yMax = 8.2;
  const toY = (h: number) =>
    pad.top + ((yMax - Math.min(yMax, Math.max(yMin, h))) / (yMax - yMin)) * plotH;
  const toX = (idx: number) =>
    points.length <= 1 ? pad.left + plotW / 2 : pad.left + (idx / (points.length - 1)) * plotW;

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${toX(idx).toFixed(1)} ${toY(pt.entropy ?? 4).toFixed(1)}`,
      )
      .join(' ');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length < 2) return '';
    const lastX = toX(points.length - 1).toFixed(1);
    const firstX = toX(0).toFixed(1);
    const baseY = (pad.top + plotH).toFixed(1);
    return `${pathD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [pathD, points.length, plotH]);

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const encryptGuideY = toY(7.5);

  return (
    <div className="relative">
      <div className="mb-2.5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--ink-primary)]">
            Shannon Entropy Stream (64 KB Sample)
          </h3>
          <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
            Threshold ΔH ≥ {deltaThreshold.toFixed(1)} · Click any sample to inspect payload
          </p>
        </div>
        {hovered ? (
          <div className="text-right font-mono text-[13px] tabular-nums">
            <span className="text-[var(--ink-primary)]">H {hovered.entropy?.toFixed(3)}</span>
            {typeof hovered.deltaEntropy === 'number' && (
              <span
                className={`ml-2 ${
                  hovered.deltaEntropy >= deltaThreshold ? 'text-[var(--signal-crimson)]' : 'text-[var(--ink-secondary)]'
                }`}
              >
                ΔH {hovered.deltaEntropy >= 0 ? '+' : ''}
                {hovered.deltaEntropy.toFixed(2)}
              </span>
            )}
            <div className="text-[13px] text-[var(--ink-muted)] truncate max-w-[230px]">
              {hovered.key || hovered.apiOp}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
            <span>{points.length} samples</span>
            <span>·</span>
            <span>3.0–8.0 bits/B</span>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="flex h-[186px] items-center justify-center rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)]/60 text-[13px] text-[var(--ink-muted)]">
          Trigger a scenario in Simulator (or press ⌘K) to stream live 64 KB entropy telemetry.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[186px] w-full select-none overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="enterpriseEntropyArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-indigo)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[4, 5, 6, 7, 8].map((tick) => {
            const y = toY(tick);
            return (
              <g key={tick}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke="var(--border-hairline)"
                  strokeWidth="1"
                />
                <text
                  x={pad.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="var(--ink-muted)"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {tick}.0
                </text>
              </g>
            );
          })}

          {/* Ciphertext zone threshold line */}
          <line
            x1={pad.left}
            y1={encryptGuideY}
            x2={width - pad.right}
            y2={encryptGuideY}
            stroke="var(--signal-crimson)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text
            x={width - pad.right}
            y={encryptGuideY - 5}
            textAnchor="end"
            fill="var(--signal-crimson)"
            fontSize="9.5"
            fontFamily="JetBrains Mono, monospace"
          >
            Ciphertext zone (H ≥ 7.5)
          </text>

          {/* Vertical Hover Crosshair */}
          {hoverIdx !== null && (
            <line
              x1={toX(hoverIdx)}
              y1={pad.top}
              x2={toX(hoverIdx)}
              y2={pad.top + plotH}
              stroke="var(--border-hairline)"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          )}

          {areaD && <path d={areaD} fill="url(#enterpriseEntropyArea)" />}
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent-indigo)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((pt, idx) => {
            const cx = toX(idx);
            const cy = toY(pt.entropy ?? 4);
            const flagged =
              pt.signals.includes('entropy_delta') ||
              pt.signals.includes('magic_header_lost') ||
              pt.signals.includes('ssec_abuse');
            const isActive = hoverIdx === idx;
            return (
              <g key={pt.id} className={onSelectEvent ? 'cursor-pointer' : ''}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 4.5 : flagged ? 3.5 : 2}
                  fill={flagged ? 'var(--signal-crimson)' : 'var(--signal-emerald)'}
                  stroke="var(--bg-base)"
                  strokeWidth="1.25"
                />
                <rect
                  x={cx - Math.max(5, plotW / Math.max(points.length, 12) / 2)}
                  y={pad.top}
                  width={Math.max(10, plotW / Math.max(points.length, 12))}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                  onClick={() => onSelectEvent?.(pt)}
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

interface RiskGaugeProps {
  score: number;
  watchlistThreshold: number;
  containThreshold: number;
  mode: 'active' | 'dry-run';
}

export const RiskScoreGauge: React.FC<RiskGaugeProps> = ({
  score,
  watchlistThreshold,
  containThreshold,
  mode,
}) => {
  const clamped = Math.min(120, Math.max(0, score));
  const pct = clamped / 120;
  const radius = 66;
  const strokeWidth = 8;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  const color =
    score >= containThreshold
      ? 'var(--signal-crimson)'
      : score >= watchlistThreshold
        ? 'var(--signal-amber)'
        : 'var(--signal-emerald)';

  const postureLabel =
    score >= containThreshold
      ? mode === 'dry-run'
        ? 'P0 Logged (Dry-Run)'
        : 'P0 Contained'
      : score >= watchlistThreshold
        ? 'P1 Watchlist'
        : 'Nominal Posture';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-[112px] w-[180px]">
        <svg viewBox="0 0 180 108" className="h-full w-full overflow-visible">
          <path
            d="M 24 90 A 66 66 0 0 1 156 90"
            fill="none"
            stroke="var(--border-hairline)"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
          <motion.path
            d="M 24 90 A 66 66 0 0 1 156 90"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <div className="font-mono text-[30px] font-semibold leading-none tracking-tight text-[var(--ink-primary)] tabular-nums">
            {score}
          </div>
          <div className="mt-1 font-mono text-[13px] font-medium" style={{ color }}>
            {postureLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 flex w-full items-center justify-between border-t border-[var(--border-hairline)] pt-2.5 font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
        <span>Watchlist {watchlistThreshold}</span>
        <span>Contain {containThreshold}</span>
      </div>
    </div>
  );
};

interface SignalBarsProps {
  counts: Record<string, number>;
}

const SIGNAL_LABELS: Record<string, string> = {
  versioning_suspend: 'Versioning Sabotage',
  version_purge: 'Version Purge',
  lifecycle_expiry: 'Lifecycle Expiry ≤1d',
  object_lock_tamper: 'Object Lock Tamper',
  canary_write: 'Canary Modification',
  canary_read: 'Canary Read',
  entropy_delta: 'Entropy Delta (ΔH)',
  magic_header_lost: 'Magic Header Lost',
  rename_burst: 'Rename/Delete Burst',
  ssec_abuse: 'Native SSE-C Copy',
  untrusted_kms: 'Untrusted KMS ARN',
  swarm_correlation: 'Cross-Principal Swarm',
};

export const SignalBreakdownBars: React.FC<SignalBarsProps> = ({ counts }) => {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-[13px] text-[var(--ink-muted)]">
        Run a benchmark suite to inspect measured signal attribution.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.map(([signal, count]) => {
        const widthPct = Math.max(5, (count / max) * 100);
        return (
          <div key={signal}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-[var(--ink-primary)]">{SIGNAL_LABELS[signal] ?? signal}</span>
              <span className="font-mono text-[var(--ink-secondary)] tabular-nums">{count}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-[var(--bg-hover)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-[var(--accent-indigo)]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
