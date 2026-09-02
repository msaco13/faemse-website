import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { mailto } from '../content/data';
import { useJobs } from '../lib/postings';

// Public on purpose: there is no paid-posting model — the board posts openings
// as it hears of them, and gating would only shrink the audience. Placement is
// one of the three CoAEMSP program metrics, so this board sits close to the
// accreditation material (cross-linked below).
export default function Jobs() {
  const { items, live, loaded } = useJobs();

  return (
    <>
      <PageHead
        eyebrow="Careers in EMS education"
        title="Job board"
        sub="Openings for instructors, coordinators, and program directors across Florida — posted by the board as we hear of them."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {loaded && !live && (
            <p className="mb-5 inline-block text-[12px] font-bold tracking-[0.12em] uppercase text-brand-goldink bg-[#FBF3D9] px-3.5 py-1.5 rounded-full">
              Sample listings — real openings post here
            </p>
          )}

          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              Loading openings…
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-muted">
              No open positions listed right now. New openings post here as the board hears of
              them — check back, or send us one below.
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((j) => (
                <article key={j.id ?? j.title} className="card p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
                    <h2 className="font-disp font-bold uppercase text-2xl">{j.title}</h2>
                    <span className="text-[12px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full text-[#0E7A4A] bg-[#E2F7EC]">
                      Open through {j.closes}
                    </span>
                  </div>
                  <p className="text-[14.5px] font-semibold text-brand-blue mb-3">
                    {[j.employer, j.location].filter(Boolean).join(' · ')}
                  </p>
                  {j.description && <p className="text-muted text-[15px] mb-4 max-w-[80ch]">{j.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-[13.5px]">
                    {j.applyUrl && (
                      <a href={j.applyUrl} target="_blank" rel="noreferrer" className="btn-outline !py-2 !px-4 text-[13.5px]">
                        Apply ↗
                      </a>
                    )}
                    <span className="text-muted">Posted {j.posted}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-disp font-bold uppercase text-xl mb-1">Hiring an EMS educator?</h2>
              <p className="text-muted text-[15px] max-w-[64ch]">
                Send the posting to the board and we&apos;ll list it here — free, statewide, in
                front of every program. Listings come down automatically on their closing date.
              </p>
            </div>
            <a href={mailto('Job%20posting%20for%20the%20FAEMSE%20board')} className="btn-red">
              Send a posting
            </a>
          </div>

          <p className="text-muted text-[14px] mt-6 max-w-[80ch]">
            Why we run this: graduate placement is one of the three outcomes every accredited
            paramedic program is measured on, alongside retention and exam pass rate. New program
            director?{' '}
            <Link to="/program-directors" className="text-brand-blue font-semibold hover:underline">
              Start with the director guide →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
