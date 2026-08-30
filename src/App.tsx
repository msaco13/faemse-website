import { useEffect } from 'react';
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
import NotFound from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
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
      <main id="main">
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
