import { useEffect, useState } from 'react';
import { todayISO } from '../../lib/dates';
import { categoryLabel } from '../../lib/jobs';
import { supabase } from '../../lib/supabase';
import Collapsible from './Collapsible';

// Admin → Site content → Shared by members (board, 2026-11-06). Jobs members
// add from the Job board (link to apply, title, employer) post right away as
// "Shared by a member"; the weekly sweep then reads each link, fills in the
// details and the type, and takes closed ones down. Here admins see who
// added each one (job_submissions, admins only) and hide or delete it. A
// hidden job's link is never posted again, by the sweep either.

type MemberJob = {
  id: string;
  title: string;
  employer: string;
  location: string;
  category: string | null;
  needs_details: boolean;
  last_seen_on: string | null;
  posted_on: string;
  expires_on: string;
  open_until_filled: boolean;
  hidden: boolean;
  apply_url: string;
  description: string;
  job_submissions: { profiles: { full_name: string | null; email: string | null } | null } | { profiles: { full_name: string | null; email: string | null } | null }[] | null;
};

function short(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sharedBy(j: MemberJob): string {
  const s = Array.isArray(j.job_submissions) ? j.job_submissions[0] : j.job_submissions;
  const p = s?.profiles;
  return p?.full_name || p?.email || 'a member no longer on file';
}

export default function MemberJobsPanel() {
  const [jobs, setJobs] = useState<MemberJob[] | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, employer, location, category, needs_details, last_seen_on, posted_on, expires_on, open_until_filled, hidden, apply_url, description, job_submissions(profiles(full_name, email))')
      .eq('source', 'member')
      .order('posted_on', { ascending: false });
    if (error) {
      setErr(error.message);
      setJobs([]);
      return;
    }
    setErr('');
    setJobs((data ?? []) as unknown as MemberJob[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function setHidden(job: MemberJob, hidden: boolean) {
    setBusy(job.id);
    const { error } = await supabase.from('jobs').update({ hidden }).eq('id', job.id);
    setBusy('');
    if (error) setErr(error.message);
    else setJobs((js) => (js ?? []).map((x) => (x.id === job.id ? { ...x, hidden } : x)));
  }

  async function remove(job: MemberJob) {
    if (!window.confirm(`Delete "${job.title}" for good? To take it off the board but keep a record, use Hide instead.`)) return;
    setBusy(job.id);
    const { error } = await supabase.from('jobs').delete().eq('id', job.id);
    setBusy('');
    if (error) setErr(error.message);
    else setJobs((js) => (js ?? []).filter((x) => x.id !== job.id));
  }

  const today = todayISO();
  const up = (jobs ?? []).filter((j) => !j.hidden && j.expires_on >= today);
  const rest = (jobs ?? []).filter((j) => j.hidden || j.expires_on < today);

  return (
    <Collapsible title="Shared by members" count={jobs ? up.length : null} noun={['job', 'jobs']}>
      <p className="text-muted text-[13.5px] mb-4 max-w-[76ch]">
        Any signed-in member can add a job from the Job board with the link to apply, the title and the employer, up to five
        a day. It shows right away as &ldquo;Shared by a member&rdquo;; at the weekly sweep the link is read, the details
        and type filled in, and closed jobs taken down. Only admins see who added it. Hide takes it off the board; Delete
        removes it for good.
      </p>
      {err && (
        <p className="text-brand-redink font-semibold text-[13px] mb-3" role="alert">
          {err}
        </p>
      )}
      {jobs === null ? null : jobs.length === 0 ? (
        <p className="text-muted text-[14px]">No jobs shared by members yet.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line">
          {[...up, ...rest].map((j) => {
            const gone = j.hidden || j.expires_on < today;
            return (
              <li key={j.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${gone ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-[220px]">
                  {j.apply_url ? (
                    <a href={j.apply_url} target="_blank" rel="noreferrer" className="font-semibold text-[14.5px] hover:underline">
                      {j.title}
                    </a>
                  ) : (
                    <span className="font-semibold text-[14.5px]">{j.title}</span>
                  )}
                  <span className="block text-muted text-[13px]">
                    {[j.category ? categoryLabel(j.category) : 'type not set yet', j.employer, j.location].filter(Boolean).join(' · ')} · shared by{' '}
                    {sharedBy(j)} on {short(j.posted_on)} · {j.open_until_filled ? `up until ${short(j.expires_on)}` : `closes ${short(j.expires_on)}`}
                    {j.needs_details ? ' · details coming at the weekly check' : j.last_seen_on ? ` · checked ${short(j.last_seen_on)}` : ''}
                    {j.hidden && ' · hidden'}
                    {!j.hidden && j.expires_on < today && ' · past its date'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setHidden(j, !j.hidden)}
                  disabled={busy === j.id}
                  className={`rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-bold disabled:opacity-60 ${
                    j.hidden ? 'text-ink hover:border-ink' : 'text-brand-redink hover:border-brand-redink'
                  }`}
                >
                  {j.hidden ? 'Show' : 'Hide'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(j)}
                  disabled={busy === j.id}
                  className="text-muted font-semibold text-[12.5px] hover:text-brand-redink disabled:opacity-60"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Collapsible>
  );
}
