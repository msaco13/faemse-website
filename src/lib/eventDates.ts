// The dates an event shows on the calendar and the "On the board" strip. An
// event with a last day after its first shows the whole range, such as
// "04–08 JAN 2027" for a conference (board, 2026-11-06). Tested in
// tests/eventDates.test.ts.

// Same short names as MONTHS in src/content/data.ts (eventDate() reads them
// back), kept here so the tests can load this file on its own.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type EventDates = {
  day: string; // first day, "04"
  month: string; // first month, "JAN"
  year: string; // first year, "2027"
  days: string; // "04" or "04–08"
  months: string; // "JAN" or "SEP–OCT"
  years: string; // "2027" or "2026–27"
  label: string; // in words, for screen readers: "January 4–8, 2027"
  lastDay: string; // YYYY-MM-DD: the event is upcoming until this day ends
};

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m: m - 1, d };
}

export function eventDates(startsOn: string, endsOn?: string | null): EventDates {
  const a = parts(startsOn);
  const two = (n: number) => String(n).padStart(2, '0');
  const single: EventDates = {
    day: two(a.d),
    month: MONTHS[a.m],
    year: String(a.y),
    days: two(a.d),
    months: MONTHS[a.m],
    years: String(a.y),
    label: `${LONG[a.m]} ${a.d}, ${a.y}`,
    lastDay: startsOn.slice(0, 10),
  };
  // No last day, a bad one, or one that isn't after the first: one day.
  if (!endsOn || !/^\d{4}-\d{2}-\d{2}/.test(endsOn) || endsOn.slice(0, 10) <= startsOn.slice(0, 10)) return single;
  const b = parts(endsOn);
  const sameYear = a.y === b.y;
  const sameMonth = sameYear && a.m === b.m;
  return {
    ...single,
    days: `${two(a.d)}–${two(b.d)}`,
    months: sameMonth ? MONTHS[a.m] : `${MONTHS[a.m]}–${MONTHS[b.m]}`,
    years: sameYear ? String(a.y) : `${a.y}–${String(b.y).slice(2)}`,
    label: sameMonth
      ? `${LONG[a.m]} ${a.d}–${b.d}, ${a.y}`
      : sameYear
        ? `${LONG[a.m]} ${a.d} – ${LONG[b.m]} ${b.d}, ${a.y}`
        : `${LONG[a.m]} ${a.d}, ${a.y} – ${LONG[b.m]} ${b.d}, ${b.y}`,
    lastDay: endsOn.slice(0, 10),
  };
}

// The problem with a range typed into Admin, or null. The last day is
// optional; when given it can't be before the first.
export function eventRangeProblem(startsOn: string, endsOn: string): string | null {
  if (!endsOn) return null;
  if (endsOn < startsOn) return 'The last day is before the first day.';
  return null;
}
