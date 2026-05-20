import type { CareerApplication } from '@/lib/applications-parser';

/** Align with merge-tracker.mjs company normalization. */
export function normalizeCompanyKey(name: string): string {
  let s = name.trim().toLowerCase();
  const suffixes = [
    ' inc.',
    ' inc',
    ' llc',
    ' ltd',
    ' corp',
    ' corporation',
    ' technologies',
    ' technology',
    ' group',
    ' co.',
  ];
  for (const suf of suffixes) {
    if (s.endsWith(suf)) s = s.slice(0, -suf.length);
  }
  return s.replace(/[^a-z0-9]/g, '');
}

const ROLE_STOPWORDS = new Set([
  'junior', 'mid', 'middle', 'senior', 'staff', 'principal', 'lead', 'head',
  'chief', 'associate', 'intern', 'entry', 'level',
  'remote', 'hybrid', 'onsite', 'contract', 'contractor', 'freelance',
  'fulltime', 'parttime', 'permanent', 'temporary', 'internship',
  'role', 'position', 'opportunity', 'team', 'based',
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai',
  'london', 'berlin', 'paris', 'madrid', 'barcelona', 'amsterdam', 'dublin',
  'york', 'francisco', 'seattle', 'boston', 'austin', 'chicago', 'toronto',
  'tokyo', 'singapore', 'sydney', 'melbourne', 'lisbon', 'warsaw',
  'europe', 'emea', 'apac', 'latam', 'americas', 'india', 'spain', 'germany',
  'france', 'italy', 'canada', 'brazil', 'mexico', 'japan',
  'with', 'from', 'into', 'over', 'this', 'that',
]);

const SHORT_SPECIALTY = new Set([
  'api', 'sre', 'sdk', 'cli', 'gpu', 'cpu',
  'ios', 'qa', 'ux', 'ui', 'ar', 'vr',
  'ocr', 'crm', 'erp',
]);

const BASELINE_TOKENS = new Set([
  'software', 'engineer', 'developer', 'manager', 'architect',
  'analyst', 'designer', 'consultant', 'specialist',
  'platform', 'systems', 'services',
  'backend', 'frontend', 'fullstack',
]);

function roleTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => (w.length > 3 || SHORT_SPECIALTY.has(w)) && !ROLE_STOPWORDS.has(w));
}

/** Same fuzzy role match as merge-tracker.mjs */
export function rolesFuzzyMatch(a: string, b: string): boolean {
  const wordsA = roleTokens(a);
  const wordsB = roleTokens(b);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const setB = new Set(wordsB);
  const overlap = wordsA.filter((w) => setB.has(w));
  if (overlap.length < 2) return false;

  const discriminating = overlap.filter((w) => !BASELINE_TOKENS.has(w));
  if (discriminating.length === 0) return false;

  const minLen = Math.min(wordsA.length, wordsB.length);
  return overlap.length / minLen >= 0.5;
}

export type PostingProbe = { company: string; role: string; jobUrl?: string };

export function postingsMatch(a: PostingProbe, b: PostingProbe): boolean {
  if (normalizeCompanyKey(a.company) !== normalizeCompanyKey(b.company)) return false;
  if (rolesFuzzyMatch(a.role, b.role)) return true;
  const urlA = (a.jobUrl ?? '').trim();
  const urlB = (b.jobUrl ?? '').trim();
  return Boolean(urlA && urlB && urlA === urlB);
}

export function applicationsMatch(a: CareerApplication, b: CareerApplication): boolean {
  return postingsMatch(a, b);
}

/** Oldest tracker row with the same posting URL (exact match after trim). */
export function findDuplicateByUrl(
  apps: CareerApplication[],
  url: string,
): CareerApplication | null {
  const u = url.trim();
  if (!u) return null;
  const sorted = [...apps].sort((x, y) => x.number - y.number);
  for (const app of sorted) {
    if ((app.jobUrl ?? '').trim() === u) return app;
  }
  return null;
}

/** Oldest tracker row (# ascending) that matches company + role (or same posting URL). */
export function findCanonicalDuplicate(
  apps: CareerApplication[],
  opts: PostingProbe,
): CareerApplication | null {
  const sorted = [...apps].sort((x, y) => x.number - y.number);
  for (const app of sorted) {
    if (postingsMatch(app, opts)) return app;
  }
  return null;
}

/** Sets `duplicateOf` to the first (lowest #) matching row when this row is a later duplicate. */
export function annotateDuplicateLinks(apps: CareerApplication[]): void {
  const sorted = [...apps].sort((a, b) => a.number - b.number);
  for (const app of sorted) {
    app.duplicateOf = null;
    app.duplicateNote = null;
  }
  for (let i = 0; i < sorted.length; i++) {
    const app = sorted[i]!;
    for (let j = 0; j < i; j++) {
      const prior = sorted[j]!;
      if (applicationsMatch(app, prior)) {
        app.duplicateOf = prior.number;
        app.duplicateNote = `Same company/role as application #${prior.number} (${prior.company} — ${prior.role}).`;
        break;
      }
    }
  }
}
