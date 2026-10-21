import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { CantLoad, SavedCopyNote } from '../components/SavedCopy';
import { contactPath } from '../content/data';
import { useJobs } from '../lib/postings';
import { T } from '../lib/text';

// Members only since 2026-10-13 (board decision; the route wraps this page in
// MembersOnly). There is no paid-posting model — the board posts openings
// as it hears of them. Placement is
// one of the three CoAEMSP program metrics, so this board sits close to the
// accreditation material (cross-linked below).
export default function Jobs() {
  const { items, loaded, down, savedAt } = useJobs();

  return (
    <>
      <PageHead
        id="jobs"
        eyebrow="Careers in EMS education"
        title="Job board"
        sub="Openings for instructors, coordinators, and program directors across Florida — posted by the board as we hear of them."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {down && savedAt && (
            <SavedCopyNote id="jobs" savedAt={savedAt} note="The live job board couldn't be reached, so check with the employer that an opening is still available." />
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
                No open positions listed right now. New openings post here as the board hears of
                them — check back, or send us one below.
              </T>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((j) => (
                <article key={j.id ?? j.title} className="card p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
                    <h2 className="font-disp font-bold uppercase text-2xl">{j.title}</h2>
                    <span className="text-[12px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full text-[#0E7A4A] bg-[#E2F7EC]">
                      <T id="jobs.item.open">Open through</T> {j.closes}
                    </span>
                  </div>
                  <p className="text-[14.5px] font-semibold text-brand-blue mb-3">
                    {[j.employer, j.location].filter(Boolean).join(' · ')}
                  </p>
                  {j.description && <p className="text-muted text-[15px] mb-4 max-w-[80ch]">{j.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-[13.5px]">
                    {j.applyUrl && (
                      <a href={j.applyUrl} target="_blank" rel="noreferrer" className="btn-outline !py-2 !px-4 text-[13.5px]">
                        <T id="jobs.item.apply">Apply ↗</T>
                      </a>
                    )}
                    <span className="text-muted"><T id="jobs.item.posted">Posted</T> {j.posted}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-disp font-bold uppercase text-xl mb-1"><T id="jobs.send.h2">Hiring an EMS educator?</T></h2>
              <p className="text-muted text-[15px] max-w-[64ch]">
                <T id="jobs.send.text">
                  Send the posting to the board and we&apos;ll list it here — free, statewide, in
                  front of every program. Listings come down automatically on their closing date.
                </T>
              </p>
            </div>
            <Link to={contactPath('Job posting for the FAEMSE board')} className="btn-red">
              <T id="jobs.send.cta">Send a posting</T>
            </Link>
          </div>

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
