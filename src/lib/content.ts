// Live site content (events + news) from Supabase, with the bundled samples
// as a fallback so the public site never renders empty or breaks when the
// tables are missing, unreachable, or not yet populated.

import { useEffect, useState } from 'react';
import { events as sampleEvents, eventDate, news as sampleNews, MONTHS } from '../content/data';
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

export async function fetchSiteEvents(): Promise<{ items: EventItem[]; live: boolean }> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('events').select('*').order('starts_on', { ascending: true }),
    );
    if (!error && data && data.length > 0) return { items: data.map(toEventItem), live: true };
  } catch {
    /* fall back below */
  }
  return { items: sampleEvents, live: false };
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

export function useSiteEvents(): Loaded<EventItem> {
  const [state, setState] = useState<Loaded<EventItem>>({ items: [], live: false, loaded: false });
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
