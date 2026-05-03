import fs from 'fs';
import path from 'path';

import { basenameOnly, findArtifactForReport } from '@/lib/artifacts-for-report';

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

export function normalizeStatus(raw: string): string {
  let s = raw.replace(/\*\*/g, '').trim().toLowerCase();
  const dateIdx = s.search(/\s202\d/);
  if (dateIdx > 0) s = s.slice(0, dateIdx).trim();

  if (s.includes('no aplicar') || s.includes('no_aplicar') || s === 'skip' || s.includes('geo blocker'))
    return 'skip';
  if (s.includes('interview') || s.includes('entrevista')) return 'interview';
  if (s === 'offer' || s.includes('oferta')) return 'offer';
  if (s.includes('responded') || s.includes('respondido')) return 'responded';
  if (s.includes('applied') || s.includes('aplicado') || s === 'enviada' || s === 'aplicada' || s === 'sent')
    return 'applied';
  if (s.includes('rejected') || s.includes('rechazado') || s === 'rechazada') return 'rejected';
  if (
    s.includes('discarded') ||
    s.includes('descartado') ||
    s === 'descartada' ||
    s === 'cerrada' ||
    s === 'cancelada' ||
    s.startsWith('duplicado') ||
    s.startsWith('dup')
  )
    return 'discarded';
  if (
    s.includes('evaluated') ||
    s.includes('evaluada') ||
    s === 'condicional' ||
    s === 'hold' ||
    s === 'monitor' ||
    s === 'evaluar' ||
    s === 'verificar'
  )
    return 'evaluated';
  return s;
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

    const scoreRaw = fields[4];
    let score = 0;
    const sm = scoreRaw.match(reScoreValue);
    if (sm) score = parseFloat(sm[1]);

    const rm = fields[7].match(reReportLink);
    const reportNumber = rm?.[1] ?? '';
    const reportPath = rm?.[2] ?? '';

    const app: CareerApplication = {
      number: trackerNumber,
      date: fields[1],
      company: fields[2],
      role: fields[3],
      scoreRaw,
      score,
      status: fields[5],
      hasPdf: fields[6].includes('✅'),
      reportPath,
      reportNumber,
      notes: fields[8] ?? '',
      jobUrl: '',
      linkedPdfBasename: null,
      linkedHtmlBasename: null,
      linkedTexBasename: null,
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
