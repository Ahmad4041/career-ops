import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildSettingsFileCatalog,
  discoverTemplateSettingsFiles,
  parseSafeSettingsPath,
} from '@/lib/settings-allowlist';

const tmpDirs: string[] = [];

function makeTmpRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-settings-'));
  tmpDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  return dir;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('parseSafeSettingsPath', () => {
  it('allows discovered template paths', () => {
    expect(parseSafeSettingsPath('templates/cv-minimal-slot.html')).toBe(
      'templates/cv-minimal-slot.html',
    );
    expect(parseSafeSettingsPath('templates/my-cv.tex')).toBe('templates/my-cv.tex');
  });

  it('rejects traversal and non-template paths', () => {
    expect(parseSafeSettingsPath('../cv.md')).toBeNull();
    expect(parseSafeSettingsPath('templates/states.yml')).toBeNull();
    expect(parseSafeSettingsPath('templates/nested/foo.html')).toBeNull();
  });
});

describe('discoverTemplateSettingsFiles', () => {
  it('lists all html and tex files in templates/', () => {
    const root = makeTmpRepo({
      'templates/cv-template.html': '<html></html>',
      'templates/cv-minimal-slot.html': '<html></html>',
      'templates/cv-template.tex': '\\documentclass{article}',
      'templates/states.yml': 'states: []',
      'templates/README.md': '# readme',
    });
    const paths = discoverTemplateSettingsFiles(root).map((m) => m.path);
    expect(paths).toEqual([
      'templates/cv-minimal-slot.html',
      'templates/cv-template.html',
      'templates/cv-template.tex',
    ]);
  });
});

describe('buildSettingsFileCatalog', () => {
  it('merges static files with discovered templates', () => {
    const root = makeTmpRepo({
      'templates/cv-template.html': '<html></html>',
      'templates/cv-minimal-slot.html': '<html></html>',
      'templates/cv-template.tex': '\\documentclass{article}',
      'cv.md': '# CV',
    });
    const paths = buildSettingsFileCatalog(root).map((m) => m.path);
    expect(paths).toContain('cv.md');
    expect(paths).toContain('templates/cv-minimal-slot.html');
    expect(paths).toContain('templates/README.md');
  });
});
