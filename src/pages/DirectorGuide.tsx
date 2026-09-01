import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

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
      Verify against current standards
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
        eyebrow="For new program directors"
        title="The director&rsquo;s starter guide"
        sub="You likely have a compliance clock already running. This is the Florida-specific starting point the required workshop doesn't give you."
      />

      <section className="py-20 bg-paper">
        <div className="wrap max-w-[900px]">
          <div className="card p-8 mb-10 border-t-[3px] border-t-brand-red/60">
            <h2 className="font-disp font-bold uppercase text-2xl mb-3">Why this guide exists</h2>
            <p className="text-muted text-[15.5px] max-w-[75ch] mb-3">
              Program director turnover is one of the biggest quiet problems in Florida EMS
              education. Institutional knowledge walks out with every departure, and each new
              director restarts from zero. The required national workshop covers what the
              standards <i>say</i> — not how to actually run a program, and not how requirements
              play out with the Florida state office.
            </p>
            <p className="text-muted text-[15.5px] max-w-[75ch]">
              This guide is built from directors who&apos;ve done the job — starting with what has
              a deadline attached.
            </p>
          </div>

          <h2 className="font-disp font-bold uppercase text-[28px] mb-2">
            The clocks already running
            <VerifyFlag />
          </h2>
          <p className="text-muted text-[15px] mb-6 max-w-[75ch]">
            Accreditation specifics below reflect CoAEMSP&apos;s public materials as of August
            2026. Rules change and details matter — confirm each item against the current
            standards before relying on it.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {clocks.map((c) => (
              <div key={c.title} className="card p-7 border-t-[3px] border-t-brand-gold/70">
                <p className="font-disp font-bold text-[34px] text-brand-red leading-none mb-2">{c.window}</p>
                <h3 className="font-bold text-[16px] leading-snug mb-2">{c.title}</h3>
                <p className="text-muted text-[14px]">{c.text}</p>
              </div>
            ))}
          </div>

          <div className="card p-8 mb-12">
            <h2 className="font-disp font-bold uppercase text-2xl mb-2">
              The 70% line
              <VerifyFlag />
            </h2>
            <p className="text-muted text-[15.5px] max-w-[75ch] mb-3">
              Accredited paramedic programs must maintain a <b className="text-body">70% cumulative NREMT pass rate</b>{' '}
              within three cumulative attempts. That makes pass rates an accreditation matter, not
              just a quality concern — and it&apos;s a statewide pattern FAEMSE exists to work on,
              because no single program fixes it alone.
            </p>
            <p className="text-muted text-[15.5px] max-w-[75ch]">
              The other two program metrics are retention and graduate placement — which is why
              this site keeps a{' '}
              <Link to="/jobs" className="text-brand-blue font-semibold hover:underline">
                public job board
              </Link>
              : every posting we surface is a placement your program can count.
            </p>
          </div>

          <h2 className="font-disp font-bold uppercase text-[28px] mb-5">Your first 90 days</h2>
          <div className="card overflow-hidden mb-12">
            {firstNinety.map((item, i) => (
              <div key={i} className="flex gap-5 items-start px-7 py-5 border-b border-line last:border-b-0">
                <span className="flex-none w-9 h-9 grid place-items-center rounded-full bg-brand-blue/10 text-brand-blue font-disp font-bold">
                  {i + 1}
                </span>
                <p className="text-[15px] text-body max-w-[75ch] pt-1.5">{item}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-8 border-t-[3px] border-t-brand-gold/70">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Go deeper</h2>
              <p className="text-muted text-[14.5px] mb-4">
                The{' '}
                <Link to="/qa" className="text-brand-blue font-semibold hover:underline">
                  Q&amp;A archive
                </Link>{' '}
                holds real program-director questions with distilled answers, and the{' '}
                <Link to="/resources" className="text-brand-blue font-semibold hover:underline">
                  resource shelf
                </Link>{' '}
                links every standard cited here at the source.
              </p>
              <p className="text-muted text-[14.5px]">
                Primary sources:{' '}
                <a href="https://coaemsp.org" target="_blank" rel="noreferrer" className="text-brand-blue font-semibold hover:underline">
                  CoAEMSP ↗
                </a>
                {' · '}
                <a href="https://www.caahep.org" target="_blank" rel="noreferrer" className="text-brand-blue font-semibold hover:underline">
                  CAAHEP ↗
                </a>
                {' · '}
                <a
                  href="https://www.floridahealth.gov/licensing-and-regulation/ems-system/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-blue font-semibold hover:underline"
                >
                  Florida DoH EMS ↗
                </a>
              </p>
            </div>
            <div className="card p-8 border-t-[3px] border-t-brand-blue/60">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Ran a program? Pay it forward</h2>
              <p className="text-muted text-[14.5px] mb-4">
                This guide grows from the experience of current and former directors — the people
                who know how the requirements actually play out with the state office. A paragraph
                of hard-won knowledge here saves a new director a semester.
              </p>
              <a href="mailto:info@faemse.org?subject=Director%20guide%20contribution" className="btn-outline !py-2.5 !px-5">
                Contribute to the guide
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
