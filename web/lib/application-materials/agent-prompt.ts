import type { MaterialPhase } from '@/lib/application-materials/types';
import type { MaterialsContext } from '@/lib/application-materials/build-context';
import { contextBlock } from '@/lib/application-materials/build-context';

export function phaseTask(phase: MaterialPhase, questions: string): string {
  switch (phase) {
    case 'summary':
      return 'Write ONLY the tailored professional summary (plain text, 2-3 paragraphs). No headings, no markdown.';
    case 'coverLetter':
      return 'Write ONLY the cover letter (plain text, 250-400 words). No headings, no markdown.';
    case 'recruiterMessage':
      return 'Write ONLY the recruiter LinkedIn message. MAX 300 characters. Plain text.';
    case 'customQuestions': {
      const qs = questions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);
      if (qs.length === 0) throw new Error('Add at least one question (one per line) before generating.');
      return [
        'Answer each application form question using the report and CV.',
        'Return JSON array in the "items" field (see output contract).',
        'Questions:',
        ...qs.map((q, i) => `${i + 1}. ${q}`),
      ].join('\n');
    }
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}

export function outputContract(phase: MaterialPhase): string {
  const example =
    phase === 'customQuestions'
      ? '{"ok":true,"phase":"customQuestions","items":[{"question":"exact Q","answer":"plain answer"}]}'
      : `{"ok":true,"phase":"${phase}","text":"your plain text here"}`;
  return [
    'OUTPUT CONTRACT (mandatory):',
    'When finished, your LAST output must be exactly one JSON object between these markers:',
    '---MATERIAL_JSON---',
    example,
    '---END_MATERIAL---',
    'No markdown code fences inside the JSON. No text after ---END_MATERIAL---.',
    'Use only facts from cv.md, report, and profile — never invent metrics.',
  ].join('\n');
}

export function buildSystemPrompt(ctx: MaterialsContext): string {
  return [
    'You are career-ops generating optional application copy for ONE tracker row.',
    '',
    ctx.materialsMode,
    '',
    'Recruiter framing (contacto):',
    ctx.contacto,
    '',
    'Read modes/_profile.md for language/tone. Obey project ethics: draft only, never submit applications.',
    '',
    'Finish with the ---MATERIAL_JSON--- … ---END_MATERIAL--- block exactly as specified in the user message.',
  ].join('\n');
}

export function buildUserPrompt(
  ctx: MaterialsContext,
  phase: MaterialPhase,
  questions: string,
): string {
  const task = phaseTask(phase, questions);
  return [
    `Workspace: ${ctx.root}`,
    '',
    'Candidate + job context:',
    contextBlock(ctx),
    '',
    'TASK:',
    task,
    '',
    outputContract(phase),
  ].join('\n');
}
