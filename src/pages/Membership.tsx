import { useRef, useState } from 'react';
import PageHead from '../components/PageHead';
import { faq, freeTiers, tiers } from '../content/data';
import { supabase } from '../lib/supabase';
import { T, useText } from '../lib/text';

const tierValue: Record<string, string> = {
  Active: 'active',
  Institutional: 'institutional',
  Corporate: 'corporate',
};

export default function Membership() {
  const formRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState('active');
  const [kind, setKind] = useState<'join' | 'renew'>('join');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function pickTier(name: string) {
    setTier(tierValue[name] ?? 'active');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    // Honeypot: bots fill it, people never see it. Pretend success, write nothing.
    if (String(data.website ?? '') !== '') {
      setStatus('sent');
      form.reset();
      return;
    }
    setStatus('sending');
    const { error } = await supabase.from('membership_applications').insert({
      kind,
      tier,
      full_name: String(data.full_name),
      email: String(data.email),
      phone: String(data.phone ?? '') || null,
      organization: String(data.organization ?? '') || null,
      county: String(data.county ?? '') || null,
      cert_level: String(data.cert_level ?? '') || null,
      note: String(data.note ?? '') || null,
    });
    if (error) {
      setStatus('error');
    } else {
      setStatus('sent');
      form.reset();
    }
  }

  const input =
    'mt-1.5 w-full rounded-xl border border-line px-4 py-3 focus:border-brand-blue outline-none';
  const label = 'text-[13px] font-bold uppercase tracking-wide text-muted';
  const typeAria = useText('membership.form.type.aria', 'Application type');
  const certPlaceholder = useText('membership.form.cert.placeholder', 'e.g. Paramedic, EMT, RN');

  return (
    <>
      <PageHead
        id="membership"
        eyebrow="Membership"
        title="Join FAEMSE"
        sub="Five classifications, one community. Dues fund the workshops, the knowledge archive, and the advocacy that every Florida EMS program benefits from."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={
                  t.featured
                    ? 'relative rounded-[20px] p-8 bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#F5CE5A,#B18516_55%,#2F6BFF)_border-box] shadow-[0_30px_70px_rgba(10,27,51,.18)]'
                    : 'card p-8'
                }
              >
                {t.featured && (
                  <span className="absolute -top-3.5 left-8 bg-gradient-to-br from-brand-goldsoft to-brand-golddeep text-ink2 font-disp font-bold text-[13px] tracking-[0.18em] px-4 py-1.5 rounded-full shadow-[0_8px_24px_rgba(223,175,55,.4)]">
                    <T id="membership.tiers.popular">MOST POPULAR</T>
                  </span>
                )}
                <h2 className="font-disp font-bold uppercase text-2xl">
                  <T id={`membership.tier.${t.name.toLowerCase()}.name`}>{t.name}</T>
                </h2>
                <p className="text-[13.5px] text-muted mb-5">
                  <T id={`membership.tier.${t.name.toLowerCase()}.who`}>{t.who}</T>
                </p>
                <p className="font-disp font-bold text-[54px] leading-none [font-variant-numeric:tabular-nums]">
                  {t.price}
                  <small className="text-[17px] font-body font-semibold text-muted"> {t.per}</small>
                </p>
                <ul className="my-6 space-y-3 text-[14.5px]">
                  {t.perks.map((p, i) => (
                    <li key={p} className="flex gap-2.5">
                      <span className="text-[#17A76A] font-bold">✓</span>
                      <T id={`membership.tier.${t.name.toLowerCase()}.perk.${i + 1}`}>{p}</T>
                    </li>
                  ))}
                </ul>
                <button onClick={() => pickTier(t.name)} className={t.featured ? 'btn-red w-full' : 'btn-outline w-full'}>
                  <T id={`membership.tier.${t.name.toLowerCase()}.cta`}>{`Apply as ${t.name}`}</T>
                </button>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {freeTiers.map((t) => (
              <div key={t.name} className="flex justify-between items-center gap-4 border border-dashed border-line rounded-2xl p-6 bg-white">
                <div>
                  <b className="font-disp uppercase text-lg block">
                    <T id={`membership.free.${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.name`}>{t.name}</T>
                  </b>
                  <span className="text-[13.5px] text-muted">
                    <T id={`membership.free.${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.who`}>{t.who}</T>
                  </span>
                </div>
                <a href="mailto:info@faemse.org" className="font-bold text-brand-blue whitespace-nowrap hover:underline">
                  <T id="membership.free.cta">Inquire →</T>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="py-20 bg-white" ref={formRef} id="apply">
        <div className="wrap max-w-[840px]">
          <p className="eyebrow">
            <T id="membership.apply.eyebrow">Apply</T>
          </p>
          <h2 className="h-sec">
            <T id="membership.apply.h2">Join or renew</T>
          </h2>
          <p className="text-muted text-[16px] max-w-[62ch] mb-8">
            <T id="membership.apply.text">
              Submit your application and the board follows up with dues payment and your portal
              account. No payment is collected on this form.
            </T>
          </p>

          <form onSubmit={onSubmit} className="card p-8">
            <div className="absolute w-px h-px overflow-hidden [clip:rect(0,0,0,0)]" aria-hidden>
              <label>
                Leave this field empty
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="flex flex-wrap gap-3 mb-6" role="radiogroup" aria-label={typeAria}>
              {(['join', 'renew'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`px-5 py-2.5 rounded-full font-bold text-[14px] border transition-colors ${
                    kind === k
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-muted border-line hover:border-ink'
                  }`}
                >
                  {k === 'join' ? (
                    <T id="membership.form.type.join">I'm joining</T>
                  ) : (
                    <T id="membership.form.type.renew">I'm renewing</T>
                  )}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className={label}>
                  <T id="membership.form.tier.label">Membership tier</T>
                </span>
                <select name="tier" value={tier} onChange={(e) => setTier(e.target.value)} className={input}>
                  <option value="active">Active — $50/yr</option>
                  <option value="institutional">Institutional — $250/yr</option>
                  <option value="corporate">Corporate — $200/yr</option>
                </select>
              </label>
              <label className="block">
                <span className={label}>
                  <T id="membership.form.name.label">Full name</T>
                </span>
                <input name="full_name" required maxLength={200} className={input} />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className={label}>
                  <T id="membership.form.email.label">Email</T>
                </span>
                <input name="email" type="email" required maxLength={254} className={input} />
              </label>
              <label className="block">
                <span className={label}>
                  <T id="membership.form.phone.label">Phone (optional)</T>
                </span>
                <input name="phone" maxLength={40} className={input} />
              </label>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <label className="block sm:col-span-1">
                <span className={label}>
                  <T id="membership.form.org.label">Organization / program</T>
                </span>
                <input name="organization" maxLength={300} className={input} />
              </label>
              <label className="block">
                <span className={label}>
                  <T id="membership.form.county.label">County</T>
                </span>
                <input name="county" maxLength={100} className={input} />
              </label>
              <label className="block">
                <span className={label}>
                  <T id="membership.form.cert.label">Certification level</T>
                </span>
                <input name="cert_level" maxLength={100} placeholder={certPlaceholder} className={input} />
              </label>
            </div>
            <label className="block mb-6">
              <span className={label}>
                <T id="membership.form.note.label">Anything else? (optional)</T>
              </span>
              <textarea name="note" maxLength={2000} rows={3} className={input} />
            </label>
            <button type="submit" disabled={status === 'sending'} className="btn-red w-full sm:w-auto disabled:opacity-60">
              {status === 'sending' ? (
                <T id="membership.form.submit.sending">Submitting…</T>
              ) : kind === 'join' ? (
                <T id="membership.form.submit.join">Submit application</T>
              ) : (
                <T id="membership.form.submit.renew">Submit renewal</T>
              )}
            </button>
            {status === 'sent' && (
              <p className="mt-4 text-[#0E7A4A] font-semibold" role="status">
                <T id="membership.form.sent">
                  Application received — the board will follow up at the email you provided with dues
                  and account details.
                </T>
              </p>
            )}
            {status === 'error' && (
              <p className="mt-4 text-brand-red font-semibold" role="alert">
                <T id="membership.form.error">
                  Something went wrong submitting the application. Email us directly at info@faemse.org.
                </T>
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="py-20 bg-paper">
        <div className="wrap max-w-[840px]">
          <p className="eyebrow">
            <T id="membership.faq.eyebrow">Questions</T>
          </p>
          <h2 className="h-sec">
            <T id="membership.faq.h2">Before you join</T>
          </h2>
          <div className="mt-8 space-y-3.5">
            {faq.map((f, i) => (
              <details key={f.q} className="card overflow-hidden group">
                <summary className="cursor-pointer list-none flex justify-between items-center gap-4 px-7 py-5 font-bold text-[16.5px]">
                  <T id={`membership.faq.${i + 1}.q`}>{f.q}</T>
                  <span className="flex-none w-7 h-7 rounded-full bg-[#E7EEFF] grid place-items-center font-bold text-[#1A47B8] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-7 pb-6 text-muted text-[15px] max-w-[65ch]">
                  <T id={`membership.faq.${i + 1}.a`}>{f.a}</T>
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
