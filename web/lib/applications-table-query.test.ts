import { describe, expect, it } from 'vitest';

import {
  defaultSortDirForKey,
  filterApplications,
  filterThenSort,
  isSortKey,
  sortApplications,
} from '@/lib/applications-table-query';
import type { CareerApplication } from '@/lib/applications-parser';

function app(p: Partial<CareerApplication> & Pick<CareerApplication, 'number' | 'company'>): CareerApplication {
  return {
    date: p.date ?? '2026-01-01',
    role: p.role ?? 'Engineer',
    status: p.status ?? 'Evaluated',
    score: p.score ?? 0,
    scoreRaw: p.scoreRaw ?? '—',
    hasPdf: p.hasPdf ?? false,
    reportPath: p.reportPath ?? '',
    reportNumber: p.reportNumber ?? '',
    notes: p.notes ?? '',
    jobUrl: p.jobUrl ?? '',
    linkedPdfBasename: p.linkedPdfBasename ?? null,
    linkedHtmlBasename: p.linkedHtmlBasename ?? null,
    linkedTexBasename: p.linkedTexBasename ?? null,
    duplicateOf: p.duplicateOf ?? null,
    duplicateNote: p.duplicateNote ?? null,
    ...p,
  };
}

const noExtraFilters = { search: '', statusNormalized: '', companyKey: '' };

describe('isSortKey', () => {
  it('accepts valid column keys', () => {
    expect(isSortKey('score')).toBe(true);
    expect(isSortKey('company')).toBe(true);
  });
  it('rejects invalid', () => {
    expect(isSortKey('nope')).toBe(false);
  });
});

describe('defaultSortDirForKey', () => {
  it('uses asc for text columns', () => {
    expect(defaultSortDirForKey('company')).toBe('asc');
    expect(defaultSortDirForKey('status')).toBe('asc');
  });
  it('uses desc for score and date', () => {
    expect(defaultSortDirForKey('score')).toBe('desc');
    expect(defaultSortDirForKey('date')).toBe('desc');
  });
});

describe('filterApplications', () => {
  const rows: CareerApplication[] = [
    app({ number: 1, company: 'Acme', status: 'Evaluated', notes: 'try me' }),
    app({ number: 2, company: 'Other', status: 'Applied' }),
  ];

  it('returns all when no search and no status', () => {
    expect(filterApplications(rows, noExtraFilters)).toHaveLength(2);
  });

  it('filters by search in company (case-insensitive)', () => {
    const r = filterApplications(rows, { ...noExtraFilters, search: 'acm' });
    expect(r).toHaveLength(1);
    expect(r[0]!.company).toBe('Acme');
  });

  it('filters by search in notes', () => {
    const r = filterApplications(rows, { ...noExtraFilters, search: 'try' });
    expect(r).toHaveLength(1);
  });

  it('filters by normalized status', () => {
    const r = filterApplications(rows, { ...noExtraFilters, statusNormalized: 'evaluated' });
    expect(r).toHaveLength(1);
    expect(r[0]!.number).toBe(1);
  });

  it('filters by company key', () => {
    const r = filterApplications(rows, { ...noExtraFilters, companyKey: 'other' });
    expect(r).toHaveLength(1);
    expect(r[0]!.number).toBe(2);
  });
});

describe('sortApplications', () => {
  const rows: CareerApplication[] = [
    app({ number: 1, company: 'Zeta', score: 4 }),
    app({ number: 2, company: 'Alpha', score: 5 }),
  ];

  it('sorts by score descending', () => {
    const out = sortApplications(rows, 'score', 'desc');
    expect(out.map((r) => r.number)).toEqual([2, 1]);
  });

  it('tie-breaks by application number ascending', () => {
    const tie: CareerApplication[] = [
      app({ number: 10, company: 'A', score: 4 }),
      app({ number: 3, company: 'B', score: 4 }),
    ];
    const out = sortApplications(tie, 'score', 'desc');
    expect(out.map((r) => r.number)).toEqual([3, 10]);
  });
});

describe('filterThenSort', () => {
  it('filters then sorts', () => {
    const rows: CareerApplication[] = [
      app({ number: 1, company: 'Acme', score: 3 }),
      app({ number: 2, company: 'Acme Corp', score: 5 }),
      app({ number: 3, company: 'Other', score: 5 }),
    ];
    const out = filterThenSort(rows, {
      search: 'acme',
      statusNormalized: '',
      companyKey: '',
      sortKey: 'score',
      sortDir: 'desc',
    });
    expect(out).toHaveLength(2);
    expect(out[0]!.number).toBe(2);
  });
});
