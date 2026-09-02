import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import AdminPanel from '../components/AdminPanel';
import ContentManager from '../components/ContentManager';
import PostingsManager from '../components/PostingsManager';
import PageHead from '../components/PageHead';
import { resourceCategories } from '../content/data';
import type { DirectoryEntry, Profile } from '../lib/portal';
import { formatDate, membershipState } from '../lib/portal';
import { useLibrary } from '../lib/postings';
import { supabase } from '../lib/supabase';

const stateBadge = {
  current: { text: 'Current member', cls: 'text-[#0E7A4A] bg-[#E2F7EC]' },
  lapsed: { text: 'Membership lapsed', cls: 'text-brand-red bg-[#FDEAEB]' },
  pending: { text: 'Membership pending verification', cls: 'text-brand-goldink bg-[#FBF3D9]' },
} as const;

export default function Members() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [profileMsg, setProfileMsg] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [pwMsg, setPwMsg] = useState('');
  const library = useLibrary(!!session);

  async function onSignOut() {
    try {
      // Local scope: sign out this browser only, not the member's other devices.
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* the hard redirect below resets state anyway */
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

  async function onSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setProfileStatus('working');
    const { error } = await supabase.rpc('update_my_profile', {
      p_full_name: String(data.full_name ?? ''),
      p_cert_level: String(data.cert_level ?? ''),
      p_county: String(data.county ?? ''),
      p_agency: String(data.agency ?? ''),
      p_show: data.show_in_directory === 'on',
    });
    if (error) {
      setProfileMsg(error.message);
      setProfileStatus('error');
    } else {
      setProfileMsg('Profile saved.');
      setProfileStatus('done');
      loadPortalData();
    }
  }

  async function loadPortalData() {
    const { data: auth } = await supabase.auth.getSession();
    const uid = auth.session?.user.id;
    if (!uid) return;
    // ensure_profile creates the row on first visit; harmless afterwards.
    await supabase.rpc('ensure_profile').then(() => undefined, () => undefined);
    const [{ data: prof }, { data: dir }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.rpc('get_directory'),
    ]);
    if (prof) setProfile(prof as Profile);
    setDirectory((dir ?? []) as DirectoryEntry[]);
  }

  useEffect(() => {
    // One session check on mount, nothing reactive — auth events during the
    // save flows must not trigger re-renders or client-side navigation here.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
      if (!data.session) navigate('/login', { replace: true });
      else loadPortalData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  if (!checked || !session) return null;

  const firstName =
    profile?.full_name?.split(' ')[0] ??
    (session.user.user_metadata?.first_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'member';

  // Board admins are members by definition (the database's is_current_member
  // says the same); never show them a "pending verification" badge.
  const mState = profile?.role === 'admin' ? 'current' : membershipState(profile);
  const badge = stateBadge[mState];
  const input =
    'mt-1.5 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-blue';
  const label = 'text-[13px] font-bold uppercase tracking-wide text-muted';

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
              <span className={`ml-3 inline-block align-middle text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full ${badge.cls}`}>
                {badge.text}
              </span>
              {mState === 'current' && profile?.expires_at && (
                <span className="ml-2 text-[13px] text-muted">through {formatDate(profile.expires_at)}</span>
              )}
              {profile?.role === 'admin' && (
                <span className="ml-2 inline-block align-middle text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-brand-red bg-[#FDEAEB]">
                  Admin
                </span>
              )}
            </p>
            <button onClick={onSignOut} className="btn-outline !py-2.5 !px-5 text-[14px]">
              Sign out
            </button>
          </div>

          {mState === 'lapsed' && (
            <p className="mb-8 rounded-2xl border border-brand-red/30 bg-[#FDEAEB] px-6 py-4 text-[14.5px] font-semibold text-brand-red">
              Your membership lapsed{profile?.expires_at ? ` on ${formatDate(profile.expires_at)}` : ''} —{' '}
              <Link to="/membership" className="underline">
                renew here
              </Link>{' '}
              to keep your benefits.
            </p>
          )}

          {profile?.role === 'admin' && (
            <>
              <AdminPanel />
              <ContentManager />
              <PostingsManager />
            </>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: 'Q&A archive',
                text: 'Distilled answers to the questions Florida educators actually ask — searchable, by topic.',
                cta: { label: 'Search the archive →', to: '/qa' },
              },
              {
                title: 'Teaching videos',
                text: 'Short segments on the craft of teaching EMS, from the state’s strongest instructors.',
                cta: { label: 'Watch the library →', to: '/videos' },
              },
              {
                title: 'Statewide meetings',
                text: 'Agendas, minutes, and Zoom links for statewide membership meetings post to the calendar.',
                cta: { label: 'See the calendar →', to: '/events' },
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

          <div className="grid lg:grid-cols-2 gap-6 mb-10">
            {/* Profile */}
            <div className="card p-8 border-t-[3px] border-t-brand-gold/70">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Your profile</h2>
              <p className="text-muted text-[14px] mb-5">
                What fellow members see about you in the directory.
              </p>
              <form onSubmit={onSaveProfile}>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <label className="block">
                    <span className={label}>Full name</span>
                    <input name="full_name" defaultValue={profile?.full_name ?? ''} maxLength={200} className={input} />
                  </label>
                  <label className="block">
                    <span className={label}>Certification level</span>
                    <input name="cert_level" defaultValue={profile?.cert_level ?? ''} maxLength={100} className={input} />
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <label className="block">
                    <span className={label}>County</span>
                    <input name="county" defaultValue={profile?.county ?? ''} maxLength={100} className={input} />
                  </label>
                  <label className="block">
                    <span className={label}>Agency / program</span>
                    <input name="agency" defaultValue={profile?.agency ?? ''} maxLength={300} className={input} />
                  </label>
                </div>
                <label className="flex items-center gap-2.5 mb-5 text-[14.5px] font-semibold">
                  <input
                    type="checkbox"
                    name="show_in_directory"
                    defaultChecked={profile?.show_in_directory ?? true}
                    className="w-4 h-4 accent-[#2F6BFF]"
                  />
                  List me in the member directory
                </label>
                <button type="submit" disabled={profileStatus === 'working'} className="btn-outline disabled:opacity-60">
                  {profileStatus === 'working' ? 'Saving…' : 'Save profile'}
                </button>
                {profileStatus === 'done' && (
                  <p className="mt-3 text-[#0E7A4A] font-semibold text-[14px]" role="status">{profileMsg}</p>
                )}
                {profileStatus === 'error' && (
                  <p className="mt-3 text-brand-red font-semibold text-[14px]" role="alert">{profileMsg}</p>
                )}
              </form>
            </div>

            {/* Directory */}
            <div className="card p-8 border-t-[3px] border-t-brand-gold/70">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">Member directory</h2>
              <p className="text-muted text-[14px] mb-5">
                Current members who chose to be listed.
              </p>
              {directory.length === 0 ? (
                <p className="text-muted text-[14.5px]">
                  No listed members yet — the directory fills in as memberships are verified.
                </p>
              ) : (
                <ul className="divide-y divide-line max-h-[340px] overflow-y-auto pr-1">
                  {directory.map((d, i) => (
                    <li key={`${d.full_name}-${i}`} className="py-3">
                      <b className="block text-[14.5px]">{d.full_name ?? 'Member'}</b>
                      <span className="text-[13px] text-muted">
                        {[d.cert_level, d.agency, d.county].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card p-8 mb-10 border-t-[3px] border-t-brand-gold/70 max-w-[560px]">
            <h2 className="font-disp font-bold uppercase text-xl mb-2">Set a new password</h2>
            <p className="text-muted text-[14px] mb-4">
              Choose the password you&apos;ll use to sign in from now on.
            </p>
            <form onSubmit={onSetPassword} className="flex flex-wrap gap-3">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="New password (8+ characters)"
                aria-label="New password, at least 8 characters"
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

          <div className="card p-8 mb-10 border-t-[3px] border-t-brand-gold/70">
            <h2 className="font-disp font-bold uppercase text-2xl mb-2">Member library</h2>
            <p className="text-muted text-[14px] mb-5">
              Documents and references shelved by the board — one library, organized by tag.
            </p>
            {library.items.length === 0 ? (
              <p className="text-muted text-[14.5px]">
                The shelves are being stocked — program director guidance, teaching craft, and
                clinical references land here first.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {library.items.map((r) => (
                  <li key={r.id} className="py-3.5">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-blue hover:underline text-[15px]"
                    >
                      {r.title} ↗
                    </a>
                    {r.description && <p className="text-[13.5px] text-muted mt-0.5">{r.description}</p>}
                    {r.tags.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {r.tags.map((t) => (
                          <i
                            key={t}
                            className="not-italic text-[11px] font-bold tracking-[0.08em] uppercase text-muted bg-paper px-2 py-0.5 rounded-full"
                          >
                            {t}
                          </i>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
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
