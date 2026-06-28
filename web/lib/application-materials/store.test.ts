import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadMaterials, saveMaterials } from '@/lib/application-materials/store';
import { EMPTY_MATERIALS } from '@/lib/application-materials/types';

describe('loadMaterials coverLetterSalutation', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'career-ops-mat-'));

  afterEach(() => {
    const dir = path.join(tmpRoot, 'data/application-materials');
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    }
  });

  it('defaults salutation to empty string', () => {
    const m = loadMaterials(tmpRoot, 7, { company: 'Acme', role: 'Eng', reportPath: '' });
    expect(m.coverLetterSalutation).toBe('');
  });

  it('round-trips salutation via save/load', () => {
    const base = EMPTY_MATERIALS(7, 'Acme', 'Eng', '');
    const saved = saveMaterials(tmpRoot, {
      ...base,
      coverLetterSalutation: 'Dear Acme team,',
      coverLetter: 'Opening paragraph.',
    });
    expect(saved).toMatch(/data\/application-materials\/7\.json/);
    const loaded = loadMaterials(tmpRoot, 7, { company: 'Acme', role: 'Eng', reportPath: '' });
    expect(loaded.coverLetterSalutation).toBe('Dear Acme team,');
    expect(loaded.coverLetter).toBe('Opening paragraph.');
  });
});
