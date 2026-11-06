import { useState } from 'react';
import { todayISO } from '../lib/dates';
import { JOB_CATEGORIES, jobFormProblem, type JobForm } from '../lib/jobs';
import { supabase } from '../lib/supabase';
import { T } from '../lib/text';

// "Add a job" on the Job board (board, 2026-11-06): any signed-in member can
// add an opening. It posts right away as "Shared by a member"; admins see who
// shared it and can hide or delete it (Admin → Site content). The database
// checks it again and allows five a day per member (member_add_job()).

const input = 'mt-1.5 w-full rounded-xl border border-line px-4 py-3 bg-white focus:border-brand-blue outline-none';
const label = 'text-[13px] font-bold uppercase tracking-wide text-muted';

export default function AddJobForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const f: JobForm = {
      title: String(d.get('title') ?? ''),
      employer: String(d.get('employer') ?? ''),
      location: String(d.get('location') ?? ''),
      category: String(d.get('category') ?? ''),
      closesOn: String(d.get('closes_on') ?? ''),
      link: String(d.get('link') ?? ''),
      description: String(d.get('description') ?? ''),
    };
    const p = jobFormProblem(f, todayISO());
    if (p) {
      setProblem(p);
      return;
    }
    setBusy(true);
    setProblem('');
    const { error } = await supabase.rpc('member_add_job', {
      p: {
        title: f.title.trim(),
        employer: f.employer.trim(),
        location: f.location.trim(),
        category: f.category,
        closes_on: f.closesOn,
        link: f.link.trim(),
        description: f.description.trim(),
      },
    });
    setBusy(false);
    if (error) {
      setProblem(error.message || 'The job could not be added. Try again.');
      return;
    }
    form.reset();
    setOpen(false);
    setDone(true);
    onAdded();
  }

  return (
    <div id="add-job" className="card p-8 mt-10 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-disp font-bold uppercase text-xl mb-1">
            <T id="jobs.add.h2">Know of an opening?</T>
          </h2>
          <p className="text-muted text-[15px] max-w-[64ch]">
            <T id="jobs.add.text">
              Add it to the board. Paste the link to the posting, the job description, or both. It shows up right away
              for every member.
            </T>
          </p>
        </div>
        {!open && (
          <button
            type="button"
            className="btn-red"
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
          >
            <T id="jobs.add.open">Add a job</T>
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {done ? 'Your job is on the board.' : ''}
      </p>
      {done && (
        <p className="mt-4 text-[14.5px] font-semibold text-[#0E7A4A]">
          <T id="jobs.add.done">Thanks. Your job is on the board.</T>
        </p>
      )}

      {open && (
        <form onSubmit={onSubmit} noValidate className="mt-6 grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>
              <T id="jobs.add.title">Job title</T>
            </span>
            <input name="title" required maxLength={200} placeholder="Firefighter/Paramedic" className={input} />
          </label>
          <label className="block">
            <span className={label}>
              <T id="jobs.add.employer">Employer</T>
            </span>
            <input name="employer" required maxLength={200} placeholder="Agency, college or company" className={input} />
          </label>
          <label className="block">
            <span className={label}>
              <T id="jobs.add.type">Type</T>
            </span>
            <select name="category" required defaultValue="" className={input}>
              <option value="" disabled>
                Choose one
              </option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>
              <T id="jobs.add.city">City (optional)</T>
            </span>
            <input name="location" maxLength={200} placeholder="City, FL" className={input} />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>
              <T id="jobs.add.link">Link to the posting</T>
            </span>
            <input name="link" type="url" inputMode="url" maxLength={1000} placeholder="https://…" className={input} />
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>
              <T id="jobs.add.description">Job description</T>
            </span>
            <textarea
              name="description"
              rows={5}
              maxLength={2000}
              placeholder="Paste the description, or a few lines about the job and how to apply."
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>
              <T id="jobs.add.closes">Closing date (optional)</T>
            </span>
            <input name="closes_on" type="date" min={todayISO()} className={input} />
            <span className="block text-muted text-[12.5px] mt-1">
              <T id="jobs.add.closes.hint">Leave it blank if it&apos;s open until filled. It stays up 30 days.</T>
            </span>
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy} className="btn-red disabled:opacity-60">
              {busy ? <T id="jobs.add.sending">Adding…</T> : <T id="jobs.add.submit">Add to the board</T>}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setProblem('');
              }}
              className="text-muted font-semibold text-[14px] hover:text-ink"
            >
              <T id="jobs.add.cancel">Cancel</T>
            </button>
            {problem && (
              <span className="text-brand-redink font-semibold text-[14px]" role="alert">
                {problem}
              </span>
            )}
          </div>
          <p className="sm:col-span-2 text-muted text-[12.5px]">
            <T id="jobs.add.note">
              Give a link, a description, or both. The board shows it as shared by a member; admins can see who added it
              and take it down.
            </T>
          </p>
        </form>
      )}
    </div>
  );
}
