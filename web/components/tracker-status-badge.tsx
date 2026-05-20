import { memo } from 'react';

import { normalizeStatus } from '@/lib/normalize-tracker-status';

/** Tailwind classes for normalized tracker keys (`normalizeStatus` output). */
const TONE: Record<string, string> = {
  evaluated: 'border-slate-500/35 bg-slate-950/55 text-slate-100',
  applied: 'border-sky-500/35 bg-sky-950/45 text-sky-100',
  responded: 'border-cyan-500/35 bg-cyan-950/40 text-cyan-100',
  interview: 'border-amber-500/40 bg-amber-950/45 text-amber-100',
  offer: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100',
  rejected: 'border-rose-500/35 bg-rose-950/45 text-rose-100',
  discarded: 'border-zinc-600/50 bg-zinc-950/50 text-zinc-300',
  skip: 'border-orange-500/35 bg-orange-950/40 text-orange-100',
};

export function trackerStatusToneClass(normalizedKey: string): string {
  return TONE[normalizedKey] ?? 'border-border bg-row/90 text-muted';
}

export const TrackerStatusBadge = memo(function TrackerStatusBadge({ statusRaw }: { statusRaw: string }) {
  const n = normalizeStatus(statusRaw);
  const label = statusRaw.replace(/\*\*/g, '').trim() || '—';
  return (
    <span
      className={`inline-flex max-w-[11rem] truncate rounded-full border px-2 py-0.5 text-xs font-medium capitalize leading-tight ${trackerStatusToneClass(n)}`}
      title={label}>
      {label}
    </span>
  );
});
