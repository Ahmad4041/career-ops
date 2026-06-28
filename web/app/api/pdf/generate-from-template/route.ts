import fs from 'fs';
import path from 'path';

import {
  assertSafeCvTemplateRelative,
  templateAbsolutePath,
} from '@/lib/pdf-template-paths';
import { readCandidateSlugFromProfile } from '@/lib/candidate-slug';
import { getCareerOpsRoot } from '@/lib/root';
import { runWithTimeout } from '@/lib/spawn-timeout';

const RENDER_TIMEOUT_MS = 120_000;
const PDF_TIMEOUT_MS = 180_000;

function sanitizeFileStem(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9._+-]+/g, '-')
    .replace(/^-+/g, '')
    .slice(0, 100);
}

function pdfStepErrorMessage(stderr: string): string {
  const tail = stderr.trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  const failedMatch = tail.match(/PDF generation failed:\s*(.+)$/);
  if (failedMatch?.[1]) return failedMatch[1];
  if (/Executable doesn't exist|playwright install/i.test(stderr)) {
    return 'Playwright Chromium is not installed. Run: npx playwright install chromium';
  }
  if (tail) return tail;
  return 'generate-pdf.mjs failed';
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const templateRaw = typeof o.templatePath === 'string' ? o.templatePath.trim() : '';
  const tpl = assertSafeCvTemplateRelative(templateRaw);
  if (!tpl) {
    return Response.json(
      { error: 'templatePath must be templates/<name>.html (simple filename, no traversal)' },
      { status: 400 },
    );
  }

  const formatRaw = typeof o.format === 'string' ? o.format.trim().toLowerCase() : 'a4';
  const format = formatRaw === 'letter' ? 'letter' : 'a4';

  const root = getCareerOpsRoot();
  const renderScript = path.join(root, 'render-cv-html-from-template.mjs');
  const pdfScript = path.join(root, 'generate-pdf.mjs');
  const absTpl = templateAbsolutePath(tpl);

  for (const p of [renderScript, pdfScript, path.join(root, 'cv.md'), path.join(root, 'config', 'profile.yml'), absTpl]) {
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

  const renderOnly = Boolean(o.renderOnly);

  const profileSlug = readCandidateSlugFromProfile(root);
  const slugFromBody = typeof o.outputSlug === 'string' ? sanitizeFileStem(o.outputSlug) : '';
  const slugPart =
    slugFromBody || profileSlug || 'cv';

  const date = new Date().toISOString().slice(0, 10);
  const stamp = sanitizeFileStem(`${slugPart}-${reportStem || 'cv'}-${date}`);

  const outDir = path.join(root, 'output');
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch {
    return Response.json({ error: 'Could not create output/' }, { status: 500 });
  }

  const tmpBasename = `_cv-dash-render-${process.pid}-${Date.now()}.html`;
  const tmpHtmlRel = path.posix.join('output', tmpBasename.replace(/\\/g, '/'));
  const tmpHtmlAbs = path.join(root, 'output', tmpBasename);

  const pdfName = sanitizeFileStem(`cv-${stamp}`) + '.pdf';
  const pdfAbs = path.join(outDir, pdfName);
  const pdfRel = path.posix.join('output', pdfName);

  const phases: { step: string; code: number; stderr: string; stdout: string }[] = [];

  try {
    if (renderOnly) {
      const htmlName = sanitizeFileStem(`cv-${stamp}`) + '.html';
      const htmlAbs = path.join(outDir, htmlName);
      const htmlRel = path.posix.join('output', htmlName);
      const r1 = await runWithTimeout(
        process.execPath,
        [renderScript, `--format=${format}`, `--root=${root}`, tpl, htmlRel],
        {
          cwd: root,
          env: process.env,
          timeoutMs: RENDER_TIMEOUT_MS,
          shell: false,
        },
      );
      phases.push({
        step: 'render-html',
        code: r1.code,
        stderr: r1.stderr.slice(-8000),
        stdout: r1.stdout.slice(-8000),
      });
      if (r1.code !== 0) {
        return Response.json(
          {
            ok: false,
            error: 'render-cv-html-from-template.mjs failed',
            phases,
          },
          { status: 502 },
        );
      }
      try {
        if (!fs.existsSync(htmlAbs) || fs.statSync(htmlAbs).size < 50) {
          return Response.json(
            { ok: false, error: 'Rendered HTML missing or too small', phases },
            { status: 502 },
          );
        }
      } catch {
        return Response.json({ ok: false, error: 'Could not stat rendered HTML', phases }, { status: 502 });
      }

      const downloadHref = `/api/output/file?name=${encodeURIComponent(htmlName)}`;

      return Response.json({
        ok: true,
        renderOnly: true,
        templatePath: tpl,
        htmlPath: htmlRel,
        downloadUrl: downloadHref,
        format,
        phases,
      });
    }

    const r1 = await runWithTimeout(process.execPath, [renderScript, `--format=${format}`, `--root=${root}`, tpl, tmpHtmlRel], {
      cwd: root,
      env: process.env,
      timeoutMs: RENDER_TIMEOUT_MS,
      shell: false,
    });
    phases.push({
      step: 'render-html',
      code: r1.code,
      stderr: r1.stderr.slice(-8000),
      stdout: r1.stdout.slice(-8000),
    });
    if (r1.code !== 0) {
      return Response.json(
        {
          ok: false,
          error: 'render-cv-html-from-template.mjs failed',
          phases,
        },
        { status: 502 },
      );
    }

    try {
      if (!fs.existsSync(tmpHtmlAbs) || fs.statSync(tmpHtmlAbs).size < 50) {
        return Response.json(
          { ok: false, error: 'Rendered HTML missing or too small', phases },
          { status: 502 },
        );
      }
    } catch {
      return Response.json({ ok: false, error: 'Could not stat rendered HTML', phases }, { status: 502 });
    }

    const r2 = await runWithTimeout(
      process.execPath,
      [pdfScript, tmpHtmlAbs, pdfAbs, `--format=${format}`],
      {
        cwd: root,
        env: process.env,
        timeoutMs: PDF_TIMEOUT_MS,
        shell: false,
      },
    );
    phases.push({
      step: 'generate-pdf',
      code: r2.code,
      stderr: r2.stderr.slice(-8000),
      stdout: r2.stdout.slice(-8000),
    });

    try {
      fs.unlinkSync(tmpHtmlAbs);
    } catch {
      /* temp cleanup best-effort */
    }

    if (r2.code !== 0) {
      return Response.json(
        { ok: false, error: pdfStepErrorMessage(r2.stderr), phases },
        { status: 502 },
      );
    }

    if (!fs.existsSync(pdfAbs)) {
      return Response.json({ ok: false, error: 'PDF not written', phases }, { status: 502 });
    }

    const downloadHref = `/api/pdf/download-rendered?name=${encodeURIComponent(pdfName)}`;

    return Response.json({
      ok: true,
      templatePath: tpl,
      pdfPath: pdfRel,
      downloadUrl: downloadHref,
      format,
      phases,
    });
  } catch {
    try {
      if (fs.existsSync(tmpHtmlAbs)) fs.unlinkSync(tmpHtmlAbs);
    } catch {
      /* ignore */
    }
    return Response.json({ ok: false, error: 'PDF pipeline crashed' }, { status: 500 });
  }
}
