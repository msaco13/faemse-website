import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { welcomeSlide } from '../content/data';
import type { Spotlight } from '../lib/postings';
import { T, useSiteText, useText } from '../lib/text';

// The homepage's "one main screen that flips through": the welcome slide
// leads, then the other spotlights (next meeting, awards, schools,
// instructors, lab work). All of them, the welcome slide included, are rows
// in the board's Spotlights panel with the same fields; the welcome slide
// (is_welcome) keeps its own look. Auto-advances every 8 s, pauses on hover
// or focus, stays still for reduced-motion users, and is fully
// keyboard-operable.

const INTERVAL_MS = 8000;

// Slides that are off screen are aria-hidden, but aria-hidden alone leaves
// their buttons and links in the Tab order (WCAG 4.1.2, flagged by axe as
// aria-hidden-focus). The `inert` attribute takes them out of it as well.
// React 18's types do not know `inert`, hence the spread.
function inertWhen(on: boolean): Record<string, string> {
  return on ? { inert: '' } : {};
}

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
  // Until the rows arrive on a first visit (or if none are showing), the
  // bundled welcome slide stands in, so the hero never paints empty.
  const slides: Spotlight[] = spotlights.length > 0 ? spotlights : [welcomeSlide];
  const total = slides.length;
  // One slide sits in the page flow and sets the hero's height; the rest lie
  // absolutely over it. That is the welcome slide wherever the board orders
  // it (it is the tallest, with its tags), else the first slide.
  const flowIndex = Math.max(0, slides.findIndex((s) => s.welcome));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);
  const regionLabel = useText('home.hero.aria.region', 'FAEMSE spotlight');
  const tabsLabel = useText('home.hero.aria.tabs', 'Choose a slide');
  const prevLabel = useText('home.hero.aria.prev', 'Previous slide');
  const nextLabel = useText('home.hero.aria.next', 'Next slide');
  // In edit mode the page's words highlight, but the slides come from the
  // Spotlights panel, not the text editor. Say so on the slide itself,
  // otherwise an admin reasonably concludes the slides are stuck (the board
  // hit exactly this on launch day).
  const { editing } = useSiteText();

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
    onActiveChange?.(slides[index] ?? null);
  }, [index, slides, onActiveChange]);

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

  // Slides stack in one grid cell, which keeps the height of the tallest
  // slide at every width, so nothing below the hero moves when the slide
  // changes. (Phones used to let the cell hug the showing slide; the map and
  // the events board under it then jumped 150–250px every 8 seconds.)
  const stack = 'col-start-1 row-start-1 transition-all duration-700 ease-out motion-reduce:transition-none';
  const shown = 'opacity-100 translate-y-0';
  const hidden = 'opacity-0 translate-y-3 pointer-events-none';

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={regionLabel}
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
        {slides.map((s, i) => {
          const active = index === i;
          const showLink = !!s.linkUrl && s.showLink !== false;
          const showJoin = s.showJoin !== false;
          const link = showLink && (
            <SlideLink to={s.linkUrl} className={s.welcome ? 'btn-glass' : 'btn-gold'}>
              {s.linkLabel || 'Learn more'}
              {!s.linkUrl.startsWith('/') && ' ↗'}
            </SlideLink>
          );
          return (
            <div
              key={s.id ?? s.title}
              className={`${stack} ${i === flowIndex ? '' : 'absolute inset-0'} ${active ? shown : hidden}`}
              aria-hidden={!active}
              {...inertWhen(!active)}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${total}`}
            >
              {s.welcome ? <WelcomeSlide s={s} link={link} showJoin={showJoin} /> : (
                <>
                  <p className="font-disp font-semibold text-base tracking-[0.26em] uppercase text-brand-goldsoft flex items-center gap-3 mb-5">
                    <i className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_12px_rgba(58,219,143,.9)]" aria-hidden />
                    {s.kicker || <T id="home.hero.spot.kicker">Spotlight</T>}
                  </p>
                  {/* Line breaks typed in the Spotlights panel show, in the
                      headline and the text; six lines of text at most. */}
                  <h2 className="font-disp font-bold uppercase leading-[0.96] text-[clamp(40px,5vw,60px)] max-w-[18ch] [text-wrap:balance] whitespace-pre-line line-clamp-4">
                    {s.title}
                  </h2>
                  {s.body && <p className="text-[18px] text-[#BCCBE7] max-w-[52ch] my-8 whitespace-pre-line line-clamp-6">{s.body}</p>}
                  {/* Either button can be switched off per slide in the
                      Spotlights panel (board request, Oct 2026). */}
                  {(showLink || showJoin) && (
                    <div className="flex flex-wrap gap-3.5 mb-6">
                      {link}
                      {showJoin && (
                        <Link to="/membership" className="btn-glass">
                          <T id="home.hero.spot.join">Become a member</T>
                        </Link>
                      )}
                    </div>
                  )}
                  <SlideTags tags={s.tags} />
                </>
              )}
              {editing && (
                <p className="text-[13px] font-semibold text-brand-goldsoft bg-black/40 border border-brand-goldsoft/40 rounded-xl px-4 py-2.5 max-w-[52ch]">
                  This slide is a homepage spotlight. Its words are changed in{' '}
                  <Link to="/members#boards" className="underline text-white">
                    Members → Boards &amp; library → Homepage spotlights
                  </Link>
                  , with the Edit button on this spotlight.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls: one progress bar per slide, arrows, and a live counter.
          The row's space is reserved even before the spotlights arrive from
          the database, so the hero doesn't grow (and shove the map and the
          page) a moment after first paint. */}
      <div className="mt-6 min-h-[40px]">
      {total > 1 && (
        <div className="flex items-center gap-4">
          <div className="flex gap-2 flex-1 max-w-[360px]" role="tablist" aria-label={tabsLabel}>
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
              aria-label={prevLabel}
              className="w-10 h-10 grid place-items-center rounded-full border border-white/15 bg-white/5 text-white hover:bg-white/15 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => go(index + 1)}
              aria-label={nextLabel}
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
    </div>
  );
}

// The welcome slide's own look: the gold-rule kicker, the page's one h1 with
// its last line in gold, and the red join button ahead of the board's button.
function WelcomeSlide({ s, link, showJoin }: { s: Spotlight; link: React.ReactNode; showJoin: boolean }) {
  const lines = s.title.split('\n').map((l) => l.trim()).filter(Boolean);
  const gold = lines.length > 1 ? lines.pop() : undefined;
  return (
    <>
      <p className="font-disp font-semibold text-base tracking-[0.26em] uppercase text-brand-goldsoft flex items-center gap-3 mb-5">
        <span className="w-[26px] h-[3px] rounded-sm bg-gradient-to-r from-brand-goldsoft to-brand-golddeep" />
        {s.kicker}
      </p>
      {/* 60px cap, the same as the other slides' headlines (board request,
          Oct 2026: the welcome slide looked bigger than the rest). It also
          keeps the hero short enough that "On the board" sits on a 1440x900
          opening screen: "Supporting the educators" is the widest line, and
          above about 60px it wraps onto a fourth line, which pushes the dates
          below the fold. Keep the headline to three short lines. */}
      <h1 className="font-disp font-bold uppercase leading-[0.94] text-[clamp(48px,5vw,60px)]">
        {lines.map((l, i) => (
          <span key={i}>
            {l}
            <br />
          </span>
        ))}
        {gold && <span className="gold-text drop-shadow-[0_2px_24px_rgba(235,188,66,.35)]">{gold}</span>}
      </h1>
      {s.body && <p className="text-[18px] text-[#BCCBE7] max-w-[52ch] my-6 whitespace-pre-line">{s.body}</p>}
      {(showJoin || link) && (
        <div className="flex flex-wrap gap-3.5 mb-6">
          {showJoin && (
            <Link to="/membership" className="btn-red">
              <T id="home.hero.join">Become a member — $50/yr</T>
            </Link>
          )}
          {link}
        </div>
      )}
      <SlideTags tags={s.tags} />
    </>
  );
}

// The small tags under a slide's buttons: the ones switched on in the
// Spotlights panel (up to three). They share one row as wide as the three
// original tags were together (about 600px), each as wide as its words plus an
// even share of what's left, so fewer tags means wider ones (board request,
// Oct 2026). Below that width they wrap and each line fills the same way.
function SlideTags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2.5 max-w-[600px]">
      {tags.map((c, i) => (
        <span
          key={i}
          className="flex-auto text-center text-[12.5px] font-semibold text-[#AFC1E2] border border-white/15 bg-white/5 px-3.5 py-2 rounded-full backdrop-blur"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
