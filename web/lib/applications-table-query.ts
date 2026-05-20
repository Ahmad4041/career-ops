import type { CareerApplication } from '@/lib/applications-parser';
import { normalizeStatus } from '@/lib/normalize-tracker-status';
import { normalizeCompanyKey } from '@/lib/tracker-duplicate-match';

export type SortKey = 'score' | 'number' | 'date' | 'company' | 'role' | 'status';
export type SortDir = 'asc' | 'desc';

/** All column ids accepted for URL `sort=` and header clicks */
export const SORT_KEYS: readonly SortKey[] = ['score', 'number', 'date', 'company', 'role', 'status'] as const;

export function isSortKey(s: string): s is SortKey {
  return (SORT_KEYS as readonly string[]).includes(s);
}

export type TableQuery = {
  search: string;
  /** Normalized status key from `normalizeStatus()`; empty = all */
  statusNormalized: string;
  /** Normalized company key from `normalizeCompanyKey()`; empty = all */
  companyKey: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

function parseSortDate(s: string): number {
  const t = Date.parse(s.trim());
  return Number.isNaN(t) ? 0 : t;
}

function primaryCompare(a: CareerApplication, b: CareerApplication, key: SortKey): number {
  switch (key) {
    case 'score':
      return (a.score ?? 0) - (b.score ?? 0);
    case 'number':
      return a.number - b.number;
    case 'date':
      return parseSortDate(a.date) - parseSortDate(b.date);
    case 'company':
      return a.company.localeCompare(b.company, undefined, { sensitivity: 'base' });
    case 'role':
      return a.role.localeCompare(b.role, undefined, { sensitivity: 'base' });
    case 'status':
      return normalizeStatus(a.status).localeCompare(normalizeStatus(b.status));
    default:
      return 0;
  }
}

/** Tie-breaker: application # ascending for stable order */
export function sortApplications(rows: CareerApplication[], key: SortKey, dir: SortDir): CareerApplication[] {
  const mul = dir === 'asc' ? 1 : -1;
  const out = [...rows];
  out.sort((a, b) => {
    const c = primaryCompare(a, b, key);
    if (c !== 0) return c * mul;
    return a.number - b.number;
  });
  return out;
}

export function filterApplications(
  rows: CareerApplication[],
  opts: { search: string; statusNormalized: string; companyKey: string },
): CareerApplication[] {
  const q = opts.search.trim().toLowerCase();
  const st = opts.statusNormalized.trim().toLowerCase();
  const ck = opts.companyKey.trim().toLowerCase();
  return rows.filter((row) => {
    if (st && normalizeStatus(row.status) !== st) return false;
    if (ck && normalizeCompanyKey(row.company) !== ck) return false;
    if (!q) return true;
    const blob = `${row.company}\n${row.role}\n${row.notes}`.toLowerCase();
    return blob.includes(q);
  });
}

export function filterThenSort(rows: CareerApplication[], q: TableQuery): CareerApplication[] {
  const filtered = filterApplications(rows, {
    search: q.search,
    statusNormalized: q.statusNormalized,
    companyKey: q.companyKey,
  });
  return sortApplications(filtered, q.sortKey, q.sortDir);
}

/** Unique companies for filter dropdown: key → display label (first seen casing). */
export function companyFilterOptions(rows: CareerApplication[]): { key: string; label: string }[] {
  const map = new Map<string, string>();
  for (const row of rows) {
    const key = normalizeCompanyKey(row.company);
    if (!key) continue;
    if (!map.has(key)) map.set(key, row.company.trim() || key);
  }
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/** First sort direction when switching to a column (matches common spreadsheet defaults). */
export function defaultSortDirForKey(key: SortKey): SortDir {
  if (key === 'company' || key === 'role' || key === 'status') return 'asc';
  return 'desc';
}
