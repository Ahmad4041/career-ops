# Templates

System-layer template files used by career-ops scripts and modes. These files are auto-updated when you run `npm run update` -- put user customizations in the user-layer files instead (see DATA_CONTRACT.md).

## Files

| File | Used By | Purpose |
|------|---------|---------|
| `cv-template.html` | `generate-pdf.mjs` | HTML/CSS template for ATS-optimized CV PDFs |
| `cv-template.tex` | `generate-latex.mjs` | LaTeX/Overleaf template for ATS-optimized CV PDFs |
| `portals.example.yml` | Onboarding | Example portal scanner configuration (copy to `portals.yml` to activate) |
| `states.yml` | `verify-pipeline.mjs`, `normalize-statuses.mjs`, `merge-tracker.mjs` | Canonical application states and their aliases |

### cv-template.html

The HTML template rendered by Playwright into PDF. Uses placeholder tokens (`{{NAME}}`, `{{SUMMARY_TEXT}}`, `{{EXPERIENCE}}`, etc.) that the PDF pipeline fills at generation time.

**Design:** Space Grotesk headings + DM Sans body, single-column ATS-safe layout, self-hosted fonts from `fonts/`.

**Customization:** Edit this file to change colors, spacing, or section order. The placeholder tokens are documented in `batch/batch-prompt.md` under "Template placeholders."

### Multiple HTML CV templates (`templates/*.html`)

You can keep several layouts beside `cv-template.html` (for example `cv-minimal-slot.html`). The web dashboard exposes them under **`GET /api/pdf/templates`** and generates a PDF with **`POST /api/pdf/generate-from-template`** (body: `{ "templatePath": "templates/foo.html", "format": "a4" | "letter", "reportPath?": "reports/….md", "outputSlug?": "…" }`).

**Minimal custom layout:** Put your HTML in `templates/` and include `{{CONTENT_HTML}}` for the CV body assembled from `cv.md`. Run locally in two steps:

```bash
node render-cv-html-from-template.mjs --root=. templates/my-layout.html output/_tmp.html
node generate-pdf.mjs output/_tmp.html output/cv-name-$(date +%Y-%m-%d).pdf --format=a4
```

**LaTeX path:** Auto-fill from `cv.md` → `templates/cv-template.tex` → compile:

```bash
node render-cv-tex-from-template.mjs --root=. templates/cv-template.tex output/cv-tailored.tex
node generate-latex.mjs output/cv-tailored.tex output/cv-tailored.pdf
```

The dashboard can run the same flows via **`POST /api/pdf/generate-from-template`** and **`POST /api/tex/generate-from-template`**, list matched files under **`GET /api/cv/assets`**, and stream artifacts with **`GET /api/output/file`**.

### cv-template.tex

LaTeX template for Overleaf-compatible CV generation. Based on the [sb2nov/resume](https://github.com/sb2nov/resume) format. Uses placeholder tokens (`{{NAME}}`, `{{EXPERIENCE}}`, `{{PROJECTS}}`, etc.) that the LaTeX pipeline fills at generation time.

**Design:** Single-column ATS-safe layout using standard CTAN packages (`fontawesome5`, `enumitem`, `hyperref`, `titlesec`). No custom fonts or external dependencies — uploads directly to Overleaf.

**Usage:**
```bash
# Validate and compile .tex → .pdf (requires pdflatex on PATH)
node generate-latex.mjs output/cv-name-company-date.tex

# Or specify a custom output path
node generate-latex.mjs output/cv-name-company-date.tex output/custom-name.pdf
```

**Prerequisites:** `pdflatex` via [MiKTeX](https://miktex.org/) (Windows) or TeX Live (Linux/macOS). First compilation may auto-install missing LaTeX packages. Alternatively, upload the `.tex` file directly to [Overleaf](https://www.overleaf.com) — no local install needed.

**Customization:** Edit this file to change margins, section order, or formatting commands. The placeholder tokens are documented in `modes/latex.md` under "Template Placeholders."

### portals.example.yml

Pre-configured portal scanner with 45+ tracked companies and search queries. Contains title filters, company career page URLs, Greenhouse API endpoints, and WebSearch queries.

**To activate:** Copy to project root as `portals.yml` and customize `title_filter.positive` keywords for your target roles. Add or remove companies as needed.

### states.yml

Defines the 8 canonical application states (`Evaluated`, `Applied`, `Responded`, `Interview`, `Offer`, `Rejected`, `Discarded`, `SKIP`) with aliases for common variants. All pipeline scripts validate statuses against this file.

**Do not rename states** -- the dashboard and all scripts depend on these exact IDs. You can add aliases if you encounter new variants that should map to an existing state.

## Asking the AI agent to write or refactor a template

You can ask Cursor / Claude Code / any agent in this repo to **design, complete, or adjust** a template file. The agent should **edit the file in `templates/`** (or give you a full paste-ready file). Keep **negotiation wording, archetypes, and “what to emphasize”** in **`modes/_profile.md`** and **`config/profile.yml`** — those are user layer; templates are mostly layout + `{{tokens}}`.

### Point the agent at the contract

Ask it to read (or attach) at least:

- This file **`templates/README.md`** (tokens + HTML vs minimal layout).
- **`render-cv-html-from-template.mjs`** — how HTML placeholders are filled from **`cv.md`** + **`config/profile.yml`**.
- **`render-cv-tex-from-template.mjs`** and **`modes/latex.md`** — LaTeX token rules and escaping.
- An existing reference: **`templates/cv-template.html`** or **`templates/cv-minimal-slot.html`** or **`templates/cv-template.tex`**.

### HTML: two supported patterns

1. **Full structure** — Same idea as **`cv-template.html`**: use section tokens such as **`{{SUMMARY_TEXT}}`**, **`{{EXPERIENCE}}`**, **`{{PROJECTS}}`**, **`{{EDUCATION}}`**, **`{{SKILLS}}`**, **`{{COMPETENCIES}}`**, plus header tokens (**`{{NAME}}`**, **`{{EMAIL}}`**, **`{{CONTENT_HTML}}`** is optional here). Unknown `{{FOO}}` can stay for bespoke pipelines.

2. **Minimal / single column body** — Your template contains **`{{CONTENT_HTML}}`** and **does not** use the granular section tokens above; **`render-cv-html-from-template.mjs`** will blank granular fields so the rendered body is the full CV as HTML inside **`{{CONTENT_HTML}}`**. Still use **`{{NAME}}`**, **`{{EMAIL}}`**, **`{{PAGE_WIDTH}}`**, links, etc. for the header/metadata you need.

### LaTeX

Placeholders **`{{NAME}}`**, **`{{EXPERIENCE}}`**, … must match **`templates/cv-template.tex`** / **`modes/latex.md`**. The auto-renderer emits LaTeX list commands (`\resumeItem`, `\resumeSubheading`, …); custom `.tex` layouts should keep the same **`{{TOKEN}}`** names unless you also change **`render-cv-tex-from-template.mjs`** (advanced).

### Copy-paste prompts (customize the bracketed parts)

**A — New minimal HTML CV layout**

```text
In career-ops, create templates/my-brand-cv.html for PDF export.

Requirements:
- Read templates/README.md (minimal {{CONTENT_HTML}} pattern).
- Match my vibe: [two-column header / monochrome / serif / etc.].
- Include {{CONTENT_HTML}}, {{NAME}}, {{EMAIL}}, and any header tokens from render-cv-html-from-template.mjs that I need.
- Single-column ATS-safe body; print-friendly CSS; use format {{PAGE_WIDTH}} where relevant.
Output the complete file path and full HTML.
```

**B — Tweak existing HTML template**

```text
Open templates/cv-template.html (or templates/[my-file].html).

Goal: [e.g. tighten spacing, change fonts to system stack only, add a Projects callout].
Do not remove or rename {{placeholders}} the render script expects unless you list renames and update the script.
Output a unified diff or the full file.
```

**C — LaTeX / Overleaf**

```text
Refine templates/cv-template.tex for [language / section order / removing fontawesome].

Constraints: preserve {{PLACEHOLDER}} names from modes/latex.md so render-cv-tex-from-template.mjs still works.
If you change token names, say exactly which script lines to update.
```

After the agent writes the file, use **Customize** in the web app (**Editor / Raw / Preview**) or your editor, then **`POST /api/pdf/generate-from-template`** or the local **`node render-cv-html-from-template.mjs`** + **`generate-pdf.mjs`** smoke test.

### Markdown files in Customize (`cv.md`, `story-bank`, `_profile.md`, …)

The dashboard **Customize** page exposes the same **copyable “ask an agent” starter** for **Markdown** allowlist paths as for HTML/LaTeX templates. Point the agent at **`DATA_CONTRACT.md`** and **`CLAUDE.md`** so edits stay in the **user layer** (`cv.md`, `modes/_profile.md`, `article-digest.md`, `interview-prep/story-bank.md`, pipeline/follow-ups logs, etc.).
