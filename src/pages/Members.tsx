import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import PageHead from '../components/PageHead';
import { resourceCategories } from '../content/data';
import { supabase } from '../lib/supabase';

export default function Members() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [pwStatus, setPwStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [pwMsg, setPwMsg] = useState('');

  async function onSignOut() {
    try {
      // Local scope: sign out this browser only, not the member's other devices.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* the hard redirect below resets state regardless */
    }
    // Same hard-navigation pattern as the password flow: a full page load so
    // the portal can never linger on screen after signing out.
    window.location.assign(`${import.meta.env.BASE_URL}login`);
  }

  async function onSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get('password') ?? '');
    if (pw.length < 8) {
      setPwMsg('Use at least 8 characters.');
      setPwStatus('error');
      return;
    }
    setPwStatus('working');
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setPwMsg(error.message);
        setPwStatus('error');
        return;
      }
      try {
        sessionStorage.setItem('pw-reset-ok', '1');
      } catch {
        /* banner is a nicety; the flow works without it */
      }
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        /* local sign-out only; the hard redirect below resets state anyway */
      }
      // Hard navigation on purpose: a full page load to the login screen,
      // bypassing the SPA transition entirely.
      window.location.assign(`${import.meta.env.BASE_URL}login`);
    } catch (err) {
      setPwMsg(`Could not save the password: ${String(err)}`);
      setPwStatus('error');
    }
  }

  useEffect(() => {
    // One session check on mount, nothing reactive — auth events during the
    // save flow must not trigger re-renders or client-side navigation here.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
      if (!data.session) navigate('/login', { replace: true });
    });
  }, [navigate]);

  if (!checked || !session) return null;

  const firstName =
    (session.user.user_metadata?.first_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'member';

  return (
    <>
      <PageHead
        eyebrow="Member portal"
        title={`Welcome, ${firstName}`}
        sub="Your member home — resources, meetings, and association business in one place."
      />
      <section className="py-16 bg-paper">
        <div className="wrap">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <p className="text-muted text-[15px]">
              Signed in as <b className="text-body">{session.user.email}</b>
              <span className="ml-3 inline-block align-middle text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-brand-goldink bg-[#FBF3D9]">
                Member
              </span>
            </p>
            <button
              onClick={onSignOut}
              className="btn-outline !py-2.5 !px-5 text-[14px]"
            >
              Sign out
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: 'Quarterly meetings',
                text: 'Agendas, minutes, and Zoom links for statewide membership meetings will post here.',
                cta: { label: 'See the calendar →', to: '/events' },
              },
              {
                title: 'Member documents',
                text: 'Bylaws, committee rosters, and association business — the file library is being stocked now.',
                cta: { label: 'Read the bylaws →', to: '/bylaws' },
              },
              {
                title: 'Educator of the Year',
                text: 'Nominations for the seven award categories open to Active members each cycle.',
                cta: { label: 'About the award →', to: '/about' },
              },
            ].map((c) => (
              <div key={c.title} className="card p-7 border-t-[3px] border-t-brand-gold/70">
                <h2 className="font-disp font-bold uppercase text-xl mb-2">{c.title}</h2>
                <p className="text-muted text-[14.5px] mb-4">{c.text}</p>
                <Link to={c.cta.to} className="font-bold text-brand-blue hover:underline text-[14.5px]">
                  {c.cta.label}
                </Link>
              </div>
            ))}
          </div>

          <div className="card p-8 mb-10 border-t-[3px] border-t-brand-gold/70 max-w-[560px]">
            <h2 className="font-disp font-bold uppercase text-xl mb-2">Set a new password</h2>
            <p className="text-muted text-[14px] mb-4">
              Choose the password you'll use to sign in from now on.
            </p>
            <form onSubmit={onSetPassword} className="flex flex-wrap gap-3">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="New password (8+ characters)"
                className="flex-1 min-w-[220px] rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-gold"
              />
              <button type="submit" disabled={pwStatus === 'working'} className="btn-gold disabled:opacity-60">
                {pwStatus === 'working' ? 'Saving…' : 'Save password'}
              </button>
            </form>
            {pwStatus === 'done' && (
              <p className="mt-3 text-[#0E7A4A] font-semibold text-[14px]" role="status">{pwMsg}</p>
            )}
            {pwStatus === 'error' && (
              <p className="mt-3 text-[#B8232D] font-semibold text-[14px]" role="alert">{pwMsg}</p>
            )}
          </div>

          <div className="card p-8">
            <h2 className="font-disp font-bold uppercase text-2xl mb-5">The reference shelf</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-7">
              {resourceCategories.map((cat) => (
                <div key={cat.category}>
                  <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-3">
                    {cat.category}
                  </h3>
                  <ul className="space-y-2 text-[14.5px]">
                    {cat.links.map((l) => (
                      <li key={l.name}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-brand-blue hover:underline"
                        >
                          {l.name} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
