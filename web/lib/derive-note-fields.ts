/**
 * The tracker's Notes column is free-text, but evaluations write it with stable
 * conventions: work mode ("Remote US", "Charlotte NC (Hybrid)"), a pay range
 * ("$140-210K (POSTED)" / "~$150-220K (est)") and event dates ("Rejected
 * 2026-06-04"). These regexes lift that structure back out so the dashboard can
 * show Location / Pay / Last-contact columns without a tracker schema change.
 *
 * Port of dashboard/internal/data/derive.go
 */

const reMoneySpan =
  /~?\$\d[\d,]*(?:\.\d+)?[KkMm]?(?:\s*[-–]\s*\$?\d[\d,]*(?:\.\d+)?[KkMm]?)?/g;
const reISODate = /\b20\d{2}-\d{2}-\d{2}\b/g;
const reCityState =
  /\b([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,2}),? (A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/;
const reMoneyPart = /(\d[\d,]*(?:\.\d+)?)\s*([KkMm]?)/g;
const reEstHint = /\(est[),;. ]|\best\)|\bmarket\b/;

export type DeriveNoteFieldsInput = {
  role: string;
  notes: string;
  /** Applied date — fallback when notes contain no ISO dates */
  date?: string;
};

export type DerivedNoteFields = {
  location: string;
  payRange: string;
  lastContact: string;
  workMode: string;
  payMax: number;
  paySource: string;
};

/** Converts a matched pay span to its top dollar amount for sorting. */
export function payCeiling(span: string): number {
  let top = 0;
  for (const p of span.matchAll(reMoneyPart)) {
    const raw = p[1]?.replace(/,/g, '') ?? '';
    let v = parseFloat(raw);
    if (Number.isNaN(v)) continue;
    switch ((p[2] ?? '').toLowerCase()) {
      case 'k':
        v *= 1_000;
        break;
      case 'm':
        v *= 1_000_000;
        break;
    }
    if (v > top) top = v;
  }
  return top;
}

function firstMatch(re: RegExp, text: string): RegExpMatchArray | null {
  re.lastIndex = 0;
  return re.exec(text);
}

function allMatches(re: RegExp, text: string): string[] {
  re.lastIndex = 0;
  return [...text.matchAll(re)].map((m) => m[0]);
}

/** Populates location, pay, and last-contact from notes (+ role for work-mode / city fallback). */
export function deriveNoteFields(input: DeriveNoteFieldsInput): DerivedNoteFields {
  const { role, notes, date = '' } = input;
  const lower = `${role} ${notes}`.toLowerCase();

  let location = '';
  const notesCity = firstMatch(reCityState, notes);
  if (notesCity) {
    location = `${notesCity[1]}, ${notesCity[2]}`;
  } else {
    const roleCity = firstMatch(reCityState, role);
    if (roleCity) location = `${roleCity[1]}, ${roleCity[2]}`;
  }

  let workMode = '';
  if (lower.includes('hybrid')) {
    workMode = 'Hybrid';
  } else if (
    lower.includes('remote') &&
    (lower.includes('flex') || lower.includes('remote-first') || lower.includes('remote first'))
  ) {
    workMode = 'RemoteFlex';
  } else if (lower.includes('remote')) {
    workMode = 'Remote';
  } else if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('in-office')) {
    workMode = 'Full';
  } else if (location) {
    workMode = 'Full';
  }

  let payRange = '';
  const moneyMatches = allMatches(reMoneySpan, notes);
  for (const mm of moneyMatches) {
    if (/[-–]/.test(mm)) {
      payRange = mm;
      break;
    }
  }
  if (!payRange && moneyMatches.length > 0) {
    payRange = moneyMatches[0];
  }

  const payMax = payCeiling(payRange);
  let paySource = '';
  if (payRange) {
    if (lower.includes('(posted')) {
      paySource = 'POSTED';
    } else if (reEstHint.test(lower)) {
      paySource = 'est';
    }
  }

  let lastContact = date;
  for (const d of allMatches(reISODate, notes)) {
    if (d > lastContact) lastContact = d;
  }

  return { location, payRange, lastContact, workMode, payMax, paySource };
}
