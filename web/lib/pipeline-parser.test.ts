import { describe, expect, it } from 'vitest';

import { parsePipelineMarkdown } from '@/lib/pipeline-parser';

const SAMPLE = `# Pipeline inbox

## Pendientes

- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/co/jobs/456 | Acme Inc | Senior PM
- [!] https://private.example/job — Error: login required
- [x] https://old.example/done | OldCo | Role

## Procesadas
- [x] #1 | https://done.example/a | Co | Role | 4.0/5 | PDF ✅
`;

describe('parsePipelineMarkdown', () => {
  it('returns pending unchecked entries with optional source and notes', () => {
    const entries = parsePipelineMarkdown(SAMPLE);
    expect(entries).toHaveLength(3);

    expect(entries[0]).toEqual({
      url: 'https://jobs.example.com/posting/123',
      source: undefined,
      notes: undefined,
      line: 5,
    });

    expect(entries[1]).toEqual({
      url: 'https://boards.greenhouse.io/co/jobs/456',
      source: 'Acme Inc',
      notes: 'Senior PM',
      line: 6,
    });

    expect(entries[2]).toEqual({
      url: 'https://private.example/job',
      source: undefined,
      notes: 'Error: login required',
      line: 7,
    });
  });

  it('supports English section headers', () => {
    const text = `## Pending\n\n- [ ] https://a.example/1\n\n## Processed\n`;
    expect(parsePipelineMarkdown(text)).toEqual([
      { url: 'https://a.example/1', source: undefined, notes: undefined, line: 3 },
    ]);
  });

  it('accepts local: references', () => {
    const text = `## Pending\n\n- [ ] local:jds/role.md | Co | Role\n`;
    expect(parsePipelineMarkdown(text)[0]?.url).toBe('local:jds/role.md');
  });

  it('returns empty when no pending section', () => {
    expect(parsePipelineMarkdown('# Inbox\n\nNo sections')).toEqual([]);
  });
});
