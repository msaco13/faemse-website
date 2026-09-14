// The association seal — the site's one logo, everywhere it appears: header
// and footer lockups, the login and 404 pages, the honors band, the About
// heritage strip, the final CTA. The source render is brand/seal-3d.webp;
// the site serves circular crops of it with nothing outside the gold ring.
//
// Two sizes so a 40px header mark does not download an 800px file:
//   public/seal-192.webp  (chrome and anything up to ~96px)
//   public/seal-crest.webp (800px: heritage strip, final CTA, the hero
//                          crest in HeroCrest.tsx)
// The ring lettering is not legible below ~120px; that is expected for the
// small placements, where the ring, the star, and the state carry the mark.
//
// Every placement is a named slot the board can resize or replace from the
// Board tools bar (lib/media.tsx): `slot` becomes the key `media.seal.<slot>`.
// `size` is the default width in px; the board's saved size wins over it.
import { Pic } from '../lib/media';

export const SEAL_SMALL = `${import.meta.env.BASE_URL}seal-192.webp`;
export const SEAL_LARGE = `${import.meta.env.BASE_URL}seal-crest.webp`;

export default function Seal({
  slot,
  size,
  label,
  className = '',
  alt = '',
}: {
  slot: string;
  size: number;
  label?: string;
  className?: string;
  alt?: string;
}) {
  return (
    <Pic
      id={`seal.${slot}`}
      label={label ?? `Seal (${slot})`}
      src={SEAL_SMALL}
      srcLarge={SEAL_LARGE}
      largeAbove={96}
      size={size}
      square
      alt={alt}
      className={className}
    />
  );
}
