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
            <div className="card p-7">
              <h3 className="font-disp font-bold uppercase text-xl mb-1.5">Educator of the Year</h3>
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
