'use client';

import { useCallback, useEffect, useState } from 'react';

type LanguageModeOption = {
  code: string;
  modesDir: string;
  label: string;
};

type LanguageModesPayload = {
  modesDir: string | null;
  profileExists: boolean;
  options: LanguageModeOption[];
  error?: string;
};

function optionValue(opt: LanguageModeOption): string | null {
  return opt.code === 'en' ? null : opt.modesDir;
}

function isSelected(opt: LanguageModeOption, current: string | null): boolean {
  if (opt.code === 'en') return current === null;
  return current === opt.modesDir;
}

export function LanguageModesPicker({ onProfileUpdated }: { onProfileUpdated?: () => void }) {
  const [options, setOptions] = useState<LanguageModeOption[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/settings/language-modes', { cache: 'no-store' });
      const j = (await res.json()) as LanguageModesPayload;
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      setOptions(j.options ?? []);
      setCurrent(j.modesDir ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load language modes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const select = useCallback(
    async (opt: LanguageModeOption) => {
      const next = optionValue(opt);
      if (isSelected(opt, current) || saving) return;
      setSaving(true);
      setErr(null);
      setToast(null);
      try {
        const res = await fetch('/api/settings/language-modes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modesDir: next }),
        });
        const j = (await res.json()) as { ok?: boolean; modesDir?: string | null; error?: string; profileCreated?: boolean };
        if (!res.ok) throw new Error(j.error ?? res.statusText);
        setCurrent(j.modesDir ?? null);
        const created = j.profileCreated ? ' Created config/profile.yml.' : '';
        setToast(`Saved language.modes_dir.${created}`);
        onProfileUpdated?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [current, saving, onProfileUpdated],
  );

  return (
    <section className="mb-4 rounded-lg border border-border bg-row/40 p-3">
      <h2 className="text-[10px] font-medium uppercase tracking-wide text-muted">Language modes</h2>
      <p className="mt-1 text-[11px] leading-snug text-muted">
        Sets <code className="text-accent">language.modes_dir</code> in{' '}
        <code className="text-accent">config/profile.yml</code>. Agents read translated modes from that folder (e.g.{' '}
        <code className="text-accent">modes/de</code> for DACH German).
      </p>
      {loading ? <p className="mt-2 text-xs text-muted">Loading…</p> : null}
      {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}
      {!loading && options.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Language modes directory">
          {options.map((opt) => {
            const active = isSelected(opt, current);
            return (
              <button
                key={opt.code}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={saving}
                onClick={() => void select(opt)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  active
                    ? 'border-accent/60 bg-accent/20 text-white'
                    : 'border-border text-muted hover:border-accent/40 hover:text-white'
                }`}>
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {toast ? <p className="mt-2 text-xs text-emerald-300">{toast}</p> : null}
      <p className="mt-2 text-[10px] leading-snug text-muted">
        English uses default <code className="text-accent">modes/</code>. Only locale folders present under{' '}
        <code className="text-accent">modes/</code> on disk are listed.
      </p>
    </section>
  );
}
