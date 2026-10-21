import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import FloridaNetwork from '../components/FloridaNetwork';
import HeroCrest from '../components/HeroCrest';
import HeroSpotlight, { PlayPauseIcon } from '../components/HeroSpotlight';
import Seal from '../components/Seal';
import PulseDivider from '../components/PulseDivider';
import Reveal from '../components/Reveal';
import { CONTENT_VERIFIED, honors, presidentMessage, tiers } from '../content/data';
import BoardStrip from '../components/BoardStrip';
import { useSiteNews } from '../lib/content';
import { backgroundEmbedUrl, isVideoFile, useSponsors, useSpotlights, type Spotlight } from '../lib/postings';
import { slug, T, useText } from '../lib/text';

function Count({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setVal(to);
          return;
        }
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - t0) / 1300, 1);
          setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

// The hero's media layer. A direct MP4/WebM plays in a native <video>
// (muted, looping, inline — the only way mobile browsers autoplay); YouTube
// and Vimeo links play as a chrome-free background embed scaled to cover.
// Reduced-motion visitors, data-saver connections and anyone who pressed the
// slides' Pause button get the still photo instead. The layer cross-fades as
// slides change.
function HeroBackdrop({ spotlight, stopped }: { spotlight: Spotlight | null; stopped: boolean }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const update = () => setStill(mq.matches || !!nav.connection?.saveData);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const image = spotlight?.imageUrl || '';
  const video = !still && !stopped && spotlight?.videoUrl ? spotlight.videoUrl : '';
  const embed = video && !isVideoFile(video) ? backgroundEmbedUrl(video) : null;
  const file = video && isVideoFile(video) ? video : '';
  const show = !!(image || file || embed);

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      {image && !file && !embed && <img src={image} alt="" className="w-full h-full object-cover opacity-40" />}
      {file && (
        <video
          key={file}
          src={file}
          poster={image || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-cover opacity-50"
        />
      )}
      {embed && (
        <div className="absolute inset-0 overflow-hidden opacity-50">
          {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          {/* 16:9 frame sized to cover the section whatever its shape. */}
          <iframe
            key={embed}
            src={embed}
            title=""
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100%,177.78vh)] h-[max(100%,56.25vw)] min-w-[177.78%] min-h-full border-0"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0A213B_0%,rgba(10,33,59,.72)_45%,rgba(10,33,59,.35)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#04152A] to-transparent" />
    </div>
  );
}

export default function Home() {
  const newsState = useSiteNews();
  const spotlights = useSpotlights();
  const sponsors = useSponsors().items;
  // The active spotlight's photo (if it has one) becomes the hero backdrop.
  const [activeSpotlight, setActive] = useState<Spotlight | null>(null);
  const setActiveSpotlight = useCallback((s: Spotlight | null) => setActive(s), []);
  const mapFaded = !!(activeSpotlight?.imageUrl || activeSpotlight?.videoUrl);
  // The two Pause buttons (WCAG 2.2.2): one under the slides, which also
  // stills a slide's background clip, and one on the sponsor band.
  const [slidesStopped, setSlidesStopped] = useState(false);
  const [sponsorsStopped, setSponsorsStopped] = useState(false);
  // News is public (board, 2026-10-20) and shows only real posts: with none
  // yet, the section stays off rather than filling the page with samples.
  const posts = newsState.live ? newsState.items : [];
  const sponsorsAria = useText('home.sponsors.aria', 'Sponsors');
  const sponsorsPause = useText('home.sponsors.aria.pause', 'Pause the sponsor names');
  const sponsorsPlay = useText('home.sponsors.aria.play', 'Play the sponsor names');
  const vitalsAria = useText('home.vitals.aria', 'Association statistics');
  const sealAlt = useText('home.cta.alt', 'Seal of the Florida Association of EMS Educators');
  useEffect(() => {
    // Inner pages set their own titles; restore the defaults when landing back home.
    document.title = 'FAEMSE — Florida Association of EMS Educators';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'The Florida Association of EMS Educators — the statewide professional home for EMS instructors, program directors, and training officers.',
      );
  }, []);
  return (
    <>
      {/* Hero */}
      <section className="velvet relative overflow-hidden text-white bg-[radial-gradient(880px_640px_at_74%_46%,#173A62_0%,#102C4E_36%,#0A213B_62%,#04152A_100%)] max-lg:bg-[radial-gradient(520px_420px_at_50%_78%,#173A62_0%,#102C4E_40%,#0A213B_64%,#04152A_100%)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -left-56 -top-40 w-[640px] h-[640px] rounded-full opacity-[.18] blur-[90px] bg-[radial-gradient(circle,rgba(229,64,74,.85),transparent_62%)] animate-[drift_18s_ease-in-out_infinite_alternate] motion-reduce:animate-none" />
          <div className="absolute -right-52 top-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[90px] bg-[radial-gradient(circle,rgba(47,107,255,.9),transparent_62%)] animate-[drift_24s_ease-in-out_infinite_alternate-reverse] motion-reduce:animate-none" />
          <div className="absolute left-1/3 -bottom-64 w-[720px] h-[720px] rounded-full opacity-[.16] blur-[100px] bg-[radial-gradient(circle,rgba(245,206,90,.9),transparent_60%)] animate-[drift_30s_ease-in-out_infinite_alternate] motion-reduce:animate-none" />
          <style>{`@keyframes drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(60px,40px,0) scale(1.12)}}`}</style>
        </div>
        {/* Spotlight backdrop — a photo or a muted looping clip, only when the
            active slide carries one; a dark gradient keeps the type legible
            over any picture. */}
        <HeroBackdrop spotlight={activeSpotlight} stopped={slidesStopped} />
        {/* Sponsor marquee, at the top of the hero under the header's gold
            line (board, Oct 2026). Transparent so it sits on the hero's own
            backdrop; the hero's top padding is trimmed to make room, and
            with the tighter spacing below, "On the board" lands on a
            1440x900 opening screen. */}
        <section className="relative z-10 pt-4 overflow-hidden" aria-label={sponsorsAria}>
        {/* #93A6C9 keeps the band at 4.5:1 or better across the hero's
            navy, glow included; the old #5E739C and #6E84AC fell to about
            3:1 and 4:1. */}
        <div className="px-6 mb-4 flex items-center justify-center gap-3">
          <p className="text-center font-disp font-semibold text-[13px] tracking-[0.3em] uppercase text-[#93A6C9]">
            <T id="home.sponsors.text">Backed by the companies behind Florida EMS education</T>
          </p>
          <button
            type="button"
            onClick={() => setSponsorsStopped((v) => !v)}
            aria-label={sponsorsStopped ? sponsorsPlay : sponsorsPause}
            className="flex-none w-7 h-7 grid place-items-center rounded-full border border-white/15 bg-white/5 text-[#93A6C9] hover:text-white hover:bg-white/15 transition-colors motion-reduce:hidden"
          >
            <PlayPauseIcon playing={!sponsorsStopped} size={12} />
          </button>
        </div>
        {/* 90 seconds per pass (board, Sept 2026: sixteen full names need the
            time). It pauses under the pointer so a name can be clicked, while
            a name has keyboard focus, and for good with the Pause button. */}
        {/* Four copies, scrolled by a quarter (one copy's width, so the speed
            is unchanged): the loop is seamless as long as three copies span
            the viewport, about 7,500px with today's list. Two copies ran dry
            on a 2,560px screen and showed an empty strip once per loop. */}
        {/* The Pause button holds it with an inline style: a class loses to
            the animation shorthand, which sets the play state back to
            running. */}
        <div
          className="flex w-max gap-16 pr-16 animate-[marq_90s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none"
          style={sponsorsStopped ? { animationPlayState: 'paused' } : undefined}
        >
          {[...sponsors, ...sponsors, ...sponsors, ...sponsors].map((s, i) => {
            // The extra copies exist only to make the marquee loop seamless;
            // hide them from screen readers and the tab order so sponsors aren't
            // announced or tabbed through repeatedly.
            const dup = i >= sponsors.length;
            const cls = 'font-disp font-semibold text-[21px] tracking-[0.1em] uppercase text-[#93A6C9] whitespace-nowrap';
            const body = (
              <>
                <i className="not-italic text-brand-gold/60 mr-2.5">◆</i>
                {s.name}
              </>
            );
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
                {body}
              </a>
            ) : (
              <span key={i} aria-hidden={dup || undefined} className={cls}>
                {body}
              </span>
            );
          })}
        </div>
        <style>{`@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-25%)}}`}</style>
        </section>
        {/* minmax(0, …): the columns split the width by ratio only. With plain
            fr tracks, anything nowrap inside a column (the map's status chip
            as its wording changed) could widen that column, and the map,
            and the hero, every few seconds. */}
        <div className="wrap relative isolate grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] gap-14 items-center pt-5 lg:pt-5 pb-8">
          {/* The seal, ghosted at the center of the hero (this grid is its
              containing block, so it sits midway between the page margins,
              behind the gap between copy and map), spinning like a coin; it
              steps aside with the map when a spotlight brings a photo. */}
          <HeroCrest faded={mapFaded} />
          <HeroSpotlight spotlights={spotlights.items} onActiveChange={setActiveSpotlight} onStoppedChange={setSlidesStopped} />

          {/* Florida: the network coming together. Steps aside when a
              spotlight brings its own photo or clip. The map is interactive
              (hover/tap opens a city, the chip links to /programs), so while
              it is faded out it must also stop catching pointer events and
              being read out — otherwise an invisible map would sit on top of
              the spotlight and screen readers would announce 59 links that
              nobody can see. */}
          <div
            aria-hidden={mapFaded || undefined}
            // inert also takes the 40 dots out of the tab order while hidden;
            // aria-hidden alone leaves them reachable with the keyboard.
            {...(mapFaded ? { inert: '' } : {})}
            className={`transition-opacity duration-700 ${mapFaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <FloridaNetwork
              className="w-full max-w-[600px] justify-self-center mx-auto -translate-y-3.5 max-lg:max-w-[380px] max-lg:mt-9"
              chipTo="/programs"
            />
          </div>
        </div>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] opacity-80 bg-[linear-gradient(90deg,transparent_0%,#C9962C_30%,#F1D585_50%,#C9962C_70%,transparent_100%)]"
        />
      </section>

      {/* On the board: the next three dates (shared with the member portal). */}
      <BoardStrip />

      <div className="bg-ink2 pt-px">
        <div className="gold-braid" aria-hidden />
      </div>

      {/* Vitals — hidden until the association confirms the real numbers. */}
      {CONTENT_VERIFIED && (
      <section className="velvet bg-ink2 text-white py-11 border-t border-white/5" aria-label={vitalsAria}>
        <div className="wrap">
          <p className="font-disp font-semibold text-[13px] tracking-[0.26em] uppercase text-[#7C90B6] mb-5 flex items-center gap-2.5">
            <i className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)]" />
            <T id="home.vitals.label">Association vitals</T>
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-7">
            {[
              { n: 320, s: '+', label: 'Educator members' },
              { n: 40, s: '+', label: 'Member institutions' },
              { n: 15, s: '', label: 'Sponsor partners' },
              { n: 4, s: '×', label: 'Statewide meetings / yr' },
            ].map((v, i) => (
              <div key={v.label} className={`px-7 ${i % 2 === 0 ? 'pl-0 lg:border-l-0' : ''} ${i > 0 ? 'lg:border-l lg:border-white/10' : ''}`}>
                <b className="block font-disp font-bold text-5xl text-brand-green [font-variant-numeric:tabular-nums] [text-shadow:0_0_22px_rgba(58,219,143,.45)]">
                  <Count to={v.n} suffix={v.s} />
                </b>
                <span className="text-[12.5px] font-semibold tracking-[0.12em] uppercase text-[#7C90B6]">
                  <T id={`home.vitals.${slug(v.label)}.label`}>{v.label}</T>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Why join */}
      <section className="bg-paper py-24">
        <div className="wrap">
          <div className="mb-11">
            <p className="eyebrow"><T id="home.why.eyebrow">Why FAEMSE</T></p>
            <h2 className="h-sec">
              <T id="home.why.h2a">Built for the people</T>
              <br />
              <T id="home.why.h2b">at the front of the classroom</T>
            </h2>
            <p className="text-muted text-[17px] max-w-[60ch]">
              <T id="home.why.lede">
                Whether you run a paramedic program, teach an EMT cohort, or oversee field training
                for an agency — membership is leverage.
              </T>
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'A statewide bench',
                text: 'Trade playbooks with educators from every county and program type — through the Q&A archive, teaching videos, workshops, and statewide meetings.',
                to: '/events',
                cta: 'Meet the network',
              },
              {
                title: 'First to know',
                text: 'National EMS Education Standards revisions, Florida rule changes, NREMT trends — decoded and delivered before they land on your program.',
                to: '/news',
                cta: 'See the latest',
              },
              {
                title: 'A seat at the table',
                text: "Vote in elections, serve on committees, and put your program's perspective into the state conversations that shape EMS education policy.",
                to: '/membership',
                cta: 'Get a vote',
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 110}>
                <div className="card h-full p-8 border-t-[3px] border-t-brand-gold/70 transition-all hover:-translate-y-1.5 hover:shadow-[0_30px_70px_rgba(47,107,255,.16)]">
                  <h3 className="font-disp font-bold uppercase text-2xl mb-2.5"><T id={`home.why.${slug(c.title)}.title`}>{c.title}</T></h3>
                  <p className="text-muted text-[15px] mb-5"><T id={`home.why.${slug(c.title)}.text`}>{c.text}</T></p>
                  <Link to={c.to} className="font-bold text-brand-blue hover:underline">
                    <T id={`home.why.${slug(c.title)}.cta`}>{c.cta}</T> →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          {/* The dues tiers, in the same section as the reasons to join: one
              membership pitch on the page instead of two (board, 2026-10-20). */}
          <div className="grid md:grid-cols-3 gap-6 mt-14">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={
                  t.featured
                    ? 'relative rounded-[20px] p-8 text-body bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#F5CE5A,#B18516_55%,#2560E8)_border-box] shadow-[0_30px_70px_rgba(10,33,59,.16)]'
                    : 'card rounded-[20px] p-8'
                }
              >
                {t.featured && (
                  <span className="absolute -top-3.5 left-8 bg-gradient-to-br from-brand-goldsoft to-brand-golddeep text-ink2 font-disp font-bold text-[13px] tracking-[0.18em] px-4 py-1.5 rounded-full shadow-[0_8px_24px_rgba(223,175,55,.4)]">
                    <T id="home.tiers.popular">MOST POPULAR</T>
                  </span>
                )}
                <h3 className="font-disp font-bold uppercase text-2xl"><T id={`tiers.${slug(t.name)}.name`}>{t.name}</T></h3>
                <p className="text-[13.5px] mb-5 text-muted"><T id={`tiers.${slug(t.name)}.who`}>{t.who}</T></p>
                <p className="font-disp font-bold text-[54px] leading-none [font-variant-numeric:tabular-nums]">
                  {t.price}
                  <small className="text-[17px] font-body font-semibold text-muted">
                    {' '}
                    <T id={`tiers.${slug(t.name)}.per`}>{t.per}</T>
                  </small>
                </p>
                <ul className="my-6 space-y-3 text-[14.5px]">
                  {t.perks.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="text-brand-golddeep font-bold">✓</span>
                      <T id={`tiers.${slug(t.name)}.perk.${slug(p)}`}>{p}</T>
                    </li>
                  ))}
                </ul>
                <Link to="/membership" className={t.featured ? 'btn-red w-full' : 'btn-outline w-full'}>
                  <T id="home.tiers.cta">Learn more</T>
                </Link>
              </div>
            ))}
          </div>
          <Link to="/membership" className="inline-block mt-8 font-bold text-brand-blue hover:underline">
            <T id="home.tiers.all">All membership options, including Honorary →</T>
          </Link>
        </div>
      </section>

      {/* Honors — the Gold Standard band */}
      <section className="velvet relative overflow-hidden text-white bg-[radial-gradient(1000px_620px_at_50%_-20%,#163659_0%,#0A213B_55%,#04152A_100%)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute left-1/2 -translate-x-1/2 -top-52 w-[880px] h-[560px] rounded-full opacity-[.14] blur-[90px] bg-[radial-gradient(circle,rgba(245,206,90,.95),transparent_62%)]" />
        </div>
        <div className="wrap relative py-24 text-center">
          <Reveal>
            <Seal slot="honors" label="Gold Standard seal" size={88} className="mx-auto mb-7 drop-shadow-[0_8px_30px_rgba(223,175,55,.45)]" />
            <p className="font-disp font-semibold text-[15px] tracking-[0.3em] uppercase text-brand-goldsoft mb-4">
              <T id="home.honors.title">{honors.title}</T>
            </p>
            <h2 className="font-disp font-bold uppercase leading-[0.95] text-[clamp(40px,5.6vw,72px)]">
              <T id="home.honors.h2a">The</T>{' '}<span className="gold-text"><T id="home.honors.h2b">gold standard</T></span>,
              <br />
              <T id="home.honors.h2c">held by real people</T>
            </h2>
            <p className="text-[#BCCBE7] text-[17px] max-w-[58ch] mx-auto mt-6 mb-9">
              <T id="home.honors.blurb">{honors.blurb}</T>
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2.5 mb-10">
              <span
                className="w-9 h-9 grid place-items-center rounded-full border border-brand-gold/40 bg-brand-gold/10 font-disp font-bold text-brand-goldsoft"
                aria-hidden
              >
                ★
              </span>
              <span className="text-[13px] font-semibold tracking-[0.14em] uppercase text-brand-goldsoft/80">
                <T id="home.honors.count">Honored annually</T>
              </span>
            </div>
            <Link to="/about" className="btn-gold">
              <T id="home.honors.cta">About the award</T>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* President's welcome — hidden until President Anzardo approves the
          message; a draft quote must never appear under his name. */}
      {CONTENT_VERIFIED && (
      <section className="bg-white py-24">
        <div className="wrap max-w-[880px]">
          <Reveal>
            <p className="eyebrow"><T id="home.president.eyebrow">From the president</T></p>
            <blockquote className="mt-7">
              <p className="font-disp font-semibold text-[clamp(26px,3.2vw,38px)] leading-[1.22] text-ink [text-wrap:balance]">
                &ldquo;<T id="home.president.quote">{presidentMessage.quote}</T>&rdquo;
              </p>
              <footer className="flex items-center gap-4 mt-8">
                <span className="flex-none w-14 h-14 rounded-full grid place-items-center font-disp font-bold text-xl text-ink2 bg-gradient-to-br from-brand-goldsoft to-brand-golddeep ring-2 ring-brand-gold/30 ring-offset-2">
                  {presidentMessage.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </span>
                <span>
                  <b className="block text-[17px]">{presidentMessage.name}</b>
                  <span className="text-[14px] text-muted tracking-[0.06em] uppercase font-semibold">
                    <T id="home.president.role">{presidentMessage.role}</T>
                  </span>
                </span>
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>
      )}

      {/* News preview: real posts only; off until the first one, and its
          divider with it, so no empty white strip sits between the dark bands. */}
      {posts.length > 0 && (
      <>
      <div className="bg-white">
        <PulseDivider />
      </div>
      <section className="bg-white py-24">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-11">
            <div>
              <p className="eyebrow"><T id="home.news.eyebrow">Association news</T></p>
              <h2 className="h-sec"><T id="home.news.h2">The latest</T></h2>
            </div>
            <Link to="/news" className="btn-outline">
              <T id="home.news.cta">All news</T>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {posts.slice(0, 3).map((n, i) => (
              <Reveal key={n.id ?? n.title} delay={i * 110} className="flex">
              <article
                className="card overflow-hidden flex flex-col transition-all hover:-translate-y-1.5 hover:shadow-[0_30px_80px_rgba(10,33,59,.16)]"
              >
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-[12.5px] font-bold tracking-[0.08em] uppercase text-muted mb-2">
                    {n.date} · {n.tag}
                  </p>
                  <h3 className="text-[18.5px] font-bold leading-snug mb-2">{n.title}</h3>
                  <p className="text-[14.5px] text-muted flex-1">{n.excerpt}</p>
                  <Link to="/news" className="mt-4 font-bold text-brand-blue text-[14.5px] hover:underline">
                    <T id="home.news.readmore">Read more →</T>
                  </Link>
                </div>
              </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      {/* Final CTA */}
      <section className="velvet relative overflow-hidden text-white text-center bg-[radial-gradient(900px_600px_at_50%_120%,#143257_0%,#0A213B_55%,#04152A_100%)]">
        <div className="wrap relative py-24 lg:py-28">
          <Seal
            slot="cta"
            label="Raise the standard seal"
            size={176}
            alt={sealAlt}
            className="mx-auto mb-7 drop-shadow-[0_16px_44px_rgba(0,0,0,.55)]"
          />
          <h2 className="font-disp font-bold uppercase leading-[0.94] text-[clamp(48px,7vw,96px)]">
            <T id="home.cta.h2a">Raise the</T>
            <br />
            <span className="gold-text drop-shadow-[0_2px_28px_rgba(235,188,66,.4)]"><T id="home.cta.h2b">standard.</T></span>
          </h2>
          <p className="text-[#BCCBE7] text-[17px] max-w-[52ch] mx-auto my-7">
            <T id="home.cta.text">
              Join the educators building the future of EMS in Florida — and get the network,
              resources, and voice that come with them.
            </T>
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link to="/membership" className="btn-gold">
              <T id="home.cta.join">Become a member</T>
            </Link>
            <Link to="/contact" className="btn-glass">
              <T id="home.cta.contact">Talk to the board</T>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
