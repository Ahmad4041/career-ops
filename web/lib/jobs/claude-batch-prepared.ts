import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';
import { nextReportNumber } from '@/lib/next-report-number';
import { substituteBatchPrompt } from '@/lib/substitute-batch-prompt';

export type PreparedBatchEval = {
  root: string;
  reportNum: string;
  batchId: string;
  date: string;
  jdPath: string;
  tmpBase: string;
  resolvedPromptPath: string;
  userMessage: string;
  cleanup: () => Promise<void>;
};

export type PreparedClaudeBatch = PreparedBatchEval & {
  claudeBin: string;
  args: string[];
};

/** Shared batch prep for dashboard evaluate jobs (Claude + Cursor). */
export async function prepareBatchEval(opts: {
  url: string;
  jdText?: string;
}): Promise<PreparedBatchEval> {
  const root = getCareerOpsRoot();
  const promptTemplatePath = path.join(root, 'batch', 'batch-prompt.md');
  if (!fs.existsSync(promptTemplatePath)) {
    throw new Error(`Missing batch-prompt.md at ${promptTemplatePath}`);
  }

  const reportNum = nextReportNumber(root);
  const date = new Date().toISOString().slice(0, 10);
  const batchId = `web-job-${Date.now()}`;
  const tmpBase = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'career-ops-web-'));

  const template = await fsPromises.readFile(promptTemplatePath, 'utf8');
  const jdPath = path.join(tmpBase, 'jd-web.txt');
  const jdPayload = opts.jdText?.trim() ?? '';
  await fsPromises.writeFile(jdPath, jdPayload, 'utf8');

  const resolvedMd = substituteBatchPrompt(template, {
    URL: opts.url.trim(),
    JD_FILE: jdPath,
    REPORT_NUM: reportNum,
    DATE: date,
    ID: batchId,
  });
  const resolvedPromptPath = path.join(tmpBase, 'resolved-batch-prompt.md');
  await fsPromises.writeFile(resolvedPromptPath, resolvedMd, 'utf8');

  const userMessage = [
    'Process this job posting. Run the full pipeline: A–G evaluation + report .md + PDF + tracker TSV line.',
    `URL: ${opts.url.trim()}`,
    `JD file: ${jdPath}`,
    `Report number: ${reportNum}`,
    `Date: ${date}`,
    `Batch ID: ${batchId}`,
    '',
    'You MUST write files to disk (not chat-only):',
    `- reports/${reportNum}-<company-slug>-${date}.md`,
    `- batch/tracker-additions/${reportNum}-<company-slug>.tsv`,
    '- tailored HTML under output/ + PDF via generate-pdf.mjs when score warrants it',
  ].join('\n');

  return {
    root,
    reportNum,
    batchId,
    date,
    jdPath,
    tmpBase,
    resolvedPromptPath,
    userMessage,
    cleanup: async () => {
      try {
        await fsPromises.rm(tmpBase, { recursive: true, force: true });
      } catch {
        /* noop */
      }
    },
  };
}

/** Build claude CLI args identical to batch/batch-runner worker (sans log redirect). */
export async function prepareClaudeBatchEval(
  claudeBin: string,
  opts: {
    url: string;
    jdText?: string;
  },
): Promise<PreparedClaudeBatch> {
  const prepared = await prepareBatchEval(opts);
  const args = [
    '-p',
    '--dangerously-skip-permissions',
    '--append-system-prompt-file',
    prepared.resolvedPromptPath,
    prepared.userMessage,
  ];

  return {
    ...prepared,
    claudeBin,
    args,
  };
}

export async function buildCursorBatchPrompt(opts: { url: string; jdText?: string }): Promise<PreparedBatchEval> {
  return prepareBatchEval(opts);
}
