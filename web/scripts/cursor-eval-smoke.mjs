#!/usr/bin/env node
/**
 * Prints how the dashboard resolves the Cursor Agent CLI (same order as
 * web/lib/jobs/run-cursor-job.ts). Run from `web/`:
 *   npm run cursor-smoke
 * Or: node scripts/cursor-eval-smoke.mjs
 *
 * Optional: pass --help-cli to run `… --print --help` (exits 0 if the CLI is callable).
 */
import { spawnSync } from 'child_process';
import path from 'path';

function resolveBinary(envKey, commandName) {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(which, [commandName], { encoding: 'utf8', windowsHide: true });
    if (r.status !== 0 || !r.stdout?.trim()) return null;
    return r.stdout.trim().split('\n')[0].trim();
  } catch {
    return null;
  }
}

function resolveCursorAgentLaunch() {
  const explicit = process.env.CURSOR_AGENT_BIN?.trim();
  if (explicit) return { cmd: explicit, argvPrefix: [], via: 'CURSOR_AGENT_BIN' };

  const onPath = resolveBinary('CURSOR_AGENT_PATH', 'cursor-agent');
  if (onPath) return { cmd: onPath, argvPrefix: [], via: 'cursor-agent (PATH or CURSOR_AGENT_PATH)' };

  const cursor = resolveBinary('CURSOR_CLI_PATH', 'cursor');
  if (cursor) return { cmd: cursor, argvPrefix: ['agent'], via: 'cursor agent (PATH or CURSOR_CLI_PATH)' };

  return null;
}

function getCareerOpsRoot() {
  const override = process.env.CAREER_OPS_ROOT?.trim();
  if (override) return path.resolve(override);
  return path.resolve(process.cwd(), '..');
}

function buildArgs(launch, root) {
  const modelId = process.env.CURSOR_AGENT_MODEL?.trim();
  const useStreamJson = process.env.CURSOR_AGENT_OUTPUT_FORMAT === 'stream-json';
  const outputFormat = useStreamJson ? 'stream-json' : 'text';

  const args = [
    ...launch.argvPrefix,
    '--print',
    '--trust',
    '--workspace',
    root,
    '--output-format',
    outputFormat,
    '--force',
  ];
  if (useStreamJson) args.push('--stream-partial-output');
  if (modelId) args.push('--model', modelId);
  if (process.env.CURSOR_AGENT_YOLO === '1' || process.env.CURSOR_AGENT_YOLO === 'true') {
    args.push('--yolo');
  }
  return args;
}

const wantHelp = process.argv.includes('--help-cli');

const root = getCareerOpsRoot();
const launch = resolveCursorAgentLaunch();

console.log('Career-ops root (workspace):', root);
console.log('CURSOR_API_KEY set:', Boolean(process.env.CURSOR_API_KEY?.trim()));
console.log('');

if (!launch) {
  console.error(
    'Could not resolve Cursor agent CLI. Set CURSOR_AGENT_BIN, or put cursor-agent on PATH, or set CURSOR_CLI_PATH to `cursor`.',
  );
  process.exit(1);
}

console.log('Resolved via:', launch.via);
console.log('Command:', launch.cmd);
console.log('Argv prefix (before --print …):', launch.argvPrefix.length ? launch.argvPrefix.join(' ') : '(none)');
const args = buildArgs(launch, root);
console.log('');
console.log('Dashboard would run (prompt appended last by the server):');
console.log(JSON.stringify({ cmd: launch.cmd, args: [...args, '<pipeline prompt string>'] }, null, 2));
console.log('');
console.log('Shell-ish preview (prompt omitted):');
const preview = [launch.cmd, ...args].map((p) => (/\s/.test(p) ? JSON.stringify(p) : p)).join(' ');
console.log(`  ${preview} '<prompt>'`);

if (!wantHelp) {
  console.log('');
  console.log('Tip: npm run cursor-smoke -- --help-cli   # runs --print --help on the resolved binary');
  process.exit(0);
}

const helpArgs = [...launch.argvPrefix, '--print', '--help'];
console.log('');
console.log(`Running: ${launch.cmd} ${helpArgs.join(' ')}`);
const r = spawnSync(launch.cmd, helpArgs, { stdio: 'inherit', cwd: root });
process.exit(r.status ?? 1);
