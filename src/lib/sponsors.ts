// Initials for a sponsor with no logo on file. They stand where the logo
// would be, in the sponsor band and on the portal's sponsor wall, until a
// logo is uploaded in Admin → Sponsors (board, 2026-10-21).
//
// "Dinsch Consulting Group" → DCG, "Limmer Education" → LE. A first word
// with a digit in it is a name of its own ("3B Scientific" → 3B). Small
// words and company suffixes are skipped; four letters at most.

const SKIP = new Set(['of', 'the', 'and', 'for', 'inc', 'llc', 'co', 'corp']);

export function sponsorInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  if (/\d/.test(words[0])) return words[0].toUpperCase().slice(0, 4);
  const kept = words.filter((w) => !SKIP.has(w.toLowerCase()));
  return (kept.length ? kept : words)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}
