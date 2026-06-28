import { prepareClaudeBatchEval } from './claude-batch-prepared';
import { appendLog } from '@/lib/jobs/store';
import { spawnWithLogLines } from './spawn-stream-logs';

export async function runClaudeEvaluateJob(
  jobId: string,
  claudeBin: string,
  opts: { url: string; jdText?: string },
  timeoutMs: number,
): Promise<number> {
  appendLog(jobId, 'info', 'Preparing Claude Code headless worker (claude -p + batch prompt)…');

  let prepared: Awaited<ReturnType<typeof prepareClaudeBatchEval>>;
  try {
    prepared = await prepareClaudeBatchEval(claudeBin, opts);
  } catch (e) {
    appendLog(jobId, 'stderr', e instanceof Error ? e.message : 'prepare failed');
    return 1;
  }

  appendLog(jobId, 'info', `Report #: ${prepared.reportNum}, batch ${prepared.batchId}, cwd=${prepared.root}`);

  try {
    appendLog(jobId, 'stdout', `$ ${claudeBin} -p … --append-system-prompt-file …`);
    const code = await spawnWithLogLines(prepared.claudeBin, prepared.args, { cwd: prepared.root, env: process.env, timeoutMs }, (ch, line) => {
      appendLog(jobId, ch, line);
    });
    if (code === 0) appendLog(jobId, 'info', 'Claude process exited successfully.');
    else appendLog(jobId, 'stderr', `Claude exited with code ${code}`);
    return code;
  } finally {
    await prepared.cleanup();
  }
}
