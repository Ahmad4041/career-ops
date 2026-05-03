import { prepareClaudeBatchEval } from '@/lib/jobs/claude-batch-prepared';
import { getCareerOpsRoot } from '@/lib/root';
import { resolveBinary } from '@/lib/resolve-binary';
import { runWithTimeout } from '@/lib/spawn-timeout';

const URL_RE = /^https:\/\/.+/i;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Expected JSON object' }, { status: 400 });
  }

  const { url, jdText } = body as { url?: string; jdText?: string };

  if (!url || typeof url !== 'string' || !URL_RE.test(url.trim())) {
    return Response.json({ error: 'Provide a valid https URL (`url`).' }, { status: 400 });
  }

  const root = getCareerOpsRoot();
  const claudeBin = resolveBinary('CLAUDE_CLI_PATH', 'claude');
  if (!claudeBin) {
    return Response.json(
      {
        ok: false,
        error:
          '`claude` CLI not in PATH — install Claude Code or set CLAUDE_CLI_PATH to the executable.',
      },
      { status: 404 },
    );
  }

  let prepared: Awaited<ReturnType<typeof prepareClaudeBatchEval>>;
  try {
    prepared = await prepareClaudeBatchEval(claudeBin, { url: url.trim(), jdText });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'prepare failed';
    return Response.json({ ok: false, error: message, careerOpsRoot: root }, { status: 500 });
  }

  try {
    const result = await runWithTimeout(prepared.claudeBin, prepared.args, {
      cwd: prepared.root,
      env: process.env,
      shell: false,
      timeoutMs: 1_200_000,
    });

    return Response.json({
      ok: result.code === 0,
      exitCode: result.code,
      careerOpsRoot: root,
      reportNum: prepared.reportNum,
      batchId: prepared.batchId,
      stdout: result.stdout.slice(-120_000),
      stderr: result.stderr.slice(-40_000),
      note:
        result.code !== 0
          ? 'Claude exited non-zero; check stderr. Files may still have been partially written.'
          : undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'claude-eval failed';
    return Response.json({ ok: false, error: message, careerOpsRoot: root }, { status: 500 });
  } finally {
    await prepared.cleanup();
  }
}
