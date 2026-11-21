import path from 'node:path';

const allowed = path.resolve(import.meta.dir, '../data');
export const dataRoot = path.resolve(process.env.DRIVEVAULT_DATA_ROOT || (process.env.DEFYSWARM_URL ? path.join(allowed, 'protected') : allowed));
const relative = path.relative(allowed, dataRoot);
if (relative.startsWith('..') || path.isAbsolute(relative)) {
  throw new Error('DRIVEVAULT_DATA_ROOT must be inside the cloned app data directory.');
}
