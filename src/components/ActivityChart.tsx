import React, { useId, useMemo, useState } from 'react';
import type { TelemetryEvent } from '../shared/types.ts';

function chartPath(values: number[], width: number, height: number, maximum: number) {
  return values.map((value, index) => `${index ? 'L' : 'M'} ${32 + index * (width - 48) / Math.max(1, values.length - 1)} ${height - 28 - value / maximum * (height - 48)}`).join(' ');
}

export function MetricSparkline({ values, label }: { values: number[]; label: string }) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return <div className="sparkline-empty">No benchmark data</div>;
  const maximum = Math.max(1, ...clean);
  const points = clean.map((value, index) => [clean.length === 1 ? 160 : index * 320 / (clean.length - 1), 52 - value / maximum * 42]);
  return <svg className="metric-sparkline" viewBox="0 0 320 62" role="img" aria-label={`${label}, ${clean.length} recorded benchmark runs`} preserveAspectRatio="none">
    <path d="M 0 53 H 320" stroke="var(--border-hairline)" />
    {points.length > 1 && <path d={points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')} fill="none" stroke="var(--accent-text)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
    {points.map(([x,y],index) => <circle key={index} cx={x} cy={y} r="2.5" fill="var(--accent-text)"><title>{clean[index]}</title></circle>)}
  </svg>;
}

export function ActivityChart({ events }: { events: TelemetryEvent[] }) {
  const [windowSize, setWindowSize] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);
  const gradient = useId().replaceAll(':', '');
  const chart = useMemo(() => {
    const records = events.filter(event => Number.isFinite(event.serverTimestampMs));
    if (!records.length) return null;
    const end = Math.max(...records.map(event => event.serverTimestampMs));
    const earliest = Math.min(...records.map(event => event.serverTimestampMs));
    const start = windowSize === 'all' ? Math.min(earliest, end - 60000) : end - Number(windowSize) * 60000;
    const buckets = Array.from({ length: 24 }, (_, index) => ({ at: start + index * (end - start) / 24, total: 0, flagged: 0 }));
    for (const event of records) {
      if (event.serverTimestampMs < start) continue;
      const index = Math.min(23, Math.floor((event.serverTimestampMs - start) / (end - start) * 24));
      buckets[index].total++;
      if (event.signals.length > 0) buckets[index].flagged++;
    }
    return { buckets, start, end, total: buckets.reduce((sum, bucket) => sum + bucket.total, 0), flagged: buckets.reduce((sum, bucket) => sum + bucket.flagged, 0) };
  }, [events, windowSize]);
  const width = 760;
  const height = 180;
  const maximum = Math.max(1, ...(chart?.buckets.map(bucket => bucket.total) || []));
  const totalPath = chartPath(chart?.buckets.map(bucket => bucket.total) || [], width, height, maximum);
  const flaggedPath = chartPath(chart?.buckets.map(bucket => bucket.flagged) || [], width, height, maximum);
  const hovered = selected !== null ? chart?.buckets[selected] : null;
  const time = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return <section className="activity-panel" aria-label="Recorded storage activity">
    <div className="panel-title"><h2>Storage activity</h2><select aria-label="Activity time window" value={windowSize} onChange={event => { setWindowSize(event.target.value); setSelected(null); }}><option value="all">All retained events</option><option value="15">Latest 15 minutes</option><option value="60">Latest hour</option></select></div>
    <div className="activity-legend"><span><i />Requests <strong>{chart?.total ?? 0}</strong></span><span className="flagged"><i />Flagged <strong>{chart?.flagged ?? 0}</strong></span><span className="activity-window">{hovered ? `${time(hovered.at)} · ${hovered.total} requests · ${hovered.flagged} flagged` : 'Window ends at the latest recorded event'}</span></div>
    {!chart ? <div className="activity-empty">Upload a file or run a test to record storage activity.</div> : <>
      <svg viewBox={`0 0 ${width} ${height}`} className="activity-chart" role="group" aria-label="Request and flagged-event counts over time">
        <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent-indigo)" stopOpacity=".13" /><stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity=".01" /></linearGradient></defs>
        {[0, maximum / 2, maximum].map((value, index) => { const y = height - 28 - value / maximum * (height - 48); return <g key={index}><path d={`M32 ${y} H${width - 16}`} stroke="var(--border-hairline)" strokeDasharray="3 4" /><text x="23" y={y + 4} textAnchor="end" fill="var(--ink-muted)" fontSize="10">{Number(value.toFixed(1))}</text></g>; })}
        <path d={`${totalPath} L${width - 16} ${height - 28} L32 ${height - 28} Z`} fill={`url(#${gradient})`} />
        <path d={totalPath} fill="none" stroke="var(--accent-text)" strokeWidth="1.8" />
        <path d={flaggedPath} fill="none" stroke="var(--signal-amber)" strokeWidth="1.6" strokeDasharray="4 3" />
        {chart.buckets.map((bucket, index) => <rect key={index} x={32 + index * (width - 48) / 24} y="16" width={(width - 48) / 24} height={height - 40} fill="transparent" role="button" tabIndex={0} aria-label={`${time(bucket.at)}, ${bucket.total} requests, ${bucket.flagged} flagged`} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} />)}
        <text x="32" y={height - 6} fill="var(--ink-muted)" fontSize="10">{time(chart.start)}</text><text x={width - 16} y={height - 6} textAnchor="end" fill="var(--ink-muted)" fontSize="10">{time(chart.end)}</text>
      </svg>
    </>}
  </section>;
}
