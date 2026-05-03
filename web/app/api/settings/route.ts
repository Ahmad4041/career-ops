import fs from 'fs';
import path from 'path';

import { EDITABLE_SETTINGS_FILES } from '@/lib/settings-allowlist';
import { getCareerOpsRoot } from '@/lib/root';

export async function GET() {
  const root = getCareerOpsRoot();
  const files = EDITABLE_SETTINGS_FILES.map((m) => {
    const abs = path.join(root, ...m.path.split('/'));
    let exists = false;
    try {
      exists = fs.existsSync(abs);
    } catch {
      /* ignore */
    }
    return {
      path: m.path,
      label: m.label,
      group: m.group,
      description: m.description,
      systemTemplate: Boolean(m.systemTemplate),
      exists,
    };
  });

  return Response.json({ careerOpsRoot: root, files });
}
