'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import {
  loadMaterialsProvider,
  materialsProviderLabel,
  saveMaterialsProvider,
  type MaterialsProviderPref,
} from '@/lib/dashboard-prefs';
import type { ApplicationMaterials, MaterialPhase } from '@/lib/application-materials/types';

type PhaseState = { busy: boolean; err: string | null };

const PHASE_LABELS: Record<MaterialPhase, string> = {
  summary: 'Tailored summary',
  coverLetter: 'Cover letter',
  recruiterMessage: 'Recruiter message',
  customQuestions: 'Form questions',
};

const PHASE_HINTS: Record<MaterialPhase, string> = {
  summary: '2–3 paragraphs for ATS summary or LinkedIn. Uses report + cv.md.',
  coverLetter:
    '250–400 words, plain text. Optional salutation above; body generates without repeating it.',
  recruiterMessage: 'LinkedIn-style note (max 300 chars). Based on contacto rules.',
  customQuestions: 'One question per line, then Generate to answer from CV + report.',
};

function coverLetterCopyText(salutation: string, body: string): string {
  const s = salutation.trim();
  const b = body.trim();
  if (s && b) return `${s}\n\n${b}`;
  if (s) return s;
  return b;
}

function emptyPhaseState(): Record<MaterialPhase, PhaseState> {
  return {
    summary: { busy: false, err: null },
    coverLetter: { busy: false, err: null },
    recruiterMessage: { busy: false, err: null },
    customQuestions: { busy: false, err: null },
  };
}

export function ApplicationMaterialsPanel({
  applicationNumber,
  company,
  role,
  reportPath,
}: {
  applicationNumber: number;
  company: string;
  role: string;
  reportPath: string;
}) {
  const [materials, setMaterials] = useState<ApplicationMaterials | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [phaseState, setPhaseState] = useState(emptyPhaseState);
  const [provider, setProvider] = useState<MaterialsProviderPref>('cursor');

  useEffect(() => {
    setProvider(loadMaterialsProvider());
  }, []);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      const res = await fetch(`/api/applications/${applicationNumber}/materials`, {
        cache: 'no-store',
      });
      const j = (await res.json()) as { materials?: ApplicationMaterials; error?: string };
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      setMaterials(j.materials ?? null);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load materials');
      setMaterials(null);
    }
  }, [applicationNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (patch: Partial<ApplicationMaterials>) => {
      if (!materials) return;
      setSaving(true);
      setSaveMsg(null);
      try {
        const body = { ...materials, ...patch };
        const res = await fetch(`/api/applications/${applicationNumber}/materials`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const j = (await res.json()) as { materials?: ApplicationMaterials; error?: string };
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        if (j.materials) setMaterials(j.materials);
        setSaveMsg('Saved');
      } catch (e) {
        setSaveMsg(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [applicationNumber, materials],
  );

  const generate = useCallback(
    async (phase: MaterialPhase) => {
      setPhaseState((s) => ({ ...s, [phase]: { busy: true, err: null } }));
      try {
        const body: Record<string, unknown> = { phase, provider };
        if (phase === 'customQuestions' && materials) {
          body.questions = materials.customQuestionsInput;
        }
        const res = await fetch(
          `/api/applications/${applicationNumber}/materials/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );
        const j = (await res.json()) as {
          materials?: ApplicationMaterials;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        if (j.materials) setMaterials(j.materials);
      } catch (e) {
        setPhaseState((s) => ({
          ...s,
          [phase]: { busy: false, err: e instanceof Error ? e.message : 'Generate failed' },
        }));
        return;
      }
      setPhaseState((s) => ({ ...s, [phase]: { busy: false, err: null } }));
    },
    [applicationNumber, materials, provider],
  );

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  if (loadErr) {
    return (
      <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-sm text-rose-200">
        {loadErr}
      </div>
    );
  }

  if (!materials) {
    return <p className="text-xs text-muted">Loading application materials…</p>;
  }

  const renderPhase = (
    phase: MaterialPhase,
    value: string,
    onChange: (v: string) => void,
    rows: number,
    extra?: ReactNode,
    copyValue?: string,
  ) => {
    const st = phaseState[phase];
    return (
      <details
        key={phase}
        className="group rounded-lg border border-border/80 bg-row/30 open:bg-row/45">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
          <span className="text-accent">▸</span> {PHASE_LABELS[phase]}
          {value.trim() ? (
            <span className="ml-2 text-[10px] font-normal text-emerald-400/90">draft saved</span>
          ) : null}
        </summary>
        <div className="space-y-2 border-t border-border/60 px-3 pb-3 pt-2">
          <p className="text-[11px] text-muted">{PHASE_HINTS[phase]}</p>
          {extra}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={`Leave empty or click Generate for ${PHASE_LABELS[phase].toLowerCase()}…`}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-white placeholder:text-muted/70"
          />
          {phase === 'customQuestions' && materials.customQa.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-black/20 p-2">
              {materials.customQa.map((item, i) => (
                <div key={`${i}-${item.question.slice(0, 24)}`}>
                  <p className="text-[11px] font-medium text-accent">Q: {item.question}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-white/90">{item.answer}</p>
                </div>
              ))}
            </div>
          ) : null}
          {st.err ? <p className="text-[11px] text-rose-300">{st.err}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={st.busy}
              onClick={() => void generate(phase)}
              className="rounded-lg bg-accent/90 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50 hover:bg-accent">
              {st.busy ? 'Generating…' : 'Generate'}
            </button>
            {value.trim() || (copyValue ?? '').trim() ? (
              <button
                type="button"
                onClick={() => void copyText(copyValue ?? value)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-white hover:border-accent/50">
                Copy
              </button>
            ) : null}
          </div>
        </div>
      </details>
    );
  };

  return (
    <section className="rounded-lg border border-border/80 bg-row/25 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">Application materials</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Optional text for {company} — {role}. Each section is independent; skip what you do not need.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void persist(materials)}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-white hover:border-accent/50 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save all'}
        </button>
      </div>

      {!reportPath ? (
        <p className="mt-2 text-[11px] text-amber-200/90">
          No evaluation report linked — generation uses tracker row + cv.md only. Run evaluate first for richer output.
        </p>
      ) : null}

      <label className="mt-3 block text-xs">
        <span className="text-muted">Generator (same agents as job queue)</span>
        <select
          value={provider}
          onChange={(e) => {
            const p = e.target.value as MaterialsProviderPref;
            setProvider(p);
            saveMaterialsProvider(p);
          }}
          className="mt-1 w-full max-w-md rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
          <option value="claude">{materialsProviderLabel('claude')}</option>
          <option value="cursor">{materialsProviderLabel('cursor')}</option>
          <option value="gemini">{materialsProviderLabel('gemini')}</option>
        </select>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Default: <strong className="text-white/90">Claude</strong> or <strong className="text-white/90">Cursor</strong>{' '}
          headless CLI (like evaluate jobs). <strong className="text-white/90">Gemini</strong> only if you set{' '}
          <code className="text-accent">GEMINI_API_KEY</code> in <code className="text-accent">.env</code>. Generation
          can take 1–5 minutes per section.
        </p>
      </label>

      <p className="mt-2 text-[10px] text-muted">
        Stored in <code className="text-accent">data/application-materials/{applicationNumber}.json</code>.
      </p>

      {saveMsg ? <p className="mt-1 text-[11px] text-muted">{saveMsg}</p> : null}

      <div className="mt-3 space-y-2">
        {renderPhase('summary', materials.summary, (v) =>
          setMaterials((m) => (m ? { ...m, summary: v } : m)),
        8)}
        {renderPhase(
          'coverLetter',
          materials.coverLetter,
          (v) => setMaterials((m) => (m ? { ...m, coverLetter: v } : m)),
          12,
          <label className="block text-xs">
            <span className="text-muted">Salutation (optional)</span>
            <input
              type="text"
              value={materials.coverLetterSalutation}
              onChange={(e) =>
                setMaterials((m) => (m ? { ...m, coverLetterSalutation: e.target.value } : m))
              }
              placeholder="Dear Hiring Manager,"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted/70"
            />
          </label>,
          coverLetterCopyText(materials.coverLetterSalutation, materials.coverLetter),
        )}
        {renderPhase('recruiterMessage', materials.recruiterMessage, (v) =>
          setMaterials((m) => (m ? { ...m, recruiterMessage: v } : m)),
        4)}
        {renderPhase(
          'customQuestions',
          materials.customQuestionsInput,
          (v) => setMaterials((m) => (m ? { ...m, customQuestionsInput: v } : m)),
          5,
        )}
      </div>
    </section>
  );
}
