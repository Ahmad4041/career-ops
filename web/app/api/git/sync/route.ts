import {
  isInsideGitRepo,
  resolveUpstreamMergeRef,
  syncMergeUpstreamWorkflow,
} from '@/lib/git-upstream';
import { getCareerOpsRoot } from '@/lib/root';

function formatPhases(result: Awaited<ReturnType<typeof syncMergeUpstreamWorkflow>>) {
  const lines: string[] = [];
  for (const p of result.phases) {
    if (typeof p === 'string') {
      lines.push(p);
      continue;
    }
    lines.push(`--- ${p.step} (exit ${p.code}) ---`);
    if (p.stdout.trim()) lines.push(p.stdout.trimEnd());
    if (p.stderr.trim()) lines.push(p.stderr.trimEnd());
  }
  return lines.join('\n');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (o.confirm !== true) {
    return Response.json(
      { error: 'Set { "confirm": true } after reading the upstream tab warning.' },
      { status: 400 },
    );
  }

  const root = getCareerOpsRoot();

  if (!isInsideGitRepo(root)) {
    return Response.json({ error: 'Not a git repository' }, { status: 400 });
  }

  const resolved = await resolveUpstreamMergeRef(root);
  if (!resolved.ok) {
    return Response.json({ error: resolved.stderr }, { status: 400 });
  }

  const { mergeRef } = resolved.upstream;
  const result = await syncMergeUpstreamWorkflow(root, mergeRef);
  const log = formatPhases(result);

  const payload = {
    ok: result.ok,
    upstream: resolved.upstream,
    stashReplayedOk: result.stashPoppedOk,
    phases: result.phases,
    log,
    ...(result.ok
      ? {}
      : {
          error:
            'Merge or stash replay failed — read the phase log below, then fix conflicts in Cursor/terminal (git status).',
        }),
  };

  return Response.json(payload, { status: result.ok ? 200 : 409 });
}
