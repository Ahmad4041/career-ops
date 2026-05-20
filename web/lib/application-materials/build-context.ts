import fs from 'fs';
import path from 'path';

import type { CareerApplication } from '@/lib/applications-parser';
import { getCareerOpsRoot } from '@/lib/root';

export type MaterialsContext = {
  root: string;
  app: CareerApplication;
  reportBody: string;
  cv: string;
  profileYml: string;
  profileMd: string;
  digest: string;
  materialsMode: string;
  contacto: string;
};

function readOptional(root: string, rel: string): string {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return `[${rel} not found]`;
  try {
    return fs.readFileSync(fp, 'utf8').trim();
  } catch {
    return `[${rel} unreadable]`;
  }
}

export function buildMaterialsContext(app: CareerApplication): MaterialsContext {
  const root = getCareerOpsRoot();
  let reportBody = '[No evaluation report linked — use tracker row + cv.md]';
  if (app.reportPath) {
    const rp = path.join(root, app.reportPath);
    if (fs.existsSync(rp)) {
      reportBody = fs.readFileSync(rp, 'utf8').trim().slice(0, 120_000);
    }
  }

  return {
    root,
    app,
    reportBody,
    cv: readOptional(root, 'cv.md'),
    profileYml: readOptional(root, 'config/profile.yml'),
    profileMd: readOptional(root, 'modes/_profile.md'),
    digest: readOptional(root, 'article-digest.md'),
    materialsMode: readOptional(root, 'modes/application-materials.md'),
    contacto: readOptional(root, 'modes/contacto.md').slice(0, 2500),
  };
}

export function contextBlock(ctx: MaterialsContext): string {
  const { app } = ctx;
  return [
    `Application #${app.number}: ${app.company} — ${app.role}`,
    `Date: ${app.date}`,
    `Status: ${app.status}`,
    `Score: ${app.scoreRaw}`,
    `Posting URL: ${app.jobUrl || '(none)'}`,
    `Notes: ${app.notes || '(none)'}`,
    `Report path: ${app.reportPath || '(none)'}`,
    '',
    '=== Evaluation report ===',
    ctx.reportBody,
    '',
    '=== cv.md ===',
    ctx.cv,
    '',
    '=== config/profile.yml ===',
    ctx.profileYml,
    '',
    '=== modes/_profile.md ===',
    ctx.profileMd,
    '',
    '=== article-digest.md (optional) ===',
    ctx.digest,
  ].join('\n');
}
