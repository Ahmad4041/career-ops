import { basenameOnly, findArtifactForReport } from '@/lib/artifacts-for-report';
import { findPdfForReport } from '@/lib/pdf-for-report';
import { getCareerOpsRoot } from '@/lib/root';

function fileUrls(basenameVal: string | null) {
  if (!basenameVal) return {};
  const q = encodeURIComponent(basenameVal);
  return {
    basename: basenameVal,
    urlInline: `/api/output/file?name=${q}&inline=1`,
    urlDownload: `/api/output/file?name=${q}`,
  };
}

/** PDF + HTML + .tex siblings in output/ for a tracker report slug */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reportPath = url.searchParams.get('reportPath')?.trim().replace(/\\/g, '/');
  if (
    !reportPath ||
    reportPath.includes('..') ||
    !reportPath.endsWith('.md') ||
    !reportPath.startsWith('reports/')
  ) {
    return Response.json({ error: 'reportPath must be reports/*.md' }, { status: 400 });
  }

  const root = getCareerOpsRoot();

  const pdfAbs = findPdfForReport(root, reportPath);
  const pdfBase = basenameOnly(pdfAbs);

  const htmlBase = basenameOnly(findArtifactForReport(root, reportPath, '.html'));
  const texBase = basenameOnly(findArtifactForReport(root, reportPath, '.tex'));

  return Response.json({
    reportPath,
    pdf: pdfBase
      ? { available: true, ...fileUrls(pdfBase) }
      : { available: false },
    html: htmlBase
      ? { available: true, ...fileUrls(htmlBase) }
      : { available: false },
    tex: texBase
      ? { available: true, ...fileUrls(texBase) }
      : { available: false },
  });
}
