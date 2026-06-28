export type OptionalColumnId =
  | 'date'
  | 'location'
  | 'pay'
  | 'report'
  | 'pdf'
  | 'lastContact';

export type FixedColumnId =
  | 'number'
  | 'company'
  | 'role'
  | 'score'
  | 'status'
  | 'cv'
  | 'posting';

export type TableColumnVisibility = Record<OptionalColumnId, boolean>;

export const OPTIONAL_COLUMN_DEFS: {
  id: OptionalColumnId;
  label: string;
  hint?: string;
}[] = [
  { id: 'date', label: 'Date', hint: 'Application date from tracker' },
  { id: 'location', label: 'Location', hint: 'Derived from notes (WEB-2)' },
  { id: 'pay', label: 'Pay', hint: 'Pay range from notes (WEB-2)' },
  { id: 'report', label: 'Report', hint: 'Evaluation report on disk' },
  { id: 'pdf', label: 'PDF', hint: 'PDF checkmark in tracker column' },
  { id: 'lastContact', label: 'Last contact', hint: 'Last contact date (WEB-2)' },
];

/** Matches Go TUI optionalCols onByDefault in pipeline.go */
export const DEFAULT_COLUMN_VISIBILITY: TableColumnVisibility = {
  date: true,
  location: true,
  pay: true,
  report: false,
  pdf: false,
  lastContact: false,
};

const STORAGE_KEY = 'careerOpsTableColumns';

const OPTIONAL_COLUMN_ORDER: OptionalColumnId[] = [
  'date',
  'location',
  'pay',
  'report',
  'pdf',
  'lastContact',
];

export function isOptionalColumnId(v: string): v is OptionalColumnId {
  return OPTIONAL_COLUMN_ORDER.includes(v as OptionalColumnId);
}

function readStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadTableColumns(): TableColumnVisibility {
  const storage = readStorage();
  if (!storage) return { ...DEFAULT_COLUMN_VISIBILITY };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COLUMN_VISIBILITY };
    const parsed = JSON.parse(raw) as Partial<TableColumnVisibility>;
    return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed };
  } catch {
    return { ...DEFAULT_COLUMN_VISIBILITY };
  }
}

export function saveTableColumns(v: TableColumnVisibility): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function toggleColumn(
  v: TableColumnVisibility,
  id: OptionalColumnId,
): TableColumnVisibility {
  return { ...v, [id]: !v[id] };
}

export function listVisibleOptionalColumns(v: TableColumnVisibility): OptionalColumnId[] {
  return OPTIONAL_COLUMN_ORDER.filter((id) => v[id]);
}

/** Fixed columns + visible optional columns in render order. */
export function tableColumnCount(v: TableColumnVisibility): number {
  return 7 + listVisibleOptionalColumns(v).length;
}

/** Tailwind col widths in same order as headers/rows. */
export function tableColWidths(v: TableColumnVisibility): string[] {
  const widths: string[] = ['w-[3rem]'];
  if (v.date) widths.push('w-[6.5rem]');
  widths.push('w-[11rem]', '', 'w-[4.5rem]', 'w-[7.5rem]');
  if (v.location) widths.push('w-[8rem]');
  if (v.pay) widths.push('w-[7rem]');
  widths.push('w-[4.5rem]');
  if (v.report) widths.push('w-[4.5rem]');
  if (v.pdf) widths.push('w-[3rem]');
  if (v.lastContact) widths.push('w-[7rem]');
  widths.push('w-[8rem]');
  return widths;
}

export function tableMinWidth(v: TableColumnVisibility): string {
  const base = 720;
  const perCol = 72;
  return `${base + listVisibleOptionalColumns(v).length * perCol}px`;
}
