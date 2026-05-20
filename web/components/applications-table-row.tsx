'use client';

import { memo } from 'react';

import { TrackerStatusBadge } from '@/components/tracker-status-badge';
import { cvArtifactsSummary, formatPostingLabel } from '@/lib/tracker-table-helpers';
import type { AppRow } from '@/types/dashboard';

export const ApplicationsTableRow = memo(function ApplicationsTableRow({
  row,
  rowHeightPx,
  cellPadClass,
  onRowOpen,
  onOpenByNumber,
}: {
  row: AppRow;
  rowHeightPx: number;
  cellPadClass: string;
  onRowOpen: (row: AppRow) => void;
  onOpenByNumber: (num: number) => void;
}) {
  const cp = cellPadClass;
  return (
    <tr
      tabIndex={0}
      role="button"
      onClick={() => onRowOpen(row)}
      onKeyDown={(ev) => ev.key === 'Enter' && onRowOpen(row)}
      style={{ height: rowHeightPx, maxHeight: rowHeightPx }}
      className={`cursor-pointer border-b border-border/80 text-sm hover:bg-row/60 ${
        row.duplicateOf != null ? 'bg-amber-950/15' : ''
      }`}>
      <td className={`${cp} font-mono text-xs tabular-nums text-muted`}>{row.number}</td>
      <td className={`${cp} whitespace-nowrap font-mono text-xs tabular-nums text-muted`}>{row.date || '—'}</td>
      <td className={`${cp} font-medium leading-snug text-white`}>
        <span className="block truncate">{row.company}</span>
        {row.duplicateOf != null ? (
          <button
            type="button"
            title={row.duplicateNote ?? `Linked to application #${row.duplicateOf}`}
            onClick={(ev) => {
              ev.stopPropagation();
              onOpenByNumber(row.duplicateOf!);
            }}
            className="mt-0.5 truncate text-left text-[10px] font-medium text-amber-200/90 underline decoration-amber-400/50 hover:text-amber-100">
            ↩ same as #{row.duplicateOf}
          </button>
        ) : null}
      </td>
      <td className={`${cp} truncate leading-snug text-muted`}>{row.role}</td>
      <td className={`${cp} text-right font-mono text-sm tabular-nums text-accent`}>
        <span title={`Numeric score used for sorting: ${row.score}`}>{row.scoreRaw || '—'}</span>
      </td>
      <td className={`${cp} align-middle`}>
        <TrackerStatusBadge statusRaw={row.status} />
      </td>
      <td className={`${cp} text-center`}>
        <span
          className="inline-flex items-center justify-center"
          title={row.hasPdf ? 'PDF indicated in tracker' : 'No PDF in tracker column'}
          aria-label={row.hasPdf ? 'PDF on disk (tracker)' : 'No PDF in tracker'}>
          {row.hasPdf ? (
            <svg
              className="h-4 w-4 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <span className="text-muted tabular-nums" aria-hidden>
              —
            </span>
          )}
        </span>
      </td>
      <td className={`${cp} text-center`} title={cvArtifactsSummary(row)} aria-label={cvArtifactsSummary(row)}>
        <span className="inline-flex justify-center gap-2 font-mono text-xs text-muted">
          <span
            className={row.linkedHtmlBasename ? 'font-semibold text-accent' : 'opacity-40'}
            title={
              row.linkedHtmlBasename ? `HTML in output: ${row.linkedHtmlBasename}` : 'No HTML artifact'
            }>
            H
          </span>
          <span
            className={row.linkedPdfBasename || row.hasPdf ? 'font-semibold text-accent' : 'opacity-40'}
            title={
              row.linkedPdfBasename
                ? `PDF in output: ${row.linkedPdfBasename}`
                : row.hasPdf
                  ? 'PDF on disk (matched)'
                  : 'No PDF artifact'
            }>
            P
          </span>
          <span
            className={row.linkedTexBasename ? 'font-semibold text-accent' : 'opacity-40'}
            title={row.linkedTexBasename ? `LaTeX in output: ${row.linkedTexBasename}` : 'No LaTeX artifact'}>
            T
          </span>
        </span>
      </td>
      <td className={`${cp} font-mono text-xs`}>
        {row.reportPath ? (
          <span className="text-accent" title={row.reportPath}>
            #{row.reportNumber || row.number}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className={`truncate ${cp} text-sm`}>
        {row.jobUrl ? (
          <span className="text-accent" role="presentation" onClick={(ev) => ev.stopPropagation()}>
            <a
              href={row.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={row.jobUrl}
              className="underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
              {formatPostingLabel(row.jobUrl)}
            </a>
          </span>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
});
