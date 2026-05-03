import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';
import { getSettingsMeta, parseSafeSettingsPath } from '@/lib/settings-allowlist';

const MAX_BYTES = 1_500_000;

function absolutePath(root: string, rel: string): string {
  return path.join(root, ...rel.split('/'));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rel = parseSafeSettingsPath(url.searchParams.get('path') ?? '');
  if (!rel) {
    return Response.json({ error: 'Unknown or disallowed path' }, { status: 400 });
  }
  const root = getCareerOpsRoot();
  const abs = absolutePath(root, rel);
  const meta = getSettingsMeta(rel);
  if (!fs.existsSync(abs)) {
    return Response.json({
      path: rel,
      content: '',
      exists: false,
      meta,
    });
  }
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) {
      return Response.json({ error: 'Not a file' }, { status: 400 });
    }
    if (st.size > MAX_BYTES) {
      return Response.json({ error: 'File too large for editor' }, { status: 400 });
    }
    const content = fs.readFileSync(abs, 'utf8');
    return Response.json({ path: rel, content, exists: true, meta });
  } catch {
    return Response.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const pathRaw = typeof o.path === 'string' ? o.path : '';
  const content = typeof o.content === 'string' ? o.content : null;
  if (content === null) {
    return Response.json({ error: 'content (string) required' }, { status: 400 });
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) {
    return Response.json({ error: 'Payload too large' }, { status: 400 });
  }

  const rel = parseSafeSettingsPath(pathRaw);
  if (!rel) {
    return Response.json({ error: 'Unknown or disallowed path' }, { status: 400 });
  }

  const root = getCareerOpsRoot();
  const abs = absolutePath(root, rel);
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  } catch {
    return Response.json({ error: 'Failed to write file' }, { status: 500 });
  }

  return Response.json({ ok: true, path: rel, bytes: Buffer.byteLength(content, 'utf8') });
}
