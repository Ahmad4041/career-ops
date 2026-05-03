/**
 * Files the dashboard may read/write via /api/settings.
 * Prefer DATA_CONTRACT.md "User Layer". Template HTML/LaTeX are marked systemTemplate
 * because upstream releases may refresh templates/ — we still expose them because many repos customize locally.
 */

export type SettingsFileMeta = {
  path: string;
  label: string;
  group: 'core' | 'modes' | 'data' | 'templates' | 'prep';
  description: string;
  /** If true, show warning: career-ops updates sometimes replace templates/ */
  systemTemplate?: boolean;
};

export const EDITABLE_SETTINGS_FILES: readonly SettingsFileMeta[] = [
  {
    path: 'config/profile.yml',
    group: 'core',
    label: 'Profile',
    description: 'Name, contacts, targets, language — personalization for tools and modes.',
  },
  {
    path: 'cv.md',
    group: 'core',
    label: 'CV (Markdown)',
    description: 'Canonical CV source before PDF tailoring.',
  },
  {
    path: 'modes/_profile.md',
    group: 'modes',
    label: 'Profile modes overlay',
    description: 'Your archetypes, narrative, negotiation — never put this in modes/_shared.md.',
  },
  {
    path: 'portals.yml',
    group: 'data',
    label: 'Portal scanner',
    description: 'Companies & keywords for scan.mjs / dashboard.',
  },
  {
    path: 'article-digest.md',
    group: 'prep',
    label: 'Article digest',
    description: 'Optional proof-point bullets for evaluations.',
  },
  {
    path: 'interview-prep/story-bank.md',
    group: 'prep',
    label: 'Story bank',
    description: 'STAR+R narrative snippets for interviews.',
  },
  {
    path: 'data/pipeline.md',
    group: 'data',
    label: 'Pipeline inbox',
    description: 'Pending job URLs before processing.',
  },
  {
    path: 'data/follow-ups.md',
    group: 'data',
    label: 'Follow-ups',
    description: 'Application follow-up log.',
  },
  {
    path: 'templates/cv-template.html',
    group: 'templates',
    label: 'CV HTML template',
    description: 'Layout for ATS HTML → PDF (Playwright).',
    systemTemplate: true,
  },
  {
    path: 'templates/cv-template.tex',
    group: 'templates',
    label: 'CV LaTeX template',
    description: 'Overleaf-ready LaTeX template.',
    systemTemplate: true,
  },
] as const;

const ALLOWED = new Set(EDITABLE_SETTINGS_FILES.map((x) => x.path));

/** POSIX-style repo-relative path, no traversal */
export function parseSafeSettingsPath(raw: string): string | null {
  const s = raw.replace(/\\/g, '/').trim();
  if (!s || s.startsWith('/') || s.includes('\0')) return null;
  const normalized = pathPosixNormalize(s);
  if (!normalized) return null;
  if (!ALLOWED.has(normalized)) return null;
  return normalized;
}

function pathPosixNormalize(p: string): string | null {
  const parts = p.split('/').filter((seg) => seg !== '' && seg !== '.');
  for (const seg of parts) {
    if (seg === '..') return null;
  }
  const out = parts.join('/');
  return out.length > 0 ? out : null;
}

export function getSettingsMeta(repoPath: string): SettingsFileMeta | undefined {
  return EDITABLE_SETTINGS_FILES.find((m) => m.path === repoPath);
}
