import type { CreateJobInput } from '@/lib/jobs/execute-job';
import { enqueueJob } from '@/lib/jobs/execute-job';
import { listJobs } from '@/lib/jobs/store';

const PROVIDERS = new Set(['claude', 'cursor', 'node']);
const OPS = new Set(['evaluate_job', 'portal_scan', 'verify_pipeline', 'merge_tracker']);

export async function GET() {
  return Response.json({
    jobs: listJobs().map((j) => ({
      id: j.id,
      provider: j.provider,
      operation: j.operation,
      status: j.status,
      exitCode: j.exitCode ?? null,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      logLines: j.logs.length,
    })),
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Expected JSON object' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const provider = raw.provider;
  const operation = raw.operation;

  if (!PROVIDERS.has(String(provider))) {
    return Response.json({ error: 'Invalid provider', allowed: [...PROVIDERS] }, { status: 400 });
  }
  if (!OPS.has(String(operation))) {
    return Response.json({ error: 'Invalid operation', allowed: [...OPS] }, { status: 400 });
  }

  const input: CreateJobInput = {
    provider: provider as CreateJobInput['provider'],
    operation: operation as CreateJobInput['operation'],
    url: typeof raw.url === 'string' ? raw.url : undefined,
    jdText: typeof raw.jdText === 'string' ? raw.jdText : undefined,
  };

  if (input.operation === 'evaluate_job') {
    if (input.provider !== 'claude' && input.provider !== 'cursor') {
      return Response.json(
        { error: 'evaluate_job requires provider `claude` or `cursor` (headless agents)' },
        { status: 400 },
      );
    }
  } else if (input.provider !== 'node') {
    return Response.json({ error: 'scan/verify/merge jobs require provider `node`' }, { status: 400 });
  }

  const r = enqueueJob(input);

  if (r.error || !r.id) {
    return Response.json({ error: r.error ?? 'enqueue failed' }, { status: r.status ?? 500 });
  }

  return Response.json({
    jobId: r.id,
    detailUrl: `/api/jobs/${r.id}`,
    streamUrl: `/api/jobs/${r.id}/stream`,
  });
}
