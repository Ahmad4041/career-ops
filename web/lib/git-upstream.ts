import fs from 'fs';
import path from 'path';

import { runWithTimeout } from '@/lib/spawn-timeout';

export const GIT_TIMEOUT_FETCH_MS = 120_000;
export const GIT_TIMEOUT_DEFAULT_MS = 90_000;

export function resolveGitBinary(): string {
  return process.env.GIT_CLI_PATH?.trim() || process.env.GIT_PATH?.trim() || 'git';
}

export type UpstreamConfig = {
  remote: string;
  branch: string;
  mergeRef: string;
};

async function git(cwd: string, args: string[], timeoutMs: number) {
  return runWithTimeout(resolveGitBinary(), args, {
    cwd,
    env: process.env,
    timeoutMs,
    shell: false,
  });
}

export function isInsideGitRepo(root: string): boolean {
  return fs.existsSync(path.join(root, '.git'));
}

/**
 * Prefer CAREER_OPS_GIT_UPSTREAM_BRANCH else remote HEAD else main then master.
 */
export async function resolveUpstreamMergeRef(
  cwd: string,
  remoteHint?: string | null,
  branchHint?: string | null,
): Promise<{ ok: false; stderr: string } | { ok: true; upstream: UpstreamConfig }> {
  const remote =
    remoteHint ?? (process.env.CAREER_OPS_GIT_UPSTREAM_REMOTE?.trim() || 'upstream');
  const configuredBranch =
    branchHint ?? process.env.CAREER_OPS_GIT_UPSTREAM_BRANCH?.trim();

  let branch = configuredBranch ?? '';
  if (!branch) {
    const rs = await git(cwd, ['symbolic-ref', `refs/remotes/${remote}/HEAD`], GIT_TIMEOUT_DEFAULT_MS);
    if (rs.code === 0) {
      const m = rs.stdout.trim().match(new RegExp(`^refs/remotes/${remote}/(.+)$`));
      branch = m?.[1] ?? '';
    }
  }
  if (!branch) {
    for (const candidate of ['main', 'master']) {
      const t = await git(cwd, ['rev-parse', '--verify', `${remote}/${candidate}`], 15_000);
      if (t.code === 0) {
        branch = candidate;
        break;
      }
    }
  }
  if (!branch) {
    return {
      ok: false,
      stderr: `Could not infer branch for remote "${remote}". Set CAREER_OPS_GIT_UPSTREAM_BRANCH or run: git fetch ${remote}`,
    };
  }

  const verify = await git(cwd, ['rev-parse', '--verify', `${remote}/${branch}`], 15_000);
  if (verify.code !== 0) {
    return {
      ok: false,
      stderr: verify.stderr || verify.stdout || `Missing ref ${remote}/${branch}; run Fetch first.`,
    };
  }

  return {
    ok: true,
    upstream: { remote, branch, mergeRef: `${remote}/${branch}` },
  };
}

/** Local branch name (or HEAD detached short). */
export async function getCurrentBranch(cwd: string): Promise<string> {
  const r = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'], GIT_TIMEOUT_DEFAULT_MS);
  return r.code === 0 ? r.stdout.trim() || '?' : '?';
}

export async function checkRemoteConfigured(cwd: string, remote: string): Promise<boolean> {
  const r = await git(cwd, ['remote', 'get-url', remote], 15_000);
  return r.code === 0;
}

export async function gitFetchUpstream(cwd: string, upstream: UpstreamConfig) {
  return git(cwd, ['fetch', upstream.remote], GIT_TIMEOUT_FETCH_MS);
}

export async function gitStatusPorcelain(cwd: string): Promise<boolean> {
  const r = await git(cwd, ['status', '--porcelain'], 30_000);
  return r.code === 0 && Boolean(r.stdout.trim());
}

/** Count reachable commits strictly on RHS not on LHS. */
export async function revListCount(cwd: string, leftRef: string, rightRef: string): Promise<number> {
  const r = await git(
    cwd,
    ['rev-list', '--count', `${leftRef}..${rightRef}`],
    GIT_TIMEOUT_DEFAULT_MS,
  );
  if (r.code !== 0) return -1;
  const n = parseInt(r.stdout.trim(), 10);
  return Number.isFinite(n) ? n : -1;
}

export type IncomingCommit = { hash: string; subject: string };

export async function logIncomingCommits(
  cwd: string,
  headRef: string,
  mergeRef: string,
  limit = 25,
): Promise<IncomingCommit[]> {
  const r = await git(
    cwd,
    ['log', `${headRef}..${mergeRef}`, `--max-count=${limit}`, '--pretty=format:%h%x09%s'],
    GIT_TIMEOUT_DEFAULT_MS,
  );
  if (r.code !== 0) return [];
  const lines = r.stdout.trim().split('\n').filter(Boolean);
  const out: IncomingCommit[] = [];
  for (const line of lines) {
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    out.push({
      hash: line.slice(0, tab).trim(),
      subject: line.slice(tab + 1).trim(),
    });
  }
  return out;
}

export type SyncPhase =
  | { step: string; stdout: string; stderr: string; code: number }
  | string;

/** Stash (if dirty) → merge upstream ref → stash pop when we stashed. */
export async function syncMergeUpstreamWorkflow(
  cwd: string,
  mergeRef: string,
): Promise<{ ok: boolean; phases: SyncPhase[]; stashPoppedOk?: boolean | null }> {
  const phases: SyncPhase[] = [];
  const dirty = await gitStatusPorcelain(cwd);
  let stashed = false;

  if (dirty) {
    const msg = `career-ops-dashboard-sync-${new Date().toISOString()}`;
    const st = await git(cwd, ['stash', 'push', '-u', '-m', msg], GIT_TIMEOUT_DEFAULT_MS);
    phases.push({ step: 'stash_push', stdout: st.stdout, stderr: st.stderr, code: st.code });
    if (st.code !== 0) return { ok: false, phases };
    stashed = true;
  }

  const mg = await git(cwd, ['merge', '--no-edit', mergeRef], GIT_TIMEOUT_FETCH_MS);
  phases.push({
    step: 'merge_upstream',
    stdout: mg.stdout,
    stderr: mg.stderr,
    code: mg.code,
  });

  if (mg.code !== 0) {
    const abort = await git(cwd, ['merge', '--abort'], GIT_TIMEOUT_DEFAULT_MS);
    phases.push({
      step: 'merge_abort',
      stdout: abort.stdout,
      stderr: abort.stderr,
      code: abort.code,
    });
    if (stashed) {
      const pop = await git(cwd, ['stash', 'pop'], GIT_TIMEOUT_FETCH_MS);
      phases.push({ step: 'stash_pop_merge_failed', stdout: pop.stdout, stderr: pop.stderr, code: pop.code });
      return { ok: false, phases, stashPoppedOk: pop.code === 0 };
    }
    return { ok: false, phases, stashPoppedOk: null };
  }

  if (stashed) {
    const pop = await git(cwd, ['stash', 'pop'], GIT_TIMEOUT_FETCH_MS);
    phases.push({ step: 'stash_pop', stdout: pop.stdout, stderr: pop.stderr, code: pop.code });
    const stashOk = pop.code === 0;
    return { ok: stashOk, phases, stashPoppedOk: stashOk };
  }

  return { ok: true, phases, stashPoppedOk: null };
}
