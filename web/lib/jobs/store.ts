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
  archived?: boolean;
};

/**
 * In-memory job queue. Must live on `globalThis` so every Next.js / Turbopack
 * route bundle shares one Map — otherwise POST /api/jobs and GET /api/jobs/[id]
 * can each get an empty store when dynamic routes compile on first request.
 */
type JobStoreState = {
  jobs: Map<string, JobRecord>;
  subscribers: Map<string, Set<(entry: LogEntry) => void>>;
};

const STORE_KEY = Symbol.for('career-ops.job-store');

function jobStoreState(): JobStoreState {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: JobStoreState };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      jobs: new Map(),
      subscribers: new Map(),
    };
  }
  return g[STORE_KEY];
}

const jobs = jobStoreState().jobs;
const subscribers = jobStoreState().subscribers;

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

export function listJobs(limit = 50, opts: { includeArchived?: boolean } = {}): JobRecord[] {
  const includeArchived = opts.includeArchived === true;
  return [...jobs.values()]
    .filter((j) => includeArchived || !j.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function deleteJob(id: string): boolean {
  const existed = jobs.delete(id);
  subscribers.delete(id);
  return existed;
}

export function archiveJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.archived = true;
  job.updatedAt = Date.now();
  return true;
}

export function unarchiveJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.archived = false;
  job.updatedAt = Date.now();
  return true;
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
