import fs from 'fs';
import path from 'path';

/** Default English modes live at repo root `modes/`. */
export const DEFAULT_MODES_DIR = 'modes';

export type LanguageModeOption = {
  code: string;
  modesDir: string;
  label: string;
};

/** Upstream-supported locale packs (excluding default English). */
export const LANGUAGE_MODE_LOCALES: readonly LanguageModeOption[] = [
  { code: 'de', modesDir: 'modes/de', label: 'German (DACH)' },
  { code: 'fr', modesDir: 'modes/fr', label: 'French' },
  { code: 'ja', modesDir: 'modes/ja', label: 'Japanese' },
  { code: 'tr', modesDir: 'modes/tr', label: 'Turkish' },
  { code: 'zh', modesDir: 'modes/zh', label: 'Chinese' },
];

const PROFILE_REL = 'config/profile.yml';

export function profileYamlPath(root: string): string {
  return path.join(root, ...PROFILE_REL.split('/'));
}

/** Normalize stored value; `null` means default English (`modes/`). */
export function normalizeModesDir(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = raw.trim().replace(/\/$/, '');
  if (!v || v === 'modes') return null;
  return v;
}

/** Lightweight parse — no YAML dependency in web/. */
export function parseModesDirFromProfileYaml(text: string): string | null {
  const m = /^\s*modes_dir:\s*(.+?)\s*$/m.exec(text);
  if (!m?.[1]) return null;
  const raw = m[1].split('#')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  return normalizeModesDir(raw);
}

function languageBlockBounds(lines: string[]): { start: number; end: number; modesDirLine: number } | null {
  for (let i = 0; i < lines.length; i++) {
    if (!/^language:\s*(#.*)?$/.test(lines[i]!)) continue;
    let modesDirLine = -1;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]!;
      if (/^\S/.test(line) && !line.startsWith('#')) {
        end = j;
        break;
      }
      if (/^\s*modes_dir:/.test(line)) modesDirLine = j;
    }
    return { start: i, end, modesDirLine };
  }
  return null;
}

function languageBlockHasKeys(lines: string[], bounds: { start: number; end: number }): boolean {
  for (let i = bounds.start + 1; i < bounds.end; i++) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^\S/.test(lines[i]!)) break;
    return true;
  }
  return false;
}

/** Insert, update, or remove `language.modes_dir` in profile YAML text. */
export function applyModesDirToProfileYaml(text: string, modesDir: string | null): string {
  const normalized = normalizeModesDir(modesDir);
  const lines = text.split('\n');
  const bounds = languageBlockBounds(lines);

  if (normalized === null) {
    if (!bounds || bounds.modesDirLine < 0) return text;
    lines.splice(bounds.modesDirLine, 1);
    const after = { start: bounds.start, end: bounds.end > bounds.modesDirLine ? bounds.end - 1 : bounds.end };
    if (!languageBlockHasKeys(lines, after)) {
      lines.splice(after.start, 1);
      while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    }
    return lines.join('\n');
  }

  const newLine = `  modes_dir: ${normalized}`;

  if (bounds) {
    if (bounds.modesDirLine >= 0) {
      lines[bounds.modesDirLine] = newLine;
    } else {
      lines.splice(bounds.start + 1, 0, newLine);
    }
    return lines.join('\n');
  }

  const suffix = text.endsWith('\n') || text.length === 0 ? '' : '\n';
  const block = text.length === 0 ? '' : suffix;
  return `${text}${block}language:\n${newLine}\n`;
}

export function discoverAvailableLanguageModes(root: string): LanguageModeOption[] {
  const options: LanguageModeOption[] = [
    { code: 'en', modesDir: DEFAULT_MODES_DIR, label: 'English (default)' },
  ];
  for (const locale of LANGUAGE_MODE_LOCALES) {
    const codeDir = path.join(root, 'modes', locale.code);
    try {
      if (fs.existsSync(codeDir) && fs.statSync(codeDir).isDirectory()) {
        options.push(locale);
      }
    } catch {
      /* ignore */
    }
  }
  return options;
}

export function isAllowedModesDir(modesDir: string | null, options: LanguageModeOption[]): boolean {
  const normalized = normalizeModesDir(modesDir);
  if (normalized === null) return true;
  return options.some((o) => normalizeModesDir(o.modesDir) === normalized);
}

export function readProfileYaml(root: string): { content: string; exists: boolean } {
  const abs = profileYamlPath(root);
  try {
    if (!fs.existsSync(abs)) return { content: '', exists: false };
    return { content: fs.readFileSync(abs, 'utf8'), exists: true };
  } catch {
    return { content: '', exists: false };
  }
}

export function writeModesDirToProfile(root: string, modesDir: string | null): {
  modesDir: string | null;
  created: boolean;
} {
  const { content, exists } = readProfileYaml(root);
  const next = applyModesDirToProfileYaml(content, modesDir);
  const abs = profileYamlPath(root);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, next, 'utf8');
  return { modesDir: normalizeModesDir(modesDir), created: !exists };
}
