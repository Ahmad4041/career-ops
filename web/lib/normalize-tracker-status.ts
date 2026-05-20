/**
 * Client-safe status normalization (mirrors `computeMetrics` / chip keys).
 * Kept separate from `applications-parser.ts` so the dashboard bundle does not pull `fs`.
 */
export function normalizeStatus(raw: string): string {
  let s = raw.replace(/\*\*/g, '').trim().toLowerCase();
  const dateIdx = s.search(/\s202\d/);
  if (dateIdx > 0) s = s.slice(0, dateIdx).trim();

  if (s.includes('no aplicar') || s.includes('no_aplicar') || s === 'skip' || s.includes('geo blocker'))
    return 'skip';
  if (s.includes('interview') || s.includes('entrevista')) return 'interview';
  if (s === 'offer' || s.includes('oferta')) return 'offer';
  if (s.includes('responded') || s.includes('respondido')) return 'responded';
  if (s.includes('applied') || s.includes('aplicado') || s === 'enviada' || s === 'aplicada' || s === 'sent')
    return 'applied';
  if (s.includes('rejected') || s.includes('rechazado') || s === 'rechazada') return 'rejected';
  if (
    s.includes('discarded') ||
    s.includes('descartado') ||
    s === 'descartada' ||
    s === 'cerrada' ||
    s === 'cancelada' ||
    s.startsWith('duplicado') ||
    s.startsWith('dup')
  )
    return 'discarded';
  if (
    s.includes('evaluated') ||
    s.includes('evaluada') ||
    s === 'condicional' ||
    s === 'hold' ||
    s === 'monitor' ||
    s === 'evaluar' ||
    s === 'verificar'
  )
    return 'evaluated';
  return s;
}
