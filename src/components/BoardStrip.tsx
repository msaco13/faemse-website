import { Link } from 'react-router-dom';
import { splitEvents, useSiteEvents } from '../lib/content';
import { T, useText } from '../lib/text';

// "On the board": the next three dates, straight from the calendar the board
// edits. One strip, two places: under the homepage hero and under the member
// portal's tabs, with the same wording (home.board.*) in both.
export default function BoardStrip() {
  const eventsState = useSiteEvents();
  const upcoming = splitEvents(eventsState.items).upcoming;
  const boardAria = useText('home.board.aria', 'On the board');
  return (
    <section className="velvet bg-[#071A32] border-t border-white/10 text-white" aria-label={boardAria}>
      {/* min-h: the row is this tall once the dates arrive; holding it from
          the start keeps the page from stepping down when they do. */}
      {/* minmax(0,1fr): a long event title wraps instead of widening its
          column and pushing the row past the screen edge. grid-cols-1 does
          the same on phones, where a long location (one line, cut off with
          "…") made the page 50px wider than a 320px screen. */}
      <div className="wrap grid grid-cols-1 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch lg:min-h-[82px]">
        <div className="flex items-center gap-2.5 py-4 lg:pr-7 font-disp font-semibold text-[14px] tracking-[0.22em] uppercase text-brand-bluesoft lg:border-r border-white/10 max-lg:border-b">
          <i className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)]" aria-hidden />
          <T id="home.board.label">On the board</T>
          {eventsState.down && eventsState.savedAt && (
            <span className="ml-2 text-[11px] font-bold tracking-widest text-brand-goldsoft"><T id="home.board.saved">SAVED COPY</T></span>
          )}
        </div>
        {eventsState.down && !eventsState.savedAt && (
          <p className="lg:col-span-3 flex items-center px-0 lg:px-6 py-4 text-[14px] text-[#93A6C9]">
            <T id="home.board.down">The calendar can't load right now. Check back in a few minutes.</T>
          </p>
        )}
        {eventsState.loaded && !(eventsState.down && !eventsState.savedAt) && upcoming.length === 0 && (
          <p className="lg:col-span-3 flex items-center px-0 lg:px-6 py-4 text-[14px] text-[#93A6C9]">
            <T id="home.board.empty">The 2026–27 calendar is being finalized — check back soon.</T>
          </p>
        )}
        {upcoming.slice(0, 3).map((e) => (
          <Link
            key={e.id ?? e.title}
            to="/events"
            className="flex gap-4 items-center py-3.5 lg:px-6 lg:border-r border-white/10 max-lg:border-b max-lg:border-white/5 hover:bg-white/5"
          >
            <div className="flex-none w-[50px] text-center font-disp uppercase bg-brand-blue/15 border border-brand-bluesoft/30 rounded-xl py-2 leading-none">
              <b className="block text-[21px] gold-text">{e.day}</b>
              <span className="text-xs tracking-[0.14em] text-brand-goldsoft">{e.month}</span>
            </div>
            <div className="min-w-0">
              <b className="block text-[15px] leading-snug text-white">{e.title}</b>
              <span className="block text-[13px] text-[#93A6C9] truncate">{e.location}</span>
            </div>
          </Link>
        ))}
        <Link to="/events" className="flex items-center py-4 lg:pl-7 text-[13.5px] font-bold text-brand-bluesoft hover:text-white whitespace-nowrap">
          <T id="home.board.cta">Full calendar →</T>
        </Link>
      </div>
    </section>
  );
}
