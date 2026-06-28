# Web Dashboard — Sprint Map (Epic)

**Epic:** `WEB-EPIC-1` — Port upstream career-ops v1.12.0 features to Next.js dashboard  
**Baseline:** Local fork `web/` at v1.12.0 system layer (applied 2026-06-19)  
**Reference:** Go TUI `dashboard/`, root `FEATURES.md`, upstream changelog v1.8.0 → v1.12.0  
**Tracking:** GitHub Issues on `Ahmad4041/career-ops` (labels: `web`, `enhancement`) — import to Jira if needed

---

## Summary

| ID | Task | Priority | Upstream ref | Status |
|----|------|----------|--------------|--------|
| WEB-1 | Customizable columns + column picker | P0 | [#979](https://github.com/santifer/career-ops/pull/979) | **Done** |
| WEB-2 | Derive Location / Pay / Last contact from notes | P0 | `dashboard/internal/data/derive.go` | **Done** |
| WEB-3 | Batch runner progress UI (`--status` / `--watch`) | P1 | [#922](https://github.com/santifer/career-ops/pull/922) | **Done** |
| WEB-4 | Verify portals nav command + API | P1 | [#1016](https://github.com/santifer/career-ops/pull/1016) | **Done** |
| WEB-5 | Settings: `voice-dna.md` editor | P2 | [#998](https://github.com/santifer/career-ops/pull/998) | **Done** |
| WEB-6 | Cover letter salutation field (materials) | P2 | [#1010](https://github.com/santifer/career-ops/pull/1010) | **Done** |
| WEB-7 | Batch model selector (`--model`) in UI | P2 | batch-runner.sh | **Done** |
| WEB-8 | Language modes picker (zh/tr/de/fr/ja) in Settings | P2 | [#934](https://github.com/santifer/career-ops/pull/934) | **Done** |
| WEB-9 | Pipeline inbox tab (`data/pipeline.md`) | P2 | Go TUI pipeline | **Done** |
| WEB-10 | Follow-up cadence panel | P3 | followup-cadence.mjs | **Done** |
| WEB-11 | Fix missing `verify-portals.mjs` after system update | P1 | update-system | **Done** |
| WEB-12 | Antigravity CLI in job provider list | P3 | v1.12.0 cli | **Done** |

---

## WEB-1 — Customizable columns + column picker

**Type:** Story · **Points:** 8 · **Priority:** P0

### Description

Port Go TUI pipeline column picker ([upstream #979](https://github.com/santifer/career-ops/pull/979)) to the Applications table. Users toggle optional columns; choices persist in `localStorage`.

### Acceptance criteria

- [ ] Toolbar **Columns** button opens a popover/dropsheet listing optional columns with checkboxes
- [ ] Optional columns: **Date**, **Location**, **Pay**, **Report** (✓/—), **PDF** (✓/—), **Last contact** — defaults match TUI (`Date/Location/Pay` on; Report/PDF/Last off)
- [ ] Fixed columns always visible: **#**, **Company**, **Role**, **Score**, **Status**, **CV**, **Posting**
- [ ] Visibility persisted (`careerOpsTableColumns` in localStorage); survives refresh
- [ ] Virtualized table colgroup/headers/rows stay aligned when columns change
- [ ] Keyboard: no conflict with `/` search focus
- [ ] Unit tests for column persistence helpers

### Files

- `web/lib/table-columns.ts` (new)
- `web/components/applications-column-picker.tsx` (new)
- `web/components/applications-table.tsx`
- `web/components/applications-table-row.tsx`
- `web/components/applications-toolbar.tsx`
- `web/app/page.tsx`

---

## WEB-2 — Derive Location / Pay / Last contact from notes

**Type:** Story · **Points:** 5 · **Priority:** P0 · **Depends:** WEB-1

### Description

Port `dashboard/internal/data/derive.go` regex logic to TypeScript so Location, Pay range, and Last contact columns populate from tracker `notes` + `role` without schema changes.

### Acceptance criteria

- [ ] `lib/derive-note-fields.ts` mirrors Go: city/state, pay ceiling, ISO last-contact date
- [ ] Parser or API enriches `AppRow` with `location`, `payRange`, `lastContact`
- [ ] Columns render `—` when derivation empty
- [ ] Vitest fixtures from real tracker note samples

---

## WEB-3 — Batch runner progress UI

**Type:** Story · **Points:** 5 · **Priority:** P1

### Description

Expose `batch/batch-runner.sh --status` and `--watch` in the dashboard (nav or job drawer).

### Acceptance criteria

- [ ] `POST /api/run` accepts `batch-runner-status`, `batch-runner-watch`
- [ ] Nav buttons with confirm for watch mode
- [ ] Output streams to job drawer or inline panel
- [ ] Document in `FEATURES.md`

---

## WEB-4 — Verify portals

**Type:** Story · **Points:** 3 · **Priority:** P1 · **Depends:** WEB-11

### Description

Wire `verify-portals.mjs` — ATS slug validator for `portals.yml`.

### Acceptance criteria

- [ ] Nav action **Verify portals**
- [ ] `POST /api/run` cmd `verify-portals`
- [ ] Results shown in Output tab or job logs

---

## WEB-5 — voice-dna.md in Settings

**Type:** Story · **Points:** 2 · **Priority:** P2

Add `voice-dna.md` to settings allowlist (user layer per `DATA_CONTRACT.md`).

---

## WEB-6 — Cover letter salutation

**Type:** Story · **Points:** 3 · **Priority:** P2

Add optional salutation/greeting field to application materials panel; pass through to generator.

---

## WEB-7 — Batch model selector

**Type:** Story · **Points:** 2 · **Priority:** P2

UI to pass `--model` to batch-runner (dropdown or text input in queue modal / nav).

---

## WEB-8 — Language modes picker

**Type:** Story · **Points:** 3 · **Priority:** P2

Settings helper for `language.modes_dir` in `config/profile.yml` (en, de, fr, ja, tr, zh).

---

## WEB-9 — Pipeline inbox tab

**Type:** Story · **Points:** 8 · **Priority:** P2

New tab listing `data/pipeline.md` URLs with evaluate actions (parity with CLI pipeline mode).

---

## WEB-10 — Follow-up cadence panel

**Type:** Story · **Points:** 5 · **Priority:** P3

Surface `followup-cadence.mjs` JSON in UI — overdue follow-ups, suggested dates.

---

## WEB-11 — Fix verify-portals.mjs materialization

**Type:** Bug · **Points:** 1 · **Priority:** P1

Cherry-pick / checkout `verify-portals.mjs` from upstream; confirm `node verify-portals.mjs` runs.

---

## WEB-12 — Antigravity CLI provider

**Type:** Story · **Points:** 2 · **Priority:** P3

Add Antigravity to CLI open / job provider resolution if binary on PATH.

---

## Execution order

1. **WEB-1** → **WEB-2** (column UI then derived data)
2. **WEB-11** → **WEB-4** (script then nav)
3. **WEB-3**, **WEB-5**, **WEB-6**, **WEB-7**, **WEB-8**
4. **WEB-9**, **WEB-10**, **WEB-12**

---

## Jira import (copy-paste)

```
Epic: WEB-EPIC-1 — Port career-ops v1.12 upstream features to Next.js web dashboard
Sprint: Web parity sprint 1

Stories: WEB-1 … WEB-12 (see table above)
Labels: web, career-ops, dashboard
Component: web/
```
