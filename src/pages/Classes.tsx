import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { CantLoad, SavedCopyNote } from '../components/SavedCopy';
import { contactPath } from '../content/data';
import { useClasses } from '../lib/postings';
import { T } from '../lib/text';

// Schools email upcoming offerings; the board posts them. Same pattern as the
// job board: public, expiring, hidden automatically after the closing date.
export default function Classes() {
  const { items, loaded, down, savedAt } = useClasses();

  return (
    <>
      <PageHead
        id="classes"
        eyebrow="Upcoming offerings"
        title="Class board"
        sub="Courses, cohorts, and instructor qualifications opening around Florida — posted by the board as programs announce them."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {down && savedAt && (
            <SavedCopyNote id="classes" savedAt={savedAt} note="The live class board couldn't be reached, so confirm details with the program before you sign up." />
          )}

          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              <T id="classes.loading">Loading listings…</T>
            </div>
          ) : down && !savedAt ? (
            <CantLoad id="classes" what="class board" />
          ) : items.length === 0 ? (
            <div className="card p-8 text-muted">
              <T id="classes.empty">Nothing listed right now — new offerings post here as programs announce them.</T>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((c) => (
                <article key={c.id ?? c.title} className="card p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1.5">
                    <h2 className="font-disp font-bold uppercase text-2xl">{c.title}</h2>
                    {c.starts && (
                      <span className="text-[12px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full text-[#1A47B8] bg-[#E7EEFF]">
                        <T id="classes.item.starts">Starts</T> {c.starts}
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
                      <T id="classes.item.enroll">Enrollment &amp; questions →</T>
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-disp font-bold uppercase text-xl mb-1"><T id="classes.send.h2">Running a class?</T></h2>
              <p className="text-muted text-[15px] max-w-[64ch]">
                <T id="classes.send.details">
                  Send us the details and we&apos;ll post it. Listings come down automatically after
                  the start date, and we can repost recurring offerings each cycle.
                </T>
              </p>
            </div>
            <Link to={contactPath('Class listing for the FAEMSE board')} className="btn-red">
              <T id="classes.send.cta">Submit a class</T>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
