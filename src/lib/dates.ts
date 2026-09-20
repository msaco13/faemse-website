// Calendar dates in the browser, as YYYY-MM-DD in the visitor's own timezone.
//
// `new Date().toISOString().slice(0, 10)` is the tempting way to write "today"
// and it is wrong here: toISOString() converts to UTC first, and Florida is
// four or five hours behind UTC. From about 8 pm Eastern the UTC date is
// already tomorrow, so an evening admin got tomorrow as the default posting
// date, "one year from today" landed a day late, and a listing that expires
// today vanished a few hours early for evening visitors. Postgres `date`
// columns carry no timezone, so the site should use the local calendar.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}
