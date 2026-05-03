import fs from 'fs';
import path from 'path';

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Lightweight read (no YAML parser dependency in web/). */
export function readCandidateSlugFromProfile(root: string): string | null {
  const p = path.join(root, 'config', 'profile.yml');
  try {
    const text = fs.readFileSync(p, 'utf8');
    const mq = /\bfull_name:\s*"([^"]+)"/.exec(text);
    if (mq?.[1]) return slugifyName(mq[1]);
    const m = /\bfull_name:\s*(.+)$/.exec(text);
    const raw = m?.[1]?.split('#')[0]?.trim()?.replace(/^['"]|['"]$/g, '') ?? '';
    if (!raw) return null;
    return slugifyName(raw);
  } catch {
    return null;
  }
}
