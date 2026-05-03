import { getCareerOpsRoot } from '@/lib/root';
import { resolveBinary } from '@/lib/resolve-binary';
import { spawnDetached } from '@/lib/spawn-timeout';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const target =
    typeof body === 'object' && body !== null && 'target' in body ? (body as { target: string }).target : '';

  if (target !== 'cursor' && target !== 'claude-code') {
    return Response.json({ error: 'target must be cursor or claude-code' }, { status: 400 });
  }

  const root = getCareerOpsRoot();

  if (target === 'cursor') {
    const bin = resolveBinary('CURSOR_CLI_PATH', 'cursor');
    if (!bin) {
      return Response.json(
        {
          ok: false,
          error:
            '`cursor` not found in PATH. Install Cursor IDE or set CURSOR_CLI_PATH to the launcher binary.',
        },
        { status: 404 },
      );
    }
    const r = spawnDetached(bin, [root]);
    return Response.json({
      ok: r.ok,
      target,
      pid: r.pid,
      command: `"${bin}" "${root}"`,
      error: r.error,
    });
  }

  const claudeBin = resolveBinary('CLAUDE_CLI_PATH', 'claude');
  if (!claudeBin) {
    return Response.json(
      {
        ok: false,
        error: '`claude` not found in PATH. Install Claude Code or set CLAUDE_CLI_PATH.',
      },
      { status: 404 },
    );
  }

  const r = spawnDetached(claudeBin, [], root);
  return Response.json({
    ok: r.ok,
    target,
    pid: r.pid,
    command: `cd "${root}" && "${claudeBin}"`,
    careerOpsRoot: root,
    error: r.error,
  });
}
