import { getCareerOpsRoot } from '@/lib/root';
import { resolveBinary } from '@/lib/resolve-binary';

import { appendLog } from './store';
import { spawnWithLogLines } from './spawn-stream-logs';

/**
 * Locate how to invoke the Cursor terminal agent:
 * 1. CURSOR_AGENT_BIN — explicit path (e.g. ~/.local/bin/cursor-agent)
 * 2. `cursor-agent` on PATH
 * 3. `cursor agent …` via CURSOR_CLI_PATH / `cursor`
 */
export function resolveCursorAgentLaunch(): { cmd: string; argvPrefix: string[] } | null {
  const explicit = process.env.CURSOR_AGENT_BIN?.trim();
  if (explicit) return { cmd: explicit, argvPrefix: [] };

  const onPath = resolveBinary('CURSOR_AGENT_PATH', 'cursor-agent');
  if (onPath) return { cmd: onPath, argvPrefix: [] };

  const cursor = resolveBinary('CURSOR_CLI_PATH', 'cursor');
  if (cursor) return { cmd: cursor, argvPrefix: ['agent'] };

  return null;
}

function buildCursorPrompt(url: string, jdText?: string): string {
  const root = getCareerOpsRoot();
  const jd = jdText?.trim();

  return [
    'You operate inside career-ops — a Markdown + Node repository for structured job-offer workflows.',
    `Workspace directory: ${root}`,
    '',
    'Execute the Career Ops **auto-pipeline** for one job posting:',
    '1. Open and follow `.claude/skills/career-ops/SKILL.md` (router + modes). For a URL/JD pair this maps to AUTO-PIPELINE.',
    '2. Load whatever context blocks that mode mandates (typically `modes/_shared.md` plus the evaluation/pipeline docs).',
    '3. Use `cv.md`, `config/profile.yml`, optional `modes/_profile.md`, and tooling already in-repo (reports/, generate-pdf.mjs, etc.).',
    '4. Obey project ethics: assess fit, draft outputs, but never submit applications on the user\'s behalf.',
    '5. Read **`modes/_profile.md`** — follow output-language policy (default: full report in English).',
    '',
    `**Posting URL:** ${url}`,
    jd ? `\n**Pasted JD (optional):**\n${jd}` : '\n**(No pasted JD)** — derive content from URL + tooling as feasible.',
    '',
    'Produce or update artefacts the pipeline normally would (evaluation report, tracker additions, PDF when appropriate). Use repo tools (Playwright, node scripts) per project instructions.',
  ].join('\n');
}

export async function runCursorEvaluateJob(
  jobId: string,
  opts: { url: string; jdText?: string },
): Promise<number> {
  const launch = resolveCursorAgentLaunch();
  if (!launch) {
    appendLog(
      jobId,
      'stderr',
      'Cursor agent CLI not found. Install Cursor CLI, add `cursor-agent` to PATH, or set CURSOR_AGENT_BIN / CURSOR_CLI_PATH.',
    );
    return 1;
  }

  const root = getCareerOpsRoot();
  const modelId = process.env.CURSOR_AGENT_MODEL?.trim();
  const timeoutMs = Number(process.env.CURSOR_AGENT_TIMEOUT_MS ?? 1_800_000);
  const useStreamJson = process.env.CURSOR_AGENT_OUTPUT_FORMAT === 'stream-json';
  const outputFormat = useStreamJson ? 'stream-json' : 'text';

  const args: string[] = [
    ...launch.argvPrefix,
    '--print',
    '--trust',
    '--workspace',
    root,
    '--output-format',
    outputFormat,
    '--force',
  ];

  if (useStreamJson) {
    args.push('--stream-partial-output');
  }

  if (modelId) {
    args.push('--model', modelId);
  }

  if (process.env.CURSOR_AGENT_YOLO === '1' || process.env.CURSOR_AGENT_YOLO === 'true') {
    args.push('--yolo');
  }

  const prompt = buildCursorPrompt(opts.url, opts.jdText);
  args.push(prompt);

  appendLog(
    jobId,
    'info',
    `Starting Cursor agent CLI: ${launch.cmd} ${launch.argvPrefix.join(' ')} --print --trust --workspace <repo> … (model=${modelId || 'default'})`,
  );
  appendLog(jobId, 'stdout', `$ ${launch.cmd} ${args.slice(0, launch.argvPrefix.length + 12).join(' ')} … [prompt]`);

  const env = { ...process.env };
  if (!env.CURSOR_API_KEY?.trim()) {
    appendLog(
      jobId,
      'info',
      'CURSOR_API_KEY not set in server env — relying on Cursor CLI stored auth (`cursor agent login`).',
    );
  }

  const code = await spawnWithLogLines(
    launch.cmd,
    args,
    {
      cwd: root,
      env,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 1_800_000,
    },
    (channel, line) => {
      if (channel === 'stdout' && useStreamJson) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{')) {
          try {
            const o = JSON.parse(trimmed) as Record<string, unknown>;
            const type = String(o.type ?? 'msg');
            const text =
              (typeof o.text === 'string' && o.text) ||
              (typeof o.delta === 'string' && o.delta) ||
              (typeof o.content === 'string' && o.content) ||
              trimmed;
            appendLog(jobId, type === 'error' ? 'stderr' : 'stdout', `[${type}] ${text}`);
            return;
          } catch {
            /* fallthrough */
          }
        }
      }
      // Cursor CLI logs internal trace paths to stderr; not application errors.
      if (channel === 'stderr' && line.trimStart().startsWith('cursor-retrieval:')) {
        appendLog(jobId, 'info', line.trimEnd());
        return;
      }
      appendLog(jobId, channel, line);
    },
  );

  if (code === 0) appendLog(jobId, 'info', 'Cursor agent CLI exited successfully.');
  else appendLog(jobId, 'stderr', `Cursor agent CLI exited with code ${code}`);
  return code;
}
