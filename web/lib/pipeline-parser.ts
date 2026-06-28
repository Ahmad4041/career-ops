import path from 'path';

export type PipelineEntry = {
  url: string;
  source?: string;
  notes?: string;
  line?: number;
};

const PENDING_MARKERS = ['## Pending', '## Pendientes'];
const PROCESSED_MARKERS = ['## Processed', '## Procesadas'];

function isPendingHeader(line: string): boolean {
  const trimmed = line.trim();
  return PENDING_MARKERS.some((m) => trimmed === m || trimmed.startsWith(`${m} `));
}

function isProcessedHeader(line: string): boolean {
  const trimmed = line.trim();
  return PROCESSED_MARKERS.some((m) => trimmed === m || trimmed.startsWith(`${m} `));
}

function isPipelineUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('local:');
}

/** Parse unchecked pipeline inbox lines from the Pending section. */
export function parsePipelineMarkdown(text: string): PipelineEntry[] {
  const entries: PipelineEntry[] = [];
  let inPending = false;

  text.split('\n').forEach((line, i) => {
    if (isPendingHeader(line)) {
      inPending = true;
      return;
    }
    if (inPending && isProcessedHeader(line)) {
      inPending = false;
      return;
    }
    if (!inPending) return;

    const m = line.match(/^- \[([ !x])\] (.+)$/);
    if (!m) return;
    if (m[1] === 'x') return;

    const lineNum = i + 1;
    const rest = m[2].trim();
    const emDash = rest.match(/^(.+?) — (.+)$/);
    const body = (emDash ? emDash[1] : rest).trim();
    const trailingNote = emDash ? emDash[2].trim() : undefined;

    const parts = body.split(/\s*\|\s*/);
    const url = parts[0]?.trim() ?? '';
    if (!url || !isPipelineUrl(url)) return;

    const source = parts[1]?.trim() || undefined;
    const roleNotes = parts.slice(2).join(' | ').trim() || undefined;
    const notes = [roleNotes, trailingNote].filter(Boolean).join(' — ') || undefined;

    entries.push({ url, source, notes, line: lineNum });
  });

  return entries;
}

export function resolvePipelineMdPath(root: string): string {
  return path.join(root, 'data', 'pipeline.md');
}
