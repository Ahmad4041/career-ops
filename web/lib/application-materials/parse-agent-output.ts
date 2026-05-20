export type ParsedMaterialResult = {
  ok: boolean;
  phase?: string;
  text?: string;
  items?: { question: string; answer: string }[];
  error?: string;
};

export function parseMaterialJsonFromAgentOutput(stdout: string, stderr = ''): ParsedMaterialResult {
  const combined = `${stdout}\n${stderr}`;
  const block = combined.match(/---MATERIAL_JSON---\s*([\s\S]*?)\s*---END_MATERIAL---/);
  const raw = block?.[1]?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ParsedMaterialResult;
    } catch {
      /* try fallback */
    }
  }

  const lines = combined.trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim();
    if (!line.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(line) as ParsedMaterialResult;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* continue */
    }
  }

  const arrMatch = combined.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const items = JSON.parse(arrMatch[0]) as { question: string; answer: string }[];
      return { ok: true, phase: 'customQuestions', items };
    } catch {
      /* ignore */
    }
  }

  return {
    ok: false,
    error: 'Agent did not emit ---MATERIAL_JSON--- … ---END_MATERIAL---. Check CLI logs.',
  };
}
