'use client';

import type { RefObject } from 'react';

import { trackerStatusToneClass } from '@/components/tracker-status-badge';

export function ApplicationsStatusChips({
  byStatus,
  statusFilter,
  onToggleStatus,
  scrollAnchorRef,
}: {
  byStatus: Record<string, number>;
  statusFilter: string;
  onToggleStatus: (normalizedStatus: string) => void;
  scrollAnchorRef: RefObject<HTMLElement | null>;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-medium text-muted">By status</h2>
      <div className="flex flex-wrap gap-2">
        {Object.entries(byStatus)
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                title="Filter table by this status (click again to clear)"
                onClick={() => {
                  onToggleStatus(status);
                  scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? `${trackerStatusToneClass(status)} ring-2 ring-accent/60 ring-offset-2 ring-offset-surface`
                    : `${trackerStatusToneClass(status)} hover:opacity-95`
                }`}>
                <span className="capitalize">{status}</span> · {count}
              </button>
            );
          })}
      </div>
    </section>
  );
}
