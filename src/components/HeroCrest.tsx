// The association's seal, ghosted at the center of the hero and turning slowly
// on its vertical axis like a coin on a table. Centered on the hero grid in
// Home.tsx, midway between the page margins. Screened onto the navy at 8% so
// only the gold ring and the blue emblem come through; 560px; one turn every
// 20 seconds (styles in index.css under "Hero crest"). Two faces back to back
// so the lettering reads the right way round on both halves of the turn.
//
// Purely decorative: hidden from assistive tech, never catches the pointer,
// still for reduced motion, off on phones (it would sit under the map), and
// it fades out with the map when a spotlight brings its own photo or clip.
export default function HeroCrest({ faded }: { faded: boolean }) {
  const src = `${import.meta.env.BASE_URL}seal-crest.webp`;
  return (
    <div aria-hidden className={`hero-crest${faded ? ' is-faded' : ''}`}>
      <div className="hero-crest-coin">
        <div className="hero-crest-face">
          <img src={src} alt="" decoding="async" />
        </div>
        <div className="hero-crest-face back">
          <img src={src} alt="" decoding="async" />
        </div>
      </div>
    </div>
  );
}
