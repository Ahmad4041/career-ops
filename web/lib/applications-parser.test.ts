import { describe, expect, it } from 'vitest';

import { normalizeReportPath, resolveTrackerRowFields } from './applications-parser';

describe('resolveTrackerRowFields', () => {
  it('parses standard 9-column row', () => {
    const fields = [
      '103',
      '2026-06-19',
      'Shield Recruitment',
      'Generative AI Engineer',
      '3.1/5',
      'Evaluated',
      '✅',
      '[103](reports/103-shield.md)',
      'notes here',
    ];
    const r = resolveTrackerRowFields(fields);
    expect(r.scoreRaw).toBe('3.1/5');
    expect(r.score).toBe(3.1);
    expect(r.status).toBe('Evaluated');
    expect(r.hasPdf).toBe(true);
    expect(r.reportNumber).toBe('103');
    expect(r.notes).toBe('notes here');
  });

  it('handles extra column before score (Aquent #105 corruption)', () => {
    const fields = [
      '105',
      '2026-06-26',
      'Aquent (Mobile Squad)',
      'Full Stack Engineer',
      'Mobile Squad',
      '3.9/5',
      'Evaluated',
      '✅',
      '[105](../reports/105-aquent-mobile-squad-2026-06-26.md)',
      'Melbourne hybrid contract',
    ];
    const r = resolveTrackerRowFields(fields);
    expect(r.scoreRaw).toBe('3.9/5');
    expect(r.score).toBe(3.9);
    expect(r.status).toBe('Evaluated');
    expect(r.hasPdf).toBe(true);
    expect(r.reportPath).toContain('105-aquent');
    expect(r.notes).toBe('Melbourne hybrid contract');
  });
});

describe('normalizeReportPath', () => {
  it('strips leading ../ from tracker-relative links', () => {
    expect(normalizeReportPath('../reports/105-aquent.md')).toBe('reports/105-aquent.md');
  });
});
