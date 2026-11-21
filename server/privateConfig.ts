import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

interface PrivateConfig {
  groqApiKey?: string | null;
  monitorAccessKeyId?: string | null;
  monitorSecretAccessKey?: string | null;
  vaultAccessKeyId?: string | null;
  vaultSecretAccessKey?: string | null;
  ingestToken?: string | null;
}

const filename = path.resolve(process.cwd(), 'data/.private-config.json');

export function readPrivateConfig(): PrivateConfig {
  let raw: string;
  try {
    if (fs.lstatSync(filename).isSymbolicLink()) throw new Error('Private credential file must be a regular file.');
    fs.chmodSync(filename, 0o600);
    raw = fs.readFileSync(filename, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error('Unable to read the saved local credentials.');
  }
  const result = JSON.parse(raw) as PrivateConfig;
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
    Object.values(result).some(value => value !== null && typeof value !== 'string')) {
    throw new Error('Saved local credentials have an invalid format.');
  }
  return result;
}

export function savePrivateConfig(updates: Partial<PrivateConfig>): void {
  const next = { ...readPrivateConfig(), ...updates };
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, filename);
  } catch {
    throw new Error('Unable to save credentials on this Mac. Check data directory permissions.');
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
