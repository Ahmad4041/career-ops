'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  daysOverdueLabel,
  followupsDueCount,
  isDueEntry,
  suggestedFollowupAction,
} from '@/lib/followups';
import type { FollowupsPayload } from '@/types/followups';

export function FollowupsDuePanel({
  payload,
  error,
  loading,
  onOpenApplication,
}: {
  payload: FollowupsPayload | null;
  error: string | null;
  loading: boolean;
  onOpenApplication: (num: number) => void;
}) {
  const dueCount = payload?.metadata ? followupsDueCount(payload.metadata) : 0;
  const [open, setOpen] = useState(false);
  const prevDueRef = useRef(0);

  useEffect(() => {
    if (dueCount > 0 && prevDueRef.current === 0) setOpen(true);
    prevDueRef.current = dueCount;
  }, [dueCount]);

  const dueEntries = useMemo(() => {
    if (!payload?.entries?.length) return [];
    return payload.entries.filter(isDueEntry);
  }, [payload?.entries]);

  const headerBadge =
    dueCount > 0 ? (
      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-200">
        {dueCount} due
      </span>
    ) : (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">Up to date</span>
    );

  return (
    <section className="mb-6 rounded-lg border border-border bg-row/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-row/80">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-white">Follow-ups due</h2>
          {headerBadge}
          {payload?.metadata?.analysisDate && (
            <span className="text-xs text-muted">as of {payload.metadata.analysisDate}</span>
          )}
        </div>
        <span className="shrink-0 text-muted" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {loading && !payload && (
            <p className="text-sm text-muted">Loading follow-up cadence…</p>
          )}

          {error && (
            <p className="rounded-lg border border-rose-800/70 bg-rose-950/30 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          )}

          {!error && payload?.error && (
            <p className="text-sm text-muted">{payload.error}</p>
          )}

          {!error && !payload?.error && payload?.metadata && dueEntries.length === 0 && (
            <p className="text-sm text-muted">
              No overdue follow-ups.{' '}
              {payload.metadata.waiting > 0
                ? `${payload.metadata.waiting} application(s) waiting on cadence.`
                : 'Active applications are on schedule.'}
            </p>
          )}

          {!error && dueEntries.length > 0 && (
            <ul className="divide-y divide-border/70">
              {dueEntries.map((e) => {
                const overdue = daysOverdueLabel(e);
                const action = suggestedFollowupAction(e);
                return (
                  <li key={e.num} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onOpenApplication(e.num)}
                        className="text-left text-sm font-medium text-accent hover:underline">
                        #{e.num} · {e.company}
                      </button>
                      <p className="truncate text-xs text-muted">{e.role}</p>
                      <p className="mt-1 text-xs text-white/90">{action}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      {overdue && (
                        <p
                          className={
                            e.urgency === 'urgent'
                              ? 'font-medium text-amber-200'
                              : 'font-medium text-rose-200'
                          }>
                          {overdue}
                        </p>
                      )}
                      <p className="capitalize text-muted">{e.status}</p>
                      {e.nextFollowupDate && (
                        <p className="text-muted">Next: {e.nextFollowupDate}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
