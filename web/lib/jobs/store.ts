import { randomUUID } from 'crypto';

export type LogChannel = 'stdout' | 'stderr' | 'info' | 'result';

export type LogEntry = {
  seq: number;
  t: number;
  channel: LogChannel;
  text: string;
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type JobRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  operation: string;
  provider: string;
  status: JobStatus;
  exitCode?: number | null;
  meta: Record<string, unknown>;
  logs: LogEntry[];
  error?: string;
};

const jobs = new Map<string, JobRecord>();
const subscribers = new Map<string, Set<(entry: LogEntry) => void>>();

const MAX_JOBS = 100;

function pruneIfNeeded(): void {
  if (jobs.size <= MAX_JOBS) return;
  const list = [...jobs.values()]
    .filter((j) => j.status === 'completed' || j.status === 'failed')
    .sort((a, b) => a.updatedAt - b.updatedAt);
  const over = jobs.size - MAX_JOBS + 10;
  for (let i = 0; i < over && i < list.length; i++) {
    const id = list[i].id;
    jobs.delete(id);
    subscribers.delete(id);
  }
}

export function createJob(provider: string, operation: string, meta: Record<string, unknown> = {}): string {
  pruneIfNeeded();
  const id = randomUUID();
  const now = Date.now();
  jobs.set(id, {
    id,
    provider,
    operation,
    createdAt: now,
    updatedAt: now,
    status: 'queued',
    meta,
    logs: [],
  });
  return id;
}

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function listJobs(limit = 50): JobRecord[] {
  return [...jobs.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
}

export function setJobStatus(id: string, status: JobStatus, exitCode?: number | null, error?: string): void {
  const job = jobs.get(id);
  if (!job) return;
  job.status = status;
  job.updatedAt = Date.now();
  if (exitCode !== undefined) job.exitCode = exitCode ?? null;
  if (error !== undefined) job.error = error;
}

export function appendLog(jobId: string, channel: LogChannel, text: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  const entry: LogEntry = {
    seq: job.logs.length + 1,
    t: Date.now(),
    channel,
    text,
  };
  job.logs.push(entry);
  job.updatedAt = Date.now();
  const subs = subscribers.get(jobId);
  subs?.forEach((fn) => {
    fn(entry);
  });
}

export function subscribeLogs(jobId: string, listener: (entry: LogEntry) => void): () => void {
  let set = subscribers.get(jobId);
  if (!set) {
    set = new Set();
    subscribers.set(jobId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) subscribers.delete(jobId);
  };
}
