'use client';

import { useEffect, useId, useRef, useState } from 'react';

import {
  OPTIONAL_COLUMN_DEFS,
  type OptionalColumnId,
  type TableColumnVisibility,
} from '@/lib/table-columns';
import { useEscapeClose } from '@/lib/use-escape-close';

export function ApplicationsColumnPicker({
  visibleColumns,
  onToggleColumn,
}: {
  visibleColumns: TableColumnVisibility;
  onToggleColumn: (id: OptionalColumnId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEscapeClose(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:border-accent/40 hover:text-white">
        Columns
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose table columns"
          className="absolute right-0 top-full z-20 mt-1 min-w-[14rem] rounded-lg border border-border bg-row p-3 shadow-lg">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">
            Optional columns
          </p>
          <ul className="space-y-1">
            {OPTIONAL_COLUMN_DEFS.map((col) => (
              <li key={col.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-surface/60">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.id]}
                    onChange={() => onToggleColumn(col.id)}
                    className="mt-0.5 accent-accent"
                  />
                  <span>
                    <span className="block text-sm text-white">{col.label}</span>
                    {col.hint ? (
                      <span className="block text-[10px] leading-snug text-muted">{col.hint}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
