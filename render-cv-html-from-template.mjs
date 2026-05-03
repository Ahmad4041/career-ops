#!/usr/bin/env node
/**
 * render-cv-html-from-template.mjs — Fill templates/cv*.html placeholders from cv.md + config/profile.yml
 *
 * Supports:
 *   • Full-structure templates (tokens like cv-template.html: {{SUMMARY_TEXT}}, {{EXPERIENCE}}, …)
 *   • Minimal custom templates that only need {{CONTENT_HTML}} + header tokens (everything else blanked)
 *
 * Usage:
 *   node render-cv-html-from-template.mjs [--format=a4|letter] [--root=.] [--mock] templates/my.html output/tmp.html
 *
 * --mock  Use fixtures/template-preview/cv.md + profile.yml instead of cv.md + config/profile.yml (dashboard live preview).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
let ROOT = __dirname;

function usage() {
  console.error(
    'Usage: node render-cv-html-from-template.mjs [--format=a4|letter] [--root=DIR] [--mock] <template.html> <output.html>',
  );
  process.exit(1);
}

function escapeHtml(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape then apply **bold** */
function inlineFormat(s) {
  let x = escapeHtml(s);
  x = x.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return x;
}

function mdBlobToHtml(md) {
  if (!md.trim()) return '';
  const lines = md.split('\n');
  let html = '';
  let inUl = false;
  const flushUl = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
  };

  let para = [];
  const flushPara = () => {
    if (para.length === 0) return;
    const t = para.join(' ').trim();
    if (t) html += `<p>${inlineFormat(t)}</p>`;
    para = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const t = line.trim();
    if (!t) {
      flushUl();
      flushPara();
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) flushPara();
    if (line.startsWith('### ')) {
      flushUl();
      html += `<h4>${inlineFormat(line.slice(4).trim())}</h4>`;
      continue;
    }
    if (line.startsWith('## ')) {
      flushUl();
      html += `<h3>${inlineFormat(line.slice(3).trim())}</h3>`;
      continue;
    }
    if (line.startsWith('# ') && !line.startsWith('##')) {
      flushUl();
      html += `<h2>${inlineFormat(line.slice(2).trim())}</h2>`;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!inUl) {
        html += '<ul>';
        inUl = true;
      }
      html += `<li>${inlineFormat(line.replace(/^[-*]\s+/, '').trim())}</li>`;
      continue;
    }
    flushUl();
    para.push(t);
  }
  flushUl();
  flushPara();
  return html || '<p></p>';
}

function splitCvSections(cvText) {
  /** @type {Record<string,string[]>} */
  const buckets = {};
  const lines = cvText.split(/\n/);
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
  /** @type {Record<string,string>} */
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

function competencySpansFromProfile(profile) {
  const lines = [];
  const narr = profile?.narrative || {};
  if (Array.isArray(narr.superpowers)) {
    for (const s of narr.superpowers.slice(0, 12))
      lines.push(`<span class="competency">${escapeHtml(String(s))}</span>`);
  }
  const tr = profile?.target_roles?.primary || profile?.target_roles;
  if (Array.isArray(tr)) {
    for (const s of tr.slice(0, 6))
      lines.push(`<span class="competency">${escapeHtml(String(s))}</span>`);
  }
  return lines.join('\n      ') || '<span class="competency">—</span>';
}

function normalizeLinkedIn(url, handle) {
  const u = String(url || handle || '').trim();
  if (!u) return { href: '', display: '' };
  if (u.startsWith('http')) return { href: u, display: u.replace(/^https?:\/\//i, '').replace(/\/$/, '') };
  return { href: `https://${u.replace(/^\/+/, '')}`, display: u };
}

function buildReplacements(cvText, profile, format, templateStr) {
  const cand = profile?.candidate || {};
  const narr = profile?.narrative || {};
  const name = cand.full_name || 'Your Name';
  const pageW = format === 'letter' ? '8.5in' : '210mm';

  const li = normalizeLinkedIn(cand.linkedin);
  let portHref = String(cand.portfolio_url || '').trim();
  let portDisp = portHref.replace(/^https?:\/\//i, '').replace(/\/$/, '');

  const base = {
    LANG: 'en',
    PAGE_WIDTH: pageW,
    NAME: name,
    PHONE: String(cand.phone || '').trim(),
    EMAIL: String(cand.email || '').trim(),
    LINKEDIN_URL: li.href,
    LINKEDIN_DISPLAY: li.display,
    PORTFOLIO_URL: portHref.startsWith('http')
      ? portHref
      : portHref
        ? `https://${portHref.replace(/^\/+/, '')}`
        : '',
    PORTFOLIO_DISPLAY: portDisp,
    LOCATION: String(cand.location || '').trim(),
    SECTION_SUMMARY: 'Professional Summary',
    SECTION_COMPETENCIES: 'Core Competencies',
    SECTION_EXPERIENCE: 'Work Experience',
    SECTION_PROJECTS: 'Projects',
    SECTION_EDUCATION: 'Education',
    SECTION_CERTIFICATIONS: 'Certifications',
    SECTION_SKILLS: 'Skills',
    SUMMARY_TEXT: '',
    COMPETENCIES: competencySpansFromProfile(profile),
    EXPERIENCE: '',
    PROJECTS: '',
    EDUCATION: '',
    CERTIFICATIONS: '',
    SKILLS: '',
    CONTENT_HTML: '',
  };

  const secs = splitCvSections(cvText);

  let sumMd = mdBlobToHtml(
    firstMatchingSection(secs, [
      'summary',
      'professional summary',
      'about',
      'profile',
      'overview',
    ]),
  ).replace(/^<p><\/p>$/, '');
  const narrPieces = [narr.headline, narr.exit_story].filter(Boolean).map(escapeHtml);
  const narrBlock = narrPieces.join('<br><br>');
  base.SUMMARY_TEXT =
    [narrBlock, sumMd].filter(Boolean).join('<br><br>') ||
    mdBlobToHtml(secs.__preamble || '').replace(/^<p><\/p>$/, '');

  base.EXPERIENCE = mdBlobToHtml(
    firstMatchingSection(secs, ['experience', 'work', 'employment', 'career', 'professional experience']),
  );
  base.PROJECTS = mdBlobToHtml(firstMatchingSection(secs, ['project', 'portfolio']));
  base.EDUCATION = mdBlobToHtml(firstMatchingSection(secs, ['education', 'academic']));
  base.CERTIFICATIONS = mdBlobToHtml(
    firstMatchingSection(secs, ['certification', 'licence', 'license']),
  );
  base.SKILLS = mdBlobToHtml(firstMatchingSection(secs, ['skill', 'technical', 'technologies', 'stack']));

  let cvAll = mdBlobToHtml(cvText);
  if (!cvAll || cvAll === '<p></p>') cvAll = '<p></p>';
  base.CONTENT_HTML = `<article class="cv-content-html">${cvAll}</article>`;

  /** Custom “single-slot” layouts: populate only {{CONTENT_HTML}} (+ header/contact tokens). */
  const granular =
    /\{\{\s*EXPERIENCE\s*\}\}/.test(templateStr) ||
    /\{\{\s*SUMMARY_TEXT\s*\}\}/.test(templateStr) ||
    /\{\{\s*COMPETENCIES\s*\}\}/.test(templateStr);
  if (templateStr.includes('{{CONTENT_HTML}}') && !granular) {
    base.EXPERIENCE = '';
    base.PROJECTS = '';
    base.EDUCATION = '';
    base.CERTIFICATIONS = '';
    base.SKILLS = '';
    base.SUMMARY_TEXT = '';
    base.COMPETENCIES = '';
  }

  return base;
}

function applyTemplate(template, replacements) {
  let out = template;
  const seen = Object.keys(replacements);
  for (const key of seen) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    out = out.replace(re, replacements[key]);
  }
  /** Leave unknown {{TOKENS}} untouched for partial custom pipelines */
  return out;
}

function main() {
  const args = process.argv.slice(2);
  let format = 'a4';
  let mockData = false;
  const positional = [];

  for (const arg of args) {
    if (arg.startsWith('--format=')) format = arg.split('=')[1].toLowerCase();
    else if (arg.startsWith('--root=')) ROOT = resolve(arg.slice('--root='.length));
    else if (arg === '--mock') mockData = true;
    else positional.push(arg);
  }

  if (positional.length < 2) usage();

  const [templateArg, outputArg] = positional;
  const templatePath = resolve(ROOT, templateArg);
  const outputPath = resolve(ROOT, outputArg);

  const cvPath = mockData
    ? join(ROOT, 'fixtures', 'template-preview', 'cv.md')
    : join(ROOT, 'cv.md');
  const profilePath = mockData
    ? join(ROOT, 'fixtures', 'template-preview', 'profile.yml')
    : join(ROOT, 'config', 'profile.yml');

  if (!existsSync(cvPath)) {
    console.error(mockData ? `Missing mock fixture: ${cvPath}` : 'Missing cv.md in project root');
    process.exit(1);
  }
  if (!existsSync(profilePath)) {
    console.error(
      mockData ? `Missing mock fixture: ${profilePath}` : 'Missing config/profile.yml',
    );
    process.exit(1);
  }
  if (!existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  const cvText = readFileSync(cvPath, 'utf8');
  const profile = yaml.load(readFileSync(profilePath, 'utf8'));

  let templateStr = readFileSync(templatePath, 'utf8');
  const rep = buildReplacements(cvText, profile, format, templateStr);
  const html = applyTemplate(templateStr, rep);

  writeFileSync(outputPath, html, 'utf8');
  console.error(`✓ Wrote ${outputPath}`);
}

main();
