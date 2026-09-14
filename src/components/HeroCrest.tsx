// The association's seal, ghosted at the center of the hero and turning slowly
// on its vertical axis like a coin on a table. Centered on the hero grid in
// Home.tsx, midway between the page margins. Screened onto the navy at 8% so
// only the gold ring and the blue emblem come through; 560px by default; one
// turn every 20 seconds (styles in index.css under "Hero crest"). Two faces
// back to back so the lettering reads the right way round on both halves of
// the turn.
//
// Purely decorative: hidden from assistive tech, never catches the pointer,
// still for reduced motion, off on phones (it would sit under the map), and
// it fades out with the map when a spotlight brings its own photo or clip.
//
// The board can resize or replace it (Board tools → edit mode): the crest
// is slot `hero.crest` in lib/media.tsx. Because it sits under the copy and
// ignores the pointer, edit mode shows a small "Edit hero crest" button at
// its center instead of making the crest itself clickable.
import { useMemo } from 'react';
import { useMedia, useMediaEditor } from '../lib/media';
import { useSiteText } from '../lib/text';
import { SEAL_LARGE } from './Seal';

const ID = 'hero.crest';

export default function HeroCrest({ faded }: { faded: boolean }) {
  const fallback = useMemo(() => ({ src: SEAL_LARGE, size: 560 }), []);
  const { src, size, custom } = useMedia(ID, fallback);
  const { editing } = useSiteText();
  const { openEditor } = useMediaEditor();
  return (
    <>
      <div
        aria-hidden
        className={`hero-crest${faded ? ' is-faded' : ''}`}
        style={{ width: size, height: size }}
      >
        <div className="hero-crest-coin">
          <div className="hero-crest-face">
            <img src={src} alt="" decoding="async" />
          </div>
          <div className="hero-crest-face back">
            <img src={src} alt="" decoding="async" />
          </div>
        </div>
      </div>
      {editing && (
        <button
          type="button"
          onClick={() => openEditor({ id: ID, fallback, label: 'Hero crest (spinning seal)', square: true })}
          className={`absolute left-1/2 top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed px-4 py-2 font-disp text-[12px] font-bold uppercase tracking-[0.16em] text-ink2 shadow-[0_10px_30px_rgba(4,10,22,.5)] md:block ${
            custom ? 'border-[#3ADB8F] bg-[#3ADB8F]' : 'border-[#F5CE5A] bg-[#F5CE5A]'
          }`}
        >
          Edit hero crest
        </button>
      )}
    </>
  );
}
