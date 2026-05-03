import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';

function safeOutputBasename(filename: string): boolean {
  return /^[a-zA-Z0-9._+-]+\.(pdf|html|tex)$/i.test(filename) && filename.length <= 260;
}

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.html': 'text/html; charset=utf-8',
  '.tex': 'text/plain; charset=utf-8',
};

/** Stream PDF/HTML/TEX from output/ — use inline=1 for PDF iframes in the dashboard */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name')?.trim();
  const inline = url.searchParams.get('inline') === '1' || url.searchParams.get('inline') === 'true';

  if (!name || !safeOutputBasename(name)) {
    return Response.json({ error: 'Invalid name — only output/*.pdf, *.html, *.tex allowed' }, { status: 400 });
  }

  const root = getCareerOpsRoot();
  const outRoot = path.resolve(root, 'output');
  const abs = path.resolve(outRoot, name);
  if (!abs.startsWith(outRoot)) {
    return Response.json({ error: 'Bad path' }, { status: 400 });
  }

  const ext = path.extname(name).toLowerCase();

  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const buf = fs.readFileSync(abs);
    const mime = MIME[ext] || 'application/octet-stream';
    const dispSafe = path.basename(name).replace(/[^\x20-\x7E]/g, '_');
    const disposition = `${inline ? 'inline' : 'attachment'}; filename="${dispSafe}"`;
    return new Response(buf, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return Response.json({ error: 'Read failed' }, { status: 500 });
  }
}
