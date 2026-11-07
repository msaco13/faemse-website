import { useEffect, useState } from 'react';
import { swapOnce } from '../../lib/hubCheck';
import { cleanHubDraft } from '../../lib/hubDraft';
import { fetchSettings, saveSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';

// Admin → Program hubs → Monthly hub check (AJ, 2026-11-07). On the 1st of
// each month the check (.claude/skills/hub-check) compares the five hubs
// with the official sources and leaves each fix here with its source. It
// never changes a hub: an admin applies a fix (as is or edited), or
// dismisses it, and the check never proposes a dismissed one again. Apply
// builds the new text with the hub editor's rules (swapOnce →
// cleanHubDraft) and saves only if the hub hasn't changed since it was
// read. An applied fix can be undone the same way.

type Item = {
  id: string;
  hub_slug: string;
  section: string;
  kind: 'rule' | 'standard' | 'date' | 'link' | 'other' | 'unverified';
  why: string;
  find_text: string | null;
  replace_text: string | null;
  applied_text: string | null;
  source_url: string;
  status: 'waiting' | 'applied' | 'dismissed' | 'stale' | 'undone';
  found_on: string;
  decided_on: string | null;
};

type Run = { ran_at: string; hubs_checked: number; facts_checked: number; proposed: number; unverified: number; skipped: number; notes: string };

const KIND: Record<string, [string, string]> = {
  rule: ['State rule', 'text-[#B8232D] bg-[#FDEAEB]'],
  standard: ['Standard', 'text-[#1A47B8] bg-[#E7EEFF]'],
  date: ['Date or fee', 'text-brand-goldink bg-[#FBF3D9]'],
  link: ['Link', 'text-[#0E7A4A] bg-[#E2F7EC]'],
  other: ['Other', 'text-muted bg-paper'],
};

function short(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the source';
  }
}

export default function HubCheckPanel({ onChanged }: { onChanged?: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [paused, setPaused] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [stale, setStale] = useState<string | null>(null);

  async function load() {
    const [i, r, h] = await Promise.all([
      supabase
        .from('hub_check_items')
        .select('id, hub_slug, section, kind, why, find_text, replace_text, applied_text, source_url, status, found_on, decided_on')
        .in('status', ['waiting', 'applied'])
        .order('created_at', { ascending: true }),
      supabase.from('hub_check_runs').select('*').order('ran_at', { ascending: false }).limit(1),
      supabase.from('admin_documents').select('slug, title'),
    ]);
    const e = i.error ?? r.error ?? h.error;
    if (e) {
      setErr(e.code === 'PGRST205' ? 'The monthly hub check is not set up on the database yet.' : e.message);
      setItems([]);
      setRun(null);
      return;
    }
    setErr('');
    setItems((i.data ?? []) as Item[]);
    setRun(((r.data ?? [])[0] as Run | undefined) ?? null);
    setTitles(Object.fromEntries(((h.data ?? []) as { slug: string; title: string }[]).map((x) => [x.slug, x.title])));
  }

  useEffect(() => {
    load();
    fetchSettings().then((s) => setPaused(Boolean(s.hub_check_paused)));
  }, []);

  async function toggle() {
    if (paused === null) return;
    setBusy('switch');
    const e = await saveSettings({ hub_check_paused: !paused });
    setBusy('');
    if (e) setErr(e);
    else setPaused(!paused);
  }

  // Read the hub as it is now, swap the text, save if nobody changed it since.
  async function swap(item: Item, from: string, to: string, rpc: 'admin_apply_hub_item' | 'admin_undo_hub_item'): Promise<string | null> {
    const { data, error } = await supabase.from('admin_documents').select('body, updated_at').eq('slug', item.hub_slug).maybeSingle();
    if (error || !data) return error?.message ?? 'That hub could not be read.';
    const s = swapOnce(data.body as string, from, to, cleanHubDraft);
    if ('problem' in s) {
      if (rpc === 'admin_apply_hub_item') setStale(item.id);
      return s.problem;
    }
    const args =
      rpc === 'admin_apply_hub_item'
        ? { p_id: item.id, p_body: s.body, p_expected: data.updated_at, p_used: s.used }
        : { p_id: item.id, p_body: s.body, p_expected: data.updated_at };
    const { error: e2 } = await supabase.rpc(rpc, args);
    return e2 ? e2.message : null;
  }

  async function apply(item: Item, text: string) {
    setBusy(item.id);
    setErr('');
    setNote('');
    setStale(null);
    const problem = await swap(item, item.find_text ?? '', text, 'admin_apply_hub_item');
    setBusy('');
    if (problem) {
      setErr(problem);
      return;
    }
    setEditing(null);
    setNote(`Applied to the ${titles[item.hub_slug] ?? item.hub_slug}. Undo is under "Applied".`);
    await load();
    onChanged?.();
  }

  async function undo(item: Item) {
    setBusy(item.id);
    setErr('');
    setNote('');
    const problem = await swap(item, item.applied_text ?? item.replace_text ?? '', item.find_text ?? '', 'admin_undo_hub_item');
    setBusy('');
    if (problem) {
      setErr(problem);
      return;
    }
    setNote(`Undone: the ${titles[item.hub_slug] ?? item.hub_slug} is back the way it was.`);
    await load();
    onChanged?.();
  }

  async function mark(item: Item, status: 'dismissed' | 'stale') {
    setBusy(item.id);
    setErr('');
    setNote('');
    setStale(null);
    const { error } = await supabase.rpc('admin_set_hub_item', { p_id: item.id, p_status: status });
    setBusy('');
    if (error) {
      setErr(error.message);
      return;
    }
    setNote(status === 'dismissed' ? "Dismissed. The check won't propose it again." : 'Marked as no longer fitting the hub.');
    setItems((xs) => (xs ?? []).filter((x) => x.id !== item.id));
  }

  const fixes = (items ?? []).filter((i) => i.status === 'waiting' && i.kind !== 'unverified');
  const notes = (items ?? []).filter((i) => i.status === 'waiting' && i.kind === 'unverified');
  const applied = (items ?? []).filter((i) => i.status === 'applied');
  const pill = 'rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-bold disabled:opacity-60';

  return (
    <section className="card p-6 mb-8 border-t-[3px] border-t-brand-blue/60" aria-labelledby="hub-check-title">
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <div className="flex-1 min-w-[240px]">
          <h2 id="hub-check-title" className="font-disp font-bold uppercase text-2xl">
            Monthly hub check
          </h2>
          <p className="text-muted text-[13.5px] max-w-[76ch] mt-1">
            On the 1st of each month the check compares every rule citation, standard, fee, deadline, form number and link in
            the five hubs with the official sources: CoAEMSP, CAAHEP, the National Registry, Florida DOH, flrules.org and the
            Florida DOE paramedic framework. It never changes a hub. Each fix waits here with its source until you apply, edit
            or dismiss it. While held, it changes nothing.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={busy === 'switch' || paused === null}
          aria-pressed={paused === false}
          className={`rounded-full px-5 py-2 text-[13px] font-bold border transition-colors disabled:opacity-60 ${
            paused === false ? 'bg-[#0E7A4A] border-[#0E7A4A] text-white' : 'bg-white border-line text-muted hover:border-ink'
          }`}
        >
          {paused === null ? '…' : paused ? 'Held' : 'Running'}
        </button>
      </div>

      {err && (
        <p className="text-brand-redink font-semibold text-[13px] mb-3" role="alert">
          {err}
        </p>
      )}
      {note && (
        <p className="text-[#0E7A4A] font-semibold text-[13px] mb-3" role="status">
          {note}
        </p>
      )}

      <div className="bg-paper rounded-xl p-4 mb-5 text-[14px]">
        {run === undefined ? (
          <span className="text-muted">Loading the last check…</span>
        ) : run === null ? (
          <span className="text-muted">The hub check hasn&apos;t run yet.</span>
        ) : (
          <>
            <b>
              Last check:{' '}
              {new Date(run.ran_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            </b>{' '}
            {run.hubs_checked} hub{run.hubs_checked === 1 ? '' : 's'}, {run.facts_checked} facts checked: <b>{run.proposed} fixes proposed</b>,{' '}
            {run.unverified} couldn&apos;t be verified.
            {run.notes && <span className="block text-muted mt-1">{run.notes}</span>}
          </>
        )}
      </div>

      <h3 className="font-disp font-bold uppercase text-[17px] tracking-[0.06em] mb-2">Proposed fixes ({fixes.length})</h3>
      {items === null ? null : fixes.length === 0 ? (
        <p className="text-muted text-[14px] mb-5">Nothing waiting.</p>
      ) : (
        <ul className="grid gap-3 mb-5">
          {fixes.map((it) => (
            <li key={it.id} className="border border-line rounded-xl p-4 grid gap-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className={`text-[11px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full ${KIND[it.kind]?.[1] ?? ''}`}>{KIND[it.kind]?.[0] ?? it.kind}</span>
                <b className="text-[14.5px]">{titles[it.hub_slug] ?? it.hub_slug}</b>
                {it.section && <span className="text-muted text-[13px]">· {it.section}</span>}
              </div>
              <p className="text-[14px]">{it.why}</p>
              <div className="grid md:grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-[#FDEAEB] px-3 py-2.5 text-[13.5px]">
                  <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-muted mb-1">Now in the hub</span>
                  <span className="whitespace-pre-wrap line-through decoration-[#B8232D]/60">{it.find_text}</span>
                </div>
                <div className="rounded-lg bg-[#E2F7EC] px-3 py-2.5 text-[13.5px]">
                  <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-muted mb-1">Proposed</span>
                  <span className="whitespace-pre-wrap">{it.replace_text}</span>
                </div>
              </div>
              {it.source_url && (
                <span className="text-[12.5px] text-muted">
                  Source:{' '}
                  <a href={it.source_url} target="_blank" rel="noreferrer" className="text-brand-blue font-semibold hover:underline">
                    {host(it.source_url)}
                  </a>
                  , read {short(it.found_on)}.
                </span>
              )}
              {editing === it.id ? (
                <div className="grid gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-muted" htmlFor={`fix-${it.id}`}>
                    Your version
                  </label>
                  <textarea
                    id={`fix-${it.id}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-blue"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy === it.id} onClick={() => apply(it, draft)} className={`${pill} !text-white !bg-[#0E7A4A] !border-[#0E7A4A]`}>
                      Apply my version
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={pill}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy === it.id} onClick={() => apply(it, it.replace_text ?? '')} className={`${pill} !text-white !bg-[#0E7A4A] !border-[#0E7A4A]`}>
                    Apply
                  </button>
                  <button
                    type="button"
                    disabled={busy === it.id}
                    onClick={() => {
                      setEditing(it.id);
                      setDraft(it.replace_text ?? '');
                    }}
                    className={`${pill} hover:border-ink`}
                  >
                    Edit first
                  </button>
                  <button type="button" disabled={busy === it.id} onClick={() => mark(it, 'dismissed')} className={`${pill} text-brand-redink hover:border-brand-redink`}>
                    Dismiss
                  </button>
                  {stale === it.id && (
                    <button type="button" disabled={busy === it.id} onClick={() => mark(it, 'stale')} className={`${pill} hover:border-ink`}>
                      Mark as no longer fitting
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="font-disp font-bold uppercase text-[17px] tracking-[0.06em] mb-2">Couldn&apos;t verify ({notes.length})</h3>
      {items === null ? null : notes.length === 0 ? (
        <p className="text-muted text-[14px] mb-5">Nothing open.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line mb-5">
          {notes.map((it) => (
            <li key={it.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-[220px] text-[13.5px]">
                <b>{titles[it.hub_slug] ?? it.hub_slug}</b>
                {it.section && <span className="text-muted"> · {it.section}</span>}
                <span className="block mt-0.5">{it.why}</span>
                {it.source_url && (
                  <a href={it.source_url} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-blue font-semibold hover:underline">
                    {host(it.source_url)}
                  </a>
                )}
              </div>
              <button type="button" disabled={busy === it.id} onClick={() => mark(it, 'dismissed')} className={`${pill} hover:border-ink`}>
                Got it
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className="font-disp font-bold uppercase text-[17px] tracking-[0.06em] mb-2">Applied ({applied.length})</h3>
      {items === null ? null : applied.length === 0 ? (
        <p className="text-muted text-[14px]">None yet.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line">
          {applied.map((it) => (
            <li key={it.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-[220px] text-[13.5px]">
                <b>{titles[it.hub_slug] ?? it.hub_slug}</b>
                {it.section && <span className="text-muted"> · {it.section}</span>}
                <span className="block mt-0.5 whitespace-pre-wrap">{it.applied_text ?? it.replace_text}</span>
                <span className="block text-muted text-[12.5px]">Applied {it.decided_on ? short(it.decided_on) : ''}</span>
              </div>
              <button type="button" disabled={busy === it.id} onClick={() => undo(it)} className={`${pill} hover:border-ink`}>
                Undo
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
