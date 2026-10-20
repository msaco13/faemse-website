// Live site content (events + news) from Supabase. News falls back to the
// bundled samples (the public pages show real posts only); the calendar falls
// back to the visitor's last saved copy of the real one, never to samples.

import { useEffect, useState } from 'react';
import { eventDate, news as sampleNews, MONTHS } from '../content/data';
import { supabase } from './supabase';

export type EventItem = {
  id?: string;
  day: string;
  month: string;
  year: string;
  title: string;
  detail: string;
  location: string;
  tag: string;
  tagColor: string;
  url: string;
};

export type NewsItem = {
  id?: string;
  date: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
};

type Loaded<T> = { items: T[]; live: boolean; loaded: boolean };

// The calendar. When the database can't be reached, `down` is set and the
// items are the saved copy from `savedAt` (empty if this browser has none).
export type SiteEvents = Loaded<EventItem> & { down: boolean; savedAt: string | null };

// A hung network call must not blank the public site — race the fetch.
function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

function toEventItem(r: { id: string; starts_on: string; title: string; detail: string; location: string; tag: string; tag_color: string; url?: string | null }): EventItem {
  const d = new Date(`${r.starts_on.slice(0, 10)}T00:00:00`);
  return {
    id: r.id,
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS[d.getMonth()],
    year: String(d.getFullYear()),
    title: r.title,
    detail: r.detail,
    location: r.location,
    tag: r.tag,
    tagColor: r.tag_color,
    url: r.url ?? '',
  };
}

function toNewsItem(r: { id: string; published_on: string; tag: string; title: string; excerpt: string; body?: string | null }): NewsItem {
  const d = new Date(`${r.published_on.slice(0, 10)}T00:00:00`);
  return {
    id: r.id,
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    tag: r.tag,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body ?? '',
  };
}

// Every good read of the calendar is kept in this browser, so an outage shows
// the real calendar as last seen, with its date, rather than nothing.
const EVENTS_KEY = 'faemse:events';
type EventRow = Parameters<typeof toEventItem>[0];

function saveEvents(rows: EventRow[]) {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify({ savedAt: new Date().toISOString(), rows }));
  } catch {
    /* storage blocked: fine */
  }
}

function savedEvents(): { savedAt: string; rows: EventRow[] } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(EVENTS_KEY) ?? 'null');
    return saved && typeof saved.savedAt === 'string' && Array.isArray(saved.rows) ? saved : null;
  } catch {
    return null;
  }
}

export async function fetchSiteEvents(): Promise<Omit<SiteEvents, 'loaded'>> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('events').select('*').order('starts_on', { ascending: true }),
    );
    if (!error && data) {
      saveEvents(data);
      return { items: data.map(toEventItem), live: true, down: false, savedAt: null };
    }
  } catch {
    /* fall back below */
  }
  const saved = savedEvents();
  try {
    return { items: saved ? saved.rows.map(toEventItem) : [], live: false, down: true, savedAt: saved?.savedAt ?? null };
  } catch {
    return { items: [], live: false, down: true, savedAt: null };
  }
}

export async function fetchSiteNews(): Promise<{ items: NewsItem[]; live: boolean }> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('news_posts').select('*').order('published_on', { ascending: false }),
    );
    if (!error && data && data.length > 0) return { items: data.map(toNewsItem), live: true };
  } catch {
    /* fall back below */
  }
  return { items: sampleNews, live: false };
}

// Whether any news is posted. The header and footer show "News" only once
// there is something to read (board, 2026-10-20). One count per page load,
// shared by every caller, and the last answer remembered per browser so the
// menu doesn't change shape a moment after it first draws.
const HAS_NEWS_KEY = 'faemse:has-news';
let hasNewsPromise: Promise<boolean> | null = null;
function fetchHasNews(): Promise<boolean> {
  hasNewsPromise ??= (async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('news_posts').select('id').limit(1),
      );
      const has = !error && (data?.length ?? 0) > 0;
      try {
        localStorage.setItem(HAS_NEWS_KEY, has ? '1' : '0');
      } catch {
        /* storage blocked: fine */
      }
      return has;
    } catch {
      return false;
    }
  })();
  return hasNewsPromise;
}

export function useHasNews(): boolean {
  const [has, setHas] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HAS_NEWS_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let on = true;
    fetchHasNews().then((h) => on && setHas(h));
    return () => {
      on = false;
    };
  }, []);
  return has;
}

export function useSiteEvents(): SiteEvents {
  const [state, setState] = useState<SiteEvents>({ items: [], live: false, loaded: false, down: false, savedAt: null });
  useEffect(() => {
    let on = true;
    fetchSiteEvents().then((r) => on && setState({ ...r, loaded: true }));
    return () => {
      on = false;
    };
  }, []);
  return state;
}

export function useSiteNews(): Loaded<NewsItem> {
  const [state, setState] = useState<Loaded<NewsItem>>({ items: [], live: false, loaded: false });
  useEffect(() => {
    let on = true;
    fetchSiteNews().then((r) => on && setState({ ...r, loaded: true }));
    return () => {
      on = false;
    };
  }, []);
  return state;
}

export function splitEvents(items: EventItem[]): { upcoming: EventItem[]; past: EventItem[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    upcoming: items.filter((e) => eventDate(e) >= today).sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime()),
    past: items.filter((e) => eventDate(e) < today).sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime()),
  };
}
