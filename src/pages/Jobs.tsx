import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AddJobForm from '../components/AddJobForm';
import PageHead from '../components/PageHead';
import { CantLoad, SavedCopyNote } from '../components/SavedCopy';
import { contactPath } from '../content/data';
import { todayISO } from '../lib/dates';
import { categoryFromSlug, categoryLabel, categoryOf, countByCategory, isNew, JOB_CATEGORIES, lastChecked, type JobCategory } from '../lib/jobs';
import { useJobs } from '../lib/postings';
import { T } from '../lib/text';

// Members only since 2026-10-13 (board decision; the route wraps this page in
// MembersOnly). Since 2026-11-06 a weekly sweep finds Fire/EMS, EMS and EMS
// education openings across Florida and posts them here by itself
// (.claude/skills/job-sweep); the board still posts openings by hand, and
// any signed-in member can add one at the bottom (AddJobForm). Three tabs,
// one per category, and ?type= in the address opens one. Placement is
// one of the three CoAEMSP program metrics, so this board sits close to the
// accreditation material (cross-linked below).

const chip = 'inline-block text-[11.5px] font-bold tracking-[0.08em] uppercase px-2.5 py-1.5 rounded-full whitespace-nowrap';
const CATEGORY_CHIP: Record<JobCategory, string> = {
  fire_ems: 'text-[#B8232D] bg-[#FDEAEB]',
  ems: 'text-[#1A3F94] bg-[#E3ECFD]',
  education: 'text-brand-goldink bg-[#FBF3D9]',
};

function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dayDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// The page's head and section are drawn here; the listings below in
// JobsBoard, which starts over (and reloads) after a member adds a job. The
// head matches the one MembersOnly shows visitors (App.tsx).
const JOBS_HEAD = {
  eyebrow: 'Careers in Florida EMS',
  title: 'Job board',
  sub: 'Fire/EMS, EMS, and EMS education openings across Florida, checked every week, plus openings the board and members post.',
};

export default function Jobs() {
  const [version, setVersion] = useState(0);
  return (
    <>
      <PageHead id="jobs" eyebrow={JOBS_HEAD.eyebrow} title={JOBS_HEAD.title} sub={JOBS_HEAD.sub} />
      <section className="py-20 bg-paper">
        <div className="wrap">
          <JobsBoard key={version} />

          <AddJobForm onAdded={() => setVersion((v) => v + 1)} />
          <p className="text-muted text-[14px] mt-4 max-w-[80ch]">
            <T id="jobs.employers.text">Hiring and not a member? Employers can</T>{' '}
            <Link to={contactPath('Job posting for the FAEMSE board')} className="text-brand-blue font-semibold hover:underline">
              <T id="jobs.employers.link">send the posting to the board</T>
            </Link>
            .
          </p>

          <p className="text-muted text-[14px] mt-6 max-w-[80ch]">
            <T id="jobs.why.text">
              Why we run this: graduate placement is one of the three outcomes every accredited
              paramedic program is measured on, alongside retention and exam pass rate. New program
              director?
            </T>{' '}
            <Link to="/program-directors" className="text-brand-blue font-semibold hover:underline">
              <T id="jobs.why.link">Start with the director guide →</T>
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}

function JobsBoard() {
  const { items, loaded, down, savedAt } = useJobs();
  const [params, setParams] = useSearchParams();
  const active = categoryFromSlug(params.get('type'));
  const counts = countByCategory(items);
  const shown = active ? items.filter((j) => categoryOf(j.category) === active) : items;
  const today = todayISO();
  const checked = lastChecked(items);
  const newCount = items.filter((j) => isNew(j.postedOn, today)).length;

  function pick(slug: string | null) {
    const next = new URLSearchParams(params);
    if (slug) next.set('type', slug);
    else next.delete('type');
    setParams(next, { replace: true });
  }

  const tab = (on: boolean) =>
    `rounded-full border px-4 py-2 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors ${
      on ? 'bg-ink border-ink text-white' : 'bg-white border-line text-ink hover:border-ink'
    }`;

  return (
    <>
          {down && savedAt && (
            <SavedCopyNote id="jobs" savedAt={savedAt} note="The live job board couldn't be reached, so check with the employer that an opening is still available." />
          )}

          {loaded && !(down && !savedAt) && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-2.5" role="group" aria-label="Show jobs by type">
                <button type="button" className={tab(!active)} aria-pressed={!active} onClick={() => pick(null)}>
                  <T id="jobs.tab.all">All</T> <span className={active ? 'text-muted' : 'text-brand-goldsoft'}>{items.length}</span>
                </button>
                {JOB_CATEGORIES.map((c) => (
                  <button key={c.key} type="button" className={tab(active === c.key)} aria-pressed={active === c.key} onClick={() => pick(c.slug)}>
                    {c.label} <span className={active === c.key ? 'text-brand-goldsoft' : 'text-muted'}>{counts[c.key]}</span>
                  </button>
                ))}
                <a href="#add-job" className="ml-auto text-brand-blue font-semibold text-[14px] hover:underline">
                  <T id="jobs.add.jump">+ Add a job</T>
                </a>
              </div>
              <p className="text-muted text-[13.5px] mb-6">
                {checked && (
                  <>
                    <T id="jobs.meta.checked">Last checked</T> {dayDate(checked)}
                    {newCount > 0 && ` · ${newCount} new this week`} ·{' '}
                  </>
                )}
                <T id="jobs.meta.confirm">Always confirm details with the employer before applying.</T>
              </p>
            </>
          )}

          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              <T id="jobs.loading">Loading openings…</T>
            </div>
          ) : down && !savedAt ? (
            <CantLoad id="jobs" what="job board" />
          ) : shown.length === 0 ? (
            <div className="card p-8 text-muted">
              {active ? (
                <>
                  <T id="jobs.empty.category">No openings of this type listed right now.</T>{' '}
                  <button type="button" onClick={() => pick(null)} className="text-brand-blue font-semibold hover:underline">
                    <T id="jobs.empty.all">See all openings</T>
                  </button>
                </>
              ) : (
                <T id="jobs.empty">
                  No open positions listed right now. The board checks for new openings every week. Check back, or send us
                  one below.
                </T>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {shown.map((j) => {
                const cat = categoryOf(j.category);
                return (
                  <article key={j.id ?? j.title} className="card p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
                      <h2 className="font-disp font-bold uppercase text-2xl">{j.title}</h2>
                      <span className="flex flex-wrap gap-2">
                        {isNew(j.postedOn, today) && (
                          <span className={`${chip} text-white bg-brand-blue`}>
                            <T id="jobs.item.new">New</T>
                          </span>
                        )}
                        <span className={`${chip} text-[#0E7A4A] bg-[#E2F7EC]`}>
                          {j.openUntilFilled ? (
                            <T id="jobs.item.until-filled">Open until filled</T>
                          ) : (
                            <>
                              <T id="jobs.item.open">Closes</T> {j.closes}
                            </>
                          )}
                        </span>
                      </span>
                    </div>
                    <p className="text-[14.5px] font-semibold text-brand-blue mb-3">
                      {[j.employer, j.location].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mb-3">
                      <span className={`${chip} ${CATEGORY_CHIP[cat]}`}>{categoryLabel(cat)}</span>
                    </p>
                    {j.description && <p className="text-muted text-[15px] mb-4 max-w-[80ch] whitespace-pre-line">{j.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
                      {j.applyUrl && (
                        <a href={j.applyUrl} target="_blank" rel="noreferrer" className="btn-outline !py-2 !px-4 text-[13.5px]">
                          <T id="jobs.item.apply">Apply on the employer&apos;s site ↗</T>
                        </a>
                      )}
                      <span className="text-muted text-[12.5px]">
                        {j.source === 'sweep' ? (
                          <>
                            <T id="jobs.item.found">Found by the weekly sweep</T> {j.postedOn ? shortDate(j.postedOn) : ''}
                            {j.lastSeenOn && ` · last checked ${shortDate(j.lastSeenOn)}`}
                            {j.confirmed === false && (
                              <>
                                {' · '}
                                <T id="jobs.item.unconfirmed">from a search listing, confirm on the posting</T>
                              </>
                            )}
                          </>
                        ) : j.source === 'member' ? (
                          <>
                            <T id="jobs.item.shared">Shared by a member</T> {j.postedOn ? shortDate(j.postedOn) : j.posted}
                          </>
                        ) : (
                          <>
                            <T id="jobs.item.posted">Posted by the board</T> {j.postedOn ? shortDate(j.postedOn) : j.posted}
                          </>
                        )}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

    </>
  );
}
