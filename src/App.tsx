import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
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
