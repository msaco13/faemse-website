import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import AdminWorkspace from '../components/admin/AdminWorkspace';
import BoardStrip from '../components/BoardStrip';
import PageHead from '../components/PageHead';
import { mailto, resourceCategories } from '../content/data';
import { useSiteNews } from '../lib/content';
import { useHubList } from '../lib/hubs';
import type { DirectoryEntry, MyOrganization, Payment, Profile } from '../lib/portal';
import { dateState, dollars, duesCents, formatDate, graceEnd, inRenewalWindow, overallState, renewalOpens } from '../lib/portal';
import { useClasses, useJobs, useLibrary, useQaEntries, useSpotlights, useVideos, type ClassItem, type JobItem } from '../lib/postings';
import { arrivedByPasswordLink } from '../lib/recovery';
import { useSettings } from '../lib/settings';
import { supabase } from '../lib/supabase';
import { T, useText } from '../lib/text';

const stateBadge = {
  current: { text: 'Current member', cls: 'text-[#0E7A4A] bg-[#E2F7EC]' },
  grace: { text: 'Renewal due', cls: 'text-brand-goldink bg-[#FBF3D9]' },
  lapsed: { text: 'Membership lapsed', cls: 'text-brand-red bg-[#FDEAEB]' },
  pending: { text: 'Membership pending verification', cls: 'text-brand-goldink bg-[#FBF3D9]' },
} as const;

// A board or staff position next to a name in the directory (set by admins).
const positionTag = 'ml-2 inline-block align-middle text-[11px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full text-brand-goldink bg-[#FBF3D9]';

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
  // The portal's tabs and what fills them (board, 2026-10-20).
  const { tab } = useParams<{ tab?: string }>();
  const hubs = useHubList(!!session);
  const spotlights = useSpotlights();
  const news = useSiteNews();
  const jobs = useJobs();
  const classes = useClasses();
  const qa = useQaEntries(!!session);
  const videos = useVideos(!!session);
  const pwPlaceholder = useText('members.password.placeholder', 'New password (8+ characters)');
  const pwAria = useText('members.password.aria', 'New password, at least 8 characters');
  const { online_dues: onlineDues } = useSettings();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');
  // Back from Stripe: ?paid=1 (success) or ?paid=0 (cancelled).
  const [paidNotice, setPaidNotice] = useState<'' | 'success' | 'cancelled'>('');
  // Arrived through a password link (?setpw=1 from RecoveryRedirect, or the
  // link's own hash): the "Set your password" card goes first, because the
  // link signs the member in only on the device it was opened on. On the
  // first day of renewal reminders a member landed here, saw a normal portal
  // with the card at the bottom, never set a password, and then could not
  // sign in from his own browser.
  const [settingPassword, setSettingPassword] = useState(false);

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
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('paid');
    const timers: number[] = [];
    if (paid === '1') {
      setPaidNotice('success');
      for (const ms of [1500, 4000, 8000, 14000]) timers.push(window.setTimeout(loadPortalData, ms));
    } else if (paid === '0') setPaidNotice('cancelled');
    if (params.get('setpw') === '1' || arrivedByPasswordLink) setSettingPassword(true);
    if (paid !== null || params.has('setpw')) window.history.replaceState(null, '', window.location.pathname);
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
  const isAdmin = profile?.role === 'admin';
  const mState = isAdmin ? 'current' : overallState(profile, myOrgs);
  const dues = duesCents(profile?.tier);
  // Someone whose only membership is through an organization has no dues of
  // their own to show or pay; the organization's card covers them.
  const ownDues = dues > 0 && (Boolean(profile?.expires_at) || myOrgs.length === 0);
  const canPayOnline = Boolean(onlineDues) && ownDues;
  const isMember = mState === 'current' || mState === 'grace';

  // Which tab: /members, /members/resources, /members/jobs, /members/account,
  // /members/board (admins). Jobs & classes appears only when something is
  // posted; anything unknown falls back to Home.
  const jobsLive = jobs.live ? jobs.items : [];
  const classesLive = classes.live ? classes.items : [];
  const showJobs = jobsLive.length + classesLive.length > 0;
  const tabs = [
    { key: 'home', to: '/members', label: 'Home' },
    { key: 'resources', to: '/members/resources', label: 'Resources' },
    ...(showJobs ? [{ key: 'jobs', to: '/members/jobs', label: 'Jobs & classes' }] : []),
    { key: 'account', to: '/members/account', label: 'My account' },
    ...(isAdmin ? [{ key: 'board', to: '/members/board', label: 'Board tools' }] : []),
  ];
  const active = tabs.some((t) => t.key === tab) ? (tab as string) : 'home';

  const hubList = hubs.status === 'ready' ? hubs.data : [];
  const shelfCount = resourceCategories.reduce((n, c) => n + c.links.length, 0);
  const agencies = new Set(directory.map((d) => (d.agency ?? '').trim().toLowerCase()).filter(Boolean)).size;
  const latestPost = news.live ? news.items[0] : undefined;
  const latestHub = [...hubList].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const qaPublished = qa.items.filter((q) => q.published !== false);
  const foundation = spotlights.items.find((s) => /faemsefoundation\.org/i.test(s.linkUrl));
  const longDay = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const input =
    'mt-1.5 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand-blue';
  const label = 'text-[13px] font-bold uppercase tracking-wide text-muted';
  const cardHead = 'font-disp font-semibold text-[13px] tracking-[0.2em] uppercase text-brand-blue';
  const payBtn = (
    <button onClick={payOnline} disabled={paying} className="btn-red !py-3 !px-5 text-[15px] self-start disabled:opacity-60">
      {paying ? <T id="members.dues.paying">Opening checkout…</T> : <><T id="members.dues.pay">Pay dues online</T> · {dollars(dues)}</>}
    </button>
  );
  const renewLink = (
    <Link to="/membership#apply" className="font-semibold text-brand-goldsoft hover:text-white underline">
      <T id="members.card.renewform">Renew with the renewal form</T>
    </Link>
  );

  // The membership card in the banner (board, 2026-10-20): the date that
  // matters, and the pay button only when payment is due.
  const badge = (text: string, cls: string, id: string) => (
    <span className={`text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full ${cls}`}>
      <T id={`members.card.badge.${id}`}>{text}</T>
    </span>
  );
  const orgOnly = !ownDues && myOrgs.length > 0;
  const exp = profile?.expires_at ?? null;
  let cardBadge: React.ReactNode;
  let cardBody: React.ReactNode;
  if (orgOnly) {
    const o = [...myOrgs].sort((a, b) => (b.expires_at ?? '').localeCompare(a.expires_at ?? ''))[0];
    cardBadge = mState === 'current' ? badge('Current member', 'text-[#0E7A4A] bg-[#E2F7EC]', 'current') : badge('Renewal due', 'text-brand-goldink bg-[#FBF3D9]', 'due');
    cardBody = (
      <>
        <span className="text-[14px] text-[#BCCBE7]"><T id="members.card.through">Member through</T> {o.name}</span>
        {o.expires_at && <b className="font-disp font-bold text-[30px] leading-[1.05]"><T id="members.card.paid">Paid through</T> {formatDate(o.expires_at)}</b>}
        <span className="text-[13.5px] text-[#93A6C9]"><T id="members.card.org">Your organization&apos;s coordinator renews it for everyone it covers.</T></span>
      </>
    );
  } else if (mState === 'current' && exp && inRenewalWindow(exp)) {
    cardBadge = badge('Renewal due', 'text-brand-goldink bg-[#FBF3D9]', 'due');
    cardBody = (
      <>
        <span className="text-[14px] text-[#BCCBE7]"><span className="capitalize">{profile?.tier ?? 'active'}</span> · {dollars(dues)} <T id="members.dues.peryear">a year</T></span>
        <b className="font-disp font-bold text-[30px] leading-[1.05]"><T id="members.card.paid">Paid through</T> {formatDate(exp)}</b>
        {canPayOnline ? payBtn : renewLink}
        <span className="text-[13px] text-[#93A6C9]"><T id="members.card.adds">Renewing adds twelve months to your current date.</T></span>
      </>
    );
  } else if (mState === 'current') {
    cardBadge = badge('Current member', 'text-[#0E7A4A] bg-[#E2F7EC]', 'current');
    cardBody = (
      <>
        {ownDues && <span className="text-[14px] text-[#BCCBE7]"><span className="capitalize">{profile?.tier ?? 'active'}</span> · {dollars(dues)} <T id="members.dues.peryear">a year</T></span>}
        {exp && <b className="font-disp font-bold text-[30px] leading-[1.05]"><T id="members.card.paid">Paid through</T> {formatDate(exp)}</b>}
        {exp && ownDues && (
          <span className="text-[13.5px] text-[#93A6C9]">
            <T id="members.card.opens">Renewal opens</T> {longDay(renewalOpens(exp))}.{' '}
            {canPayOnline ? (
              <button type="button" onClick={payOnline} disabled={paying} className="font-semibold text-brand-goldsoft hover:text-white underline disabled:opacity-60">
                {paying ? <T id="members.dues.paying">Opening checkout…</T> : <T id="members.card.early">Renew early</T>}
              </button>
            ) : (
              renewLink
            )}
          </span>
        )}
      </>
    );
  } else if (mState === 'grace' && exp) {
    cardBadge = badge('Grace period', 'text-[#8F3B00] bg-[#FDE6D3]', 'grace');
    cardBody = (
      <>
        <b className="font-disp font-bold text-[30px] leading-[1.05]"><T id="members.card.ended">Your term ended</T> {formatDate(exp)}</b>
        <span className="text-[14px] text-[#BCCBE7]"><T id="members.grace.b">Under the bylaws you keep member access for 90 days, until</T> {longDay(graceEnd(exp))}.</span>
        {canPayOnline ? payBtn : renewLink}
      </>
    );
  } else if (mState === 'lapsed') {
    cardBadge = badge('Membership lapsed', 'text-brand-red bg-[#FDEAEB]', 'lapsed');
    cardBody = (
      <>
        <b className="font-disp font-bold text-[28px] leading-[1.05]"><T id="members.lapsed.a">Your membership lapsed</T>{exp ? ` on ${formatDate(exp)}` : ''}</b>
        <span className="text-[14px] text-[#BCCBE7]"><T id="members.lapsed.pay">Pay your dues to pick up right where you left off.</T></span>
        {canPayOnline ? payBtn : renewLink}
      </>
    );
  } else {
    cardBadge = badge('Pending verification', 'text-brand-goldink bg-[#FBF3D9]', 'pending');
    cardBody = (
      <span className="text-[14px] text-[#BCCBE7]"><T id="members.card.pendingtext">The board is confirming your membership. Your access opens as soon as it does.</T></span>
    );
  }
  const membershipCard = (
    <div className="rounded-[18px] border border-brand-goldsoft/30 bg-[rgba(4,21,42,.6)] shadow-[0_20px_50px_rgba(0,0,0,.28)] p-6 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="font-disp font-semibold text-[13px] tracking-[0.2em] uppercase text-brand-goldsoft"><T id="members.card.title">Your membership</T></span>
        {cardBadge}
      </div>
      {cardBody}
      {payErr && <p className="text-[#FF9AA0] font-semibold text-[13.5px]" role="alert">{payErr}</p>}
    </div>
  );

  // One card, two places: first on the page for someone who arrived through
  // a password link, otherwise on the My account tab.
  const passwordCard = (
    <div
      id="set-password"
      className={`card p-8 mb-10 border-t-[3px] max-w-[560px] ${settingPassword ? 'border-t-brand-red/80 shadow-[0_18px_40px_rgba(4,21,42,.12)]' : 'border-t-brand-gold/70'}`}
    >
      {settingPassword ? (
        <>
          <h2 className="font-disp font-bold uppercase text-2xl mb-2"><T id="members.password.link.title">Set your password now</T></h2>
          <p className="text-muted text-[14.5px] mb-4">
            <T id="members.password.link.text">
              Your email link signed you in on this device only. Choose a password here, then use it with your email
              address to sign in from any browser.
            </T>
          </p>
        </>
      ) : (
        <>
          <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.password.title">Set a new password</T></h2>
          <p className="text-muted text-[14px] mb-4">
            <T id="members.password.text">Choose the password you&apos;ll use to sign in from now on.</T>
          </p>
        </>
      )}
      <form onSubmit={onSetPassword} className="flex flex-wrap gap-3">
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus={settingPassword}
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
  );

  const tile = (to: string, title: string, id: string, stat: string, text: string, icon: React.ReactNode) => (
    <Link
      to={to}
      className="card p-6 flex gap-4 items-start transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(10,33,59,.12)]"
    >
      <span className="flex-none w-[52px] h-[52px] rounded-[14px] bg-ink grid place-items-center" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="font-disp font-bold uppercase text-[22px] leading-tight"><T id={`members.tile.${id}.title`}>{title}</T></span>
        <span className="text-[13px] font-bold text-brand-goldink">{stat}</span>
        <span className="text-[14px] text-muted"><T id={`members.tile.${id}.text`}>{text}</T></span>
      </span>
    </Link>
  );
  const iconStroke = { stroke: '#F5CE5A', strokeWidth: 1.7 };

  return (
    <>
      <PageHead
        id="members"
        dynamicTitle
        crest
        eyebrow="Member portal"
        title={`Welcome, ${firstName}`}
        sub="Your member home — resources, meetings, and association business in one place."
        aside={membershipCard}
      />

      {/* The portal's sections, one address each. */}
      <nav className="bg-white border-b border-line" aria-label="Member portal">
        <ul className="wrap flex flex-wrap gap-x-7 gap-y-1">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link
                to={t.to}
                aria-current={active === t.key ? 'page' : undefined}
                className={`inline-block font-semibold text-[15px] pt-4 pb-3 min-h-[52px] border-b-[3px] ${
                  active === t.key ? 'text-ink border-brand-gold font-bold' : 'text-muted border-transparent hover:text-ink'
                }`}
              >
                <T id={`members.tab.${t.key}`}>{t.label}</T>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <BoardStrip />

      <section className="py-12 bg-paper">
        <div className="wrap">
          {settingPassword && passwordCard}

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

          {active === 'home' && (
            <div className="flex flex-col gap-7">
              <div className="grid md:grid-cols-3 gap-5">
                {tile('/members/resources', 'Program hubs', 'hubs', hubList.length ? `${hubList.length} hubs` : 'For each program role', 'What each role requires, with the sources to check.',
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z" {...iconStroke} strokeLinejoin="round" /><path d="M7 8h1.5M7 11h1.5M16 8h1M16 11h1" {...iconStroke} strokeLinecap="round" /></svg>)}
                {tile('/members/resources', 'Reference shelf', 'shelf', `${shelfCount} standards and organizations`, 'CoAEMSP, NREMT, Florida DOH, NAEMSE and more.',
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v15.5L12 16.5l-6.5 4V5A1.5 1.5 0 0 1 7 3.5Z" {...iconStroke} strokeLinejoin="round" /></svg>)}
                {tile('/members/account', 'Member directory', 'directory', `${directory.length} members listed`, agencies ? `From ${agencies} programs and agencies across Florida.` : 'Current members who chose to be listed.',
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8.5" r="3.2" {...iconStroke} /><path d="M3 19.5c.6-3 3.1-5 6-5s5.4 2 6 5" {...iconStroke} strokeLinecap="round" /><circle cx="16.5" cy="9" r="2.5" {...iconStroke} /><path d="M17 14.6c2.2.3 3.6 1.9 4 4.4" {...iconStroke} strokeLinecap="round" /></svg>)}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card p-7 flex flex-col gap-3.5">
                  <p className={cardHead}><T id="members.new.title">What&apos;s new</T></p>
                  {latestPost ? (
                    <>
                      <span className="text-[13px] text-muted">{latestPost.date}</span>
                      <b className="text-[18px] leading-snug">{latestPost.title}</b>
                      <span className="text-[14.5px] text-muted">{latestPost.excerpt}</span>
                      <Link to="/news" className="font-bold text-brand-blue hover:underline text-[14.5px]"><T id="members.new.news">All news →</T></Link>
                    </>
                  ) : latestHub ? (
                    <>
                      <span className="text-[13px] text-muted">{formatDate(latestHub.updated_at)}</span>
                      <b className="text-[18px] leading-snug"><T id="members.new.hubs">Program hubs updated</T></b>
                      <span className="text-[14.5px] text-muted">{hubList.map((h) => h.title).join(' · ')}</span>
                      <Link to="/members/resources" className="font-bold text-brand-blue hover:underline text-[14.5px]"><T id="members.new.hubslink">Open the hubs →</T></Link>
                    </>
                  ) : (
                    <span className="text-[14.5px] text-muted"><T id="members.new.none">News and updates from the board show here.</T></span>
                  )}
                </div>

                <div className="card p-7 flex flex-col gap-3.5">
                  <p className={cardHead}><T id="members.listing.title">How you appear in the directory</T></p>
                  {profile?.show_in_directory !== false ? (
                    <>
                      <div className="rounded-xl border border-line bg-paper px-4 py-3.5 flex items-center gap-3.5">
                        <span className="flex-none w-11 h-11 rounded-full bg-ink text-brand-goldsoft grid place-items-center font-disp font-bold text-[17px]" aria-hidden>
                          {(profile?.full_name ?? firstName).split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <b className="block text-[16px]">
                            {profile?.full_name || 'Your name'}
                            {profile?.faemse_position && <span className={positionTag}>{profile.faemse_position}</span>}
                          </b>
                          <span className="text-[13.5px] text-muted">{[profile?.cert_level, profile?.agency, profile?.county].filter(Boolean).join(' · ') || 'Add your certification, agency and county'}</span>
                        </span>
                      </div>
                      <span className="text-[13.5px] text-muted">
                        <T id="members.listing.note">Only signed-in current members can see the directory, and it never shows your email or phone.</T>
                      </span>
                    </>
                  ) : (
                    <span className="text-[14.5px] text-muted"><T id="members.listing.off">You are not listed in the member directory.</T></span>
                  )}
                  <Link to="/members/account" className="font-bold text-brand-blue hover:underline text-[14.5px]">
                    <T id="members.listing.edit">Edit your listing →</T>
                  </Link>
                </div>
              </div>

              {foundation && (
                <FoundationBand title={foundation.title} body={foundation.body} url={foundation.linkUrl} label={foundation.linkLabel} kicker={foundation.kicker} />
              )}
            </div>
          )}

          {active === 'resources' && (
            <div className="flex flex-col gap-10">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
                  <h2 className="font-disp font-bold uppercase text-[30px]"><T id="members.res.hubs">Program hubs</T></h2>
                  <span className="text-muted text-[14.5px]"><T id="members.res.hubs.text">What each role requires under CoAEMSP and Florida rules, with the sources to check.</T></span>
                </div>
                {hubs.status === 'loading' && <p className="text-muted"><T id="members.res.loading">Loading…</T></p>}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {hubList.map((h) => (
                    <Link key={h.slug} to={`/hubs/${h.slug}`} className="card p-6 border-t-[3px] border-t-brand-gold/70 flex flex-col gap-2 hover:shadow-[0_24px_60px_rgba(10,33,59,.12)] transition-shadow">
                      <b className="text-[18px]">{h.title}</b>
                      {h.summary && <span className="text-muted text-[14px]">{h.summary}</span>}
                      <span className="text-[13.5px] font-bold text-brand-blue mt-auto"><T id="members.res.open">Open →</T></span>
                    </Link>
                  ))}
                </div>
              </div>

              {(qaPublished.length > 0 || videos.items.length > 0) && (
                <div className="grid md:grid-cols-2 gap-5">
                  {qaPublished.length > 0 && (
                    <Link to="/qa" className="card p-6 flex flex-col gap-1.5 hover:shadow-[0_24px_60px_rgba(10,33,59,.12)] transition-shadow">
                      <b className="font-disp font-bold uppercase text-[22px]"><T id="members.res.qa">Q&amp;A archive</T></b>
                      <span className="text-[13px] font-bold text-brand-goldink">{qaPublished.length} {qaPublished.length === 1 ? 'answer' : 'answers'}</span>
                      <span className="text-muted text-[14px]"><T id="members.res.qa.text">Real questions from Florida educators, answered once and kept.</T></span>
                    </Link>
                  )}
                  {videos.items.length > 0 && (
                    <Link to="/videos" className="card p-6 flex flex-col gap-1.5 hover:shadow-[0_24px_60px_rgba(10,33,59,.12)] transition-shadow">
                      <b className="font-disp font-bold uppercase text-[22px]"><T id="members.res.videos">Teaching videos</T></b>
                      <span className="text-[13px] font-bold text-brand-goldink">{videos.items.length} {videos.items.length === 1 ? 'video' : 'videos'}</span>
                      <span className="text-muted text-[14px]"><T id="members.res.videos.text">Short segments on the craft of teaching EMS.</T></span>
                    </Link>
                  )}
                </div>
              )}

              {library.items.length > 0 && (
                <div className="card p-8">
                  <h2 className="font-disp font-bold uppercase text-2xl mb-2"><T id="members.library.title">Member library</T></h2>
                  <p className="text-muted text-[14px] mb-5">
                    <T id="members.library.text">Documents and references shelved by the board — one library, organized by tag.</T>
                  </p>
                  <ul className="divide-y divide-line">
                    {library.items.map((r) => (
                      <li key={r.id} className="py-3.5">
                        <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-blue hover:underline text-[15px]">
                          {r.title} ↗
                        </a>
                        {r.description && <p className="text-[13.5px] text-muted mt-0.5">{r.description}</p>}
                        {r.tags.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {r.tags.map((t) => (
                              <i key={t} className="not-italic text-[11px] font-bold tracking-[0.08em] uppercase text-muted bg-paper px-2 py-0.5 rounded-full">
                                {t}
                              </i>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card p-8">
                <h2 className="font-disp font-bold uppercase text-2xl mb-5"><T id="members.shelf.title">The reference shelf</T></h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-7">
                  {resourceCategories.map((cat) => (
                    <div key={cat.category}>
                      <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-3">{cat.category}</h3>
                      <ul className="space-y-2 text-[14.5px]">
                        {cat.links.map((l) => (
                          <li key={l.name}>
                            <a href={l.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-blue hover:underline">
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
          )}

          {active === 'jobs' && (
            <JobsAndClasses jobs={jobsLive} classes={classesLive} />
          )}

          {active === 'account' && (
            <div className="flex flex-col gap-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card p-8 border-t-[3px] border-t-brand-gold/70" id="directory-listing">
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
                          <b className="block text-[14.5px]">
                            {d.full_name ?? 'Member'}
                            {d.faemse_position && <span className={positionTag}>{d.faemse_position}</span>}
                          </b>
                          <span className="text-[13px] text-muted">
                            {[d.cert_level, d.agency, d.county].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {!settingPassword && passwordCard}

              <div className="grid lg:grid-cols-2 gap-6">
                {(ownDues || payments.length > 0) && (
                  <div className="card p-8">
                    <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.dues.title">Membership dues</T></h2>
                    <p className="text-[15px] mb-2">
                      <T id="members.dues.tier">Your tier:</T> <b className="capitalize">{profile?.tier ?? 'active'}</b> · {dollars(dues)}{' '}
                      <T id="members.dues.peryear">a year</T>
                      {profile?.expires_at && (
                        <>
                          {' · '}
                          <T id="members.dues.through">paid through</T> <b>{formatDate(profile.expires_at)}</b>
                        </>
                      )}
                    </p>
                    <p className="text-muted text-[14px]">
                      <T id="members.dues.text">
                        Renewing extends your membership twelve months from your current paid-through date, so renewing
                        early never costs you time.
                      </T>
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
                )}

                {myOrgs.length > 0 && (
                  <div className="card p-8">
                    <h2 className="font-disp font-bold uppercase text-xl mb-2">
                      <T id="members.orgs.title">{myOrgs.length === 1 ? 'Your organization' : 'Your organizations'}</T>
                    </h2>
                    <p className="text-muted text-[14px] mb-4">
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
                            <span className="text-[11px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-full text-[#1A47B8] bg-[#E7EEFF]">{o.kind}</span>
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

                <div className="card p-8">
                  <h2 className="font-disp font-bold uppercase text-xl mb-2"><T id="members.bylaws.title">Bylaws</T></h2>
                  <p className="text-muted text-[14px] mb-4"><T id="members.bylaws.text">The complete, current bylaws of the association.</T></p>
                  <Link to="/bylaws" className="font-bold text-brand-blue hover:underline text-[14.5px]"><T id="members.bylaws.link">Read the bylaws →</T></Link>
                </div>
              </div>

              <button onClick={onSignOut} className="btn-outline self-start !py-2.5 !px-5 text-[14px]">
                <T id="members.signout">Sign out</T>
              </button>
            </div>
          )}

          {active === 'board' && isAdmin && <AdminWorkspace />}

          {!isMember && active !== 'account' && (
            <p className="mt-8 text-muted text-[14px]">
              <T id="members.limited">Member resources open when your membership is current.</T>
            </p>
          )}
        </div>
      </section>
    </>
  );
}

// The FAEMSE Foundation's scholarship slide, as a gold band on the portal's
// Home tab (board, 2026-10-20). It reads the same Spotlights row as the
// homepage slide, so the deadlines change in one place. Lines that start with
// "Deadline:" become the small date tags.
function FoundationBand({ kicker, title, body, url, label }: { kicker: string; title: string; body: string; url: string; label: string }) {
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const deadlines = paras.filter((p) => /^deadline:/i.test(p)).map((p) => {
    const m = p.match(/^deadline:\s*(.+?),\s*for\s+(?:the\s+)?(.+?)\.?$/i);
    return m ? { when: m[1], what: m[2] } : { when: p.replace(/^deadline:\s*/i, ''), what: '' };
  });
  const text = paras.filter((p) => !/^deadline:/i.test(p)).join(' ');
  return (
    <div className="rounded-[20px] p-8 md:px-9 flex flex-wrap items-center justify-between gap-x-8 gap-y-5 text-ink2 bg-[linear-gradient(120deg,#F8DC7A_0%,#EBBC42_50%,#C8961E_100%)] shadow-[0_18px_44px_rgba(177,133,22,.25)]">
      <div className="flex-[1_1_460px] min-w-0 flex flex-col gap-2">
        <span className="font-disp font-bold text-[14px] tracking-[0.22em] uppercase text-[#5A4206]">{kicker}</span>
        <b className="font-disp font-bold uppercase text-[clamp(28px,3.4vw,38px)] leading-none">{title.replace(/\.$/, '')}</b>
        {text && <span className="text-[15px] text-[#3A2B04]">{text}</span>}
        {deadlines.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-1">
            {deadlines.map((d) => (
              <span key={d.when} className="flex flex-col rounded-xl border border-ink2/20 bg-ink2/10 px-3.5 py-2">
                <b className="text-[14.5px]"><T id="members.foundation.deadline">Deadline</T> {d.when}</b>
                {d.what && <span className="text-[13px] text-[#3A2B04] first-letter:uppercase">{d.what}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="font-bold text-[15.5px] text-brand-goldsoft bg-ink rounded-full px-6 py-3.5 whitespace-nowrap hover:brightness-125">
          {label || 'Visit the Foundation'}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}

// Jobs and classes on one board with a filter (board, 2026-10-20). The tab
// shows only when something is posted.
function JobsAndClasses({ jobs, classes }: { jobs: JobItem[]; classes: ClassItem[] }) {
  const [show, setShow] = useState<'all' | 'jobs' | 'classes'>('all');
  const rows = [
    ...(show !== 'classes' ? jobs.map((j) => ({ kind: 'Job' as const, id: `j-${j.id ?? j.title}`, title: j.title, meta: [j.employer, j.location, `open until ${j.closes}`], text: j.description, link: j.applyUrl })) : []),
    ...(show !== 'jobs' ? classes.map((c) => ({ kind: 'Class' as const, id: `c-${c.id ?? c.title}`, title: c.title, meta: [c.provider, c.location, c.starts ? `starts ${c.starts}` : ''], text: c.description, link: '' })) : []),
  ];
  const pill = (key: typeof show, text: string) => (
    <button
      type="button"
      onClick={() => setShow(key)}
      aria-pressed={show === key}
      className={`px-4 py-2.5 rounded-full font-bold text-[14px] border min-h-[44px] ${show === key ? 'bg-ink text-white border-ink' : 'bg-white text-body border-line hover:border-ink'}`}
    >
      {text}
    </button>
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {pill('all', 'All')}
          {pill('jobs', `Jobs (${jobs.length})`)}
          {pill('classes', `Classes (${classes.length})`)}
        </div>
        <a href={mailto('Job%20or%20class%20posting')} className="font-bold text-brand-blue hover:underline text-[14.5px]">
          <T id="members.jobs.post">Post an opening or a class →</T>
        </a>
      </div>
      <ul className="card divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="px-6 py-5 flex flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`text-[11px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full ${r.kind === 'Job' ? 'text-[#1A47B8] bg-[#E7EEFF]' : 'text-brand-goldink bg-[#FBF3D9]'}`}>{r.kind}</span>
              <b className="text-[16px]">{r.title}</b>
            </span>
            <span className="text-muted text-[14px]">{r.meta.filter(Boolean).join(' · ')}</span>
            {r.text && <span className="text-[14.5px]">{r.text}</span>}
            {r.link && (
              <a href={r.link} target="_blank" rel="noreferrer" className="font-semibold text-brand-blue hover:underline text-[14px] self-start">
                <T id="members.jobs.apply">How to apply ↗</T>
              </a>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-6 py-5 text-muted text-[14.5px]"><T id="members.jobs.none">Nothing in this list right now.</T></li>}
      </ul>
    </div>
  );
}
