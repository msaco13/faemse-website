// Shared matcher for the admin search boxes. Every word typed must appear
// somewhere in the record, in any order, ignoring case and accents, so
// "perez valencia" finds Ana Perez at Valencia College and "407" finds a
// phone number.

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const tokens = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalize(fields.map((f) => f ?? '').join(' '));
  return tokens.every((t) => hay.includes(t));
}
