import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';

import { getCareerOpsRoot } from '@/lib/root';
import { nextReportNumber } from '@/lib/next-report-number';
import { substituteBatchPrompt } from '@/lib/substitute-batch-prompt';

export type PreparedClaudeBatch = {
  root: string;
  claudeBin: string;
  args: string[];
  reportNum: string;
  batchId: string;
  tmpBase: string;
  cleanup: () => Promise<void>;
};

/** Build claude CLI args identical to batch/batch-runner worker (sans log redirect). */
export async function prepareClaudeBatchEval(
  claudeBin: string,
  opts: {
    url: string;
    jdText?: string;
  },
): Promise<PreparedClaudeBatch> {
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
    'Procesa esta oferta de empleo. Ejecuta el pipeline completo: evaluación A-F + report .md + PDF + tracker line.',
    `URL: ${opts.url.trim()}`,
    `JD file: ${jdPath}`,
    `Report number: ${reportNum}`,
    `Date: ${date}`,
    `Batch ID: ${batchId}`,
  ].join('\n');

  const args = [
    '-p',
    '--dangerously-skip-permissions',
    '--append-system-prompt-file',
    resolvedPromptPath,
    userMessage,
  ];

  return {
    root,
    claudeBin,
    args,
    reportNum,
    batchId,
    tmpBase,
    cleanup: async () => {
      try {
        await fsPromises.rm(tmpBase, { recursive: true, force: true });
      } catch {
        /* noop */
      }
    },
  };
}
