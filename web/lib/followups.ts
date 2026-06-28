import type { FollowupEntry, FollowupsMetadata } from '@/types/followups';

/** Count of entries needing attention (overdue + urgent). */
export function followupsDueCount(metadata: FollowupsMetadata): number {
  return metadata.overdue + metadata.urgent;
}

export function isDueEntry(entry: FollowupEntry): boolean {
  return entry.urgency === 'overdue' || entry.urgency === 'urgent';
}

/** Human-readable overdue label; null when not applicable. */
export function daysOverdueLabel(entry: FollowupEntry): string | null {
  if (entry.daysUntilNext != null && entry.daysUntilNext < 0) {
    const days = -entry.daysUntilNext;
    return days === 1 ? '1 day overdue' : `${days} days overdue`;
  }
  if (entry.urgency === 'urgent') return 'Due now';
  return null;
}

/** Suggested next action from cadence entry fields. */
export function suggestedFollowupAction(entry: FollowupEntry): string {
  const { status, urgency, followupCount } = entry;

  if (urgency === 'cold') {
    return 'Max follow-ups reached — consider Discarded';
  }

  if (status === 'applied') {
    if (followupCount === 0) return 'Send first follow-up email';
    return `Send follow-up #${followupCount + 1}`;
  }

  if (status === 'responded') {
    if (urgency === 'urgent') return 'Reply to their message today';
    if (urgency === 'overdue') return 'Chase for next steps';
    return 'Waiting for response';
  }

  if (status === 'interview') {
    if (urgency === 'overdue') return 'Send thank-you note';
    return 'Send thank-you within 24h';
  }

  return 'Follow up';
}
