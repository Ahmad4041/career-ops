import type { SortDir, SortKey } from '@/lib/applications-table-query';

export function SortHeader({
  label,
  columnKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
  cellPaddingClass,
}: {
  label: string;
  columnKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
  /** Override default padding (e.g. density-aware from `tableHeaderPad`) */
  cellPaddingClass?: string;
}) {
  const active = activeKey === columnKey;
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : ('descending' as const)) : undefined;
  const rowAlign = align === 'right' ? 'text-right' : 'text-left';
  const flexAlign = align === 'right' ? 'justify-end' : 'justify-start';
  const pad = cellPaddingClass ?? 'px-3 py-2';
  return (
    <th scope="col" aria-sort={ariaSort} className={`${pad} ${rowAlign}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`flex w-full items-center gap-1 text-xs font-medium uppercase tracking-wide transition ${flexAlign} ${
          active ? 'text-accent' : 'text-muted hover:text-white'
        }`}>
        <span>{label}</span>
        {active ? <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  );
}
