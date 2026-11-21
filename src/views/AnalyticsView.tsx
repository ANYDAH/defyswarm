import React, { useState } from 'react';
import { BarChart3, Download, Play } from 'lucide-react';
import { SystemFlow } from '../components/SystemFlow.tsx';
import { MetricSparkline } from '../components/ActivityChart.tsx';
import { SignalBreakdownBars } from '../components/Charts.tsx';
import { useConsole } from '../context/ConsoleContext.tsx';

export const AnalyticsView: React.FC = () => {
  const { state, apiFetch, pushToast, benchmarkProgress, setBenchmarkProgress } = useConsole();
  const [iterations, setIterations] = useState(30);
  const [compareIdx, setCompareIdx] = useState<number>(1);

  if (!state) return null;

  const latest = state.benchmarks[0] ?? null;
  const previous = state.benchmarks[compareIdx] ?? null;

  const runBenchmark = async () => {
    setBenchmarkProgress({
      running: true,
      completed: 0,
      total: iterations * 4,
      stage: 'Initializing isolated benchmark stores…',
    });
    try {
      const res = await apiFetch<{ ok: boolean; benchmark: { id: string; durationMs: number } }>(
        '/api/benchmarks/run',
        {
          method: 'POST',
          body: JSON.stringify({ iterations }),
        },
      );
      pushToast({
        title: 'Benchmark Suite Complete',
        detail: `${res.benchmark.id} finished ${iterations} runs/scenario in ${res.benchmark.durationMs} ms.`,
        tone: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Benchmark failed',
        detail: err instanceof Error ? err.message : 'Unable to execute benchmark.',
        tone: 'error',
      });
    } finally {
      setBenchmarkProgress((prev) => ({ ...prev, running: false }));
    }
  };

  const exportBenchmarkJson = () => {
    if (!latest) return;
    const blob = new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defyswarm-benchmark-${latest.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stdMetrics = latest?.scenarios[1];
  const prevStd = previous?.scenarios[1];

  return (
    <div className="flex flex-col min-h-full bg-[var(--bg-base)]">
      {/* Flush Institutional Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] px-5 py-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink-primary)] leading-tight">
            Analytics
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--ink-secondary)]">
            Median and p95 timings from isolated local fixtures. The suite uses synthetic alerts and does not measure cloud latency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            disabled={benchmarkProgress.running}
            className="h-[30px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
          >
            <option value={30}>30 runs / scenario (PRD)</option>
            <option value={15}>15 runs / scenario (Quick)</option>
          </select>

          {latest && (
            <button
              type="button"
              onClick={exportBenchmarkJson}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-[var(--ink-secondary)]" />
              Export JSON
            </button>
          )}

          <button
            type="button"
            disabled={benchmarkProgress.running}
            onClick={runBenchmark}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-3.5 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5" />
            {benchmarkProgress.running ? 'Running Suite…' : 'Run Benchmark Suite'}
          </button>
        </div>
      </div>

      <div className="analytics-summary">
        <SystemFlow state={state} />
        <section className="benchmark-trends" aria-label="Benchmark history">
          <div className="panel-title"><h2>Benchmark trends</h2><span>{state.benchmarks.length} recorded suites · local fixtures</span></div>
          <div className="trend-grid">
            {[
              { label: 'Detection p95', unit: 'ms', values: [...state.benchmarks].reverse().map(run => run.scenarios[1]?.mttdP95Ms) },
              { label: 'Containment p95', unit: 'ms', values: [...state.benchmarks].reverse().map(run => run.scenarios[1]?.mttcP95Ms) },
              { label: 'Restore accuracy', unit: '%', values: [...state.benchmarks].reverse().map(run => run.scenarios[3]?.restoreAccuracyPct) },
            ].map(metric => <div className="trend-cell" key={metric.label}><p>{metric.label}</p><strong>{metric.values.length ? metric.values[metric.values.length - 1] ?? '—' : '—'}<small>{metric.unit}</small></strong><MetricSparkline values={metric.values} label={metric.label} /></div>)}
          </div>
        </section>
      </div>

      {/* Live Progress Strip */}
      {benchmarkProgress.running && (
        <div className="border-b border-[var(--accent-indigo)]/30 bg-[var(--accent-indigo)]/[0.08] px-5 py-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-[var(--ink-primary)]">{benchmarkProgress.stage}</span>
            <span className="font-mono text-[var(--accent-text)] tabular-nums">
              {benchmarkProgress.completed} / {benchmarkProgress.total} runs
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-[3px] bg-[var(--bg-hover)]">
            <div
              className="h-full bg-[var(--accent-indigo)] transition-all duration-150"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    (benchmarkProgress.completed / Math.max(1, benchmarkProgress.total)) * 100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {!latest ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-pane)] text-[var(--accent-text)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-[15px] font-semibold text-[var(--ink-primary)]">No Benchmark Runs Yet</h3>
          <p className="mt-1 max-w-md text-[13px] text-[var(--ink-secondary)]">
            Run the 30-iteration benchmark harness to measure real median &amp; p95 MTTD, MTTC,
            files preserved, false-positive rate, and SHA-256 restore accuracy.
          </p>
          <button
            type="button"
            onClick={runBenchmark}
            className="mt-4 inline-flex h-[32px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-indigo)] px-4 text-[13px] font-medium text-[var(--on-accent)] hover:bg-[var(--accent-indigo-hover)]"
          >
            <Play className="h-3.5 w-3.5" />
            Run 30-Run Benchmark Suite
          </button>
        </div>
      ) : (
        <>
          {/* Full-Width High-Density 34px Scenario Scoreboard */}
          <section className="border-b border-[var(--border-hairline)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                  Scenario Scoreboard · <span className="font-mono">{latest.id}</span>
                </h2>
                <span className="font-mono text-[13px] text-[var(--ink-muted)] tabular-nums">
                  {latest.iterationsPerScenario} iter/scenario · {latest.durationMs} ms · adapter=
                  {latest.adapter}
                </span>
              </div>
              <span
                className={`font-mono text-[13px] font-semibold uppercase tracking-[0.03em] ${
                  latest.overallPass ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-amber)]'
                }`}
              >
                {latest.overallPass ? 'ALL TARGETS PASSED' : 'REVIEW REQUIRED'}
              </span>
            </div>

            <div className="overflow-x-auto bg-[var(--bg-base)]">
              <table className="w-full min-w-[780px] text-left text-[13px]">
                <thead>
                  <tr className="h-[30px] border-b border-[var(--border-hairline)] bg-[var(--bg-rail)] text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                    <th className="pl-5 pr-3">Scenario</th>
                    <th className="px-3 text-right">Runs</th>
                    <th className="px-3 text-right">MTTD Med / p95</th>
                    <th className="px-3 text-right">MTTC Med / p95</th>
                    <th className="px-3 text-right">Preserved Med</th>
                    <th className="px-3 text-right">False Alarms</th>
                    <th className="px-3 text-right">Restore Acc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] tabular-nums">
                  {latest.scenarios.map((s) => (
                    <tr
                      key={s.scenario}
                      className="h-[40px] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <td className="pl-5 pr-3 font-medium text-[var(--ink-primary)]">{s.scenario}</td>
                      <td className="px-3 text-right font-mono text-[var(--ink-secondary)]">{s.runs}</td>
                      <td className="px-3 text-right font-mono text-[var(--ink-primary)]">
                        {s.mttdMedianMs > 0 ? `${s.mttdMedianMs} / ${s.mttdP95Ms} ms` : '—'}
                      </td>
                      <td className="px-3 text-right font-mono text-[var(--ink-primary)]">
                        {s.mttcMedianMs > 0 ? `${s.mttcMedianMs} / ${s.mttcP95Ms} ms` : '—'}
                      </td>
                      <td className="px-3 text-right font-mono text-[var(--signal-emerald)]">
                        {s.filesPreservedMedianPct}%
                      </td>
                      <td className="px-3 text-right font-mono">
                        <span className={s.falseAlarms === 0 ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-crimson)]'}>
                          {s.falseAlarms}
                        </span>
                      </td>
                      <td className="px-3 text-right font-mono text-[var(--signal-emerald)]">
                        {s.restoreAccuracyPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lower 2-Column Hairline Split Pane */}
          <div className="grid flex-1 grid-cols-1 divide-y divide-[var(--border-hairline)] lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
            {/* Left Pane: Detections by Signal */}
            <section className="flex flex-col">
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
                <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">Detections by Signal</h2>
                <span className="font-mono text-[13px] text-[var(--ink-muted)]">
                  All attack iterations · {latest.id}
                </span>
              </div>
              <div className="p-5">
                <SignalBreakdownBars counts={latest.detectionsBySignal} />
              </div>
            </section>

            {/* Right Pane: Honest Evasion Audit + Run-to-Run Comparison stacked */}
            <div className="flex flex-col divide-y divide-[var(--border-hairline)]">
              <section>
                <div className="flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2.5">
                  <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                    Failed and Slow Checks
                  </h2>
                  <span className="text-[13px] text-[var(--ink-muted)]">Unfiltered reporting</span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[13px] text-[var(--ink-secondary)] leading-relaxed">
                    Counts runs with failed assertions or detection and containment timings above the targets.
                  </p>
                  <div className="mt-3 divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] text-[13px] tabular-nums">
                    {latest.scenarios
                      .map((s) => (
                        <div
                          key={s.scenario}
                          className="flex h-[40px] items-center justify-between"
                        >
                          <span className="text-[var(--ink-primary)]">{s.scenario}</span>
                          <span
                            className={`font-mono ${
                              s.evasionOrLateRuns === 0 ? 'text-[var(--signal-emerald)]' : 'text-[var(--signal-amber)]'
                            }`}
                          >
                            {s.evasionOrLateRuns} failed or slow runs
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </section>

              <section className="flex-1">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-pane)] px-5 py-2">
                  <h2 className="text-[13px] font-semibold text-[var(--ink-primary)]">
                    Run-to-Run Comparison
                  </h2>
                  {state.benchmarks.length > 1 && (
                    <select
                      value={compareIdx}
                      onChange={(e) => setCompareIdx(Number(e.target.value))}
                      className="h-[26px] rounded-[6px] border border-[var(--border-hairline)] bg-[var(--bg-base)] px-2 font-mono text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-indigo)] focus:outline-none"
                    >
                      {state.benchmarks.slice(1).map((bm, i) => (
                        <option key={bm.id} value={i + 1}>
                          vs {bm.id} ({bm.iterationsPerScenario}x)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!previous || !prevStd || !stdMetrics ? (
                  <div className="px-5 py-4 text-[13px] text-[var(--ink-secondary)]">
                    Run a second benchmark suite to compare MTTD, MTTC, and preserved files across
                    policy changes.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 divide-x divide-[var(--border-hairline)] tabular-nums">
                    <div className="px-5 py-4">
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        Std MTTD Med
                      </p>
                      <p className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink-primary)]">
                        {stdMetrics.mttdMedianMs} ms
                      </p>
                      <p className="mt-0.5 font-mono text-[13px] text-[var(--ink-muted)]">
                        was {prevStd.mttdMedianMs} ms
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        Std MTTC Med
                      </p>
                      <p className="mt-1 font-mono text-[14px] font-semibold text-[var(--ink-primary)]">
                        {stdMetrics.mttcMedianMs} ms
                      </p>
                      <p className="mt-0.5 font-mono text-[13px] text-[var(--ink-muted)]">
                        was {prevStd.mttcMedianMs} ms
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                        Preserved %
                      </p>
                      <p className="mt-1 font-mono text-[14px] font-semibold text-[var(--signal-emerald)]">
                        {stdMetrics.filesPreservedMedianPct}%
                      </p>
                      <p className="mt-0.5 font-mono text-[13px] text-[var(--ink-muted)]">
                        was {prevStd.filesPreservedMedianPct}%
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
