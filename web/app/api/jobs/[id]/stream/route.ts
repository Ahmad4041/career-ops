import type { LogEntry } from '@/lib/jobs/store';
import { getJob, subscribeLogs } from '@/lib/jobs/store';

/** Server-Sent Events: live logs + `{ type:'terminal', status, exitCode }` when the job completes. */

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendJson = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const pushEntry = (entry: LogEntry) => sendJson({ type: 'log', entry });

      for (const e of job.logs) pushEntry(e);

      let sentTerminal = false;
      const maybeTerminal = (): boolean => {
        if (sentTerminal) return true;
        const j = getJob(id);
        if (!j || (j.status !== 'completed' && j.status !== 'failed')) return false;
        sentTerminal = true;
        sendJson({
          type: 'terminal',
          status: j.status,
          exitCode: j.exitCode ?? null,
          error: j.error ?? null,
        });
        return true;
      };

      if (maybeTerminal()) {
        controller.close();
        return;
      }

      unsubscribe = subscribeLogs(id, pushEntry);

      poll = setInterval(() => {
        if (maybeTerminal()) {
          if (poll) clearInterval(poll);
          poll = null;
          unsubscribe?.();
          unsubscribe = null;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }, 350);
    },
    cancel() {
      if (poll) clearInterval(poll);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
