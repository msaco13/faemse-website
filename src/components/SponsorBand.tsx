import { useState } from 'react';
import { PlayPauseIcon } from './HeroSpotlight';
import { sponsorLogoSrc, useSponsors } from '../lib/postings';
import { sponsorInitials } from '../lib/sponsors';
import { T, useText } from '../lib/text';

// The moving band of corporate sponsors: each name with its logo beside it
// (board, 2026-10-21). Two places: the top of the homepage hero, and across
// the bottom of the member portal on every tab but Corporate sponsors, which
// shows the same companies as a still wall (SponsorWall).
//
// Logos sit on small white tiles. Several are dark on a clear background
// (American Medical Academy, Coral Springs, EETI, Public Safety Group) and all
// but vanish on the navy without one. A sponsor with no logo on file shows its
// initials in gold until one is uploaded in Admin → Sponsors.
//
// 110 seconds per pass (the tiles made each pass longer; the names move at
// about the speed they did in September 2026, when sixteen names needed
// 90 seconds to read). It pauses under the pointer so a name can be clicked,
// while a name has keyboard focus, and for good with the Pause button
// (WCAG 2.2.2). Reduced-motion visitors get a still row.
export default function SponsorBand({ where }: { where: 'home' | 'portal' }) {
  const sponsors = useSponsors().items;
  const [stopped, setStopped] = useState(false);
  const aria = useText('home.sponsors.aria', 'Sponsors');
  const pause = useText('home.sponsors.aria.pause', 'Pause the sponsor names');
  const play = useText('home.sponsors.aria.play', 'Play the sponsor names');

  // Home: transparent, on the hero's own backdrop, under the header's gold
  // line. Portal: its own navy band above the footer.
  const outer =
    where === 'home'
      ? 'relative z-10 pt-4 overflow-hidden'
      : 'velvet relative overflow-hidden text-white border-t-2 border-brand-gold/50 py-7 bg-[radial-gradient(900px_300px_at_50%_0%,#143257_0%,#0A213B_60%,#071A32_100%)]';

  return (
    <section className={outer} aria-label={aria}>
      {/* #93A6C9 keeps the band at 4.5:1 or better across the navy, glow
          included. */}
      <div className="px-6 mb-4 flex items-center justify-center gap-3">
        <p className="text-center font-disp font-semibold text-[13px] tracking-[0.3em] uppercase text-[#93A6C9]">
          {where === 'home' ? (
            <T id="home.sponsors.text">Backed by the companies behind Florida EMS education</T>
          ) : (
            <T id="members.sponsors.band">Thank you to the companies behind FAEMSE</T>
          )}
        </p>
        <button
          type="button"
          onClick={() => setStopped((v) => !v)}
          aria-label={stopped ? play : pause}
          className="flex-none w-7 h-7 grid place-items-center rounded-full border border-white/15 bg-white/5 text-[#93A6C9] hover:text-white hover:bg-white/15 transition-colors motion-reduce:hidden"
        >
          <PlayPauseIcon playing={!stopped} size={12} />
        </button>
      </div>
      {/* Four copies, scrolled by a quarter (one copy's width): the loop is
          seamless as long as three copies span the screen. Two copies ran
          dry on a 2,560px screen and showed an empty strip once per loop.
          The Pause button holds it with an inline style: a class loses to
          the animation shorthand, which sets the play state back to
          running. */}
      <div
        className="flex items-center w-max gap-14 pr-14 animate-[marq_110s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none"
        style={stopped ? { animationPlayState: 'paused' } : undefined}
      >
        {[...sponsors, ...sponsors, ...sponsors, ...sponsors].map((s, i) => {
          // The extra copies exist only to make the loop seamless; hidden
          // from screen readers and the tab order so sponsors aren't
          // announced or tabbed through four times.
          const dup = i >= sponsors.length;
          const logo = sponsorLogoSrc(s.logo);
          // The logo's alt is empty: the name is right beside it.
          const mark = logo ? (
            <span className="flex-none h-[46px] min-w-[46px] px-2.5 py-1.5 rounded-[10px] bg-white grid place-items-center shadow-[0_6px_18px_rgba(0,0,0,.25)]">
              <img src={logo} alt="" className="block max-h-[34px] max-w-[104px] w-auto object-contain" />
            </span>
          ) : (
            <span
              aria-hidden
              className="flex-none h-[46px] min-w-[46px] px-2.5 rounded-[10px] border-[1.5px] border-brand-goldsoft/55 grid place-items-center text-[17px] font-bold tracking-[0.06em] text-brand-goldsoft"
            >
              {sponsorInitials(s.name)}
            </span>
          );
          const cls = 'flex-none flex items-center gap-3.5 font-disp font-semibold text-[20px] tracking-[0.1em] uppercase text-[#93A6C9] whitespace-nowrap';
          return s.url ? (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-hidden={dup || undefined}
              tabIndex={dup ? -1 : undefined}
              className={`${cls} hover:text-brand-goldsoft transition-colors`}
            >
              {mark}
              {s.name}
            </a>
          ) : (
            <span key={i} aria-hidden={dup || undefined} className={cls}>
              {mark}
              {s.name}
            </span>
          );
        })}
      </div>
      <style>{`@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-25%)}}`}</style>
    </section>
  );
}
