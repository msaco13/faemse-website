import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Seal from '../components/Seal';
import { T, useText } from '../lib/text';

export default function NotFound() {
  const docTitle = useText('notfound.doctitle', 'Page not found');
  useEffect(() => {
    document.title = `${docTitle} · FAEMSE`;
  }, [docTitle]);
  return (
    <section className="bg-ink text-white min-h-[60vh] grid place-items-center text-center py-24">
      <div>
        <Seal className="w-20 h-20 mx-auto mb-6 opacity-90" />
        <h1 className="font-disp font-bold uppercase text-6xl mb-3"><T id="notfound.h1">Lost signal</T></h1>
        <p className="text-[#BCCBE7] mb-7"><T id="notfound.text">That page doesn&apos;t exist — let&apos;s get you back on the board.</T></p>
        <Link to="/" className="btn-red">
          <T id="notfound.cta">Back to home</T>
        </Link>
      </div>
    </section>
  );
}
