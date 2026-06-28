import { describe, expect, it } from 'vitest';

import { deriveNoteFields, payCeiling } from '@/lib/derive-note-fields';

describe('payCeiling', () => {
  it('converts pay spans to top dollar amount', () => {
    expect(payCeiling('$140-210K')).toBe(210_000);
    expect(payCeiling('$174,986-209,983')).toBe(209_983);
    expect(payCeiling('~$124.2-198.7K')).toBe(198_700);
    expect(payCeiling('$170K')).toBe(170_000);
    expect(payCeiling('$95-159K')).toBe(159_000);
    expect(payCeiling('')).toBe(0);
  });
});

describe('deriveNoteFields', () => {
  it('remote with posted comma range and rejection date', () => {
    const d = deriveNoteFields({
      date: '2026-06-04',
      notes:
        'Remote US (EST/CST). Base $174,986-209,983 + RSUs (POSTED). Rejected 2026-06-05 (not moving forward). Via Greenhouse',
    });
    expect(d.location).toBe('');
    expect(d.workMode).toBe('Remote');
    expect(d.payRange).toBe('$174,986-209,983');
    expect(d.paySource).toBe('POSTED');
    expect(d.payMax).toBe(209_983);
    expect(d.lastContact).toBe('2026-06-05');
  });

  it('hybrid city state with estimate', () => {
    const d = deriveNoteFields({
      date: '2026-06-03',
      notes:
        'Charlotte NC (Hybrid), via LinkedIn. Comp ~$130-170K (est). Application VIEWED by recruiter 2026-06-04',
    });
    expect(d.location).toBe('Charlotte, NC');
    expect(d.workMode).toBe('Hybrid');
    expect(d.payRange).toBe('~$130-170K');
    expect(d.paySource).toBe('est');
    expect(d.lastContact).toBe('2026-06-04');
  });

  it('bare location implies full onsite, decimal K range', () => {
    const d = deriveNoteFields({
      date: '2026-06-01',
      notes: 'Austin TX (location mismatch). Salary $124.2-198.7K (POSTED)',
    });
    expect(d.location).toBe('Austin, TX');
    expect(d.workMode).toBe('Full');
    expect(d.payRange).toBe('$124.2-198.7K');
    expect(d.paySource).toBe('POSTED');
    expect(d.lastContact).toBe('2026-06-01');
  });

  it('city falls back to role title; timezone parens are not an estimate', () => {
    const d = deriveNoteFields({
      date: '2026-05-31',
      role: 'Sr Software Engineer, Enterprise Systems — Charlotte, NC',
      notes:
        'Referral via friend. Remote US (EST/CST). Comp $100-175K base (recruiter-confirmed)',
    });
    expect(d.location).toBe('Charlotte, NC');
    expect(d.workMode).toBe('Remote');
    expect(d.payRange).toBe('$100-175K');
    expect(d.paySource).toBe('');
    expect(d.lastContact).toBe('2026-05-31');
  });

  it('no false-positive city from prose', () => {
    const d = deriveNoteFields({
      date: '2026-06-01',
      notes: 'Strong fit for Sams AI-augmented edge. Rejected by recruiter Nadia Kong',
    });
    expect(d.location).toBe('');
    expect(d.workMode).toBe('');
    expect(d.payRange).toBe('');
    expect(d.lastContact).toBe('2026-06-01');
  });
});
