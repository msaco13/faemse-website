import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

export default function About() {
  return (
    <>
      <PageHead
        eyebrow="About the association"
        title="Who we are"
        sub="A member-based association organized to provide resources to individuals and organizations that foster excellence in EMS education and training."
      />
      {/* Heritage — verified dates from the association's bylaws */}
      <section className="bg-ink2 text-white py-14 border-t border-white/5">
        <div className="wrap lg:grid lg:grid-cols-[240px_1fr] lg:gap-14 items-center">
          <img
            src={`${import.meta.env.BASE_URL}seal.svg`}
            alt="Seal of the Florida Association of EMS Educators"
            className="hidden lg:block w-[240px] h-[240px] drop-shadow-[0_18px_44px_rgba(0,0,0,.5)]"
          />
          <div>
          <p className="font-disp font-semibold text-[13px] tracking-[0.28em] uppercase text-brand-goldsoft mb-8 flex items-center gap-3">
            <span className="w-[22px] h-[3px] rounded-sm bg-gradient-to-r from-brand-goldsoft to-brand-golddeep" />
            Serving Florida's EMS educators since 1998
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { year: '1997', text: 'Founding educators draft the association bylaws.' },
              { year: '1998', text: 'Bylaws adopted — FAEMSE is chartered as a Florida 501(c)(6).' },
              { year: 'Foundation', text: 'The companion FAEMSE Foundation, a 501(c)(3), funds EMT and paramedic scholarships statewide.' },
              { year: 'Today', text: 'A statewide network of educators, programs, and partners across every county and program type.' },
            ].map((m) => (
              <div key={m.year}>
                <b className="block font-disp font-bold text-[34px] leading-none gold-text mb-2">{m.year}</b>
                <p className="text-[14px] text-[#93A6C9]">{m.text}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="wrap grid lg:grid-cols-2 gap-12">
          <div>
            <p className="eyebrow">Mission</p>
            <h2 className="h-sec">Excellence in EMS education, statewide</h2>
            <p className="text-muted mb-4">
              The Florida Association of Emergency Medical Services Educators is the professional
              home for the people who train Florida&apos;s EMTs and paramedics — instructors,
              program directors, and agency training officers.
            </p>
            <p className="text-muted mb-4">
              We connect educators across every county and program type, keep them ahead of the
              National EMS Education Standards and Florida rule changes, and give EMS education a
              seat at the table in state policy conversations.
            </p>
            <p className="text-muted">
              Our vision: to be the foremost resource within Florida&apos;s EMS educational
              community.
            </p>
          </div>
          <div className="space-y-5">
            <div className="relative rounded-2xl p-7 bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#F5CE5A,#B18516)_border-box] shadow-[0_20px_50px_rgba(177,133,22,.14)]">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5 flex items-center gap-2.5">
                <span className="text-brand-gold" aria-hidden>★</span>
                Educator of the Year
              </h3>
              <p className="text-muted text-[15px]">
                Every year FAEMSE honors outstanding EMS educators across seven categories —
                recognizing the people whose students are measurably better for having been in
                their classroom.
              </p>
            </div>
            <div className="card p-7">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5">The FAEMSE Foundation</h3>
              <p className="text-muted text-[15px] mb-3">
                Our companion 501(c)(3) funds EMT and paramedic scholarships and student
                competitions across Florida.
              </p>
              <a
                className="font-bold text-brand-blue hover:underline"
                href="https://www.faemsefoundation.org"
                target="_blank"
                rel="noreferrer"
              >
                Visit the Foundation ↗
              </a>
            </div>
            <div className="card p-7">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5">Leadership</h3>
              <p className="text-muted text-[15px] mb-3">
                FAEMSE is guided by a Board of Directors elected by the membership on a two-year
                cycle.
              </p>
              <Link className="font-bold text-brand-blue hover:underline" to="/board">
                Meet the board →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
