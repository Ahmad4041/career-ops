import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';
import { runWithTimeout } from '@/lib/spawn-timeout';
import type { FollowupsPayload } from '@/types/followups';

const SCRIPT = 'followup-cadence.mjs';
const TIMEOUT_MS = 30_000;

export async function GET(request: Request) {
  const root = getCareerOpsRoot();
  const scriptPath = path.join(root, SCRIPT);

  if (!fs.existsSync(scriptPath)) {
    return Response.json(
      { error: `${SCRIPT} not found — is CAREER_OPS_ROOT correct?`, careerOpsRoot: root },
      { status: 500 },
    );
  }

  const overdueOnly = new URL(request.url).searchParams.get('overdueOnly') === '1';
  const args = [SCRIPT, ...(overdueOnly ? ['--overdue-only'] : [])];

  const result = await runWithTimeout(process.execPath, args, {
    cwd: root,
    env: process.env,
    timeoutMs: TIMEOUT_MS,
    shell: false,
  });

  const stdout = result.stdout.trim();
  if (!stdout) {
    return Response.json(
      {
        error: result.stderr.trim() || 'followup-cadence.mjs produced no output',
        careerOpsRoot: root,
        exitCode: result.code,
      },
      { status: 500 },
    );
  }

  let parsed: FollowupsPayload;
  try {
    parsed = JSON.parse(stdout) as FollowupsPayload;
  } catch {
    return Response.json(
      {
        error: 'Failed to parse follow-up cadence JSON',
        careerOpsRoot: root,
        exitCode: result.code,
        stderr: result.stderr.slice(-2000),
      },
      { status: 500 },
    );
  }

  // Script exits 1 when tracker is empty but still emits `{ error: "…" }` JSON.
  return Response.json({ ...parsed, careerOpsRoot: root });
}
