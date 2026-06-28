'use client';

import { useEffect, useState } from 'react';

import { useEscapeClose } from '@/lib/use-escape-close';

import type { JobSummary } from '@/types/jobs';

type FullJob = JobSummary & {
  meta?: { url?: string; jdText?: string; restartedFrom?: string };
  logs?: { seq: number; channel: string; text: string }[];
};

type Props = {
  job: JobSummary | null;
  onClose: () => void;
  onFocusStream: (id: string) => void;
  onJobChanged: () => void | Promise<void>;
  onRestarted: (newJobId: string) => void;
};

export function QueueJobModal({
  job,
  onClose,
  onFocusStream,
  onJobChanged,
  onRestarted,
}: Props) {
  useEscapeClose(Boolean(job), onClose);

  const [full, setFull] = useState<FullJob | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState('');
  const [url, setUrl] = useState('');
  const [jdText, setJdText] = useState('');
  const [provider, setProvider] = useState<'claude' | 'cursor' | 'node'>('claude');

  useEffect(() => {
    if (!job) {
      setFull(null);
      setLoadErr('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/jobs/${job.id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Job ${res.status}`);
        const j = (await res.json()) as FullJob;
        if (cancelled) return;
        setFull(j);
        setUrl(typeof j.meta?.url === 'string' ? j.meta.url : job.url ?? '');
        setJdText(typeof j.meta?.jdText === 'string' ? j.meta.jdText : '');
        setProvider(
          j.provider === 'claude' || j.provider === 'cursor' || j.provider === 'node'
            ? j.provider
            : 'claude',
        );
        setLoadErr('');
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : 'Could not load job');
          setFull(job);
          setUrl(job.url ?? '');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job]);

  if (!job) return null;

  const display = full ?? job;
  const isRunning = display.status === 'queued' || display.status === 'running';
  const canEvaluate = display.operation === 'evaluate_job';

  async function runAction(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    try {
      const res = await fn();
      const j = (await res.json().catch(() => ({}))) as { error?: string; jobId?: string };
      if (!res.ok) throw new Error(j.error ?? `Request failed (${res.status})`);
      await onJobChanged();
      if (label === 'restart' && j.jobId) {
        onRestarted(j.jobId);
        onClose();
        return;
      }
      if (label === 'delete') onClose();
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[52] flex items-center justify-center bg-black/65 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Job details">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted">CLI job</p>
            <p className="mt-1 break-all font-mono text-xs text-accent">{display.id}</p>
            <p className="mt-2 text-sm text-white">
              <span className="text-muted">{display.provider}</span> · {display.operation}
            </p>
            <p className="mt-1 text-xs text-muted">
              Status <span className="text-white">{display.status}</span>
              {' · '}
              exit{' '}
              {typeof display.exitCode === 'number' ? (
                display.exitCode
              ) : (
                <span className="italic text-muted">pending</span>
              )}
              {' · '}
              {display.logLines} log lines
              {display.archived ? ' · archived' : ''}
            </p>
            {display.error ? (
              <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-950/30 px-2 py-1.5 text-xs text-rose-200">
                {display.error}
              </p>
            ) : null}
            {loadErr ? (
              <p className="mt-2 text-xs text-rose-300">{loadErr}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-white">
            ✕
          </button>
        </div>

        {canEvaluate && url ? (
          <p className="mt-3 break-all font-mono text-[10px] text-muted">{url}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30"
            onClick={() => {
              onFocusStream(display.id);
              onClose();
            }}>
            Stream logs
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-accent/50"
            onClick={() =>
              void navigator.clipboard.writeText(display.id).catch(() => {
                /* ignore */
              })
            }>
            Copy id
          </button>
          {!isRunning && (
            <>
              <button
                type="button"
                disabled={Boolean(busy)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-amber-500/50 disabled:opacity-50"
                onClick={() =>
                  void runAction('archive', () =>
                    fetch(`/api/jobs/${display.id}?archive=1`, { method: 'DELETE' }),
                  )
                }>
                {busy === 'archive' ? 'Archiving…' : 'Archive'}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950/40 disabled:opacity-50"
                onClick={() => {
                  if (!window.confirm('Delete this job from the queue history?')) return;
                  void runAction('delete', () =>
                    fetch(`/api/jobs/${display.id}`, { method: 'DELETE' }),
                  );
                }}>
                {busy === 'delete' ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        </div>

        {canEvaluate && !isRunning ? (
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase text-muted">Restart with new data</p>
            <p className="text-[11px] text-muted">
              Tip: use <span className="text-white">Claude</span> for structured batch output if
              Cursor only printed a summary without writing files.
            </p>
            <label className="block text-[11px] text-muted">
              Provider
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as typeof provider)}
                className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-white">
                <option value="claude">claude</option>
                <option value="cursor">cursor</option>
              </select>
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… posting"
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-[11px] text-white"
            />
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={4}
              placeholder="Optional JD excerpt"
              className="w-full rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[10px] text-white"
            />
            <button
              type="button"
              disabled={Boolean(busy) || !url.trim()}
              className="w-full rounded-lg bg-accent py-2 text-xs font-semibold text-black disabled:opacity-50"
              onClick={() =>
                void runAction('restart', () =>
                  fetch(`/api/jobs/${display.id}/restart`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: url.trim(), jdText, provider }),
                  }),
                )
              }>
              {busy === 'restart' ? 'Restarting…' : 'Restart job'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
