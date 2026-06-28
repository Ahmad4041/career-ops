import { getCareerOpsRoot } from '@/lib/root';

/**
 * Copy/paste shells for Claude Code (`claude`) and Cursor launcher — mirrors what the dashboard API launches.
 */
export async function GET() {
  const root = getCareerOpsRoot();

  return Response.json({
    careerOpsRoot: root,
    terminalRecipes: [
      {
        id: 'claude-interactive',
        label: 'Claude Code in this repo',
        shell: `cd "${root}" && claude`,
      },
      {
        id: 'cursor-open-folder',
        label: 'Open repo in Cursor',
        shell: `cursor "${root}"`,
      },
      {
        id: 'antigravity-interactive',
        label: 'Antigravity CLI in this repo',
        shell: `cd "${root}" && agy`,
      },
      {
        id: 'claude-batch-dry-run',
        label: 'Batch runner dry-run (same as web button)',
        shell: `cd "${root}/batch" && ./batch-runner.sh --dry-run`,
      },
      {
        id: 'claude-scan',
        label: 'Portal scan via Node',
        shell: `cd "${root}" && node scan.mjs`,
      },
    ],
  });
}
