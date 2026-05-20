import { describe, expect, it } from 'vitest';

import { parseMaterialJsonFromAgentOutput } from '@/lib/application-materials/parse-agent-output';

describe('parseMaterialJsonFromAgentOutput', () => {
  it('parses marked JSON block', () => {
    const out = parseMaterialJsonFromAgentOutput(
      'some chatter\n---MATERIAL_JSON---\n{"ok":true,"phase":"summary","text":"Hello"}\n---END_MATERIAL---\n',
    );
    expect(out.ok).toBe(true);
    expect(out.text).toBe('Hello');
  });

  it('parses last JSON line fallback', () => {
    const out = parseMaterialJsonFromAgentOutput('log\n{"ok":true,"phase":"coverLetter","text":"Dear team"}\n');
    expect(out.text).toBe('Dear team');
  });

  it('finds JSON block in stderr', () => {
    const out = parseMaterialJsonFromAgentOutput(
      'noise',
      'warn\n---MATERIAL_JSON---\n{"ok":true,"phase":"summary","text":"Hi"}\n---END_MATERIAL---\n',
    );
    expect(out.text).toBe('Hi');
  });
});
