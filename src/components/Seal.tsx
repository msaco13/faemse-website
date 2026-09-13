// The association seal — the site's one logo, everywhere it appears: header
// and footer lockups, the login and 404 pages, the honors band, the About
// heritage strip, the final CTA. The source render is brand/seal-3d.webp;
// the site serves circular crops of it with nothing outside the gold ring.
//
// Two sizes so a 40px header mark does not download an 800px file:
//   default  public/seal-192.webp  (chrome and anything up to ~96px)
//   large    public/seal-crest.webp (800px: heritage strip, final CTA, the
//            hero crest in HeroCrest.tsx)
// The ring lettering is not legible below ~120px; that is expected for the
// small placements, where the ring, the star, and the state carry the mark.
export default function Seal({
  className = '',
  alt = '',
  large = false,
}: {
  className?: string;
  alt?: string;
  large?: boolean;
}) {
  const file = large ? 'seal-crest.webp' : 'seal-192.webp';
  return (
    <img
      src={`${import.meta.env.BASE_URL}${file}`}
      alt={alt}
      aria-hidden={alt === '' || undefined}
      decoding="async"
      className={className}
    />
  );
}
