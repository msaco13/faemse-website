import PageHead from '../components/PageHead';
import { mailto, sponsors } from '../content/data';

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
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 list-none p-0 m-0">
            {sponsors.map((s) => (
              <li
                key={s.name}
                className="card p-5 grid place-items-center min-h-[120px] hover:border-brand-gold/60 hover:shadow-[0_18px_50px_rgba(177,133,22,.16)] hover:-translate-y-1 transition-all"
              >
                <img
                  src={`${import.meta.env.BASE_URL}sponsors/${s.logo}.webp`}
                  alt={s.name}
                  loading="lazy"
                  className="max-h-[72px] w-auto max-w-[85%] object-contain"
                />
              </li>
            ))}
          </ul>
          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4 bg-ink !border-white/10 text-white">
            <div>
              <h2 className="font-disp font-bold uppercase text-2xl mb-1">Become a sponsor</h2>
              <p className="text-[#BCCBE7] text-[15px] max-w-[55ch]">
                Put your company in front of the educators who decide what Florida&apos;s EMS
                programs buy, teach, and recommend.
              </p>
            </div>
            <a href={mailto('Sponsorship')} className="btn-gold">
              Get sponsorship info
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
