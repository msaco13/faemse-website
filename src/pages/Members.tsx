import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import AdminPanel from '../components/AdminPanel';
import ContentManager from '../components/ContentManager';
import PostingsManager from '../components/PostingsManager';
import PageHead from '../components/PageHead';
import { resourceCategories } from '../content/data';
import type { DirectoryEntry, MyOrganization, Payment, Profile } from '../lib/portal';
import { dateState, dollars, duesCents, formatDate, graceEnd, overallState } from '../lib/portal';
import { parseDocument, useDocument } from '../lib/documents';
import { useLibrary } from '../lib/postings';
import { useSettings } from '../lib/settings';
import { supabase } from '../lib/supabase';
import { slug, T, useText } from '../lib/text';

const stateBadge = {
  current: { text: 'Current member', cls: 'text-[#0E7A4A] bg-[#E2F7EC]' },
  grace: { text: 'Renewal due', cls: 'text-brand-goldink bg-[#FBF3D9]' },
  lapsed: { text: 'Membership lapsed', cls: 'text-brand-red bg-[#FDEAEB]' },
  pending: { text: 'Membership pending verification', cls: 'text-brand-goldink bg-[#FBF3D9]' },
} as const;

export default function Members() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  // Organizations this person represents; a current one makes them current.
  const [myOrgs, setMyOrgs] = useState<MyOrganization[]>([]);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [profileMsg, setProfileMsg] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [pwMsg, setPwMsg] = useState('');
  const library = useLibrary(!!session);
  const pwPlaceholder = useText('members.password.placeholder', 'New password (8+ characters)');
  const pwAria = useText('members.password.aria', 'New password, at least 8 characters');
  const { online_dues: onlineDues } = useSettings();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');
  // Back from Stripe: ?paid=1 (success) or ?paid=0 (cancelled).
  const [paidNotice, setPaidNotice] = useState<'' | 'success' | 'cancelled'>('');

  // Hand the member to Stripe's hosted checkout; the webhook does the rest.
  async function payOnline() {
    setPaying(true);
    setPayErr('');
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: {} });
    if (error) {
      let msg = error.message;
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) msg = body.error;
      } catch {
        /* keep the generic message */
      }
      setPayErr(msg);
      setPaying(false);
      return;
    }
    if (data?.url) window.location.assign(data.url);
    else {
      setPayErr('Stripe did not return a checkout page. Try again in a moment.');
      setPaying(false);
    }
  }

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
    const [{ data: prof }, { data: dir }, { data: pays }, { data: orgs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.rpc('get_directory'),
      supabase.from('membership_payments').select('*').eq('profile_id', uid).order('created_at', { ascending: false }).limit(5),
      supabase.rpc('my_organizations'),
    ]);
    if (prof) setProfile(prof as Profile);
    setDirectory((dir ?? []) as DirectoryEntry[]);
    if (pays) setPayments(pays as Payment[]);
    if (orgs) setMyOrgs(orgs as MyOrganization[]);
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
    // Returning from Stripe. The webhook usually lands within a second or
    // two; re-read the profile a few times so the new date shows without a
    // manual refresh, then drop the query string.
    const paid = new URLSearchParams(window.location.search).get('paid');
    const timers: number[] = [];
    if (paid === '1') {
      setPaidNotice('success');
      for (const ms of [1500, 4000, 8000, 14000]) timers.push(window.setTimeout(loadPortalData, ms));
    } else if (paid === '0') setPaidNotice('cancelled');
    if (paid !== null) window.history.replaceState(null, '', window.location.pathname);
    return () => timers.forEach(clearTimeout);
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
  const mState = profile?.role === 'admin' ? 'current' : overallState(profile, myOrgs);
  const badge = stateBadge[mState];
  const dues = duesCents(profile?.tier);
  // Someone whose only membership is through an organization has no dues of
  // their own to show or pay; the organization's card covers them.
  const ownDues = dues > 0 && (Boolean(profile?.expires_at) || myOrgs.length === 0);
  const canPayOnline = Boolean(onlineDues) && ownDues;
  const payButton = canPayOnline && (
    <button onClick={payOnline} disabled={paying} className="btn-red !py-2.5 !px-5 text-[14px] disabled:opacity-60">
      {paying ? <T id="members.dues.paying">Opening checkout…</T> : <><T id="members.dues.pay">Pay dues online</T> — {dollars(dues)}</>}
    </button>
  );
  const input =
    'mt-1.5 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-blue';
  const label = 'text-[13px] font-bold uppercase tracking-wide text-muted';

  return (
    <>
      <PageHead
        id="members"
        dynamicTitle
        eyebrow="Member portal"
        title={`Welcome, ${firstName}`}
        sub="Your member home — resources, meetings, and association business in one place."
      />
      <section className="py-16 bg-paper">
        <div className="wrap">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <p className="text-muted text-[15px]">
              <T id="members.signedin">Signed in as</T> <b className="text-body">{session.user.email}</b>
              <span className={`ml-3 inline-block align-middle text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full ${badge.cls}`}>
                <T id={`members.badge.${mState}`}>{badge.text}</T>
              </span>
              {mState === 'current' && profile?.expires_at && (
                <span className="ml-2 text-[13px] text-muted"><T id="members.through">through</T> {formatDate(profile.expires_at)}</span>
              )}
              {profile?.role === 'admin' && (
                <span className="ml-2 inline-block align-middle text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-brand-red bg-[#FDEAEB]">
                  <T id="members.admin">Admin</T>
                </span>
              )}
            </p>
            <button onClick={onSignOut} className="btn-outline !py-2.5 !px-5 text-[14px]">
              <T id="members.signout">Sign out</T>
            </button>
          </div>

          {paidNotice === 'success' && (
            <p className="mb-8 rounded-2xl border border-[#0E7A4A]/30 bg-[#E2F7EC] px-6 py-4 text-[14.5px] font-semibold text-[#0E7A4A]" role="status">
              <T id="members.paid.success">Thank you — your payment went through. Your new paid-through date appears below within a few seconds; a receipt is on its way from Stripe.</T>
            </p>
          )}
          {paidNotice === 'cancelled' && (
            <p className="mb-8 rounded-2xl border border-line bg-white px-6 py-4 text-[14.5px] font-semibold text-muted" role="status">
              <T id="members.paid.cancelled">Checkout was cancelled — nothing was charged. You can pay whenever you're ready.</T>
            </p>
          )}

          {mState === 'grace' && profile?.expires_at && (
            <div className="mb-8 rounded-2xl border border-brand-gold/40 bg-[#FBF3D9] px-6 py-4 text-[14.5px] font-semibold text-brand-goldink flex flex-wrap items-center gap-x-2 gap-y-3">
              <p className="flex-1 min-w-[260px]">
              <T id="members.grace.a">Your membership term ended on</T> {formatDate(profile.expires_at)}.{' '}
              <T id="members.grace.b">Under the bylaws you keep member access for 90 days, until</T>{' '}
              {graceEnd(profile.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.{' '}
              {!canPayOnline && (
                <>
                  <Link to="/membership" className="underline">
                    <T id="members.grace.link">Renew now</T>
                  </Link>{' '}
                  <T id="members.grace.c">to stay in good standing.</T>
                </>
              )}
              </p>
              {payButton}
            </div>
          )}

          {mState === 'lapsed' && (
            <div className="mb-8 rounded-2xl border border-brand-red/30 bg-[#FDEAEB] px-6 py-4 text-[14.5px] font-semibold text-brand-red flex flex-wrap items-center gap-x-2 gap-y-3">
              <p className="flex-1 min-w-[260px]">
              <T id="members.lapsed.a">Your membership lapsed</T>{profile?.expires_at ? ` on ${formatDate(profile.expires_at)}` : ''}
              {canPayOnline ? (
                <>. <T id="members.lapsed.pay">Pay your dues to pick up right where you left off.</T></>
              ) : (
                <>
                  {' '}—{' '}
                  <Link to="/membership" className="underline">
                    <T id="members.lapsed.link">renew here</T>
                  </Link>{' '}
                  <T id="members.lapsed.b">to keep your benefits.</T>
                </>
              )}
              </p>
              {payButton}
            </div>
          )}
          {payErr && (
            <p className="mb-8 -mt-4 text-brand-red font-semibold text-[14px]" role="alert">
              {payErr}
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
            ].map((c, i) => (
              <div key={c.title} className="card p-7 border-t-[3px] border-t-brand-gold/70">
                <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id={`members.card.${slug(c.title)}.title`}>{c.title}</T></h2>
                <p className="text-muted text-[14.5px] mb-4"><T id={`members.card.${slug(c.title)}.text`}>{c.text}</T></p>
                <Link to={c.cta.to} className="font-bold text-brand-blue hover:underline text-[14.5px]">
                  <T id={`members.card.${slug(c.title)}.cta`}>{c.cta.label}</T>
                </Link>
              </div>
            ))}
          </div>

          <BylawsCard enabled={mState === 'current' || mState === 'grace'} admin={profile?.role === 'admin'} />

          {/* Organizations this person represents: the membership is theirs, not the person's. */}
          {myOrgs.length > 0 && (
            <div className="card p-8 mb-10 border-t-[3px] border-t-brand-gold/70">
              <h2 className="font-disp font-bold uppercase text-xl mb-2">
                <T id="members.orgs.title">{myOrgs.length === 1 ? 'Your organization' : 'Your organizations'}</T>
              </h2>
              <p className="text-muted text-[14px] mb-4 max-w-[62ch]">
                <T id="members.orgs.text">
                  You are a member through your organization&apos;s membership. Its coordinator renews it for everyone
                  it covers.
                </T>
              </p>
              <ul className="space-y-3">
                {myOrgs.map((o) => {
                  const s = dateState(o.expires_at);
                  return (
                    <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
                      <b>{o.name}</b>
                      <span className="text-[11px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-full text-[#1A47B8] bg-[#E7EEFF]">
                        {o.kind}
                      </span>
                      <span className={`text-[11px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-full ${stateBadge[s].cls}`}>
                        {s === 'current' ? 'current' : s === 'grace' ? 'renewal due' : s === 'lapsed' ? 'lapsed' : 'no date'}
                      </span>
                      <span className="text-muted text-[14px]">
                        {o.expires_at ? `paid through ${formatDate(o.expires_at)}` : 'no paid-through date yet'} · {o.seats_used} of {o.seat_cap} seats
                        {o.role === 'coordinator' ? ' · you are the coordinator' : o.coordinator_name ? ` · coordinator ${o.coordinator_name}` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Dues: where the member stands, what they last paid, and how to renew. */}
          {ownDues && (
            <div className="card p-8 mb-10 border-t-[3px] border-t-brand-gold/70">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="flex-1 min-w-[260px]">
                  <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.dues.title">Membership dues</T></h2>
                  <p className="text-[15px] mb-2">
                    <T id="members.dues.tier">Your tier:</T> <b className="capitalize">{profile?.tier ?? 'active'}</b> · {dollars(dues)}
                    <T id="members.dues.peryear"> a year</T>
                    {profile?.expires_at && (
                      <>
                        {' · '}
                        <T id="members.dues.through">paid through</T> <b>{formatDate(profile.expires_at)}</b>
                      </>
                    )}
                  </p>
                  <p className="text-muted text-[14px] max-w-[62ch]">
                    <T id="members.dues.text">
                      Renewing extends your membership twelve months from your current paid-through date, so renewing
                      early never costs you time.
                    </T>{' '}
                    {!canPayOnline && (
                      <>
                        <T id="members.dues.offline">To renew, submit the renewal form and the board will follow up with payment details:</T>{' '}
                        <Link to="/membership#apply" className="font-semibold text-brand-blue hover:underline">
                          <T id="members.dues.offline.link">renewal form</T>
                        </Link>
                        .
                      </>
                    )}
                  </p>
                  {payments.length > 0 && (
                    <ul className="mt-4 text-[13.5px] text-muted space-y-1">
                      {payments.slice(0, 3).map((p) => (
                        <li key={p.id}>
                          {formatDate(p.paid_on)} · {dollars(p.amount_cents)} · {p.method === 'stripe' ? 'online' : p.method} →{' '}
                          <T id="members.dues.paidthrough">paid through</T> {formatDate(p.new_expires)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {payButton && <div>{payButton}</div>}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-10">
            {/* Profile */}
            <div className="card p-8 border-t-[3px] border-t-brand-gold/70">
              <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.profile.title">Your profile</T></h2>
              <p className="text-muted text-[14px] mb-5">
                <T id="members.profile.text">What fellow members see about you in the directory.</T>
              </p>
              <form onSubmit={onSaveProfile}>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <label className="block">
                    <span className={label}><T id="members.profile.name">Full name</T></span>
                    <input name="full_name" defaultValue={profile?.full_name ?? ''} maxLength={200} className={input} />
                  </label>
                  <label className="block">
                    <span className={label}><T id="members.profile.cert">Certification level</T></span>
                    <input name="cert_level" defaultValue={profile?.cert_level ?? ''} maxLength={100} className={input} />
                  </label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <label className="block">
                    <span className={label}><T id="members.profile.county">County</T></span>
                    <input name="county" defaultValue={profile?.county ?? ''} maxLength={100} className={input} />
                  </label>
                  <label className="block">
                    <span className={label}><T id="members.profile.agency">Agency / program</T></span>
                    <input name="agency" defaultValue={profile?.agency ?? ''} maxLength={300} className={input} />
                  </label>
                </div>
                <label className="flex items-center gap-2.5 mb-5 text-[14.5px] font-semibold">
                  <input
                    type="checkbox"
                    name="show_in_directory"
                    defaultChecked={profile?.show_in_directory ?? true}
                    className="w-4 h-4 accent-brand-blue"
                  />
                  <T id="members.profile.listme">List me in the member directory</T>
                </label>
                <button type="submit" disabled={profileStatus === 'working'} className="btn-outline disabled:opacity-60">
                  {profileStatus === 'working' ? <T id="members.profile.saving">Saving…</T> : <T id="members.profile.save">Save profile</T>}
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
              <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.directory.title">Member directory</T></h2>
              <p className="text-muted text-[14px] mb-5">
                <T id="members.directory.text">Current members who chose to be listed.</T>
              </p>
              {directory.length === 0 ? (
                <p className="text-muted text-[14.5px]">
                  <T id="members.directory.empty">No listed members yet — the directory fills in as memberships are verified.</T>
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
            <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.password.title">Set a new password</T></h2>
            <p className="text-muted text-[14px] mb-4">
              <T id="members.password.text">Choose the password you&apos;ll use to sign in from now on.</T>
            </p>
            <form onSubmit={onSetPassword} className="flex flex-wrap gap-3">
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder={pwPlaceholder}
                aria-label={pwAria}
                className="flex-1 min-w-[220px] rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-gold"
              />
              <button type="submit" disabled={pwStatus === 'working'} className="btn-gold disabled:opacity-60">
                {pwStatus === 'working' ? <T id="members.password.saving">Saving…</T> : <T id="members.password.save">Save password</T>}
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
            <h2 className="font-disp font-bold uppercase text-2xl mb-2"><T id="members.library.title">Member library</T></h2>
            <p className="text-muted text-[14px] mb-5">
              <T id="members.library.text">Documents and references shelved by the board — one library, organized by tag.</T>
            </p>
            {library.items.length === 0 ? (
              <p className="text-muted text-[14.5px]">
                <T id="members.library.empty">
                  The shelves are being stocked — program director guidance, teaching craft, and
                  clinical references land here first.
                </T>
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
            <h2 className="font-disp font-bold uppercase text-2xl mb-5"><T id="members.shelf.title">The reference shelf</T></h2>
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

// The full bylaws, members-only: the row comes through RLS, so a visitor who
// is not a current member never receives the text at all. Rendered from plain
// text with the document's own numbering turned into headings.
function BylawsCard({ enabled, admin }: { enabled: boolean; admin: boolean }) {
  const doc = useDocument('bylaws', enabled);
  const blocks = doc.status === 'ready' ? parseDocument(doc.doc.body) : [];
  const current = blocks.filter((b) => b.kind === 'date').map((b) => (b.kind === 'date' ? b.text : '')).pop();
  return (
    <div className="card p-8 mb-10 border-t-[3px] border-t-brand-gold/70">
      <h2 className="font-disp font-bold uppercase text-2xl mb-2">
        <T id="members.bylaws.title">Bylaws</T>
      </h2>
      {!enabled && (
        <p className="text-muted text-[14.5px]">
          <T id="members.bylaws.locked">The full bylaws are available to current members. The public outline is on the Bylaws page.</T>
        </p>
      )}
      {enabled && doc.status === 'loading' && (
        <p className="text-muted text-[14.5px]"><T id="members.bylaws.loading">Loading the bylaws…</T></p>
      )}
      {enabled && doc.status === 'missing' && (
        <p className="text-muted text-[14.5px]">
          <T id="members.bylaws.missing">The bylaws have not been loaded into the portal yet.</T>
          {admin && ' Admins: run supabase/migrations/20260913_bylaws_documents.sql in the SQL Editor.'}
        </p>
      )}
      {enabled && doc.status === 'error' && (
        <p className="text-brand-red text-[14.5px] font-semibold" role="alert">{doc.message}</p>
      )}
      {enabled && doc.status === 'ready' && (
        <>
          <p className="text-muted text-[14px] mb-4">
            <T id="members.bylaws.text">The complete, current bylaws of the association.</T>
            {current ? ` ${current.replace(/^Date /, '')}.` : ''}
          </p>
          <details className="group">
            <summary className="cursor-pointer list-none inline-flex items-center gap-2 font-bold text-brand-blue hover:underline text-[15px]">
              <span className="group-open:hidden"><T id="members.bylaws.open">Read the full text ↓</T></span>
              <span className="hidden group-open:inline"><T id="members.bylaws.close">Collapse ↑</T></span>
            </summary>
            <div className="mt-5 max-h-[70vh] overflow-y-auto pr-3 border-t border-line pt-5 text-[15px] leading-relaxed">
              <h3 className="font-disp font-bold uppercase text-xl mb-4">{doc.doc.title}</h3>
              {blocks.map((b, i) => {
                if (b.kind === 'article')
                  return (
                    <h4 key={i} className="font-disp font-bold uppercase text-lg mt-7 mb-2 text-brand-bluedeep">
                      Article {b.number}{b.title ? `: ${b.title}` : ''}
                    </h4>
                  );
                if (b.kind === 'section') return <h5 key={i} className="font-bold mt-4 mb-1">{b.text}</h5>;
                if (b.kind === 'date') return <p key={i} className="text-muted text-[14px] my-0.5">{b.text}</p>;
                return <p key={i} className="text-body mb-3">{b.text}</p>;
              })}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
