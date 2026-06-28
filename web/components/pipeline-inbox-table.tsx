'use client';

import { formatPostingLabel } from '@/lib/tracker-table-helpers';

export type PipelineInboxEntry = {
  url: string;
  source?: string;
  notes?: string;
  line?: number;
};

type Props = {
  entries: PipelineInboxEntry[];
  missing: boolean;
  evaluatingUrl: string | null;
  onEvaluate: (url: string) => void;
};

export function PipelineInboxTable({ entries, missing, evaluatingUrl, onEvaluate }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-row/50 px-4 py-8 text-center text-sm text-muted">
        {missing ? (
          <>
            <p className="font-medium text-white">No pipeline inbox yet</p>
            <p className="mt-2">
              Create <code className="text-accent">data/pipeline.md</code> or run a portal scan to
              append URLs. Edit the file in{' '}
              <a href="/settings" className="text-accent hover:underline">
                Settings
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-white">Pipeline inbox is empty</p>
            <p className="mt-2">
              Add <code className="text-accent">- [ ] https://…</code> lines under{' '}
              <strong className="text-white">Pending</strong> in{' '}
              <code className="text-accent">data/pipeline.md</code>, or run{' '}
              <strong className="text-white">Scan portals</strong> from the left nav.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-row text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-3 py-2.5 font-medium">
              URL
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Source
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Notes
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const busy = evaluatingUrl === entry.url;
            const label = formatPostingLabel(entry.url);
            const href = entry.url.startsWith('local:') ? undefined : entry.url;

            return (
              <tr
                key={`${entry.line ?? 0}-${entry.url}`}
                className="border-b border-border/60 bg-surface/40 hover:bg-row/30">
                <td className="max-w-xs px-3 py-2.5 align-top">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block min-w-0"
                      title={entry.url}>
                      <span className="font-medium text-accent group-hover:underline">{label}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">
                        {entry.url}
                      </span>
                    </a>
                  ) : (
                    <div className="min-w-0">
                      <span className="font-medium text-white">{label}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted">
                        {entry.url}
                      </span>
                    </div>
                  )}
                </td>
                <td className="max-w-[10rem] px-3 py-2.5 align-top text-white">
                  {entry.source ?? <span className="text-muted">—</span>}
                </td>
                <td className="max-w-md px-3 py-2.5 align-top text-muted">
                  {entry.notes ?? <span className="text-muted/70">—</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 align-top">
                  <button
                    type="button"
                    disabled={Boolean(evaluatingUrl)}
                    onClick={() => onEvaluate(entry.url)}
                    className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-45"
                    aria-label={`Evaluate ${label}`}>
                    {busy ? 'Queueing…' : 'Evaluate'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
