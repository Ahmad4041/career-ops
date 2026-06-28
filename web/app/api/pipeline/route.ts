import fs from 'fs';

import { parsePipelineMarkdown, resolvePipelineMdPath } from '@/lib/pipeline-parser';
import { getCareerOpsRoot } from '@/lib/root';

export async function GET() {
  const root = getCareerOpsRoot();
  const pipelinePath = resolvePipelineMdPath(root);
  const relPath = 'data/pipeline.md';

  if (!fs.existsSync(pipelinePath)) {
    return Response.json({
      careerOpsRoot: root,
      pipelinePath: relPath,
      missing: true,
      entries: [],
    });
  }

  try {
    const text = fs.readFileSync(pipelinePath, 'utf8');
    const entries = parsePipelineMarkdown(text);
    return Response.json({
      careerOpsRoot: root,
      pipelinePath: relPath,
      missing: false,
      entries,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json(
      { error: message, careerOpsRoot: root, pipelinePath: relPath, entries: [] },
      { status: 500 },
    );
  }
}
