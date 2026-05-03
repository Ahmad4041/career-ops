import { listHtmlCvTemplates } from '@/lib/pdf-template-paths';
import { getCareerOpsRoot } from '@/lib/root';

export async function GET() {
  const root = getCareerOpsRoot();
  const templates = listHtmlCvTemplates();
  return Response.json({ careerOpsRoot: root, templates });
}
