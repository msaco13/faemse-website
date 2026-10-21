import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { contactPath } from '../content/data';
import { CantLoad, SavedCopyNote } from '../components/SavedCopy';
import { EventItem, splitEvents, useSiteEvents } from '../lib/content';
import { T } from '../lib/text';

const tagStyles: Record<string, string> = {
  blue: 'text-[#1A47B8] bg-[#E7EEFF]',
  red: 'text-[#B8232D] bg-[#FDEAEB]',
  green: 'text-[#0E7A4A] bg-[#E2F7EC]',
  gold: 'text-brand-goldink bg-[#FBF3D9]',
};

function EventRow({ e, past = false }: { e: EventItem; past?: boolean }) {
  // Past rows used to be faded with opacity, which dropped the grey text to
  // 2.6:1 against white (WCAG AA asks 4.5:1). They are now marked by muted
  // colours that still pass, plus the "Held" pill and no registration link.
  return (
    <div
      className={`grid md:grid-cols-[110px_1.6fr_1fr_140px] gap-4 items-center px-7 py-6 border-b border-line last:border-b-0 hover:bg-paper transition-colors ${
        past ? 'bg-paper/50' : ''
      }`}
    >
      <div className={`font-disp uppercase leading-none ${past ? 'text-muted' : ''}`}>
        <b className="block text-[32px] font-bold">{e.day}</b>
        <span className="text-[13px] tracking-[0.16em] text-muted">
          {e.month} {e.year}
        </span>
      </div>
      <div>
        <b className={`block text-[16.5px] ${past ? 'text-muted' : ''}`}>{e.title}</b>
        <span className="text-[13.5px] text-muted">{e.detail}</span>
        {e.url && !past && (
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="block mt-1 text-[13.5px] font-bold text-brand-blue hover:underline"
          >
            <T id="events.item.details">Details &amp; registration ↗</T>
          </a>
        )}
      </div>
      <span className="text-[14px] text-muted hidden md:block">{e.location}</span>
      <span
        className={`justify-self-start md:justify-self-end text-[11px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full ${
          past ? 'text-muted bg-paper' : tagStyles[e.tagColor]
        }`}
      >
        {past ? <T id="events.item.held">Held</T> : e.tag}
      </span>
    </div>
  );
}

export default function Events() {
  const { items, loaded, down, savedAt } = useSiteEvents();
  const { upcoming, past } = splitEvents(items);

  return (
    <>
      <PageHead
        id="events"
        eyebrow="Calendar"
        title="Upcoming across Florida"
        sub="Workshops, competitions, and statewide membership meetings."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {down && savedAt && (
            <SavedCopyNote id="events" savedAt={savedAt} note="The live calendar couldn't be reached, so confirm dates before you travel." />
          )}
          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              <T id="events.loading">Loading the calendar…</T>
            </div>
          ) : down && !savedAt ? (
            <CantLoad id="events" what="calendar" />
          ) : upcoming.length > 0 ? (
            <div className="card overflow-hidden shadow-[0_18px_50px_rgba(10,33,59,.08)]">
              {upcoming.map((e) => (
                <EventRow key={e.id ?? e.title} e={e} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-muted">
              <T id="events.empty">
                No upcoming events on the calendar right now — new dates post here as the board
                confirms them.
              </T>
            </div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="font-disp font-bold uppercase text-xl mt-12 mb-4 text-muted">
                <T id="events.past.h2">Recently held</T>
              </h2>
              <div className="card overflow-hidden">
                {past.map((e) => (
                  <EventRow key={e.id ?? e.title} e={e} past />
                ))}
              </div>
            </>
          )}

          <p className="text-muted text-[14px] mt-6">
            <T id="events.contact.label">Registration and event questions:</T>{' '}
            <Link className="text-brand-blue font-semibold hover:underline" to={contactPath('Event question')}>
              <T id="events.contact.link">send us a message</T>
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
