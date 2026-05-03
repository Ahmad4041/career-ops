import fs from 'fs';
import path from 'path';

import { findPdfForReport } from '@/lib/pdf-for-report';
import { getCareerOpsRoot } from '@/lib/root';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reportPath = url.searchParams.get('reportPath')?.trim();
  if (!reportPath || reportPath.includes('..') || !reportPath.endsWith('.md')) {
    return Response.json({ error: 'reportPath query required' }, { status: 400 });
  }
  const root = getCareerOpsRoot();
  const normalized = reportPath.replace(/\\/g, '/');
  if (!normalized.startsWith('reports/')) {
    return Response.json({ error: 'reportPath must start with reports/' }, { status: 400 });
  }

  const relReports = path.resolve(root, 'reports');
  const reportResolved = path.resolve(root, normalized);
  if (!reportResolved.startsWith(relReports)) {
    return Response.json({ error: 'Bad report path' }, { status: 400 });
  }

  const absolute = findPdfForReport(root, normalized);
  if (!absolute || !fs.existsSync(absolute)) {
    return Response.json({ error: 'No PDF matched this report in output/' }, { status: 404 });
  }

  const outRoot = path.resolve(root, 'output');
  const pdfResolved = path.resolve(absolute);
  if (!pdfResolved.startsWith(outRoot)) {
    return Response.json({ error: 'Invalid PDF path' }, { status: 400 });
  }

  try {
    const buf = fs.readFileSync(absolute);
    const name = path.basename(absolute).replace(/[^\x20-\x7E]/g, '_');
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch {
    return Response.json({ error: 'PDF read failed' }, { status: 500 });
  }
}
