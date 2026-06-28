import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  diffEvalArtifacts,
  snapshotEvalArtifacts,
} from './verify-eval-artifacts';

describe('verify-eval-artifacts', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('detects new report and tracker files', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'co-artifacts-'));
    fs.mkdirSync(path.join(tmp, 'batch', 'tracker-additions'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'reports'), { recursive: true });

    const before = snapshotEvalArtifacts(tmp);
    fs.writeFileSync(path.join(tmp, 'reports', '104-test.md'), '# test');
    const after = snapshotEvalArtifacts(tmp);
    const diff = diffEvalArtifacts(before, after);

    expect(diff.ok).toBe(true);
    expect(diff.newReports).toEqual(['104-test.md']);
    expect(diff.newTracker).toEqual([]);
  });

  it('returns not ok when nothing new was written', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'co-artifacts-'));
    fs.mkdirSync(path.join(tmp, 'batch', 'tracker-additions'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'reports', 'existing.md'), '# old');

    const before = snapshotEvalArtifacts(tmp);
    const diff = diffEvalArtifacts(before, snapshotEvalArtifacts(tmp));
    expect(diff.ok).toBe(false);
  });
});
