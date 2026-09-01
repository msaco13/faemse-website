import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Board from './pages/Board';
import Bylaws from './pages/Bylaws';
import Membership from './pages/Membership';
import Events from './pages/Events';
import News from './pages/News';
import Resources from './pages/Resources';
import Sponsors from './pages/Sponsors';
import Jobs from './pages/Jobs';
import Classes from './pages/Classes';
import QandA from './pages/QandA';
import Videos from './pages/Videos';
import DirectorGuide from './pages/DirectorGuide';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Members from './pages/Members';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);
  useEffect(() => {
    // Braced body on purpose: a concise arrow would return scrollTo's result,
    // and browser extensions that wrap window.scrollTo can make that a truthy
    // non-function — which React would then invoke as an effect cleanup on the
    // next navigation and crash ("TypeError: r is not a function").
    window.scrollTo(0, 0);
    // Move keyboard focus to the new page's content (skip the initial load so
    // the browser's default focus behavior is preserved).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      document.getElementById('main')?.focus({ preventScroll: true });
    } catch {
      /* focus is an enhancement; never let it break navigation */
    }
  }, [pathname]);
  return null;
}

function RecoveryRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    // Password-reset emails land on the site root (the allow-listed redirect);
    // supabase-js consumes the token from the URL hash and fires this event.
    // Send the member straight to the portal's "Set a new password" card.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/members');
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  return null;
}

function CanonicalUrl() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Origin-relative so the tags stay correct after the faemse.org cutover.
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    const href = `${window.location.origin}${base}${pathname === '/' ? '/' : pathname}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = href;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', href);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-ink focus:font-bold focus:px-5 focus:py-3 focus:rounded-xl focus:shadow-xl"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <CanonicalUrl />
      <RecoveryRedirect />
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/board" element={<Board />} />
          <Route path="/bylaws" element={<Bylaws />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/events" element={<Events />} />
          <Route path="/news" element={<News />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/sponsors" element={<Sponsors />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/qa" element={<QandA />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/program-directors" element={<DirectorGuide />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/members" element={<Members />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
