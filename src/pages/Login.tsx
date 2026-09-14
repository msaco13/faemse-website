import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seal from '../components/Seal';
import { supabase } from '../lib/supabase';
import { T, useText } from '../lib/text';

export default function Login() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'working' | 'error' | 'reset-sent'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [justReset, setJustReset] = useState(false);
  const docTitle = useText('login.doctitle', 'Member Login');
  const badCredentials = useText('login.error.credentials', 'Email or password not recognized.');
  const needEmail = useText('login.error.email', 'Enter your email above first, then press "Forgot password".');
  const emailPlaceholder = useText('login.email.placeholder', 'you@example.org');

  useEffect(() => {
    try {
      if (sessionStorage.getItem('pw-reset-ok')) {
        sessionStorage.removeItem('pw-reset-ok');
        setJustReset(true);
      }
    } catch {
      /* no banner without sessionStorage */
    }
  }, []);

  useEffect(() => {
    document.title = `${docTitle} · FAEMSE`;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/members', { replace: true });
    });
  }, [navigate, docTitle]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus('working');
    const { error } = await supabase.auth.signInWithPassword({
      email: String(data.email).trim(),
      password: String(data.password),
    });
    if (error) {
      setErrorMsg(
        error.message === 'Invalid login credentials'
          ? badCredentials
          : error.message,
      );
      setStatus('error');
    } else {
      navigate('/members');
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      setErrorMsg(needEmail);
      setStatus('error');
      return;
    }
    setStatus('working');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('reset-sent');
    }
  }

  return (
    <section className="velvet relative overflow-hidden text-white min-h-[78vh] grid place-items-center py-20 bg-[radial-gradient(1000px_640px_at_50%_-15%,#143257_0%,#0A213B_55%,#04152A_100%)]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-72 w-[760px] h-[760px] rounded-full opacity-[.14] blur-[95px] bg-[radial-gradient(circle,rgba(245,206,90,.9),transparent_60%)]" />
      </div>
      <div className="relative w-full max-w-[440px] px-6">
        <div className="text-center mb-8">
          <Seal slot="login" label="Sign-in page seal" size={96} className="mx-auto mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,.55)]" />
          <p className="font-disp font-semibold text-[14px] tracking-[0.28em] uppercase text-brand-goldsoft">
            <T id="login.eyebrow">Member portal</T>
          </p>
          <h1 className="font-disp font-bold uppercase text-[44px] leading-none mt-2"><T id="login.h1">Sign in</T></h1>
        </div>

        {justReset && (
          <p
            className="mb-5 rounded-xl border border-brand-green/40 bg-brand-green/10 text-brand-green font-semibold text-[14.5px] px-5 py-3.5 text-center"
            role="status"
          >
            <T id="login.reset.done">Password updated — sign in with your new password.</T>
          </p>
        )}
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/15 bg-white/[.07] backdrop-blur-md p-8 shadow-[0_40px_90px_rgba(4,10,22,.55)]"
        >
          <label className="block mb-4">
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#AFC1E2]">
              <T id="login.email.label">Email</T>
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-ink/60 text-white px-4 py-3 outline-none focus:border-brand-goldsoft placeholder:text-white/30"
              placeholder={emailPlaceholder}
            />
          </label>
          <label className="block mb-6">
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#AFC1E2]">
              <T id="login.password.label">Password</T>
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-ink/60 text-white px-4 py-3 outline-none focus:border-brand-goldsoft"
            />
          </label>
          <button type="submit" disabled={status === 'working'} className="btn-gold w-full disabled:opacity-60">
            {status === 'working' ? <T id="login.submit.working">Signing in…</T> : <T id="login.submit.cta">Sign in</T>}
          </button>
          {status === 'error' && (
            <p className="mt-4 text-brand-redhot font-semibold text-[14.5px]" role="alert">
              {errorMsg}
            </p>
          )}
          {status === 'reset-sent' && (
            <p className="mt-4 text-brand-green font-semibold text-[14.5px]" role="status">
              <T id="login.reset.sent">Password reset email sent — check your inbox.</T>
            </p>
          )}
          <div className="flex justify-between items-center mt-5 text-[13.5px]">
            <button type="button" onClick={onForgot} className="text-[#AFC1E2] hover:text-white font-semibold">
              <T id="login.forgot">Forgot password?</T>
            </button>
            <Link to="/membership" className="text-brand-goldsoft hover:text-white font-semibold">
              <T id="login.join">Not a member yet?</T>
            </Link>
          </div>
        </form>
        <p className="text-center text-[12.5px] text-[#7C90B6] mt-5">
          <T id="login.note">Portal accounts are issued to current FAEMSE members. Questions:</T>{' '}
          <a className="text-brand-bluesoft hover:text-white" href="mailto:info@faemse.org">
            info@faemse.org
          </a>
        </p>
      </div>
    </section>
  );
}
