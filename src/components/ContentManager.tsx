import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Admin CRUD for the public site's events and news. Rendered inside the
// AdminPanel — writes are gated server-side by RLS (profiles.role = 'admin').

type DbEvent = {
  id: string;
  starts_on: string;
  title: string;
  detail: string;
  location: string;
  tag: string;
  tag_color: string;
};

type DbNews = {
  id: string;
  published_on: string;
  tag: string;
  title: string;
  excerpt: string;
};

const input =
  'mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-blue';
const label = 'block text-[11px] font-bold uppercase tracking-wide text-muted';
const TAG_COLORS = ['blue', 'red', 'green', 'gold'] as const;

// The tables ship in supabase/migrations/20260830_editable_content.sql;
// PGRST205 = table missing from the schema, i.e. the migration hasn't run.
const MISSING_TABLE = 'PGRST205';

function SetupNotice() {
  return (
    <div className="rounded-2xl border border-brand-gold/40 bg-[#FBF3D9] px-6 py-5 text-[14px] text-brand-goldink">
      <b className="block mb-1">One-time setup needed before content can be edited here.</b>
      In the Supabase dashboard for the FAEMSE WEBSITE project, open <b>SQL Editor</b>, paste the
      contents of <code>supabase/migrations/20260830_editable_content.sql</code> from the website
      repository, and press Run. This panel starts working immediately — no site redeploy needed.
    </div>
  );
}

function EventForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: DbEvent;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const row = {
      starts_on: String(data.starts_on),
      title: String(data.title).trim(),
      detail: String(data.detail ?? '').trim(),
      location: String(data.location ?? '').trim(),
      tag: String(data.tag ?? '').trim() || 'Meeting',
      tag_color: String(data.tag_color),
    };
    setSaving(true);
    setErr('');
    const q = initial
      ? supabase.from('events').update(row).eq('id', initial.id)
      : supabase.from('events').insert(row);
    const { error } = await q;
    setSaving(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <form onSubmit={onSubmit} className="bg-paper rounded-xl p-5 grid sm:grid-cols-2 gap-3">
      <label>
        <span className={label}>Date</span>
        <input name="starts_on" type="date" required defaultValue={initial?.starts_on ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Title</span>
        <input name="title" required maxLength={200} defaultValue={initial?.title ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Detail (one line under the title)</span>
        <input name="detail" maxLength={200} defaultValue={initial?.detail ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Location</span>
        <input
          name="location"
          maxLength={120}
          placeholder="e.g. Orlando, FL · or Virtual · Zoom"
          defaultValue={initial?.location ?? ''}
          className={input}
        />
      </label>
      <label>
        <span className={label}>Tag label</span>
        <input
          name="tag"
          maxLength={40}
          placeholder="Meeting, Workshop, Competition…"
          defaultValue={initial?.tag ?? ''}
          className={input}
        />
      </label>
      <label>
        <span className={label}>Tag color</span>
        <select name="tag_color" defaultValue={initial?.tag_color ?? 'blue'} className={input}>
          {TAG_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add event'}
        </button>
        <button type="button" onClick={onCancel} className="text-muted font-semibold text-[13px] hover:text-ink">
          Cancel
        </button>
        {err && (
          <span className="text-brand-red font-semibold text-[13px]" role="alert">
            {err}
          </span>
        )}
      </div>
    </form>
  );
}

function NewsForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: DbNews;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const row = {
      published_on: String(data.published_on),
      title: String(data.title).trim(),
      tag: String(data.tag ?? '').trim() || 'News',
      excerpt: String(data.excerpt ?? '').trim(),
    };
    setSaving(true);
    setErr('');
    const q = initial
      ? supabase.from('news_posts').update(row).eq('id', initial.id)
      : supabase.from('news_posts').insert(row);
    const { error } = await q;
    setSaving(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <form onSubmit={onSubmit} className="bg-paper rounded-xl p-5 grid sm:grid-cols-2 gap-3">
      <label>
        <span className={label}>Date</span>
        <input name="published_on" type="date" required defaultValue={initial?.published_on ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Tag</span>
        <input name="tag" maxLength={40} placeholder="Awards, Resources, Board…" defaultValue={initial?.tag ?? ''} className={input} />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>Headline</span>
        <input name="title" required maxLength={200} defaultValue={initial?.title ?? ''} className={input} />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>Summary (a sentence or two)</span>
        <textarea name="excerpt" rows={2} maxLength={500} defaultValue={initial?.excerpt ?? ''} className={input} />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Publish post'}
        </button>
        <button type="button" onClick={onCancel} className="text-muted font-semibold text-[13px] hover:text-ink">
          Cancel
        </button>
        {err && (
          <span className="text-brand-red font-semibold text-[13px]" role="alert">
            {err}
          </span>
        )}
      </div>
    </form>
  );
}

export default function ContentManager() {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [posts, setPosts] = useState<DbNews[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState<'event' | 'news' | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const [ev, nw] = await Promise.all([
      supabase.from('events').select('*').order('starts_on', { ascending: true }),
      supabase.from('news_posts').select('*').order('published_on', { ascending: false }),
    ]);
    const err = ev.error ?? nw.error;
    if (err) {
      if (err.code === MISSING_TABLE) setNeedsSetup(true);
      else setLoadError(err.message);
      return;
    }
    setNeedsSetup(false);
    setLoadError('');
    setEvents((ev.data ?? []) as DbEvent[]);
    setPosts((nw.data ?? []) as DbNews[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(table: 'events' | 'news_posts', id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This removes it from the public site immediately.`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setLoadError(error.message);
    else load();
  }

  function done() {
    setAdding(null);
    setEditing(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card p-8 mb-10 border-t-[3px] border-t-brand-blue/60">
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Site content</h2>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-[#1A47B8] bg-[#E7EEFF]">
          Admins only
        </span>
      </div>
      <p className="text-muted text-[14px] mb-6">
        The public calendar and news pages publish straight from here — changes go live the moment
        you save, no technical steps involved.
      </p>

      {needsSetup && <SetupNotice />}
      {loadError && (
        <p className="text-brand-red font-semibold text-[14px] mb-4" role="alert">
          {loadError}
        </p>
      )}

      {!needsSetup && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted">
              Events
            </h3>
            <button onClick={() => setAdding(adding === 'event' ? null : 'event')} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
              + Add event
            </button>
          </div>
          {adding === 'event' && <div className="mb-4"><EventForm onDone={done} onCancel={() => setAdding(null)} /></div>}
          {events.length === 0 ? (
            <p className="text-muted text-[14.5px] mb-8">
              No events yet — until the first one is added, the public site shows its sample
              calendar with a &ldquo;sample&rdquo; label.
            </p>
          ) : (
            <div className="border border-line rounded-2xl overflow-hidden mb-8">
              {events.map((ev) => (
                <div key={ev.id} className="px-5 py-4 border-b border-line last:border-b-0">
                  {editing === ev.id ? (
                    <EventForm initial={ev} onDone={done} onCancel={() => setEditing(null)} />
                  ) : (
                    <div className="grid md:grid-cols-[110px_1.6fr_1fr_auto] gap-3 items-center">
                      <span className={`text-[13.5px] font-bold ${ev.starts_on < today ? 'text-muted' : ''}`}>
                        {ev.starts_on}
                      </span>
                      <div className="min-w-0">
                        <b className="block text-[14.5px] truncate">{ev.title}</b>
                        <span className="text-[13px] text-muted truncate block">
                          {[ev.detail, ev.location].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <span className="text-[12px] font-bold uppercase tracking-wide text-muted">
                        {ev.tag} · {ev.tag_color}
                        {ev.starts_on < today ? ' · past' : ''}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(ev.id)} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
                          Edit
                        </button>
                        <button
                          onClick={() => remove('events', ev.id, ev.title)}
                          className="text-muted font-semibold text-[12.5px] hover:text-brand-red"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted">
              News
            </h3>
            <button onClick={() => setAdding(adding === 'news' ? null : 'news')} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
              + Add post
            </button>
          </div>
          {adding === 'news' && <div className="mb-4"><NewsForm onDone={done} onCancel={() => setAdding(null)} /></div>}
          {posts.length === 0 ? (
            <p className="text-muted text-[14.5px]">
              No posts yet — until the first one is published, the public site shows its sample
              posts with a &ldquo;sample&rdquo; label.
            </p>
          ) : (
            <div className="border border-line rounded-2xl overflow-hidden">
              {posts.map((p) => (
                <div key={p.id} className="px-5 py-4 border-b border-line last:border-b-0">
                  {editing === p.id ? (
                    <NewsForm initial={p} onDone={done} onCancel={() => setEditing(null)} />
                  ) : (
                    <div className="grid md:grid-cols-[110px_1.9fr_auto] gap-3 items-center">
                      <span className="text-[13.5px] font-bold">{p.published_on}</span>
                      <div className="min-w-0">
                        <b className="block text-[14.5px] truncate">{p.title}</b>
                        <span className="text-[13px] text-muted truncate block">
                          {p.tag}
                          {p.excerpt ? ` · ${p.excerpt}` : ''}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(p.id)} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
                          Edit
                        </button>
                        <button
                          onClick={() => remove('news_posts', p.id, p.title)}
                          className="text-muted font-semibold text-[12.5px] hover:text-brand-red"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
