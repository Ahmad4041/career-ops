# Career Ops Web — UX & design roadmap

Prioritized plans for the Next.js dashboard (`web/`). Aligns with current code: **`web/app/page.tsx`** (~1200 lines) owns the Applications table, metrics, tabs, and job drawer.

---

## 1. Current audit (baseline)

| Area | What exists | Gap |
|------|-------------|-----|
| **Applications table** | Columns: #, **Date**, Company, Role, Score, Status, PDF, CV, Report, Posting | Search + status filter + column sort implemented (`applications-table-query.ts`) |
| **Sorting** | User-controlled via headers; default score ↓ | — |
| **Metrics** | Total, avg/top score, PDF count, “actionable”, “by status” chips | Chips **toggle** filter for that normalized status (click again to clear) |
| **Mobile / narrow** | `min-w-[960px]` table + horizontal scroll | Filters will need to sit **above** the table; consider stacked layout |
| **Design tokens** | `tailwind.config.ts`: surface, muted, accent, row, border; minimal `:root` in `globals.css` | No semantic tokens for **success/warning/danger** rows; PDF column uses icon + `aria-label` (not emoji text) |
| **Accessibility** | Sortable `<th>` use `aria-sort` when active; row open on Enter; **Escape** closes modals (`useEscapeClose`); dialogs use `aria-modal`; **`/`** focuses applications search when not typing in a field (parity with Go TUI #526); **Escape** in search clears text query | Full keyboard sort nav / roving tabindex still optional |
| **Settings** | Split HTML preview, LaTeX PDF compile | Already stronger than main table UX |

---

## 2. Phase A — Table filtering & search (high impact)

**Status:** **A1–A5 implemented** — query params **`q`**, **`status`**, **`sort`**, **`dir`** sync with `router.replace` (bookmarkable). Default sort (`score`/`desc`) is omitted from the URL to keep links short.

**Goal:** Find rows quickly without leaving the dashboard.

| Task | Detail |
|------|--------|
| **A1. Global text search** | Single input filtering `company`, `role`, `notes` (case-insensitive). Debounce ~200–300ms. Show “N of M rows”. |
| **A2. Status filter** | Multi-select or dropdown of canonical statuses (reuse `lib/tracker-states.ts` / same strings as `data/applications.md`). Optional “All”. |
| **A3. Wire metrics chips** | Clicking a “By status” chip sets the status filter to that value (and scrolls to table). |
| **A4. Clear filters** | One control resets search + status. |
| **A5. URL sync** | `?q=&status=&sort=&dir=` — see `web/lib/applications-url-query.ts`; dashboard wrapped in `<Suspense>` for `useSearchParams`. |

**Implementation notes:** `web/lib/applications-table-query.ts` — filter uses `normalizeStatus()` for status keys (matches metrics chips). Sort runs after filter.

---

## 3. Phase B — Sorting (high impact)

**Status:** **B1–B5 implemented** — sortable headers for `#`, Date, Company, Role, Score, Status; default **score · desc**; ties break by **# ascending** (see toolbar hint).

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

**Status:** **C1–C7 done** — **Comfortable / Compact** row density (`web/lib/table-density.ts`, persisted as `localStorage` key `careerOpsTableDensity`). Same polish as before (`tracker-status-badge.tsx`, aligned score, Output column, hostnames).

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

**Status:** **D1–D3 largely done** — `ApplicationsTable`, `ApplicationsToolbar`, `ApplicationsStatusChips`, `SortHeader`; shared types in `web/types/dashboard.ts` (`AppRow`, `TrackerPayload`); helpers in `tracker-table-helpers.ts`.

| Task | Detail |
|------|--------|
| **D1. Extract `ApplicationsTable`** | Props: rows, sort, onSortChange, filters, onRowOpen. |
| **D2. Extract `ApplicationsToolbar`** | Search + status + clear. |
| **D3. Types** | Move `AppRow`, `Payload` to `web/types/dashboard.ts` if imported from more than one file. |
| **D4. Tests (optional)** | **Done** — `web/lib/applications-table-query.test.ts` (`npm run test` in `web/`). |

---

## 6. Phase E — Performance & scale

**Status:** **E1–E2 done** — `@tanstack/react-virtual` in `applications-table.tsx`; scroll container `max-h-[min(70vh,640px)]`; fixed row height (~54px comfortable / ~42px compact). Spacer rows above/below visible window. **`ApplicationDetailModal`**, **`ReportViewerModal`**, and **`QueueJobModal`** are loaded with **`next/dynamic`** in `web/app/page.tsx` (type-only import for `AppRowLite`).

| Task | Detail |
|------|--------|
| **E1. Virtualization** | If `applications.length` > ~150, virtualize tbody (fixed row height helps). |
| **E2. Main bundle** | Lazy-load heavy modals if needed (`next/dynamic`). |

---

## 7. Suggested order of execution

1. **Done:** **A–E** (including virtualization, lazy modals, Vitest for query helpers).

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
