import { parseApplications } from '@/lib/applications-parser';
import { resolveBinary } from '@/lib/resolve-binary';
import { getCareerOpsRoot } from '@/lib/root';
import { findDuplicateByUrl } from '@/lib/tracker-duplicate-match';

import { appendLog, createJob, getJob, setJobStatus } from './store';
import { runClaudeEvaluateJob } from './run-claude-job';
import { resolveCursorAgentLaunch, runCursorEvaluateJob } from './run-cursor-job';
import { runNodeScriptJob } from './run-node-job';

const URL_RE = /^https:\/\/.+/i;

export type CreateJobInput = {
  provider: 'claude' | 'cursor' | 'node';
  operation: 'evaluate_job' | 'portal_scan' | 'verify_pipeline' | 'merge_tracker';
  url?: string;
  jdText?: string;
};

export function enqueueJob(body: CreateJobInput): {
  id: string;
  error?: string;
  status?: number;
  duplicateOf?: number;
  duplicateWarning?: string;
} {
  const meta: Record<string, unknown> = {
    url: body.url,
    jdText: body.jdText,
  };
  let duplicateOf: number | undefined;
  let duplicateWarning: string | undefined;

  if (body.operation === 'evaluate_job') {
    const url = body.url?.trim() ?? '';
    if (!URL_RE.test(url)) {
      return { id: '', error: 'evaluate_job requires a valid https URL in `url`', status: 400 };
    }
    try {
      const root = getCareerOpsRoot();
      const { apps } = parseApplications(root);
      const dup = findDuplicateByUrl(apps, url);
      if (dup) {
        duplicateOf = dup.number;
        duplicateWarning = `Same posting URL as application #${dup.number} (${dup.company} — ${dup.role}). You can re-run; merge-tracker updates the tracker row.`;
        meta.duplicateOf = dup.number;
      }
    } catch {
      /* tracker unreadable — still allow enqueue */
    }
    if (body.provider === 'claude') {
      const claudeBin = resolveBinary('CLAUDE_CLI_PATH', 'claude');
      if (!claudeBin) {
        return {
          id: '',
          error: '`claude` CLI not found (set CLAUDE_CLI_PATH or install Claude Code)',
          status: 400,
        };
      }
      meta.claudeCliPath = claudeBin;
    }
    if (body.provider === 'cursor' && !resolveCursorAgentLaunch()) {
      return {
        id: '',
        error:
          'Cursor agent CLI not found. Install Cursor, ensure `cursor agent` works, or set CURSOR_AGENT_BIN to `cursor-agent`, or CURSOR_CLI_PATH to the `cursor` binary.',
        status: 400,
      };
    }
  }

  const id = createJob(body.provider, body.operation, meta);
  void runJob(id, body).catch(() => {
    /* finalize should still run inside runJob finally */
  });
  return { id, duplicateOf, duplicateWarning };
}

async function runJob(jobId: string, body: CreateJobInput): Promise<void> {
  const jobBefore = getJob(jobId);
  if (!jobBefore) return;

  appendLog(jobId, 'info', `Job ${jobId} started (${body.provider} / ${body.operation})`);

  const dupNum =
    typeof jobBefore.meta.duplicateOf === 'number' ? (jobBefore.meta.duplicateOf as number) : null;
  if (dupNum != null && body.operation === 'evaluate_job') {
    appendLog(
      jobId,
      'info',
      `⚠ Already in tracker as application #${dupNum}. Re-run allowed — logs continue here; merge-tracker may update the same row.`,
    );
  }

  try {
    setJobStatus(jobId, 'running');
    const root = getCareerOpsRoot();
    const timeoutEval = Number(process.env.CAREER_OPS_CLAUDE_TIMEOUT_MS ?? 1_200_000);
    const timeoutShort = Number(process.env.CAREER_OPS_NODE_JOB_TIMEOUT_MS ?? 600_000);

    let code = 1;

    if (body.operation === 'evaluate_job' && body.provider === 'claude') {
      const claudeBin =
        typeof jobBefore.meta.claudeCliPath === 'string'
          ? (jobBefore.meta.claudeCliPath as string)
          : resolveBinary('CLAUDE_CLI_PATH', 'claude')!;
      code = await runClaudeEvaluateJob(
        jobId,
        claudeBin,
        { url: body.url!.trim(), jdText: body.jdText },
        Number.isFinite(timeoutEval) ? timeoutEval : 1_200_000,
      );
    } else if (body.operation === 'evaluate_job' && body.provider === 'cursor') {
      code = await runCursorEvaluateJob(jobId, {
        url: body.url!.trim(),
        jdText: body.jdText,
      });
    } else if (body.provider === 'node') {
      if (body.operation === 'portal_scan') {
        code = await runNodeScriptJob(jobId, process.execPath, root, 'scan.mjs', timeoutShort);
      } else if (body.operation === 'verify_pipeline') {
        code = await runNodeScriptJob(jobId, process.execPath, root, 'verify-pipeline.mjs', 120_000);
      } else if (body.operation === 'merge_tracker') {
        code = await runNodeScriptJob(jobId, process.execPath, root, 'merge-tracker.mjs', 120_000);
      } else {
        appendLog(jobId, 'stderr', `Unknown node operation: ${body.operation}`);
        code = 1;
      }
    } else {
      appendLog(jobId, 'stderr', `Unsupported combo ${body.provider}/${body.operation}`);
      code = 1;
    }

    appendLog(jobId, 'info', `Process finished with exit code ${code}`);

    if (code === 0 && body.operation === 'evaluate_job') {
      appendLog(jobId, 'info', 'Merging tracker additions into applications.md…');
      const mergeCode = await runNodeScriptJob(
        jobId,
        process.execPath,
        root,
        'merge-tracker.mjs',
        120_000,
      );
      if (mergeCode !== 0) {
        appendLog(
          jobId,
          'stderr',
          'merge-tracker.mjs failed — new row may be missing until you run Merge tracker (nav) or `node merge-tracker.mjs`.',
        );
        code = mergeCode;
      }
    }

    setJobStatus(jobId, code === 0 ? 'completed' : 'failed', code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appendLog(jobId, 'stderr', msg);
    setJobStatus(jobId, 'failed', 1, msg);
  }
}
