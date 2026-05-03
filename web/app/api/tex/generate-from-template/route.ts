import fs from 'fs';
import path from 'path';

import {
  assertSafeCvTexTemplateRelative,
  templateAbsolutePath,
} from '@/lib/pdf-template-paths';
import { readCandidateSlugFromProfile } from '@/lib/candidate-slug';
import { summarizeGenerateLatexFailure } from '@/lib/parse-generate-latex-output';
import { getCareerOpsRoot } from '@/lib/root';
import { runWithTimeout } from '@/lib/spawn-timeout';

const RENDER_TEX_MS = 120_000;
const LATEX_COMPILE_MS = 300_000;

function sanitizeFileStem(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9._+-]+/g, '-')
    .replace(/^-+/g, '')
    .slice(0, 100);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const templateRaw =
    typeof o.templatePath === 'string'
      ? o.templatePath.trim()
      : `templates/${'cv-template.tex'}`;
  const tpl = assertSafeCvTexTemplateRelative(templateRaw);
  if (!tpl) {
    return Response.json(
      { error: 'templatePath must be templates/<name>.tex (ASCII basename, no traversal)' },
      { status: 400 },
    );
  }

  const root = getCareerOpsRoot();
  const renderScript = path.join(root, 'render-cv-tex-from-template.mjs');
  const latexScript = path.join(root, 'generate-latex.mjs');
  const absTpl = templateAbsolutePath(tpl);

  for (const p of [renderScript, latexScript, path.join(root, 'cv.md'), path.join(root, 'config', 'profile.yml'), absTpl]) {
    try {
      if (!fs.existsSync(p)) {
        return Response.json({ error: `Missing prerequisite: ${path.relative(root, p) || '.'}` }, { status: 400 });
      }
    } catch {
      return Response.json({ error: 'Filesystem check failed' }, { status: 500 });
    }
  }

  let reportStem = '';
  const reportPathRaw = typeof o.reportPath === 'string' ? o.reportPath.replace(/\\/g, '/').trim() : '';
  if (reportPathRaw.startsWith('reports/') && reportPathRaw.endsWith('.md')) {
    reportStem = path.basename(reportPathRaw, '.md');
  }

  const profileSlug = readCandidateSlugFromProfile(root);
  const slugFromBody = typeof o.outputSlug === 'string' ? sanitizeFileStem(o.outputSlug) : '';
  const slugPart = slugFromBody || profileSlug || 'cv';

  const date = new Date().toISOString().slice(0, 10);
  const stamp = sanitizeFileStem(`${slugPart}-${reportStem || 'cv'}-${date}`);

  const outDir = path.join(root, 'output');
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch {
    return Response.json({ error: 'Could not create output/' }, { status: 500 });
  }

  const texName = sanitizeFileStem(`cv-${stamp}`) + '.tex';
  const pdfName = sanitizeFileStem(`cv-${stamp}`) + '.pdf';
  const texAbs = path.join(outDir, texName);
  const pdfAbs = path.join(outDir, pdfName);
  const texRel = path.posix.join('output', texName);

  const phases: { step: string; code: number; stderr: string; stdout: string }[] = [];

  try {
    const r1 = await runWithTimeout(
      process.execPath,
      [renderScript, `--root=${root}`, tpl, texRel],
      {
        cwd: root,
        env: process.env,
        timeoutMs: RENDER_TEX_MS,
        shell: false,
      },
    );
    phases.push({
      step: 'render-tex',
      code: r1.code,
      stderr: r1.stderr.slice(-8000),
      stdout: r1.stdout.slice(-8000),
    });
    if (r1.code !== 0) {
      return Response.json(
        { ok: false, error: 'render-cv-tex-from-template.mjs failed', phases },
        { status: 502 },
      );
    }

    if (!fs.existsSync(texAbs) || fs.statSync(texAbs).size < 80) {
      return Response.json({ ok: false, error: '.tex missing or empty after render', phases }, { status: 502 });
    }

    const r2 = await runWithTimeout(process.execPath, [latexScript, texAbs, pdfAbs], {
      cwd: root,
      env: process.env,
      timeoutMs: LATEX_COMPILE_MS,
      shell: false,
    });
    phases.push({
      step: 'generate-latex',
      code: r2.code,
      stderr: r2.stderr.slice(-8000),
      stdout: r2.stdout.slice(-8000),
    });

    const pdfOk = r2.code === 0 && fs.existsSync(pdfAbs);

    if (!pdfOk) {
      const fromStdout =
        summarizeGenerateLatexFailure(r2.stdout) ||
        summarizeGenerateLatexFailure(r2.stderr);
      const error =
        fromStdout ??
        'generate-latex.mjs failed (install tectonic or pdflatex), or compilation error — .tex saved in output/';
      return Response.json({
        ok: false,
        partialTex: true,
        texPath: texRel,
        texDownloadUrl: `/api/output/file?name=${encodeURIComponent(texName)}`,
        error,
        phases,
      });
    }

    return Response.json({
      ok: true,
      texPath: texRel,
      pdfPath: path.posix.join('output', pdfName),
      texDownloadUrl: `/api/output/file?name=${encodeURIComponent(texName)}`,
      pdfDownloadUrl: `/api/pdf/download-rendered?name=${encodeURIComponent(pdfName)}`,
      pdfInlineUrl: `/api/output/file?name=${encodeURIComponent(pdfName)}&inline=1`,
      templatePath: tpl,
      phases,
    });
  } catch {
    return Response.json({ ok: false, error: 'LaTeX pipeline crashed' }, { status: 500 });
  }
}
