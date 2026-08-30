import PageHead from '../components/PageHead';
import { sponsors } from '../content/data';

export default function Sponsors() {
  return (
    <>
      <PageHead
        eyebrow="Partners"
        title="Sponsors"
        sub="The companies backing EMS education across Florida. Thank you for keeping great teaching at the front line of emergency care."
      />
      <section className="py-20 bg-white">
        <div className="wrap">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {sponsors.map((s) => (
              <div
                key={s}
                className="card p-6 grid place-items-center text-center font-disp font-semibold uppercase tracking-[0.08em] text-muted hover:text-body hover:shadow-[0_18px_50px_rgba(10,27,51,.1)] hover:-translate-y-1 transition-all min-h-[92px]"
              >
                {s}
              </div>
            ))}
          </div>
          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4 bg-ink !border-white/10 text-white">
            <div>
              <h2 className="font-disp font-bold uppercase text-2xl mb-1">Become a sponsor</h2>
              <p className="text-[#BCCBE7] text-[15px] max-w-[55ch]">
                Put your company in front of the educators who decide what Florida&apos;s EMS
                programs buy, teach, and recommend.
              </p>
            </div>
            <a href="mailto:info@faemse.org?subject=Sponsorship" className="btn-red">
              Get sponsorship info
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
