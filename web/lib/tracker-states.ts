/**
 * Keep in sync with templates/states.yml (exact labels shown in applications.md).
 */

export const TRACKER_STATUS_LABELS = [
  'Evaluated',
  'Applied',
  'Responded',
  'Interview',
  'Offer',
  'Rejected',
  'Discarded',
  'SKIP',
] as const;

export type TrackerStatusLabel = (typeof TRACKER_STATUS_LABELS)[number];

/** Accept common variants and normalize to canonical tracker label */
export function normalizeStatusForPatch(raw: string): TrackerStatusLabel | null {
  const t = raw.trim();
  const set = new Set<string>(TRACKER_STATUS_LABELS);
  if (set.has(t)) return t as TrackerStatusLabel;
  const k = t.toLowerCase().replace(/\s+/g, ' ');
  const map: Record<string, TrackerStatusLabel> = {
    evaluated: 'Evaluated',
    evaluada: 'Evaluated',
    applied: 'Applied',
    aplicado: 'Applied',
    enviada: 'Applied',
    aplicada: 'Applied',
    sent: 'Applied',
    responded: 'Responded',
    respondido: 'Responded',
    interview: 'Interview',
    entrevista: 'Interview',
    offer: 'Offer',
    oferta: 'Offer',
    rejected: 'Rejected',
    rechazado: 'Rejected',
    rechazada: 'Rejected',
    discarded: 'Discarded',
    descartado: 'Discarded',
    descartada: 'Discarded',
    cerrada: 'Discarded',
    cancelada: 'Discarded',
    skip: 'SKIP',
    monitor: 'SKIP',
    'no aplicar': 'SKIP',
    no_aplicar: 'SKIP',
  };
  return map[k] ?? null;
}
