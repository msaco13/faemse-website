import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AddJobForm from '../components/AddJobForm';
import PageHead from '../components/PageHead';
import { CantLoad, SavedCopyNote } from '../components/SavedCopy';
import { contactPath } from '../content/data';
import { todayISO } from '../lib/dates';
import { allSame, categoryLabel, countByCategory, groupByEmployer, hasCategory, isNew, JOB_CATEGORIES, lastChecked, placesOf, tabFromSlug, type JobCategory } from '../lib/jobs';
import type { JobItem } from '../lib/postings';
import { useJobs } from '../lib/postings';
import { T } from '../lib/text';

// Members only since 2026-10-13 (board decision; the route wraps this page in
// MembersOnly). Since 2026-11-06 a weekly sweep finds Fire/EMS, EMS and EMS
// education openings across Florida and posts them here by itself
// (.claude/skills/job-sweep); the board still posts openings by hand, and
// any signed-in member can add one at the bottom (AddJobForm). Three tabs,
// one per category, opening on Fire/EMS; there is no All tab, and ?type= in
// the address opens one (board, 2026-11-06). An employer with more than one
// opening on a tab gets one card with a dropdown (groupByEmployer). A job a
// member shared without a type shows at the bottom of every tab until the
// weekly sweep sorts it. Placement is
// one of the three CoAEMSP program metrics, so this board sits close to the
// accreditation material (cross-linked below).

const chip = 'inline-block text-[11.5px] font-bold tracking-[0.08em] uppercase px-2.5 py-1.5 rounded-full whitespace-nowrap';
const CATEGORY_CHIP: Record<JobCategory, string> = {
  fire_ems: 'text-[#B8232D] bg-[#FDEAEB]',
  ems: 'text-[#1A3F94] bg-[#E3ECFD]',
  education: 'text-brand-goldink bg-[#FBF3D9]',
};

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
            </Link>{' '}
            <T id="jobs.employers.link-rule">with the link to apply. Every job on the board needs one.</T>
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
  const active = tabFromSlug(params.get('type'));
  const counts = countByCategory(items);
  const shown = items.filter((j) => j.category === active);
  const untyped = items.filter((j) => !hasCategory(j.category));
  const today = todayISO();
  const checked = lastChecked(items);
  const newCount = items.filter((j) => isNew(j.postedOn, today)).length;

  function pick(slug: string) {
    const next = new URLSearchParams(params);
    next.set('type', slug);
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
          ) : items.length === 0 ? (
            <div className="card p-8 text-muted">
              <T id="jobs.empty">
                No open positions listed right now. The board checks for new openings every week. Check back, or send us
                one below.
              </T>
            </div>
          ) : (
            <>
              {shown.length === 0 ? (
                <div className="card p-8 text-muted">
                  <T id="jobs.empty.category">No openings of this type listed right now.</T>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupByEmployer(shown).map((g) =>
                    g.length > 1 ? <EmployerCard key={g[0].id ?? g[0].title} jobs={g} today={today} /> : <JobCard key={g[0].id ?? g[0].title} j={g[0]} today={today} />,
                  )}
                </div>
              )}
              {untyped.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-disp font-bold uppercase text-xl mb-1">
                    <T id="jobs.untyped.title">Shared by members, type coming</T>
                  </h2>
                  <p className="text-muted text-[14px] mb-4 max-w-[80ch]">
                    <T id="jobs.untyped.text">
                      These show on every tab until the weekly check reads the link and files each one under its type.
                    </T>
                  </p>
                  <div className="space-y-5">
                    {untyped.map((j) => (
                      <JobCard key={j.id ?? j.title} j={j} today={today} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

    </>
  );
}

function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NewChip() {
  return (
    <span className={`${chip} text-white bg-brand-blue`}>
      <T id="jobs.item.new">New</T>
    </span>
  );
}

function ClosesChip({ j }: { j: JobItem }) {
  return (
    <span className={`${chip} text-[#0E7A4A] bg-[#E2F7EC]`}>
      {j.openUntilFilled ? (
        <T id="jobs.item.until-filled">Open until filled</T>
      ) : (
        <>
          <T id="jobs.item.open">Closes</T> {j.closes}
        </>
      )}
    </span>
  );
}

function TypeChip({ category }: { category: unknown }) {
  return hasCategory(category) ? (
    <span className={`${chip} ${CATEGORY_CHIP[category]}`}>{categoryLabel(category)}</span>
  ) : (
    <span className={`${chip} text-muted bg-paper border border-line`}>
      <T id="jobs.item.details-coming">Details coming</T>
    </span>
  );
}

function ApplyButton({ j }: { j: JobItem }) {
  if (!j.applyUrl) return null;
  return (
    <a href={j.applyUrl} target="_blank" rel="noreferrer" className="btn-outline !py-2 !px-4 text-[13.5px]">
      <T id="jobs.item.apply">Apply on the employer&apos;s site ↗</T>
    </a>
  );
}

// Who put the job up and when it was last checked. Compared as text (via
// sourceKey) so a card shows it once when every opening shares it.
function sourceKey(j: JobItem): string {
  return [j.source, j.postedOn ?? j.posted, j.lastSeenOn ?? '', j.confirmed === false, j.needsDetails === true].join('|');
}

function SourceLine({ j }: { j: JobItem }) {
  return (
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
          {j.needsDetails ? (
            <>
              {' · '}
              <T id="jobs.item.details-later">details coming at the weekly check</T>
            </>
          ) : (
            j.lastSeenOn && ` · checked ${shortDate(j.lastSeenOn)}`
          )}
        </>
      ) : (
        <>
          <T id="jobs.item.posted">Posted by the board</T> {j.postedOn ? shortDate(j.postedOn) : j.posted}
        </>
      )}
    </span>
  );
}

function JobCard({ j, today }: { j: JobItem; today: string }) {
  return (
    <article className="card p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
        <h2 className="font-disp font-bold uppercase text-2xl">{j.title}</h2>
        <span className="flex flex-wrap gap-2">
          {isNew(j.postedOn, today) && <NewChip />}
          <ClosesChip j={j} />
        </span>
      </div>
      <p className="text-[14.5px] font-semibold text-brand-blue mb-3">{[j.employer, j.location].filter(Boolean).join(' · ')}</p>
      <p className="mb-3">
        <TypeChip category={j.category} />
      </p>
      {j.description && <p className="text-muted text-[15px] mb-4 max-w-[80ch] whitespace-pre-line">{j.description}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
        <ApplyButton j={j} />
        <SourceLine j={j} />
      </div>
    </article>
  );
}

// One employer's openings on this tab under one card, with a dropdown
// (board, 2026-11-06). Whatever every opening shares (New, the closing date,
// the summary, the source line) shows once on the card; the rest on each
// row. Openings in more than one place are listed under each place.
function EmployerCard({ jobs, today }: { jobs: JobItem[]; today: string }) {
  const places = placesOf(jobs);
  const byPlace = places.length > 1 && jobs.every((j) => (j.location ?? '').trim());
  const allNew = jobs.every((j) => isNew(j.postedOn, today));
  const sameCloses = allSame(jobs, (j) => (j.openUntilFilled ? 'open' : j.closes));
  const sameText = allSame(jobs, (j) => j.description ?? '');
  const sameSource = allSame(jobs, sourceKey);
  const first = jobs[0];

  const row = (j: JobItem, withPlace: boolean) => (
    <div key={j.id ?? j.title} className="px-4 py-3.5 border-t border-line first:border-t-0 grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
        <b className="text-[16px]">
          {j.title}
          {withPlace && j.location ? ` · ${j.location}` : ''}
        </b>
        {((!allNew && isNew(j.postedOn, today)) || !sameCloses) && (
          <span className="flex flex-wrap gap-2">
            {!allNew && isNew(j.postedOn, today) && <NewChip />}
            {!sameCloses && <ClosesChip j={j} />}
          </span>
        )}
      </div>
      {!sameText && j.description && <p className="text-muted text-[15px] max-w-[80ch] whitespace-pre-line">{j.description}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
        <ApplyButton j={j} />
        {!sameSource && <SourceLine j={j} />}
      </div>
    </div>
  );

  return (
    <article className="card p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
        <h2 className="font-disp font-bold uppercase text-2xl">{first.employer}</h2>
        {(allNew || sameCloses) && (
          <span className="flex flex-wrap gap-2">
            {allNew && <NewChip />}
            {sameCloses && <ClosesChip j={first} />}
          </span>
        )}
      </div>
      <p className="text-[14.5px] font-semibold text-brand-blue mb-3">
        {jobs.length} <T id="jobs.group.openings">openings</T>
        {places.length > 0 && ` · ${places.join(', ')}`}
      </p>
      <p className="mb-3">
        <TypeChip category={first.category} />
      </p>
      {sameText && first.description && <p className="text-muted text-[15px] mb-4 max-w-[80ch] whitespace-pre-line">{first.description}</p>}
      <details className="group mt-1">
        <summary className="list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-2 cursor-pointer rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-[13.5px] font-bold hover:border-brand-blue hover:text-brand-blue">
          <span className="group-open:hidden">
            <T id="jobs.group.show">Show the openings</T> ({jobs.length})
          </span>
          <span className="hidden group-open:inline">
            <T id="jobs.group.hide">Hide the openings</T>
          </span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="mt-4 rounded-xl border border-line overflow-hidden">
          {byPlace
            ? places.map((p) => (
                <div key={p} className="border-t border-line first:border-t-0">
                  <h3 className="font-disp font-bold uppercase tracking-[0.08em] text-[15px] px-4 py-2.5 bg-paper">{p}</h3>
                  {jobs.filter((j) => (j.location ?? '').trim().toLowerCase() === p.toLowerCase()).map((j) => row(j, false))}
                </div>
              ))
            : jobs.map((j) => row(j, places.length > 1))}
        </div>
      </details>
      {sameSource && (
        <p className="mt-4 text-[13.5px]">
          <SourceLine j={first} />
        </p>
      )}
    </article>
  );
}
