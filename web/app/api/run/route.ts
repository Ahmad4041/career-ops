import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';
import { resolveBinary } from '@/lib/resolve-binary';
import { runWithTimeout } from '@/lib/spawn-timeout';

const NODE = {
  scan: { script: 'scan.mjs', args: [] as string[], timeoutMs: 300_000 },
  /** scan.mjs --verify — Playwright liveness check before pipeline append (upstream #487) */
  'scan-verify': { script: 'scan.mjs', args: ['--verify'], timeoutMs: 900_000 },
  verify: { script: 'verify-pipeline.mjs', args: [] as string[], timeoutMs: 120_000 },
  merge: { script: 'merge-tracker.mjs', args: [] as string[], timeoutMs: 60_000 },
  doctor: { script: 'doctor.mjs', args: [] as string[], timeoutMs: 60_000 },
} as const;

const BASH = {
  'batch-runner-dry-run': { script: 'batch-runner.sh', args: ['--dry-run'] as string[], timeoutMs: 120_000 },
  'batch-runner': { script: 'batch-runner.sh', args: [] as string[], timeoutMs: 1_800_000 },
} as const;

async function runNode(root: string, scriptFile: string, scriptArgs: string[], timeoutMs: number) {
  const rel = scriptFile;
  return runWithTimeout(process.execPath, [rel, ...scriptArgs], {
    cwd: root,
    env: process.env,
    timeoutMs,
    shell: false,
  });
}

async function runBatchScript(root: string, scriptName: string, extraArgs: string[], timeoutMs: number) {
  const bash =
    resolveBinary('BASH_PATH', 'bash') ?? (process.platform === 'win32' ? null : '/bin/bash');
  if (!bash) {
    return { code: 1, stdout: '', stderr: 'bash not found (set BASH_PATH or install Git Bash on Windows)' };
  }
  const scriptPath = path.join(root, 'batch', scriptName);
  if (!fs.existsSync(scriptPath)) {
    return { code: 1, stdout: '', stderr: `Missing ${scriptPath}` };
  }
  return runWithTimeout(bash, [scriptPath, ...extraArgs], {
    cwd: path.join(root, 'batch'),
    env: process.env,
    timeoutMs,
    shell: false,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const cmd = typeof body === 'object' && body !== null && 'cmd' in body ? (body as { cmd: string }).cmd : '';
  const root = getCareerOpsRoot();

  let result: Awaited<ReturnType<typeof runNode>>;
  let key: string;

  if (cmd in NODE) {
    const nk = cmd as keyof typeof NODE;
    key = nk;
    const spec = NODE[nk];
    const scriptPath = path.join(root, spec.script);
    if (!fs.existsSync(scriptPath)) {
      return Response.json(
        {
          error: `Script missing: ${spec.script} — is CAREER_OPS_ROOT correct?`,
          careerOpsRoot: root,
        },
        { status: 400 },
      );
    }
    result = await runNode(root, spec.script, [...spec.args], spec.timeoutMs);
  } else if (cmd in BASH) {
    const bk = cmd as keyof typeof BASH;
    key = bk;
    const spec = BASH[bk];
    result = await runBatchScript(root, spec.script, [...spec.args], spec.timeoutMs);
  } else {
    return Response.json(
      {
        error: 'Unknown cmd',
        allowed: [...Object.keys(NODE), ...Object.keys(BASH)],
      },
      { status: 400 },
    );
  }

  return Response.json({
    cmd: key,
    careerOpsRoot: root,
    exitCode: result.code,
    stdout: result.stdout.slice(-50_000),
    stderr: result.stderr.slice(-20_000),
    ok: result.code === 0,
  });
}
