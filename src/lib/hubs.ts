// Board-only documents: the Program Directors hub and its companion hubs
// (Medical Director, Instructors, Field/Clinical Internship, Placement), kept
// admin-only while they are drafts. Rows live in `admin_documents`, which RLS
// opens to admins and nobody else (supabase/migrations/20261010_admin_documents.sql).
// The text never ships in the site bundle or the repository; it is fetched
// only after the profile check says admin, and the database refuses everyone
// else regardless.
//
// The body is Markdown laid out the way the drafts are written: "#" is the
// document title, each "##" a pillar (level 1), each "###" a subsection
// (level 2), and the text under a "###" is its content (level 3). The draft's
// build note asks for exactly those three click levels, with a link of its
// own for every subsection.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { slug } from './text';

export type HubListing = { slug: string; title: string; summary: string; updated_at: string };
export type HubDoc = HubListing & { body: string };

export type Sub = { slug: string; title: string; body: string };
export type Section = { slug: string; title: string; intro: string; subs: Sub[] };
export type Hub = { intro: string; sections: Section[] };

type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'missing' } | { status: 'error'; message: string };

// The table doesn't exist until the migration is pasted in; say so plainly
// instead of showing PostgREST's wording.
function explain(message: string): string {
  return /admin_documents|does not exist|schema cache/i.test(message)
    ? 'The hubs table is not set up yet. Paste supabase/migrations/20261010_admin_documents.sql into the Supabase SQL Editor, then load the documents.'
    : message;
}

export function useHubList(enabled: boolean): Load<HubListing[]> {
  const [state, setState] = useState<Load<HubListing[]>>({ status: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    supabase
      .from('admin_documents')
      .select('slug,title,summary,updated_at')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setState({ status: 'error', message: explain(error.message) });
        else setState({ status: 'ready', data: (data ?? []) as HubListing[] });
      });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}

// Kept for the session so clicking between a hub's pillars and subsections
// doesn't refetch the whole document each time.
const cache = new Map<string, HubDoc>();

export function useHubDoc(hubSlug: string, enabled: boolean): Load<HubDoc> {
  const cached = cache.get(hubSlug);
  const [state, setState] = useState<Load<HubDoc>>(cached ? { status: 'ready', data: cached } : { status: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    const hit = cache.get(hubSlug);
    if (hit) {
      setState({ status: 'ready', data: hit });
      return;
    }
    setState({ status: 'loading' });
    let alive = true;
    supabase
      .from('admin_documents')
      .select('slug,title,summary,updated_at,body')
      .eq('slug', hubSlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setState({ status: 'error', message: explain(error.message) });
        else if (!data) setState({ status: 'missing' });
        else {
          cache.set(hubSlug, data as HubDoc);
          setState({ status: 'ready', data: data as HubDoc });
        }
      });
    return () => {
      alive = false;
    };
  }, [hubSlug, enabled]);
  return state;
}

// Splits a body into intro, pillars and subsections. Slugs are unique within
// their level so every subsection has a stable link.
export function parseHub(body: string): Hub {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const intro: string[] = [];
  const sections: Section[] = [];
  const used = new Set<string>();
  const unique = (title: string, scope: Set<string>) => {
    const base = slug(title) || 'section';
    let s = base;
    for (let n = 2; scope.has(s); n++) s = `${base}-${n}`;
    scope.add(s);
    return s;
  };
  let section: (Section & { introLines: string[]; subSlugs: Set<string> }) | null = null;
  let sub: (Sub & { lines: string[] }) | null = null;
  const closeSub = () => {
    if (section && sub) section.subs.push({ slug: sub.slug, title: sub.title, body: sub.lines.join('\n').trim() });
    sub = null;
  };
  const closeSection = () => {
    closeSub();
    if (section) sections.push({ slug: section.slug, title: section.title, intro: section.introLines.join('\n').trim(), subs: section.subs });
    section = null;
  };
  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h && h[1].length === 1) continue; // the title; the page supplies it
    if (h && h[1].length === 2) {
      closeSection();
      const title = h[2].trim();
      section = { slug: unique(title, used), title, intro: '', subs: [], introLines: [], subSlugs: new Set() };
      continue;
    }
    if (h && h[1].length === 3 && section) {
      closeSub();
      const title = h[2].trim();
      sub = { slug: unique(title, section.subSlugs), title, body: '', lines: [] };
      continue;
    }
    if (sub) (sub as Sub & { lines: string[] }).lines.push(line);
    else if (section) (section as Section & { introLines: string[] }).introLines.push(line);
    else intro.push(line);
  }
  closeSection();
  return { intro: intro.join('\n').trim(), sections };
}

// Every readable page of a hub in document order: a pillar with subsections
// contributes one page per subsection; a pillar without any is a page itself.
// Drives the previous/next links, so reading straight through follows the
// draft's "start here" path.
export type Leaf = { section: Section; sub: Sub | null; path: string };

export function leaves(hubSlug: string, hub: Hub): Leaf[] {
  const out: Leaf[] = [];
  for (const section of hub.sections) {
    if (section.subs.length === 0) out.push({ section, sub: null, path: `/admin/hubs/${hubSlug}/${section.slug}` });
    else for (const sub of section.subs) out.push({ section, sub, path: `/admin/hubs/${hubSlug}/${section.slug}/${sub.slug}` });
  }
  return out;
}
