import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import Seal from '../components/Seal';
import { slug, T, useText } from '../lib/text';

export default function About() {
  const sealAlt = useText('about.heritage.seal.alt', 'Seal of the Florida Association of EMS Educators');
  return (
    <>
      <PageHead
        id="about"
        eyebrow="About the association"
        title="Who we are"
        sub="A member-based association organized to provide resources to individuals and organizations that foster excellence in EMS education and training."
      />
      {/* Heritage — verified dates from the association's bylaws */}
      <section className="velvet bg-ink2 text-white py-14 border-t border-white/5">
        <div className="wrap lg:grid lg:grid-cols-[240px_1fr] lg:gap-14 items-center">
          <Seal
            large
            alt={sealAlt}
            className="hidden lg:block w-[240px] h-[240px] drop-shadow-[0_18px_44px_rgba(0,0,0,.5)]"
          />
          <div>
          <p className="font-disp font-semibold text-[13px] tracking-[0.28em] uppercase text-brand-goldsoft mb-8 flex items-center gap-3">
            <span className="w-[22px] h-[3px] rounded-sm bg-gradient-to-r from-brand-goldsoft to-brand-golddeep" />
            <T id="about.heritage.eyebrow">Serving Florida's EMS educators since 1998</T>
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { year: '1997', text: 'Founding educators draft the association bylaws.' },
              { year: '1998', text: 'Bylaws adopted — FAEMSE is chartered as a Florida 501(c)(6).' },
              { year: 'Foundation', text: 'The companion FAEMSE Foundation, a 501(c)(3), funds EMT and paramedic scholarships statewide.' },
              { year: 'Today', text: 'A statewide network of educators, programs, and partners across every county and program type.' },
            ].map((m, i) => (
              <div key={m.year}>
                <b className="block font-disp font-bold text-[34px] leading-none gold-text mb-2">
                  <T id={`about.heritage.${slug(`${m.year} ${m.text}`)}.label`}>{m.year}</T>
                </b>
                <p className="text-[14px] text-[#93A6C9]">
                  <T id={`about.heritage.${slug(`${m.year} ${m.text}`)}.text`}>{m.text}</T>
                </p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="wrap grid lg:grid-cols-2 gap-12">
          <div>
            <p className="eyebrow">
              <T id="about.mission.eyebrow">Mission</T>
            </p>
            <h2 className="h-sec">
              <T id="about.mission.h2">Excellence in EMS education, statewide</T>
            </h2>
            <p className="text-muted mb-4">
              <T id="about.mission.p1">
                Our mission, in the words of the bylaws: to provide resources to individuals and
                organizations that will foster excellence in EMS education and training. In practice
                that makes FAEMSE the professional home for the people who train Florida&apos;s EMTs
                and paramedics: instructors, program directors, and agency training officers.
              </T>
            </p>
            <p className="text-muted mb-4">
              <T id="about.mission.p2">
                We connect educators across every county and program type, keep them ahead of the
                National EMS Education Standards and Florida rule changes, and give EMS education a
                seat at the table in state policy conversations.
              </T>
            </p>
            <p className="text-muted">
              <T id="about.mission.p3">
                Our vision: to be the foremost resource within Florida&apos;s EMS educational
                community.
              </T>
            </p>
          </div>
          <div className="space-y-5">
            <div className="relative rounded-2xl p-7 bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#F5CE5A,#B18516)_border-box] shadow-[0_20px_50px_rgba(177,133,22,.14)]">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5 flex items-center gap-2.5">
                <span className="text-brand-gold" aria-hidden>★</span>
                <T id="about.award.title">Educator of the Year</T>
              </h3>
              <p className="text-muted text-[15px]">
                <T id="about.award.text">
                  Every year FAEMSE honors outstanding EMS educators: the people whose students are
                  measurably better for having been in their classroom. Active members nominate and
                  vote, and anyone may be nominated.
                </T>
              </p>
            </div>
            <div className="card p-7">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5">
                <T id="about.foundation.title">The FAEMSE Foundation</T>
              </h3>
              <p className="text-muted text-[15px] mb-3">
                <T id="about.foundation.text">
                  Our companion 501(c)(3) funds EMT and paramedic scholarships and student
                  competitions across Florida.
                </T>
              </p>
              <a
                className="font-bold text-brand-blue hover:underline"
                href="https://www.faemsefoundation.org"
                target="_blank"
                rel="noreferrer"
              >
                <T id="about.foundation.cta">Visit the Foundation ↗</T>
              </a>
            </div>
            <div className="card p-7">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5">
                <T id="about.leadership.title">Leadership</T>
              </h3>
              <p className="text-muted text-[15px] mb-3">
                <T id="about.leadership.text">
                  FAEMSE is guided by a seven-seat Board of Directors elected by the Active
                  membership, with an Executive Director appointed by the board to run day-to-day
                  operations.
                </T>
              </p>
              <Link className="font-bold text-brand-blue hover:underline" to="/board">
                <T id="about.leadership.cta">Meet the board →</T>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
