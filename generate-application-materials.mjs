#!/usr/bin/env node
/**
 * generate-application-materials.mjs — per-application text materials (Gemini)
 *
 * Usage:
 *   node generate-application-materials.mjs --application 12 --phase summary
 *   node generate-application-materials.mjs --application 12 --phase coverLetter
 *   node generate-application-materials.mjs --application 12 --phase recruiterMessage
 *   node generate-application-materials.mjs --application 12 --phase customQuestions --questions "Why this role?\nSalary?"
 *
 * Requires GEMINI_API_KEY in .env (free tier: gemini-2.5-flash).
 * Prints a single JSON object to stdout; logs go to stderr.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

try {
  const { config } = await import('dotenv');
  config();
} catch {
  /* optional */
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PHASES = new Set(['summary', 'coverLetter', 'recruiterMessage', 'customQuestions']);

function readOptional(path, label) {
  if (!existsSync(path)) return `[${label} not found]`;
  return readFileSync(path, 'utf8').trim();
}

function parseArgs(argv) {
  let application = null;
  let phase = null;
  let questions = '';
  let greeting = '';
  let modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--application' && argv[i + 1]) application = parseInt(argv[++i], 10);
    else if (a === '--phase' && argv[i + 1]) phase = argv[++i];
    else if (a === '--questions' && argv[i + 1]) questions = argv[++i];
    else if (a === '--greeting' && argv[i + 1]) greeting = argv[++i];
    else if (a === '--model' && argv[i + 1]) modelName = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.error('See file header for usage.');
      process.exit(0);
    }
  }
  return { application, phase, questions, greeting, modelName };
}

function findApplication(root, num) {
  const trackerPaths = [join(root, 'data', 'applications.md'), join(root, 'applications.md')];
  let markdown = '';
  for (const p of trackerPaths) {
    if (existsSync(p)) {
      markdown = readFileSync(p, 'utf8');
      break;
    }
  }
  if (!markdown) return null;

  const lines = markdown.split('\n');
  for (const line of lines) {
    if (!line.trimStart().startsWith('|')) continue;
    if (/^\|\s*[-#:]+\s*\|/.test(line)) continue;
    const inner = line.trim().replace(/^\||\|$/g, '');
    const parts = inner.includes('\t')
      ? inner.split('\t').map((c) => c.trim())
      : inner.split('|').map((c) => c.trim());
    if (parts.length < 8) continue;
    const n = parseInt(parts[0], 10);
    if (n !== num) continue;
    const scoreRaw = parts[4] ?? '';
    let reportPath = '';
    const rm = (parts[7] ?? '').match(/\[(\d+)\]\((reports\/[^)]+)\)/);
    if (rm) reportPath = rm[2];
    let jobUrl = '';
    for (const c of parts) {
      if (/^https?:\/\//i.test(c)) jobUrl = c;
    }
    return {
      number: n,
      date: parts[1] ?? '',
      company: parts[2] ?? '',
      role: parts[3] ?? '',
      scoreRaw,
      status: parts[5] ?? '',
      reportPath,
      notes: parts[8] ?? '',
      jobUrl,
    };
  }
  return null;
}

function phaseInstruction(phase, questions, greeting) {
  switch (phase) {
    case 'summary':
      return 'Generate ONLY the tailored professional summary (plain text, 2-3 paragraphs). No title, no markdown headings.';
    case 'coverLetter': {
      const salutation = (greeting ?? '').trim();
      if (salutation) {
        return `Generate ONLY the cover letter body (plain text, 250-400 words). The candidate set this salutation separately (use exactly; do not repeat in output): "${salutation}". No markdown headings.`;
      }
      return 'Generate ONLY the full cover letter (plain text, 250-400 words). No markdown headings.';
    }
    case 'recruiterMessage':
      return 'Generate ONLY the recruiter LinkedIn message. MAX 300 characters total. Plain text, one message.';
    case 'customQuestions': {
      const qs = questions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);
      if (qs.length === 0) throw new Error('customQuestions requires --questions with one question per line');
      return `Answer each application form question below. Return ONLY valid JSON array: [{"question":"exact question","answer":"plain text answer"}]. Questions:\n${qs.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    }
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

const { application, phase, questions, greeting, modelName } = parseArgs(process.argv.slice(2));

if (!Number.isFinite(application) || application < 1) {
  emit({ ok: false, error: 'Missing or invalid --application <number>' });
  process.exit(1);
}
if (!phase || !PHASES.has(phase)) {
  emit({ ok: false, error: 'Missing or invalid --phase (summary|coverLetter|recruiterMessage|customQuestions)' });
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  emit({
    ok: false,
    error: 'GEMINI_API_KEY not set. Add to .env (https://aistudio.google.com/apikey) or generate in Cursor with /career-ops apply.',
  });
  process.exit(1);
}

const app = findApplication(ROOT, application);
if (!app) {
  emit({ ok: false, error: `Application #${application} not found in applications.md` });
  process.exit(1);
}

let reportBody = '';
if (app.reportPath && existsSync(join(ROOT, app.reportPath))) {
  reportBody = readFileSync(join(ROOT, app.reportPath), 'utf8').trim();
} else {
  reportBody = '[No evaluation report on disk — use tracker row and cv.md only]';
}

const materialsMode = readOptional(join(ROOT, 'modes', 'application-materials.md'), 'application-materials.md');
const contacto = readOptional(join(ROOT, 'modes', 'contacto.md'), 'contacto.md');
const cv = readOptional(join(ROOT, 'cv.md'), 'cv.md');
const profileYml = readOptional(join(ROOT, 'config', 'profile.yml'), 'profile.yml');
const profileMd = readOptional(join(ROOT, 'modes', '_profile.md'), '_profile.md');
const digest = readOptional(join(ROOT, 'article-digest.md'), 'article-digest.md');

let task;
try {
  task = phaseInstruction(phase, questions, greeting);
} catch (e) {
  emit({ ok: false, error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
}

const systemPrompt = `You are career-ops writing job application materials for one candidate.

${materialsMode}

Recruiter message rules (contacto):
${contacto.slice(0, 2500)}

Candidate CV:
${cv}

Profile YAML:
${profileYml}

Profile narrative:
${profileMd}

Optional proof digest:
${digest}

Application tracker row:
- #${app.number} ${app.company} — ${app.role}
- Status: ${app.status}
- Score: ${app.scoreRaw}
- Posting URL: ${app.jobUrl || '(none)'}
- Notes: ${app.notes || '(none)'}

Evaluation report:
${reportBody.slice(0, 120000)}

TASK:
${task}`;

process.stderr.write(`Generating ${phase} for application #${application} (${app.company})…\n`);

try {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(systemPrompt);
  const raw = result.response.text().trim();

  if (phase === 'customQuestions') {
    let items = [];
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        items = JSON.parse(jsonMatch[0]);
      } catch {
        emit({ ok: false, error: 'Model did not return valid JSON for custom questions', rawPreview: raw.slice(0, 500) });
        process.exit(1);
      }
    } else {
      emit({ ok: false, error: 'No JSON array in model response', rawPreview: raw.slice(0, 500) });
      process.exit(1);
    }
    emit({ ok: true, phase, items });
    process.exit(0);
  }

  emit({ ok: true, phase, text: raw });
  process.exit(0);
} catch (e) {
  emit({ ok: false, error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
}
