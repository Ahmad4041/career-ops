'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { LanguageModesPicker } from '@/components/language-modes-picker';
import {
  jobQueueConfirmLabel,
  loadJobQueueConfirm,
  loadMaterialsProvider,
  materialsProviderLabel,
  saveJobQueueConfirm,
  saveMaterialsProvider,
  type JobQueueConfirmMode,
  type MaterialsProviderPref,
} from '@/lib/dashboard-prefs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type FileInfo = {
  path: string;
  label: string;
  group: string;
  description: string;
  systemTemplate?: boolean;
  exists: boolean;
};

type FileMeta = {
  path: string;
  label: string;
  group: string;
  description: string;
  systemTemplate?: boolean;
};

type FilePayload = {
  path: string;
  content: string;
  exists: boolean;
  meta?: FileMeta;
};

/** How the Preview tab behaves for allowlisted paths */
function previewKindForPath(path: string | null): 'html' | 'markdown' | 'tex' | 'none' {
  if (!path) return 'none';
  const p = path.toLowerCase();
  if (p.endsWith('.html')) return 'html';
  if (p.endsWith('.md')) return 'markdown';
  if (p.endsWith('.tex')) return 'tex';
  return 'none';
}

type ViewTab = 'editor' | 'raw' | 'preview';

function MarkdownPreview({ source }: { source: string }) {
  return (
    <div className="h-full overflow-auto rounded-xl border border-border bg-black/35 p-4 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mb-3 mt-1 border-b border-border pb-2 text-lg font-semibold tracking-tight text-white first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-white">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-semibold text-accent">{children}</h4>,
          p: ({ children }) => <p className="mb-3 text-muted last:mb-0 [&>code]:rounded [&>code]:bg-black/50 [&>code]:px-1 [&>code]:font-mono [&>code]:text-xs">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-muted">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-muted">{children}</ol>,
          li: ({ children }) => <li className="text-[var(--fg)]">{children}</li>,
          a: ({ children, ...rest }) => (
            <a className="text-accent underline hover:opacity-90" target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const inline = !className;
            if (inline) {
              return <code className="rounded bg-black/55 px-1 py-px font-mono text-[11px] text-accent">{children}</code>;
            }
            return <code className={className}>{children}</code>;
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-black/60 p-3 font-mono text-[11px] text-[var(--fg)]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-accent/40 pl-3 text-sm italic text-muted">{children}</blockquote>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-row px-2 py-1.5 font-semibold text-white">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1.5 text-muted">{children}</td>,
        }}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/** LaTeX template Preview tab: compile PDF via repo scripts (saved file on disk + cv.md + profile). */
function TexTemplatePdfPreview({ templatePath, dirty }: { templatePath: string; dirty: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialNote, setPartialNote] = useState<string | null>(null);
  const [texDl, setTexDl] = useState<string | null>(null);
  const [pdfInlineUrl, setPdfInlineUrl] = useState<string | null>(null);

  const compile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPartialNote(null);
    setTexDl(null);
    try {
      const res = await fetch('/api/tex/generate-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templatePath }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        partialTex?: boolean;
        error?: string;
        pdfInlineUrl?: string;
        texDownloadUrl?: string;
        phases?: { step?: string; stderr?: string; stdout?: string }[];
      };

      if (res.ok && j.ok && j.pdfInlineUrl) {
        setPdfInlineUrl(j.pdfInlineUrl);
        return;
      }

      if (res.ok && j.partialTex) {
        setPdfInlineUrl(null);
        setPartialNote(j.error ?? '.tex written; install tectonic or pdflatex on the machine running this dev server.');
        setTexDl(typeof j.texDownloadUrl === 'string' ? j.texDownloadUrl : null);
        return;
      }

      const tail =
        j.phases
          ?.map((p) => `${p.step ?? '?'}: ${(p.stderr || p.stdout || '').slice(-400)}`)
          .filter(Boolean)
          .join(' · ') ?? '';
      throw new Error(j.error || tail || `HTTP ${res.status}`);
    } catch (e) {
      setPdfInlineUrl(null);
      setError(e instanceof Error ? e.message : 'Compile failed');
    } finally {
      setLoading(false);
    }
  }, [templatePath]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto rounded-xl border border-border bg-row/40 p-4 text-sm text-muted">
      <p>
        <strong className="text-white">PDF preview</strong> runs <code className="text-accent">render-cv-tex-from-template.mjs</code>{' '}
        then <code className="text-accent">generate-latex.mjs</code> using your{' '}
        <strong className="text-[var(--fg)]">saved</strong> template file, plus <code className="text-accent">cv.md</code> and{' '}
        <code className="text-accent">config/profile.yml</code>. The Next server needs{' '}
        <code className="text-accent">tectonic</code> or <code className="text-accent">pdflatex</code> on{' '}
        <code className="text-accent">PATH</code>.
      </p>
      {dirty ? (
        <p className="rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs text-amber-100">
          You have unsaved edits in the editor — compilation uses the template <strong>as last saved to disk</strong>. Save
          first to preview your latest changes.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading || !templatePath}
          onClick={() => void compile()}
          className="rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? 'Compiling…' : 'Compile PDF preview'}
        </button>
        <span className="text-[11px] text-muted">
          Use the <strong className="text-white">Raw</strong> tab for the full <code className="text-accent">.tex</code> source, or export{' '}
          <code className="text-accent">.tex</code> from <strong className="text-white">output/</strong> for Overleaf.
        </span>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {partialNote ? (
        <p className="text-xs text-amber-200">
          {partialNote}{' '}
          {texDl ? (
            <a className="text-accent underline" href={texDl}>
              Download .tex
            </a>
          ) : null}
        </p>
      ) : null}
      {pdfInlineUrl ? (
        <iframe
          title="Compiled CV PDF preview"
          src={pdfInlineUrl}
          className="min-h-[min(70vh,560px)] w-full flex-1 rounded-lg border border-border bg-[#3d3d3d]"
        />
      ) : !loading && !error && !partialNote ? (
        <p className="text-xs text-muted/90">
          Click <strong className="text-white">Compile PDF preview</strong> to render. Same endpoint as the Applications
          detail dialog when a LaTeX engine is installed.
        </p>
      ) : null}
    </div>
  );
}

function PreviewPanel({
  path,
  content,
  serverHtml,
  serverError,
  serverLoading,
  fileDirty,
}: {
  path: string | null;
  content: string;
  serverHtml?: string | null;
  serverError?: string | null;
  serverLoading?: boolean;
  /** When true, LaTeX PDF compile uses last saved template — not the editor buffer. */
  fileDirty?: boolean;
}) {
  const kind = previewKindForPath(path);

  if (kind === 'html') {
    const iframeSrc = serverHtml != null && serverHtml.length > 10 ? serverHtml : content;
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <p className="shrink-0 text-[10px] text-muted">
          {serverHtml != null && serverHtml.length > 10 ? (
            <>
              Filled preview via <code className="text-accent">render-cv-html-from-template.mjs</code> (live or mock
              data). Fonts/CSS paths may still 404 in iframe; PDF export uses repo-relative paths.
            </>
          ) : (
            <>
              Static preview: raw template only — placeholders not replaced until render runs (side-by-side or wait for
              server preview).
            </>
          )}
        </p>
        {serverLoading ? <p className="text-xs text-accent">Rendering filled preview…</p> : null}
        {serverError ? <p className="text-xs text-rose-300">{serverError}</p> : null}
        <iframe
          title="HTML template preview"
          sandbox="allow-same-origin allow-scripts"
          srcDoc={iframeSrc}
          className="min-h-[360px] w-full flex-1 rounded-xl border border-border bg-white md:min-h-0"
        />
      </div>
    );
  }

  if (kind === 'markdown') {
    return <MarkdownPreview source={content} />;
  }

  if (kind === 'tex') {
    if (!path) {
      return (
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-black/25 p-6 text-sm text-muted">
          Select a <code className="text-accent">templates/*.tex</code> file to compile a PDF preview.
        </div>
      );
    }
    return <TexTemplatePdfPreview templatePath={path} dirty={Boolean(fileDirty)} />;
  }

  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-black/25 p-6 text-center text-sm text-muted">
      No visual preview for this file type. Use <span className="mx-1 text-white">Editor</span> or{' '}
      <span className="mx-1 text-white">Raw</span>.
    </div>
  );
}

function buildAgentStarterPrompt(templatePath: string): string {
  const isTex = templatePath.endsWith('.tex');
  const stack = isTex ? 'LaTeX' : 'HTML';
  const tokenHint = isTex
    ? 'Read modes/latex.md and render-cv-tex-from-template.mjs — keep standard {{NAME}}, {{EXPERIENCE}}, {{EDUCATION}}, {{PROJECTS}}, {{SKILLS}}, contact tokens, etc., unless you explicitly update the renderer.'
    : 'Read templates/README.md — either use granular section tokens like cv-template.html ({{SUMMARY_TEXT}}, {{EXPERIENCE}}, …) OR a minimal layout with {{CONTENT_HTML}} plus header/contact tokens only.';

  return [
    `I'm working in my career-ops repo and need help with the CV template file \`${templatePath}\` (${stack}).`,
    ``,
    `Please:`,
    `1. Follow ${tokenHint}`,
    `2. Do not hardcode employers, dates, or metrics—content comes from cv.md + profile at render time.`,
    `3. Deliver the complete file contents (paste-ready), or a clear unified diff.`,
    ``,
    `Reference docs in-repo: templates/README.md → section "Asking the AI agent to write or refactor a template".`,
    ``,
    `My layout / styling goals:`,
    `- [Describe: typography, columns, colors, ATS constraints, sections to emphasize, etc.]`,
  ].join('\n');
}

function buildMarkdownAgentStarterPrompt(filePath: string): string {
  const p = filePath.replace(/\\/g, '/');
  let fileHint =
    'This file is user-layer content in career-ops (see DATA_CONTRACT.md). Do not move personal narrative into modes/_shared.md.';

  if (p === 'cv.md') {
    fileHint =
      'Canonical CV in Markdown. Keep standard sections (Summary, Experience, Education, …). Never invent employers, dates, or metrics—only organize or rephrase from what I provide.';
  } else if (p === 'modes/_profile.md') {
    fileHint =
      'Profile modes overlay: archetypes, narrative, negotiation, proof framing. Keep user-specific; never put this content in modes/_shared.md.';
  } else if (p === 'voice-dna.md') {
    fileHint =
      'Optional writing guardrail: banned words, anti-AI-slop patterns, and conversational voice tiers. Used by modes when generating cover letters and outreach; _profile.md wins on conflicts. See modes/_shared.md → Voice DNA.';
  } else if (p === 'article-digest.md') {
    fileHint = 'Optional compact proof points / article bullets for evaluations. Short, scannable lines.';
  } else if (p === 'interview-prep/story-bank.md') {
    fileHint =
      'STAR+R (or similar) story snippets for interviews. Preserve my facts; tighten wording and add clear situation/result structure if missing.';
  } else if (p === 'data/pipeline.md') {
    fileHint =
      'Pipeline inbox: job URLs or local references (e.g. local:jds/…) as used by the pipeline. Preserve table/list conventions the repo already uses.';
  } else if (p === 'data/follow-ups.md') {
    fileHint = 'Follow-up log Markdown. Keep chronological or table style consistent with the existing file.';
  }

  return [
    `I'm working in my career-ops repo and need help editing the Markdown file \`${filePath}\`.`,
    ``,
    `Please:`,
    `1. ${fileHint}`,
    `2. Read CLAUDE.md DATA_CONTRACT if unsure what is user vs system layer.`,
    `3. Deliver the complete file contents (paste-ready) or a clear unified diff.`,
    ``,
    `What I want changed or added:`,
    `- [Goals, tone, sections, bullets to add/remove, etc.]`,
  ].join('\n');
}

function AgentFileHelpCard({ filePath }: { filePath: string }) {
  const isMd = filePath.endsWith('.md');
  const starter = useMemo(
    () => (isMd ? buildMarkdownAgentStarterPrompt(filePath) : buildAgentStarterPrompt(filePath)),
    [filePath, isMd],
  );
  const [copied, setCopied] = useState(false);

  const copyStarter = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(starter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [starter]);

  const summary = isMd
    ? 'Need help? Ask an AI agent to draft or edit this Markdown file'
    : 'Need help? Ask an AI agent to fill or refactor this template';

  const docHint = isMd ? (
    <p>
      Copy into <strong className="text-white">Cursor</strong> / <strong className="text-white">Claude Code</strong>.
      User-layer Markdown: see <code className="text-accent">DATA_CONTRACT.md</code> and{' '}
      <code className="text-accent">CLAUDE.md</code>
      — personalizations belong here, not in <code className="text-muted">modes/_shared.md</code>.
    </p>
  ) : (
    <p>
      Copy into <strong className="text-white">Cursor</strong> / <strong className="text-white">Claude Code</strong>.
      Full template examples:{' '}
      <code className="rounded bg-black/45 px-1 font-mono text-[10px] text-accent">templates/README.md</code>
      .
    </p>
  );

  return (
    <details className="mt-3 open:border-accent/25 rounded-lg border border-border bg-row/50">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-accent hover:bg-row/90">
        {summary}
      </summary>
      <div className="space-y-2 border-t border-border/80 px-3 py-2 text-[11px] text-muted">
        {docHint}
        <button
          type="button"
          onClick={() => void copyStarter()}
          className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25">
          {copied ? 'Copied starter prompt' : 'Copy starter prompt'}
        </button>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-black/40 p-2 font-mono text-[10px] leading-snug">
          {starter}
        </pre>
      </div>
    </details>
  );
}

const GROUP_ORDER = ['core', 'modes', 'data', 'prep', 'templates'] as const;
const GROUP_TITLE: Record<(typeof GROUP_ORDER)[number], string> = {
  core: 'Core',
  modes: 'Modes',
  data: 'Data & scanners',
  prep: 'Prep & proof',
  templates: 'Templates',
};

function DashboardPrefsPanel() {
  const [jobQueueConfirm, setJobQueueConfirm] = useState<JobQueueConfirmMode>('bypass');
  const [materialsProvider, setMaterialsProvider] = useState<MaterialsProviderPref>('cursor');

  useEffect(() => {
    setJobQueueConfirm(loadJobQueueConfirm());
    setMaterialsProvider(loadMaterialsProvider());
  }, []);

  const onJobQueueConfirmChange = useCallback((mode: JobQueueConfirmMode) => {
    setJobQueueConfirm(mode);
    saveJobQueueConfirm(mode);
  }, []);

  return (
    <section className="mb-4 rounded-lg border border-border bg-row/40 p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-wide text-muted">Dashboard</h2>
      <p className="mt-1 text-[11px] text-muted">
        Stored in this browser only (localStorage). Repo files below are unchanged.
      </p>
      <label className="mt-3 block text-xs">
        <span className="text-muted">Job queue (Claude / Cursor / node tasks)</span>
        <select
          value={jobQueueConfirm}
          onChange={(e) => onJobQueueConfirmChange(e.target.value as JobQueueConfirmMode)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
          <option value="bypass">{jobQueueConfirmLabel('bypass')}</option>
          <option value="ask">{jobQueueConfirmLabel('ask')}</option>
        </select>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          <strong className="text-white/90">Bypass</strong> — enqueue evaluate/scan jobs immediately.{' '}
          <strong className="text-white/90">Ask</strong> — browser confirm before starting (Cursor agent
          warning, Claude long run, node tasks).
        </p>
      </label>
      <label className="mt-3 block text-xs">
        <span className="text-muted">Application materials generator</span>
        <select
          value={materialsProvider}
          onChange={(e) => {
            const p = e.target.value as MaterialsProviderPref;
            setMaterialsProvider(p);
            saveMaterialsProvider(p);
          }}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
          <option value="claude">{materialsProviderLabel('claude')}</option>
          <option value="cursor">{materialsProviderLabel('cursor')}</option>
          <option value="gemini">{materialsProviderLabel('gemini')}</option>
        </select>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Used when you click <strong className="text-white/90">Generate</strong> in the application modal (summary,
          cover letter, recruiter note, form Q&amp;A). Claude/Cursor match the evaluate-job CLI; Gemini is optional.
        </p>
      </label>
    </section>
  );
}

export default function SettingsPage() {
  const [catalog, setCatalog] = useState<FileInfo[]>([]);
  const [root, setRoot] = useState('');
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('editor');
  const [templateLayout, setTemplateLayout] = useState<'split' | 'tabs'>('split');
  const [templateDataMode, setTemplateDataMode] = useState<'live' | 'mock'>('live');
  const [previewPaper, setPreviewPaper] = useState<'a4' | 'letter'>('a4');
  const [serverPreviewHtml, setServerPreviewHtml] = useState<string | null>(null);
  const [serverPreviewError, setServerPreviewError] = useState<string | null>(null);
  const [serverPreviewLoading, setServerPreviewLoading] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, FileInfo[]>();
    for (const g of GROUP_ORDER) m.set(g, []);
    for (const f of catalog) {
      const bucket = GROUP_ORDER.includes(f.group as (typeof GROUP_ORDER)[number])
        ? (f.group as (typeof GROUP_ORDER)[number])
        : 'core';
      m.get(bucket)!.push(f);
    }
    return m;
  }, [catalog]);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogErr(null);
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const j = (await res.json()) as { careerOpsRoot?: string; files?: FileInfo[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      setCatalog(j.files ?? []);
      setRoot(j.careerOpsRoot ?? '');
    } catch (e) {
      setCatalogErr(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const loadFile = useCallback(async (path: string) => {
    setLoadingFile(true);
    setFileErr(null);
    try {
      const res = await fetch(`/api/settings/file?path=${encodeURIComponent(path)}`, {
        cache: 'no-store',
      });
      const j = (await res.json()) as FilePayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      setContent(j.content);
      setInitialContent(j.content);
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : 'Failed to load file');
      setContent('');
      setInitialContent('');
    } finally {
      setLoadingFile(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (selected) void loadFile(selected);
  }, [selected, loadFile]);

  useEffect(() => {
    if (catalog.length === 0 || selected) return;
    setSelected(catalog[0].path);
  }, [catalog, selected]);

  useEffect(() => {
    setToast(null);
  }, [selected]);

  useEffect(() => {
    setViewTab('editor');
  }, [selected]);

  const dirty = content !== initialContent;
  const meta = catalog.find((x) => x.path === selected);
  const previewKind = previewKindForPath(selected);
  const isHtmlTemplate = Boolean(
    selected?.startsWith('templates/') && selected?.toLowerCase().endsWith('.html'),
  );

  const needsServerPreview = useMemo(
    () =>
      isHtmlTemplate &&
      (templateLayout === 'split' || (templateLayout === 'tabs' && viewTab === 'preview')),
    [isHtmlTemplate, templateLayout, viewTab],
  );

  const fetchTemplatePreview = useCallback(async () => {
    if (!isHtmlTemplate || !selected) return;
    setServerPreviewLoading(true);
    setServerPreviewError(null);
    try {
      const res = await fetch('/api/template-preview/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateSource: content,
          dataMode: templateDataMode,
          format: previewPaper,
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        html?: string;
        error?: string;
        stderr?: string;
      };
      if (!res.ok || !j.ok) {
        throw new Error(j.error || j.stderr?.slice(-500) || `HTTP ${res.status}`);
      }
      setServerPreviewHtml(j.html ?? null);
    } catch (e) {
      setServerPreviewHtml(null);
      setServerPreviewError(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setServerPreviewLoading(false);
    }
  }, [isHtmlTemplate, selected, content, templateDataMode, previewPaper]);

  useEffect(() => {
    if (!isHtmlTemplate) {
      setServerPreviewHtml(null);
      setServerPreviewError(null);
      return;
    }
    if (!needsServerPreview) return;
    const t = window.setTimeout(() => {
      void fetchTemplatePreview();
    }, 450);
    return () => window.clearTimeout(t);
  }, [isHtmlTemplate, needsServerPreview, content, templateDataMode, previewPaper, fetchTemplatePreview]);

  useEffect(() => {
    if (isHtmlTemplate) {
      setTemplateLayout('split');
      setTemplateDataMode('live');
    }
  }, [selected, isHtmlTemplate]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch('/api/settings/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selected, content }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      setInitialContent(content);
      setToast({ text: 'Saved to disk.', ok: true });
      void loadCatalog();
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Save failed', ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function revert() {
    if (!selected) return;
    await loadFile(selected);
    setToast({ text: 'Reverted to last saved version.', ok: true });
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-surface text-[var(--fg)] md:flex-row">
      <aside className="flex max-h-[min(46vh,28rem)] min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border md:h-full md:max-h-none md:w-64 md:border-b-0 md:border-r">
        <div className="shrink-0 border-b border-border px-3 py-3">
          <Link href="/" className="text-xs font-medium text-accent hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-lg font-semibold text-white">Customize</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-border px-3 py-3">
            <p className="text-xs text-muted">
              Edit allowlisted user files and CV templates. Paths are validated server-side.
            </p>
            {root && <p className="mt-2 break-all font-mono text-[10px] text-muted">{root}</p>}
            <div className="mt-3 space-y-0">
              <LanguageModesPicker
                onProfileUpdated={() => {
                  if (selected === 'config/profile.yml') void loadFile('config/profile.yml');
                }}
              />
              <DashboardPrefsPanel />
            </div>
          </div>
          <nav className="p-2 pb-4" aria-label="Settings files">
            {loadingCatalog && <p className="px-2 text-xs text-muted">Loading…</p>}
            {catalogErr && (
              <p className="px-2 text-xs text-rose-300">{catalogErr}</p>
            )}
            {GROUP_ORDER.map((g) => {
              const rows = grouped.get(g) ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={g} className="mb-4">
                  <p className="mb-1 px-2 text-[10px] uppercase tracking-wide text-muted">
                    {GROUP_TITLE[g]}
                  </p>
                  <ul className="space-y-0.5">
                    {rows.map((f) => (
                      <li key={f.path}>
                        <button
                          type="button"
                          onClick={() => setSelected(f.path)}
                          className={`w-full rounded-lg border px-2 py-2 text-left text-xs transition ${
                            selected === f.path
                              ? 'border-accent/60 bg-accent/15 text-white'
                              : 'border-transparent text-muted hover:bg-row/80 hover:text-white'
                          }`}>
                          <span className="block font-medium">{f.label}</span>
                          <span className="block truncate font-mono text-[10px] opacity-70">
                            {f.path}
                          </span>
                          {!f.exists && (
                            <span className="mt-0.5 block text-[10px] text-amber-300/90">
                              New file on save
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!selected ? (
          <p className="p-6 text-sm text-muted">Pick a file from the list.</p>
        ) : (
          <>
            <div className="shrink-0 border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-white">{meta?.label ?? selected}</h2>
              {meta?.description && (
                <p className="mt-1 text-sm text-muted">{meta.description}</p>
              )}
              {meta?.systemTemplate && (
                <p className="mt-2 rounded-md border border-amber-800/50 bg-amber-950/35 px-3 py-2 text-xs text-amber-100">
                  <strong className="text-amber-50">Note:</strong>{' '}
                  <code className="font-mono text-amber-200/90">templates/</code> ships with
                  career-ops; upstream updates can replace these files unless you fork or cherry-pick.
                </p>
              )}
              {selected &&
                (selected.endsWith('.md') ||
                  selected.endsWith('.html') ||
                  selected.endsWith('.tex')) && <AgentFileHelpCard filePath={selected} />}
              {isHtmlTemplate ? (
                <div className="mt-3 space-y-2 rounded-lg border border-border/80 bg-row/40 px-3 py-2 text-[11px] text-muted">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">HTML template</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted">Layout</span>
                    <div className="inline-flex overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setTemplateLayout('split')}
                        className={`px-2.5 py-1 text-xs ${
                          templateLayout === 'split' ? 'bg-accent/25 text-white' : 'text-muted hover:bg-row/90'
                        }`}>
                        Side-by-side
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateLayout('tabs')}
                        className={`border-l border-border px-2.5 py-1 text-xs ${
                          templateLayout === 'tabs' ? 'bg-accent/25 text-white' : 'text-muted hover:bg-row/90'
                        }`}>
                        Tabs
                      </button>
                    </div>
                    <span className="ml-2 text-muted">Data</span>
                    <div className="inline-flex overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setTemplateDataMode('live')}
                        className={`px-2.5 py-1 text-xs ${
                          templateDataMode === 'live' ? 'bg-emerald-950/50 text-emerald-100' : 'text-muted hover:bg-row/90'
                        }`}>
                        Live (cv + profile)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateDataMode('mock')}
                        className={`border-l border-border px-2.5 py-1 text-xs ${
                          templateDataMode === 'mock' ? 'bg-amber-950/40 text-amber-100' : 'text-muted hover:bg-row/90'
                        }`}>
                        Mock (fixtures)
                      </button>
                    </div>
                    <span className="ml-2 text-muted">Paper</span>
                    <select
                      value={previewPaper}
                      onChange={(e) => setPreviewPaper(e.target.value === 'letter' ? 'letter' : 'a4')}
                      className="rounded border border-border bg-surface px-2 py-1 text-xs text-white">
                      <option value="a4">A4</option>
                      <option value="letter">US Letter</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void fetchTemplatePreview()}
                      className="ml-1 rounded border border-border px-2 py-1 text-xs text-accent hover:border-accent/60">
                      Refresh preview
                    </button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted/90">
                    Mock uses <code className="text-accent">fixtures/template-preview/cv.md</code> +{' '}
                    <code className="text-accent">profile.yml</code>. Live uses your real repo files (unsaved template
                    buffer still sent to the render script).
                  </p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!(isHtmlTemplate && templateLayout === 'split') ? (
                  <>
                    <span className="mr-1 text-[10px] uppercase tracking-wide text-muted">View</span>
                    {(['editor', 'raw', 'preview'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        disabled={loadingFile}
                        onClick={() => setViewTab(tab)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition disabled:opacity-40 ${
                          viewTab === tab
                            ? 'border-accent/60 bg-accent/20 text-white'
                            : 'border-border text-muted hover:border-accent/40 hover:text-white'
                        }`}>
                        {tab}
                      </button>
                    ))}
                  </>
                ) : (
                  <span className="text-[10px] text-muted">
                    Editing template source in left pane — preview updates after you pause typing (~0.5s).
                  </span>
                )}
                {previewKind === 'none' && viewTab === 'preview' && !isHtmlTemplate && (
                  <span className="text-[10px] text-amber-200/90">Preview N/A for this type</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!dirty || saving || loadingFile}
                  onClick={() => void save()}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={!dirty || loadingFile}
                  onClick={() => void revert()}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-white hover:border-accent/50 disabled:opacity-40">
                  Revert
                </button>
              </div>
              {toast && (
                <p className={`mt-2 text-sm ${toast.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {toast.text}
                </p>
              )}
              {fileErr && <p className="mt-2 text-sm text-rose-300">{fileErr}</p>}
              {loadingFile && <p className="mt-2 text-xs text-muted">Loading file…</p>}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-2">
              {isHtmlTemplate && templateLayout === 'split' ? (
                <div className="grid h-full min-h-[420px] grid-cols-1 gap-3 lg:grid-cols-2 lg:min-h-0">
                  <div className="flex min-h-0 flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-muted">Template source</label>
                    <textarea
                      spellCheck={false}
                      disabled={loadingFile}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[280px] flex-1 resize-none rounded-xl border border-border bg-black/55 p-3 font-mono text-xs leading-relaxed text-[var(--fg)] outline-none ring-accent/40 focus:ring-2 lg:min-h-0"
                      aria-label="Template HTML source"
                    />
                  </div>
                  <div className="flex min-h-0 flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-muted">
                      Filled preview ({templateDataMode === 'mock' ? 'mock' : 'live'} · {previewPaper})
                    </label>
                    <div className="flex min-h-[280px] flex-1 flex-col rounded-xl border border-border bg-black/30 lg:min-h-0">
                      {serverPreviewLoading && (
                        <p className="border-b border-border px-2 py-1 text-[10px] text-accent">Rendering…</p>
                      )}
                      {serverPreviewError && (
                        <p className="border-b border-border px-2 py-1 text-[10px] text-rose-300">{serverPreviewError}</p>
                      )}
                      <iframe
                        title="Filled CV HTML preview"
                        sandbox="allow-same-origin allow-scripts"
                        srcDoc={serverPreviewHtml ?? '<p style="padding:12px;font-family:system-ui;color:#666">Waiting for preview…</p>'}
                        className="min-h-0 flex-1 rounded-b-xl bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {viewTab === 'editor' && (
                    <textarea
                      spellCheck={false}
                      disabled={loadingFile}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="h-full min-h-[240px] w-full resize-none rounded-xl border border-border bg-black/55 p-4 font-mono text-xs leading-relaxed text-[var(--fg)] outline-none ring-accent/40 focus:ring-2 md:min-h-0"
                      aria-label="File contents"
                    />
                  )}
                  {viewTab === 'raw' && (
                    <pre
                      className="h-full min-h-[240px] w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-black/55 p-4 font-mono text-xs leading-relaxed text-[var(--fg)] md:min-h-0"
                      aria-label="Raw file contents">
                      {content}
                    </pre>
                  )}
                  {viewTab === 'preview' && (
                    <div className="h-full min-h-[280px] md:min-h-0">
                      <PreviewPanel
                        path={selected}
                        content={content}
                        serverHtml={serverPreviewHtml}
                        serverError={serverPreviewError}
                        serverLoading={serverPreviewLoading}
                        fileDirty={dirty}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <footer className="shrink-0 border-t border-border px-4 py-2 text-[10px] text-muted">
              {dirty ? 'Unsaved changes' : 'No unsaved changes'} ·{' '}
              {new TextEncoder().encode(content).length} bytes UTF-8
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
