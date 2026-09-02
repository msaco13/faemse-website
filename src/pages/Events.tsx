import PageHead from '../components/PageHead';
import { EventItem, splitEvents, useSiteEvents } from '../lib/content';

const tagStyles: Record<string, string> = {
  blue: 'text-[#1A47B8] bg-[#E7EEFF]',
  red: 'text-[#B8232D] bg-[#FDEAEB]',
  green: 'text-[#0E7A4A] bg-[#E2F7EC]',
  gold: 'text-brand-goldink bg-[#FBF3D9]',
};

function EventRow({ e, past = false }: { e: EventItem; past?: boolean }) {
  return (
    <div
      className={`grid md:grid-cols-[110px_1.6fr_1fr_140px] gap-4 items-center px-7 py-6 border-b border-line last:border-b-0 hover:bg-paper transition-colors ${
        past ? 'opacity-60' : ''
      }`}
    >
      <div className="font-disp uppercase leading-none">
        <b className="block text-[32px] font-bold">{e.day}</b>
        <span className="text-[13px] tracking-[0.16em] text-muted">
          {e.month} {e.year}
        </span>
      </div>
      <div>
        <b className="block text-[16.5px]">{e.title}</b>
        <span className="text-[13.5px] text-muted">{e.detail}</span>
        {e.url && !past && (
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="block mt-1 text-[13.5px] font-bold text-brand-blue hover:underline"
          >
            Details &amp; registration ↗
          </a>
        )}
      </div>
      <span className="text-[14px] text-muted hidden md:block">{e.location}</span>
      <span
        className={`justify-self-start md:justify-self-end text-[11px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full ${
          past ? 'text-muted bg-paper' : tagStyles[e.tagColor]
        }`}
      >
        {past ? 'Held' : e.tag}
      </span>
    </div>
  );
}

export default function Events() {
  const { items, live, loaded } = useSiteEvents();
  const { upcoming, past } = splitEvents(items);

  return (
    <>
      <PageHead
        eyebrow="Calendar"
        title="Upcoming across Florida"
        sub={
          live || !loaded
            ? 'Workshops, competitions, and statewide membership meetings.'
            : 'Sample listings shown while the association finalizes the 2026–27 calendar.'
        }
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {loaded && !live && (
            <p className="mb-5 inline-block text-[12px] font-bold tracking-[0.12em] uppercase text-brand-goldink bg-[#FBF3D9] px-3.5 py-1.5 rounded-full">
              Sample calendar — dates being confirmed
            </p>
          )}
          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              Loading the calendar…
            </div>
          ) : upcoming.length > 0 ? (
            <div className="card overflow-hidden shadow-[0_18px_50px_rgba(10,27,51,.08)]">
              {upcoming.map((e) => (
                <EventRow key={e.id ?? e.title} e={e} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-muted">
              No upcoming events on the calendar right now — new dates post here as the board
              confirms them.
            </div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="font-disp font-bold uppercase text-xl mt-12 mb-4 text-muted">
                Recently held
              </h2>
              <div className="card overflow-hidden">
                {past.map((e) => (
                  <EventRow key={e.id ?? e.title} e={e} past />
                ))}
              </div>
            </>
          )}

          <p className="text-muted text-[14px] mt-6">
            Registration and event questions:{' '}
            <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
              info@faemse.org
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
