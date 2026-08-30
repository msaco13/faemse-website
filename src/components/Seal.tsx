// The association seal, textless variant — the site's identity mark.
// Ring lettering is omitted below display sizes where it would blur;
// the full lettered seal (public/seal.svg) is for large, formal placements.
export default function Seal({ className = '', alt = '' }: { className?: string; alt?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}seal-mark.svg`}
      alt={alt}
      aria-hidden={alt === '' || undefined}
      className={className}
    />
  );
}
