import { appendLog } from './store';
import { spawnWithLogLines } from './spawn-stream-logs';

export async function runNodeScriptJob(
  jobId: string,
  execPath: string,
  root: string,
  script: string,
  timeoutMs: number,
): Promise<number> {
  appendLog(jobId, 'info', `Running node script: ${script} (cwd=${root})`);
  appendLog(jobId, 'stdout', `$ node ${script}`);
  return spawnWithLogLines(execPath, [script], { cwd: root, env: process.env, timeoutMs }, (ch, line) => {
    appendLog(jobId, ch, line);
  });
}
