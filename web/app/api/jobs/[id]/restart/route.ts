import { restartJob } from '@/lib/jobs/execute-job';
import { getJob } from '@/lib/jobs/store';

const PROVIDERS = new Set(['claude', 'cursor', 'node']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const source = getJob(id);
  if (!source) return Response.json({ error: 'Job not found' }, { status: 404 });

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const providerRaw = typeof raw.provider === 'string' ? raw.provider.trim() : undefined;
  if (providerRaw && !PROVIDERS.has(providerRaw)) {
    return Response.json({ error: 'Invalid provider', allowed: [...PROVIDERS] }, { status: 400 });
  }

  const r = restartJob(id, {
    url: typeof raw.url === 'string' ? raw.url : undefined,
    jdText: typeof raw.jdText === 'string' ? raw.jdText : undefined,
    provider: providerRaw as 'claude' | 'cursor' | 'node' | undefined,
  });

  if (r.error || !r.id) {
    return Response.json({ error: r.error ?? 'restart failed' }, { status: r.status ?? 500 });
  }

  return Response.json({
    ok: true,
    restartedFrom: id,
    jobId: r.id,
    detailUrl: `/api/jobs/${r.id}`,
    streamUrl: `/api/jobs/${r.id}/stream`,
    ...(r.duplicateOf != null
      ? { duplicateOf: r.duplicateOf, duplicateWarning: r.duplicateWarning }
      : {}),
  });
}
