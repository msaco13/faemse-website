import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Seal from './Seal';
import { T, useText } from '../lib/text';

// Seven slots is all the 1180px wrap can fit (see the layout note below), so
// the header carries the pages people return to; Board, Sponsors, Classes,
// Videos, and the director guide stay one click away via the footer, About,
// and the pages that reference them.
const nav = [
  { to: '/about', label: 'About' },
  { to: '/membership', label: 'Membership' },
  { to: '/events', label: 'Events' },
  { to: '/news', label: 'News' },
  { to: '/qa', label: 'Q&A' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/resources', label: 'Resources' },
];

// The mobile menu has room for everything.
const mobileExtra = [
  { to: '/programs', label: 'Programs' },
  { to: '/videos', label: 'Teaching Videos' },
  { to: '/classes', label: 'Class Board' },
  { to: '/program-directors', label: 'Director Guide' },
  { to: '/board', label: 'Board' },
  { to: '/sponsors', label: 'Sponsors' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuOpen = useText('nav.menu.open', 'Open menu');
  const menuClose = useText('nav.menu.close', 'Close menu');

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

  return (
    <header
      className={`sticky top-0 z-50 bg-[rgba(7,26,50,.86)] backdrop-blur-xl border-b border-white/10 transition-shadow ${
        scrolled ? 'shadow-[0_12px_40px_rgba(4,10,22,.5)]' : ''
      }`}
    >
      <div className="wrap flex items-center justify-between h-20 gap-4">
        {/* No tagline here: the 1180px wrap leaves the lockup + nav + actions
            near-zero slack, and OS font-rendering differences push the tagline
            under the nav. The full name lives in the hero, footer, and titles. */}
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="FAEMSE home">
          {/* The seal is the one logo, here at 40px next to the wordmark. */}
          <Seal className="w-10 h-10 drop-shadow-[0_3px_10px_rgba(0,0,0,.45)]" />
          <span className="font-disp font-bold text-[26px] leading-none gold-text tracking-wide whitespace-nowrap">
            FAEMSE
          </span>
        </Link>

        <nav className="hidden xl:block" aria-label="Primary">
          <ul className="flex gap-6 font-semibold text-[15px]">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  className={({ isActive }) =>
                    `relative pb-1 transition-colors ${
                      isActive
                        ? 'text-white after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-brand-goldsoft after:to-brand-golddeep'
                        : 'text-[#D6E1F5]/90 hover:text-white'
                    }`
                  }
                >
                  <T id={`nav.${n.to.slice(1)}`}>{n.label}</T>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/contact" className="hidden xl:block font-semibold text-[15px] text-[#D6E1F5]/90 hover:text-white">
            <T id="nav.contact">Contact</T>
          </Link>
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
            <T id="nav.members">Members</T>
          </Link>
          <Link to="/membership" className="btn-red !px-4 sm:!px-5 !py-3">
            <span className="hidden sm:inline"><T id="nav.join">Join / Renew</T></span>
            <span className="sm:hidden"><T id="nav.join-short">Join</T></span>
          </Link>
          <button
            className="xl:hidden w-11 h-11 grid place-items-center rounded-lg hover:bg-white/10"
            aria-label={open ? menuClose : menuOpen}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
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
            {[...nav, ...mobileExtra, { to: '/contact', label: 'Contact' }, { to: '/login', label: 'Member Login' }].map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-semibold text-[#D6E1F5] border-b border-white/5"
                >
                  <T id={`nav.${n.to.slice(1)}`}>{n.label}</T>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
