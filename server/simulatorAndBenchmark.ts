import { randomUUID } from 'node:crypto';
import type {
  BenchmarkScenarioMetrics,
  BenchmarkSuiteResult,
  BucketConfig,
  PolicyConfig,
  SimAssertion,
  SimRunState,
  SimScenarioId,
} from '../src/shared/types.ts';
import { generateRealisticFileBuffer } from './cryptoUtils.ts';
import { DetectionEngine, type IncomingStorageEvent } from './detectionEngine.ts';
import { LocalObjectStoreAdapter, SERVICE_PRINCIPAL } from './storageAdapter.ts';

const scenarioIds: readonly SimScenarioId[] = [
  'benign_bulk', 'benign_compressed', 'benign_rename', 'benign_backup_sync',
  'standard_ransomware', 'stealth_ai_swarm', 'recovery_verification',
];

const benchmarkScenarios = [
  ['benign_bulk', '1. Routine Uploads'],
  ['standard_ransomware', '2. Versioning Alert Replay'],
  ['stealth_ai_swarm', '3. Multi-Principal Alert Replay'],
  ['recovery_verification', '4. Recovery Verification'],
] as const;

export function isSimulationScenario(value: unknown): value is SimScenarioId {
  return scenarioIds.some((scenario) => scenario === value);
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1] ?? 0;
}

function assertion(id: string, label: string, passed: boolean, detail?: string): SimAssertion {
  return { id, label, status: passed ? 'pass' : 'fail', detail };
}

function runFixture(scenario: SimScenarioId, config: BucketConfig, policy: PolicyConfig) {
  const store = new LocalObjectStoreAdapter();
  const engine = new DetectionEngine(store, () => policy);
  const bucket = config.name;
  store.registerBucket({ ...config, adapter: 'local' });
  const scenarioTag = scenario;
  const assertions: SimAssertion[] = [];
  const record = (event: Omit<IncomingStorageEvent, 'bucket' | 'serverTimestampMs' | 'source' | 'scenarioTag'>) =>
    engine.ingestEvent({ ...event, bucket, serverTimestampMs: Date.now(), source: 'simulator', scenarioTag });

  const baselineKey = 'demo-fixtures/recovery-record.txt';
  const baseline = Buffer.from('DefySwarm sample recovery record.\n');
  store.putObject({ bucket, key: baselineKey, buffer: baseline, principalId: SERVICE_PRINCIPAL });
  const baselineHash = store.getLatestVersion(bucket, baselineKey)?.sha256;
  const started = Date.now();
  const principals: string[] = [];
  let filesLost = 0;
  let restoreAccuracy = 0;
  let restoreTime = 0;

  if (scenario === 'benign_backup_sync') {
    store.seedDeterministicCanaries(bucket);
    for (const key of store.getLiveObjectKeys(bucket, true)) {
      const principalId = 'backup-agent';
      const { httpStatus } = store.getObject({ bucket, key, principalId });
      record({ plane: 'data', apiOp: 'GetObject', principalId, key, httpStatus });
    }
  } else if (scenario === 'benign_bulk' || scenario === 'benign_compressed' || scenario === 'benign_rename') {
    const formats = scenario === 'benign_compressed' ? (['jpg', 'docx'] as const) : (['pdf', 'csv', 'txt'] as const);
    const principalId = 'ci-deployer';
    for (let i = 0; i < 15; i++) {
      const format = formats[i % formats.length];
      const key = scenario === 'benign_rename' ? `demo-fixtures/archived-${i}.txt` : `demo-fixtures/document-${i}.${format}`;
      const buffer = scenario === 'benign_rename' ? baseline : generateRealisticFileBuffer(format, 'Routine document fixture', 4096);
      const result = store.putObject({ bucket, key, buffer, principalId });
      record({ ...result, plane: 'data', apiOp: 'PutObject', key, principalId });
    }
  } else if (scenario === 'standard_ransomware') {
    const principalId = 'fixture-versioning';
    principals.push(principalId);
    const event = record({
      plane: 'control', apiOp: 'PutBucketVersioning', principalId, httpStatus: 200,
      versioningTargetStatus: 'Suspended',
    });
    assertions.push(assertion('detect', 'Versioning alert detected', event.signals.includes('versioning_suspend')));
  } else if (scenario === 'stealth_ai_swarm') {
    let correlated = false;
    for (let i = 0; i < 12; i++) {
      const principalId = `fixture-principal-${i + 1}`;
      principals.push(principalId);
      const event = record({
        plane: 'data', apiOp: 'PutObject', principalId, key: baselineKey, httpStatus: 200,
        magicValid: false, entropy: 7.9,
      });
      correlated ||= event.signals.includes('swarm_correlation');
    }
    assertions.push(assertion('correlate', 'Multi-principal alert detected', correlated));
  } else {
    const principalId = 'fixture-recovery';
    // A fixed invalid document in the disposable store gives restore a real byte comparison.
    const sample = store.putObject({ bucket, key: baselineKey, buffer: Buffer.alloc(32), principalId });
    filesLost = Number(store.getLatestVersion(bucket, baselineKey)?.sha256 !== baselineHash);
    record({
      ...sample, plane: 'data', apiOp: 'PutObject', principalId, key: baselineKey,
      sseAlgorithm: 'AES256-SSE-C',
    });
    const incident = engine.incidents[0];
    if (incident) {
      const { report } = engine.executeOneClickRestore(incident.id);
      restoreAccuracy = report.restoreAccuracyPct;
      restoreTime = report.durationMs;
    }
    const restored = filesLost === 1 && restoreAccuracy === 100 &&
      store.getLatestVersion(bucket, baselineKey)?.sha256 === baselineHash;
    assertions.push(assertion('sha256', 'Vault restored the original SHA-256 digest', restored));
  }

  const incident = engine.incidents[0];
  if (principals.length > 0) {
    const denied = principals.map((principalId) => {
      const { httpStatus } = store.getObject({ bucket, key: baselineKey, principalId });
      record({ plane: 'data', apiOp: 'GetObject', key: baselineKey, principalId, httpStatus });
      return httpStatus === 403;
    });
    const intact = store.getLatestVersion(bucket, baselineKey)?.sha256 === baselineHash;
    filesLost = Number(!intact);
    assertions.push(
      assertion('contain', 'Local access denied for fixture principals', denied.every(Boolean),
        `${denied.filter(Boolean).length}/${denied.length} local read probes returned status 403.`),
      assertion('preserve', 'Sample document remains intact', intact),
    );
  }
  const benign = scenario.startsWith('benign_');
  if (benign) {
    assertions.push(
      assertion('workload', 'Sample operations accepted', engine.events.length > 0 && engine.events.every((event) => event.httpStatus === 200)),
      assertion('zero_alerts', 'Zero false alerts', !incident),
    );
  }

  const detectionTime = incident ? incident.detectedAtMs - started : 0;
  return {
    assertions,
    passed: assertions.every((item) => item.status === 'pass'),
    incident,
    falseAlarm: benign && Boolean(incident),
    detectionTime,
    containmentTime: incident?.mttcMs ?? 0,
    filesLost,
    restoreAccuracy,
    restoreTime,
  };
}

export class SimulatorAndBenchmarkRunner {
  public simState: SimRunState = { running: false, bucket: 'finance-prod', assertions: [] };
  private benchmarking = false;

  constructor(
    private store: LocalObjectStoreAdapter,
    private getPolicy: () => PolicyConfig,
    private broadcastSim: (state: SimRunState) => void,
    private broadcastBenchProgress: (progress: { completed: number; total: number; stage: string }) => void,
  ) {}

  public verifyBlastRadiusLock(bucketName: string): { allowed: boolean; reason: string } {
    const allowed = this.store.buckets.get(bucketName)?.tags.env === 'ransomware-sim-only';
    return {
      allowed,
      reason: allowed
        ? 'Simulation uses an isolated copy of the bucket configuration.'
        : 'Select a demo bucket tagged env=ransomware-sim-only.',
    };
  }

  public async runScenario(scenario: SimScenarioId, bucketName: string): Promise<SimRunState> {
    if (this.simState.running) throw new Error('A simulation is already running.');
    const config = this.store.buckets.get(bucketName);
    const lock = this.verifyBlastRadiusLock(bucketName);
    if (!lock.allowed || !config) throw new Error(lock.reason);
    this.simState = { running: true, scenario, bucket: bucketName, startedAt: new Date().toISOString(), assertions: [] };
    this.broadcastSim(this.simState);
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      const result = runFixture(scenario, config, structuredClone(this.getPolicy()));
      this.simState.assertions = result.assertions;
      this.simState.summary = result.passed ? 'All isolated fixture checks passed.' : 'Review the failed fixture checks.';
    } catch (error) {
      this.simState.summary = error instanceof Error ? error.message : 'Fixture execution failed.';
      throw error;
    } finally {
      this.simState.running = false;
      this.simState.completedAt = new Date().toISOString();
      this.broadcastSim(this.simState);
    }
    return this.simState;
  }

  public async runBenchmarkSuite(iterationsPerScenario = 30): Promise<BenchmarkSuiteResult> {
    if (this.benchmarking) throw new Error('A benchmark is already running.');
    const runs = Math.max(10, Math.min(50, Math.trunc(iterationsPerScenario)));
    const policy = structuredClone(this.getPolicy());
    policy.mode = 'active';
    const config = new LocalObjectStoreAdapter().buckets.get('finance-prod')!;
    const start = Date.now();
    const total = runs * benchmarkScenarios.length;
    const scenarios: BenchmarkScenarioMetrics[] = [];
    const detectionsBySignal: Record<string, number> = {};
    let completed = 0;
    this.benchmarking = true;
    try {
      for (const [id, scenario] of benchmarkScenarios) {
        const results: Array<ReturnType<typeof runFixture>> = [];
        for (let index = 0; index < runs; index++) {
          const result = runFixture(id, config, policy);
          results.push(result);
          for (const signal of result.incident?.signals ?? []) {
            detectionsBySignal[signal] = (detectionsBySignal[signal] ?? 0) + 1;
          }
          this.broadcastBenchProgress({ completed: ++completed, total, stage: scenario });
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
        const detectionTimes = results.filter((result) => result.incident).map((result) => result.detectionTime);
        const containmentTimes = results.filter((result) => result.containmentTime > 0).map((result) => result.containmentTime);
        const losses = results.map((result) => result.filesLost);
        const preserved = losses.map((loss) => 100 * (1 - loss));
        const lateRunDetails = results.flatMap((result, index) =>
          result.passed && result.detectionTime < 5000 && result.containmentTime < 10000
            ? []
            : [{ runIndex: index + 1, mttdMs: result.detectionTime, caughtBy: result.incident?.signals ?? [] }],
        );
        const falseAlarms = results.filter((result) => result.falseAlarm).length;
        scenarios.push({
          scenario, runs, falseAlarms, falsePositiveRatePct: 100 * falseAlarms / runs,
          mttdMedianMs: percentile(detectionTimes, 0.5), mttdP95Ms: percentile(detectionTimes, 0.95),
          mttcMedianMs: percentile(containmentTimes, 0.5), mttcP95Ms: percentile(containmentTimes, 0.95),
          filesPreservedMedianPct: percentile(preserved, 0.5), filesPreservedMinPct: Math.min(...preserved),
          filesLostMedian: percentile(losses, 0.5),
          restoreAccuracyPct: percentile(results.map((result) => result.restoreAccuracy), 0.5),
          restoreTimeMedianMs: percentile(results.map((result) => result.restoreTime), 0.5),
          evasionOrLateRuns: lateRunDetails.length,
          lateRunDetails,
        });
      }
      return {
        id: `BM-${randomUUID()}`, runAt: new Date().toISOString(), adapter: 'local',
        iterationsPerScenario: runs, durationMs: Date.now() - start, scenarios, detectionsBySignal,
        overallPass: scenarios.every((scenario) => scenario.evasionOrLateRuns === 0),
      };
    } finally {
      this.benchmarking = false;
    }
  }
}
