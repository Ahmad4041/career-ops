'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

import { ApplicationsTableRow } from '@/components/applications-table-row';
import { SortHeader } from '@/components/sort-header';
import type { TableDensity } from '@/lib/table-density';
import { tableCellPad, tableHeaderPad } from '@/lib/table-density';
import type { SortDir, SortKey } from '@/lib/applications-table-query';
import type { AppRow } from '@/types/dashboard';

const COL_COUNT = 10;

export function ApplicationsTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowOpen,
  onClearFilters,
  density,
}: {
  rows: AppRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onRowOpen: (row: AppRow) => void;
  onClearFilters: () => void;
  density: TableDensity;
}) {
  const cp = tableCellPad(density);
  const hp = tableHeaderPad(density);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowPx = density === 'compact' ? 42 : 54;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => rowPx,
    overscan: 8,
  });

  const virtualItems = rows.length > 0 ? virtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <div
        ref={scrollParentRef}
        className="max-h-[min(70vh,640px)] overflow-auto overflow-x-auto"
        role="region"
        aria-label="Applications table — scroll for more rows">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="sticky top-0 z-[2] border-b border-border bg-row/95 backdrop-blur-sm">
            <tr>
              <SortHeader
                label="#"
                columnKey="number"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                cellPaddingClass={hp}
              />
              <SortHeader
                label="Date"
                columnKey="date"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                cellPaddingClass={hp}
              />
              <SortHeader
                label="Company"
                columnKey="company"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                cellPaddingClass={hp}
              />
              <SortHeader
                label="Role"
                columnKey="role"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                cellPaddingClass={hp}
              />
              <SortHeader
                label="Score"
                columnKey="score"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                align="right"
                cellPaddingClass={hp}
              />
              <SortHeader
                label="Status"
                columnKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                cellPaddingClass={hp}
              />
              <th
                className={`${hp} text-center text-xs font-medium uppercase tracking-wide text-muted`}
                title="Application PDF (tracker checkmark)">
                PDF
              </th>
              <th
                title="Artifacts in output/ for this report: H = HTML, P = PDF, T = LaTeX"
                className={`${hp} text-center text-xs font-medium uppercase tracking-wide text-muted`}>
                Output
              </th>
              <th className={`${hp} text-xs font-medium uppercase tracking-wide text-muted`}>Report</th>
              <th className={`${hp} text-xs font-medium uppercase tracking-wide text-muted`}>Posting</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className={`${cp} py-10 text-center text-sm text-muted`}>
                  No applications match your filters.{' '}
                  <button type="button" className="text-accent underline" onClick={onClearFilters}>
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr className="pointer-events-none" aria-hidden>
                    <td colSpan={COL_COUNT} style={{ height: paddingTop }} />
                  </tr>
                ) : null}
                {virtualItems.map((vi) => (
                  <ApplicationsTableRow
                    key={`${rows[vi.index]!.number}-${rows[vi.index]!.company}`}
                    row={rows[vi.index]!}
                    cellPadClass={cp}
                    onRowOpen={onRowOpen}
                  />
                ))}
                {paddingBottom > 0 ? (
                  <tr className="pointer-events-none" aria-hidden>
                    <td colSpan={COL_COUNT} style={{ height: paddingBottom }} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">
        Click any row for status, PDF, and report controls. Scroll inside the table area when there are many rows
        (virtualized rendering).
      </p>
    </section>
  );
}
