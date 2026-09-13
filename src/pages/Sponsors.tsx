import PageHead from '../components/PageHead';
import { mailto, sponsors } from '../content/data';
import { T } from '../lib/text';

// The association's corporate sponsors are its Corporate members (bylaws
// 2.02.03). A sponsor without a logo on file is shown by name until one comes.
export default function Sponsors() {
  return (
    <>
      <PageHead
        id="sponsors"
        eyebrow="Partners"
        title="Corporate sponsors"
        sub="The companies, academies, and organizations that back EMS education across Florida as Corporate members of the association. Thank you for keeping great teaching at the front line of emergency care."
      />
      <section className="py-20 bg-white">
        <div className="wrap">
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 list-none p-0 m-0">
            {sponsors.map((s) => {
              const inner = s.logo ? (
                <img
                  src={`${import.meta.env.BASE_URL}sponsors/${s.logo}.webp`}
                  alt={s.name}
                  loading="lazy"
                  className="max-h-[72px] w-auto max-w-[85%] object-contain"
                />
              ) : (
                <span className="font-disp font-bold uppercase text-[19px] leading-tight tracking-[0.04em] text-body">
                  {s.name}
                </span>
              );
              const cls = 'card p-5 grid place-items-center min-h-[120px] text-center transition-all';
              // A card is a link to the sponsor's site when one is on file.
              return (
                <li key={s.name}>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${s.name} website`}
                      className={`${cls} hover:border-brand-gold/60 hover:shadow-[0_18px_50px_rgba(177,133,22,.16)] hover:-translate-y-1`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className={cls} title="No website on file yet">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="card p-8 mt-10 flex flex-wrap items-center justify-between gap-4 bg-ink !border-white/10 text-white">
            <div>
              <h2 className="font-disp font-bold uppercase text-2xl mb-1">
                <T id="sponsors.become.h2">Become a corporate sponsor</T>
              </h2>
              <p className="text-[#BCCBE7] text-[15px] max-w-[60ch]">
                <T id="sponsors.become.text">
                  Corporate membership is $200 a year: up to three named representatives, a seat on
                  committees, and your name in front of the educators who decide what Florida&apos;s
                  EMS programs buy, teach, and recommend.
                </T>
              </p>
            </div>
            <a href={mailto('Corporate%20sponsorship')} className="btn-gold">
              <T id="sponsors.become.cta">Get sponsorship info</T>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
