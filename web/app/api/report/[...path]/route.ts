import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';

async function segmentsFromParams(params: Promise<{ path: string[] }>) {
  const { path: segments } = await params;
  return segments ?? [];
}

function safeMarkdownPath(root: string, segments: string[]): string | null {
  if (!segments.length) return null;
  const rel = segments.join(path.sep);
  if (rel.includes('..')) return null;
  const resolved = path.resolve(root, rel);
  const reportsRoot = path.resolve(root, 'reports');
  const common = path.relative(reportsRoot, resolved);
  if (common.startsWith('..') || path.isAbsolute(common)) return null;
  return resolved;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const root = getCareerOpsRoot();
  const segments = await segmentsFromParams(context.params);
  const filePath = safeMarkdownPath(root, segments);
  if (!filePath?.endsWith('.md')) {
    return new Response(JSON.stringify({ error: 'Invalid or missing report path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const body = fs.readFileSync(filePath, 'utf8');
    return new Response(JSON.stringify({ path: segments.join('/'), markdown: body }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Report not readable' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
