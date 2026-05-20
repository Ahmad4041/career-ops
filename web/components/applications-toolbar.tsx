'use client';

import type { RefObject } from 'react';

import type { SortDir, SortKey } from '@/lib/applications-table-query';
import type { TableDensity } from '@/lib/table-density';

export function ApplicationsToolbar({
  anchorRef,
  filterSearch,
  onFilterSearchChange,
  statusFilter,
  onStatusFilterChange,
  byStatus,
  onClearFilters,
  showingCount,
  totalCount,
  sortKey,
  sortDir,
  density,
  onDensityChange,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  filterSearch: string;
  onFilterSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  byStatus: Record<string, number>;
  onClearFilters: () => void;
  showingCount: number;
  totalCount: number;
  sortKey: SortKey;
  sortDir: SortDir;
  density: TableDensity;
  onDensityChange: (d: TableDensity) => void;
}) {
  return (
    <section
      ref={anchorRef}
      className="mb-4 space-y-3 rounded-xl border border-border bg-row/30 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-0 flex-1 sm:max-w-md">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Search</span>
          <input
            value={filterSearch}
            onChange={(e) => onFilterSearchChange(e.target.value)}
            placeholder="Company, role, notes…"
            className="mt-0.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted/80"
          />
        </label>
        <label className="block w-full sm:w-48">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
            <option value="">All statuses</option>
            {Object.keys(byStatus)
              .sort((a, b) => a.localeCompare(b))
              .map((s) => (
                <option key={s} value={s}>
                  {s} ({byStatus[s]})
                </option>
              ))}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Density</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => onDensityChange('comfortable')}
              className={`px-2.5 py-2 text-xs ${
                density === 'comfortable' ? 'bg-accent/25 text-white' : 'text-muted hover:bg-row/90'
              }`}>
              Comfortable
            </button>
            <button
              type="button"
              onClick={() => onDensityChange('compact')}
              className={`border-l border-border px-2.5 py-2 text-xs ${
                density === 'compact' ? 'bg-accent/25 text-white' : 'text-muted hover:bg-row/90'
              }`}>
              Compact
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:border-accent/40 hover:text-white">
          Clear filters
        </button>
      </div>
      <p className="text-[11px] text-muted">
        Showing <strong className="text-white">{showingCount}</strong> of <strong className="text-white">{totalCount}</strong>{' '}
        · Sorted by <span className="text-accent">{sortKey}</span> ({sortDir}) · ties break by # · Filters sync to the URL (
        <code className="text-accent">q</code>, <code className="text-accent">status</code>,{' '}
        <code className="text-accent">sort</code>/<code className="text-accent">dir</code>) for bookmarks.
      </p>
    </section>
  );
}
