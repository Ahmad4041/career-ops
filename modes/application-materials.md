# Application materials (dashboard / generate-application-materials.mjs)

Generate copy-paste text for a **single** tracker row using `cv.md`, `config/profile.yml`, `modes/_profile.md`, and the evaluation report when available.

## Tone

- Specific to the company and role — cite JD/report details, not generic filler.
- "I'm choosing you" framing from auto-pipeline: why this role fits the candidate's trajectory.
- No "passionate about…" corporate-speak.
- Never invent metrics — only use numbers from cv.md, article-digest.md, or the report.

## Phases

### summary

2–3 short paragraphs (plain text, no markdown headers). Tailored **professional summary** for this application: role title, domain, top proof points from report block B/E, location/remote if relevant. Suitable for ATS "summary" fields or LinkedIn About snippet.

### coverLetter

One cover letter, 250–400 words, plain text paragraphs. Opening hooks on a concrete company/team signal from the JD or report A. Body: 2–3 proof points with outcomes. Close: clear interest + availability. No "Dear Hiring Manager" if unknown name — use "Dear [Company] team" or "Hello".

### recruiterMessage

LinkedIn connection or InMail style message for a **recruiter** contact (see modes/contacto.md recruiter frame). **Maximum 300 characters** including spaces. Three beats: fit, proof, soft CTA. No phone number.

### customQuestions

For each user-supplied question, answer in 2–6 sentences using report + CV. If the question is yes/no, answer directly then one supporting sentence. Output structured JSON only (handled by the script).
