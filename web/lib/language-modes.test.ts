import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyModesDirToProfileYaml,
  discoverAvailableLanguageModes,
  isAllowedModesDir,
  normalizeModesDir,
  parseModesDirFromProfileYaml,
  writeModesDirToProfile,
} from '@/lib/language-modes';

const tmpDirs: string[] = [];

function makeTmpRepo(dirs: string[] = ['de', 'fr']): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-lang-modes-'));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'config'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'modes'), { recursive: true });
  for (const code of dirs) {
    fs.mkdirSync(path.join(dir, 'modes', code), { recursive: true });
  }
  return dir;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('normalizeModesDir', () => {
  it('treats modes/ as default English', () => {
    expect(normalizeModesDir('modes/')).toBeNull();
    expect(normalizeModesDir('modes')).toBeNull();
    expect(normalizeModesDir(null)).toBeNull();
  });

  it('normalizes trailing slash', () => {
    expect(normalizeModesDir('modes/de/')).toBe('modes/de');
  });
});

describe('parseModesDirFromProfileYaml', () => {
  it('reads modes_dir under language block', () => {
    const yaml = `candidate:\n  full_name: "Jane"\nlanguage:\n  primary: de\n  modes_dir: modes/de\n`;
    expect(parseModesDirFromProfileYaml(yaml)).toBe('modes/de');
  });

  it('returns null when absent', () => {
    expect(parseModesDirFromProfileYaml('candidate:\n  full_name: "Jane"\n')).toBeNull();
  });
});

describe('applyModesDirToProfileYaml', () => {
  it('adds language block to empty file', () => {
    const out = applyModesDirToProfileYaml('', 'modes/fr');
    expect(out).toBe('language:\n  modes_dir: modes/fr\n');
  });

  it('updates existing modes_dir', () => {
    const yaml = `language:\n  primary: de\n  modes_dir: modes/de\n`;
    const out = applyModesDirToProfileYaml(yaml, 'modes/ja');
    expect(out).toContain('modes_dir: modes/ja');
    expect(out).toContain('primary: de');
  });

  it('removes modes_dir for default English', () => {
    const yaml = `language:\n  modes_dir: modes/de\n`;
    expect(applyModesDirToProfileYaml(yaml, null)).toBe('');
  });

  it('preserves other keys when clearing modes_dir', () => {
    const yaml = `language:\n  primary: fr\n  modes_dir: modes/fr\n`;
    const out = applyModesDirToProfileYaml(yaml, null);
    expect(out).toContain('primary: fr');
    expect(out).not.toContain('modes_dir');
  });
});

describe('discoverAvailableLanguageModes', () => {
  it('always includes English and existing locale dirs', () => {
    const root = makeTmpRepo(['de', 'ja']);
    const options = discoverAvailableLanguageModes(root);
    expect(options.map((o) => o.code)).toEqual(['en', 'de', 'ja']);
  });
});

describe('writeModesDirToProfile', () => {
  it('creates profile.yml when missing', () => {
    const root = makeTmpRepo([]);
    const { created, modesDir } = writeModesDirToProfile(root, 'modes/tr');
    expect(created).toBe(true);
    expect(modesDir).toBe('modes/tr');
    const text = fs.readFileSync(path.join(root, 'config/profile.yml'), 'utf8');
    expect(text).toContain('modes_dir: modes/tr');
  });

  it('rejects disallowed dirs via isAllowedModesDir', () => {
    const root = makeTmpRepo(['de']);
    const options = discoverAvailableLanguageModes(root);
    expect(isAllowedModesDir('modes/zh', options)).toBe(false);
    expect(isAllowedModesDir('modes/de', options)).toBe(true);
  });
});
