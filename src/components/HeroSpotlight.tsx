import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Spotlight } from '../lib/postings';

// The homepage's "one main screen that flips through": the mission statement
// leads, then board-editable spotlights (next meeting, awards, schools,
// instructors, lab work). Auto-advances every 8 s, pauses on hover or focus,
// stays still for reduced-motion users, and is fully keyboard-operable.

const INTERVAL_MS = 8000;

function SlideLink({ to, className, children }: { to: string; className: string; children: React.ReactNode }) {
  if (to.startsWith('/')) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

export default function HeroSpotlight({
  spotlights,
  onActiveChange,
}: {
  spotlights: Spotlight[];
  onActiveChange?: (s: Spotlight | null) => void;
}) {
  const total = 1 + spotlights.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Keep the index valid if the spotlight list shrinks (e.g. one expires).
  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [index, total]);

  useEffect(() => {
    onActiveChange?.(index === 0 ? null : spotlights[index - 1] ?? null);
  }, [index, spotlights, onActiveChange]);

  const running = total > 1 && !paused && !reduced;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % total);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
    // `index` is a dependency on purpose: a manual jump restarts the clock.
  }, [running, total, index]);

  const go = (i: number) => setIndex(((i % total) + total) % total);

  // Slides stack in one grid cell. On desktop the cell keeps the height of
  // the tallest slide so the events board beside it never jumps; on phones
  // (board below, not beside) inactive slides go absolute so the hero hugs
  // whichever slide is showing instead of leaving a gap above the controls.
  const stack = 'col-start-1 row-start-1 transition-all duration-700 ease-out motion-reduce:transition-none';
  const shown = 'opacity-100 translate-y-0';
  const hidden = 'opacity-0 translate-y-3 pointer-events-none max-lg:absolute max-lg:inset-x-0 max-lg:top-0';

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="FAEMSE spotlight"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
    >
      <div className="grid relative" ref={liveRef}>
        {/* Slide 0 — the mission. Always first, never expires. */}
        <div
          className={`${stack} ${index === 0 ? shown : hidden}`}
          aria-hidden={index !== 0}
          aria-roledescription="slide"
          aria-label={`1 of ${total}`}
        >
          <p className="font-disp font-semibold text-base tracking-[0.26em] uppercase text-brand-goldsoft flex items-center gap-3 mb-6">
            <span className="w-[26px] h-[3px] rounded-sm bg-gradient-to-r from-brand-goldsoft to-brand-golddeep" />
            Florida Association of EMS Educators
          </p>
          {/* 80px cap: the widest line ("We train the people") measures 7.99px
              per 1px of font size, and the column is ~645px — above 80px the
              three-line lockup rewraps onto five lines and buries the CTAs. */}
          <h1 className="font-disp font-bold uppercase leading-[0.94] text-[clamp(48px,5.8vw,80px)]">
            We train the people
            <br />
            who train Florida&apos;s
            <br />
            <span className="gold-text drop-shadow-[0_2px_24px_rgba(235,188,66,.35)]">
              first responders.
            </span>
          </h1>
          <p className="text-[18px] text-[#BCCBE7] max-w-[52ch] my-8">
            FAEMSE is the statewide professional home for EMS instructors, program directors, and
            training officers — the network, the resources, and the policy voice behind better EMT
            and paramedic education.
          </p>
          <div className="flex flex-wrap gap-3.5 mb-8">
            <Link to="/membership" className="btn-red">
              Become a member — $50/yr
            </Link>
            <Link to="/events" className="btn-glass">
              See what&apos;s coming up
            </Link>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {['501(c)(6) nonprofit', 'Every program type, statewide', 'Statewide meetings & workshops'].map((c) => (
              <span
                key={c}
                className="text-[12.5px] font-semibold text-[#AFC1E2] border border-white/15 bg-white/5 px-3.5 py-2 rounded-full backdrop-blur"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Spotlight slides — from the board's Spotlights panel. */}
        {spotlights.map((s, i) => {
          const n = i + 1;
          const active = index === n;
          return (
            <div
              key={s.id ?? s.title}
              className={`${stack} ${active ? shown : hidden}`}
              aria-hidden={!active}
              aria-roledescription="slide"
              aria-label={`${n + 1} of ${total}`}
            >
              <p className="font-disp font-semibold text-base tracking-[0.26em] uppercase text-brand-goldsoft flex items-center gap-3 mb-6">
                <i className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_12px_rgba(58,219,143,.9)]" aria-hidden />
                {s.kicker || 'Spotlight'}
              </p>
              <h2 className="font-disp font-bold uppercase leading-[0.96] text-[clamp(40px,5vw,68px)] max-w-[14ch] [text-wrap:balance]">
                {s.title}
              </h2>
              {s.body && <p className="text-[18px] text-[#BCCBE7] max-w-[52ch] my-8">{s.body}</p>}
              <div className="flex flex-wrap gap-3.5 mb-8">
                {s.linkUrl && (
                  <SlideLink to={s.linkUrl} className="btn-gold">
                    {s.linkLabel || 'Learn more'}
                    {!s.linkUrl.startsWith('/') && ' ↗'}
                  </SlideLink>
                )}
                <Link to="/membership" className="btn-glass">
                  Become a member
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls: one progress bar per slide, arrows, and a live counter. */}
      {total > 1 && (
        <div className="flex items-center gap-4 mt-10">
          <div className="flex gap-2 flex-1 max-w-[360px]" role="tablist" aria-label="Choose a slide">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={index === i}
                aria-label={`Slide ${i + 1} of ${total}`}
                onClick={() => go(i)}
                className="group h-5 flex-1 flex items-center"
              >
                <span className="block h-[3px] w-full rounded-full bg-white/15 overflow-hidden group-hover:bg-white/25 transition-colors">
                  <span
                    key={`${i}-${index}-${running}`}
                    className={`block h-full rounded-full bg-gradient-to-r from-brand-goldsoft to-brand-golddeep ${
                      index === i ? (running ? 'animate-[spot_8s_linear_forwards]' : 'w-full') : 'w-0'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
          <span className="font-disp font-semibold text-[13px] tracking-[0.2em] text-[#93A6C9] tabular-nums">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="w-10 h-10 grid place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="w-10 h-10 grid place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <style>{`@keyframes spot{from{width:0}to{width:100%}}`}</style>
        </div>
      )}
    </div>
  );
}
