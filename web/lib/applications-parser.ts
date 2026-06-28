import fs from 'fs';
import path from 'path';

import { basenameOnly, findArtifactForReport } from '@/lib/artifacts-for-report';
import { deriveNoteFields } from '@/lib/derive-note-fields';
import { normalizeStatus } from '@/lib/normalize-tracker-status';

/** Re-export for callers that already imported from `applications-parser`. */
export { normalizeStatus };

export type CareerApplication = {
  number: number;
  date: string;
  company: string;
  role: string;
  status: string;
  score: number;
  scoreRaw: string;
  hasPdf: boolean;
  reportPath: string;
  reportNumber: string;
  notes: string;
  jobUrl: string;
  /** Basenames in output/ best-matched to this row’s report slug (see artifacts-for-report). */
  linkedPdfBasename: string | null;
  linkedHtmlBasename: string | null;
  linkedTexBasename: string | null;
  /** When set, this row is a later duplicate of tracker #duplicateOf (see merge-tracker rules). */
  duplicateOf: number | null;
  duplicateNote: string | null;
  /** Derived from notes/role (see derive-note-fields.ts). */
  location: string;
  payRange: string;
  lastContact: string;
};

export type PipelineMetrics = {
  total: number;
  byStatus: Record<string, number>;
  avgScore: number;
  topScore: number;
  withPdf: number;
  actionable: number;
};

const reReportLink = /\[(\d+)\]\(([^)]+)\)/;
const reScoreValue = /(\d+\.?\d*)\/5/;
const reReportURL = /^\*\*URL:\*\*\s*(https?:\/\/\S+)/im;

const CANONICAL_STATUS_RE =
  /\b(evaluated|applied|responded|interview|offer|rejected|discarded|skip|aplicad[ao]|enviada|rechazad[ao]|entrevista|oferta)\b/i;

function looksLikeScore(cell: string): boolean {
  return reScoreValue.test(cell.trim());
}

function looksLikeStatus(cell: string): boolean {
  const t = cell.replace(/\*\*/g, '').trim();
  if (!t || looksLikeScore(t) || t.includes('✅') || t.includes('❌')) return false;
  return CANONICAL_STATUS_RE.test(t);
}

function looksLikePdfCell(cell: string): boolean {
  return cell.includes('✅') || cell.includes('❌');
}

/** Map tracker row cells when columns are shifted (extra field) or score/status swapped. */
export function resolveTrackerRowFields(fields: string[]): {
  scoreRaw: string;
  score: number;
  status: string;
  hasPdf: boolean;
  reportPath: string;
  reportNumber: string;
  notes: string;
} {
  let reportNumber = '';
  let reportPath = '';
  let reportIdx = -1;
  for (let i = 0; i < fields.length; i++) {
    const m = fields[i].match(reReportLink);
    if (m) {
      reportNumber = m[1];
      reportPath = m[2];
      reportIdx = i;
      break;
    }
  }

  let scoreIdx = fields.findIndex((f) => looksLikeScore(f));
  if (scoreIdx < 0) scoreIdx = 4;

  const scoreRaw = fields[scoreIdx] ?? '';
  const sm = scoreRaw.match(reScoreValue);
  const score = sm ? parseFloat(sm[1]) : 0;

  let status = fields[5] ?? 'Evaluated';
  for (let i = scoreIdx + 1; i < fields.length; i++) {
    if (i === reportIdx) break;
    if (looksLikePdfCell(fields[i])) break;
    if (looksLikeStatus(fields[i])) {
      status = fields[i].replace(/\*\*/g, '').trim();
      break;
    }
  }

  let hasPdf = false;
  for (let i = scoreIdx + 1; i < fields.length; i++) {
    if (i === reportIdx) break;
    if (fields[i].includes('✅')) {
      hasPdf = true;
      break;
    }
    if (fields[i].includes('❌')) {
      hasPdf = false;
      break;
    }
  }

  const notes =
    reportIdx >= 0 && reportIdx < fields.length - 1
      ? fields
          .slice(reportIdx + 1)
          .join(' ')
          .trim()
      : (fields[fields.length - 1] ?? '');

  return { scoreRaw, score, status, hasPdf, reportPath, reportNumber, notes };
}

/** Root-relative `reports/…` path for API and artifact lookup. */
export function normalizeReportPath(raw: string): string {
  const s = raw.replace(/\\/g, '/').trim();
  const idx = s.indexOf('reports/');
  if (idx >= 0) return s.slice(idx);
  return s.replace(/^(\.\.\/)+/, '');
}

/** Pipe/TSV tracker row splitter (applications.md body rows). */
export function splitTableLine(line: string): string[] {
  const trimmed = line.trimStart();
  if (trimmed.includes('\t')) {
    const inner = trimmed.replace(/^\|\s*/, '').trimEnd();
    return inner.split('\t').map((p) => p.trim().replace(/\|/g, '').trim());
  }
  const inner = trimmed.replace(/^\||\|$/g, '').trim();
  return inner.split('|').map((cell) => cell.trim());
}

export function resolveApplicationsMdPath(root: string): string | null {
  const candidates = [
    path.join(root, 'applications.md'),
    path.join(root, 'data', 'applications.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function normalizeCompany(name: string): string {
  let s = name.trim().toLowerCase();
  const suffixes = [
    ' inc.',
    ' inc',
    ' llc',
    ' ltd',
    ' corp',
    ' corporation',
    ' technologies',
    ' technology',
    ' group',
    ' co.',
  ];
  for (const suf of suffixes) {
    if (s.endsWith(suf)) s = s.slice(0, -suf.length);
  }
  return s.trim();
}

function enrichFromScanHistory(root: string, apps: CareerApplication[]): void {
  const candidates = [
    path.join(root, 'data', 'scan-history.tsv'),
    path.join(root, 'scan-history.tsv'),
  ];
  let scanData: string | null = null;
  for (const p of candidates) {
    try {
      scanData = fs.readFileSync(p, 'utf8');
      break;
    } catch {
      /* skip */
    }
  }
  if (!scanData) return;

  type ScanEntry = { url: string; company: string; title: string };
  const byCompany = new Map<string, ScanEntry[]>();
  for (const line of scanData.split('\n')) {
    const fields = line.split('\t');
    if (fields.length < 5 || fields[0] === 'url') continue;
    const url = fields[0];
    const title = fields[3] ?? '';
    const company = fields[4] ?? '';
    if (!url.startsWith('http')) continue;
    const key = normalizeCompany(company);
    const list = byCompany.get(key) ?? [];
    list.push({ url, company, title });
    byCompany.set(key, list);
  }

  for (const app of apps) {
    if (app.jobUrl) continue;
    const key = normalizeCompany(app.company);
    const matches = byCompany.get(key);
    if (!matches?.length) continue;
    if (matches.length === 1) {
      app.jobUrl = matches[0].url;
      continue;
    }
    const appRole = app.role.toLowerCase();
    let best = matches[0].url;
    let bestScore = 0;
    for (const m of matches) {
      const mTitle = m.title.toLowerCase();
      let score = 0;
      for (const word of appRole.split(/\s+/)) {
        if (word.length > 2 && mTitle.includes(word)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = m.url;
      }
    }
    app.jobUrl = best;
  }
}

function enrichJobUrlFromReports(root: string, apps: CareerApplication[]): void {
  for (const app of apps) {
    if (app.jobUrl || !app.reportPath) continue;
    const full = path.join(root, app.reportPath);
    try {
      let text = fs.readFileSync(full, 'utf8');
      if (text.length > 1000) text = text.slice(0, 1000);
      const m = text.match(reReportURL);
      if (m) app.jobUrl = m[1].trim();
    } catch {
      /* missing report */
    }
  }
}

export function parseApplications(root: string): { apps: CareerApplication[]; trackerPath: string | null } {
  const trackerPath = resolveApplicationsMdPath(root);
  if (!trackerPath) return { apps: [], trackerPath: null };

  const content = fs.readFileSync(trackerPath, 'utf8');
  const lines = content.split('\n');
  const apps: CareerApplication[] = [];

  let rowIndex = 0;
  for (const lineRaw of lines) {
    const line = lineRaw.trimEnd();
    if (!line.startsWith('|')) continue;
    if (line.includes('|---') || /\|\s*#\s*\|/.test(line) || /^#\s/.test(line)) continue;

    const fields = splitTableLine(line);
    if (fields.length < 8) continue;
    if (fields[0] === '#') continue;

    rowIndex++;
    let trackerNumber = rowIndex;
    const n = parseInt(fields[0], 10);
    if (!Number.isNaN(n)) trackerNumber = n;

    const role = fields[3];
    const date = fields[1];
    const { scoreRaw, score, status, hasPdf, reportPath: reportPathRaw, reportNumber, notes } =
      resolveTrackerRowFields(fields);
    const reportPath = normalizeReportPath(reportPathRaw);
    const derived = deriveNoteFields({ role, notes, date });

    const app: CareerApplication = {
      number: trackerNumber,
      date,
      company: fields[2],
      role,
      scoreRaw,
      score,
      status,
      hasPdf,
      reportPath,
      reportNumber,
      notes,
      jobUrl: '',
      linkedPdfBasename: null,
      linkedHtmlBasename: null,
      linkedTexBasename: null,
      duplicateOf: null,
      duplicateNote: null,
      location: derived.location,
      payRange: derived.payRange,
      lastContact: derived.lastContact,
    };
    apps.push(app);
  }

  enrichJobUrlFromReports(root, apps);
  enrichFromScanHistory(root, apps);

  for (const app of apps) {
    const rp = app.reportPath.replace(/\\/g, '/').trim();
    if (!rp || !rp.endsWith('.md') || !rp.startsWith('reports/')) continue;
    app.linkedPdfBasename = basenameOnly(findArtifactForReport(root, rp, '.pdf'));
    app.linkedHtmlBasename = basenameOnly(findArtifactForReport(root, rp, '.html'));
    app.linkedTexBasename = basenameOnly(findArtifactForReport(root, rp, '.tex'));
  }

  return { apps, trackerPath };
}

/**
 * Rewrite one tracker row (# column match). Status replaces column 6 (0-based index 5);
 * keeps PDF and report columns untouched.
 */
export function patchApplicationInMarkdown(
  content: string,
  applicationNumber: number,
  opts: { status?: string; notes?: string },
): { ok: true; content: string } | { ok: false; error: string } {
  if (opts.status === undefined && opts.notes === undefined) {
    return { ok: false, error: 'Provide at least one of status or notes' };
  }
  const lines = content.split(/\r?\n/);
  let hit = false;
  const next = lines.map((lineRaw) => {
    const line = lineRaw.trimEnd();
    if (!line.trimStart().startsWith('|')) return lineRaw;
    if (line.includes('|---') || /\|\s*#\s*\|/.test(line)) return lineRaw;
    const fields = splitTableLine(line);
    if (fields.length < 9) return lineRaw;
    if (fields[0] === '#') return lineRaw;

    let num = NaN;
    const nParsed = parseInt(fields[0], 10);
    if (!Number.isNaN(nParsed)) num = nParsed;
    if (num !== applicationNumber) return lineRaw;

    hit = true;
    const cells = [...fields];
    while (cells.length < 9) cells.push('');
    if (opts.status !== undefined) {
      cells[5] = opts.status.trim();
    }
    if (opts.notes !== undefined) {
      const sanitized = opts.notes.replace(/\r?\n/g, ' ').replace(/\|/g, '·').slice(0, 2000).trimEnd();
      cells[8] = sanitized;
    }
    return `| ${cells.slice(0, 9).join(' | ')} |`;
  });
  if (!hit) return { ok: false, error: `No tracker row found for application #${applicationNumber}` };
  return { ok: true, content: next.join('\n') };
}

export function computeMetrics(apps: CareerApplication[]): PipelineMetrics {
  const byStatus: Record<string, number> = {};
  let totalScore = 0;
  let scored = 0;
  let topScore = 0;
  let withPdf = 0;
  let actionable = 0;

  for (const app of apps) {
    const st = normalizeStatus(app.status);
    byStatus[st] = (byStatus[st] ?? 0) + 1;
    if (app.score > 0) {
      totalScore += app.score;
      scored++;
      if (app.score > topScore) topScore = app.score;
    }
    if (app.hasPdf) withPdf++;
    if (st !== 'skip' && st !== 'rejected' && st !== 'discarded') actionable++;
  }

  return {
    total: apps.length,
    byStatus,
    avgScore: scored ? totalScore / scored : 0,
    topScore,
    withPdf,
    actionable,
  };
}
