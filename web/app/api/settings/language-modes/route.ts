import {
  discoverAvailableLanguageModes,
  isAllowedModesDir,
  readProfileYaml,
  writeModesDirToProfile,
  parseModesDirFromProfileYaml,
} from '@/lib/language-modes';
import { getCareerOpsRoot } from '@/lib/root';

export async function GET() {
  const root = getCareerOpsRoot();
  const options = discoverAvailableLanguageModes(root);
  const { content, exists } = readProfileYaml(root);
  const modesDir = exists ? parseModesDirFromProfileYaml(content) : null;

  return Response.json({
    modesDir,
    profileExists: exists,
    options,
  });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (o.modesDir !== null && o.modesDir !== undefined && typeof o.modesDir !== 'string') {
    return Response.json({ error: 'modesDir must be a string or null' }, { status: 400 });
  }

  const raw =
    o.modesDir === null || o.modesDir === undefined
      ? null
      : typeof o.modesDir === 'string'
        ? o.modesDir
        : null;

  const root = getCareerOpsRoot();
  const options = discoverAvailableLanguageModes(root);
  if (!isAllowedModesDir(raw, options)) {
    return Response.json({ error: 'Unknown or unavailable language modes directory' }, { status: 400 });
  }

  try {
    const { modesDir, created } = writeModesDirToProfile(root, raw);
    return Response.json({ ok: true, modesDir, profileCreated: created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to write profile';
    return Response.json({ error: msg }, { status: 500 });
  }
}
