import { Link } from 'react-router-dom';
import { sponsorLogoSrc, useSponsors } from '../lib/postings';
import { sponsorInitials } from '../lib/sponsors';
import { T } from '../lib/text';

// The member portal's Corporate sponsors tab (board, 2026-10-21): every
// sponsor at once, logo and name, still. The moving band that runs across the
// bottom of the other tabs is off on this one, so the same companies don't
// show twice. Same list, order and logos as the band and the public Sponsors
// page, from Admin → Sponsors; a sponsor with no logo on file shows its
// initials.
export default function SponsorWall() {
  const { items: sponsors } = useSponsors();
  return (
    <section aria-labelledby="sponsor-wall" className="card p-7 md:p-8 border-t-[3px] border-t-brand-gold/70">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 mb-6">
        <div className="flex flex-col gap-1">
          <p className="font-disp font-semibold text-[13px] tracking-[0.2em] uppercase text-brand-goldink">
            <T id="members.sponsors.kicker">Thank you</T>
          </p>
          <h2 id="sponsor-wall" className="font-disp font-bold uppercase text-[30px] leading-none">
            <T id="members.sponsors.title">Our corporate sponsors</T>
          </h2>
          <p className="text-muted text-[14.5px] max-w-[68ch]">
            <T id="members.sponsors.text">
              The companies, academies and organizations that back EMS education across Florida as Corporate members of FAEMSE.
            </T>
          </p>
        </div>
        <Link to="/sponsors" className="inline-flex items-center min-h-6 font-bold text-[14.5px] text-brand-blue hover:underline">
          <T id="members.sponsors.more">About sponsorship →</T>
        </Link>
      </div>
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))] list-none p-0 m-0">
        {sponsors.map((s) => {
          const logo = sponsorLogoSrc(s.logo);
          // The logo's alt is empty: the name is right beside it.
          const inner = (
            <>
              {logo ? (
                <span className="flex-none w-[88px] h-12 grid place-items-center">
                  <img src={logo} alt="" loading="lazy" className="block max-h-12 max-w-[88px] w-auto object-contain" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className="flex-none w-[88px] h-12 rounded-[10px] bg-ink grid place-items-center font-disp font-bold text-[18px] tracking-[0.06em] text-brand-goldsoft"
                >
                  {sponsorInitials(s.name)}
                </span>
              )}
              <span className="min-w-0 text-[14.5px] font-bold leading-snug">{s.name}</span>
            </>
          );
          const cls = 'flex items-center gap-3.5 min-h-[72px] px-3.5 py-2.5 rounded-[14px] border border-line bg-white text-ink';
          return (
            <li key={s.id ?? s.name}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-brand-gold/60 transition-colors`}>
                  {inner}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
