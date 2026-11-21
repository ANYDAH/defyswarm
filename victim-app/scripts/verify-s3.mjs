import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const victim = 'http://127.0.0.1:4100';
const defender = 'http://127.0.0.1:3000';
const response = await fetch(victim + '/api/health');
const health = await response.json();
assert.equal(health.storage.mode, 'defyswarm');
assert.ok(health.storage.prefix.startsWith('defyswarm-victim-test/'));
const state = await (await fetch(defender + '/api/bootstrap')).json();
assert.equal(state.storage.minioConnected, true, 'Reconnect S3 in DefySwarm before the cloud test.');
assert.equal(state.storage.minioVaultConfigured, true, 'Configure separate vault credentials.');
const identity = state.principals.find(item => item.id === 'drivevault-finance-ops-key');
assert.ok(!identity || identity.status === 'ACTIVE', 'The demo principal is already contained. Review its incident before running again.');
const name = 'bounded-test-' + crypto.randomUUID() + '.txt';
const baseline = Buffer.from('Disposable S3 recovery verification.\n'.repeat(100));
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
async function write(bytes) {
  return fetch(victim + '/api/files', {
    method: 'POST', body: bytes,
    headers: { 'x-api-key': 'finance-ops-key', 'x-filename': name, 'Content-Type': 'text/plain' },
  });
}
const initial = await write(baseline);
assert.equal(initial.status, 201, await initial.clone().text());
const id = (await initial.json()).file.id;
async function read() {
  const result = await fetch(victim + '/api/files/' + id, { headers: { 'x-api-key': 'backup-service' } });
  assert.equal(result.status, 200, await result.clone().text());
  return Buffer.from(await result.arrayBuffer());
}
assert.equal(hash(await read()), hash(baseline));
const statuses = [];
for (let index = 0; index < 5; index++) statuses.push((await write(Buffer.alloc(baseline.length))).status);
assert.ok(statuses.includes(403), 'The expected containment did not occur.');
const after = await (await fetch(defender + '/api/bootstrap')).json();
const incident = after.incidents.find(item => item.principals.includes('drivevault-finance-ops-key') && item.bucket === health.storage.bucket);
assert.ok(incident);
const restored = await fetch(defender + '/api/incidents/' + incident.id + '/restore', { method: 'POST' });
assert.equal(restored.status, 200, await restored.clone().text());
assert.equal(hash(await read()), hash(baseline), 'Cloud bytes do not match the original after recovery.');
console.log(JSON.stringify({ bucket: health.storage.bucket, objectKey: health.storage.prefix + name, incident: incident.id, writeStatuses: statuses, restoredHashMatches: true }, null, 2));
