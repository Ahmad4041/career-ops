'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  defaultSortDirForKey,
  filterThenSort,
  type SortDir,
  type SortKey,
} from '@/lib/applications-table-query';
import { buildTableQueryString, parseTableQueryFromUrl } from '@/lib/applications-url-query';
import { loadTableDensity, saveTableDensity, type TableDensity } from '@/lib/table-density';
import { ApplicationsStatusChips } from '@/components/applications-status-chips';
import { ApplicationsTable } from '@/components/applications-table';
import { ApplicationsToolbar } from '@/components/applications-toolbar';
import type { AppRowLite } from '@/components/application-detail-modal';
import type { JobSummary } from '@/types/jobs';
import type { AppRow, TrackerPayload as Payload } from '@/types/dashboard';

const ApplicationDetailModal = dynamic(
  () => import('@/components/application-detail-modal').then((m) => m.ApplicationDetailModal),
  { loading: () => null },
);
const QueueJobModal = dynamic(
  () => import('@/components/queue-job-modal').then((m) => m.QueueJobModal),
  { loading: () => null },
);
const ReportViewerModal = dynamic(
  () => import('@/components/report-viewer-modal').then((m) => m.ReportViewerModal),
  { loading: () => null },
);

type RunResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  careerOpsRoot: string;
  title?: string;
  pending?: boolean;
};

type CliStatus = {
  careerOpsRoot: string;
  claude: { path: string | null; available: boolean };
  cursor: { path: string | null; available: boolean };
  bash: { path: string | null; available: boolean };
};

type AgentLogEntry = {
  seq: number;
  channel: string;
  text: string;
  t: number;
};

function apiReportHref(reportPath: string): string {
  const parts = reportPath.split('/').filter(Boolean).map((p) => encodeURIComponent(p));
  return `/api/report/${parts.join('/')}`;
}

type GitJson = Record<string, unknown>;

function UpstreamGitPanel({
  status,
  error,
  busy,
  syncLog,
  onRefresh,
  onFetch,
  onSync,
}: {
  status: GitJson | null;
  error: string | null;
  busy: 'refresh' | 'fetch' | 'sync' | null;
  syncLog: string | null;
  onRefresh: () => void;
  onFetch: () => void;
  onSync: () => void;
}) {
  const mergeRef = (
    status?.upstream as { mergeRef?: string } | undefined
  )?.mergeRef;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={onRefresh}
          className="rounded-lg border border-border bg-row px-4 py-2 text-sm text-white hover:border-accent/50 disabled:opacity-40">
          {busy === 'refresh' ? 'Refreshing…' : 'Refresh status'}
        </button>
        <button
          type="button"
          disabled={busy !== null || status?.upstreamConfigured !== true}
          onClick={onFetch}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20 disabled:opacity-40">
          {busy === 'fetch' ? 'Fetching…' : 'git fetch upstream'}
        </button>
        <button
          type="button"
          disabled={busy !== null || status?.upstreamConfigured !== true || status?.mergeRefUnresolved === true}
          onClick={onSync}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40">
          {busy === 'sync' ? 'Syncing…' : 'Merge upstream into branch'}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-800/70 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      )}

      {!status && (
        <p className="text-sm text-muted">Load status with Refresh, or switch away and back.</p>
      )}

      {status && status.gitRepo === false && (
        <p className="text-sm text-muted">{String(status.hint ?? 'Not a git clone.')}</p>
      )}

      {status && status.gitRepo === true && status.upstreamConfigured === false && (
        <div className="rounded-lg border border-border bg-row/70 p-4 text-sm">
          <p className="font-medium text-white">Upstream remote missing</p>
          <p className="mt-2 text-muted">
            Add <code className="text-accent">upstream</code> pointing at the canonical repo, then fetch.
          </p>
          {(status.hintCommands as string[] | undefined)?.map((cmd) => (
            <pre
              key={cmd}
              className="mt-2 overflow-auto rounded-lg border border-border bg-black/50 p-2 font-mono text-xs text-muted">
              {cmd}
            </pre>
          ))}
          <p className="mt-2 text-xs text-muted">
            Canonical:{' '}
            <code className="text-accent">
              {(status.canonicalUpstreamUrl as string) ?? 'https://github.com/santifer/career-ops.git'}
            </code>
          </p>
        </div>
      )}

      {status?.gitRepo === true &&
        status.mergeRefUnresolved === true &&
        typeof status.message === 'string' && (
          <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 p-4 text-sm text-amber-100">
            <p>{status.message}</p>
            <p className="mt-2 text-xs text-muted">Run Fetch once remote refs exist, then Refresh.</p>
          </div>
        )}

      {status?.upstreamConfigured === true && status.mergeRefUnresolved !== true && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Current branch"
              value={typeof status.currentBranch === 'string' ? status.currentBranch : '—'}
            />
            <Stat
              label="Incoming commits"
              value={
                typeof status.behind === 'number' && status.behind >= 0 ? String(status.behind) : '—'
              }
            />
            <Stat
              label="Your commits ahead"
              value={
                typeof status.ahead === 'number' && status.ahead >= 0 ? String(status.ahead) : '—'
              }
            />
            <Stat label="Working tree" value={(status.dirty as boolean) ? 'Dirty' : 'Clean'} />
          </div>
          {mergeRef && (
            <p className="text-xs font-mono text-muted">
              Merge target reference:{' '}
              <span className="text-accent">{mergeRef}</span>
            </p>
          )}
        </>
      )}

      {(status?.incomingCommits as { hash: string; subject: string }[] | undefined)?.length ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Incoming (upstream not in your HEAD)</h3>
          <ul className="max-h-64 overflow-auto rounded-lg border border-border bg-black/40 font-mono text-xs">
            {(status!.incomingCommits as { hash: string; subject: string }[]).map((c) => (
              <li key={c.hash} className="border-b border-border/40 px-3 py-1.5 last:border-0">
                <span className="text-accent">{c.hash}</span> {c.subject}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-row/50 p-4 text-xs leading-relaxed text-muted">
        <p className="font-medium text-white">How sync works</p>
        <p className="mt-2">
          <strong className="text-white">Merge</strong> runs <code>git merge upstream/…</code> into your current branch.
          If you have local changes, the server runs <code>git stash push -u</code> before merging, then{' '}
          <code>git stash pop</code> afterward. Merge conflicts abort the merge and restore your stash; stash conflicts
          are left for you to fix in Cursor/terminal.
        </p>
        <p className="mt-2">
          For <strong className="text-white">system-only updates</strong> that avoid touching user files, prefer{' '}
          <code className="text-accent">node update-system.mjs check</code> → <code>apply</code> (see upstream docs).
        </p>
      </div>

      {syncLog?.trim() && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Last git command output</h3>
          <pre className="max-h-[40vh] overflow-auto rounded-xl border border-border bg-black/60 p-3 font-mono text-[11px] text-muted">
            {syncLog}
          </pre>
        </div>
      )}
    </div>
  );
}

function NavBtn({
  label,
  onClick,
  pending,
  disabled,
  accent,
  title,
}: {
  label: string;
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  accent?: boolean;
  title?: string;
}) {
  const off = Boolean(disabled) || Boolean(pending);
  return (
    <button
      type="button"
      title={title}
      disabled={off}
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
        accent
          ? 'border-accent/60 bg-accent/15 text-accent hover:bg-accent/25'
          : 'border-border bg-row text-white hover:border-accent/40'
      } disabled:opacity-45`}>
      {pending ? '…' : label}
    </button>
  );
}

function DashboardPageInner() {
  const [data, setData] = useState<Payload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [runCmdBusy, setRunCmdBusy] = useState<string | null>(null);
  const [ideBusy, setIdeBusy] = useState<'cursor' | 'claude-code' | null>(null);
  const [agentQueueBusy, setAgentQueueBusy] = useState(false);
  const [runOutput, setRunOutput] = useState<RunResult | null>(null);
  const [preview, setPreview] = useState<{ title: string; markdown: string } | null>(null);
  const [cli, setCli] = useState<CliStatus | null>(null);
  const [jobSummaries, setJobSummaries] = useState<JobSummary[]>([]);
  const [streamJobId, setStreamJobId] = useState<string | null>(null);
  const [streamEntries, setStreamEntries] = useState<AgentLogEntry[]>([]);
  const [jobProvider, setJobProvider] = useState<'claude' | 'cursor' | 'node'>('claude');
  const [jobNodeOp, setJobNodeOp] = useState<'portal_scan' | 'verify_pipeline' | 'merge_tracker'>('portal_scan');
  const [jobUrl, setJobUrl] = useState('');
  const [jobJd, setJobJd] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mainTab, setMainTab] = useState<'applications' | 'output' | 'upstream'>('applications');
  const [gitStatus, setGitStatus] = useState<GitJson | null>(null);
  const [gitErr, setGitErr] = useState<string | null>(null);
  const [gitBusy, setGitBusy] = useState<'refresh' | 'fetch' | 'sync' | null>(null);
  const [gitSyncLog, setGitSyncLog] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppRow | null>(null);
  const [inspectJob, setInspectJob] = useState<JobSummary | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [tableDensity, setTableDensity] = useState<TableDensity>('comfortable');
  const applicationsTableRef = useRef<HTMLElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logViewportRef = useRef<HTMLPreElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tableUrlReadyRef = useRef(false);

  useEffect(() => {
    setTableDensity(loadTableDensity());
  }, []);

  const handleDensityChange = useCallback((d: TableDensity) => {
    setTableDensity(d);
    saveTableDensity(d);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filterSearch), 280);
    return () => window.clearTimeout(t);
  }, [filterSearch]);

  const clearApplicationFilters = useCallback(() => {
    setFilterSearch('');
    setDebouncedSearch('');
    setStatusFilter('');
  }, []);

  /** Hydrate from URL on load; apply browser navigation when URL diverges from derived query string. */
  useEffect(() => {
    const qs = searchParams.toString();
    if (!tableUrlReadyRef.current) {
      const p = parseTableQueryFromUrl(searchParams);
      setFilterSearch(p.q);
      setDebouncedSearch(p.q);
      setStatusFilter(p.status);
      setSortKey(p.sortKey);
      setSortDir(p.sortDir);
      tableUrlReadyRef.current = true;
      return;
    }

    const built = buildTableQueryString({
      q: debouncedSearch,
      status: statusFilter,
      sortKey,
      sortDir,
    });
    if (qs === built) return;

    const p = parseTableQueryFromUrl(searchParams);

    if (filterSearch !== debouncedSearch) {
      setStatusFilter(p.status);
      setSortKey(p.sortKey);
      setSortDir(p.sortDir);
      return;
    }

    setFilterSearch(p.q);
    setDebouncedSearch(p.q);
    setStatusFilter(p.status);
    setSortKey(p.sortKey);
    setSortDir(p.sortDir);
    // deps: [searchParams] only — react to URL changes (including replace/back), not to local edits before replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /** Push filter/sort state into the address bar (bookmarkable). */
  useEffect(() => {
    if (!tableUrlReadyRef.current) return;
    const built = buildTableQueryString({
      q: debouncedSearch,
      status: statusFilter,
      sortKey,
      sortDir,
    });
    if (built === searchParams.toString()) return;
    router.replace(built ? `${pathname}?${built}` : pathname, { scroll: false });
  }, [debouncedSearch, statusFilter, sortKey, sortDir, pathname, router, searchParams]);

  const onSortHeaderClick = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(defaultSortDirForKey(key));
      return key;
    });
  }, []);

  const displayApplications = useMemo(() => {
    if (!data?.applications?.length) return [];
    return filterThenSort(data.applications, {
      search: debouncedSearch,
      statusNormalized: statusFilter,
      sortKey,
      sortDir,
    });
  }, [data?.applications, debouncedSearch, statusFilter, sortKey, sortDir]);

  const load = useCallback(async () => {
    setLoadErr(null);
    setRefreshing(true);
    try {
      const res = await fetch('/api/applications', { cache: 'no-store' });
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const closeApplicationModal = useCallback(() => setSelectedApp(null), []);

  const applicationModalRow = useMemo<AppRowLite | null>(() => {
    if (!selectedApp) return null;
    return {
      number: selectedApp.number,
      date: selectedApp.date,
      company: selectedApp.company,
      role: selectedApp.role,
      status: selectedApp.status,
      scoreRaw: selectedApp.scoreRaw,
      hasPdf: selectedApp.hasPdf,
      linkedPdfBasename: selectedApp.linkedPdfBasename,
      linkedHtmlBasename: selectedApp.linkedHtmlBasename,
      linkedTexBasename: selectedApp.linkedTexBasename,
      reportPath: selectedApp.reportPath,
      reportNumber: selectedApp.reportNumber,
      notes: selectedApp.notes,
      jobUrl: selectedApp.jobUrl,
    };
  }, [selectedApp]);

  const onApplicationSaved = useCallback(() => void load(), [load]);

  const openReport = useCallback(
    async (reportPath: string, title: string) => {
      try {
        const res = await fetch(apiReportHref(reportPath));
        const json = (await res.json()) as { markdown?: string; error?: string };
        if (!res.ok) throw new Error(json.error || res.statusText);
        setPreview({ title, markdown: json.markdown ?? '' });
      } catch (e) {
        setRunOutput({
          ok: false,
          exitCode: 1,
          stdout: '',
          stderr: e instanceof Error ? e.message : 'Open failed',
          careerOpsRoot: data?.careerOpsRoot ?? '',
        });
        setMainTab('output');
      }
    },
    [data?.careerOpsRoot],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refreshGitStatus = useCallback(async () => {
    setGitErr(null);
    setGitBusy('refresh');
    try {
      const res = await fetch('/api/git/status', { cache: 'no-store' });
      const j = (await res.json()) as GitJson;
      setGitStatus(j);
    } catch (e) {
      setGitErr(e instanceof Error ? e.message : 'Git status failed');
    } finally {
      setGitBusy(null);
    }
  }, []);

  useEffect(() => {
    if (mainTab !== 'upstream') return;
    void refreshGitStatus();
  }, [mainTab, refreshGitStatus]);

  const fetchUpstreamGit = useCallback(async () => {
    setGitErr(null);
    setGitBusy('fetch');
    try {
      const res = await fetch('/api/git/fetch', { method: 'POST' });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        stdout?: string;
        stderr?: string;
        exitCode?: number;
      };
      let log = '';
      if (typeof j.stderr === 'string' && j.stderr.trim()) log += j.stderr.trimEnd() + '\n';
      if (typeof j.stdout === 'string' && j.stdout.trim()) log += j.stdout.trimEnd() + '\n';
      log += `\n(fetch exit ${j.exitCode ?? '?'})`;
      setGitSyncLog(log.trim());

      if (!res.ok || !j.ok) {
        throw new Error(j.error || `fetch failed (${j.exitCode})`);
      }
      await refreshGitStatus();
    } catch (e) {
      setGitErr(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setGitBusy(null);
    }
  }, [refreshGitStatus]);

  const mergeUpstreamIntoBranch = useCallback(async () => {
    const msg =
      'Merge upstream into the current branch?\n\n' +
      '• Uncommitted work is stashed, then reapplied.\n' +
      '• If the merge conflicts, your branch is aborted and stash is popped.\n' +
      '• For system-only pulls, prefer: node update-system.mjs apply\n\n' +
      'Continue?';

    const okConfirm = typeof window !== 'undefined' && window.confirm(msg);
    if (!okConfirm) return;

    setGitErr(null);
    setGitBusy('sync');
    try {
      const res = await fetch('/api/git/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        log?: string;
      };
      if (j.log) setGitSyncLog(j.log);
      if (!j.ok || !res.ok) {
        throw new Error(j.error || 'Sync did not complete cleanly — check log and fix in terminal.');
      }
      await refreshGitStatus();
      await load();
    } catch (e) {
      setGitErr(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setGitBusy(null);
    }
  }, [refreshGitStatus, load]);

  const refreshJobList = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { jobs?: JobSummary[] };
      setJobSummaries(json.jobs ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshJobList();
    const iv = setInterval(() => void refreshJobList(), 8000);
    return () => clearInterval(iv);
  }, [refreshJobList]);

  useEffect(() => {
    if (!streamJobId) {
      setStreamEntries([]);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }
    eventSourceRef.current?.close();
    setStreamEntries([]);

    const es = new EventSource(`/api/jobs/${streamJobId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data) as
          | { type: 'log'; entry: AgentLogEntry }
          | {
              type: 'terminal';
              status: string;
              exitCode: number | null;
              error?: string | null;
            };

        if (payload.type === 'log') {
          const entry = payload.entry;
          setStreamEntries((prev) => {
            const next = [...prev.filter((row) => row.seq !== entry.seq), entry];
            next.sort((a, b) => a.seq - b.seq);
            return next;
          });
        }
        if (payload.type === 'terminal') {
          const term = payload;
          setStreamEntries((prev) => {
            const nextSeq =
              prev.length === 0 ? 1 : Math.max(...prev.map((p) => p.seq)) + 1;
            return [
              ...prev,
              {
                seq: nextSeq,
                t: Date.now(),
                channel: 'info',
                text: `— job finished: ${term.status}${term.exitCode != null ? ` (exit ${term.exitCode})` : ''}${term.error ? ` — ${term.error}` : ''} —`,
              },
            ];
          });
          es.close();
          eventSourceRef.current = null;
          void refreshJobList();
          void load();
        }
      } catch {
        /* malformed chunk */
      }
    };

    es.onerror = () => {
      setStreamEntries((prev) => {
        const nextSeq =
          prev.length === 0 ? 1 : Math.max(...prev.map((p) => p.seq)) + 1;
        return [
          ...prev,
          {
            seq: nextSeq,
            t: Date.now(),
            channel: 'stderr',
            text:
              '[stream] SSE connection closed or errored. Re-select the job, refresh the page, or open GET /api/jobs/:id for a snapshot.',
          },
        ];
      });
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [streamJobId, refreshJobList, load]);

  useEffect(() => {
    const el = logViewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [streamEntries]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/cli/status', { cache: 'no-store' });
        if (!res.ok) return;
        setCli((await res.json()) as CliStatus);
      } catch {
        /* optional */
      }
    })();
  }, []);

  async function openIde(target: 'cursor' | 'claude-code') {
    setIdeBusy(target);
    setRunOutput(null);
    try {
      const res = await fetch('/api/cli/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        command?: string;
        pid?: number;
        careerOpsRoot?: string;
      };
      if (!res.ok) {
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      setRunOutput({
        ok: true,
        exitCode: 0,
        stdout: `${target === 'cursor' ? 'Cursor' : 'Claude Code'} launch requested.${j.pid != null ? ` PID ${j.pid}` : ''}\n${j.command ?? ''}`,
        stderr: '',
        careerOpsRoot: j.careerOpsRoot ?? data?.careerOpsRoot ?? '',
        title: 'CLI launcher',
      });
      setMainTab('output');
    } catch (e) {
      setRunOutput({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Launch failed',
        careerOpsRoot: data?.careerOpsRoot ?? '',
        title: 'CLI launcher',
      });
      setMainTab('output');
    } finally {
      setIdeBusy(null);
    }
  }

  async function copyCliRecipes() {
    try {
      const res = await fetch('/api/cli/commands');
      const j = (await res.json()) as {
        terminalRecipes?: { label: string; shell: string }[];
      };
      const text = (j.terminalRecipes ?? [])
        .map((r) => `# ${r.label}\n${r.shell}`)
        .join('\n\n');
      await navigator.clipboard.writeText(text);
      setRunOutput({
        ok: true,
        exitCode: 0,
        stdout: 'Copied terminal recipes to clipboard.',
        stderr: '',
        careerOpsRoot: data?.careerOpsRoot ?? '',
        title: 'Clipboard',
      });
      setMainTab('output');
    } catch (e) {
      setRunOutput({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Copy failed',
        careerOpsRoot: '',
        title: 'Clipboard',
      });
      setMainTab('output');
    }
  }

  async function enqueueAgentJob() {
    const operation = jobProvider === 'node' ? jobNodeOp : 'evaluate_job';
    const urlTrim = jobUrl.trim();

    if (operation === 'evaluate_job') {
      if (!urlTrim.startsWith('https://')) {
        setRunOutput({
          ok: false,
          exitCode: 1,
          stdout: '',
          stderr: 'Headless evaluations need an https job posting URL.',
          careerOpsRoot: '',
          title: 'Agent job',
        });
        setMainTab('output');
        return;
      }
      const msg =
        jobProvider === 'cursor'
          ? 'Start Cursor Agent CLI (`cursor agent --print` or `cursor-agent`)? Uses your Cursor account; ensure `cursor agent` works in a terminal (and CURSOR_API_KEY or `cursor agent login`).'
          : 'Start Claude Code headless pipeline (claude -p)? This can take many minutes.';
      if (!window.confirm(msg)) return;
    } else if (!window.confirm(`Run backend node task “${operation}”?`)) {
      return;
    }

    setAgentQueueBusy(true);
    setRunOutput(null);
    try {
      const body: Record<string, unknown> = {
        provider: jobProvider,
        operation,
      };
      if (operation === 'evaluate_job') {
        body.url = urlTrim;
        const jd = jobJd.trim();
        if (jd) body.jdText = jd;
      }
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      if (!j.jobId) throw new Error('No jobId returned');
      setStreamJobId(j.jobId);
      await refreshJobList();
      setDrawerOpen(true);
      setRunOutput({
        ok: true,
        exitCode: 0,
        stdout: `Queued job ${j.jobId}. Streaming agent CLI output below (SSE).`,
        stderr: '',
        careerOpsRoot: data?.careerOpsRoot ?? '',
        title: 'Agent job queue',
      });
      setMainTab('output');
    } catch (e) {
      setRunOutput({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Job enqueue failed',
        careerOpsRoot: data?.careerOpsRoot ?? '',
        title: 'Agent job queue',
      });
      setMainTab('output');
    } finally {
      setAgentQueueBusy(false);
    }
  }

  async function runCmd(cmd: string) {
    if (cmd === 'batch-runner') {
      const okConfirm =
        typeof window !== 'undefined' &&
        window.confirm(
          'Run the full batch runner? This invokes claude -p workers and can take a long time. Prefer dry-run first.',
        );
      if (!okConfirm) return;
    }
    const rootHint = data?.careerOpsRoot ?? '';
    setRunCmdBusy(cmd);
    setRunOutput({
      ok: true,
      exitCode: -1,
      pending: true,
      stdout: `Executing “${cmd}” via /api/run…`,
      stderr: '',
      careerOpsRoot: rootHint,
      title: 'Backend command',
    });
    setMainTab('output');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      });
      const json = (await res.json()) as RunResult;
      setRunOutput({ ...json, pending: false });
      if (json.ok) await load();
    } catch (e) {
      setRunOutput({
        ok: false,
        exitCode: 1,
        pending: false,
        stdout: '',
        stderr: e instanceof Error ? e.message : 'Run failed',
        careerOpsRoot: '',
        title: 'Backend command',
      });
    } finally {
      setRunCmdBusy(null);
    }
  }

  const busyGlobal = Boolean(runCmdBusy);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface text-[var(--fg)] md:flex-row">
      {/* Left nav */}
      <aside className="flex w-full shrink-0 flex-col border-border md:w-56 md:border-r">
        <div className="border-b border-border px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Career Ops</p>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          <p className="px-1 text-[10px] uppercase tracking-wide text-muted">Repo</p>
          <NavBtn label="Refresh data" pending={refreshing} onClick={() => void load()} />
          <NavBtn
            label="Scan portals"
            pending={runCmdBusy === 'scan'}
            disabled={busyGlobal && runCmdBusy !== 'scan'}
            onClick={() => void runCmd('scan')}
            accent
          />
          <NavBtn
            label="Verify pipeline"
            pending={runCmdBusy === 'verify'}
            disabled={busyGlobal && runCmdBusy !== 'verify'}
            onClick={() => void runCmd('verify')}
          />
          <NavBtn
            label="Merge tracker"
            pending={runCmdBusy === 'merge'}
            disabled={busyGlobal && runCmdBusy !== 'merge'}
            onClick={() => void runCmd('merge')}
          />
          <NavBtn
            label="Doctor"
            pending={runCmdBusy === 'doctor'}
            disabled={busyGlobal && runCmdBusy !== 'doctor'}
            onClick={() => void runCmd('doctor')}
          />
          <NavBtn
            label="Batch dry-run"
            pending={runCmdBusy === 'batch-runner-dry-run'}
            disabled={busyGlobal && runCmdBusy !== 'batch-runner-dry-run'}
            onClick={() => void runCmd('batch-runner-dry-run')}
          />
          <NavBtn
            label="Batch runner"
            pending={runCmdBusy === 'batch-runner'}
            disabled={busyGlobal && runCmdBusy !== 'batch-runner'}
            onClick={() => void runCmd('batch-runner')}
          />

          <p className="mt-2 px-1 text-[10px] uppercase tracking-wide text-muted">Editors</p>
          <NavBtn
            label="Open Cursor"
            pending={ideBusy === 'cursor'}
            disabled={Boolean(ideBusy) && ideBusy !== 'cursor'}
            onClick={() => void openIde('cursor')}
          />
          <NavBtn
            label="Open Claude Code"
            pending={ideBusy === 'claude-code'}
            disabled={Boolean(ideBusy) && ideBusy !== 'claude-code'}
            onClick={() => void openIde('claude-code')}
          />
          <NavBtn label="Copy shell recipes" onClick={() => void copyCliRecipes()} />
          <Link
            href="/settings"
            className="block w-full rounded-lg border border-border bg-row px-3 py-2 text-left text-sm font-medium text-accent hover:border-accent/50 hover:bg-accent/10">
            Settings &amp; templates
          </Link>

          {cli && (
            <div className="mt-auto space-y-1 border-t border-border pt-3 text-[10px] text-muted">
              <CliDot ok={cli.claude.available} label="claude" />
              <CliDot ok={cli.cursor.available} label="cursor" />
              <CliDot ok={cli.bash.available} label="bash" />
            </div>
          )}
        </nav>
      </aside>

      {/* Center */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setMainTab('applications')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mainTab === 'applications' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'
            }`}>
            Applications
          </button>
          <button
            type="button"
            onClick={() => setMainTab('output')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mainTab === 'output' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'
            }`}>
            Output &amp; activity
          </button>
          <button
            type="button"
            onClick={() => setMainTab('upstream')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              mainTab === 'upstream' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'
            }`}>
            Upstream
          </button>
          {data?.careerOpsRoot && (
            <span className="hidden max-w-[40%] truncate font-mono text-[10px] text-muted lg:inline">
              {data.careerOpsRoot}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {loadErr && (
            <div className="mb-4 rounded-lg border border-amber-800/80 bg-amber-950/40 px-4 py-3 text-amber-100">
              {loadErr}
            </div>
          )}

          {mainTab === 'output' && runOutput && (
            <OutputPanel runOutput={runOutput} onDismiss={() => setRunOutput(null)} />
          )}
          {mainTab === 'output' && !runOutput && (
            <p className="text-sm text-muted">
              Scan, batch, IDE launchers, or agent enqueue output will appear here. Use{' '}
              <strong className="text-white">Applications</strong> for the tracker.
            </p>
          )}

          {mainTab === 'upstream' && (
            <UpstreamGitPanel
              status={gitStatus}
              error={gitErr}
              busy={gitBusy}
              syncLog={gitSyncLog}
              onRefresh={() => void refreshGitStatus()}
              onFetch={() => void fetchUpstreamGit()}
              onSync={() => void mergeUpstreamIntoBranch()}
            />
          )}

          {mainTab === 'applications' && data && (
            <>
              <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Applications" value={String(data.metrics.total)} />
                <Stat label="Avg score" value={data.metrics.avgScore ? data.metrics.avgScore.toFixed(2) : '—'} />
                <Stat label="Top score" value={data.metrics.topScore ? data.metrics.topScore.toFixed(2) : '—'} />
                <Stat label="With PDF" value={String(data.metrics.withPdf)} />
                <Stat label="Active (approx.)" value={String(data.metrics.actionable)} />
              </section>

              <ApplicationsStatusChips
                byStatus={data.metrics.byStatus}
                statusFilter={statusFilter}
                onToggleStatus={(s) =>
                  setStatusFilter((f) => (f === s ? '' : s))
                }
                scrollAnchorRef={applicationsTableRef}
              />

              <ApplicationsToolbar
                anchorRef={applicationsTableRef}
                filterSearch={filterSearch}
                onFilterSearchChange={setFilterSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                byStatus={data.metrics.byStatus}
                onClearFilters={clearApplicationFilters}
                showingCount={displayApplications.length}
                totalCount={data.applications.length}
                sortKey={sortKey}
                sortDir={sortDir}
                density={tableDensity}
                onDensityChange={handleDensityChange}
              />

              <ApplicationsTable
                rows={displayApplications}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSortHeaderClick}
                onRowOpen={setSelectedApp}
                onClearFilters={clearApplicationFilters}
                density={tableDensity}
              />
            </>
          )}
        </div>
      </main>

      {/* Right drawer — job queue */}
      <aside
        className={`flex shrink-0 flex-col overflow-hidden border-t border-border bg-row/45 md:border-l md:border-t-0 ${
          drawerOpen ? 'w-full md:w-[22rem]' : 'w-full md:w-11'
        }`}>
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className="flex items-center justify-between gap-2 border-b border-border px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:flex-col md:py-3">
          {drawerOpen ? (
            <>
              <span>Job queue · CLI</span>
              <span className="text-muted">◀</span>
            </>
          ) : (
            <span title="Expand job drawer" className="rotate-0 text-accent md:[writing-mode:vertical-rl]">
              Jobs ▸
            </span>
          )}
        </button>
        {drawerOpen ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
            <div className="space-y-2 rounded-lg border border-border/70 bg-black/35 p-2">
              <p className="text-[11px] text-muted">
                Queue <strong className="text-white">claude</strong>, <strong className="text-white">cursor agent</strong>
                , or <strong className="text-white">node</strong> tasks.
              </p>
              <label className="block text-[11px]">
                <span className="text-muted">Provider</span>
                <select
                  value={jobProvider}
                  onChange={(e) =>
                    setJobProvider(e.target.value as typeof jobProvider)
                  }
                  className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-white">
                  <option value="claude">Claude Code</option>
                  <option value="cursor">Cursor Agent</option>
                  <option value="node">Node scripts</option>
                </select>
              </label>
              <label className="block text-[11px]">
                <span className="text-muted">Operation</span>
                {jobProvider === 'node' ? (
                  <select
                    value={jobNodeOp}
                    onChange={(e) =>
                      setJobNodeOp(e.target.value as typeof jobNodeOp)
                    }
                    className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-white">
                    <option value="portal_scan">scan.mjs</option>
                    <option value="verify_pipeline">verify-pipeline.mjs</option>
                    <option value="merge_tracker">merge-tracker.mjs</option>
                  </select>
                ) : (
                  <select
                    disabled
                    className="mt-0.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-white">
                    <option>evaluate_job</option>
                  </select>
                )}
              </label>
              {jobProvider !== 'node' && (
                <>
                  <input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="https://… posting"
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-[11px] text-white"
                  />
                  <textarea
                    value={jobJd}
                    onChange={(e) => setJobJd(e.target.value)}
                    rows={3}
                    placeholder="Optional JD excerpt"
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[10px] text-white"
                  />
                </>
              )}
              <button
                type="button"
                disabled={agentQueueBusy || busyGlobal}
                onClick={() => void enqueueAgentJob()}
                className="w-full rounded-lg bg-accent py-2 text-xs font-semibold text-black disabled:opacity-50">
                {agentQueueBusy ? 'Queueing…' : 'Enqueue'}
              </button>
            </div>

            <div>
              <h3 className="text-[11px] font-medium uppercase text-muted">Recent</h3>
              <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-border text-[11px] font-mono text-muted">
                {jobSummaries.length === 0 && (
                  <li className="px-2 py-2 text-muted">No jobs yet.</li>
                )}
                {jobSummaries.map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectJob(j);
                      }}
                      className={`flex w-full flex-col items-start border-b border-border/50 px-2 py-1.5 text-left hover:bg-row/80 ${
                        streamJobId === j.id ? 'bg-accent/10 text-white' : ''
                      }`}>
                      <span>
                        <span className="text-accent">{j.status}</span>{' '}
                        {j.provider}/{j.operation} ·{' '}
                        {typeof j.exitCode === 'number' ? j.exitCode : '…'}{' '}
                        <span className="opacity-70">({j.logLines})</span>
                      </span>
                      <span className="mt-0.5 truncate opacity-70">{j.id}</span>
                      <span className="mt-0.5 text-[10px] text-accent/80">
                        Tap for job card
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-black/50">
              <div className="flex items-center justify-between border-b border-border px-2 py-1 text-[10px] uppercase text-muted">
                <span>Stream</span>
                <button
                  type="button"
                  className={
                    streamJobId && jobSummaries.some((x) => x.id === streamJobId)
                      ? 'text-accent hover:underline'
                      : 'pointer-events-none opacity-40'
                  }
                  disabled={!streamJobId || !jobSummaries.some((x) => x.id === streamJobId)}
                  onClick={() => {
                    const j = jobSummaries.find((x) => x.id === streamJobId);
                    if (j) setInspectJob(j);
                  }}>
                  Details
                </button>
              </div>
              <select
                value={streamJobId ?? ''}
                onChange={(e) =>
                  setStreamJobId(e.target.value ? e.target.value : null)
                }
                className="border-b border-border bg-black/70 px-2 py-1 font-mono text-[10px] text-accent">
                <option value="">Select job ↓</option>
                {jobSummaries.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.id.slice(0, 8)}… · {j.status}
                  </option>
                ))}
              </select>
              <pre
                ref={logViewportRef}
                className="min-h-[160px] flex-1 overflow-auto p-2 font-mono text-[10px] leading-relaxed text-muted">
                {streamEntries.map((ln, idx) => (
                  <div key={`${ln.seq}-${idx}`} className="break-all whitespace-pre-wrap">
                    <span
                      className={
                        ln.channel === 'stderr'
                          ? 'text-rose-300'
                          : ln.channel === 'info' || ln.channel === 'result'
                            ? 'text-cyan-200'
                            : 'text-emerald-100'
                      }>
                      [{ln.channel}]
                    </span>{' '}
                    {ln.text}
                  </div>
                ))}
                {streamJobId && streamEntries.length === 0 && (
                  <span className="text-muted">Connecting…</span>
                )}
                {!streamJobId && (
                  <span className="text-muted">
                    Pick a queued job above or enqueue a run.
                  </span>
                )}
              </pre>
            </div>
          </div>
        ) : null}
      </aside>

      <ApplicationDetailModal
        open={Boolean(selectedApp)}
        row={applicationModalRow}
        careerOpsRoot={data?.careerOpsRoot ?? ''}
        candidateSlug={data?.candidateSlug ?? null}
        onClose={closeApplicationModal}
        onSaved={onApplicationSaved}
        onViewReport={openReport}
      />

      <QueueJobModal
        job={inspectJob}
        onClose={() => setInspectJob(null)}
        onFocusStream={(id) => setStreamJobId(id)}
      />

      <ReportViewerModal
        open={Boolean(preview)}
        title={preview?.title ?? ''}
        markdown={preview?.markdown ?? ''}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] flex-col items-center justify-center gap-2 bg-surface px-4 text-center text-muted">
          <p className="text-sm text-white">Loading dashboard…</p>
          <p className="max-w-sm text-xs">Reading Applications URL state — requires JavaScript.</p>
        </div>
      }>
      <DashboardPageInner />
    </Suspense>
  );
}

function CliDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-mono">{label}</span>
      <span className={ok ? 'text-emerald-400' : 'text-amber-300'}>{ok ? 'ok' : '—'}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-row/50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function OutputPanel({
  runOutput,
  onDismiss,
}: {
  runOutput: RunResult;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        runOutput.pending
          ? 'border-sky-700/70 bg-sky-950/25'
          : runOutput.ok
            ? 'border-emerald-800/70 bg-emerald-950/30'
            : 'border-red-800/70 bg-red-950/35'
      }`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-white">
          {runOutput.title ? `${runOutput.title} · ` : ''}
          {runOutput.pending ? 'still running…' : `Exit ${runOutput.exitCode}`}
          {!runOutput.ok && !runOutput.pending && ' · see stderr'}
        </span>
        <button type="button" className="text-xs text-accent hover:underline" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      {(runOutput.stdout || runOutput.stderr) && (
        <pre className="mt-3 max-h-[50vh] overflow-auto font-mono text-xs text-muted">
          {runOutput.stdout || runOutput.stderr}
        </pre>
      )}
    </div>
  );
}
