# Career Ops — Web dashboard

Small **Next.js** UI on top of your local career-ops repo: tracker + reports, **Node** scripts, **batch-runner** (bash), and integration with the **Cursor launcher** and **Claude Code CLI**.

### What the server can run

| Mechanism | Commands / routes |
|-----------|-------------------|
| `POST /api/run` | `scan`, `scan-verify` (`scan.mjs --verify`), `verify`, `merge`, `doctor`, `batch-runner-dry-run`, `batch-runner` |
| `POST /api/cli/open` | `{ "target": "cursor" \| "claude-code" }` — detached launch of `cursor <repo>` or `claude` in the repo |
| `POST /api/cli/claude-eval` | `{ "url": "https://...", "jdText"?: "..." }` — same pattern as `batch/batch-runner.sh`: `claude -p --dangerously-skip-permissions --append-system-prompt-file …` with `batch/batch-prompt.md` expanded |
| `GET /api/cli/status` | Resolve `claude`, `cursor`, `bash` on `PATH` |
| `GET /api/cli/commands` | Copy-friendly shell one-liners |
| **`GET /api/jobs`** | In-memory queue metadata (recent jobs only) |
| **`POST /api/jobs`** | Queue work: Claude headless evaluate, Cursor Agent CLI (`cursor agent --print`), or `node` scripts — see dashboard form |
| **`GET /api/jobs/:id`** | Full snapshot (metadata + newline logs) |
| **`GET /api/jobs/:id/stream`** | **SSE**: live `{ type:"log"|"terminal", ... }` from workers |
| **`PATCH /api/applications`** | Update tracker row: `{ "applicationNumber": 8, "status"?: "Rejected", "notes"?: "…" }` (writes `data/applications.md`) |
| **`GET /api/pdf/lookup?reportPath=reports/…md`** | JSON: whether `output/` contains a PDF matched to that report slug |
| **`GET /api/pdf/download?reportPath=reports/…md`** | Stream matched PDF or 404 |
| **`GET /api/pdf/templates`** | Lists `templates/*.html` for the PDF picker |
| **`POST /api/pdf/generate-from-template`** | Runs `render-cv-html-from-template.mjs`, then (unless `"renderOnly": true`) `generate-pdf.mjs` (Playwright). Body: `{ "templatePath", "format?", "reportPath?", "outputSlug?", "renderOnly"?: false }`. **HTML-only:** `renderOnly: true` writes **`output/cv-*.html`** for preview/matching — no Playwright. Full pipeline returns **`GET /api/pdf/download-rendered?name=…`** URL |
| **`GET /api/cv/assets?reportPath=reports/…md`** | JSON: best HTML / PDF / .tex filenames in **`output/`** for that report slug + **`/api/output/file`** URLs |
| **`GET /api/output/file?name=…`** | Serves **`output/*.pdf`**, **`*.html`**, **`*.tex`**; add **`inline=1`** when embedding PDF in an iframe |
| **`POST /api/tex/generate-from-template`** | `render-cv-tex-from-template.mjs` + `generate-latex.mjs` (tectonic / pdflatex on PATH); writes **`output/cv-…`** `.tex`; returns PDF URLs only when compilation succeeds |
| **`GET /api/settings`** | List allowlisted personalization files (`config/profile.yml`, `modes/_profile.md`, `portals.yml`, `cv.md`, templates, etc.) with `exists` flags |
| **`GET /api/settings/file?path=…`** | Read one allowlisted path (creates editor buffer as empty JSON if missing) |
| **`PUT /api/settings/file`** | `{ "path": "...", "content": "…" }` — write UTF-8 (max ~1.5 MB); strict allowlist |
| **`POST /api/template-preview/render`** | **Settings → HTML templates:** filled preview without saving the file. Body: `{ "templateSource": "…", "dataMode": "live" \| "mock", "format": "a4" \| "letter" }`. Runs `render-cv-html-from-template.mjs` with your buffer; **live** reads `cv.md` + `config/profile.yml`, **mock** reads `fixtures/template-preview/cv.md` + `fixtures/template-preview/profile.yml`. Returns `{ ok, html, dataMode, format }` or an error payload. |
| **`GET /api/git/status`** | Upstream divergence (ahead/behind), dirty flag, incoming commit subjects (needs local `upstream/` ref) |
| **`POST /api/git/fetch`** | `git fetch` for the resolved upstream remote (default name `upstream`) |
| **`POST /api/git/sync`** | `{ "confirm": true }` — stash `-u` if dirty → `git merge upstream/…` → `stash pop` (abort merge + pop stash if merge fails) |

**Upstream tab:** incoming commits vs your `HEAD`. **Prefer** `node update-system.mjs check` / `apply` for **system-layer-only** pulls that never touch user data (`DATA_CONTRACT.md`). Git merge pulls the whole upstream history onto your branch.

### Customize tab

Use **[Settings & templates](/settings)** in the sidebar to edit personalization files and CV templates without leaving the browser. Paths are validated in `web/lib/settings-allowlist.ts` (**do not expose this stack publicly** — it reads/writes your repo disk).

**HTML templates:** open any `templates/*.html` to get **side-by-side** (editable source + filled preview) or switch to **tabs** (Editor / Raw / Preview). **Live** preview injects your real `cv.md` and `config/profile.yml`; **mock** uses preset fixtures under `fixtures/template-preview/` so you can tweak layout without touching your CV. Preview updates are debounced and call **`POST /api/template-preview/render`**. The preview iframe uses `sandbox="allow-same-origin allow-scripts"` so linked stylesheets and web fonts (e.g. Google Fonts) load more reliably than with a fully locked sandbox — only HTML returned by your repo’s render script is shown.

**LaTeX templates (`templates/*.tex`):** the **Preview** tab offers **Compile PDF preview**, which calls **`POST /api/tex/generate-from-template`** (same as elsewhere): saved template on disk plus `cv.md` / `profile.yml`; unsaved editor buffer is **not** compiled until you save. Requires `tectonic` or `pdflatex` on the host running Next.

Jobs run **outside** the GUI: Claude uses `claude -p`; Cursor uses the **CLI** — `cursor agent --print …` (or standalone `cursor-agent`) with `--workspace CAREER_OPS_ROOT`, stdout/stderr appended to job logs.

### Cursor Agent CLI resolution (in order)

1. **`CURSOR_AGENT_BIN`** — full path to the agent binary when you prefer an explicit shim.
2. **`CURSOR_AGENT_PATH`** or **`which cursor-agent`** — standalone `cursor-agent` on PATH.
3. **`CURSOR_CLI_PATH` or `cursor` + subcommand `agent`** — `cursor agent --print …` when the shim is bundled with Cursor.

Recommended: confirm in a terminal: `cursor agent --print --help` (or `cursor-agent --help`).

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CAREER_OPS_ROOT` | Absolute path to career-ops (default: parent of `web/`) |
| `CLAUDE_CLI_PATH` | Explicit path to Claude Code `claude` |
| `CURSOR_CLI_PATH` | Explicit path to `cursor` (used when invoking `cursor agent …`) |
| `CURSOR_AGENT_BIN` | Full path to `cursor-agent` (skips PATH lookup) |
| `CURSOR_AGENT_PATH` | Full path override when resolving `cursor-agent` by name |
| `CURSOR_API_KEY` | Optional; if unset, the CLI falls back to `cursor agent login` / stored credentials |
| `CURSOR_AGENT_MODEL` | Optional `--model` slug for the agent |
| `CURSOR_AGENT_TIMEOUT_MS` | Agent run timeout override (default `1800000`) |
| `CURSOR_AGENT_OUTPUT_FORMAT` | Set to `stream-json` for `--output-format stream-json` + `--stream-partial-output` |
| `CURSOR_AGENT_YOLO` | Set to `1` or `true` to pass `--yolo` (non-interactive; use with care) |
| `CAREER_OPS_CLAUDE_TIMEOUT_MS` | Headless Claude eval timeout override (default `1200000`) |
| `BASH_PATH` | POSIX shell for `batch-runner.sh` (macOS/Linux often `bash`) |
| `GIT_CLI_PATH` / `GIT_PATH` | Explicit `git` binary for `/api/git/*` routes |
| `CAREER_OPS_GIT_UPSTREAM_REMOTE` | Upstream remote name (default `upstream`) |
| `CAREER_OPS_GIT_UPSTREAM_BRANCH` | Force branch (e.g. `main`) if remote-tracking refs are missing |

> **Queues are in-memory** — restarting `next dev` clears job history (safe for localhost ops).

## Run

From the **`web/`** directory (repository root’s parent folder is inferred automatically):

```bash
npm install
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

**Applications tab:** press **`/`** (when focus is not in an input) to jump to the search box — same idea as the Go TUI pipeline live search ([upstream #526](https://github.com/santifer/career-ops)). **Escape** in the search field clears the text query (status filter unchanged). Report **Preview** uses width-aware Markdown table wrapping ([upstream #513](https://github.com/santifer/career-ops)).

Unit tests for tracker query helpers (Vitest):

```bash
npm run test
```

### Verify Cursor Agent CLI (no dashboard)

From `web/`:

```bash
npm run cursor-smoke
```

Prints the resolved binary and the argv the job runner would use (same rules as `run-cursor-job.ts`). To confirm the CLI responds:

```bash
npm run cursor-smoke -- --help-cli
```

## Point at a different repo root

Default root is **`..`** relative to where you started the Next process (`web/` → career-ops root). Override:

```bash
export CAREER_OPS_ROOT="/absolute/path/to/career-ops"
npm run dev
```

## Job logs (Cursor)

Lines like `cursor-retrieval: tracing to '…/cursor_retrieval….log'` come from the **Cursor agent binary** (internal retrieval/indexing). They are informational, not failures; the dashboard maps them to **`[info]`** so they are not confused with real stderr.

**LinkedIn posting URLs** often block headless or unauthenticated fetches. If the agent cannot read the JD from the URL, paste the job description into **optional JD text** in the form, or use a careers-page / Greenhouse / Ashby / Lever link when possible.

## UX roadmap

See **`UX-ROADMAP.md`** for dashboard UX notes. Applications filters and sort sync to the URL (`q`, `status`, `sort`, `dir`) for bookmarks and sharing. Agent guidance: **`.cursor/skills/career-ops-frontend/SKILL.md`**.

## Security

Treat this stack as **local development**: API routes spawn Node with your repo as cwd and expose report contents. Do not expose the dev server publicly without authentication and tightening the allowlisted scripts.
