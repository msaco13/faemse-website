import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Mark from '../components/Mark';
import { events, news, sponsors, tiers } from '../content/data';

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

const tagStyles: Record<string, string> = {
  blue: 'text-[#1A47B8] bg-[#E7EEFF]',
  red: 'text-[#B8232D] bg-[#FDEAEB]',
  green: 'text-[#0E7A4A] bg-[#E2F7EC]',
};

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden text-white bg-[radial-gradient(1100px_700px_at_72%_-10%,#12315E_0%,#0A1B33_52%,#060F20_100%)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -left-56 -top-40 w-[640px] h-[640px] rounded-full opacity-30 blur-[90px] bg-[radial-gradient(circle,rgba(229,64,74,.85),transparent_62%)]" />
          <div className="absolute -right-52 top-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[90px] bg-[radial-gradient(circle,rgba(47,107,255,.9),transparent_62%)]" />
        </div>
        <div className="wrap relative grid lg:grid-cols-[1.12fr_.88fr] gap-14 items-center pt-16 lg:pt-24 pb-24 lg:pb-28">
          <div>
            <p className="font-disp font-semibold text-base tracking-[0.26em] uppercase text-brand-bluesoft flex items-center gap-3 mb-6">
              <span className="w-[26px] h-[3px] bg-brand-red rounded-sm" />
              Florida Association of EMS Educators
            </p>
            <h1 className="font-disp font-bold uppercase leading-[0.94] text-[clamp(52px,7.2vw,100px)]">
              We train the people
              <br />
              who train Florida&apos;s
              <br />
              <span className="bg-gradient-to-r from-[#FF6B71] via-brand-redhot to-[#FF8A5B] bg-clip-text text-transparent">
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
              {['501(c)(6) nonprofit', 'Every program type, statewide', 'Quarterly meetings & workshops'].map(
                (c) => (
                  <span
                    key={c}
                    className="text-[12.5px] font-semibold text-[#AFC1E2] border border-white/15 bg-white/5 px-3.5 py-2 rounded-full backdrop-blur"
                  >
                    {c}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Dispatch board */}
          <aside className="rounded-3xl border border-white/15 overflow-hidden backdrop-blur-md bg-gradient-to-b from-white/10 to-white/[.04] shadow-[0_40px_90px_rgba(4,10,22,.55)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="font-disp font-semibold tracking-[0.22em] uppercase text-brand-bluesoft">
                On the board
              </h2>
              <span className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-brand-green">
                <i className="w-1.5 h-1.5 rounded-full bg-brand-green shadow-[0_0_12px_rgba(58,219,143,1)] animate-pulse" />
                UPDATED WEEKLY
              </span>
            </div>
            {events.slice(0, 3).map((e) => (
              <div key={e.title} className="flex gap-4 items-center px-6 py-4 border-b border-white/5 hover:bg-white/5">
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

      {/* Sponsor marquee */}
      <div className="bg-ink2 border-t border-white/5 py-8 overflow-hidden" aria-label="Sponsors">
        <p className="text-center font-disp font-semibold text-[13px] tracking-[0.3em] uppercase text-[#5E739C] mb-5">
          Backed by the companies behind Florida EMS education
        </p>
        <div className="flex w-max gap-16 pr-16 animate-[marq_38s_linear_infinite]">
          {[...sponsors, ...sponsors].map((s, i) => (
            <span
              key={i}
              className="font-disp font-semibold text-[21px] tracking-[0.1em] uppercase text-[#6E84AC] whitespace-nowrap hover:text-white transition-colors"
            >
              <i className="not-italic text-[#425982] mr-2.5">◆</i>
              {s}
            </span>
          ))}
        </div>
        <style>{`@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </div>

      {/* Vitals */}
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
                text: 'Trade playbooks with educators from every county and program type — through role-based forums, workshops, and four statewide meetings a year.',
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
            ].map((c) => (
              <div
                key={c.title}
                className="card p-8 transition-all hover:-translate-y-1.5 hover:shadow-[0_30px_70px_rgba(47,107,255,.16)]"
              >
                <h3 className="font-disp font-bold uppercase text-2xl mb-2.5">{c.title}</h3>
                <p className="text-muted text-[15px] mb-5">{c.text}</p>
                <Link to={c.to} className="font-bold text-brand-blue hover:underline">
                  {c.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

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
            {news.map((n) => (
              <article
                key={n.title}
                className="card overflow-hidden flex flex-col transition-all hover:-translate-y-1.5 hover:shadow-[0_30px_80px_rgba(10,27,51,.16)]"
              >
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-[12.5px] font-bold tracking-[0.08em] uppercase text-muted mb-2">
                    {n.date} · {n.tag}
                  </p>
                  <h3 className="text-[18.5px] font-bold leading-snug mb-2">{n.title}</h3>
                  <p className="text-[14.5px] text-muted flex-1">{n.excerpt}</p>
                  <Link to="/news" className="mt-4 font-bold text-brand-blue text-[14.5px] hover:underline">
                    Read more →
                  </Link>
                </div>
              </article>
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
                    ? 'relative rounded-[20px] p-8 text-body bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#FF5A62,#2F6BFF)_border-box] shadow-[0_40px_90px_rgba(4,10,22,.5)]'
                    : 'rounded-[20px] p-8 bg-white/5 border border-white/10 backdrop-blur'
                }
              >
                {t.featured && (
                  <span className="absolute -top-3.5 left-8 bg-gradient-to-br from-brand-redhot to-[#D22530] text-white font-disp font-bold text-[13px] tracking-[0.18em] px-4 py-1.5 rounded-full shadow-lg">
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
          <Mark className="w-24 h-24 mx-auto mb-6 drop-shadow-[0_10px_34px_rgba(47,107,255,.5)]" />
          <h2 className="font-disp font-bold uppercase leading-[0.94] text-[clamp(48px,7vw,96px)]">
            Raise the
            <br />
            <span className="bg-gradient-to-r from-[#FF6B71] via-brand-redhot to-[#FF8A5B] bg-clip-text text-transparent">
              standard.
            </span>
          </h2>
          <p className="text-[#BCCBE7] text-[17px] max-w-[52ch] mx-auto my-7">
            Join the educators building the future of EMS in Florida — and get the network,
            resources, and voice that come with them.
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center">
            <Link to="/membership" className="btn-red">
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
