import { spawn, type SpawnOptionsWithoutStdio } from 'child_process';

export type RunResult = { code: number; stdout: string; stderr: string };

export function runWithTimeout(
  command: string,
  args: string[],
  opts: SpawnOptionsWithoutStdio & { timeoutMs: number },
): Promise<RunResult> {
  const { timeoutMs, ...spawnOpts } = opts;
  return new Promise((resolve) => {
    const child = spawn(command, args, spawnOpts);
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout?.on('data', (c) => {
      stdout += c.toString();
    });
    child.stderr?.on('data', (c) => {
      stderr += c.toString();
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout: '', stderr: String(err.message) });
    });
  });
}

/** Fire-and-forget GUI / TTY tool (Cursor, Claude Code). */
export function spawnDetached(command: string, args: string[], cwd?: string): { ok: boolean; error?: string; pid?: number } {
  try {
    const child = spawn(command, args, {
      cwd,
      detached: true,
      stdio: 'ignore',
      env: process.env,
      shell: false,
    });
    child.unref();
    return { ok: true, pid: child.pid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'spawn failed' };
  }
}
