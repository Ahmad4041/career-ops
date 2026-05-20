export type TableDensity = 'comfortable' | 'compact';

const STORAGE_KEY = 'careerOpsTableDensity';

export function loadTableDensity(): TableDensity {
  if (typeof window === 'undefined') return 'comfortable';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'compact' || v === 'comfortable') return v;
  } catch {
    /* ignore */
  }
  return 'comfortable';
}

export function saveTableDensity(d: TableDensity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, d);
  } catch {
    /* ignore */
  }
}

/** Body cells */
export function tableCellPad(d: TableDensity): string {
  return d === 'compact' ? 'px-2 py-1' : 'px-3 py-2';
}

/** Sortable header `<th>` padding */
export function tableHeaderPad(d: TableDensity): string {
  return d === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2';
}
