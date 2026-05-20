# Career Ops Web — Feature guide

Next.js dashboard on top of your local **career-ops** repo (`CAREER_OPS_ROOT`, usually the parent of `web/`). Upstream [santifer/career-ops](https://github.com/santifer/career-ops) ships a **Go TUI** under `dashboard/`; this `web/` app is **fork-only** and does not replace it.

```bash
cd web && npm install && npm run dev
# → http://localhost:3100
```

See also: [`README.md`](README.md) (API table), [`UX-ROADMAP.md`](UX-ROADMAP.md) (UX phases), [`.cursor/skills/career-ops-frontend/SKILL.md`](../.cursor/skills/career-ops-frontend/SKILL.md) (agent UI rules).

---

## 1. Applications table

**Goal:** Find and open tracker rows quickly.

| UI | File |
|----|------|
| Page shell, metrics, tabs | `app/page.tsx` |
| Search, status, company, density | `components/applications-toolbar.tsx` |
| Status chips (toggle filter) | `components/applications-status-chips.tsx` |
| Virtualized table | `components/applications-table.tsx` |
| Row cells | `components/applications-table-row.tsx` |
| Sort headers | `components/sort-header.tsx` |
| Status pills | `components/tracker-status-badge.tsx` |

| Logic | File |
|-------|------|
| Filter + sort | `lib/applications-table-query.ts` |
| URL `?q=&status=&company=&sort=&dir=` | `lib/applications-url-query.ts` |
| Duplicate row links (same company/role/URL) | `lib/tracker-duplicate-match.ts` |
| Density (localStorage) | `lib/table-density.ts` |
| Parse tracker | `lib/applications-parser.ts` |

**API:** `GET /api/applications` → reads `data/applications.md`, annotates later duplicates with `duplicateOf` → lowest matching `#`.

**Filters:** Text search (company/role/notes), status chips, **company dropdown** (normalized name key), sortable headers. Bookmark via URL.

**Duplicates:** Rows that match an earlier application (merge-tracker rules) show **↩ same as #N**; click opens the original row. Evaluate on an existing posting URL still queues the job; logs note the canonical `#` and you can re-run.

**Scroll:** Virtual rows use fixed height + padding rows in one `<table>` (no per-row absolute layers) to avoid column drift while scrolling.

**Keyboard (Applications tab):**

- **`/`** — focus search (skipped when cursor is already in an input).
- **Escape** in search — clear text query only (status filter unchanged).
- **Enter** on row — open application modal.

---

## 2. Application detail modal

**Goal:** Edit tracker row, view report, manage tailored CV artifacts.

| UI | File |
|----|------|
| Modal | `components/application-detail-modal.tsx` |
| Escape close | `lib/use-escape-close.ts` |
| Lazy import | `dynamic()` in `app/page.tsx` |

| API | Purpose |
|-----|---------|
| `PATCH /api/applications` | Update `status` / `notes` on row `{ applicationNumber }` |
| `GET /api/cv/assets?reportPath=reports/…md` | Best HTML / PDF / `.tex` in `output/` for report slug |
| `GET /api/report/[...path]` | Report markdown for viewer |
| `GET /api/output/file?name=…` | Download or inline (`inline=1` for iframe) |

**Actions in modal:** Save tracker row · View report · Download PDF (if matched) · CV section below.

---

## 3. Generate PDF (HTML → Playwright)

This is the main path to produce a **tailored CV PDF** from your HTML templates and `cv.md` + `config/profile.yml`.

### Prerequisites (repo root)

| Requirement | Check |
|-------------|--------|
| `cv.md` | Exists |
| `config/profile.yml` | Exists (slug used in output filenames) |
| `templates/*.html` | At least one template (e.g. `templates/cv-template.html`) |
| Playwright Chromium | `npx playwright install chromium` (from repo root or `web/`) |

Scripts (repo root, invoked by the API):

1. `render-cv-html-from-template.mjs` — fill template from CV + profile  
2. `generate-pdf.mjs` — HTML → PDF via Playwright  

### In the dashboard (recommended)

1. Open **Applications** → click a row (needs a **report** linked for slug-based naming).  
2. Scroll to **Tailored CV PDF (HTML → Playwright)**.  
3. **Refresh list** — reloads `templates/*.html` after you add or edit files on disk.  
4. Pick **HTML template** and **Paper** (A4 or US Letter).  
5. Optional: **Render HTML** — fast step only; writes `output/cv-{slug}-{report-or-cv}-{date}.html` (no Playwright).  
6. **Generate PDF** — full pipeline; writes `output/cv-{slug}-{report-or-cv}-{date}.pdf`.  
7. **Linked tailored CV** refreshes — preview iframe, **Download PDF**, open HTML / `.tex` if present.

### API

**`POST /api/pdf/generate-from-template`**

```json
{
  "templatePath": "templates/cv-template.html",
  "format": "a4",
  "reportPath": "reports/014-acme-co-2026-05-03.md",
  "outputSlug": "optional-override-from-profile-slug",
  "renderOnly": false
}
```

| Field | Meaning |
|-------|---------|
| `templatePath` | Required. `templates/<name>.html` only (no `..`). |
| `format` | `"a4"` (default) or `"letter"`. |
| `reportPath` | Optional. `reports/NNN-company-YYYY-MM-DD.md` — used in output filename stem. |
| `outputSlug` | Optional. Overrides candidate slug from `config/profile.yml`. |
| `renderOnly` | `true` = HTML only (step 1). Omit or `false` = HTML + PDF (steps 1–2). |

**Success (full PDF):** `{ ok: true, pdfPath, downloadUrl: "/api/pdf/download-rendered?name=…" }`  

**Success (HTML only):** `{ ok: true, renderOnly: true, htmlPath, downloadUrl: "/api/output/file?name=…" }`  

**Failure:** `{ ok: false, error, phases[] }` — check `phases` for `render-html` / `generate-pdf` stderr (often missing Chromium).

**Related routes:**

| Route | Role |
|-------|------|
| `GET /api/pdf/templates` | List `templates/*.html` for dropdown |
| `GET /api/pdf/download-rendered?name=cv-….pdf` | Download just-generated PDF |
| `GET /api/pdf/lookup?reportPath=…` | Whether a PDF matches report slug |
| `GET /api/pdf/download?reportPath=…` | Stream matched PDF |

**Matching logic:** `lib/artifacts-for-report.ts`, `lib/pdf-for-report.ts` — scores files in `output/` by report slug, number, and date.

### CLI (same pipeline, no dashboard)

```bash
cd "$CAREER_OPS_ROOT"

# Render HTML
node render-cv-html-from-template.mjs --format=a4 templates/cv-template.html output/tmp.html

# PDF (Playwright)
node generate-pdf.mjs output/tmp.html "output/cv-your-slug-company-$(date +%Y-%m-%d).pdf" --format=a4
```

The modal’s **Copy sample generate-pdf shell line** builds a similar command for the open row’s report slug.

### LaTeX alternative

**Generate .tex (+ PDF when compiler OK)** in the same modal uses:

- `POST /api/tex/generate-from-template` → `render-cv-tex-from-template.mjs` + `generate-latex.mjs`  
- Requires **tectonic** or **pdflatex** on the machine running `npm run dev`.

### Settings: preview without saving template

**Settings & templates** (`/settings`) → HTML editor → live preview via `POST /api/template-preview/render` (does not write PDF until you save and use **Generate PDF** on an application row).

### Troubleshooting PDF generation

| Symptom | Fix |
|---------|-----|
| `generate-pdf.mjs failed` | Run `npx playwright install chromium` |
| `Missing prerequisite: cv.md` | Add CV at repo root |
| Template not in dropdown | **Refresh list**; file must be `templates/*.html` |
| No preview after generate | Filename must match report slug rules; click row with `reportPath` set |
| Slow | Normal for Playwright; use **Render HTML** first to validate layout |

---

## 4. Report viewer

| UI | `components/report-viewer-modal.tsx` |
| API | `GET /api/report/[...path]` |

Preview / Markdown toggle; tables wrap on narrow viewports. **Escape** or backdrop closes.

---

## 5. Left nav — repo commands

**API:** `POST /api/run` with `{ "cmd": "…" }` — see `app/api/run/route.ts`.

| `cmd` | Script |
|-------|--------|
| `scan` | `scan.mjs` |
| `scan-verify` | `scan.mjs --verify` (Playwright; drops expired postings) |
| `verify` | `verify-pipeline.mjs` |
| `merge` | `merge-tracker.mjs` |
| `doctor` | `doctor.mjs` |
| `batch-runner-dry-run` | `batch/batch-runner.sh --dry-run` |
| `batch-runner` | `batch/batch-runner.sh` (confirm in UI) |

Also: **Open Cursor** / **Open Claude Code** → `POST /api/cli/open`.

---

## 6. Job queue (right drawer)

| API | Role |
|-----|------|
| `GET /api/jobs` | List recent jobs |
| `POST /api/jobs` | Enqueue Claude / Cursor / node task |
| `GET /api/jobs/:id/stream` | SSE log stream |

Workers: `lib/jobs/run-claude-job.ts`, `run-cursor-job.ts`, `run-node-job.ts`.

**Confirm before start:** Default is **bypass** (no browser popup). In **Settings → Dashboard → Job queue**, choose **Ask before starting** to restore `window.confirm` for Cursor agent, Claude evaluate, and node queue tasks. Preference: `lib/dashboard-prefs.ts` (`localStorage` key `careerOpsJobQueueConfirm`).

**Evaluate job → Applications table:** Headless evaluation writes a report + `batch/tracker-additions/*.tsv`. The job runner then runs **`merge-tracker.mjs`** automatically so `data/applications.md` updates. On success the dashboard **reloads the tracker**, **clears filters**, and switches to the **Applications** tab (also polled every 8s if SSE drops).

**Portal scan** (`portal_scan`) only updates **`data/pipeline.md`** — new URLs do not appear in the Applications table until you **evaluate** them.

---

## 7. Settings (`/settings`)

**Dashboard panel (browser-only):** Job queue confirm mode (bypass vs ask) — see §6.

Edit allowlisted paths (`cv.md`, `config/profile.yml`, `portals.yml`, `modes/_profile.md`, templates).  

**Templates list:** Every `templates/*.html` and `templates/*.tex` on disk (e.g. `cv-template.html`, `cv-minimal-slot.html`, custom layouts) appears under **Templates** — discovered at load time, same rules as `GET /api/pdf/templates`. Plus `templates/README.md`.

**API:** `GET /api/settings`, `GET/PUT /api/settings/file` — allowlist in `lib/settings-allowlist.ts`.

---

## 8. Upstream tab (git)

`GET /api/git/status`, `POST /api/git/fetch`, `POST /api/git/sync`.  

For system-only updates without merging all of upstream: `node update-system.mjs check` / `apply` (see root `DATA_CONTRACT.md`).

---

## 9. Go TUI dashboard (upstream, not Next.js)

```bash
cd dashboard && go build -o career-dashboard . && ./career-dashboard --path ..
```

Live search (`/`) and report viewer improvements live in `dashboard/internal/ui/screens/`.

---

## 10. Upstream merge highlights (repo root, v1.8.0+)

Merged via `upstream/main`; not implemented inside `web/` but available to scripts the API calls:

- `scan.mjs --verify`, `providers/*`
- `batch/batch-runner.sh --model`
- Turkish modes `modes/tr/`
- Translated English modes, interview-prep split, gemini-eval / merge-tracker fixes

---

## Quick reference

| I want to… | Where |
|------------|--------|
| Filter applications | Applications → search / chips / headers |
| **Generate PDF** | Row → modal → **Generate PDF** (see §3) |
| Preview HTML only | Row → modal → **Render HTML** |
| Edit templates | `/settings` |
| Scan + verify URLs | Nav → **Scan + verify URLs** |
| Terminal tracker | `./career-dashboard --path ..` |
