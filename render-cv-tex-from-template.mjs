#!/usr/bin/env node
/**
 * render-cv-tex-from-template.mjs — Fill templates/cv-template.tex from cv.md + config/profile.yml
 *
 * Builds LaTeX body blocks (\resumeSubheading, \resumeItem, …). Run:
 *   node generate-latex.mjs output/tmp.tex output/tmp.pdf
 *
 * Usage:
 *   node render-cv-tex-from-template.mjs [--root=.] templates/cv-template.tex output/tmp.tex
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
let ROOT = __dirname;

function usage() {
  console.error(
    'Usage: node render-cv-tex-from-template.mjs [--root=DIR] <template.tex> <output.tex>',
  );
  process.exit(1);
}

function escapeLatex(raw) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw).normalize('NFKC');
  s = s.replace(/\\/g, '\\textbackslash{}');
  s = s.replace(/[&%$#_{}]/g, (ch) => {
    const m = {
      '&': '\\&',
      '%': '\\%',
      $: '\\$',
      '#': '\\#',
      _: '\\_',
      '{': '\\{',
      '}': '\\}',
    };
    return m[ch] ?? ch;
  });
  s = s.replace(/\u00a0/g, '~');
  s = s.replace(/~/g, '\\textasciitilde{}');
  s = s.replace(/\^/g, '\\textasciicircum{}');
  return s;
}

/** Escape prose; preserves **emphasis** → \textbf{…} safely */
function escapeWithBoldMd(s) {
  const blobs = [];
  let t = String(s || '').replace(/\*\*(.+?)\*\*/g, (_, inner) => {
    blobs.push(escapeLatex(inner.trim()));
    return `@@BM${blobs.length - 1}@@`;
  });
  t = escapeLatex(t);
  blobs.forEach((esc, i) => {
    t = t.replace(`@@BM${i}@@`, `\\textbf{${esc}}`);
  });
  return t.replace(/\s+/g, ' ').trim();
}

/** One plain line for resumeItem — escape + inline bold */
function itemBodyFromMarkdownLine(line) {
  const raw = line.replace(/^-\s+/, '').trim();
  return escapeWithBoldMd(raw);
}

function splitCvSections(cvText) {
  const buckets = {};
  const lines = cvText.split('\n');
  let key = '__preamble';
  buckets[key] = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      key = m[1].trim().toLowerCase();
      if (!buckets[key]) buckets[key] = [];
      continue;
    }
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(line);
  }
  const out = {};
  for (const [k, arr] of Object.entries(buckets)) out[k] = arr.join('\n').trim();
  return out;
}

function firstMatchingSection(sec, patterns) {
  for (const [k, val] of Object.entries(sec)) {
    if (!val) continue;
    const lk = k.toLowerCase();
    for (const p of patterns) {
      if (lk.includes(p) || p.includes(lk)) return val;
    }
  }
  return '';
}

function ensureGithubHttp(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  return s.startsWith('http') ? s : `https://${s.replace(/^\/+/, '')}`;
}

function ensureLinkedHttp(u) {
  return ensureGithubHttp(u);
}

/** ### Company — Role + **dates** bullets */
function blockExperienceToTex(mdChunk) {
  const raw = mdChunk.trim();
  if (!raw) return '';

  let out = '';

  /** Split ### headers */
  const parts = raw.split(/^###\s+/m).filter((p) => p.trim());

  for (let i = 0; i < parts.length; i++) {
    let block = parts[i];
    /** First segment may omit ### prefix */
    let lines = block.split('\n');
    const headline = lines[0].trim();
    lines = lines.slice(1);

    /** Optional extra --- line under headline */
    const hp = headline.split(/\s+—\s+|\s+-\s+-\s+-\s+/).map((s) => s.trim());
    const company = hp[0] || headline;
    const role = hp.length > 1 ? hp.slice(1).join(' — ') : '';

    let dates = '';
    const bullets = [];
    for (const ln of lines) {
      const t = ln.trim();
      if (!t) continue;
      if (/^\*\*.+\*\*$/.test(t)) {
        dates = t.replace(/^\*\*|\*\*$/g, '').trim();
        continue;
      }
      if (/^-\s/.test(t)) bullets.push(itemBodyFromMarkdownLine(t));
    }

    const co = escapeWithBoldMd(company);
    const dt = escapeWithBoldMd(dates);
    const rl = escapeWithBoldMd(role);

    out += `\n    \\resumeSubheading\n      {${co}}{${dt}}\n      {${rl}}{}\n`;

    if (bullets.length) {
      out += `      \\resumeItemListStart\n`;
      for (const b of bullets) out += `        \\resumeItem{${b}}\n`;
      out += `      \\resumeItemListEnd\n`;
    }
  }

  return out;
}

function blockEducationToTex(md) {
  const lines = md.split('\n').map((s) => s.trim());
  let out = '';

  const bullets = [];
  for (const t of lines) {
    if (t.startsWith('-')) bullets.push(t);
  }

  /** Each bullet becomes one tuple */
  for (const bRaw of bullets) {
    let b = bRaw.replace(/^-\s+/, '').trim();

    /** Strip trailing *(note)* */
    let noteTail = '';
    const noteM = /\s*\([^)]*\)\s*\*[^*]+\*\s*$/.exec(b);
    if (noteM) {
      noteTail = noteM[0].trim();
      b = b.slice(0, noteM.index).trim();
    }

    let degree = '';
    let rest = b;
    const boldM = b.match(/^\*\*(.+?)\*\*\s*(?:—|-)\s*(.+)$/);
    if (boldM) {
      degree = boldM[1].trim();
      rest = boldM[2].trim();
    }

    /** Years near end in parens */
    let dur = '';
    const yearM = rest.match(/\(([^)]+)\)\s*$/);
    let placeSchool = rest;
    if (yearM) {
      dur = yearM[1].trim();
      placeSchool = rest.slice(0, yearM.index).trim().replace(/\s+[—\-]\s*$/, '');
    }

    const lhs = escapeWithBoldMd(placeSchool || degree || noteTail || '.');
    const rhs = escapeWithBoldMd(dur);
    const degEsc = escapeWithBoldMd(degree);

    /** Company | dates | Role | Location — map school block */
    out += `\n    \\resumeSubheading\n      {${lhs}}{${rhs}}\n      {${degEsc}}{}\n`;
  }

  return out;
}

/** - **Proj** — details */
function blockProjectsToTex(md) {
  const lines = md.split('\n');
  let out = '';

  for (const line of lines) {
    const t = line.trim();
    if (!/^-\s/.test(t)) continue;
    const body = t.replace(/^-\s+/, '').trim();
    /** Split first — */
    let title = '';
    let desc = body;
    const sm = body.match(/^(.+?)\s+—\s+(.+)$/);
    const bm = body.match(/^\*\*(.+?)\*\*\s*(?:—|:)\s*(.+)$/);
    if (bm) {
      title = bm[1];
      desc = bm[2];
    } else if (sm) {
      title = sm[1];
      desc = sm[2];
    } else title = desc;

    title = escapeWithBoldMd(title.trim());
    desc = escapeWithBoldMd(desc.trim());

    out += `\n\\resumeProjectHeading{${title}}{}\n\\resumeItemListStart\n`;
    out += `    \\resumeItem{${desc}}\n`;
    out += `\\resumeItemListEnd\n`;
  }

  return out;
}

/** - **Skills:** items */
function blockSkillsToTex(md) {
  const lines = md.split('\n');
  let out = '';
  for (const ln of lines) {
    let t = ln.trim();
    if (!/^-\s/.test(t)) continue;
    t = t.replace(/^-\s+/, '');
    /** **Cat:** remainder */
    const m = t.match(/\*\*\s*([^*]+):\s*\*\*\s*(.+)$/);
    if (m) {
      const cat = escapeWithBoldMd(m[1].trim());
      const items = escapeWithBoldMd(m[2].trim());
      out += `    \\textbf{${cat}}{: ${items}} \\\\\n`;
    } else {
      out += `    \\textbf{Skills}{: ${itemBodyFromMarkdownLine(`- ${t}`)}} \\\\\n`;
    }
  }
  return out;
}

/** --- */
function buildReplacements(cvText, profile, templateStr) {
  const cand = profile?.candidate || {};
  const loc = profile?.location || {};

  const name = escapeLatex(cand.full_name || 'Your Name');
  const emailRaw = String(cand.email || '').trim();
  const emailDisp = escapeLatex(emailRaw);

  const gh = ensureGithubHttp(cand.github || '');
  const ghDispRaw = cand.github?.replace(/^https?:\/\//i, '').replace(/^www\./i, '') || '';
  const ghDisp = escapeWithBoldMd(ghDispRaw);

  const li = ensureLinkedHttp(cand.linkedin || '');
  const liDispRaw = cand.linkedin?.replace(/^https?:\/\//i, '').replace(/^www\./i, '') || '';
  const liDisp = escapeLatex(liDispRaw);

  const bits = [];
  if (String(cand.phone || '').trim()) bits.push(String(cand.phone).trim());
  if (String(cand.location || '').trim()) bits.push(String(cand.location).trim());
  if (loc?.visa_status) bits.push(String(loc.visa_status));
  const contactLine = escapeLatex(bits.join(' · '));

  const secs = splitCvSections(cvText);

  let expMd = firstMatchingSection(secs, [
    'experience',
    'work',
    'employment',
    'career',
    'professional experience',
  ]);
  let eduMd = firstMatchingSection(secs, ['education', 'academic']);
  let projMd = firstMatchingSection(secs, ['project', 'portfolio']);
  let skillsMd = firstMatchingSection(secs, ['skill', 'technical', 'technologies', 'stack']);

  let experience = blockExperienceToTex(expMd.trim());

  /** If no ### blocks found, salvage as simple bullet list */
  if (!experience.trim() || experience.length < 15) {
    let salvage =
      `\n    \\resumeSubheading\n      {Professional experience}{}{}{}\n      \\resumeItemListStart\n`;
    let n = 0;
    for (const line of expMd.split('\n')) {
      const x = line.trim();
      if (x.startsWith('-')) {
        salvage += `        \\resumeItem{${itemBodyFromMarkdownLine(x)}}\n`;
        n++;
      }
    }
    salvage += `      \\resumeItemListEnd\n`;
    if (n) experience = salvage;
  }

  let education = blockEducationToTex(eduMd || '');
  if (!education.trim()) {
    education = `\n    \\resumeSubheading\n      {See cv.md Education}{}{}{}\n`;
  }

  let projects = blockProjectsToTex(projMd || '');
  if (!projects.trim())
    projects = `\n\\resumeProjectHeading{See cv.md}{}{}\n\\resumeItemListStart\n    \\resumeItem{Projects listed on source CV.}\\resumeItemListEnd\n`;

  let skills = blockSkillsToTex(skillsMd || '');
  if (!skills.trim()) skills = '    \\textbf{General}{: See CV source} \\\\';

  const rep = {
    NAME: name,
    CONTACT_LINE: contactLine,
    EMAIL_URL: emailRaw,
    EMAIL_DISPLAY: emailDisp,
    LINKEDIN_URL: li || '#',
    LINKEDIN_DISPLAY: liDisp || '—',
    GITHUB_URL: gh || '#',
    GITHUB_DISPLAY: ghDisp || '—',
    EDUCATION: education,
    EXPERIENCE: experience,
    PROJECTS: projects,
    SKILLS: skills,
  };

  return rep;
}

function applyTemplate(template, replacements) {
  let out = template;
  const seen = Object.keys(replacements);
  for (const key of seen) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    out = out.replace(re, replacements[key]);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const positional = [];

  for (const arg of args) {
    if (arg.startsWith('--root=')) ROOT = resolve(arg.slice('--root='.length));
    else positional.push(arg);
  }

  if (positional.length < 2) usage();

  const [templateRel, outputRel] = positional;
  const templatePath = resolve(ROOT, templateRel);
  const outputPath = resolve(ROOT, outputRel);

  if (!existsSync(join(ROOT, 'cv.md'))) {
    console.error('Missing cv.md in project root');
    process.exit(1);
  }
  if (!existsSync(join(ROOT, 'config', 'profile.yml'))) {
    console.error('Missing config/profile.yml');
    process.exit(1);
  }
  if (!existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  const cvText = readFileSync(join(ROOT, 'cv.md'), 'utf8');
  const profile = yaml.load(readFileSync(join(ROOT, 'config', 'profile.yml'), 'utf8'));
  let templateStr = readFileSync(templatePath, 'utf8');
  const rep = buildReplacements(cvText, profile, templateStr);
  const latex = applyTemplate(templateStr, rep);

  /** Catch unresolved placeholders (generate-latex will fail loudly) */
  const bad = latex.match(/\{\{[A-Z_]+\}\}/g);
  if (bad?.length)
    console.error('Warning — unresolved placeholders:', [...new Set(bad)].join(', '));

  writeFileSync(outputPath, latex, 'utf8');
  console.error(`✓ Wrote ${outputPath}`);
}

main();
