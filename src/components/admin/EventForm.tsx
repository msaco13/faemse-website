import { useState } from 'react';
import { eventRangeProblem } from '../../lib/eventDates';
import { supabase } from '../../lib/supabase';

// The Admin form for one calendar event: adding, editing, or (from the
// weekly event sweep) adding a found event after changing it first.

export type DbEvent = {
  id: string;
  starts_on: string;
  ends_on?: string | null;
  title: string;
  detail: string;
  location: string;
  tag: string;
  tag_color: string;
  url: string;
};

export type EventRow = Omit<DbEvent, 'id'>;

const input =
  'mt-1 w-full rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-blue';
const label = 'block text-[11px] font-bold uppercase tracking-wide text-muted';
const TAG_COLORS = ['blue', 'red', 'green', 'gold'] as const;

export default function EventForm({
  initial,
  prefill,
  save,
  submitLabel,
  onDone,
  onCancel,
}: {
  // Editing an event on the calendar.
  initial?: DbEvent;
  // A new event with its fields filled in already (the event sweep's
  // "Edit first"), saved by `save` instead of a plain insert.
  prefill?: Partial<DbEvent>;
  save?: (row: EventRow) => Promise<string | null>;
  submitLabel?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const shown: Partial<DbEvent> | undefined = initial ?? prefill;
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const startsOn = String(data.starts_on);
    const endsOn = String(data.ends_on ?? '');
    const rangeProblem = eventRangeProblem(startsOn, endsOn);
    if (rangeProblem) {
      setErr(rangeProblem);
      return;
    }
    const row = {
      starts_on: startsOn,
      // Last day of an event over several days; empty for one day.
      ends_on: endsOn && endsOn > startsOn ? endsOn : null,
      title: String(data.title).trim(),
      detail: String(data.detail ?? '').trim(),
      location: String(data.location ?? '').trim(),
      tag: String(data.tag ?? '').trim() || 'Meeting',
      tag_color: String(data.tag_color),
      url: String(data.url ?? '').trim(),
    };
    setSaving(true);
    setErr('');
    let problem: string | null;
    if (initial) problem = (await supabase.from('events').update(row).eq('id', initial.id)).error?.message ?? null;
    else if (save) problem = await save(row);
    else problem = (await supabase.from('events').insert(row)).error?.message ?? null;
    setSaving(false);
    if (problem) setErr(problem);
    else onDone();
  }

  return (
    <form onSubmit={onSubmit} className="bg-paper rounded-xl p-5 grid sm:grid-cols-2 gap-3">
      <label>
        <span className={label}>Date (first day)</span>
        <input name="starts_on" type="date" required defaultValue={shown?.starts_on ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Last day (optional, for a conference over several days)</span>
        <input name="ends_on" type="date" defaultValue={shown?.ends_on ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Title</span>
        <input name="title" required maxLength={200} defaultValue={shown?.title ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Detail (one line under the title)</span>
        <input name="detail" maxLength={200} defaultValue={shown?.detail ?? ''} className={input} />
      </label>
      <label>
        <span className={label}>Location</span>
        <input
          name="location"
          maxLength={120}
          placeholder="e.g. Orlando, FL · or Virtual · Zoom"
          defaultValue={shown?.location ?? ''}
          className={input}
        />
      </label>
      <label>
        <span className={label}>Tag label</span>
        <input
          name="tag"
          maxLength={40}
          placeholder="Meeting, Workshop, Competition…"
          defaultValue={shown?.tag ?? ''}
          className={input}
        />
      </label>
      <label className="sm:col-span-2">
        <span className={label}>Link for details / registration (optional)</span>
        <input
          name="url"
          type="url"
          maxLength={500}
          placeholder="https://… (the conference's own registration page, a Zoom link, an agenda)"
          defaultValue={shown?.url ?? ''}
          className={input}
        />
      </label>
      <label>
        <span className={label}>Tag color</span>
        <select name="tag_color" defaultValue={shown?.tag_color ?? 'blue'} className={input}>
          {TAG_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
          {saving ? 'Saving…' : submitLabel ?? (initial ? 'Save changes' : 'Add event')}
        </button>
        <button type="button" onClick={onCancel} className="text-muted font-semibold text-[13px] hover:text-ink">
          Cancel
        </button>
        {err && (
          <span className="text-brand-redink font-semibold text-[13px]" role="alert">
            {err}
          </span>
        )}
      </div>
    </form>
  );
}
