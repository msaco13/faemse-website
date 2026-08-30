import PageHead from '../components/PageHead';
import { faq, freeTiers, tiers } from '../content/data';

export default function Membership() {
  return (
    <>
      <PageHead
        eyebrow="Membership"
        title="Join FAEMSE"
        sub="Five classifications, one community. Dues fund the workshops, forums, and advocacy that every Florida EMS program benefits from."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={
                  t.featured
                    ? 'relative rounded-[20px] p-8 bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#FF5A62,#2F6BFF)_border-box] shadow-[0_30px_70px_rgba(10,27,51,.18)]'
                    : 'card p-8'
                }
              >
                {t.featured && (
                  <span className="absolute -top-3.5 left-8 bg-gradient-to-br from-brand-redhot to-[#D22530] text-white font-disp font-bold text-[13px] tracking-[0.18em] px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                )}
                <h2 className="font-disp font-bold uppercase text-2xl">{t.name}</h2>
                <p className="text-[13.5px] text-muted mb-5">{t.who}</p>
                <p className="font-disp font-bold text-[54px] leading-none [font-variant-numeric:tabular-nums]">
                  {t.price}
                  <small className="text-[17px] font-body font-semibold text-muted"> {t.per}</small>
                </p>
                <ul className="my-6 space-y-3 text-[14.5px]">
                  {t.perks.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="text-[#17A76A] font-bold">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <a href="mailto:info@faemse.org?subject=FAEMSE%20membership" className={t.featured ? 'btn-red w-full' : 'btn-outline w-full'}>
                  Join as {t.name}
                </a>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {freeTiers.map((t) => (
              <div key={t.name} className="flex justify-between items-center gap-4 border border-dashed border-line rounded-2xl p-6 bg-white">
                <div>
                  <b className="font-disp uppercase text-lg block">{t.name}</b>
                  <span className="text-[13.5px] text-muted">{t.who}</span>
                </div>
                <a href="mailto:info@faemse.org" className="font-bold text-brand-blue whitespace-nowrap hover:underline">
                  Inquire →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="wrap max-w-[840px]">
          <p className="eyebrow">Questions</p>
          <h2 className="h-sec">Before you join</h2>
          <div className="mt-8 space-y-3.5">
            {faq.map((f) => (
              <details key={f.q} className="card overflow-hidden group">
                <summary className="cursor-pointer list-none flex justify-between items-center gap-4 px-7 py-5 font-bold text-[16.5px]">
                  {f.q}
                  <span className="flex-none w-7 h-7 rounded-full bg-[#E7EEFF] grid place-items-center font-bold text-[#1A47B8] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-7 pb-6 text-muted text-[15px] max-w-[65ch]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
