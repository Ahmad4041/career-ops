import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';
import { runWithTimeout } from '@/lib/spawn-timeout';

const MAX_TEMPLATE_BYTES = 1_500_000;
const TIMEOUT_MS = 90_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const templateSource = typeof o.templateSource === 'string' ? o.templateSource : '';
  const buf = Buffer.byteLength(templateSource, 'utf8');
  if (!templateSource.trim()) {
    return Response.json({ error: 'templateSource required' }, { status: 400 });
  }
  if (buf > MAX_TEMPLATE_BYTES) {
    return Response.json({ error: 'templateSource too large' }, { status: 400 });
  }

  const dataMode = o.dataMode === 'mock' ? 'mock' : 'live';
  const formatRaw = typeof o.format === 'string' ? o.format.trim().toLowerCase() : 'a4';
  const format = formatRaw === 'letter' ? 'letter' : 'a4';

  const root = getCareerOpsRoot();
  const renderScript = path.join(root, 'render-cv-html-from-template.mjs');

  if (!fs.existsSync(renderScript)) {
    return Response.json({ error: 'render-cv-html-from-template.mjs missing' }, { status: 500 });
  }

  if (dataMode === 'live') {
    if (!fs.existsSync(path.join(root, 'cv.md'))) {
      return Response.json({ error: 'Missing cv.md — use mock data or create cv.md' }, { status: 400 });
    }
    if (!fs.existsSync(path.join(root, 'config', 'profile.yml'))) {
      return Response.json({ error: 'Missing config/profile.yml — use mock data or create profile' }, { status: 400 });
    }
  } else {
    const mockCv = path.join(root, 'fixtures', 'template-preview', 'cv.md');
    const mockPf = path.join(root, 'fixtures', 'template-preview', 'profile.yml');
    if (!fs.existsSync(mockCv) || !fs.existsSync(mockPf)) {
      return Response.json({ error: 'Preview fixtures missing under fixtures/template-preview/' }, { status: 500 });
    }
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const tplRel = path.posix.join('output', `_preview-in-${id}.html`);
  const outRel = path.posix.join('output', `_preview-out-${id}.html`);
  const tplAbs = path.join(root, 'output', `_preview-in-${id}.html`);
  const outAbs = path.join(root, 'output', `_preview-out-${id}.html`);

  try {
    fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  } catch {
    return Response.json({ error: 'Could not create output/' }, { status: 500 });
  }

  try {
    fs.writeFileSync(tplAbs, templateSource, 'utf8');
  } catch {
    return Response.json({ error: 'Could not write preview template' }, { status: 500 });
  }

  const args = [
    renderScript,
    `--format=${format}`,
    `--root=${root}`,
    ...(dataMode === 'mock' ? ['--mock'] : []),
    tplRel,
    outRel,
  ];

  try {
    const r = await runWithTimeout(process.execPath, args, {
      cwd: root,
      env: process.env,
      timeoutMs: TIMEOUT_MS,
      shell: false,
    });

    let html = '';
    try {
      if (fs.existsSync(outAbs)) {
        html = fs.readFileSync(outAbs, 'utf8');
      }
    } finally {
      try {
        fs.unlinkSync(tplAbs);
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(outAbs);
      } catch {
        /* ignore */
      }
    }

    if (r.code !== 0) {
      return Response.json(
        {
          ok: false,
          error: 'Render script failed',
          stderr: r.stderr.slice(-6000),
          stdout: r.stdout.slice(-2000),
        },
        { status: 502 },
      );
    }

    if (!html || html.length < 20) {
      return Response.json({ ok: false, error: 'Empty render output' }, { status: 502 });
    }

    return Response.json({
      ok: true,
      html,
      dataMode,
      format,
    });
  } catch {
    try {
      if (fs.existsSync(tplAbs)) fs.unlinkSync(tplAbs);
      if (fs.existsSync(outAbs)) fs.unlinkSync(outAbs);
    } catch {
      /* ignore */
    }
    return Response.json({ ok: false, error: 'Preview pipeline crashed' }, { status: 500 });
  }
}
