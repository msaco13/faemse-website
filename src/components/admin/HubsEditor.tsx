import { useEffect, useState } from 'react';
import { cleanHubDraft } from '../../lib/hubDraft';
import { hubBodyRead, type Loaded } from '../../lib/loadGuard';
import { supabase } from '../../lib/supabase';
import { slug as toSlug } from '../../lib/text';

// Admin → Program hubs (board, 2026-10-20): the members-only hub documents
// (`admin_documents`, shown at /hubs). The text lives only in the database,
// never in the website's code. Saving applies the board's standing rules
// for hub text (lib/hubDraft.ts) and says what it changed.

type Listing = { slug: string; title: string; summary: string | null; sort_order: number | null; updated_at: string | null };

const field = 'w-full rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-blue bg-white';
const label = 'block text-[11px] font-bold uppercase tracking-wide text-muted mb-1';

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export default function HubsEditor() {
  const [hubs, setHubs] = useState<Listing[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('admin_documents').select('slug, title, summary, sort_order, updated_at').order('sort_order', { ascending: true });
    if (error) {
      setErr(error.message);
      setHubs([]);
      return;
    }
    setErr('');
    setHubs((data ?? []) as Listing[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function addHub() {
    const title = newTitle.trim();
    if (!title) return setErr('Give the new hub a title.');
    const taken = new Set((hubs ?? []).map((h) => h.slug));
    let slug = toSlug(title);
    for (let n = 2; taken.has(slug); n++) slug = `${toSlug(title)}-${n}`;
    setAdding(true);
    const { error } = await supabase.from('admin_documents').insert({
      slug,
      title,
      summary: '',
      body: `# ${title}\n\n## First pillar\n### First topic\nText for this topic.`,
      sort_order: Math.max(0, ...(hubs ?? []).map((h) => h.sort_order ?? 0)) + 10,
      updated_at: new Date().toISOString(),
    });
    setAdding(false);
    if (error) return setErr(error.message);
    setNewTitle('');
    await load();
    setOpen(slug);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Program hubs</h2>
        <a href={`${import.meta.env.BASE_URL}hubs`} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-brand-blue hover:underline">
          View the hubs ↗
        </a>
      </div>
      <p className="text-muted text-[13.5px] mb-5 max-w-[78ch]">
        The members-only hub documents. Open one to edit it. Saving fixes misspellings of faemse.org and leaves out a draft&apos;s
        &ldquo;How to use this hub&rdquo; section, its &ldquo;Companion hub to …&rdquo; line and its byline, as the board decided.
      </p>
      {err && (
        <p className="text-brand-redink font-semibold text-[13.5px] mb-4" role="alert">
          {err}
        </p>
      )}
      {hubs === null ? (
        <p className="text-muted text-[14px]" role="status">
          Loading the hubs…
        </p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-3 mb-5">
          {hubs.map((h) => (
            <li key={h.slug} className="border border-line rounded-xl bg-white">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-[220px]">
                  <b className="block text-[15px]">{h.title}</b>
                  <span className="text-[12.5px] text-muted">
                    /hubs/{h.slug}
                    {h.updated_at ? ` · updated ${when(h.updated_at)}` : ''}
                  </span>
                </div>
                <button onClick={() => setOpen(open === h.slug ? null : h.slug)} aria-expanded={open === h.slug} className="btn-outline !py-1.5 !px-4 text-[13px]">
                  {open === h.slug ? 'Close' : 'Edit'}
                </button>
              </div>
              {open === h.slug && <HubForm hub={h} onSaved={load} />}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="block flex-1 min-w-[240px] max-w-[420px]">
          <span className={label}>New hub</span>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={field} placeholder="e.g. Preceptors Hub" maxLength={120} />
        </label>
        <button onClick={addHub} disabled={adding} className="btn-red !py-2 !px-4 text-[13px] disabled:opacity-60">
          {adding ? 'Adding…' : '+ Add a hub'}
        </button>
      </div>
    </div>
  );
}

function HubForm({ hub, onSaved }: { hub: Listing; onSaved: () => void }) {
  const [title, setTitle] = useState(hub.title);
  const [summary, setSummary] = useState(hub.summary ?? '');
  const [load, setLoad] = useState<Loaded<string>>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [body, setBody] = useState('');
  const [savedBody, setSavedBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  // Nothing on this form can be edited or saved until the hub's own text
  // has loaded: a save always writes the body, and an unloaded one is empty.
  const ready = load.state === 'loaded';

  useEffect(() => {
    // An answer that arrives after the form closed or a retry began is ignored.
    let current = true;
    setLoad({ state: 'loading' });
    supabase
      .from('admin_documents')
      .select('body')
      .eq('slug', hub.slug)
      .maybeSingle()
      .then(
        (read) => {
          if (!current) return;
          const next = hubBodyRead(read);
          if (next.state === 'loaded') {
            setBody(next.value);
            setSavedBody(next.value);
          }
          setLoad(next);
        },
        (e: unknown) => {
          if (current) setLoad({ state: 'error', message: e instanceof Error ? e.message : String(e) });
        },
      );
    return () => {
      current = false;
    };
  }, [hub.slug, attempt]);

  const dirty = ready && (body !== savedBody || title !== hub.title || summary !== (hub.summary ?? ''));

  async function save() {
    if (!ready) return;
    if (!title.trim()) return setErr('The hub needs a title.');
    const { body: clean, notes } = cleanHubDraft(body);
    setBusy(true);
    setErr('');
    setMsg('');
    const { error } = await supabase
      .from('admin_documents')
      .update({ title: title.trim(), summary: summary.trim(), body: clean, updated_at: new Date().toISOString() })
      .eq('slug', hub.slug);
    setBusy(false);
    if (error) return setErr(error.message);
    setBody(clean);
    setSavedBody(clean);
    setMsg(['Saved. Members see the new text now.', ...notes].join(' '));
    onSaved();
  }

  return (
    <div className="border-t border-line px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2 mb-3">
        <label className="block">
          <span className={label}>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!ready} className={`${field} disabled:bg-paper disabled:text-muted`} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>One-line summary (on the hub cards)</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!ready} className={`${field} disabled:bg-paper disabled:text-muted`} maxLength={200} />
        </label>
      </div>
      <p className="text-[12.5px] text-muted mb-2">
        <b># Title</b> at the top, <b>## Pillar</b> for each pillar, <b>### Topic</b> for each topic under it, and the topic&apos;s text
        below its line. A <b>## Maintenance notes</b> pillar shows to admins only.
      </p>
      {load.state === 'loading' ? (
        <p className="text-muted text-[14px]" role="status">
          Loading the text…
        </p>
      ) : load.state === 'error' ? (
        <div className="rounded-xl border border-brand-redink/30 bg-[#FDEAEB] px-4 py-3" role="alert">
          <p className="text-brand-redink font-semibold text-[13.5px]">
            The hub&apos;s text didn&apos;t load, so it can&apos;t be edited or saved right now. Nothing was changed.
          </p>
          <p className="text-[12.5px] text-body mt-1">{load.message}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="btn-outline !py-1.5 !px-4 text-[13px] mt-2.5">
            Try again
          </button>
        </div>
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${field} font-mono text-[13px] leading-relaxed min-h-[460px]`}
          aria-label={`${hub.title} text`}
          spellCheck
        />
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy || !dirty} className="btn-red !py-2 !px-5 text-[13.5px] disabled:opacity-50">
          {busy ? 'Saving…' : 'Save this hub'}
        </button>
        <a href={`${import.meta.env.BASE_URL}hubs/${hub.slug}`} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-brand-blue hover:underline">
          View it ↗
        </a>
        {msg && (
          <span className="text-[#0E7A4A] text-[13px] font-semibold" role="status">
            {msg}
          </span>
        )}
        {err && (
          <span className="text-brand-redink text-[13px] font-semibold" role="alert">
            {err}
          </span>
        )}
      </div>
    </div>
  );
}
