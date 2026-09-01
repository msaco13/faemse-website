import PageHead from '../components/PageHead';
import { useClasses } from '../lib/postings';

// Schools email upcoming offerings; the board posts them. Same pattern as the
// job board: public, expiring, hidden automatically after the closing date.
export default function Classes() {
  const { items, live, loaded } = useClasses();

  return (
    <>
      <PageHead
        eyebrow="Upcoming offerings"
        title="Class board"
        sub="Courses, cohorts, and instructor qualifications opening around Florida — posted by the board as programs announce them."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {loaded && !live && (
            <p className="mb-5 inline-block text-[12px] font-bold tracking-[0.12em] uppercase text-brand-goldink bg-[#FBF3D9] px-3.5 py-1.5 rounded-full">
              Sample listings — real offerings post here
            </p>
          )}

          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              Loading listings…
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-muted">
              Nothing listed right now — new offerings post here as programs announce them.
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((c) => (
                <article key={c.id ?? c.title} className="card p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
                    <h2 className="font-disp font-bold uppercase text-2xl">{c.title}</h2>
                    {c.starts && (
                      <span className="text-[12px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full text-[#1A47B8] bg-[#E7EEFF]">
                        Starts {c.starts}
                      </span>
                    )}
                  </div>
                  <p className="text-[14.5px] font-semibold text-brand-blue mb-3">
                    {[c.provider, c.location].filter(Boolean).join(' · ')}
                  </p>
                  {c.description && <p className="text-muted text-[15px] mb-4 max-w-[80ch]">{c.description}</p>}
                  {c.contact && (
                    <a
                      href={c.contact.includes('@') && !c.contact.startsWith('http') ? `mailto:${c.contact}` : c.contact}
                      target={c.contact.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="font-bold text-brand-blue hover:underline text-[14.5px]"
                    >
                      Enrollment &amp; questions →
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-disp font-bold uppercase text-xl mb-1">Running a class?</h2>
              <p className="text-muted text-[15px] max-w-[64ch]">
                Email the details and we&apos;ll post it — listings come down automatically after
                the start date, and we can repost recurring offerings each cycle.
              </p>
            </div>
            <a href="mailto:info@faemse.org?subject=Class%20listing%20for%20the%20FAEMSE%20board" className="btn-red">
              Submit a class
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
