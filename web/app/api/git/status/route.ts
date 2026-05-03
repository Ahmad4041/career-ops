import { getCareerOpsRoot } from '@/lib/root';

import {
  checkRemoteConfigured,
  getCurrentBranch,
  gitStatusPorcelain,
  isInsideGitRepo,
  logIncomingCommits,
  resolveUpstreamMergeRef,
  revListCount,
} from '@/lib/git-upstream';

const CANONICAL_UPSTREAM = 'https://github.com/santifer/career-ops.git';

export async function GET() {
  const root = getCareerOpsRoot();
  const defaultRemote = process.env.CAREER_OPS_GIT_UPSTREAM_REMOTE?.trim() || 'upstream';

  if (!isInsideGitRepo(root)) {
    return Response.json({
      careerOpsRoot: root,
      gitRepo: false,
      hint: 'Career-ops root is not a git clone (no .git directory).',
    });
  }

  const currentBranch = await getCurrentBranch(root);
  const upstreamConfigured = await checkRemoteConfigured(root, defaultRemote);

  if (!upstreamConfigured) {
    return Response.json({
      careerOpsRoot: root,
      gitRepo: true,
      upstreamConfigured: false,
      upstreamRemoteName: defaultRemote,
      currentBranch,
      canonicalUpstreamUrl: CANONICAL_UPSTREAM,
      hintCommands: [
        `git remote add ${defaultRemote} ${CANONICAL_UPSTREAM}`,
        `git fetch ${defaultRemote}`,
      ],
    });
  }

  const resolved = await resolveUpstreamMergeRef(root);
  if (!resolved.ok) {
    return Response.json({
      careerOpsRoot: root,
      gitRepo: true,
      upstreamConfigured: true,
      upstreamRemoteName: defaultRemote,
      currentBranch,
      mergeRefUnresolved: true,
      message: resolved.stderr,
    });
  }

  const { mergeRef } = resolved.upstream;
  const dirty = await gitStatusPorcelain(root);

  const behind = await revListCount(root, 'HEAD', mergeRef);
  const ahead = await revListCount(root, mergeRef, 'HEAD');

  let incomingCommits: { hash: string; subject: string }[] = [];
  if (behind > 0) {
    incomingCommits = await logIncomingCommits(root, 'HEAD', mergeRef, 40);
  }

  return Response.json({
    careerOpsRoot: root,
    gitRepo: true,
    upstreamConfigured: true,
    upstream: resolved.upstream,
    currentBranch,
    dirty,
    behind: behind < 0 ? null : behind,
    ahead: ahead < 0 ? null : ahead,
    incomingCommits,
  });
}
