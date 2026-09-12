import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { mailto } from '../content/data';
import { T } from '../lib/text';

// The clearest unmet need from the build brief: program director turnover is
// high, institutional knowledge leaves with each departure, and the required
// national workshop teaches compliance, not competence. This guide is the
// Florida-specific starting point — written to be useful on a director's
// first day, before they know which clocks are already running.

// Accreditation specifics below come from CoAEMSP's public materials, checked
// August 2026. Standards change — the VerifyFlag renders a visible reminder
// until someone recently through the process signs off. See CONTENT_VERIFIED
// in content/data.ts for the site-wide equivalent.
function VerifyFlag() {
  return (
    <span className="ml-2 align-middle text-[10.5px] font-bold tracking-[0.08em] uppercase text-brand-goldink bg-[#FBF3D9] px-2 py-0.5 rounded-full whitespace-nowrap">
      <T id="directors.verify">Verify against current standards</T>
    </span>
  );
}

const clocks = [
  {
    window: '30 days',
    title: 'Notify CoAEMSP of the personnel change',
    text: 'CoAEMSP must be notified of key personnel changes within 30 calendar days. If you just took over, this clock is already running — confirm the notification went out.',
  },
  {
    window: '15 months',
    title: 'Complete the required director workshop',
    text: 'A new program director must complete the required CoAEMSP workshop within 15 months before or after appointment. Seats fill; book early.',
  },
  {
    window: 'Day one',
    title: 'Check your own credentials',
    text: 'Program directors need a bachelor’s degree at minimum (master’s recommended). Interim directors at CAAHEP-accredited programs may have an exception; Letter of Review programs require the bachelor’s at all times.',
  },
];

const firstNinety = [
  'Find last year’s annual report and the most recent site-visit findings — they tell you what CoAEMSP is already watching about your program.',
  'Pull your three outcome metrics: NREMT pass rate, retention, and graduate placement. These are what accreditation is measured on.',
  'Inventory your clinical site agreements and their renewal dates — an expired affiliation agreement is a finding waiting to happen.',
  'Meet your medical director early and confirm their required involvement is documented, not just real.',
  'Locate every student record retention obligation before you reorganize anything.',
  'Join the FAEMSE listserv and introduce yourself — the fastest answers in Florida EMS education live there.',
];

export default function DirectorGuide() {
  return (
    <>
      <PageHead
        id="directors"
        eyebrow="For new program directors"
        title="The director&rsquo;s starter guide"
        sub="You likely have a compliance clock already running. This is the Florida-specific starting point the required workshop doesn't give you."
      />

      <section className="py-20 bg-paper">
        <div className="wrap max-w-[900px]">
          <div className="card p-8 mb-10 border-t-[3px] border-t-brand-red/60">
            <h2 className="font-disp font-bold uppercase text-2xl mb-3"><T id="directors.why.h2">Why this guide exists</T></h2>
            <p className="text-muted text-[15.5px] max-w-[75ch] mb-3">
              <T id="directors.why.p1.a">
                Program director turnover is one of the biggest quiet problems in Florida EMS
                education. Institutional knowledge walks out with every departure, and each new
                director restarts from zero. The required national workshop covers what the
                standards
              </T>{' '}
              <i><T id="directors.why.p1.i">say</T></i>{' '}
              <T id="directors.why.p1.b">
                — not how to actually run a program, and not how requirements
                play out with the Florida state office.
              </T>
            </p>
            <p className="text-muted text-[15.5px] max-w-[75ch]">
              <T id="directors.why.p2">
                This guide is built from directors who&apos;ve done the job — starting with what has
                a deadline attached.
              </T>
            </p>
          </div>

          <h2 className="font-disp font-bold uppercase text-[28px] mb-2">
            <T id="directors.clocks.h2">The clocks already running</T>
            <VerifyFlag />
          </h2>
          <p className="text-muted text-[15px] mb-6 max-w-[75ch]">
            <T id="directors.clocks.text">
              Accreditation specifics below reflect CoAEMSP&apos;s public materials as of August
              2026. Rules change and details matter — confirm each item against the current
              standards before relying on it.
            </T>
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {clocks.map((c, i) => (
              <div key={c.title} className="card p-7 border-t-[3px] border-t-brand-gold/70">
                <p className="font-disp font-bold text-[34px] text-brand-red leading-none mb-2"><T id={`directors.clocks.${i + 1}.window`}>{c.window}</T></p>
                <h3 className="font-bold text-[16px] leading-snug mb-2"><T id={`directors.clocks.${i + 1}.title`}>{c.title}</T></h3>
                <p className="text-muted text-[14px]"><T id={`directors.clocks.${i + 1}.text`}>{c.text}</T></p>
              </div>
            ))}
          </div>

          <div className="card p-8 mb-12">
            <h2 className="font-disp font-bold uppercase text-2xl mb-2">
              <T id="directors.line.h2">The 70% line</T>
              <VerifyFlag />
            </h2>
            <p className="text-muted text-[15.5px] max-w-[75ch] mb-3">
              <T id="directors.line.p1.a">Accredited paramedic programs must maintain a</T>{' '}
              <b className="text-body"><T id="directors.line.p1.bold">70% cumulative NREMT pass rate</T></b>{' '}
              <T id="directors.line.p1.b">
                within three cumulative attempts. That makes pass rates an accreditation matter, not
                just a quality concern — and it&apos;s a statewide pattern FAEMSE exists to work on,
                because no single program fixes it alone.
              </T>
            </p>
            <p className="text-muted text-[15.5px] max-w-[75ch]">
              <T id="directors.line.p2.a">
                The other two program metrics are retention and graduate placement — which is why
                this site keeps a
              </T>{' '}
              <Link to="/jobs" className="text-brand-blue font-semibold hover:underline">
                <T id="directors.line.p2.link">public job board</T>
              </Link>
              :{' '}
              <T id="directors.line.p2.b">every posting we surface is a placement your program can count.</T>
            </p>
          </div>

          <h2 className="font-disp font-bold uppercase text-[28px] mb-5"><T id="directors.ninety.h2">Your first 90 days</T></h2>
          <div className="card overflow-hidden mb-12">
            {firstNinety.map((item, i) => (
              <div key={i} className="flex gap-5 items-start px-7 py-5 border-b border-line last:border-b-0">
                <span className="flex-none w-9 h-9 grid place-items-center rounded-full bg-brand-blue/10 text-brand-blue font-disp font-bold">
                  {i + 1}
                </span>
                <p className="text-[15px] text-body max-w-[75ch] pt-1.5"><T id={`directors.ninety.${i + 1}.text`}>{item}</T></p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-8 border-t-[3px] border-t-brand-gold/70">
              <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="directors.deeper.h2">Go deeper</T></h2>
              <p className="text-muted text-[14.5px] mb-4">
                <T id="directors.deeper.text.a">The</T>{' '}
                <Link to="/qa" className="text-brand-blue font-semibold hover:underline">
                  <T id="directors.deeper.text.link1">Q&amp;A archive</T>
                </Link>{' '}
                <T id="directors.deeper.text.b">holds real program-director questions with distilled answers, and the</T>{' '}
                <Link to="/resources" className="text-brand-blue font-semibold hover:underline">
                  <T id="directors.deeper.text.link2">resource shelf</T>
                </Link>{' '}
                <T id="directors.deeper.text.c">links every standard cited here at the source.</T>
              </p>
              <p className="text-muted text-[14.5px]">
                <T id="directors.deeper.sources">Primary sources:</T>{' '}
                <a href="https://coaemsp.org" target="_blank" rel="noreferrer" className="text-brand-blue font-semibold hover:underline">
                  <T id="directors.deeper.src1">CoAEMSP ↗</T>
                </a>
                {' · '}
                <a href="https://www.caahep.org" target="_blank" rel="noreferrer" className="text-brand-blue font-semibold hover:underline">
                  <T id="directors.deeper.src2">CAAHEP ↗</T>
                </a>
                {' · '}
                <a
                  href="https://www.floridahealth.gov/licensing-and-regulation/ems-system/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-blue font-semibold hover:underline"
                >
                  <T id="directors.deeper.src3">Florida DoH EMS ↗</T>
                </a>
              </p>
            </div>
            <div className="card p-8 border-t-[3px] border-t-brand-blue/60">
              <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="directors.contribute.h2">Ran a program? Pay it forward</T></h2>
              <p className="text-muted text-[14.5px] mb-4">
                <T id="directors.contribute.text">
                  This guide grows from the experience of current and former directors — the people
                  who know how the requirements actually play out with the state office. A paragraph
                  of hard-won knowledge here saves a new director a semester.
                </T>
              </p>
              <a href={mailto('Director%20guide%20contribution')} className="btn-outline !py-2.5 !px-5">
                <T id="directors.contribute.cta">Contribute to the guide</T>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
