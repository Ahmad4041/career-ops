/** Browser-only dashboard UX preferences (localStorage). */

export type JobQueueConfirmMode = 'bypass' | 'ask';

const JOB_QUEUE_CONFIRM_KEY = 'careerOpsJobQueueConfirm';

const DEFAULT_JOB_QUEUE_CONFIRM: JobQueueConfirmMode = 'bypass';

export function loadJobQueueConfirm(): JobQueueConfirmMode {
  if (typeof window === 'undefined') return DEFAULT_JOB_QUEUE_CONFIRM;
  try {
    const v = window.localStorage.getItem(JOB_QUEUE_CONFIRM_KEY);
    if (v === 'ask' || v === 'bypass') return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_JOB_QUEUE_CONFIRM;
}

export function saveJobQueueConfirm(mode: JobQueueConfirmMode): void {
  try {
    window.localStorage.setItem(JOB_QUEUE_CONFIRM_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** When true, `enqueueAgentJob` shows `window.confirm` before POST /api/jobs. */
export function shouldConfirmBeforeEnqueue(): boolean {
  return loadJobQueueConfirm() === 'ask';
}

export function jobQueueConfirmLabel(mode: JobQueueConfirmMode): string {
  return mode === 'bypass' ? 'Bypass (start immediately)' : 'Ask before starting';
}
