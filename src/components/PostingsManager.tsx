import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Admin CRUD for the brief's posting types: jobs, classes, Q&A entries,
// teaching videos, and the member library. One config-driven panel instead of
// five hand-rolled ones — a new content type is a new entry in SECTIONS.
// Writes are gated server-side by RLS (is_admin()).
//
// Expired rows stay listed here (hide, don't delete): the public site drops
// them automatically on their end date, and a recurring class or job gets
// reposted by editing the dates instead of retyped.

type Row = Record<string, unknown> & { id: string };

type Field = {
  name: string;
  label: string;
  type: 'date' | 'text' | 'textarea' | 'number' | 'tags' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  span?: boolean; // full-width in the two-column form grid
  nullable?: boolean; // clearing the field on edit stores NULL (column allows it)
};

type Section = {
  table: string;
  title: string;
  addLabel: string;
  emptyNote: string;
  orderBy: { column: string; ascending: boolean };
  expiresKey?: string;
  fields: Field[];
  summary: (r: Row) => { date: string; primary: string; secondary: string };
};

const s = (r: Row, k: string) => String(r[k] ?? '');

const SECTIONS: Section[] = [
  {
    table: 'spotlights',
    title: 'Homepage spotlights',
    addLabel: '+ Add spotlight',
    emptyNote: 'No spotlights yet — the homepage falls back to its evergreen set. Add award winners, schools, instructors, lab work, or the next meeting.',
    orderBy: { column: 'sort_order', ascending: true },
    expiresKey: 'expires_on',
    fields: [
      { name: 'kicker', label: 'Kicker (small gold line above the headline)', type: 'text', placeholder: 'Educator of the Year · Next meeting · Program spotlight' },
      { name: 'sort_order', label: 'Order (lower shows first)', type: 'number' },
      { name: 'title', label: 'Headline (keep it under ~60 characters)', type: 'text', required: true, span: true },
      { name: 'body', label: 'One or two sentences', type: 'textarea', span: true },
      { name: 'image_url', label: 'Photo link (optional — becomes the backdrop)', type: 'text', placeholder: 'https://…' },
      { name: 'link_url', label: 'Button link (/events, /about, or https://…)', type: 'text' },
      { name: 'link_label', label: 'Button text', type: 'text', placeholder: 'See the calendar' },
      { name: 'starts_on', label: 'Show from', type: 'date' },
      { name: 'expires_on', label: 'Stop showing after (optional)', type: 'date', nullable: true },
    ],
    summary: (r) => ({
      date: `#${s(r, 'sort_order')}`,
      primary: s(r, 'title'),
      secondary: [s(r, 'kicker'), s(r, 'expires_on') ? `until ${s(r, 'expires_on')}` : 'no end date'].filter(Boolean).join(' · '),
    }),
  },
  {
    table: 'jobs',
    title: 'Job board',
    addLabel: '+ Add job',
    emptyNote: 'No jobs yet — until the first real posting, the public board shows labeled samples.',
    orderBy: { column: 'posted_on', ascending: false },
    expiresKey: 'expires_on',
    fields: [
      { name: 'title', label: 'Position title', type: 'text', required: true },
      { name: 'employer', label: 'Employer', type: 'text' },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'City, FL' },
      { name: 'expires_on', label: 'Listing comes down after', type: 'date', required: true },
      { name: 'apply_url', label: 'Application link (optional)', type: 'text', placeholder: 'https://…' },
      { name: 'posted_on', label: 'Posted on', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', span: true },
    ],
    summary: (r) => ({
      date: s(r, 'expires_on'),
      primary: s(r, 'title'),
      secondary: [s(r, 'employer'), s(r, 'location')].filter(Boolean).join(' · '),
    }),
  },
  {
    table: 'class_listings',
    title: 'Class board',
    addLabel: '+ Add class',
    emptyNote: 'No classes yet — until the first real listing, the public board shows labeled samples.',
    orderBy: { column: 'expires_on', ascending: true },
    expiresKey: 'expires_on',
    fields: [
      { name: 'title', label: 'Class / cohort', type: 'text', required: true },
      { name: 'provider', label: 'School or provider', type: 'text' },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'City, FL' },
      { name: 'starts_on', label: 'Start date (optional)', type: 'date', nullable: true },
      { name: 'expires_on', label: 'Listing comes down after', type: 'date', required: true },
      { name: 'contact', label: 'Contact (email or link)', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', span: true },
    ],
    summary: (r) => ({
      date: s(r, 'expires_on'),
      primary: s(r, 'title'),
      secondary: [s(r, 'provider'), s(r, 'location')].filter(Boolean).join(' · '),
    }),
  },
  {
    table: 'qa_entries',
    title: 'Q&A archive',
    addLabel: '+ Add entry',
    emptyNote: 'No entries yet — distill a good listserv thread into a question and one clean answer.',
    orderBy: { column: 'published_on', ascending: false },
    fields: [
      { name: 'topic', label: 'Topic', type: 'text', placeholder: 'Clinical, Teaching, Program Director…' },
      { name: 'published_on', label: 'Published on', type: 'date' },
      { name: 'published', label: 'Published (unchecked = draft, visible to admins only)', type: 'checkbox', span: true },
      { name: 'question', label: 'The question', type: 'textarea', required: true, span: true },
      { name: 'answer', label: 'The distilled answer (members-only)', type: 'textarea', required: true, span: true },
    ],
    summary: (r) => ({
      date: s(r, 'published_on'),
      primary: s(r, 'question'),
      secondary: r.published === false ? `${s(r, 'topic')} · DRAFT — not public yet` : s(r, 'topic'),
    }),
  },
  {
    table: 'teaching_videos',
    title: 'Teaching videos',
    addLabel: '+ Add video',
    emptyNote: 'No videos yet — paste a YouTube or Vimeo link; playback stays members-only.',
    orderBy: { column: 'published_on', ascending: false },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'presenter', label: 'Presenter', type: 'text' },
      { name: 'topic', label: 'Topic', type: 'text', placeholder: 'Skills lab, Classroom, Clinical…' },
      { name: 'minutes', label: 'Length (minutes)', type: 'number' },
      { name: 'video_url', label: 'YouTube / Vimeo link', type: 'text', required: true, placeholder: 'https://youtu.be/…' },
      { name: 'published_on', label: 'Published on', type: 'date' },
      { name: 'description', label: 'One-line description', type: 'textarea', span: true },
    ],
    summary: (r) => ({
      date: s(r, 'published_on'),
      primary: s(r, 'title'),
      secondary: [s(r, 'presenter'), s(r, 'topic')].filter(Boolean).join(' · '),
    }),
  },
  {
    table: 'library_resources',
    title: 'Member library',
    addLabel: '+ Add resource',
    emptyNote: 'Nothing shelved yet — link documents and references; members see them on their portal page.',
    orderBy: { column: 'published_on', ascending: false },
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'url', label: 'Link (document or page)', type: 'text', required: true, placeholder: 'https://…' },
      { name: 'tags', label: 'Tags (comma-separated)', type: 'tags', placeholder: 'clinical, skills lab, program director' },
      { name: 'published_on', label: 'Added on', type: 'date' },
      { name: 'description', label: 'One-line description', type: 'textarea', span: true },
    ],
    summary: (r) => ({
      date: s(r, 'published_on'),
      primary: s(r, 'title'),
      secondary: Array.isArray(r.tags) ? (r.tags as string[]).join(', ') : '',
    }),
  },
];

const input =
  'mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-blue';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-muted';
const MISSING_TABLE = 'PGRST205';

function SetupNotice() {
  return (
    <div className="rounded-2xl border border-brand-gold/40 bg-[#FBF3D9] px-6 py-5 text-[14px] text-brand-goldink">
      <b className="block mb-1">One-time setup needed before these boards can be edited here.</b>
      In the Supabase dashboard for the FAEMSE WEBSITE project, open <b>SQL Editor</b>, paste the
      contents of <code>supabase/migrations/20260901_brief_features.sql</code> from the website
      repository, and press Run. This panel starts working immediately — no site redeploy needed.
    </div>
  );
}

function RowForm({
  section,
  initial,
  onDone,
  onCancel,
}: {
  section: Section;
  initial?: Row;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const row: Record<string, unknown> = {};
    for (const f of section.fields) {
      const raw = String(data.get(f.name) ?? '').trim();
      if (f.type === 'tags') {
        row[f.name] = raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];
      } else if (f.type === 'checkbox') {
        row[f.name] = data.get(f.name) === 'on';
      } else if (f.type === 'number') {
        row[f.name] = raw === '' ? null : Number(raw);
      } else if (f.type === 'date') {
        // Empty dates: leave the column default (insert) or existing value
        // (edit) alone, except explicitly-nullable dates, which clear to NULL.
        if (raw !== '') row[f.name] = raw;
        else if (initial && f.nullable) row[f.name] = null;
      } else {
        row[f.name] = raw;
      }
    }
    setSaving(true);
    setErr('');
    const q = initial
      ? supabase.from(section.table).update(row).eq('id', initial.id)
      : supabase.from(section.table).insert(row);
    const { error } = await q;
    setSaving(false);
    if (error) setErr(error.message);
    else onDone();
  }

  return (
    <form onSubmit={onSubmit} className="bg-paper rounded-xl p-5 grid sm:grid-cols-2 gap-3">
      {section.fields.map((f) => {
        const initialVal = initial
          ? f.type === 'tags' && Array.isArray(initial[f.name])
            ? (initial[f.name] as string[]).join(', ')
            : String(initial[f.name] ?? '')
          : '';
        if (f.type === 'checkbox') {
          return (
            <label key={f.name} className={`flex items-center gap-2.5 text-[14px] font-semibold ${f.span ? 'sm:col-span-2' : ''}`}>
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={initial ? initial[f.name] !== false : true}
                className="w-4 h-4 accent-[#2F6BFF]"
              />
              {f.label}
            </label>
          );
        }
        return (
          <label key={f.name} className={f.span ? 'sm:col-span-2' : undefined}>
            <span className={labelCls}>{f.label}</span>
            {f.type === 'textarea' ? (
              <textarea
                name={f.name}
                rows={f.name === 'answer' ? 5 : 2}
                required={f.required}
                maxLength={f.name === 'answer' ? 8000 : 2000}
                placeholder={f.placeholder}
                defaultValue={initialVal}
                className={input}
              />
            ) : (
              <input
                name={f.name}
                type={f.type === 'tags' ? 'text' : f.type}
                required={f.required}
                maxLength={f.type === 'text' || f.type === 'tags' ? 500 : undefined}
                placeholder={f.placeholder}
                defaultValue={initialVal}
                className={input}
              />
            )}
          </label>
        );
      })}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Publish'}
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

function SectionBlock({ section }: { section: Section }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from(section.table)
      .select('*')
      .order(section.orderBy.column, { ascending: section.orderBy.ascending });
    if (error) {
      if (error.code === MISSING_TABLE) setNeedsSetup(true);
      else setLoadError(error.message);
      return;
    }
    setNeedsSetup(false);
    setLoadError('');
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Delete "${name}" permanently? If it just needs to come off the public site, set its end date to the past instead — deleted items can't be reposted later.`,
      )
    )
      return;
    const { error } = await supabase.from(section.table).delete().eq('id', id);
    if (error) setLoadError(error.message);
    else load();
  }

  function done() {
    setAdding(false);
    setEditing(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  if (needsSetup) return null; // one shared notice is rendered by the parent

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted">
          {section.title}
        </h3>
        <button onClick={() => setAdding(!adding)} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
          {section.addLabel}
        </button>
      </div>
      {loadError && (
        <p className="text-brand-red font-semibold text-[14px] mb-3" role="alert">
          {loadError}
        </p>
      )}
      {adding && (
        <div className="mb-4">
          <RowForm section={section} onDone={done} onCancel={() => setAdding(false)} />
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-8">{section.emptyNote}</p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-8">
          {rows.map((r) => {
            const sum = section.summary(r);
            const exp = section.expiresKey ? s(r, section.expiresKey) : '';
            const expired = exp !== '' && exp < today;
            return (
              <div key={r.id} className="px-5 py-4 border-b border-line last:border-b-0">
                {editing === r.id ? (
                  <RowForm section={section} initial={r} onDone={done} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="grid md:grid-cols-[110px_1.9fr_auto] gap-3 items-center">
                    <span className={`text-[13.5px] font-bold ${expired ? 'text-muted' : ''}`}>{sum.date}</span>
                    <div className="min-w-0">
                      <b className={`block text-[14.5px] truncate ${expired ? 'text-muted' : ''}`}>{sum.primary}</b>
                      <span className="text-[13px] text-muted truncate block">
                        {sum.secondary}
                        {expired ? ' · expired (hidden from the public site)' : ''}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(r.id)} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
                        {expired ? 'Repost / edit' : 'Edit'}
                      </button>
                      <button
                        onClick={() => remove(r.id, sum.primary)}
                        className="text-muted font-semibold text-[12.5px] hover:text-brand-red"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function PostingsManager() {
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    // One probe decides whether the migration has run; each section also
    // handles its own errors, but the setup notice should render only once.
    supabase
      .from('jobs')
      .select('id', { head: true, count: 'exact' })
      .then(({ error }) => {
        if (error?.code === MISSING_TABLE) setNeedsSetup(true);
      });
  }, []);

  return (
    <div className="card p-8 mb-10 border-t-[3px] border-t-brand-blue/60">
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Boards &amp; library</h2>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-[#1A47B8] bg-[#E7EEFF]">
          Admins only
        </span>
      </div>
      <p className="text-muted text-[14px] mb-6">
        Homepage spotlights, jobs, classes, Q&amp;A entries, teaching videos, and the member
        library. Jobs, classes, and spotlights carry end dates and leave the public site
        automatically when they pass — edit the dates to repost instead of retyping. Q&amp;A
        entries can be saved as drafts and published when the board is happy with them.
      </p>
      {needsSetup ? <SetupNotice /> : SECTIONS.map((sec) => <SectionBlock key={sec.table} section={sec} />)}
    </div>
  );
}
