---
name: career-ops
description: AI job search command center -- evaluate offers, generate CVs, scan portals, track applications
user_invocable: true
args: mode
argument-hint: "[scan | deep | pdf | oferta | ofertas | apply | batch | tracker | pipeline | contacto | training | project | interview-prep | update]"
---

# career-ops -- Router

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| JD text or URL (no sub-command) | **`auto-pipeline`** |
| `oferta` | `oferta` |
| `ofertas` | `ofertas` |
| `contacto` | `contacto` |
| `deep` | `deep` |
| `pdf` | `pdf` |
| `training` | `training` |
| `project` | `project` |
| `tracker` | `tracker` |
| `pipeline` | `pipeline` |
| `apply` | `apply` |
| `scan` | `scan` |
| `batch` | `batch` |
| `patterns` | `patterns` |
| `followup` | `followup` |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND contains JD text (keywords: "responsibilities", "requirements", "qualifications", "about the role", "we're looking for", company name + role) or a URL to a JD, execute `auto-pipeline`.

If `{{mode}}` is not a sub-command AND doesn't look like a JD, show discovery.

---

## Discovery Mode (no arguments)

Show this menu:

```
career-ops -- Command Center

Available commands:
  /career-ops {JD}      → AUTO-PIPELINE: evaluate + report + PDF + tracker (paste text or URL)
  /career-ops pipeline  → Process pending URLs from inbox (data/pipeline.md)
  /career-ops oferta    → Evaluation only A-F (no auto PDF)
  /career-ops ofertas   → Compare and rank multiple offers
  /career-ops contacto  → LinkedIn power move: find contacts + draft message
  /career-ops deep      → Deep research prompt about company
  /career-ops pdf       → PDF only, ATS-optimized CV
  /career-ops training  → Evaluate course/cert against North Star
  /career-ops project   → Evaluate portfolio project idea
  /career-ops tracker   → Application status overview
  /career-ops apply     → Live application assistant (reads form + generates answers)
  /career-ops scan      → Scan portals and discover new offers
  /career-ops batch     → Batch processing with parallel workers
  /career-ops patterns  → Analyze rejection patterns and improve targeting
  /career-ops followup  → Follow-up cadence tracker: flag overdue, generate drafts

Inbox: add URLs to data/pipeline.md → /career-ops pipeline
Or paste a JD directly to run the full pipeline.
```

---

## Custom CV / LaTeX templates (user asks you to author or refactor)

When the user wants **help writing**, **filling placeholders**, or **redesigning** a file under **`templates/`** (e.g. `cv-template.html`, `cv-minimal-slot.html`, `cv-template.tex`):

1. Read **`templates/README.md`** → **"Asking the AI agent to write or refactor a template"** — HTML **full-token** vs **minimal `{{CONTENT_HTML}}`** layouts; LaTeX tokens per **`modes/latex.md`**.
2. Inspect **`render-cv-html-from-template.mjs`** and/or **`render-cv-tex-from-template.mjs`** so `{{TOKEN}}` names stay consistent; do **not** hardcode résumé bullets or metrics — content comes from **`cv.md`** and **`config/profile.yml`** at render time.
3. Put **tone, archetypes, and targeting** edits in **`modes/_profile.md`** / **`config/profile.yml`**, not in **`modes/_shared.md`** (see DATA_CONTRACT).

When the user wants help with **allowlisted Markdown** in the repo (**`cv.md`**, **`modes/_profile.md`**, **`article-digest.md`**, **`interview-prep/story-bank.md`**, **`data/pipeline.md`**, **`data/follow-ups.md`**):

1. Respect **DATA_CONTRACT.md** (user layer vs system layer); never move their personal narrative into **`modes/_shared.md`**.
2. For **`cv.md`**, do not invent employers, dates, or metrics—organize and rephrase only from what they provide.
3. For **`interview-prep/story-bank.md`**, preserve facts; improve STAR structure and clarity where asked.

---

## Context Loading by Mode

After determining the mode, load the necessary files before executing:

### Modes that require `_shared.md` + their mode file:
Read `modes/_shared.md` + `modes/{mode}.md`

Applies to: `auto-pipeline`, `oferta`, `ofertas`, `pdf`, `contacto`, `apply`, `pipeline`, `scan`, `batch`

### Standalone modes (only their mode file):
Read `modes/{mode}.md`

Applies to: `tracker`, `deep`, `training`, `project`, `patterns`, `followup`

### Modes delegated to subagent:
For `scan`, `apply` (with Playwright), and `pipeline` (3+ URLs): launch as Agent with the content of `_shared.md` + `modes/{mode}.md` injected into the subagent prompt.

```
Agent(
  subagent_type="general-purpose",
  prompt="[content of modes/_shared.md]\n\n[content of modes/{mode}.md]\n\n[invocation-specific data]",
  description="career-ops {mode}"
)
```

Execute the instructions from the loaded mode file.
