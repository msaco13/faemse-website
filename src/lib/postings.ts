// Live postings (jobs, classes, Q&A, teaching videos, member library) from
// Supabase. The homepage slides, jobs and classes never fall back to samples
// (board, 2026-10-20): when the database can't be reached they show the
// visitor's last saved copy of the real ones, or nothing. Q&A and videos still
// fall back to their bundled samples.

import { useEffect, useState } from 'react';
import { sampleQa, sampleVideos, welcomeSlide } from '../content/data';
import { todayISO } from './dates';
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
  // ISO closing date, so a saved copy can drop listings that have closed.
  closesOn?: string;
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
  closesOn?: string;
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
  videoUrl: string;
  linkUrl: string;
  linkLabel: string;
  // The two slide buttons, each switched off with a checkbox in the
  // Spotlights panel. Optional so slides cached before the switch existed
  // (localStorage) still show both; only `false` hides a button.
  showLink?: boolean;
  showJoin?: boolean;
  // The small tags under the buttons that are switched on (tag_1..3 with
  // show_tag_1..3), in order. Missing before the columns exist: no tags.
  tags?: string[];
  // The welcome slide (is_welcome): same fields, its own look. See
  // HeroSpotlight.
  welcome?: boolean;
  // ISO last day the slide runs (null: no end), so a saved copy can drop it.
  expiresOn?: string | null;
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

// `down`: the database couldn't be reached; `items` are then the saved copy
// from `savedAt` (empty when this browser has none).
export type Loaded<T> = { items: T[]; live: boolean; loaded: boolean; down?: boolean; savedAt?: string | null };

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

// A fetcher answers null when the database can't be reached.
type Fetched<T> = { items: T[]; live: boolean } | null;
type SaveOptions<T> = {
  // localStorage key for the saved copy of the last live answer.
  key: string;
  // Render the saved copy before the fetch returns, so content in the first
  // screen (the hero spotlights) doesn't pop in and shove the page a moment
  // after first paint. The fresh answer still replaces it when it arrives.
  showFirst?: boolean;
  // Whether a saved item still belongs on the page today (not closed or
  // expired since it was saved).
  current?: (item: T) => boolean;
};

function readSaved<T>(save: SaveOptions<T>): { savedAt: string; items: T[] } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(save.key) ?? 'null');
    if (!saved || typeof saved.savedAt !== 'string' || !Array.isArray(saved.items)) return null;
    return { savedAt: saved.savedAt, items: save.current ? (saved.items as T[]).filter(save.current) : saved.items };
  } catch {
    return null;
  }
}

function useLoaded<T>(fetcher: () => Promise<Fetched<T>>, save?: SaveOptions<T>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>(() => {
    const saved = save?.showFirst ? readSaved(save) : null;
    return saved ? { items: saved.items, live: true, loaded: false } : { items: [], live: false, loaded: false };
  });
  useEffect(() => {
    let on = true;
    fetcher().then((r) => {
      if (!on) return;
      if (r) {
        setState({ ...r, loaded: true, down: false, savedAt: null });
        if (save && r.live) {
          try {
            localStorage.setItem(save.key, JSON.stringify({ savedAt: new Date().toISOString(), items: r.items }));
          } catch {
            /* storage full or blocked: nothing to do */
          }
        }
        return;
      }
      const saved = save ? readSaved(save) : null;
      setState({ items: saved?.items ?? [], live: false, loaded: true, down: true, savedAt: saved?.savedAt ?? null });
    });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

const notClosed = (item: { closesOn?: string }) => !item.closesOn || item.closesOn >= todayISO();

// --- Homepage spotlights ----------------------------------------------------
// Active rows only (RLS also enforces the window). With none (or the database
// down and no saved copy), the hero shows the bundled welcome slide alone.

export function useSpotlights(): Loaded<Spotlight> {
  return useLoaded<Spotlight>(async () => {
    try {
      const today = todayISO();
      const { data, error } = await withTimeout(
        supabase
          .from('spotlights')
          .select('*')
          // Slides the board switched off (Show box) stay out of the deck,
          // and out of its count, for everyone; admins included.
          .eq('show_slide', true)
          .lte('starts_on', today)
          .or(`expires_on.is.null,expires_on.gte.${today}`)
          .order('sort_order', { ascending: true }),
      );
      if (!error && data && data.length > 0) {
        const items: Spotlight[] = data.map((r) => ({
          id: r.id,
          kicker: r.kicker,
          title: r.title,
          body: r.body,
          imageUrl: r.image_url,
          videoUrl: r.video_url ?? '',
          linkUrl: r.link_url,
          linkLabel: r.link_label,
          showLink: r.show_link !== false,
          showJoin: r.show_join !== false,
          tags: [1, 2, 3]
            .filter((n) => r[`show_tag_${n}`] !== false)
            .map((n) => String(r[`tag_${n}`] ?? '').trim())
            .filter(Boolean),
          welcome: r.is_welcome === true,
          expiresOn: r.expires_on ?? null,
        }));
        // Before the is_welcome column exists (the code can deploy a minute
        // ahead of the database change), keep showing the bundled welcome
        // slide first, as the site always has.
        if (!('is_welcome' in data[0])) items.unshift(welcomeSlide);
        return { live: true, items };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return null;
  }, {
    key: 'faemse:spotlights:v3',
    showFirst: true,
    current: (s) => !s.expiresOn || s.expiresOn.slice(0, 10) >= todayISO(),
  });
}

// --- Jobs (public; RLS hides expired rows from the public site) -------------

export function useJobs(): Loaded<JobItem> {
  return useLoaded<JobItem>(async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('jobs').select('*').gte('expires_on', todayISO()).order('posted_on', { ascending: false }),
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
            closesOn: String(r.expires_on).slice(0, 10),
          })),
        };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return null;
  }, { key: 'faemse:jobs', current: notClosed });
}

// --- Classes (public) -------------------------------------------------------

export function useClasses(): Loaded<ClassItem> {
  return useLoaded<ClassItem>(async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('class_listings').select('*').gte('expires_on', todayISO()).order('starts_on', { ascending: true, nullsFirst: false }),
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
            closesOn: String(r.expires_on).slice(0, 10),
          })),
        };
      }
      if (!error && data) return { live: true, items: [] };
    } catch {
      /* fall back below */
    }
    return null;
  }, { key: 'faemse:classes', current: notClosed });
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
// A muted, looping, chrome-free background embed for the hero. Direct video
// files (mp4/webm/mov) return null: they play in a native <video> instead.
export function backgroundEmbedUrl(raw: string): string | null {
  const base = embedUrl(raw);
  if (!base) return null;
  if (base.includes('youtube-nocookie.com/embed/')) {
    const id = base.split('/embed/')[1].split(/[?&]/)[0];
    return `${base}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3`;
  }
  if (base.includes('player.vimeo.com/video/')) {
    return `${base}?background=1&autoplay=1&loop=1&muted=1`;
  }
  return null;
}

export function isVideoFile(raw: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(raw);
}

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
