import fs from 'fs';
import path from 'path';

export type EvalArtifactSnapshot = {
  trackerFiles: Set<string>;
  reportFiles: Set<string>;
};

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
  } catch {
    return [];
  }
}

export function snapshotEvalArtifacts(root: string): EvalArtifactSnapshot {
  return {
    trackerFiles: new Set(safeReaddir(path.join(root, 'batch', 'tracker-additions'))),
    reportFiles: new Set(safeReaddir(path.join(root, 'reports'))),
  };
}

export function diffEvalArtifacts(
  before: EvalArtifactSnapshot,
  after: EvalArtifactSnapshot,
): { ok: boolean; newTracker: string[]; newReports: string[] } {
  const newTracker = [...after.trackerFiles].filter((f) => !before.trackerFiles.has(f));
  const newReports = [...after.reportFiles].filter((f) => !before.reportFiles.has(f));
  return {
    ok: newTracker.length > 0 || newReports.length > 0,
    newTracker,
    newReports,
  };
}
