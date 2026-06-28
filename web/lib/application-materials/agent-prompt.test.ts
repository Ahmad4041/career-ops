import { describe, expect, it } from 'vitest';

import { phaseTask } from '@/lib/application-materials/agent-prompt';

describe('phaseTask coverLetter salutation', () => {
  it('asks for body only when salutation is set', () => {
    const task = phaseTask('coverLetter', '', 'Dear Hiring Manager,');
    expect(task).toContain('Dear Hiring Manager,');
    expect(task).toMatch(/do not repeat the salutation/i);
  });

  it('asks for full letter when salutation is empty', () => {
    const task = phaseTask('coverLetter', '', '');
    expect(task).toMatch(/full cover letter/i);
    expect(task).not.toContain('salutation');
  });
});
