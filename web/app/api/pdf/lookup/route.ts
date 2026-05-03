import { findPdfForReport } from '@/lib/pdf-for-report';
import { getCareerOpsRoot } from '@/lib/root';

/** JSON: whether output/ matches this report slug for download */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reportPath = url.searchParams.get('reportPath')?.trim();
  if (
    !reportPath ||
    reportPath.includes('..') ||
    !reportPath.endsWith('.md') ||
    !reportPath.replace(/\\/g, '/').startsWith('reports/')
  ) {
    return Response.json(
      { error: 'reportPath must be reports/*.md relative to repo root' },
      { status: 400 },
    );
  }
  const root = getCareerOpsRoot();
  const absolute = findPdfForReport(root, reportPath.replace(/\\/g, '/'));

  return Response.json({
    available: Boolean(absolute),
    ...(absolute
      ? {
          basename: absolute.split(/[/\\]/).pop(),
          downloadUrl: `/api/pdf/download?reportPath=${encodeURIComponent(reportPath.replace(/\\/g, '/'))}`,
        }
      : {}),
  });
}
