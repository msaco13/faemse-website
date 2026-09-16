// Reading a pasted member roster.
//
// Pure functions, no React and no network, so the board's paste can be tested
// directly. Two ways in:
//
//   * With a header row — the old system's CSV export. Columns are found by
//     their names ("Email", "Renewal due", "Membership level", …).
//   * Without one — someone typing a person by hand, or copying a couple of
//     cells out of a spreadsheet. Each value is then identified by what it
//     looks like: an email is the thing with an @ in it, a date is the thing
//     shaped like a date, and whatever is left over is the name.
//
// The second path exists because "email, name, date" on one line is what a
// person naturally types, and refusing it is the sort of thing that makes
// software feel broken.

export type ImportRow = {
  email: string;
  full_name: string;
  tier: string;
  expires_at: string;
  county: string;
  agency: string;
  cert_level: string;
};

export type ParsedRoster = { rows: ImportRow[]; columns: string[]; problems: string[] };

const EMAIL_CELL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIER_CELL = /^(active|institutional|corporate|honorary|life|sponsor)\b/i;

/** A small CSV/TSV reader: quoted fields, embedded commas and quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === '\t') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

function findCol(headers: string[], ...patterns: RegExp[]): number {
  for (const p of patterns) {
    const i = headers.findIndex((h) => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

export function normTier(v: string): string {
  const s = v.toLowerCase();
  if (!s.trim()) return '';
  if (s.includes('instit')) return 'institutional';
  if (s.includes('corp') || s.includes('sponsor')) return 'corporate';
  if (s.includes('honor') || s.includes('life')) return 'honorary';
  return 'active';
}

export function normDate(v: string): string {
  const s = v.trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  // "June 30, 2027" and friends. Parsed as noon UTC so a timezone shift can
  // never roll the date back a day.
  const d = new Date(`${s} 12:00:00 UTC`);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

/**
 * Does this cell read as a date a person would type? Deliberately strict: a
 * bare name must never be mistaken for one.
 */
export function isDateish(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return true;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b[^]*\d{4}/i.test(s)) return true;
  return false;
}

const MONTH_NAME = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;
const YEAR_ONLY = /^(19|20)\d{2}$/;

/**
 * "June 30, 2027" is how a person writes a date, and the comma in it splits
 * the value in two on the way in. Put those halves back together: a cell
 * holding a month name and a day number, followed by a cell holding nothing
 * but a year. A name like "May Marcher" carries no digit, so it is never
 * glued to the year beside it.
 */
function coalesceSplitDates(cells: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const next = cells[i + 1];
    if (next && YEAR_ONLY.test(next) && MONTH_NAME.test(cell) && /\d/.test(cell)) {
      out.push(`${cell} ${next}`);
      i++;
    } else out.push(cell);
  }
  return out;
}

/** No header row: identify each value by its own content. */
function rowsByContent(table: string[][]): ParsedRoster {
  const rows: ImportRow[] = table.map((r) => {
    const cells = coalesceSplitDates(r.map((c) => c.trim()).filter((c) => c !== ''));
    const email = cells.find((c) => EMAIL_CELL.test(c)) ?? '';
    const tierCell = cells.find((c) => c !== email && TIER_CELL.test(c));
    const dateCell = cells.find((c) => c !== email && c !== tierCell && isDateish(c));
    const name = cells.filter((c) => c !== email && c !== tierCell && c !== dateCell).join(' ').trim();
    return {
      email,
      full_name: name,
      tier: tierCell ? normTier(tierCell) : '',
      expires_at: dateCell ? normDate(dateCell) : '',
      county: '',
      agency: '',
      cert_level: '',
    };
  });
  const problems: string[] = [];
  if (rows.some((r) => !r.email)) problems.push('Some lines have no email address on them. Those lines will be skipped.');
  if (rows.every((r) => !r.expires_at)) {
    problems.push('No paid-through dates found. Everyone will be added without one, which you can set on their row afterwards.');
  }
  return { rows, columns: ['No header row, so each value was matched by what it looks like.'], problems };
}

export function toRows(text: string): ParsedRoster {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], columns: [], problems: ['Nothing to read yet.'] };
  // A first row carrying an email address is data, not headers.
  if (table[0].some((c) => EMAIL_CELL.test(c.trim()))) return rowsByContent(table);
  if (table.length < 2) {
    return { rows: [], columns: [], problems: ['Add at least one person under the header row, or paste the people on their own without headers.'] };
  }

  const headers = table[0].map((h) => h.trim().toLowerCase());
  const email = findCol(headers, /^e-?mail/, /e-?mail/);
  const full = findCol(headers, /^(full )?name$/, /^member name/, /^contact/);
  const first = findCol(headers, /first/);
  const last = findCol(headers, /last|surname/);
  const tier = findCol(headers, /tier|level|membership (type|class)|^type$|category/);
  const exp = findCol(headers, /expir/, /renewal due|renew/, /paid.?through|through/, /valid until|end date|due/);
  const county = findCol(headers, /county/);
  const agency = findCol(headers, /agency|organi[sz]ation|employer|program|school|college|company/);
  const cert = findCol(headers, /cert|credential|license/);

  const problems: string[] = [];
  if (email < 0) problems.push('No email column found (a header containing "email").');
  if (full < 0 && first < 0) problems.push('No name column found ("Name", or "First"/"Last").');
  if (exp < 0) problems.push('No paid-through column found ("Expires", "Renewal due", "Paid through"). People will be added without a date.');

  const rows: ImportRow[] = table.slice(1).map((r) => ({
    email: (r[email] ?? '').trim(),
    full_name: full >= 0 ? (r[full] ?? '').trim() : [r[first], r[last]].filter(Boolean).join(' ').trim(),
    tier: tier >= 0 ? normTier(r[tier] ?? '') : '',
    expires_at: exp >= 0 ? normDate(r[exp] ?? '') : '',
    county: county >= 0 ? (r[county] ?? '').trim() : '',
    agency: agency >= 0 ? (r[agency] ?? '').trim() : '',
    cert_level: cert >= 0 ? (r[cert] ?? '').trim() : '',
  }));

  const columns = [
    email >= 0 && `email ← "${table[0][email]}"`,
    full >= 0 ? `name ← "${table[0][full]}"` : first >= 0 && `name ← "${table[0][first]}" + "${table[0][last] ?? ''}"`,
    tier >= 0 && `tier ← "${table[0][tier]}"`,
    exp >= 0 && `paid through ← "${table[0][exp]}"`,
    county >= 0 && `county ← "${table[0][county]}"`,
    agency >= 0 && `agency ← "${table[0][agency]}"`,
    cert >= 0 && `certification ← "${table[0][cert]}"`,
  ].filter(Boolean) as string[];

  return { rows, columns, problems };
}
