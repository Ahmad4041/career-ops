import fs from 'fs';
import path from 'path';

/** Next 3-digit report number matching reports/{###}-{slug}-{date}.md */
export function nextReportNumber(repoRoot: string): string {
  const reportsDir = path.join(repoRoot, 'reports');
  if (!fs.existsSync(reportsDir)) return '001';

  let max = 0;
  for (const ent of fs.readdirSync(reportsDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
    const m = ent.name.match(/^(\d{3})-/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  const next = max + 1;
  return String(next).padStart(3, '0');
}
