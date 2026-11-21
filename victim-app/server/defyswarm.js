export const protectedStorage = Boolean(process.env.DEFYSWARM_URL);
const bucket = process.env.DEFYSWARM_BUCKET || '';
const prefix = process.env.DEFYSWARM_PREFIX || '';
const token = process.env.DEFYSWARM_INGEST_TOKEN || '';
let base;
if (protectedStorage) {
  base = new URL(process.env.DEFYSWARM_URL);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(base.hostname)) {
    throw new Error('DEFYSWARM_URL must point to the local DefySwarm server.');
  }
  if (!bucket || !token || !prefix.startsWith('defyswarm-victim-test/') || !prefix.endsWith('/')) {
    throw new Error('Configure the bucket, ingest token, and a defyswarm-victim-test/<run>/ prefix.');
  }
}

export function storageInfo() {
  return protectedStorage ? { mode: 'defyswarm', bucket, prefix } : { mode: 'local' };
}

export function objectKey(relativePath) {
  const clean = relativePath.replaceAll('\\', '/');
  if (!clean || clean.startsWith('/') || clean.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('A relative file path inside the test prefix is required.');
  }
  return prefix + clean;
}

export function principalId(principal) {
  return `drivevault-${principal.principal}`;
}

async function request(route, options = {}) {
  const response = await fetch(new URL(route, base), {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: { 'x-defyswarm-role': 'viewer', 'x-defyswarm-token': token, ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || `DefySwarm returned HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response;
}

export async function assertPrincipalActive(principal) {
  if (!protectedStorage) return;
  const state = await (await request('/api/bootstrap')).json();
  if (state.storage.productionBucket !== bucket && !state.buckets.some(item => item.name === bucket && item.adapter === 'local')) {
    throw new Error('The configured victim bucket is not available in DefySwarm.');
  }
  const identity = state.principals.find(item => item.id === principalId(principal));
  if (identity && (identity.status === 'REVOKED' || identity.quarantinePolicyAttached)) {
    const error = new Error('DefySwarm contained this DriveVault principal.');
    error.status = 403;
    throw error;
  }
  // A configured external bucket must stay external when verification fails.
  if (state.storage.productionBucket === bucket && state.storage.provider !== 'local' && !state.storage.minioConnected) {
    const error = new Error('Reconnect the S3 bucket in DefySwarm before using protected storage.');
    error.status = 503;
    throw error;
  }
}

export async function putProtectedFile(relativePath, buffer, mimeType, principal) {
  if (!protectedStorage) return;
  await request('/api/storage/objects', {
    method: 'POST', body: buffer,
    headers: {
      'Content-Type': mimeType,
      'x-defyswarm-bucket': bucket,
      'x-defyswarm-key': objectKey(relativePath),
      'x-defyswarm-principal': principalId(principal),
    },
  });
}

export async function getProtectedFile(relativePath) {
  const query = new URLSearchParams({ bucket, key: objectKey(relativePath) });
  return Buffer.from(await (await request(`/api/storage/objects/download?${query}`)).arrayBuffer());
}

export async function deleteProtectedFile(relativePath, principal) {
  if (!protectedStorage) return;
  const query = new URLSearchParams({ bucket, key: objectKey(relativePath), principal: principalId(principal) });
  await request(`/api/storage/objects?${query}`, { method: 'DELETE' });
}
