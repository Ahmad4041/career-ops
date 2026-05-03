import { spawnSync } from 'child_process';

/**
 * Locate an executable using env override first, then `which` / `where`.
 */
export function resolveBinary(envKey: string, commandName: string): string | null {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(which, [commandName], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (r.status !== 0 || !r.stdout?.trim()) return null;
    return r.stdout.trim().split('\n')[0].trim();
  } catch {
    return null;
  }
}
