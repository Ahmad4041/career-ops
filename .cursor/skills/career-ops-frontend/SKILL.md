---
name: career-ops-frontend
description: >-
  UI/UX standards for the career-ops Next.js dashboard (web/). Covers Tailwind
  tokens, layout (nav / main / drawer), applications table patterns,
  accessibility, loading and error states, and when to extract components from
  app/page.tsx. Use when editing web/app, web/components, or tailwind config;
  when the user asks for dashboard UI, filters, sorting, tables, or polish; or
  when improving Customize/settings or modals.
---

# Career Ops — Frontend UI/UX

## Stack (do not fight it)

- **Next.js App Router**, client islands (`'use client'`) where state lives.
- **Tailwind** — extend tokens in `web/tailwind.config.ts`; avoid one-off hex except rare accents.
- **Fonts**: `Inter` + `JetBrains Mono` via `layout.tsx` CSS variables (`--font-geist-sans`, `--font-geist-mono`).
- **Repo root**: APIs use `CAREER_OPS_ROOT`; UI never assumes paths client-side except via API responses.

## Design tokens (use consistently)

| Token | Role |
|-------|------|
| `bg-surface` | Page background |
| `text-[var(--fg)]` / `text-white` | Primary text |
| `text-muted` | Secondary / labels |
| `text-accent` | Links, key numbers, focus hints |
| `bg-row` | Panels, table header, nav rows |
| `border-border` | Dividers, cards |

`:root` in `globals.css` sets `--bg`, `--fg`; prefer Tailwind theme colors for surfaces.

## Layout patterns

- **Three-zone shell**: left nav (repo actions), center (tabs: Applications / Output / Upstream), right drawer (job queue). Preserve `min-h-0` + `overflow` chains so scroll regions don’t trap focus incorrectly.
- **Settings**: file tree + editor; HTML templates use split preview — keep loading/error lines visible.

## Tables (Applications tracker)

**Behavior** (see `applications-table-query.ts`, `applications-url-query.ts`, `app/page.tsx`): debounced text search (company, role, notes), status filter (dropdown + **By status** chips), column sort with `aria-sort`, URL sync (`q`, `status`, `sort`, `dir`) via `useSearchParams` + `router.replace`, empty state when no matches. While the search box is ahead of the debounced value, only status/sort hydrate from the URL (avoids clobbering typing). **Vim-style `/`** (when focus is not in a form field) focuses the search input — parity with the Go TUI pipeline screen ([santifer/career-ops#526](https://github.com/santifer/career-ops/pull/526)). **Escape** in the search field clears the committed text query only.

**Visuals:** status chips + table column use **`tracker-status-badge.tsx`** (`TrackerStatusBadge`, `trackerStatusToneClass`) — keep tones muted and WCAG-friendly; posting links show hostname (`tracker-table-helpers.ts`). Table UI lives in **`applications-table.tsx`** (virtualized tbody via **`@tanstack/react-virtual`** + **`applications-table-row.tsx`**), **`applications-toolbar.tsx`**, **`applications-status-chips.tsx`**; density uses **`table-density.ts`** (`Comfortable` / `Compact`, localStorage). Query logic tests: **`npm run test`** → `lib/applications-table-query.test.ts`.

When extending tables:

1. **Sort**: clickable `<th>` with `aria-sort`, toggle asc/desc; default sort explicit in UI (“Sorted by score · high to low”).
2. **Filter**: debounced search (company, role, notes); optional status multi-select aligned with `templates/states.yml` / server metrics.
3. **Density**: compact vs comfortable toggle if row count grows.
4. **a11y**: `<table>` with real `<th scope="col">`; row click keeps **Enter** activation; don’t rely on `role="button"` on `<tr>` without keyboard story — prefer explicit “Open” or link column if semantics get muddy.
5. **Performance**: >100 rows → consider virtualization (`@tanstack/react-virtual` or similar); don’t block first paint.

## Interaction & feedback

- **Loading**: disable destructive doubles; show inline “Refreshing…” on nav actions that call `load()`.
- **Errors**: banner at top of main (`loadErr` pattern), not only `alert`.
- **Empty**: distinguish “no data” vs “tracker missing” (API already surfaces `error` on payload).
- **Touch**: hit targets ≥44px where possible on mobile; table horizontal scroll is OK but expose filter above fold.

## Component hygiene

- **Extract** from `page.tsx` when a block exceeds ~80 lines or repeats: `ApplicationsTable`, `MetricsStrip`, `MainTabs`, etc. Keep API types (`AppRow`, `Payload`) in `web/types/` if shared.
- **Modals** (`application-detail-modal`, `report-viewer-modal`, `queue-job-modal`): fixed overlay, backdrop click + **`Escape`** (`web/lib/use-escape-close.ts`), `aria-modal` on the dialog panel; avoid full-screen **`backdrop-blur`** (scroll jank). **Report** Markdown preview: width-aware tables (`table-fixed`, `break-words`, horizontal scroll) — parity with Go viewer [#513](https://github.com/santifer/career-ops/pull/513).

## Anti-patterns

- Hardcoding career-ops paths in components — use props or API.
- New color stops outside `tailwind.config.ts` without adding a named token.
- Client-side-only “security” — dashboard is localhost tooling; still avoid `dangerouslySetInnerHTML` unless sanitized.

## Quick checklist before shipping UI

- [ ] Focus visible on interactive controls
- [ ] Works at `md` breakpoint (nav collapses width)
- [ ] No layout shift when async data arrives
- [ ] Strings for screen readers on icon-only controls (`aria-label`)

## See also

- `web/FEATURES.md` — full feature guide (applications, **generate PDF**, scan, jobs, settings)
- `web/UX-ROADMAP.md` — prioritized table, filter, and visual improvements
- `web/README.md` — API routes used by the dashboard
