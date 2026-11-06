// The Job board's three categories and the small rules the page and the
// Admin panel share (board, 2026-11-06). Tested in tests/jobs.test.ts.

export type JobCategory = 'fire_ems' | 'ems' | 'education';

export const JOB_CATEGORIES: { key: JobCategory; label: string; slug: string }[] = [
  { key: 'fire_ems', label: 'Fire/EMS', slug: 'fire-ems' },
  { key: 'ems', label: 'EMS', slug: 'ems' },
  { key: 'education', label: 'Education', slug: 'education' },
];

// A row from before the categories existed, or anything unexpected, counts as
// Education: that is what the board posted by hand before the sweep.
export function categoryOf(value: unknown): JobCategory {
  return value === 'fire_ems' || value === 'ems' || value === 'education' ? value : 'education';
}

export function categoryLabel(value: unknown): string {
  return JOB_CATEGORIES.find((c) => c.key === categoryOf(value))!.label;
}

// The ?type= in the Job board's address: fire-ems, ems or education; anything
// else shows all.
export function categoryFromSlug(slug: string | null): JobCategory | null {
  return JOB_CATEGORIES.find((c) => c.slug === slug)?.key ?? null;
}

export function countByCategory(items: { category?: unknown }[]): Record<JobCategory, number> {
  const counts: Record<JobCategory, number> = { fire_ems: 0, ems: 0, education: 0 };
  for (const i of items) counts[categoryOf(i.category)]++;
  return counts;
}

// New: posted or found in the last seven days (Florida dates, YYYY-MM-DD).
export function isNew(postedOn: string | undefined, today: string): boolean {
  if (!postedOn) return false;
  const days = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${postedOn.slice(0, 10)}T00:00:00Z`)) / 86_400_000;
  return days >= 0 && days < 7;
}

// The latest date the sweep checked any listing, or null if it posted none.
export function lastChecked(items: { source?: string; lastSeenOn?: string | null }[]): string | null {
  let best: string | null = null;
  for (const i of items) {
    if (i.source !== 'sweep' || !i.lastSeenOn) continue;
    const d = i.lastSeenOn.slice(0, 10);
    if (!best || d > best) best = d;
  }
  return best;
}
