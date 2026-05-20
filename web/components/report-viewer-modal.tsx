'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useEscapeClose } from '@/lib/use-escape-close';

type Props = {
  open: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
};

export function ReportViewerModal({ open, title, markdown, onClose }: Props) {
  const [mode, setMode] = useState<'preview' | 'raw'>('preview');

  useEscapeClose(open, onClose);

  useEffect(() => {
    if (open) setMode('preview');
  }, [open, title]);

  const previewWrap = useMemo(
    () =>
      '[&_a]:underline [&_a]:text-accent [&_strong]:text-white [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-medium [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_code]:rounded [&_code]:bg-row [&_code]:px-1 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-black/40 [&_pre]:p-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/50 [&_blockquote]:pl-3',
    [],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Report">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate pr-2 text-lg font-medium text-white">{title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`rounded-md px-3 py-1 ${mode === 'preview' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'}`}>
                Preview
              </button>
              <button
                type="button"
                onClick={() => setMode('raw')}
                className={`rounded-md px-3 py-1 ${mode === 'raw' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'}`}>
                Markdown
              </button>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-white"
              onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4">
          {mode === 'raw' ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">{markdown}</pre>
          ) : (
            <article className={`prose-invert text-sm ${previewWrap}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
