import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Seal from './Seal';
import { useHasNews } from '../lib/content';
import { supabase } from '../lib/supabase';
import { T, useText } from '../lib/text';
import { useMemberStatus } from '../lib/useMemberStatus';

// One header, two states (board, 2026-10-20). Members-only features (the
// hubs, Q&A, jobs, resources) no longer sit in the menu as locked tabs: they
// live in the member portal, and visitors learn about them from the homepage's
// member benefits slide.
//
// Visitors:  Membership · Events · News · Program map · Foundation · About,
//            then Contact, Member sign in and Join on the right.
// Members:   the same without Membership; "My portal" and Sign out replace
//            sign-in and Join. Someone signed in whose membership has lapsed
//            keeps Membership and gets a Renew button.
// News shows only once a post exists. Foundation is the one link that leaves
// the site (its own 501(c)(3), its own website): plain label, no arrow, new
// tab. About sits last (board request, 2026-10-13).
type NavItem = { to: string; label: string; textId: string; external?: boolean };
const FOUNDATION_URL = 'https://www.faemsefoundation.org';

function navFor(member: boolean, hasNews: boolean): NavItem[] {
  return [
    ...(member ? [] : [{ to: '/membership', label: 'Membership', textId: 'membership' }]),
    { to: '/events', label: 'Events', textId: 'events' },
    ...(hasNews ? [{ to: '/news', label: 'News', textId: 'news' }] : []),
    { to: '/programs', label: 'Program map', textId: 'programs' },
    { to: FOUNDATION_URL, label: 'Foundation', textId: 'foundation', external: true },
    { to: '/about', label: 'About', textId: 'about' },
  ];
}

function initials(name: string): string {
  const words = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '·';
}

async function signOut() {
  try {
    // Local scope: this browser only, not the member's other devices.
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* the full page load below resets state anyway */
  }
  window.location.assign(import.meta.env.BASE_URL);
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuOpen = useText('nav.menu.open', 'Open menu');
  const menuClose = useText('nav.menu.close', 'Close menu');
  const portalAria = useText('nav.portal.aria', 'My portal');
  const status = useMemberStatus();
  const hasNews = useHasNews();
  const member = status.current;
  const items = navFor(member, hasNews);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    `relative pb-1 transition-colors ${
      isActive
        ? 'text-white after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-brand-goldsoft after:to-brand-golddeep'
        : 'text-[#D6E1F5]/90 hover:text-white'
    }`;

  const portalPill = (compact: boolean) => (
    <Link
      to="/members"
      aria-label={compact ? portalAria : undefined}
      className={`flex items-center gap-2.5 rounded-full font-bold text-[15px] text-ink2 bg-gradient-to-br from-brand-goldsoft to-[#C8961E] shadow-[0_10px_26px_rgba(223,175,55,.3)] hover:brightness-105 ${
        compact ? 'p-1.5' : 'py-1.5 pl-1.5 pr-4'
      }`}
    >
      <span className="w-8 h-8 rounded-full bg-ink grid place-items-center font-disp text-[15px] text-brand-goldsoft" aria-hidden>
        {initials(status.name)}
      </span>
      {!compact && <T id="nav.portal">My portal</T>}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-50 bg-[rgba(7,26,50,.86)] backdrop-blur-xl border-b border-white/10 transition-shadow ${
        scrolled ? 'shadow-[0_12px_40px_rgba(4,10,22,.5)]' : ''
      }`}
    >
      <div className="wrap flex items-center justify-between h-20 gap-4">
        {/* No tagline here: the 1180px wrap leaves the lockup + nav + actions
            little slack. The full name lives in the hero, footer, and titles. */}
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="FAEMSE home">
          {/* The seal is the one logo, here at 40px next to the wordmark. */}
          <Seal slot="header" label="Header logo" size={40} className="drop-shadow-[0_3px_10px_rgba(0,0,0,.45)]" />
          <span className="font-disp font-bold text-[26px] leading-none text-white tracking-wide whitespace-nowrap">
            FA<b className="gold-text">EMS</b>E
          </span>
        </Link>

        <nav className="hidden xl:block" aria-label="Primary">
          <ul className="flex gap-5 2xl:gap-7 font-semibold text-[15px] whitespace-nowrap">
            {items.map((n) => (
              <li key={n.to}>
                {n.external ? (
                  <a href={n.to} target="_blank" rel="noreferrer" className="relative pb-1 transition-colors text-[#D6E1F5]/90 hover:text-white">
                    <T id={`nav.${n.textId}`}>{n.label}</T>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <NavLink to={n.to} className={navLinkCls}>
                    <T id={`nav.${n.textId}`}>{n.label}</T>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/contact" className="hidden xl:block font-semibold text-[15px] text-[#D6E1F5]/90 hover:text-white">
            <T id="nav.contact">Contact</T>
          </Link>
          {status.signedIn ? (
            <>
              <span className="hidden xl:block">{portalPill(false)}</span>
              <span className="xl:hidden">{portalPill(true)}</span>
              {member ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="hidden xl:block font-semibold text-[14px] text-[#D6E1F5] border-[1.5px] border-white/25 rounded-full px-4 py-2.5 hover:text-white hover:border-white/50"
                >
                  <T id="nav.signout">Sign out</T>
                </button>
              ) : (
                <Link to="/members" className="btn-red !px-4 sm:!px-5 !py-3">
                  <T id="nav.renew">Renew</T>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden xl:flex items-center gap-1.5 font-semibold text-[15px] text-brand-goldsoft hover:text-white"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.1c-3.6 0-7.2 1.8-7.2 4.5v1.8h14.4v-1.8c0-2.7-3.6-4.5-7.2-4.5Z"
                    fill="currentColor"
                  />
                </svg>
                <T id="nav.members">Member sign in</T>
              </Link>
              <Link to="/membership" className="btn-red !px-4 sm:!px-5 !py-3">
                <T id="nav.join">Join</T>
              </Link>
            </>
          )}
          <button
            className="xl:hidden w-11 h-11 grid place-items-center rounded-lg hover:bg-white/10"
            aria-label={open ? menuClose : menuOpen}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6.5h18M3 12h18M3 17.5h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="gold-braid opacity-60" aria-hidden />

      {open && (
        <div className="xl:hidden border-t border-white/10 bg-ink2">
          <ul className="px-6 py-3">
            {[...items, { to: '/contact', label: 'Contact', textId: 'contact' } as NavItem].map((n) => (
              <li key={n.to}>
                {n.external ? (
                  <a
                    href={n.to}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className="block py-3 font-semibold text-[#D6E1F5] border-b border-white/5"
                  >
                    <T id={`nav.${n.textId}`}>{n.label}</T>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <NavLink
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="block py-3 font-semibold text-[#D6E1F5] border-b border-white/5"
                  >
                    <T id={`nav.${n.textId}`}>{n.label}</T>
                  </NavLink>
                )}
              </li>
            ))}
            {status.signedIn ? (
              <>
                <li>
                  <NavLink to="/members" onClick={() => setOpen(false)} className="block py-3 font-bold text-brand-goldsoft border-b border-white/5">
                    <T id="nav.portal">My portal</T>
                  </NavLink>
                </li>
                <li>
                  <button type="button" onClick={signOut} className="block w-full text-left py-3 font-semibold text-[#D6E1F5]">
                    <T id="nav.signout">Sign out</T>
                  </button>
                </li>
              </>
            ) : (
              <li>
                <NavLink to="/login" onClick={() => setOpen(false)} className="block py-3 font-bold text-brand-goldsoft">
                  <T id="nav.members">Member sign in</T>
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
