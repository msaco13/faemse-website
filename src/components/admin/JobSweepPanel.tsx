import { useEffect, useState } from 'react';
import { todayISO } from '../../lib/dates';
import { categoryLabel } from '../../lib/jobs';
import { fetchSettings, saveSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import Collapsible from './Collapsible';

// Admin → Site content → Weekly job sweep (board, 2026-11-06). The sweep posts
// Florida jobs to the Job board by itself once a week
// (.claude/skills/job-sweep); this panel shows what its last run did, holds
// or resumes it, and hides any job it posted. A hidden job leaves the board
// and the sweep never posts it again; Show puts it back.

type SweepJob = {
  id: string;
  title: string;
  employer: string;
  location: string;
  category: string;
  posted_on: string;
  expires_on: string;
  open_until_filled: boolean;
  opens_on: string | null; // a hiring announcement: the day applications open
  apply_link_tba: boolean; // the link is the announcement; application page not up yet
  confirmed: boolean;
  hidden: boolean;
  apply_url: string;
};

type Run = {
  ran_at: string;
  complete: boolean;
  found: number;
  added: number;
  kept: number;
  removed: number;
  hidden_skipped: number;
  already_listed?: number;
  members_checked?: number;
  members_filled?: number;
  unreadable: number;
  notes: string;
};

function short(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function JobSweepPanel() {
  const [jobs, setJobs] = useState<SweepJob[] | null>(null);
  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const [j, r] = await Promise.all([
      supabase.from('jobs').select('id, title, employer, location, category, posted_on, expires_on, open_until_filled, opens_on, apply_link_tba, confirmed, hidden, apply_url').eq('source', 'sweep').order('posted_on', { ascending: false }),
      supabase.from('job_sweep_runs').select('*').order('ran_at', { ascending: false }).limit(1),
    ]);
    if (j.error || r.error) {
      setErr((j.error ?? r.error)!.message);
      setJobs([]);
      setRun(null);
      return;
    }
    setErr('');
    setJobs((j.data ?? []) as SweepJob[]);
    setRun(((r.data ?? [])[0] as Run | undefined) ?? null);
  }

  useEffect(() => {
    load();
    fetchSettings().then((s) => setPaused(Boolean(s.job_sweep_paused)));
  }, []);

  async function toggle() {
    if (paused === null) return;
    setBusy('switch');
    const e = await saveSettings({ job_sweep_paused: !paused });
    setBusy('');
    if (e) setErr(e);
    else setPaused(!paused);
  }

  async function setHidden(job: SweepJob, hidden: boolean) {
    setBusy(job.id);
    const { error } = await supabase.from('jobs').update({ hidden }).eq('id', job.id);
    setBusy('');
    if (error) setErr(error.message);
    else setJobs((js) => (js ?? []).map((x) => (x.id === job.id ? { ...x, hidden } : x)));
  }

  const today = todayISO();
  const onBoard = (jobs ?? []).filter((j) => !j.hidden && j.expires_on >= today);
  const hidden = (jobs ?? []).filter((j) => j.hidden);
  const rows = [...onBoard, ...hidden];

  return (
    <Collapsible title="Weekly job sweep" count={jobs ? onBoard.length : null} noun={['job', 'jobs']}>
      <div className="flex flex-wrap items-start gap-4 mb-4">
        <p className="flex-1 min-w-[240px] text-muted text-[13.5px] max-w-[76ch]">
          Every week the sweep finds Fire/EMS, EMS and EMS education openings in Florida and posts them on the Job board.
          Jobs come down when they close or stop showing up. While held, it changes nothing.
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

      <div className="bg-paper rounded-xl p-4 mb-4 text-[14px]">
        {run === undefined ? (
          <span className="text-muted">Loading the last run…</span>
        ) : run === null ? (
          <span className="text-muted">The sweep hasn&apos;t run yet.</span>
        ) : (
          <>
            <b>
              Last run:{' '}
              {new Date(run.ran_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
            </b>{' '}
            Found {run.found} open: <b>{run.added} new</b>, {run.kept} still open, <b>{run.removed} taken down</b>.
            {run.hidden_skipped > 0 && ` ${run.hidden_skipped} hidden job${run.hidden_skipped === 1 ? '' : 's'} left off.`}
            {(run.already_listed ?? 0) > 0 && ` ${run.already_listed} already on the board from a member or the board.`}
            {(run.members_checked ?? 0) > 0 &&
              ` Checked ${run.members_checked} job${run.members_checked === 1 ? '' : 's'} shared by members, filled in ${run.members_filled ?? 0}.`}
            {run.unreadable > 0 && ` ${run.unreadable} page${run.unreadable === 1 ? '' : 's'} couldn't be read.`}
            {!run.complete && ' The run was cut short, so nothing counted as missing.'}
            {run.notes && <span className="block text-muted mt-1">{run.notes}</span>}
          </>
        )}
      </div>

      {jobs === null ? null : rows.length === 0 ? (
        <p className="text-muted text-[14px]">No jobs from the sweep on the board.</p>
      ) : (
        <ul className="border border-line rounded-xl divide-y divide-line">
          {rows.map((j) => (
            <li key={j.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${j.hidden ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-[220px]">
                <a href={j.apply_url} target="_blank" rel="noreferrer" className="font-semibold text-[14.5px] hover:underline">
                  {j.title}
                </a>
                <span className="block text-muted text-[13px]">
                  {[categoryLabel(j.category), j.employer, j.location].filter(Boolean).join(' · ')} · found {short(j.posted_on)} ·{' '}
                  {j.opens_on && j.opens_on > today && `applications open ${short(j.opens_on)} · `}
                  {j.open_until_filled ? 'open until filled' : `closes ${short(j.expires_on)}`}
                  {j.apply_link_tba && ' · application link TBA'}
                  {!j.confirmed && ' · from a search listing'}
                  {j.hidden && ' · hidden'}
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
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted text-[12.5px] mt-2">Hide takes a job off the board, and the sweep never posts it again. Show puts it back.</p>
    </Collapsible>
  );
}
