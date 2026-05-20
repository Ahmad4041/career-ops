'use client';

import { useEscapeClose } from '@/lib/use-escape-close';

import type { JobSummary } from '@/types/jobs';

type Props = {
  job: JobSummary | null;
  onClose: () => void;
  onFocusStream: (id: string) => void;
};

export function QueueJobModal({ job, onClose, onFocusStream }: Props) {
  useEscapeClose(Boolean(job), onClose);

  if (!job) return null;

  return (
    <div
      className="fixed inset-0 z-[52] flex items-center justify-center bg-black/65 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Queued job">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted">CLI job</p>
            <p className="mt-1 break-all font-mono text-xs text-accent">{job.id}</p>
            <p className="mt-2 text-sm text-white">
              <span className="text-muted">{job.provider}</span> · {job.operation}
            </p>
            <p className="mt-1 text-xs text-muted">
              Status <span className="text-white">{job.status}</span>
              {' · '}
              exit{' '}
              {typeof job.exitCode === 'number' ? (
                job.exitCode
              ) : (
                <span className="italic text-muted">pending</span>
              )}
              {' · '}
              {job.logLines} log lines (snapshot)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-white">
            ✕
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30"
            onClick={() => {
              onFocusStream(job.id);
              onClose();
            }}>
            Stream logs in drawer
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-accent/50"
            onClick={() =>
              void navigator.clipboard.writeText(job.id).catch(() => {
                /* ignore */
              })
            }>
            Copy job id
          </button>
        </div>
      </div>
    </div>
  );
}
