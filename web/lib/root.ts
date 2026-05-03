import path from 'path';

/**
 * Filesystem root of the career-ops repo (parent of ./web).
 * Override with CAREER_OPS_ROOT when the app runs outside the default layout.
 */
export function getCareerOpsRoot(): string {
  const override = process.env.CAREER_OPS_ROOT?.trim();
  if (override) return path.resolve(override);
  return path.resolve(process.cwd(), '..');
}
