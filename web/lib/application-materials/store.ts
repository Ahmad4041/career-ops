import fs from 'fs';
import path from 'path';

import { parseApplications } from '@/lib/applications-parser';
import type { ApplicationMaterials } from '@/lib/application-materials/types';
import { EMPTY_MATERIALS } from '@/lib/application-materials/types';

const DIR = 'data/application-materials';

export function materialsPath(root: string, applicationNumber: number): string {
  const n = Math.floor(applicationNumber);
  if (!Number.isFinite(n) || n < 1) throw new Error('Invalid application number');
  return path.join(root, DIR, `${n}.json`);
}

export function loadMaterials(
  root: string,
  applicationNumber: number,
  fallback: { company: string; role: string; reportPath: string },
): ApplicationMaterials {
  const fp = materialsPath(root, applicationNumber);
  if (!fs.existsSync(fp)) {
    return EMPTY_MATERIALS(applicationNumber, fallback.company, fallback.role, fallback.reportPath);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8')) as Partial<ApplicationMaterials>;
    return {
      ...EMPTY_MATERIALS(applicationNumber, fallback.company, fallback.role, fallback.reportPath),
      ...raw,
      applicationNumber,
      company: raw.company ?? fallback.company,
      role: raw.role ?? fallback.role,
      reportPath: raw.reportPath ?? fallback.reportPath,
      customQa: Array.isArray(raw.customQa) ? raw.customQa : [],
      summary: typeof raw.summary === 'string' ? raw.summary : '',
      coverLetter: typeof raw.coverLetter === 'string' ? raw.coverLetter : '',
      recruiterMessage: typeof raw.recruiterMessage === 'string' ? raw.recruiterMessage : '',
      customQuestionsInput:
        typeof raw.customQuestionsInput === 'string' ? raw.customQuestionsInput : '',
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    };
  } catch {
    return EMPTY_MATERIALS(applicationNumber, fallback.company, fallback.role, fallback.reportPath);
  }
}

export function saveMaterials(root: string, data: ApplicationMaterials): string {
  const dir = path.join(root, DIR);
  fs.mkdirSync(dir, { recursive: true });
  const fp = materialsPath(root, data.applicationNumber);
  const payload: ApplicationMaterials = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(fp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return path.relative(root, fp).replace(/\\/g, '/');
}

export function findApplicationRow(root: string, applicationNumber: number) {
  const { apps } = parseApplications(root);
  return apps.find((a) => a.number === applicationNumber) ?? null;
}
