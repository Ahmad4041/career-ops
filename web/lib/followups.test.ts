import { describe, expect, it } from 'vitest';

import {
  daysOverdueLabel,
  followupsDueCount,
  isDueEntry,
  suggestedFollowupAction,
} from '@/lib/followups';
import type { FollowupEntry } from '@/types/followups';

function entry(partial: Partial<FollowupEntry> & Pick<FollowupEntry, 'status' | 'urgency'>): FollowupEntry {
  return {
    num: 1,
    date: '2026-05-01',
    appliedDate: '2026-05-01',
    company: 'Acme',
    role: 'Engineer',
    score: '4.0/5',
    notes: '',
    reportPath: null,
    contacts: [],
    daysSinceApplication: 10,
    daysSinceLastFollowup: null,
    followupCount: 0,
    nextFollowupDate: '2026-05-08',
    daysUntilNext: -2,
    ...partial,
  };
}

describe('followupsDueCount', () => {
  it('sums overdue and urgent', () => {
    expect(
      followupsDueCount({
        analysisDate: '2026-06-19',
        totalTracked: 10,
        actionable: 3,
        overdue: 2,
        urgent: 1,
        cold: 0,
        waiting: 0,
      }),
    ).toBe(3);
  });
});

describe('isDueEntry', () => {
  it('flags overdue and urgent', () => {
    expect(isDueEntry(entry({ urgency: 'overdue' }))).toBe(true);
    expect(isDueEntry(entry({ urgency: 'urgent' }))).toBe(true);
    expect(isDueEntry(entry({ urgency: 'waiting' }))).toBe(false);
  });
});

describe('daysOverdueLabel', () => {
  it('formats negative daysUntilNext', () => {
    expect(daysOverdueLabel(entry({ daysUntilNext: -1 }))).toBe('1 day overdue');
    expect(daysOverdueLabel(entry({ daysUntilNext: -5 }))).toBe('5 days overdue');
  });

  it('shows due now for urgent without negative offset', () => {
    expect(
      daysOverdueLabel(entry({ urgency: 'urgent', daysUntilNext: 0 })),
    ).toBe('Due now');
  });
});

describe('suggestedFollowupAction', () => {
  it('suggests first follow-up for applied overdue', () => {
    expect(
      suggestedFollowupAction(entry({ status: 'applied', urgency: 'overdue', followupCount: 0 })),
    ).toBe('Send first follow-up email');
  });

  it('suggests subsequent follow-up', () => {
    expect(
      suggestedFollowupAction(entry({ status: 'applied', urgency: 'overdue', followupCount: 1 })),
    ).toBe('Send follow-up #2');
  });

  it('handles responded urgent', () => {
    expect(
      suggestedFollowupAction(entry({ status: 'responded', urgency: 'urgent' })),
    ).toBe('Reply to their message today');
  });

  it('handles cold applied', () => {
    expect(
      suggestedFollowupAction(entry({ status: 'applied', urgency: 'cold', followupCount: 2 })),
    ).toBe('Max follow-ups reached — consider Discarded');
  });
});
