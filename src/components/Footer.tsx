import { Link } from 'react-router-dom';
import Mark from './Mark';
import { contact } from '../content/data';

export default function Footer() {
  return (
    <footer className="bg-ink2 text-[#93A6C9] text-[14.5px] pb-8">
      <div className="gold-braid opacity-70" aria-hidden />
      <div className="wrap pt-16">
        <div className="grid gap-9 pb-11 border-b border-white/10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr]">
          <div>
            <Link to="/" className="flex items-center gap-3" aria-label="FAEMSE home">
              <Mark variant="gold" className="w-10 h-10" />
              <span className="font-disp font-bold text-[26px] text-white tracking-wide">
                FA<b className="text-brand-bluesoft">EMS</b>E
              </span>
            </Link>
            <p className="mt-4 max-w-[300px] text-[#7C90B6]">
              The {contact.legalName} — a {contact.taxStatus} fostering excellence in EMS education
              and training.
            </p>
            <div className="flex gap-2.5 mt-4">
              <a
                href={contact.facebook}
                aria-label="Facebook"
                className="w-11 h-11 rounded-xl bg-white/5 grid place-items-center hover:bg-brand-golddeep transition-colors"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                  <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-2.9h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6v1.9h2.8L16 14.9h-2.4v7A10 10 0 0 0 22 12z" />
                </svg>
              </a>
              <a
                href={contact.linkedin}
                aria-label="LinkedIn"
                className="w-11 h-11 rounded-xl bg-white/5 grid place-items-center hover:bg-brand-golddeep transition-colors"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                  <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0zM0 8h5v16H0V8zm7.5 0H12v2.2h.1c.6-1.1 2.1-2.3 4.3-2.3 4.6 0 5.5 3 5.5 6.9V24h-5v-7.3c0-1.7 0-4-2.4-4s-2.8 1.9-2.8 3.8V24H7.5V8z" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h5 className="font-disp font-semibold text-white text-[15px] tracking-[0.2em] uppercase mb-4">
              Association
            </h5>
            <ul className="space-y-2.5">
              <li><Link className="hover:text-white" to="/about">About FAEMSE</Link></li>
              <li><Link className="hover:text-white" to="/board">Board of Directors</Link></li>
              <li><Link className="hover:text-white" to="/bylaws">Bylaws &amp; elections</Link></li>
              <li><Link className="hover:text-white" to="/sponsors">Sponsors</Link></li>
              <li>
                <a className="hover:text-white" href="https://www.faemsefoundation.org" target="_blank" rel="noreferrer">
                  Foundation ↗
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-disp font-semibold text-white text-[15px] tracking-[0.2em] uppercase mb-4">
              For educators
            </h5>
            <ul className="space-y-2.5">
              <li><Link className="hover:text-white" to="/qa">Q&amp;A archive</Link></li>
              <li><Link className="hover:text-white" to="/videos">Teaching videos</Link></li>
              <li><Link className="hover:text-white" to="/jobs">Job board</Link></li>
              <li><Link className="hover:text-white" to="/classes">Class board</Link></li>
              <li><Link className="hover:text-white" to="/program-directors">Director guide</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-disp font-semibold text-white text-[15px] tracking-[0.2em] uppercase mb-4">
              Get in touch
            </h5>
            <p className="text-[#7C90B6] mb-2">{contact.address}</p>
            <a className="text-brand-bluesoft hover:text-white font-semibold" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 pt-6 text-[13px] text-[#5E739C]">
          <span>
            © {new Date().getFullYear()} {contact.legalName} · St. Petersburg, FL
          </span>
          <span>
            <Link className="hover:text-white" to="/privacy">Privacy</Link>
            {' · '}
            <Link className="hover:text-white" to="/terms">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
