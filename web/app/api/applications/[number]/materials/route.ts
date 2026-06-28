import {
  findApplicationRow,
  loadMaterials,
  saveMaterials,
} from '@/lib/application-materials/store';
import type { ApplicationMaterials } from '@/lib/application-materials/types';
import { getCareerOpsRoot } from '@/lib/root';

function parseAppNumber(raw: string): number | null {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ number: string }> },
) {
  const { number: numRaw } = await context.params;
  const applicationNumber = parseAppNumber(numRaw);
  if (applicationNumber == null) {
    return Response.json({ error: 'Invalid application number' }, { status: 400 });
  }

  const root = getCareerOpsRoot();
  const row = findApplicationRow(root, applicationNumber);
  if (!row) {
    return Response.json({ error: `Application #${applicationNumber} not found` }, { status: 404 });
  }

  const materials = loadMaterials(root, applicationNumber, {
    company: row.company,
    role: row.role,
    reportPath: row.reportPath,
  });

  return Response.json({ materials, storagePath: `data/application-materials/${applicationNumber}.json` });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ number: string }> },
) {
  const { number: numRaw } = await context.params;
  const applicationNumber = parseAppNumber(numRaw);
  if (applicationNumber == null) {
    return Response.json({ error: 'Invalid application number' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const root = getCareerOpsRoot();
  const row = findApplicationRow(root, applicationNumber);
  if (!row) {
    return Response.json({ error: `Application #${applicationNumber} not found` }, { status: 404 });
  }

  const existing = loadMaterials(root, applicationNumber, {
    company: row.company,
    role: row.role,
    reportPath: row.reportPath,
  });

  const materials: ApplicationMaterials = {
    ...existing,
    summary: typeof o.summary === 'string' ? o.summary : existing.summary,
    coverLetterSalutation:
      typeof o.coverLetterSalutation === 'string'
        ? o.coverLetterSalutation
        : existing.coverLetterSalutation,
    coverLetter: typeof o.coverLetter === 'string' ? o.coverLetter : existing.coverLetter,
    recruiterMessage: typeof o.recruiterMessage === 'string' ? o.recruiterMessage : existing.recruiterMessage,
    customQuestionsInput:
      typeof o.customQuestionsInput === 'string' ? o.customQuestionsInput : existing.customQuestionsInput,
    customQa: Array.isArray(o.customQa)
      ? (o.customQa as ApplicationMaterials['customQa'])
      : existing.customQa,
  };

  const storagePath = saveMaterials(root, materials);
  return Response.json({ ok: true, materials, storagePath });
}
