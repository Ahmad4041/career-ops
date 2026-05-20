import { isSortKey, type SortDir, type SortKey } from '@/lib/applications-table-query';

const DEFAULT_SORT_KEY: SortKey = 'score';
const DEFAULT_SORT_DIR: SortDir = 'desc';

export type TableQueryFromUrl = {
  q: string;
  status: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function parseTableQueryFromUrl(sp: URLSearchParams): TableQueryFromUrl {
  const q = sp.get('q') ?? '';
  const status = sp.get('status') ?? '';
  const sortRaw = sp.get('sort');
  const dirRaw = sp.get('dir');
  let sortKey: SortKey = DEFAULT_SORT_KEY;
  let sortDir: SortDir = DEFAULT_SORT_DIR;
  if (sortRaw && isSortKey(sortRaw)) sortKey = sortRaw;
  if (dirRaw === 'asc' || dirRaw === 'desc') sortDir = dirRaw;
  return { q, status, sortKey, sortDir };
}

/**
 * Build query string for bookmarkable table state. Omits params that match defaults
 * (empty search, empty status, sort score+desc).
 */
export function buildTableQueryString(p: {
  q: string;
  status: string;
  sortKey: SortKey;
  sortDir: SortDir;
}): string {
  const sp = new URLSearchParams();
  const qt = p.q.trim();
  if (qt) sp.set('q', qt);
  const st = p.status.trim();
  if (st) sp.set('status', st);
  const isDefaultSort = p.sortKey === DEFAULT_SORT_KEY && p.sortDir === DEFAULT_SORT_DIR;
  if (!isDefaultSort) {
    sp.set('sort', p.sortKey);
    sp.set('dir', p.sortDir);
  }
  return sp.toString();
}
