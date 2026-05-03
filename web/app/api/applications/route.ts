import fs from 'fs';

import {
  computeMetrics,
  parseApplications,
  patchApplicationInMarkdown,
  resolveApplicationsMdPath,
} from '@/lib/applications-parser';
import { readCandidateSlugFromProfile } from '@/lib/candidate-slug';
import { getCareerOpsRoot } from '@/lib/root';
import { normalizeStatusForPatch } from '@/lib/tracker-states';

export async function GET() {
  const root = getCareerOpsRoot();
  try {
    const { apps, trackerPath } = parseApplications(root);
    const metrics = computeMetrics(apps);
    return Response.json({
      careerOpsRoot: root,
      trackerPath,
      candidateSlug: readCandidateSlugFromProfile(root),
      metrics,
      applications: apps,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message, careerOpsRoot: root }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const root = getCareerOpsRoot();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const numRaw = o.applicationNumber ?? o.number;
  const applicationNumber =
    typeof numRaw === 'number' ? numRaw : parseInt(String(numRaw ?? ''), 10);
  if (!Number.isFinite(applicationNumber)) {
    return Response.json({ error: 'applicationNumber (or number) required' }, { status: 400 });
  }

  const statusRaw = typeof o.status === 'string' ? o.status.trim() : undefined;
  const notesRaw = typeof o.notes === 'string' ? o.notes : undefined;

  if (statusRaw === undefined && notesRaw === undefined) {
    return Response.json({ error: 'Provide status and/or notes' }, { status: 400 });
  }

  let statusLabel: string | undefined;
  if (statusRaw !== undefined) {
    const norm = normalizeStatusForPatch(statusRaw);
    if (!norm) {
      return Response.json({ error: `Unknown status: ${statusRaw}` }, { status: 400 });
    }
    statusLabel = norm;
  }

  const trackerPath = resolveApplicationsMdPath(root);
  if (!trackerPath || !fs.existsSync(trackerPath)) {
    return Response.json({ error: 'applications.md not found' }, { status: 400 });
  }

  let markdown: string;
  try {
    markdown = fs.readFileSync(trackerPath, 'utf8');
  } catch {
    return Response.json({ error: 'Tracker unreadable' }, { status: 500 });
  }

  const patched = patchApplicationInMarkdown(markdown, applicationNumber, {
    ...(statusLabel !== undefined ? { status: statusLabel } : {}),
    ...(notesRaw !== undefined ? { notes: notesRaw } : {}),
  });

  if (!patched.ok) {
    return Response.json({ error: patched.error }, { status: 400 });
  }

  try {
    fs.writeFileSync(trackerPath, patched.content, 'utf8');
  } catch {
    return Response.json({ error: 'Failed to write tracker' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    applicationNumber,
    ...(statusLabel !== undefined ? { status: statusLabel } : {}),
    trackerPath: trackerPath.startsWith(root) ? trackerPath.slice(root.length + 1) : trackerPath,
  });
}
