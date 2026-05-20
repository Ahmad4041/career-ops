import { describe, expect, it } from 'vitest';

import { formatAgentRunFailure } from '@/lib/application-materials/run-agent';

describe('formatAgentRunFailure', () => {
  it('surfaces Claude usage limit from stdout', () => {
    const msg = formatAgentRunFailure(
      {
        code: 1,
        stdout: "You're out of extra usage · resets 5:10am (Australia/Melbourne)\n",
        stderr:
          'Warning: no stdin data received in 3s, proceeding without it.\n',
      },
      'claude',
    );
    expect(msg).toContain('usage limit');
    expect(msg).toContain('Cursor');
  });
});
