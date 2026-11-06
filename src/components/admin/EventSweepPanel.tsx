import { useEffect, useState } from 'react';
import { eventDates } from '../../lib/eventDates';
import { fetchSettings, saveSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import Collapsible from './Collapsible';
import EventForm, { type EventRow } from './EventForm';

// Admin → Site content → Weekly event sweep (board, 2026-11-06). Once a week
// the sweep checks the calendar (.claude/skills/event-sweep): it fills in
// dates and places that were TBA and moves past events to next year's dates
// by itself, and leaves new EMS education conferences here for an admin to
// add, edit first, or dismiss. Every change it made is listed with what it
// replaced, and Undo puts the old version back (the sweep never makes an
// undone change again). It never changes a FAEMSE membership meeting.

type Suggestion = {
  id: string;
  title: string;
  starts_on: string;
  ends_on: string | null;
  location: string;
  detail: string;
  tag: string;
  url: string;
  found_on: string;
};

type Snapshot = { title: string; starts_on: string; ends_on: string | null; location: string; detail: string; url: string };

type Change = {
  id: string;
  kind: 'dates' | 'next_year';
  before: Snapshot;
  after: Snapshot;
  source_url: string;
  changed_on: string;
  undone_on: string | null;
};

type Run = { ran_at: string; checked: number; updated: number; rolled: number; suggested: number; skipped: number; notes: string };

const TAG_COLOR: Record<string, string> = { Florida: 'gold', National: 'green', Competition: 'red' };
const CHIP: Record<string, string> = {
  blue: 'text-[#1A47B8] bg-[#E7EEFF]',
  red: 'text-[#B8232D] bg-[#FDEAEB]',
  green: 'text-[#0E7A4A] bg-[#E2F7EC]',
  gold: 'text-brand-goldink bg-[#FBF3D9]',
};

function when(s: { starts_on: string; ends_on: string | null }): string {
  return eventDates(s.starts_on, s.ends_on).label;
}

function short(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the page';
  }
}

export default function EventSweepPanel({ onChanged }: { onChanged: () => void }) {
  const [found, setFound] = useState<Suggestion[] | null>(null);
  const [changes, setChanges] = useState<(Change & { event_title: string })[] | null>(null);
  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [paused, setPaused] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  async function load() {
    const [s, c, r] = await Promise.all([
      supabase.from('event_suggestions').select('id, title, starts_on, ends_on, location, detail, tag, url, found_on').eq('status', 'waiting').order('starts_on', { ascending: true }),
      supabase.from('event_sweep_changes').select('id, kind, before, after, source_url, changed_on, undone_on, events(title)').order('created_at', { ascending: false }).limit(20),
      supabase.from('event_sweep_runs').select('*').order('ran_at', { ascending: false }).limit(1),
    ]);
    const e = s.error ?? c.error ?? r.error;
    if (e) {
      // Before the migration runs, the panel says so instead of failing.
      setErr(e.code === 'PGRST205' ? 'The event sweep is not set up on the database yet.' : e.message);
      setFound([]);
      setChanges([]);
      setRun(null);
      return;
    }
    setErr('');
    setFound((s.data ?? []) as Suggestion[]);
    setChanges(
      ((c.data ?? []) as unknown as (Change & { events: { title: string } | null })[]).map((x) => ({ ...x, event_title: x.events?.title ?? x.after.title })),
    );
    setRun(((r.data ?? [])[0] as Run | undefined) ?? null);
  }

  useEffect(() => {
    load();
    fetchSettings().then((st) => setPaused(Boolean(st.event_sweep_paused)));
  }, []);

  async function toggle() {
    if (paused === null) return;
    setBusy('switch');
    const e = await saveSettings({ event_sweep_paused: !paused });
    setBusy('');
    if (e) setErr(e);
    else setPaused(!paused);
  }

  async function decide(s: Suggestion, action: 'add' | 'dismiss', event?: EventRow): Promise<string | null> {
    setBusy(s.id);
    setNote('');
    const { error } = await supabase.rpc('admin_decide_event_suggestion', { p_id: s.id, p_action: action, p_event: event ?? null });
    setBusy('');
    if (error) return error.message;
    setFound((f) => (f ?? []).filter((x) => x.id !== s.id));
    setEditing(null);
    setNote(action === 'add' ? `Added "${event?.title ?? s.title}" to the calendar.` : `Dismissed "${s.title}". The sweep won't suggest it again.`);
    if (action === 'add') onChanged();
    return null;
  }

  async function undo(c: Change & { event_title: string }) {
    setBusy(c.id);
    setNote('');
    const { error } = await supabase.rpc('admin_undo_event_sweep_change', { p_id: c.id });
    setBusy('');
    if (error) {
      setErr(error.message);
      return;
    }
    setErr('');
    setNote(`Undone: "${c.event_title}" is back the way it was. The sweep won't make that change again.`);
    setChanges((cs) => (cs ?? []).map((x) => (x.id === c.id ? { ...x, undone_on: new Date().toISOString().slice(0, 10) } : x)));
    onChanged();
  }

  const waiting = found?.length ?? 0;

  return (
    <Collapsible
      key={found === null ? 'loading' : 'ready'}
      title="Weekly event sweep"
      count={found === null ? null : waiting}
      noun={['new event waiting', 'new events waiting']}
      defaultOpen={waiting > 0}
    >
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <p className="flex-1 min-w-[240px] text-muted text-[13.5px] max-w-[76ch]">
          Every week the sweep checks the calendar. When an organizer posts dates or a place that were TBA, or next year&apos;s dates
          for an event that already happened, it updates the event by itself; every change is listed below with Undo. New EMS
          conferences (educator conferences first; never courses) wait here for you. It never changes a FAEMSE
          membership meeting. While held, it changes nothing.
        </p>
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
          <span className="text-muted">Loading the last run…</span>
        ) : run === null ? (
          <span className="text-muted">The event sweep hasn&apos;t run yet.</span>
        ) : (
          <>
            <b>
              Last run:{' '}
              {new Date(run.ran_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            </b>{' '}
            Checked {run.checked} event{run.checked === 1 ? '' : 's'}: <b>{run.updated} filled in</b>, <b>{run.rolled} moved to next year</b>,{' '}
            <b>{run.suggested} new found</b>.{run.skipped > 0 && ` ${run.skipped} left alone.`}
            {run.notes && <span className="block text-muted mt-1">{run.notes}</span>}
          </>
        )}
      </div>

      <h3 className="font-disp font-bold uppercase text-[17px] tracking-[0.06em] mb-2">New events the sweep found</h3>
      {found === null ? null : found.length === 0 ? (
        <p className="text-muted text-[14px] mb-5">Nothing waiting.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line mb-5">
          {found.map((s) => (
            <li key={s.id} className="px-4 py-3.5">
              {editing === s.id ? (
                <EventForm
                  prefill={{ ...s, tag_color: TAG_COLOR[s.tag] ?? 'blue' }}
                  submitLabel="Add to the calendar"
                  save={(row) => decide(s, 'add', row)}
                  onDone={() => setEditing(null)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <span className={`inline-block text-[11px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full mr-2 align-[1px] ${CHIP[TAG_COLOR[s.tag] ?? 'blue']}`}>
                      {s.tag}
                    </span>
                    <b className="text-[14.5px]">{s.title}</b>
                    <span className="block text-muted text-[13px]">{[when(s), s.location].filter(Boolean).join(' · ')}</span>
                    {s.detail && <span className="block text-[13px] mt-0.5">{s.detail}</span>}
                    <span className="block text-[12.5px] text-muted mt-1">
                      Found on{' '}
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-brand-blue font-semibold hover:underline">
                        {host(s.url)}
                      </a>
                      , {short(s.found_on)}.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={async () => {
                        const e = await decide(s, 'add');
                        if (e) setErr(e);
                      }}
                      className="rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-white bg-[#0E7A4A] border border-[#0E7A4A] disabled:opacity-60"
                    >
                      Add to calendar
                    </button>
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={() => setEditing(s.id)}
                      className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-bold hover:border-ink disabled:opacity-60"
                    >
                      Edit first
                    </button>
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={async () => {
                        const e = await decide(s, 'dismiss');
                        if (e) setErr(e);
                      }}
                      className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-bold text-brand-redink hover:border-brand-redink disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="font-disp font-bold uppercase text-[17px] tracking-[0.06em] mb-2">What the sweep changed</h3>
      {changes === null ? null : changes.length === 0 ? (
        <p className="text-muted text-[14px]">No changes yet.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line">
          {changes.map((c) => (
            <li key={c.id} className={`flex flex-wrap items-start gap-3 px-4 py-3.5 ${c.undone_on ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-[220px] text-[13.5px]">
                <b className="text-[14.5px]">{c.event_title}</b>
                <span className="text-muted"> · {c.kind === 'next_year' ? 'moved to next year' : 'dates filled in'} {short(c.changed_on)}</span>
                <span className="block mt-1 text-muted line-through">
                  {[c.before.title !== c.after.title ? c.before.title : '', when(c.before), c.before.location, c.before.detail].filter(Boolean).join(' · ')}
                </span>
                <span className="block">
                  {[c.before.title !== c.after.title ? c.after.title : '', when(c.after), c.after.location, c.after.detail].filter(Boolean).join(' · ')}
                </span>
                {c.source_url && (
                  <a href={c.source_url} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-blue font-semibold hover:underline">
                    From {host(c.source_url)}
                  </a>
                )}
              </div>
              {c.undone_on ? (
                <span className="text-[12.5px] font-bold text-muted">Undone {short(c.undone_on)}</span>
              ) : (
                <button
                  type="button"
                  disabled={busy === c.id}
                  onClick={() => undo(c)}
                  className="rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-bold hover:border-ink disabled:opacity-60"
                >
                  Undo
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Collapsible>
  );
}
