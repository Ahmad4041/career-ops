import { getCareerOpsRoot } from '@/lib/root';
import { resolveBinary } from '@/lib/resolve-binary';

export async function GET() {
  const careerOpsRoot = getCareerOpsRoot();
  const claudePath = resolveBinary('CLAUDE_CLI_PATH', 'claude');
  const cursorPath = resolveBinary('CURSOR_CLI_PATH', 'cursor');
  const antigravityPath = resolveBinary('ANTIGRAVITY_CLI_PATH', 'agy');
  const bashPath = resolveBinary('BASH_PATH', 'bash') ?? (process.platform === 'win32' ? null : '/bin/bash');

  return Response.json({
    careerOpsRoot,
    platform: process.platform,
    claude: { path: claudePath, available: Boolean(claudePath) },
    cursor: { path: cursorPath, available: Boolean(cursorPath) },
    antigravity: { path: antigravityPath, available: Boolean(antigravityPath) },
    bash: { path: bashPath, available: Boolean(bashPath) },
    envHints: {
      CAREER_OPS_ROOT: 'Override filesystem root',
      CLAUDE_CLI_PATH: 'Path to Claude Code `claude` binary',
      CURSOR_CLI_PATH: 'Path to `cursor` (Cursor IDE launcher)',
      ANTIGRAVITY_CLI_PATH: 'Path to Antigravity CLI `agy` binary',
      BASH_PATH: 'POSIX shell for batch-runner scripts',
    },
  });
}
