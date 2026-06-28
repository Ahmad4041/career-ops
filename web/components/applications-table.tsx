'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';

import { ApplicationsTableRow } from '@/components/applications-table-row';
import { SortHeader } from '@/components/sort-header';
import type { TableDensity } from '@/lib/table-density';
import { tableCellPad, tableHeaderPad } from '@/lib/table-density';
import type { SortDir, SortKey } from '@/lib/applications-table-query';
import {
  tableColWidths,
  tableColumnCount,
  tableMinWidth,
  type TableColumnVisibility,
} from '@/lib/table-columns';
import type { AppRow } from '@/types/dashboard';

export function ApplicationsTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowOpen,
  onOpenByNumber,
  onClearFilters,
  density,
  visibleColumns,
}: {
  rows: AppRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onRowOpen: (row: AppRow) => void;
  onOpenByNumber: (num: number) => void;
  onClearFilters: () => void;
  density: TableDensity;
  visibleColumns: TableColumnVisibility;
}) {
  const cp = tableCellPad(density);
  const hp = tableHeaderPad(density);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const rowPx = density === 'compact' ? 42 : 54;
  const colCount = tableColumnCount(visibleColumns);
  const colWidths = useMemo(() => tableColWidths(visibleColumns), [visibleColumns]);
  const minWidth = useMemo(() => tableMinWidth(visibleColumns), [visibleColumns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => rowPx,
    overscan: 6,
    getItemKey: (index) => rows[index]?.number ?? index,
  });

  const virtualItems = rows.length > 0 ? virtualizer.getVirtualItems() : [];
  const padTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const padBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1]!.end
      : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <div
        ref={scrollParentRef}
        className="max-h-[min(70vh,640px)] overflow-auto overflow-x-auto overscroll-contain"
        role="region"
        aria-label="Applications table — scroll for more rows">
        <table
          className="w-full table-fixed border-collapse text-left text-sm"
          style={{ minWidth }}>
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} className={w || undefined} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-[2] border-b border-border bg-row shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
            <tr>
              <SortHeader
                label="#"
                columnKey="number"
                activeKey={sortKey}
                dir={sortDir}
                onSort={onSort}
                cellPaddingClass={hp}
              />
              {visibleColumns.date ? (
                <SortHeader
                  label="Date"
                  columnKey="date"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={onSort}
                  cellPaddingClass={hp}
                />
              ) : null}
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
              {visibleColumns.location ? (
                <th className={`${hp} text-xs font-medium uppercase tracking-wide text-muted`}>
                  Location
                </th>
              ) : null}
              {visibleColumns.pay ? (
                <th className={`${hp} text-xs font-medium uppercase tracking-wide text-muted`}>Pay</th>
              ) : null}
              <th
                title="Artifacts in output/ for this report: H = HTML, P = PDF, T = LaTeX"
                className={`${hp} text-center text-xs font-medium uppercase tracking-wide text-muted`}>
                CV
              </th>
              {visibleColumns.report ? (
                <th className={`${hp} text-center text-xs font-medium uppercase tracking-wide text-muted`}>
                  Report
                </th>
              ) : null}
              {visibleColumns.pdf ? (
                <th
                  className={`${hp} text-center text-xs font-medium uppercase tracking-wide text-muted`}
                  title="Application PDF (tracker checkmark)">
                  PDF
                </th>
              ) : null}
              {visibleColumns.lastContact ? (
                <th className={`${hp} text-xs font-medium uppercase tracking-wide text-muted`}>
                  Last contact
                </th>
              ) : null}
              <th className={`${hp} text-xs font-medium uppercase tracking-wide text-muted`}>Posting</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className={`${cp} py-10 text-center text-sm text-muted`}>
                  No applications match your filters.{' '}
                  <button type="button" className="text-accent underline" onClick={onClearFilters}>
                    Clear filters
                  </button>
                </td>
              </tr>
            ) : (
              <>
                {padTop > 0 ? (
                  <tr aria-hidden className="pointer-events-none border-0">
                    <td
                      colSpan={colCount}
                      className="border-0 p-0"
                      style={{ height: padTop, lineHeight: 0 }}
                    />
                  </tr>
                ) : null}
                {virtualItems.map((vi) => {
                  const row = rows[vi.index]!;
                  return (
                    <ApplicationsTableRow
                      key={row.number}
                      row={row}
                      rowHeightPx={rowPx}
                      cellPadClass={cp}
                      visibleColumns={visibleColumns}
                      onRowOpen={onRowOpen}
                      onOpenByNumber={onOpenByNumber}
                    />
                  );
                })}
                {padBottom > 0 ? (
                  <tr aria-hidden className="pointer-events-none border-0">
                    <td
                      colSpan={colCount}
                      className="border-0 p-0"
                      style={{ height: padBottom, lineHeight: 0 }}
                    />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">
        Click any row for status, PDF, and report controls. Duplicate rows link back to the original application #.
      </p>
    </section>
  );
}
