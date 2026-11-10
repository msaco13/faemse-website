import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seal from '../components/Seal';
import { contactPath } from '../content/data';
import { passwordLinkParams } from '../lib/recovery';
import { supabase } from '../lib/supabase';
import { T, useText } from '../lib/text';

// Where password emails land (since 2026-11-10). The email's link carries the
// one-time code's hash, and nothing happens until the person presses "Set my
// password": workplace email scanners (Microsoft 365 Safe Links) open every
// link in a message, and used up the old links that went straight to
// Supabase before the member ever clicked (src/lib/recovery.ts). Pressing the
// button spends the code (verifyOtp), signs the person in, and opens the
// portal with the "Set your password now" card first (?setpw=1).
//
// ?expired=1, or a link without a usable code: the "get a new link" page.
// App.tsx sends old-style links that failed (#error=...otp_expired) here too.
export default function SetPassword() {
  const navigate = useNavigate();
  const docTitle = useText('setpw.doctitle', 'Set your password');
  const [link] = useState(() => passwordLinkParams(window.location.search));
  const [state, setState] = useState<'ready' | 'working' | 'failed'>(() => (link ? 'ready' : 'failed'));

  useEffect(() => {
    document.title = `${docTitle} · FAEMSE`;
  }, [docTitle]);

  async function go() {
    if (!link) return;
    setState('working');
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
    if (error || !data.session) {
      setState('failed');
      return;
    }
    // The code is spent: drop it from the address before moving on.
    window.history.replaceState(null, '', '/set-password');
    navigate('/members?setpw=1', { replace: true });
  }

  return (
    <section className="velvet relative overflow-hidden text-white min-h-[78vh] grid place-items-center py-20 bg-[radial-gradient(1000px_640px_at_50%_-15%,#143257_0%,#0A213B_55%,#04152A_100%)]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-72 w-[760px] h-[760px] rounded-full opacity-[.14] blur-[95px] bg-[radial-gradient(circle,rgba(245,206,90,.9),transparent_60%)]" />
      </div>
      <div className="relative w-full max-w-[480px] px-6 text-center">
        <Seal slot="login" label="FAEMSE seal" size={88} className="mx-auto mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,.55)]" />
        <p className="font-disp font-semibold text-[14px] tracking-[0.28em] uppercase text-brand-goldsoft">
          <T id="setpw.eyebrow">Member portal</T>
        </p>
        {state === 'failed' ? (
          <>
            <h1 className="font-disp font-bold uppercase text-[40px] leading-none mt-2 mb-5">
              <T id="setpw.failed.h1">This link no longer works</T>
            </h1>
            <p className="text-[#DCE6F7] text-[16.5px] leading-relaxed mb-4" role="status">
              <T id="setpw.failed.lead">
                Password links work once and expire after an hour. Some workplace email systems open links to check them,
                which can use a link up before you click it.
              </T>
            </p>
            <p className="text-[#BCCBE7] text-[15px] leading-relaxed mb-8">
              <T id="setpw.failed.next">
                Get a new one: on the sign-in page, type your email address and choose Forgot password. The new link opens a
                page like this one, and nothing happens until you press its button.
              </T>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/login" className="btn-gold">
                <T id="setpw.failed.cta">Get a new link</T>
              </Link>
              <Link to={contactPath('Password link')} className="btn-glass">
                <T id="setpw.failed.contact">Ask the board for help</T>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-disp font-bold uppercase text-[40px] leading-none mt-2 mb-5">
              <T id="setpw.h1">Set your password</T>
            </h1>
            <p className="text-[#DCE6F7] text-[16.5px] leading-relaxed mb-8">
              <T id="setpw.lead">
                Press the button to open your member portal and choose a password. The link works once, when you press it.
              </T>
            </p>
            <button type="button" onClick={go} disabled={state === 'working'} className="btn-gold disabled:opacity-70">
              {state === 'working' ? <T id="setpw.working">Opening…</T> : <T id="setpw.cta">Set my password</T>}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
