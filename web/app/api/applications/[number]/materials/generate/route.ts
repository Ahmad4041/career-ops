import {
  findApplicationRow,
  loadMaterials,
  saveMaterials,
} from '@/lib/application-materials/store';
import { generateMaterialsWithAgent, resolveMaterialsProvider } from '@/lib/application-materials/run-agent';
import type { MaterialPhase } from '@/lib/application-materials/types';
import { getCareerOpsRoot } from '@/lib/root';

/** Agent runs can take several minutes (same order of magnitude as evaluate jobs). */
export const maxDuration = 600;

const PHASES = new Set<MaterialPhase>([
  'summary',
  'coverLetter',
  'recruiterMessage',
  'customQuestions',
]);

function parseAppNumber(raw: string): number | null {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function POST(
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
  const phase = typeof o.phase === 'string' ? o.phase : '';
  if (!PHASES.has(phase as MaterialPhase)) {
    return Response.json(
      { error: 'phase must be summary | coverLetter | recruiterMessage | customQuestions' },
      { status: 400 },
    );
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

  const questions =
    typeof o.questions === 'string'
      ? o.questions
      : phase === 'customQuestions'
        ? materials.customQuestionsInput
        : '';

  const provider = resolveMaterialsProvider(o.provider);

  let parsed: Awaited<ReturnType<typeof generateMaterialsWithAgent>>;
  try {
    parsed = await generateMaterialsWithAgent({
      app: row,
      phase: phase as MaterialPhase,
      questions,
      coverLetterSalutation: materials.coverLetterSalutation,
      provider,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Generation failed', provider },
      { status: 500 },
    );
  }

  if (!parsed.ok) {
    return Response.json(
      {
        error: parsed.error ?? 'Generation failed',
        provider,
        stderr: parsed.stderr?.slice(-1500),
        exitCode: parsed.exitCode,
      },
      { status: 500 },
    );
  }

  if (phase === 'customQuestions' && Array.isArray(parsed.items)) {
    materials.customQa = parsed.items;
    materials.customQuestionsInput = questions;
  } else if (typeof parsed.text === 'string') {
    if (phase === 'summary') materials.summary = parsed.text;
    else if (phase === 'coverLetter') materials.coverLetter = parsed.text;
    else if (phase === 'recruiterMessage') materials.recruiterMessage = parsed.text;
  } else {
    return Response.json(
      { error: 'Agent response missing text or items', provider },
      { status: 500 },
    );
  }

  const storagePath = saveMaterials(root, materials);
  return Response.json({ ok: true, phase, provider, materials, storagePath });
}
