import { useEffect, useState } from 'react';
import { parseDocument } from '../../lib/documents';
import { fixFaemseDomain } from '../../lib/hubDraft';
import { supabase } from '../../lib/supabase';

// Admin → Bylaws (board, 2026-10-20): the full bylaws text the Bylaws page
// and the member portal show (the `documents` row "bylaws"). Plain text, one
// paragraph per line; the page turns the bylaws' own numbering into headings.

const field = 'w-full rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-brand-blue bg-white';

export default function BylawsEditor() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState<{ title: string; body: string; updated_at: string | null } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase
      .from('documents')
      .select('title, body, updated_at')
      .eq('slug', 'bylaws')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setErr(error.message);
          setState('ready');
        } else if (!data) setState('missing');
        else {
          setSaved(data);
          setTitle(data.title);
          setBody(data.body);
          setState('ready');
        }
      });
  }, []);

  const blocks = parseDocument(body);
  const articles = blocks.filter((b) => b.kind === 'article').length;
  const sections = blocks.filter((b) => b.kind === 'section').length;
  const latestDate = blocks.filter((b) => b.kind === 'date').pop();
  const dirty = !!saved && (title !== saved.title || body !== saved.body);

  async function save() {
    if (!title.trim() || !body.trim()) return setErr('The bylaws need a title and their text.');
    if (!window.confirm('Replace the bylaws on the website with this text? It publishes right away, on the public Bylaws page and in the member portal.')) return;
    const fixed = fixFaemseDomain(body);
    setBusy(true);
    setErr('');
    setMsg('');
    const updated_at = new Date().toISOString();
    const { error } = await supabase.from('documents').update({ title: title.trim(), body: fixed.text, updated_at }).eq('slug', 'bylaws');
    setBusy(false);
    if (error) return setErr(error.message);
    setBody(fixed.text);
    setSaved({ title: title.trim(), body: fixed.text, updated_at });
    setMsg(['Saved. The Bylaws page shows the new text now.', fixed.note].filter(Boolean).join(' '));
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Bylaws</h2>
        <a href={`${import.meta.env.BASE_URL}bylaws`} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-brand-blue hover:underline">
          View the bylaws page ↗
        </a>
      </div>
      <p className="text-muted text-[13.5px] mb-4 max-w-[78ch]">
        The full bylaws text on the public Bylaws page and in the member portal. After an amendment, paste the new text here.
        One paragraph per line. A line reading <b>ARTICLE 3</b>, followed by the article&apos;s title on the next line, starts an
        article; a short line that begins with a number such as <b>3.01 Eligibility</b> becomes a section heading; lines that begin
        <b> Date Adopted:</b> or <b>Date Revised:</b> show as dates, and the last one appears at the top of the page.
      </p>

      {state === 'loading' ? (
        <p className="text-muted text-[14px]" role="status">
          Loading the bylaws…
        </p>
      ) : state === 'missing' ? (
        <p className="text-muted text-[14px] border border-dashed border-line rounded-xl px-4 py-4">
          The bylaws text isn&apos;t in the database yet, so there&apos;s nothing to edit here.
        </p>
      ) : (
        <>
          <label className="block mb-3">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} maxLength={200} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Text</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className={`${field} font-mono text-[13px] leading-relaxed min-h-[480px]`} spellCheck />
          </label>
          <p className="text-[13px] text-muted mt-2">
            Reads as {articles} article{articles === 1 ? '' : 's'} and {sections} section heading{sections === 1 ? '' : 's'}
            {latestDate && latestDate.kind === 'date' ? `. Shown at the top: ${latestDate.text}` : '. No date line yet'}.
            {saved?.updated_at && ` Last saved ${new Date(saved.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={busy || !dirty} className="btn-red !py-2 !px-5 text-[13.5px] disabled:opacity-50">
              {busy ? 'Saving…' : 'Save the bylaws'}
            </button>
            {dirty && saved && (
              <button
                onClick={() => {
                  setTitle(saved.title);
                  setBody(saved.body);
                  setMsg('');
                  setErr('');
                }}
                className="btn-outline !py-2 !px-4 text-[13px]"
              >
                Undo my changes
              </button>
            )}
            {msg && (
              <span className="text-[#0E7A4A] text-[13px] font-semibold" role="status">
                {msg}
              </span>
            )}
          </div>
        </>
      )}
      {err && (
        <p className="text-brand-redink font-semibold text-[13.5px] mt-3" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
