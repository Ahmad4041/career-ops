import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';

import { buildUserPrompt, buildSystemPrompt } from '@/lib/application-materials/agent-prompt';
import { buildMaterialsContext } from '@/lib/application-materials/build-context';
import {
  parseMaterialJsonFromAgentOutput,
  type ParsedMaterialResult,
} from '@/lib/application-materials/parse-agent-output';
import type { MaterialPhase } from '@/lib/application-materials/types';
import type { CareerApplication } from '@/lib/applications-parser';
import { resolveCursorAgentLaunch } from '@/lib/jobs/run-cursor-job';
import { resolveBinary } from '@/lib/resolve-binary';
import { runWithTimeout } from '@/lib/spawn-timeout';

export type MaterialsProvider = 'claude' | 'cursor' | 'gemini';

const DEFAULT_TIMEOUT_MS = Number(process.env.CAREER_OPS_MATERIALS_TIMEOUT_MS ?? 600_000);
/** Above this, task is written under repo output/ and the agent reads the file (avoids argv limits + stdin quirks). */
const PROMPT_FILE_THRESHOLD = 24_000;

const AGENT_STDIO: ['ignore', 'pipe', 'pipe'] = ['ignore', 'pipe', 'pipe'];

/** Claude/Cursor often print billing/auth errors on stdout; stderr may only have stdin warnings. */
export function formatAgentRunFailure(
  run: { code: number; stdout: string; stderr: string },
  provider: MaterialsProvider,
): string {
  const combined = `${run.stderr}\n${run.stdout}`.trim();
  const tail = combined.slice(-1200);

  if (/out of extra usage|usage limit|rate limit|quota exceeded/i.test(combined)) {
    const reset = combined.match(/resets?\s+[^\n]+/i)?.[0];
    return [
      'Claude Code usage limit reached for this account.',
      reset ? reset : null,
      'Switch the Generator dropdown to Cursor Agent or Gemini, or wait until usage resets.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (/not logged in|authentication required|invalid api key|login required/i.test(combined)) {
    return `Agent not authenticated. For ${provider === 'cursor' ? 'Cursor' : 'Claude'}, run \`${provider === 'cursor' ? 'cursor agent login' : 'claude login'}\` in a terminal, or pick another generator.`;
  }

  if (tail) return tail;
  return `Agent exited with code ${run.code} (no output captured). Try Cursor Agent or Gemini in the Generator dropdown.`;
}

export function resolveMaterialsProvider(raw: unknown): MaterialsProvider {
  const env = (process.env.CAREER_OPS_MATERIALS_PROVIDER ?? 'cursor').trim().toLowerCase();
  const fromBody = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const p = (fromBody || env) as MaterialsProvider;
  if (p === 'cursor' || p === 'gemini') return p;
  return 'claude';
}

async function runClaudeMaterials(
  root: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const claudeBin = resolveBinary('CLAUDE_CLI_PATH', 'claude');
  if (!claudeBin) {
    return { code: 1, stdout: '', stderr: 'claude CLI not found (install Claude Code or set CLAUDE_CLI_PATH)' };
  }

  const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'career-ops-mat-'));
  const systemPath = path.join(tmpBase, 'materials-system.md');
  await fsPromises.writeFile(systemPath, systemPrompt, 'utf8');

  let userMessage = userPrompt;
  const taskRel = await writeTaskFile(root, tmpBase, userPrompt);
  if (taskRel) {
    userMessage = [
      `Read the task file in this repo: ${taskRel}`,
      'Complete the TASK section using cv.md, the evaluation report, and profile files as needed.',
      'Do not edit tracker or report files.',
      'Your final reply must be ONLY the ---MATERIAL_JSON--- … ---END_MATERIAL--- block from that file.',
    ].join('\n');
  }

  const args = [
    '-p',
    '--dangerously-skip-permissions',
    '--append-system-prompt-file',
    systemPath,
    userMessage,
  ];

  try {
    return await runWithTimeout(claudeBin, args, {
      cwd: root,
      env: process.env,
      timeoutMs,
      stdio: AGENT_STDIO,
    });
  } finally {
    try {
      await fsPromises.rm(tmpBase, { recursive: true, force: true });
    } catch {
      /* noop */
    }
  }
}

async function writeTaskFile(
  root: string,
  tmpBase: string,
  fullPrompt: string,
  force = false,
): Promise<string | null> {
  if (!force && fullPrompt.length <= PROMPT_FILE_THRESHOLD) return null;
  const outDir = path.join(root, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const name = `_materials-task-${path.basename(tmpBase)}.md`;
  const rel = path.posix.join('output', name);
  const abs = path.join(root, rel);
  await fsPromises.writeFile(abs, fullPrompt, 'utf8');
  return rel;
}

async function runCursorMaterials(
  root: string,
  userPrompt: string,
  timeoutMs: number,
  tmpBase: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const launch = resolveCursorAgentLaunch();
  if (!launch) {
    return {
      code: 1,
      stdout: '',
      stderr:
        'Cursor agent CLI not found. Set CURSOR_AGENT_BIN, or install cursor-agent / cursor agent.',
    };
  }

  const modelId = process.env.CURSOR_AGENT_MODEL?.trim();
  const args: string[] = [
    ...launch.argvPrefix,
    '--print',
    '--trust',
    '--workspace',
    root,
    '--output-format',
    'text',
    '--mode',
    'ask',
    '--force',
  ];
  if (modelId) args.push('--model', modelId);
  if (process.env.CURSOR_AGENT_YOLO === '1' || process.env.CURSOR_AGENT_YOLO === 'true') {
    args.push('--yolo');
  }

  let promptArg = userPrompt;
  const taskRel = await writeTaskFile(root, tmpBase, userPrompt, true);
  if (taskRel) {
    promptArg = [
      `Read ${taskRel} in the workspace and complete the TASK.`,
      'Reply with ONLY the ---MATERIAL_JSON--- … ---END_MATERIAL--- block specified there.',
    ].join(' ');
  }
  args.push(promptArg);

  return runWithTimeout(launch.cmd, args, {
    cwd: root,
    env: process.env,
    timeoutMs,
    stdio: AGENT_STDIO,
  });
}

async function runGeminiMaterials(
  root: string,
  applicationNumber: number,
  phase: MaterialPhase,
  questions: string,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const script = path.join(root, 'generate-application-materials.mjs');
  if (!fs.existsSync(script)) {
    return { code: 1, stdout: '', stderr: 'generate-application-materials.mjs missing' };
  }
  const args = [script, `--application=${applicationNumber}`, `--phase=${phase}`];
  if (phase === 'customQuestions' && questions.trim()) {
    args.push(`--questions=${questions}`);
  }
  return runWithTimeout(process.execPath, args, { cwd: root, env: process.env, timeoutMs });
}

export async function generateMaterialsWithAgent(opts: {
  app: CareerApplication;
  phase: MaterialPhase;
  questions: string;
  provider: MaterialsProvider;
}): Promise<ParsedMaterialResult & { stderr?: string; exitCode?: number }> {
  const ctx = buildMaterialsContext(opts.app);
  const timeoutMs = Number.isFinite(DEFAULT_TIMEOUT_MS) ? DEFAULT_TIMEOUT_MS : 600_000;

  let run: { code: number; stdout: string; stderr: string };

  if (opts.provider === 'gemini') {
    run = await runGeminiMaterials(ctx.root, opts.app.number, opts.phase, opts.questions, timeoutMs);
    const lastLine = run.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .pop();
    if (run.code !== 0) {
      let err = run.stderr.slice(-500);
      try {
        const j = lastLine ? (JSON.parse(lastLine) as { error?: string }) : {};
        if (j.error) err = j.error;
      } catch {
        /* ignore */
      }
      return { ok: false, error: err || `Gemini exited ${run.code}`, exitCode: run.code, stderr: run.stderr };
    }
    try {
      return JSON.parse(lastLine ?? '{}') as ParsedMaterialResult;
    } catch {
      return { ok: false, error: 'Gemini did not return JSON on stdout', stderr: run.stderr };
    }
  }

  const systemPrompt = buildSystemPrompt(ctx);
  const userPrompt = buildUserPrompt(ctx, opts.phase, opts.questions);

  const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'career-ops-mat-'));

  try {
    if (opts.provider === 'cursor') {
      const combined = `${systemPrompt}\n\n---\n\n${userPrompt}`;
      run = await runCursorMaterials(ctx.root, combined, timeoutMs, tmpBase);
    } else {
      run = await runClaudeMaterials(ctx.root, systemPrompt, userPrompt, timeoutMs);
    }
  } finally {
    try {
      await fsPromises.rm(tmpBase, { recursive: true, force: true });
    } catch {
      /* noop */
    }
  }

  if (run.code !== 0) {
    return {
      ok: false,
      error: formatAgentRunFailure(run, opts.provider),
      exitCode: run.code,
      stderr: run.stderr,
    };
  }

  const parsed = parseMaterialJsonFromAgentOutput(run.stdout, run.stderr);
  if (!parsed.ok) {
    const preview = (run.stdout + run.stderr).trim().slice(-1200);
    return {
      ...parsed,
      error: `${parsed.error ?? 'Parse failed'}${preview ? ` — tail: ${preview}` : ''}`,
      stderr: run.stderr.slice(-1500),
      exitCode: run.code,
    };
  }
  return parsed;
}
