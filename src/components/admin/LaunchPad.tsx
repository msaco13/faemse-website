import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ids as knownIds, patterns as knownPatterns } from 'virtual:text-ids';
import { supabase } from '../../lib/supabase';
import { useSiteText } from '../../lib/text';

// Admin → Page wording & pictures (board, 2026-10-20): the launch pad for
// in-place editing. Wording and pictures are still changed on the page itself,
// so the admin sees the change where it lives; this is where they start: one
// switch for edit mode, every page one click away with edit mode on, and
// every saved wording change in one list with Reset.

const PAGES: { to: string; name: string; note: string; also?: { label: string; hash: string } }[] = [
  { to: '/', name: 'Homepage', note: 'Headings, sections, sponsor band wording', also: { label: 'Slides and dates', hash: 'content' } },
  { to: '/about', name: 'About', note: 'Mission, history, leadership' },
  { to: '/board', name: 'Board of Directors', note: 'Page wording', also: { label: 'Names and positions', hash: 'board' } },
  { to: '/bylaws', name: 'Bylaws & elections', note: 'Page wording', also: { label: 'Bylaws text', hash: 'bylaws' } },
  { to: '/membership', name: 'Membership', note: 'Tiers, benefits, questions' },
  { to: '/events', name: 'Events', note: 'Page wording', also: { label: 'Dates', hash: 'content' } },
  { to: '/news', name: 'News', note: 'Page wording', also: { label: 'Posts', hash: 'content' } },
  { to: '/programs', name: 'Program map', note: 'Page wording' },
  { to: '/program-directors', name: 'Program director guide', note: 'The starter guide' },
  { to: '/classes', name: 'Class board', note: 'Page wording', also: { label: 'Listings', hash: 'content' } },
  { to: '/videos', name: 'Teaching videos', note: 'Page wording', also: { label: 'Videos', hash: 'content' } },
  { to: '/sponsors', name: 'Sponsors', note: 'Page wording', also: { label: 'Sponsor list and logos', hash: 'sponsors' } },
  { to: '/contact', name: 'Contact', note: 'Page wording' },
  { to: '/members', name: 'Member portal', note: 'What members see after signing in' },
  { to: '/privacy', name: 'Privacy policy', note: 'Policy wording' },
  { to: '/terms', name: 'Terms of use', note: 'Policy wording' },
];

// Where a wording id shows, from its first part.
const WHERE: Record<string, string> = {
  home: 'Homepage',
  about: 'About',
  board: 'Board of Directors',
  bylaws: 'Bylaws',
  membership: 'Membership',
  events: 'Events',
  news: 'News',
  programs: 'Program map',
  sponsors: 'Sponsors',
  contact: 'Contact',
  members: 'Member portal',
  footer: 'Footer, every page',
  nav: 'Menu, every page',
  login: 'Sign-in page',
  classes: 'Class board',
  videos: 'Teaching videos',
  jobs: 'Job board',
  qa: 'Q&A archive',
};

const patterns = knownPatterns.map((p) => new RegExp(p));
const known = new Set(knownIds);
const onAnyPage = (id: string) => known.has(id) || patterns.some((p) => p.test(id));

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LaunchPad() {
  const { editing, setEditing, overrides, reset, needsSetup } = useSiteText();
  const [dates, setDates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let on = true;
    supabase
      .from('site_text')
      .select('key, updated_at')
      .then(({ data }) => {
        if (!on || !data) return;
        const map: Record<string, string> = {};
        for (const r of data as { key: string; updated_at: string | null }[]) if (r.updated_at) map[r.key] = r.updated_at;
        setDates(map);
      });
    return () => {
      on = false;
    };
  }, []);

  const changed = Object.keys(overrides).sort((a, b) => (dates[b] ?? '').localeCompare(dates[a] ?? '') || a.localeCompare(b));

  async function onReset(id: string) {
    if (!window.confirm(`Put back the original wording for "${overrides[id]}"? This publishes right away.`)) return;
    setBusy(id);
    setErr('');
    const error = await reset(id);
    setBusy('');
    if (error) setErr(error);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-disp font-bold uppercase text-2xl mb-1">Page wording &amp; pictures</h2>
        <p className="text-muted text-[14px] max-w-[72ch]">
          Wording and pictures are changed on the page itself, so you see the change in place before you save. Start here: turn
          on edit mode, then pick the page.
        </p>
      </div>

      <div className="rounded-2xl bg-ink text-white px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px]">
          <b className="block text-[16px] mb-1">{editing ? 'Edit mode is on' : 'Edit mode is off'}</b>
          <span className="text-[13.5px] text-[#C9D6EE]">
            When it&apos;s on, every page highlights what you can change: click highlighted words to rewrite them, and pictures
            with a dashed frame to swap them. Saving publishes for everyone.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          aria-pressed={editing}
          disabled={needsSetup}
          className={`rounded-full px-5 py-2.5 text-[14px] font-bold disabled:opacity-50 ${
            editing ? 'border border-white/25 bg-white/10 text-white hover:bg-white/20' : 'bg-gradient-to-br from-brand-goldsoft to-brand-golddeep text-ink2'
          }`}
        >
          {editing ? 'Turn off edit mode' : 'Turn on edit mode'}
        </button>
      </div>

      <div>
        <h3 className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-brand-bluedeep mb-3">Pick a page</h3>
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] list-none p-0 m-0">
          {/* min-h-6: each link is at least 24px tall, so the two links on a
              card aren't too small or too close to tap (WCAG 2.5.8). */}
          {PAGES.map((p) => (
            <li key={p.to} className="border border-line rounded-xl px-4 py-3.5 bg-white flex flex-col gap-1">
              <b className="text-[15px]">{p.name}</b>
              <span className="text-[13px] text-muted">{p.note}</span>
              <Link to={p.to} onClick={() => setEditing(true)} className="mt-1 self-start inline-flex items-center min-h-6 text-[13.5px] font-bold text-brand-blue hover:underline">
                Edit this page →
              </Link>
              {p.also && (
                <a href={`#${p.also.hash}`} className="self-start inline-flex items-center min-h-6 text-[12.5px] font-semibold text-muted hover:text-ink">
                  {p.also.label}: in this menu
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-brand-bluedeep mb-1">Wording changed from the original</h3>
        <p className="text-muted text-[13.5px] mb-3">Every change anyone has saved, newest first. Reset puts the original wording back.</p>
        {err && (
          <p className="text-brand-red font-semibold text-[13px] mb-2" role="alert">
            {err}
          </p>
        )}
        {changed.length === 0 ? (
          <p className="text-muted text-[14px] border border-dashed border-line rounded-xl px-4 py-4">No wording has been changed yet.</p>
        ) : (
          <ul className="border border-line rounded-xl divide-y divide-line list-none p-0 m-0 bg-white">
            {changed.map((id) => {
              const live = onAnyPage(id);
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                  <div className="flex-1 min-w-[240px]">
                    <b className="block text-[14.5px]">&ldquo;{overrides[id]}&rdquo;</b>
                    <span className="text-[12.5px] text-muted">
                      {WHERE[id.split('.')[0]] ?? id.split('.')[0]}
                      {dates[id] ? ` · changed ${shortDate(dates[id])}` : ''} · <span className="font-mono">{id}</span>
                    </span>
                  </div>
                  {!live && (
                    <span
                      className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-brand-goldink bg-[#FBF3D9] rounded-full px-2.5 py-1"
                      title="The site's code no longer shows this wording anywhere, so this saved change does nothing. Reset clears it."
                    >
                      Not on any page now
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onReset(id)}
                    disabled={busy === id}
                    className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-60"
                  >
                    {busy === id ? 'Resetting…' : 'Reset'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[13px] text-muted border border-dashed border-line rounded-xl px-4 py-3">
        Everything else an admin can change is in this menu: the board page, sponsors, bylaws and program hubs above; members,
        dues and listings below.
      </p>
    </div>
  );
}
