import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Disposable local stores only. Cloud credentials are deliberately absent from this test.
const victimRoot = path.resolve(import.meta.dir, '..');
const defenderRoot = path.dirname(victimRoot);
const defenderData = await fs.mkdtemp(path.join(os.tmpdir(), 'defyswarm-victim-'));
const localData = await fs.mkdtemp(path.join(victimRoot, 'data/test-run-local-'));
const protectedData = await fs.mkdtemp(path.join(victimRoot, 'data/test-run-protected-'));
const processes = [];
const token = crypto.randomBytes(24).toString('hex');
const clean = Buffer.from('Disposable defense verification file.\n'.repeat(100));
const invalid = Buffer.alloc(clean.length, 0);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const key = 'proof.txt';
const apiKey = 'finance-ops-key';
const recoveryKey = 'backup-service';

function start(command, args, cwd, environment) {
  const child = spawn(command, args, {
    cwd, env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', bytes => process.stderr.write(bytes));
  processes.push(child);
  return child;
}
async function waitFor(url, child) {
  for (let index = 0; index < 80; index++) {
    if (child.exitCode !== null) throw new Error('Test server exited before startup.');
    const result = await fetch(url, { signal: AbortSignal.timeout(500) }).catch(() => null);
    if (result?.ok) return;
    await delay(100);
  }
  throw new Error('Test server startup timed out.');
}
async function upload(base, bytes, principal = apiKey) {
  return fetch(base + '/api/files', {
    method: 'POST', body: bytes,
    headers: { 'x-api-key': principal, 'x-filename': key, 'Content-Type': 'text/plain' },
  });
}
async function download(base, id) {
  const response = await fetch(base + '/api/files/' + id, { headers: { 'x-api-key': recoveryKey } });
  assert.equal(response.status, 200, await response.clone().text());
  return Buffer.from(await response.arrayBuffer());
}
try {
  const defender = start('node', ['--import', path.join(defenderRoot, 'node_modules/tsx/dist/loader.mjs'), path.join(defenderRoot, 'server.ts')], defenderData, {
    PORT: '34211', NODE_ENV: 'production', GROQ_API_KEY: '', S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '',
    S3_VAULT_ACCESS_KEY_ID: '', S3_VAULT_SECRET_ACCESS_KEY: '', DEFYSWARM_INGEST_TOKEN: token,
  });
  await waitFor('http://127.0.0.1:34211/api/bootstrap', defender);
  const common = { DEFYSWARM_INGEST_TOKEN: token, DEFYSWARM_BUCKET: 'finance-prod', DEFYSWARM_PREFIX: 'defyswarm-victim-test/verification/' };
  const local = start('bun', ['server/index.js'], victimRoot, { ...common, PORT: '34212', DEFYSWARM_URL: '', DRIVEVAULT_DATA_ROOT: localData });
  const protectedApp = start('bun', ['server/index.js'], victimRoot, { ...common, PORT: '34213', DEFYSWARM_URL: 'http://127.0.0.1:34211', DRIVEVAULT_DATA_ROOT: protectedData });
  await Promise.all([waitFor('http://127.0.0.1:34212/api/health', local), waitFor('http://127.0.0.1:34213/api/health', protectedApp)]);
  for (const [mode, base] of [['unprotected', 'http://127.0.0.1:34212'], ['protected', 'http://127.0.0.1:34213']]) {
    const initial = await upload(base, clean);
    assert.equal(initial.status, 201, await initial.clone().text());
    const id = (await initial.json()).file.id;
    assert.equal(hash(await download(base, id)), hash(clean));
    const statuses = [];
    for (let index = 0; index < 5; index++) statuses.push((await upload(base, invalid)).status);
    if (mode === 'unprotected') {
      assert.deepEqual(statuses, [201, 201, 201, 201, 201]);
      assert.notEqual(hash(await download(base, id)), hash(clean));
      assert.equal((await upload(base, clean, recoveryKey)).status, 201);
      assert.equal(hash(await download(base, id)), hash(clean));
      console.log(JSON.stringify({ mode, writeStatuses: statuses, restoredHashMatches: true }));
      continue;
    }
    assert.ok(statuses.includes(403), 'Protected requests must be rejected after containment.');
    const state = await (await fetch('http://127.0.0.1:34211/api/bootstrap')).json();
    const incident = state.incidents.find(item => item.principals.includes('drivevault-finance-ops-key'));
    assert.ok(incident);
    const restore = await fetch('http://127.0.0.1:34211/api/incidents/' + incident.id + '/restore', { method: 'POST' });
    assert.equal(restore.status, 200);
    const report = (await restore.json()).report;
    assert.equal(report.restoreAccuracyPct, 100);
    assert.equal(report.filesUnrecoverable, 0);
    assert.equal(hash(await download(base, id)), hash(clean));
    console.log(JSON.stringify({ mode, writeStatuses: statuses, signals: incident.signals, restoredHashMatches: true, adapter: 'isolated-local' }));
  }
  console.log('Verified the same bounded overwrite, containment, and SHA-256 recovery flow through both DriveVault modes.');
} finally {
  await Promise.all(processes.map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
  })));
  for (const directory of [defenderData, localData, protectedData]) await fs.rm(directory, { recursive: true, force: true });
}
