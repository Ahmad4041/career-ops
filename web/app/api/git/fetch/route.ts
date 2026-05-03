import {
  checkRemoteConfigured,
  gitFetchUpstream,
  isInsideGitRepo,
  resolveUpstreamMergeRef,
} from '@/lib/git-upstream';
import { getCareerOpsRoot } from '@/lib/root';

export async function POST() {
  const root = getCareerOpsRoot();

  if (!isInsideGitRepo(root)) {
    return Response.json({ error: 'Not a git repository' }, { status: 400 });
  }

  const remoteDefault = process.env.CAREER_OPS_GIT_UPSTREAM_REMOTE?.trim() || 'upstream';
  if (!(await checkRemoteConfigured(root, remoteDefault))) {
    return Response.json(
      {
        error: `Remote "${remoteDefault}" is not configured`,
        upstreamRemoteName: remoteDefault,
      },
      { status: 400 },
    );
  }

  const resolved = await resolveUpstreamMergeRef(root);
  if (!resolved.ok) {
    return Response.json({ error: resolved.stderr }, { status: 400 });
  }

  const fr = await gitFetchUpstream(root, resolved.upstream);
  const ok = fr.code === 0;

  return Response.json(
    {
      ok,
      upstream: resolved.upstream,
      stdout: fr.stdout.slice(-20_000),
      stderr: fr.stderr.slice(-20_000),
      exitCode: fr.code,
      ...(ok ? {} : { error: fr.stderr.trim() || 'git fetch failed' }),
    },
    { status: ok ? 200 : 502 },
  );
}
