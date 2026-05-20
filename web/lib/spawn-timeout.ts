import { spawn, type SpawnOptions } from 'child_process';

export type RunResult = { code: number; stdout: string; stderr: string };

/** Default stdin=ignore — headless CLIs (Cursor agent, Claude) must not wait on an open pipe. */
const AGENT_STDIO: SpawnOptions['stdio'] = ['ignore', 'pipe', 'pipe'];

export function runWithTimeout(
  command: string,
  args: string[],
  opts: SpawnOptions & { timeoutMs: number },
): Promise<RunResult> {
  const { timeoutMs, ...spawnOpts } = opts;
  const stdio = spawnOpts.stdio ?? AGENT_STDIO;
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...spawnOpts, stdio });
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
