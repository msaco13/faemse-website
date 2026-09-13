// Documents members can read from the portal (the bylaws today). Rows live in
// the `documents` table, readable only by current members and admins (RLS;
// see supabase/migrations/20260913_bylaws_documents.sql). The body is plain
// text, one line per paragraph; `parseDocument` turns the bylaws' numbering
// into headings so the page reads like the printed document.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Doc = { slug: string; title: string; body: string; updated_at: string };

export type DocState =
  | { status: 'loading' }
  | { status: 'ready'; doc: Doc }
  | { status: 'missing' }
  | { status: 'error'; message: string };

export function useDocument(slug: string, enabled: boolean): DocState {
  const [state, setState] = useState<DocState>({ status: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    supabase
      .from('documents')
      .select('slug,title,body,updated_at')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setState({ status: 'error', message: error.message });
        else if (!data) setState({ status: 'missing' });
        else setState({ status: 'ready', doc: data as Doc });
      });
    return () => {
      alive = false;
    };
  }, [slug, enabled]);
  return state;
}

export type Block =
  | { kind: 'article'; number: string; title: string }
  | { kind: 'section'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'date'; text: string };

// "ARTICLE 5" followed by its title line becomes one article heading;
// "5.04 Election of Directors" (any depth of numbering) a section heading;
// the "Date ..." lines at the end a small history list; everything else a
// paragraph. The document's title line is dropped (the page supplies it).
export function parseDocument(body: string): Block[] {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (i === 0 && /bylaws$/i.test(l)) continue;
    const art = /^ARTICLE\s+(\d+)$/i.exec(l);
    if (art) {
      const title = lines[i + 1] && !/^\d/.test(lines[i + 1]) ? lines[++i] : '';
      out.push({ kind: 'article', number: art[1], title });
    } else if (/^\d+\.\d+(\.\d+)*\s+\S/.test(l) && l.length < 90) {
      out.push({ kind: 'section', text: l });
    } else if (/^Date (Initially Prepared|Adopted|Revised):/i.test(l)) {
      out.push({ kind: 'date', text: l });
    } else {
      out.push({ kind: 'para', text: l });
    }
  }
  return out;
}
