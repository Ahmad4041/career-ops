import fs from 'fs';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';

function safeRenderedPdfBasename(name: string): boolean {
  return /^[a-zA-Z0-9._+-]+\.pdf$/i.test(name) && name.length <= 200;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get('name')?.trim();
  if (!name || !safeRenderedPdfBasename(name)) {
    return Response.json({ error: 'name must be a simple .pdf filename' }, { status: 400 });
  }

  const root = getCareerOpsRoot();
  const outRoot = path.resolve(root, 'output');
  const abs = path.resolve(outRoot, name);
  if (!abs.startsWith(outRoot)) {
    return Response.json({ error: 'Bad path' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return Response.json({ error: 'PDF not found' }, { status: 404 });
    }
    const buf = fs.readFileSync(abs);
    const disp = name.replace(/[^\x20-\x7E]/g, '_');
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${disp}"`,
      },
    });
  } catch {
    return Response.json({ error: 'PDF read failed' }, { status: 500 });
  }
}
