import { findArtifactForReport } from '@/lib/artifacts-for-report';

/**
 * Locate best PDF in repo `output/` for a report slug like reports/008-acme-co-2026-05-01.md
 */
export function findPdfForReport(root: string, reportPathRel: string): string | null {
  return findArtifactForReport(root, reportPathRel, '.pdf');
}
