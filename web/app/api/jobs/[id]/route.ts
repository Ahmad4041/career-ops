import { archiveJob, deleteJob, getJob } from '@/lib/jobs/store';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
  return Response.json(job);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

  if (job.status === 'queued' || job.status === 'running') {
    return Response.json({ error: 'Cannot remove a job that is still running' }, { status: 409 });
  }

  const url = new URL(request.url);
  const archive = url.searchParams.get('archive') === '1';

  if (archive) {
    archiveJob(id);
    return Response.json({ ok: true, archived: true, id });
  }

  deleteJob(id);
  return Response.json({ ok: true, deleted: true, id });
}
