# Career Ops Web — UX & design roadmap

Prioritized plans for the Next.js dashboard (`web/`). Aligns with current code: **`web/app/page.tsx`** (~1200 lines) owns the Applications table, metrics, tabs, and job drawer.

---

## 1. Current audit (baseline)

| Area | What exists | Gap |
|------|-------------|-----|
| **Applications table** | Columns: #, Company, Role, Score, Status, PDF, CV artifacts (H/P/T), Report #, Posting link | No **search**, no **status filter**, no **user-controlled sort** (only implicit sort by score ↓) |
| **Sorting** | `[...data.applications].sort((a,b) => b.score - a.score)` | Cannot sort by date, company, status; **tie-breaking** undefined when scores equal |
| **Metrics** | Total, avg/top score, PDF count, “actionable”, “by status” chips | Chips are **display-only** — clicking a status does **not** filter the table |
| **Mobile / narrow** | `min-w-[960px]` table + horizontal scroll | Filters will need to sit **above** the table; consider stacked layout |
| **Design tokens** | `tailwind.config.ts`: surface, muted, accent, row, border; minimal `:root` in `globals.css` | No semantic tokens for **success/warning/danger** rows; emoji PDF column may not match rest of UI |
| **Accessibility** | Rows use `role="button"` + click | **aria-sort** missing; header cells not wired as sort buttons; keyboard-only flow for table is weak |
| **Settings** | Split HTML preview, LaTeX PDF compile | Already stronger than main table UX |

---

## 2. Phase A — Table filtering & search (high impact)

**Goal:** Find rows quickly without leaving the dashboard.

| Task | Detail |
|------|--------|
| **A1. Global text search** | Single input filtering `company`, `role`, `notes` (case-insensitive). Debounce ~200–300ms. Show “N of M rows”. |
| **A2. Status filter** | Multi-select or dropdown of canonical statuses (reuse `lib/tracker-states.ts` / same strings as `data/applications.md`). Optional “All”. |
| **A3. Wire metrics chips** | Clicking a “By status” chip sets the status filter to that value (and scrolls to table). |
| **A4. Clear filters** | One control resets search + status. |
| **A5. URL sync (optional)** | `?q=&status=` so refresh/share bookmark preserves view — nice-to-have after A1–A4. |

**Implementation notes:** Derive a `filteredApplications` memo from `data.applications` + filter state; **keep sort** as a separate memo applied after filter.

---

## 3. Phase B — Sorting (high impact)

**Goal:** User chooses column and direction; stable ties.

| Task | Detail |
|------|--------|
| **B1. Sort state** | `{ key: 'score' \| 'date' \| 'company' \| 'role' \| 'status' \| 'number', dir: 'asc' \| 'desc' }` |
| **B2. Clickable headers** | Only on sortable columns; `aria-sort="ascending|descending|none"` |
| **B3. Default** | Match today’s behavior: **score desc** on first load. |
| **B4. Tie-breakers** | e.g. score tie → `number` desc or `company` asc — **document in UI** tooltip (“Score · then #”). |
| **B5. Score parsing** | Sort uses numeric `row.score`; `scoreRaw` for display only. |

---

## 4. Phase C — Design & visual polish

**Goal:** Cohesive, scannable, professional — without redesigning everything at once.

| Task | Detail |
|------|--------|
| **C1. Table density** | Optional compact padding; zebra **or** subtle row hover only (avoid both heavy zebra + hover). |
| **C2. Status badges** | Pill component with **color coding** (muted Evaluated, warm Interview, green Offer, neutral Rejected) — reference `templates/states.yml` labels only. |
| **C3. Score column** | Align right; optional mini bar or color band for high scores (keep accessible — don’t rely on color alone). |
| **C4. PDF / CV columns** | Replace or supplement emoji with **icons** + `title` / `aria-label` (“PDF on disk”, “HTML in output”). |
| **C5. Posting column** | Show domain hostname instead of only “Link” when possible; keep stopPropagation on link click. |
| **C6. Empty filter state** | “No rows match filters” + reset CTA. |
| **C7. Typography** | Unify `text-xs` vs `text-sm` in table; use `font-mono` only for #, score, IDs. |

---

## 5. Phase D — Structure & maintainability

| Task | Detail |
|------|--------|
| **D1. Extract `ApplicationsTable`** | Props: rows, sort, onSortChange, filters, onRowOpen. |
| **D2. Extract `ApplicationsToolbar`** | Search + status + clear. |
| **D3. Types** | Move `AppRow`, `Payload` to `web/types/dashboard.ts` if imported from more than one file. |
| **D4. Tests (optional)** | Pure functions: `filterApplications`, `sortApplications` — easy unit tests without React. |

---

## 6. Phase E — Performance & scale

| Task | Detail |
|------|--------|
| **E1. Virtualization** | If `applications.length` > ~150, virtualize tbody (fixed row height helps). |
| **E2. Main bundle** | Lazy-load heavy modals if needed (`next/dynamic`). |

---

## 7. Suggested order of execution

1. **B + A together** — sort + filter compose cleanly (filtered → sorted).
2. **C1–C4** — quick wins once behavior is stable.
3. **Chip wiring (A3)** — bridges metrics and table.
4. **D** — refactor when behavior stops shifting.
5. **E** — when real data grows.

---

## 8. Out of scope (for later discussion)

- Server-side pagination (would need API changes beyond reading full tracker once).
- Editable grid inline (tracker edits today go through modal / PATCH).
- Dark/light theme toggle — would extend `globals.css` + stored preference.

---

## Related files

- `web/app/page.tsx` — main dashboard
- `web/lib/applications-parser.ts` — row shape / parsing
- `web/lib/tracker-states.ts` — canonical statuses
- `.cursor/skills/career-ops-frontend/SKILL.md` — agent UI/UX checklist
