import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Mark from './Mark';

const nav = [
  { to: '/about', label: 'About' },
  { to: '/board', label: 'Board' },
  { to: '/membership', label: 'Membership' },
  { to: '/events', label: 'Events' },
  { to: '/news', label: 'News' },
  { to: '/resources', label: 'Resources' },
  { to: '/sponsors', label: 'Sponsors' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-[rgba(8,20,42,.85)] backdrop-blur-xl border-b border-white/10 transition-shadow ${
        scrolled ? 'shadow-[0_12px_40px_rgba(4,10,22,.5)]' : ''
      }`}
    >
      <div className="wrap flex items-center justify-between h-20 gap-4">
        <Link to="/" className="flex items-center gap-3" aria-label="FAEMSE home">
          <Mark className="w-11 h-11 drop-shadow-[0_4px_14px_rgba(47,107,255,.45)]" />
          <span>
            <span className="font-disp font-bold text-[26px] leading-none text-white tracking-wide">
              FA<b className="text-brand-bluesoft">EMSE</b>
            </span>
            <small className="hidden sm:block text-[9.5px] font-semibold tracking-[0.16em] text-[#7C90B6] uppercase mt-1">
              Florida Association of EMS Educators
            </small>
          </span>
        </Link>

        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex gap-6 font-semibold text-[15px]">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  className={({ isActive }) =>
                    `transition-colors ${isActive ? 'text-white' : 'text-[#D6E1F5]/90 hover:text-white'}`
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/contact" className="hidden lg:block font-semibold text-[15px] text-[#93A6C9] hover:text-white">
            Contact
          </Link>
          <Link to="/membership" className="btn-red !px-5 !py-3">
            Join / Renew
          </Link>
          <button
            className="lg:hidden w-11 h-11 grid place-items-center rounded-lg hover:bg-white/10"
            aria-label={open ? 'Close menu' : 'Open menu'}
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

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-ink2">
          <ul className="px-6 py-3">
            {[...nav, { to: '/contact', label: 'Contact' }].map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-semibold text-[#D6E1F5] border-b border-white/5"
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
