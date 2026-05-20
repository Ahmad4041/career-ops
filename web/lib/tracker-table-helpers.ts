import type { AppRow } from '@/types/dashboard';

export function formatPostingLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    return host || 'Open';
  } catch {
    return 'Link';
  }
}

export function cvArtifactsSummary(row: AppRow): string {
  const html = row.linkedHtmlBasename ? `HTML: ${row.linkedHtmlBasename}` : 'HTML: none';
  const pdf =
    row.linkedPdfBasename || row.hasPdf
      ? `PDF: ${row.linkedPdfBasename ?? 'matched'}`
      : 'PDF: none';
  const tex = row.linkedTexBasename ? `LaTeX: ${row.linkedTexBasename}` : 'LaTeX: none';
  return `${html}; ${pdf}; ${tex}`;
}
