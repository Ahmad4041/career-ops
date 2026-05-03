'use client';

import { useCallback, useEffect, useState } from 'react';

import { TRACKER_STATUS_LABELS } from '@/lib/tracker-states';

export type AppRowLite = {
  number: number;
  date: string;
  company: string;
  role: string;
  status: string;
  scoreRaw: string;
  hasPdf: boolean;
  reportPath: string;
  reportNumber: string;
  notes: string;
  jobUrl: string;
  linkedPdfBasename?: string | null;
  linkedHtmlBasename?: string | null;
  linkedTexBasename?: string | null;
};

type CvAssetSlice = {
  available: boolean;
  basename?: string;
  urlInline?: string;
  urlDownload?: string;
};

type Props = {
  open: boolean;
  row: AppRowLite | null;
  careerOpsRoot: string;
  candidateSlug: string | null;
  onClose: () => void;
  onSaved: () => void;
  onViewReport: (reportPath: string, title: string) => void;
};

function reportStem(reportPath: string): string {
  const base = reportPath.split('/').pop() ?? reportPath;
  return base.replace(/\.md$/i, '');
}

function pdfGenerateHint(careerOpsRoot: string, slug: string, reportPath: string): string {
  const stem = reportStem(reportPath);
  const company = stem.replace(/^\d+-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
  const s = slug || 'your-name-slug';
  return `cd "${careerOpsRoot}" && node generate-pdf.mjs "/tmp/cv-${s}-${company}.html" "output/cv-${s}-${company}-$(date +%Y-%m-%d).pdf" --format=a4`;
}

export function ApplicationDetailModal({
  open,
  row,
  careerOpsRoot,
  candidateSlug,
  onClose,
  onSaved,
  onViewReport,
}: Props) {
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [artifacts, setArtifacts] = useState<{
    pdf: CvAssetSlice;
    html: CvAssetSlice;
    tex: CvAssetSlice;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  type PdfTpl = { relativePath: string; basename: string };
  const [pdfTemplates, setPdfTemplates] = useState<PdfTpl[]>([]);
  const [templatePathPick, setTemplatePathPick] = useState('templates/cv-template.html');
  const [pdfFormatPick, setPdfFormatPick] = useState<'a4' | 'letter'>('a4');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfGenErr, setPdfGenErr] = useState<string | null>(null);
  const [texGenerating, setTexGenerating] = useState(false);
  const [texGenErr, setTexGenErr] = useState<string | null>(null);

  /** Only reset editor when opening or switching rows — NOT when parent passes a fresh `row` object every render. */
  useEffect(() => {
    if (!open || !row) return;
    setStatus(row.status);
    setNotes(row.notes);
    setErr(null);
    setSaving(false);
  }, [open, row?.number, row?.status, row?.notes]); /* eslint-disable-line react-hooks/exhaustive-deps -- row identity via primitives only */

  const fetchArtifactsForRow = useCallback(async () => {
    if (!row?.reportPath) {
      setArtifacts({
        pdf: { available: false },
        html: { available: false },
        tex: { available: false },
      });
      return;
    }
    try {
      const q = `/api/cv/assets?reportPath=${encodeURIComponent(row.reportPath)}`;
      const res = await fetch(q, { cache: 'no-store' });
      const j = (await res.json()) as {
        pdf?: CvAssetSlice;
        html?: CvAssetSlice;
        tex?: CvAssetSlice;
      };
      setArtifacts({
        pdf: j.pdf ?? { available: false },
        html: j.html ?? { available: false },
        tex: j.tex ?? { available: false },
      });
    } catch {
      setArtifacts({
        pdf: { available: false },
        html: { available: false },
        tex: { available: false },
      });
    }
  }, [row?.reportPath]);

  useEffect(() => {
    if (!open || !row) return;
    setArtifacts(null);
    void fetchArtifactsForRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- row keyed by primitives
  }, [open, row?.number, row?.reportPath, fetchArtifactsForRow]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadTemplates() {
      try {
        const res = await fetch('/api/pdf/templates', { cache: 'no-store' });
        const j = (await res.json()) as { templates?: PdfTpl[] };
        if (cancelled) return;
        const list = Array.isArray(j.templates) ? j.templates : [];
        setPdfTemplates(list);
        if (!cancelled && list.length > 0) {
          const hasDefault = list.some((t) => t.relativePath === 'templates/cv-template.html');
          setTemplatePathPick(hasDefault ? 'templates/cv-template.html' : list[0].relativePath);
        }
      } catch {
        if (!cancelled) setPdfTemplates([]);
      }
    }
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleGeneratePdfFromTemplate = useCallback(async () => {
    setPdfGenerating(true);
    setPdfGenErr(null);
    try {
      const body: Record<string, unknown> = {
        templatePath: templatePathPick,
        format: pdfFormatPick,
      };
      if (row?.reportPath) body.reportPath = row.reportPath;
      if (candidateSlug?.trim()) body.outputSlug = candidateSlug.trim();

      const res = await fetch('/api/pdf/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        downloadUrl?: string;
        phases?: { step?: string; stderr?: string }[];
      };

      if (!res.ok || !j.ok || !j.downloadUrl) {
        const tail = j.phases
          ?.map((p) => (p.stderr ? `${p.step}: ${p.stderr.slice(-400)}` : ''))
          .filter(Boolean)
          .join(' | ');
        throw new Error(j.error || tail || `HTTP ${res.status}`);
      }

      await fetchArtifactsForRow();
    } catch (e) {
      setPdfGenErr(e instanceof Error ? e.message : 'PDF generation failed');
    } finally {
      setPdfGenerating(false);
    }
  }, [templatePathPick, pdfFormatPick, row?.reportPath, candidateSlug, fetchArtifactsForRow]);

  const handleGenerateTex = useCallback(async () => {
    setTexGenerating(true);
    setTexGenErr(null);
    try {
      const body: Record<string, unknown> = { templatePath: 'templates/cv-template.tex' };
      if (row?.reportPath) body.reportPath = row.reportPath;
      if (candidateSlug?.trim()) body.outputSlug = candidateSlug.trim();

      const res = await fetch('/api/tex/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        partialTex?: boolean;
        error?: string;
        phases?: { step?: string; stderr?: string; stdout?: string }[];
      };

      if (res.ok && j.ok) {
        await fetchArtifactsForRow();
        return;
      }

      if (res.ok && j.partialTex) {
        setTexGenErr(j.error ?? '.tex written; install tectonic or pdflatex on the server to compile PDF.');
        await fetchArtifactsForRow();
        return;
      }

      const tail =
        j.phases
          ?.map((p) => `${p.step ?? '?'} ${(p.stderr || p.stdout || '').slice(-500)}`)
          .filter(Boolean)
          .join(' · ') ?? '';
      throw new Error(j.error || tail || `HTTP ${res.status}`);
    } catch (e) {
      setTexGenErr(e instanceof Error ? e.message : 'LaTeX generation failed');
    } finally {
      setTexGenerating(false);
    }
  }, [row?.reportPath, candidateSlug, fetchArtifactsForRow]);

  const handleSave = useCallback(async () => {
    if (!row) return;
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = { applicationNumber: row.number };
      if (status.trim() !== row.status.trim()) body.status = status.trim();
      if (notes.trim() !== row.notes.trim()) body.notes = notes.trim();
      if (Object.keys(body).length <= 1) {
        setErr('Nothing to save — change status or notes first.');
        setSaving(false);
        return;
      }
      const res = await fetch('/api/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || res.statusText);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [row, status, notes, onClose, onSaved]);

  const copyHint = useCallback(async () => {
    if (!row?.reportPath) return;
    const text = pdfGenerateHint(careerOpsRoot, candidateSlug ?? 'your-name-slug', row.reportPath);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [row, careerOpsRoot, candidateSlug]);

  if (!open || !row) return null;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl"
        role="dialog"
        aria-label="Application">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted">Application #{row.number}</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{row.company}</h3>
            <p className="mt-1 text-sm text-muted">{row.role}</p>
            <p className="mt-2 font-mono text-xs text-accent">{row.scoreRaw || '—'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-row px-3 py-2 text-sm text-white">
              {!TRACKER_STATUS_LABELS.some((x) => x === status) && (
                <option value={status}>{status} (current)</option>
              )}
              {TRACKER_STATUS_LABELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Canonical states (see templates/states.yml).</p>
          </label>

          <label className="block text-sm">
            <span className="text-muted">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-row px-3 py-2 text-sm text-white"
            />
          </label>

          {err && <p className="text-sm text-rose-300">{err}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
              {saving ? 'Saving…' : 'Save tracker row'}
            </button>
            {row.reportPath ? (
              <button
                type="button"
                onClick={() => onViewReport(row.reportPath!, `${row.company} — ${row.role}`)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-accent/60">
                View report
              </button>
            ) : null}
            {artifacts?.pdf?.available && artifacts.pdf.urlDownload ? (
              <a
                href={artifacts.pdf.urlDownload}
                className="inline-flex items-center rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-950/70">
                Download PDF
              </a>
            ) : null}
          </div>

          {row.reportPath ? (
            <div className="rounded-lg border border-border/80 bg-row/40 p-3 text-xs text-muted">
              <p className="font-semibold text-white">Linked tailored CV</p>
              <p className="mt-1">
                Preview and downloads come from filenames in <code className="text-accent">output/</code> that match this
                report slug (same rules as the tracker PDF column).
              </p>
              {artifacts === null ? (
                <p className="mt-2 text-muted">Scanning output/…</p>
              ) : (
                <>
                  {artifacts.pdf.available && artifacts.pdf.urlInline ? (
                    <iframe
                      title="Tailored CV PDF preview"
                      src={artifacts.pdf.urlInline}
                      className="mt-2 h-[22rem] w-full rounded-lg border border-border bg-black"
                    />
                  ) : (
                    <p className="mt-2 italic text-muted">No matched PDF preview yet — generate with Playwright below or compile LaTeX.</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {artifacts.html.available && artifacts.html.urlInline ? (
                      <a
                        href={artifacts.html.urlInline}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-accent/40 px-2 py-1 font-mono text-[11px] text-accent hover:bg-accent/10">
                        Open tailored HTML →
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted">HTML: none matched</span>
                    )}
                    {artifacts.tex.available && artifacts.tex.urlDownload ? (
                      <a
                        href={artifacts.tex.urlDownload}
                        download
                        className="rounded border border-border px-2 py-1 font-mono text-[11px] text-white hover:border-accent/50">
                        Download .tex
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted">LaTeX: none matched</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className="rounded-lg border border-border/80 bg-row/50 p-3 text-xs text-muted">
            <p className="font-medium text-white">Tailored CV PDF (HTML → Playwright)</p>
            <p className="mt-1">
              PDFs are produced with <code className="text-accent">render-cv-html-from-template.mjs</code> →{' '}
              <code className="text-accent">generate-pdf.mjs</code> (Playwright). Add any{' '}
              <code className="text-muted">templates/*.html</code> locally; minimal layouts can use{' '}
              <code className="text-muted">{`{{CONTENT_HTML}}`}</code>.
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-[10rem] text-xs">
                <span className="text-muted">HTML template</span>
                <select
                  value={
                    pdfTemplates.some((t) => t.relativePath === templatePathPick)
                      ? templatePathPick
                      : pdfTemplates[0]?.relativePath ?? templatePathPick
                  }
                  onChange={(e) => setTemplatePathPick(e.target.value)}
                  disabled={pdfTemplates.length === 0 || pdfGenerating}
                  className="mt-1 w-full rounded border border-border bg-row px-2 py-1.5 font-mono text-[11px] text-white">
                  {pdfTemplates.length === 0 ? (
                    <option value={templatePathPick}>No templates/*.html — add under templates/</option>
                  ) : (
                    pdfTemplates.map((t) => (
                      <option key={t.relativePath} value={t.relativePath}>
                        {t.basename}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="text-xs">
                <span className="text-muted">Paper</span>
                <select
                  value={pdfFormatPick}
                  onChange={(e) => setPdfFormatPick(e.target.value === 'letter' ? 'letter' : 'a4')}
                  disabled={pdfGenerating}
                  className="mt-1 block rounded border border-border bg-row px-2 py-1.5 font-mono text-[11px] text-white">
                  <option value="a4">A4</option>
                  <option value="letter">US Letter</option>
                </select>
              </label>
              <button
                type="button"
                disabled={pdfGenerating || pdfTemplates.length === 0}
                onClick={() => void handleGeneratePdfFromTemplate()}
                className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50 hover:bg-accent">
                {pdfGenerating ? 'Generating…' : 'Generate PDF'}
              </button>
            </div>
            {pdfGenErr ? <p className="mt-2 text-[11px] text-rose-300">{pdfGenErr}</p> : null}

            {row.reportPath ? (
              <div className="mt-2 space-y-2">
                <p>
                  Matched-output PDF:{' '}
                  {!artifacts ? 'Refreshing…' : artifacts.pdf.available ? 'Found in output/.' : 'No filename match yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => void copyHint()}
                  className="text-accent hover:underline">
                  Copy sample generate-pdf shell line
                </button>
              </div>
            ) : null}
          </div>

          {row.reportPath ? (
            <div className="rounded-lg border border-border/80 bg-row/40 p-3 text-xs text-muted">
              <p className="font-medium text-white">LaTeX / Overleaf</p>
              <p className="mt-1">
                Fills <code className="text-accent">templates/cv-template.tex</code> via{' '}
                <code className="text-accent">render-cv-tex-from-template.mjs</code>, then{' '}
                <code className="text-accent">generate-latex.mjs</code> (needs{' '}
                <strong className="text-white">tectonic</strong> or <strong className="text-white">pdflatex</strong> on
                the machine running this dashboard).
              </p>
              <button
                type="button"
                disabled={texGenerating}
                onClick={() => void handleGenerateTex()}
                className="mt-3 rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25 disabled:opacity-50">
                {texGenerating ? 'Working…' : 'Generate .tex (+ PDF when compiler OK)'}
              </button>
              {texGenErr ? (
                <p className="mt-2 whitespace-pre-wrap text-[11px] text-amber-200">{texGenErr}</p>
              ) : null}
            </div>
          ) : null}

          {row.jobUrl ? (
            <a
              href={row.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-accent hover:underline">
              Open posting →
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
