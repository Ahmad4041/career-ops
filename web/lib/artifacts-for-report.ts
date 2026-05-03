import fs from 'fs';
import path from 'path';

function parseReportBasename(reportPathRel: string): { num: string; slug: string; date: string } | null {
  const basename = path.basename(reportPathRel, '.md');
  const m = basename.match(/^(\d{3})-(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  const [, num, slug, date] = m;
  return { num, slug, date };
}

function scoreAgainstReport(lowerName: string, num: string, slugLc: string, dates: string): number {
  let score = 0;
  if (lowerName.includes(slugLc)) score += 5;
  if (lowerName.includes(num)) score += 2;
  if (lowerName.includes(dates)) score += 3;
  return score;
}

/** Best-effort artifact in output/ keyed to report slug (same rules as PDF matching). */
export function findArtifactForReport(root: string, reportPathRel: string, ext: `.${string}`): string | null {
  const parsed = parseReportBasename(reportPathRel);
  if (!parsed) return null;
  const { num, slug, date } = parsed;
  const outDir = path.join(root, 'output');
  try {
    if (!fs.statSync(outDir).isDirectory()) return null;
  } catch {
    return null;
  }
  let files: string[];
  try {
    files = fs.readdirSync(outDir).filter((f) => f.endsWith(ext));
  } catch {
    return null;
  }
  let bestPath: string | null = null;
  let best = -1;
  const slugLc = slug.toLowerCase();

  for (const f of files) {
    const lf = f.toLowerCase();
    const s = scoreAgainstReport(lf, num, slugLc, date);
    if (s > best) {
      best = s;
      bestPath = path.join(outDir, f);
    }
  }
  return bestPath && best >= 5 ? bestPath : null;
}

export function basenameOnly(abs: string | null): string | null {
  if (!abs) return null;
  return path.basename(abs);
}
