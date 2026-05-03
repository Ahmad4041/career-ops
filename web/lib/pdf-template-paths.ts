import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';

const TEMPLATES_DIR = 'templates';

export type PdfTemplateListing = {
  relativePath: string;
  basename: string;
  bytes: number;
};

export function listHtmlCvTemplates(): PdfTemplateListing[] {
  const root = getCareerOpsRoot();
  const dir = path.join(root, TEMPLATES_DIR);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith('.html') && !n.startsWith('.') && safeTemplateBasename(n))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const fp = path.join(dir, name);
      let sz = 0;
      try {
        sz = fs.statSync(fp).size;
      } catch {
        /* skip */
      }
      return {
        relativePath: path.posix.join(TEMPLATES_DIR, name),
        basename: name,
        bytes: sz,
      };
    });
}

/** Only simple ASCII filenames — drop odd paths even if FS allows */
export function safeTemplateBasename(filename: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.html$/i.test(filename);
}

export function safeTexTemplateBasename(filename: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.tex$/i.test(filename);
}

/**
 * Validates `templates/<name>.html` under repo root; no traversal.
 */
export function assertSafeCvTemplateRelative(input: string): string | null {
  const normalized = input.replace(/\\/g, '/').trim();
  if (!normalized || normalized.includes('..') || normalized.includes('\0')) return null;
  const posix = normalized.replace(/^\/+/, '');
  const prefix = `${TEMPLATES_DIR}/`;
  if (!posix.startsWith(prefix)) return null;
  const rest = posix.slice(prefix.length);
  const base = rest.split('/').pop() ?? '';
  if (rest.includes('/') || !base.endsWith('.html')) return null;
  if (!safeTemplateBasename(base)) return null;
  return posix;
}

/** Same rules for CV LaTeX source under templates/ */
export function assertSafeCvTexTemplateRelative(input: string): string | null {
  const normalized = input.replace(/\\/g, '/').trim();
  if (!normalized || normalized.includes('..') || normalized.includes('\0')) return null;
  const posix = normalized.replace(/^\/+/, '');
  const prefix = `${TEMPLATES_DIR}/`;
  if (!posix.startsWith(prefix)) return null;
  const rest = posix.slice(prefix.length);
  const base = rest.split('/').pop() ?? '';
  if (rest.includes('/') || !base.endsWith('.tex')) return null;
  if (!safeTexTemplateBasename(base)) return null;
  return posix;
}

export function templateAbsolutePath(repoRelativePosix: string): string {
  const root = getCareerOpsRoot();
  return path.join(root, ...repoRelativePosix.split('/'));
}
