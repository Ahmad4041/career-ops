import type { Readable } from 'stream';
import { spawn } from 'child_process';

import type { LogChannel } from './store';

type OnLog = (channel: LogChannel, line: string) => void;

/** Line-buffer stdin + periodic partial flush — CLIs often omit `\n` for long stretches. */
function bindLines(
  stream: NodeJS.ReadableStream | null,
  channel: LogChannel,
  onLog: OnLog,
  remainder: { value: string },
): () => void {
  const onData = (chunk: Buffer) => {
    remainder.value += chunk.toString();
    let nl: number;
    while ((nl = remainder.value.indexOf('\n')) >= 0) {
      const line = remainder.value.slice(0, nl);
      remainder.value = remainder.value.slice(nl + 1);
      const t = line.replace(/\r$/, '');
      if (t.length) onLog(channel, t);
    }
  };
  stream?.on('data', onData);
  return () => stream?.off('data', onData);
}

function startPartialFlush(
  outRem: { value: string },
  errRem: { value: string },
  onLog: OnLog,
  shouldStop: () => boolean,
): () => void {
  const tick = setInterval(() => {
    if (shouldStop()) return;
    if (outRem.value.length > 0) {
      const chunk = outRem.value;
      outRem.value = '';
      onLog('stdout', chunk);
    }
    if (errRem.value.length > 0) {
      const chunk = errRem.value;
      errRem.value = '';
      onLog('stderr', chunk);
    }
  }, 400);
  return () => clearInterval(tick);
}

/** Spawn without shell; stream stdout/stderr (partial buffers flushed ~4×/s). */
export function spawnWithLogLines(
  command: string,
  args: string[],
  spawnOpts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs: number },
  onLog: OnLog,
): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: spawnOpts.cwd,
      env: spawnOpts.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = proc.stdout as Readable | null;
    const stderr = proc.stderr as Readable | null;
    if (!stdout || !stderr) {
      resolve(1);
      return;
    }

    const outRem = { value: '' };
    const errRem = { value: '' };
    const unOut = bindLines(stdout, 'stdout', onLog, outRem);
    const unErr = bindLines(stderr, 'stderr', onLog, errRem);

    let finished = false;
    const partialFlushClear = startPartialFlush(outRem, errRem, onLog, () => finished);

    const timer = setTimeout(() => {
      if (finished) return;
      onLog('stderr', `[job] timeout ${spawnOpts.timeoutMs}ms — SIGTERM`);
      proc.kill('SIGTERM');
    }, spawnOpts.timeoutMs);

    const finish = (code: number | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      partialFlushClear();
      unOut();
      unErr();
      if (outRem.value.replace(/\r$/, '').trim()) onLog('stdout', outRem.value.replace(/\r$/, ''));
      if (errRem.value.replace(/\r$/, '').trim()) onLog('stderr', errRem.value.replace(/\r$/, ''));
      resolve(code ?? 1);
    };

    proc.on('close', (code) => finish(code ?? 1));
    proc.on('error', (err) => {
      onLog('stderr', err.message);
      finish(1);
    });
  });
}
