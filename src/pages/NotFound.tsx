import { Link } from 'react-router-dom';
import Seal from '../components/Seal';

export default function NotFound() {
  return (
    <section className="bg-ink text-white min-h-[60vh] grid place-items-center text-center py-24">
      <div>
        <Seal className="w-20 h-20 mx-auto mb-6 opacity-90" />
        <h1 className="font-disp font-bold uppercase text-6xl mb-3">Lost signal</h1>
        <p className="text-[#BCCBE7] mb-7">That page doesn&apos;t exist — let&apos;s get you back on the board.</p>
        <Link to="/" className="btn-red">
          Back to home
        </Link>
      </div>
    </section>
  );
}
