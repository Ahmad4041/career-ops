import fs from 'fs';
import path from 'path';

import {
  assertSafeCvTemplateRelative,
  assertSafeCvTexTemplateRelative,
  safeTemplateBasename,
  safeTexTemplateBasename,
} from '@/lib/pdf-template-paths';

/**
 * Files the dashboard may read/write via /api/settings.
 * Prefer DATA_CONTRACT.md "User Layer". Template HTML/LaTeX are marked systemTemplate
 * because upstream releases may refresh templates/ — we still expose them because many repos customize locally.
 *
 * CV layouts under templates/*.html and templates/*.tex are discovered from disk (see buildSettingsFileCatalog).
 */

export type SettingsFileMeta = {
  path: string;
  label: string;
  group: 'core' | 'modes' | 'data' | 'templates' | 'prep';
  description: string;
  /** If true, show warning: career-ops updates sometimes replace templates/ */
  systemTemplate?: boolean;
};

/** Non-template paths (templates/ is filled by discovery). */
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
    path: 'voice-dna.md',
    group: 'modes',
    label: 'Voice DNA',
    description:
      'Optional anti-AI-slop writing guardrail — banned words, tone rules, and voice for cover letters and outreach.',
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
    path: 'templates/README.md',
    group: 'templates',
    label: 'Templates guide',
    description: 'Placeholder tokens, HTML vs LaTeX patterns, agent prompts.',
    systemTemplate: true,
  },
] as const;

const STATIC_ALLOWED = new Set(EDITABLE_SETTINGS_FILES.map((x) => x.path));

const TEMPLATE_LABEL_OVERRIDES: Record<string, { label: string; description?: string }> = {
  'templates/cv-template.html': {
    label: 'CV HTML template (default)',
    description: 'Layout for ATS HTML → PDF (Playwright). Full section placeholders.',
  },
  'templates/cv-minimal-slot.html': {
    label: 'CV HTML (minimal slot)',
    description: 'Single-column layout using {{CONTENT_HTML}} for the CV body from cv.md.',
  },
  'templates/cv-template.tex': {
    label: 'CV LaTeX template (default)',
    description: 'Overleaf-ready LaTeX template.',
  },
};

function pathPosixNormalize(p: string): string | null {
  const parts = p.split('/').filter((seg) => seg !== '' && seg !== '.');
  for (const seg of parts) {
    if (seg === '..') return null;
  }
  const out = parts.join('/');
  return out.length > 0 ? out : null;
}

function humanizeTemplateBasename(filename: string): string {
  const stem = filename.replace(/\.(html|tex)$/i, '');
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function metaForTemplatePath(repoPath: string): SettingsFileMeta | null {
  if (repoPath.endsWith('.html')) {
    if (!assertSafeCvTemplateRelative(repoPath)) return null;
    const base = repoPath.split('/').pop()!;
    const override = TEMPLATE_LABEL_OVERRIDES[repoPath];
    return {
      path: repoPath,
      group: 'templates',
      label: override?.label ?? `CV HTML — ${humanizeTemplateBasename(base)}`,
      description:
        override?.description ??
        'HTML CV layout for render-cv-html-from-template.mjs and dashboard PDF export.',
      systemTemplate: true,
    };
  }
  if (repoPath.endsWith('.tex')) {
    if (!assertSafeCvTexTemplateRelative(repoPath)) return null;
    const base = repoPath.split('/').pop()!;
    const override = TEMPLATE_LABEL_OVERRIDES[repoPath];
    return {
      path: repoPath,
      group: 'templates',
      label: override?.label ?? `CV LaTeX — ${humanizeTemplateBasename(base)}`,
      description:
        override?.description ??
        'LaTeX CV source for render-cv-tex-from-template.mjs and dashboard LaTeX export.',
      systemTemplate: true,
    };
  }
  return null;
}

/** Scan templates/ for editable .html and .tex CV layouts. */
export function discoverTemplateSettingsFiles(root: string): SettingsFileMeta[] {
  const dir = path.join(root, 'templates');
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out: SettingsFileMeta[] = [];
  for (const name of names.sort((a, b) => a.localeCompare(b))) {
    if (name.startsWith('.')) continue;
    const rel =
      name.endsWith('.html') && safeTemplateBasename(name)
        ? `templates/${name}`
        : name.endsWith('.tex') && safeTexTemplateBasename(name)
          ? `templates/${name}`
          : null;
    if (!rel) continue;
    const meta = metaForTemplatePath(rel);
    if (meta) out.push(meta);
  }
  return out;
}

/** Full sidebar catalog: static files + every templates/*.html and templates/*.tex on disk. */
export function buildSettingsFileCatalog(root: string): SettingsFileMeta[] {
  const byPath = new Map<string, SettingsFileMeta>();
  for (const m of EDITABLE_SETTINGS_FILES) {
    byPath.set(m.path, m);
  }
  for (const m of discoverTemplateSettingsFiles(root)) {
    byPath.set(m.path, m);
  }
  const order: SettingsFileMeta['group'][] = ['core', 'modes', 'data', 'prep', 'templates'];
  const groupRank = new Map(order.map((g, i) => [g, i]));
  return [...byPath.values()].sort((a, b) => {
    const ga = groupRank.get(a.group) ?? 99;
    const gb = groupRank.get(b.group) ?? 99;
    if (ga !== gb) return ga - gb;
    return a.path.localeCompare(b.path);
  });
}

/** POSIX-style repo-relative path, no traversal */
export function parseSafeSettingsPath(raw: string): string | null {
  const s = raw.replace(/\\/g, '/').trim();
  if (!s || s.startsWith('/') || s.includes('\0')) return null;
  const normalized = pathPosixNormalize(s);
  if (!normalized) return null;
  if (STATIC_ALLOWED.has(normalized)) return normalized;
  if (assertSafeCvTemplateRelative(normalized) || assertSafeCvTexTemplateRelative(normalized)) {
    return normalized;
  }
  return null;
}

export function getSettingsMeta(repoPath: string): SettingsFileMeta | undefined {
  const staticMeta = EDITABLE_SETTINGS_FILES.find((m) => m.path === repoPath);
  if (staticMeta) return staticMeta;
  return metaForTemplatePath(repoPath) ?? undefined;
}
