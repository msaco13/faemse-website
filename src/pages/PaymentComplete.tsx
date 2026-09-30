import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Seal from '../components/Seal';
import { T, useText } from '../lib/text';

// Where Stripe sends people after a successful dues payment (board request,
// 2026-09-30: a clear "it worked" page rather than a banner on the page they
// came from). ?from=form is someone who paid straight from the application
// form; anything else is a signed-in member who paid from the portal.
export default function PaymentComplete() {
  const docTitle = useText('paid.doctitle', 'Payment received');
  const fromForm = new URLSearchParams(window.location.search).get('from') === 'form';

  useEffect(() => {
    document.title = `${docTitle} · FAEMSE`;
  }, [docTitle]);

  return (
    <section className="velvet relative overflow-hidden bg-ink text-white min-h-[70vh] grid place-items-center text-center py-24">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute left-1/2 -translate-x-1/2 -top-40 w-[760px] h-[760px] rounded-full opacity-[.16] blur-[95px] bg-[radial-gradient(circle,rgba(23,167,106,.9),transparent_60%)]" />
      </div>
      <div className="relative max-w-[640px] px-6">
        <Seal slot="paid" label="FAEMSE seal" size={84} className="mx-auto mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,.55)]" />
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-[#17A76A] grid place-items-center text-white text-3xl font-bold shadow-[0_12px_30px_rgba(23,167,106,.45)]" aria-hidden>
          ✓
        </div>
        <p className="font-disp font-semibold text-[14px] tracking-[0.28em] uppercase text-brand-goldsoft mb-2">
          <T id="paid.eyebrow">Payment received</T>
        </p>
        <h1 className="font-disp font-bold uppercase text-5xl sm:text-6xl leading-none mb-5">
          <T id="paid.h1">Thank you</T>
        </h1>
        <p className="text-[#DCE6F7] text-[18px] leading-relaxed mb-4">
          <T id="paid.lead">Your payment went through and your FAEMSE membership is active for the next twelve months.</T>
        </p>
        {fromForm ? (
          <p className="text-[#BCCBE7] text-[15.5px] leading-relaxed mb-8">
            <T id="paid.next.form">
              Within a minute you will get an email from notifications@faemse.org. If you are new, it has a link to set your
              portal password; if you already had a login, just sign in. Stripe sends your receipt separately. Check your
              spam folder if either has not arrived.
            </T>
          </p>
        ) : (
          <p className="text-[#BCCBE7] text-[15.5px] leading-relaxed mb-8">
            <T id="paid.next.portal">
              Your new paid-through date is on your member page now. Stripe sends your receipt by email.
            </T>
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={fromForm ? '/login' : '/members'} className="btn-gold">
            {fromForm ? <T id="paid.cta.login">Sign in to the portal</T> : <T id="paid.cta.portal">Back to the portal</T>}
          </Link>
          <Link to="/" className="btn-glass">
            <T id="paid.cta.home">Back to home</T>
          </Link>
        </div>
        <p className="text-[13px] text-[#7C90B6] mt-8">
          <T id="paid.help">Something not right? Reply to the email or write to</T>{' '}
          <a className="text-brand-bluesoft hover:text-white" href="mailto:info@faemse.org">
            info@faemse.org
          </a>
          .
        </p>
      </div>
    </section>
  );
}
