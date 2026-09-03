import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HeroSpotlight from '../components/HeroSpotlight';
import Seal from '../components/Seal';
import PulseDivider from '../components/PulseDivider';
import Reveal from '../components/Reveal';
import { CONTENT_VERIFIED, honors, presidentMessage, sponsors, tiers } from '../content/data';
import { splitEvents, useSiteEvents, useSiteNews } from '../lib/content';
import { backgroundEmbedUrl, isVideoFile, useSpotlights, type Spotlight } from '../lib/postings';

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
// Reduced-motion visitors and data-saver connections get the still photo
// instead. The layer cross-fades as slides change.
function HeroBackdrop({ spotlight }: { spotlight: Spotlight | null }) {
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
  const video = !still && spotlight?.videoUrl ? spotlight.videoUrl : '';
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
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#0A1B33_0%,rgba(10,27,51,.72)_45%,rgba(10,27,51,.35)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#060F20] to-transparent" />
    </div>
  );
}

export default function Home() {
  const eventsState = useSiteEvents();
  const newsState = useSiteNews();
  const spotlights = useSpotlights();
  // The active spotlight's photo (if it has one) becomes the hero backdrop.
  const [activeSpotlight, setActive] = useState<Spotlight | null>(null);
  const setActiveSpotlight = useCallback((s: Spotlight | null) => setActive(s), []);
  const upcoming = splitEvents(eventsState.items).upcoming;
  // The live wire only shows genuinely live data — a sample or stale "latest"
  // would announce the site is dead, which is worse than no strip at all.
  const latestPost = newsState.live ? newsState.items[0] : undefined;
  const nextMeeting = eventsState.live ? upcoming[0] : undefined;
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
      <section className="relative overflow-hidden text-white bg-[radial-gradient(1100px_700px_at_72%_-10%,#12315E_0%,#0A1B33_52%,#060F20_100%)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -left-56 -top-40 w-[640px] h-[640px] rounded-full opacity-30 blur-[90px] bg-[radial-gradient(circle,rgba(229,64,74,.85),transparent_62%)] animate-[drift_18s_ease-in-out_infinite_alternate] motion-reduce:animate-none" />
          <div className="absolute -right-52 top-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[90px] bg-[radial-gradient(circle,rgba(47,107,255,.9),transparent_62%)] animate-[drift_24s_ease-in-out_infinite_alternate-reverse] motion-reduce:animate-none" />
          <div className="absolute left-1/3 -bottom-64 w-[720px] h-[720px] rounded-full opacity-[.16] blur-[100px] bg-[radial-gradient(circle,rgba(245,206,90,.9),transparent_60%)] animate-[drift_30s_ease-in-out_infinite_alternate] motion-reduce:animate-none" />
          <style>{`@keyframes drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(60px,40px,0) scale(1.12)}}`}</style>
        </div>
        {/* Spotlight backdrop — a photo or a muted looping clip, only when the
            active slide carries one; a dark gradient keeps the type legible
            over any picture. */}
        <HeroBackdrop spotlight={activeSpotlight} />
        <div className="wrap relative grid lg:grid-cols-[1.2fr_.8fr] gap-14 items-center pt-16 lg:pt-20 pb-20 lg:pb-24">
          <HeroSpotlight spotlights={spotlights.items} onActiveChange={setActiveSpotlight} />

          {/* Dispatch board */}
          <aside className="rounded-3xl border border-white/15 overflow-hidden backdrop-blur-md bg-gradient-to-b from-white/10 to-white/[.04] shadow-[0_40px_90px_rgba(4,10,22,.55)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-disp font-semibold tracking-[0.22em] uppercase text-brand-bluesoft">
                On the board
              </h2>
              {eventsState.loaded && !eventsState.live && (
                <span className="text-[11px] font-bold tracking-widest text-brand-goldsoft">
                  SAMPLE CALENDAR
                </span>
              )}
            </div>
            {eventsState.loaded && upcoming.length === 0 && (
              <p className="px-6 py-5 text-[14px] text-[#93A6C9]">
                The 2026–27 calendar is being finalized — check back soon.
              </p>
            )}
            {upcoming.slice(0, 3).map((e) => (
              <div key={e.id ?? e.title} className="flex gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5">
                <div className="flex-none w-14 text-center font-disp uppercase bg-brand-blue/15 border border-brand-bluesoft/30 rounded-xl py-2 leading-none">
                  <b className="block text-2xl text-white">{e.day}</b>
                  <span className="text-xs tracking-[0.14em] text-brand-bluesoft">{e.month}</span>
                </div>
                <div>
                  <b className="block text-[15px] leading-snug text-white">{e.title}</b>
                  <span className="text-[13px] text-[#93A6C9]">{e.location}</span>
                </div>
              </div>
            ))}
            <div className="px-6 py-4 bg-black/25">
              <Link to="/events" className="text-[13.5px] font-bold text-brand-bluesoft hover:text-white">
                Full calendar →
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* The live wire — latest update + next meeting, straight from the
          content tables the board edits. Hidden entirely until live data
          exists; it must never fake freshness. */}
      {(latestPost || nextMeeting) && (
        <section className="bg-[#08142A] border-t border-white/10" aria-label="Latest from the association">
          <div className="wrap flex flex-wrap items-center gap-x-8 gap-y-2 py-3.5 text-[14px]">
            <span className="flex items-center gap-2 font-disp font-semibold text-[12px] tracking-[0.24em] uppercase text-brand-goldsoft">
              <i className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)] animate-pulse" />
              Live wire
            </span>
            {latestPost && (
              <Link to="/news" className="text-[#BCCBE7] hover:text-white min-w-0">
                <b className="text-white">Latest:</b> {latestPost.title}
                <span className="text-[#7C90B6]"> · {latestPost.date}</span>
              </Link>
            )}
            {nextMeeting && (
              <Link to="/events" className="text-[#BCCBE7] hover:text-white">
                <b className="text-white">Next up:</b> {nextMeeting.title}
                <span className="text-[#7C90B6]">
                  {' '}
                  · {nextMeeting.month} {nextMeeting.day}
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="bg-ink2 pt-px">
        <div className="gold-braid" aria-hidden />
      </div>

      {/* Sponsor marquee */}
      <section className="bg-ink2 py-8 overflow-hidden" aria-label="Sponsors">
        <p className="text-center font-disp font-semibold text-[13px] tracking-[0.3em] uppercase text-[#5E739C] mb-5">
          Backed by the companies behind Florida EMS education
        </p>
        <div className="flex w-max gap-16 pr-16 animate-[marq_38s_linear_infinite]">
          {[...sponsors, ...sponsors].map((s, i) => (
            <span
              key={i}
              // The second copy exists only to make the marquee loop seamless;
              // hide it from screen readers so sponsors aren't announced twice.
              aria-hidden={i >= sponsors.length || undefined}
              className="font-disp font-semibold text-[21px] tracking-[0.1em] uppercase text-[#6E84AC] whitespace-nowrap"
            >
              <i className="not-italic text-brand-gold/60 mr-2.5">◆</i>
              {s.name}
            </span>
          ))}
        </div>
        <style>{`@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </section>

      {/* Vitals — hidden until the association confirms the real numbers. */}
      {CONTENT_VERIFIED && (
      <section className="bg-ink2 text-white py-11 border-t border-white/5" aria-label="Association statistics">
        <div className="wrap">
          <p className="font-disp font-semibold text-[13px] tracking-[0.26em] uppercase text-[#5E739C] mb-5 flex items-center gap-2.5">
            <i className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_10px_rgba(58,219,143,.9)]" />
            Association vitals
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
                  {v.label}
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
            <p className="eyebrow">Why FAEMSE</p>
            <h2 className="h-sec">
              Built for the people
              <br />
              at the front of the classroom
            </h2>
            <p className="text-muted text-[17px] max-w-[60ch]">
              Whether you run a paramedic program, teach an EMT cohort, or oversee field training
              for an agency — membership is leverage.
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
                  <h3 className="font-disp font-bold uppercase text-2xl mb-2.5">{c.title}</h3>
                  <p className="text-muted text-[15px] mb-5">{c.text}</p>
                  <Link to={c.to} className="font-bold text-brand-blue hover:underline">
                    {c.cta} →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The working library — the sections that make the site useful between
          meetings: the archive, the videos, the guide, and the boards. */}
      <section className="bg-white py-24">
        <div className="wrap">
          <div className="mb-11">
            <p className="eyebrow">Between meetings</p>
            <h2 className="h-sec">
              The association,
              <br />
              open all year
            </h2>
            <p className="text-muted text-[17px] max-w-[62ch]">
              FAEMSE meets in person a few times a year — the rest of the year lives here:
              answers that stop evaporating, a director&apos;s guide that didn&apos;t exist before,
              and the boards every program watches.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                tag: 'The archive',
                title: 'Questions & answers',
                text: 'Real listserv questions, answered once by the board and kept — searchable by topic.',
                to: '/qa',
                cta: 'Search the archive',
              },
              {
                tag: 'The reference shelf',
                title: 'Resources & library',
                text: 'Standards, state and federal links, and the members-only document library — one shelf, organized by tag.',
                to: '/resources',
                cta: 'Open the shelf',
              },
              {
                tag: 'Free guide',
                title: 'New program director?',
                text: 'The compliance clocks already running, and your first 90 days — Florida-specific.',
                to: '/program-directors',
                cta: 'Read the guide',
              },
              {
                tag: 'Public boards',
                title: 'Jobs & classes',
                text: 'Open positions and upcoming offerings statewide, posted by the board, never stale.',
                to: '/jobs',
                cta: 'See the openings',
              },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 90} className="flex">
                <Link
                  to={c.to}
                  className="card p-7 flex flex-col border-t-[3px] border-t-brand-blue/60 transition-all hover:-translate-y-1.5 hover:shadow-[0_30px_70px_rgba(47,107,255,.16)]"
                >
                  <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-brand-blue mb-2">{c.tag}</p>
                  <h3 className="font-disp font-bold uppercase text-[21px] leading-tight mb-2">{c.title}</h3>
                  <p className="text-muted text-[14px] flex-1 mb-4">{c.text}</p>
                  <span className="font-bold text-brand-blue text-[14.5px]">{c.cta} →</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Honors — the Gold Standard band */}
      <section className="relative overflow-hidden text-white bg-[radial-gradient(1000px_620px_at_50%_-20%,#14284C_0%,#0A1B33_55%,#060F20_100%)]">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute left-1/2 -translate-x-1/2 -top-52 w-[880px] h-[560px] rounded-full opacity-[.14] blur-[90px] bg-[radial-gradient(circle,rgba(245,206,90,.95),transparent_62%)]" />
        </div>
        <div className="wrap relative py-24 text-center">
          <Reveal>
            <Seal className="w-[88px] h-[88px] mx-auto mb-7 drop-shadow-[0_8px_30px_rgba(223,175,55,.45)]" />
            <p className="font-disp font-semibold text-[15px] tracking-[0.3em] uppercase text-brand-goldsoft mb-4">
              {honors.title}
            </p>
            <h2 className="font-disp font-bold uppercase leading-[0.95] text-[clamp(40px,5.6vw,72px)]">
              The <span className="gold-text">gold standard</span>,
              <br />
              held by real people
            </h2>
            <p className="text-[#BCCBE7] text-[17px] max-w-[58ch] mx-auto mt-6 mb-9">
              {honors.blurb}
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 mb-10">
              {Array.from({ length: honors.categories }, (_, i) => (
                <span
                  key={i}
                  className="w-9 h-9 grid place-items-center rounded-full border border-brand-gold/40 bg-brand-gold/10 font-disp font-bold text-brand-goldsoft"
                  aria-hidden
                >
                  ★
                </span>
              ))}
              <span className="self-center ml-2 text-[13px] font-semibold tracking-[0.14em] uppercase text-brand-goldsoft/80">
                Seven categories, honored annually
              </span>
            </div>
            <Link to="/about" className="btn-gold">
              About the award
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
            <p className="eyebrow">From the president</p>
            <blockquote className="mt-7">
              <p className="font-disp font-semibold text-[clamp(26px,3.2vw,38px)] leading-[1.22] text-ink [text-wrap:balance]">
                &ldquo;{presidentMessage.quote}&rdquo;
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
                    {presidentMessage.role}
                  </span>
                </span>
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>
      )}

      <div className="bg-white">
        <PulseDivider />
      </div>

      {/* News preview */}
      <section className="bg-white py-24">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-11">
            <div>
              <p className="eyebrow">Association news</p>
              <h2 className="h-sec">The latest</h2>
            </div>
            <Link to="/news" className="btn-outline">
              All news
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {newsState.items.slice(0, 3).map((n, i) => (
              <Reveal key={n.id ?? n.title} delay={i * 110} className="flex">
              <article
                className="card overflow-hidden flex flex-col transition-all hover:-translate-y-1.5 hover:shadow-[0_30px_80px_rgba(10,27,51,.16)]"
              >
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-[12.5px] font-bold tracking-[0.08em] uppercase text-muted mb-2">
                    {!newsState.live && (
                      <span className="mr-2 px-2 py-0.5 rounded-full text-brand-goldink bg-[#FBF3D9]">
                        Sample
                      </span>
                    )}
                    {n.date} · {n.tag}
                  </p>
                  <h3 className="text-[18.5px] font-bold leading-snug mb-2">{n.title}</h3>
                  <p className="text-[14.5px] text-muted flex-1">{n.excerpt}</p>
                  <Link to="/news" className="mt-4 font-bold text-brand-blue text-[14.5px] hover:underline">
                    Read more →
                  </Link>
                </div>
              </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Membership CTA */}
      <section className="relative overflow-hidden text-white py-24 bg-[radial-gradient(900px_600px_at_20%_0%,#12315E_0%,#0A1B33_55%,#060F20_100%)]">
        <div className="wrap relative">
          <div className="mb-11">
            <p className="eyebrow !text-brand-bluesoft">Membership</p>
            <h2 className="h-sec text-white">
              The best $50 your
              <br />
              program spends this year
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={
                  t.featured
                    ? 'relative rounded-[20px] p-8 text-body bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#F5CE5A,#B18516_55%,#2F6BFF)_border-box] shadow-[0_40px_90px_rgba(4,10,22,.5)]'
                    : 'rounded-[20px] p-8 bg-white/5 border border-white/10 backdrop-blur'
                }
              >
                {t.featured && (
                  <span className="absolute -top-3.5 left-8 bg-gradient-to-br from-brand-goldsoft to-brand-golddeep text-ink2 font-disp font-bold text-[13px] tracking-[0.18em] px-4 py-1.5 rounded-full shadow-[0_8px_24px_rgba(223,175,55,.4)]">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="font-disp font-bold uppercase text-2xl">{t.name}</h3>
                <p className={`text-[13.5px] mb-5 ${t.featured ? 'text-muted' : 'text-[#93A6C9]'}`}>{t.who}</p>
                <p className="font-disp font-bold text-[54px] leading-none [font-variant-numeric:tabular-nums]">
                  {t.price}
                  <small className={`text-[17px] font-body font-semibold ${t.featured ? 'text-muted' : 'text-[#93A6C9]'}`}>
                    {' '}
                    {t.per}
                  </small>
                </p>
                <ul className={`my-6 space-y-3 text-[14.5px] ${t.featured ? '' : 'text-[#C4D1EA]'}`}>
                  {t.perks.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="text-brand-green font-bold">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link to="/membership" className={t.featured ? 'btn-red w-full' : 'btn-glass w-full'}>
                  Learn more
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden text-white text-center bg-[radial-gradient(900px_600px_at_50%_120%,#12315E_0%,#0A1B33_55%,#060F20_100%)]">
        <div className="wrap relative py-24 lg:py-28">
          <img
            src={`${import.meta.env.BASE_URL}seal.svg`}
            alt="Seal of the Florida Association of EMS Educators"
            className="w-44 h-44 mx-auto mb-7 drop-shadow-[0_16px_44px_rgba(0,0,0,.55)]"
          />
          <h2 className="font-disp font-bold uppercase leading-[0.94] text-[clamp(48px,7vw,96px)]">
            Raise the
            <br />
            <span className="gold-text drop-shadow-[0_2px_28px_rgba(235,188,66,.4)]">standard.</span>
          </h2>
          <p className="text-[#BCCBE7] text-[17px] max-w-[52ch] mx-auto my-7">
            Join the educators building the future of EMS in Florida — and get the network,
            resources, and voice that come with them.
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link to="/membership" className="btn-gold">
              Become a member
            </Link>
            <Link to="/contact" className="btn-glass">
              Talk to the board
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
