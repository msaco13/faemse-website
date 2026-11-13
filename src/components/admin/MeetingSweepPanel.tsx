import { useEffect, useState } from 'react';
import { eventDates } from '../../lib/eventDates';
import { fetchSettings, saveSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import Collapsible from './Collapsible';

// Admin → Site content → Monthly meeting sweep (AJ, 2026-11-13). Once a month
// the sweep reads the state EMS Advisory Council's meetings page
// (.claude/skills/meeting-sweep). When the state's schedule lists FAEMSE, it
// puts the day, time, room and a "See the meeting schedule" button on the
// homepage meeting slide, adds the "to be announced" slide for after, and
// fills in the calendar's FAEMSE meeting, by itself. Every change is listed
// here with what it replaced, and Undo puts the old version back (the sweep
// never makes an undone change again).

type SlideSnap = { body: string; link_url: string; link_label: string; show_link: boolean; starts_on: string; expires_on: string | null };
type EventSnap = { title: string; starts_on: string; ends_on: string | null; location: string; detail: string; url: string };

type Logged = { id: string; source_url: string; changed_on: string; undone_on: string | null };
type SlideChange = Logged & { kind: 'slide' | 'new_slide'; before: SlideSnap | null; after: SlideSnap };
type EventChange = Logged & { kind: 'event' | 'new_event'; before: EventSnap | null; after: EventSnap };
type Change = SlideChange | EventChange;

function isSlide(c: Change): c is SlideChange {
  return c.kind === 'slide' || c.kind === 'new_slide';
}

type Run = { ran_at: string; meeting: string; faemse_listed: boolean | null; changed: number; skipped: number; notes: string };

function short(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'the page';
  }
}

function slideLine(s: SlideSnap): string {
  const shown = s.expires_on ? `${short(s.starts_on)} to ${short(s.expires_on)}` : `from ${short(s.starts_on)}`;
  const button = s.show_link ? `button "${s.link_label}"` : 'no button';
  return `${s.body} (${shown}; ${button})`;
}

function eventLine(e: EventSnap): string {
  return [eventDates(e.starts_on, e.ends_on).label, e.location, e.detail].filter(Boolean).join(' · ');
}

function heading(c: Change): string {
  if (isSlide(c)) return c.kind === 'slide' ? 'Homepage meeting slide' : 'New homepage meeting slide';
  return c.kind === 'new_event' ? `Added to the calendar: ${c.after.title}` : c.after.title;
}

function lines(c: Change): { before: string; after: string } {
  if (isSlide(c)) return { before: c.before ? slideLine(c.before) : '', after: slideLine(c.after) };
  return { before: c.before ? eventLine(c.before) : '', after: eventLine(c.after) };
}

export default function MeetingSweepPanel({ onChanged }: { onChanged: () => void }) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  async function load() {
    const [c, r] = await Promise.all([
      supabase.from('meeting_sweep_changes').select('id, kind, before, after, source_url, changed_on, undone_on').order('created_at', { ascending: false }).limit(20),
      supabase.from('meeting_sweep_runs').select('ran_at, meeting, faemse_listed, changed, skipped, notes').order('ran_at', { ascending: false }).limit(1),
    ]);
    const e = c.error ?? r.error;
    if (e) {
      // Before the migration runs, the panel says so instead of failing.
      setErr(e.code === 'PGRST205' ? 'The meeting sweep is not set up on the database yet.' : e.message);
      setChanges([]);
      setRun(null);
      return;
    }
    setErr('');
    setChanges((c.data ?? []) as Change[]);
    setRun(((r.data ?? [])[0] as Run | undefined) ?? null);
  }

  useEffect(() => {
    load();
    fetchSettings().then((st) => setPaused(Boolean(st.meeting_sweep_paused)));
  }, []);

  async function toggle() {
    if (paused === null) return;
    setBusy('switch');
    const e = await saveSettings({ meeting_sweep_paused: !paused });
    setBusy('');
    if (e) setErr(e);
    else setPaused(!paused);
  }

  async function undo(c: Change) {
    setBusy(c.id);
    setNote('');
    const { error } = await supabase.rpc('admin_undo_meeting_sweep_change', { p_id: c.id });
    setBusy('');
    if (error) {
      setErr(error.message);
      return;
    }
    setErr('');
    setNote(
      c.kind === 'new_slide' || c.kind === 'new_event'
        ? `Undone: removed "${heading(c).replace(/^Added to the calendar: /, '')}". The sweep won't add it again.`
        : `Undone: "${heading(c)}" is back the way it was. The sweep won't make that change again.`,
    );
    setChanges((cs) => (cs ?? []).map((x) => (x.id === c.id ? { ...x, undone_on: new Date().toISOString().slice(0, 10) } : x)));
    onChanged();
  }

  const live = changes?.filter((c) => !c.undone_on).length ?? 0;

  return (
    <Collapsible key={changes === null ? 'loading' : 'ready'} title="Monthly meeting sweep" count={changes === null ? null : live} noun={['change', 'changes']}>
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <p className="flex-1 min-w-[240px] text-muted text-[13.5px] max-w-[76ch]">
          Once a month the sweep reads the state EMS Advisory Council&apos;s meetings page (flemsac.org/meetings). When the
          state&apos;s schedule lists FAEMSE, it puts the day, time and room on the homepage meeting slide with a &ldquo;See the
          meeting schedule&rdquo; button, sets the slide to come down after the meetings, adds the &ldquo;to be announced&rdquo;
          slide for after, and fills in the FAEMSE meeting on the calendar. Every change is listed below with Undo. While held,
          it changes nothing.
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
          <span className="text-muted">The meeting sweep hasn&apos;t run yet.</span>
        ) : (
          <>
            <b>
              Last run:{' '}
              {new Date(run.ran_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            </b>{' '}
            {run.meeting ? `Next meetings: ${run.meeting}. ` : ''}
            {run.faemse_listed === true
              ? 'The schedule lists FAEMSE. '
              : run.faemse_listed === false
                ? "The schedule doesn't list FAEMSE. "
                : 'No schedule posted yet. '}
            <b>
              {run.changed} change{run.changed === 1 ? '' : 's'}
            </b>
            .{run.skipped > 0 && ` ${run.skipped} left alone.`}
            {run.notes && <span className="block text-muted mt-1">{run.notes}</span>}
          </>
        )}
      </div>

      <h3 className="font-disp font-bold uppercase text-[17px] tracking-[0.06em] mb-2">What the sweep changed</h3>
      {changes === null ? null : changes.length === 0 ? (
        <p className="text-muted text-[14px]">No changes yet.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line">
          {changes.map((c) => {
            const l = lines(c);
            return (
              <li key={c.id} className={`flex flex-wrap items-start gap-3 px-4 py-3.5 ${c.undone_on ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-[220px] text-[13.5px]">
                  <b className="text-[14.5px]">{heading(c)}</b>
                  <span className="text-muted"> · {short(c.changed_on)}</span>
                  {l.before && <span className="block mt-1 text-muted line-through">{l.before}</span>}
                  <span className="block mt-0.5">{l.after}</span>
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
            );
          })}
        </ul>
      )}
    </Collapsible>
  );
}
