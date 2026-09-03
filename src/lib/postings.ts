// Live postings (jobs, classes, Q&A, teaching videos, member library) from
// Supabase, with bundled samples as fallback — same contract as lib/content.ts:
// the public site never renders empty or breaks when tables are missing,
// unreachable, or not yet populated.

import { useEffect, useState } from 'react';
import { fallbackSpotlights, sampleClasses, sampleJobs, sampleQa, sampleVideos } from '../content/data';
import { supabase } from './supabase';

export type JobItem = {
  id?: string;
  posted: string;
  closes: string;
  title: string;
  employer: string;
  location: string;
  description: string;
  applyUrl: string;
};

export type ClassItem = {
  id?: string;
  posted: string;
  starts: string;
  closes: string;
  title: string;
  provider: string;
  location: string;
  description: string;
  contact: string;
};

// Public index row: question only. Members load full entries with answers.
export type QaIndexItem = {
  id?: string;
  date: string;
  topic: string;
  question: string;
  answer?: string;
  published?: boolean;
};

export type Spotlight = {
  id?: string;
  kicker: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  linkLabel: string;
};

export type VideoIndexItem = {
  id?: string;
  topic: string;
  title: string;
  presenter: string;
  minutes: number | null;
  videoUrl?: string;
  description?: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  tags: string[];
  description: string;
  url: string;
};

export type Loaded<T> = { items: T[]; live: boolean; loaded: boolean };

function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

function longDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function monthYear(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

function useLoaded<T>(fetcher: () => Promise<{ items: T[]; live: boolean }>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ items: [], live: false, loaded: false });
  useEffect(() => {
    let on = true;
    fetcher().then((r) => on && setState({ ...r, loaded: true }));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

// --- Homepage spotlights ----------------------------------------------------
// Active rows only (RLS also enforces the window). Falls back to the bundled
// evergreen set so the hero never rotates through nothing.

export function useSpotlights(): Loaded<Spotlight> {
  return useLoaded<Spotlight>(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await withTimeout(
        supabase
          .from('spotlights')
          .select('*')
          .lte('starts_on', today)
          .or(`expires_on.is.null,expires_on.gte.${today}`)
          .order('sort_order', { ascending: true }),
      );
      if (!error && data && data.length > 0) {
        return {
          live: true,
          items: data.map((r) => ({
            id: r.id,
            kicker: r.kicker,
            title: r.title,
            body: r.body,
            imageUrl: r.image_url,
            linkUrl: r.link_url,
            linkLabel: r.link_label,
          })),
        };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return { live: false, items: fallbackSpotlights };
  });
}

// --- Jobs (public; RLS hides expired rows from the public site) -------------

export function useJobs(): Loaded<JobItem> {
  return useLoaded<JobItem>(async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('jobs').select('*').gte('expires_on', new Date().toISOString().slice(0, 10)).order('posted_on', { ascending: false }),
      );
      if (!error && data && data.length > 0) {
        return {
          live: true,
          items: data.map((r) => ({
            id: r.id,
            posted: longDate(r.posted_on),
            closes: longDate(r.expires_on),
            title: r.title,
            employer: r.employer,
            location: r.location,
            description: r.description,
            applyUrl: r.apply_url,
          })),
        };
      }
      // The table exists and is genuinely empty → show empty, not samples,
      // so a cleared board never resurrects sample listings.
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return { live: false, items: sampleJobs };
  });
}

// --- Classes (public) -------------------------------------------------------

export function useClasses(): Loaded<ClassItem> {
  return useLoaded<ClassItem>(async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('class_listings').select('*').gte('expires_on', new Date().toISOString().slice(0, 10)).order('starts_on', { ascending: true, nullsFirst: false }),
      );
      if (!error && data && data.length > 0) {
        return {
          live: true,
          items: data.map((r) => ({
            id: r.id,
            posted: longDate(r.posted_on),
            starts: r.starts_on ? longDate(r.starts_on) : '',
            closes: longDate(r.expires_on),
            title: r.title,
            provider: r.provider,
            location: r.location,
            description: r.description,
            contact: r.contact,
          })),
        };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return { live: false, items: sampleClasses };
  });
}

// --- Q&A archive ------------------------------------------------------------
// Public visitors get the question index (via the get_qa_index RPC — answers
// never leave the database for them). Signed-in current members read the full
// table; RLS enforces membership server-side.

export function useQaIndex(): Loaded<QaIndexItem> {
  return useLoaded<QaIndexItem>(async () => {
    try {
      const { data, error } = await withTimeout(supabase.rpc('get_qa_index'));
      if (!error && data && data.length > 0) {
        return {
          live: true,
          items: (data as { id: string; published_on: string; topic: string; question: string }[]).map((r) => ({
            id: r.id,
            date: monthYear(r.published_on),
            topic: r.topic,
            question: r.question,
          })),
        };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return { live: false, items: sampleQa };
  });
}

export function useQaEntries(enabled: boolean): Loaded<QaIndexItem> {
  const [state, setState] = useState<Loaded<QaIndexItem>>({ items: [], live: false, loaded: false });
  useEffect(() => {
    if (!enabled) return;
    let on = true;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('qa_entries').select('id, published_on, topic, question, answer, published').order('published_on', { ascending: false }),
        );
        if (!error && data && data.length > 0) {
          on &&
            setState({
              live: true,
              loaded: true,
              items: data.map((r) => ({
                id: r.id,
                date: monthYear(r.published_on),
                topic: r.topic,
                question: r.question,
                answer: r.answer,
                published: r.published ?? true,
              })),
            });
          return;
        }
        if (!error && data) {
          on && setState({ live: true, loaded: true, items: [] });
          return;
        }
      } catch {
        /* fall back below */
      }
      on && setState({ live: false, loaded: true, items: sampleQa });
    })();
    return () => {
      on = false;
    };
  }, [enabled]);
  return state;
}

// --- Teaching videos --------------------------------------------------------

export function useVideoIndex(): Loaded<VideoIndexItem> {
  return useLoaded<VideoIndexItem>(async () => {
    try {
      const { data, error } = await withTimeout(supabase.rpc('get_video_index'));
      if (!error && data && data.length > 0) {
        return {
          live: true,
          items: (data as { id: string; topic: string; title: string; presenter: string; minutes: number | null }[]).map((r) => ({
            id: r.id,
            topic: r.topic,
            title: r.title,
            presenter: r.presenter,
            minutes: r.minutes,
          })),
        };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return { live: false, items: sampleVideos.map((v) => ({ ...v, minutes: v.minutes as number | null })) };
  });
}

export function useVideos(enabled: boolean): Loaded<VideoIndexItem> {
  const [state, setState] = useState<Loaded<VideoIndexItem>>({ items: [], live: false, loaded: false });
  useEffect(() => {
    if (!enabled) return;
    let on = true;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('teaching_videos').select('*').order('published_on', { ascending: false }),
        );
        if (!error && data) {
          on &&
            setState({
              live: true,
              loaded: true,
              items: data.map((r) => ({
                id: r.id,
                topic: r.topic,
                title: r.title,
                presenter: r.presenter,
                minutes: r.minutes,
                videoUrl: r.video_url,
                description: r.description,
              })),
            });
          return;
        }
      } catch {
        /* fall back below */
      }
      on && setState({ live: false, loaded: true, items: [] });
    })();
    return () => {
      on = false;
    };
  }, [enabled]);
  return state;
}

// --- Member library ---------------------------------------------------------

export function useLibrary(enabled: boolean): Loaded<LibraryItem> {
  const [state, setState] = useState<Loaded<LibraryItem>>({ items: [], live: false, loaded: false });
  useEffect(() => {
    if (!enabled) return;
    let on = true;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('library_resources').select('*').order('published_on', { ascending: false }),
        );
        if (!error && data) {
          on && setState({ live: true, loaded: true, items: data as LibraryItem[] });
          return;
        }
      } catch {
        /* fall back below */
      }
      on && setState({ live: false, loaded: true, items: [] });
    })();
    return () => {
      on = false;
    };
  }, [enabled]);
  return state;
}

// Plain-language matcher for the Q&A search box: every typed word must appear
// somewhere in the topic, question, or answer.
export function qaMatches(item: QaIndexItem, query: string): boolean {
  const hay = `${item.topic} ${item.question} ${item.answer ?? ''}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

// Turn a YouTube / Vimeo link into an embeddable player URL; null when the
// host isn't one we embed (the UI then links out instead).
export function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      const shorts = u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/);
      if (shorts) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.match(/^\/(\d+)/);
      if (id) return `https://player.vimeo.com/video/${id[1]}`;
    }
    if (host === 'player.vimeo.com' || host === 'youtube-nocookie.com') return raw;
  } catch {
    /* not a URL */
  }
  return null;
}
