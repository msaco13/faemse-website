import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { qaMatches, useQaEntries, useQaIndex } from '../lib/postings';
import { useMemberStatus } from '../lib/useMemberStatus';

// The archive, not a forum: the board distills listserv threads into single
// clean answers. Questions are public — the pitch — and answers are a member
// benefit, enforced server-side by RLS (the public index RPC never returns
// answer text).
export default function QandA() {
  const status = useMemberStatus();
  const index = useQaIndex();
  const entries = useQaEntries(status.checked && status.current);

  const memberView = status.current && entries.loaded;
  const source = memberView ? entries : index;

  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All');

  const topics = useMemo(
    () => ['All', ...Array.from(new Set(source.items.map((i) => i.topic)))],
    [source.items],
  );
  const shown = source.items.filter(
    (i) => (topic === 'All' || i.topic === topic) && (query.trim() === '' || qaMatches(i, query)),
  );

  return (
    <>
      <PageHead
        eyebrow="The archive"
        title="Questions &amp; answers"
        sub="Real questions from Florida EMS educators, answered once and kept — so the knowledge stops evaporating with the listserv."
      />
      <section className="py-20 bg-paper">
        <div className="wrap max-w-[900px]">
          {source.loaded && !source.live && (
            <p className="mb-5 inline-block text-[12px] font-bold tracking-[0.12em] uppercase text-brand-goldink bg-[#FBF3D9] px-3.5 py-1.5 rounded-full">
              Sample entries — the archive is being seeded from real threads
            </p>
          )}

          {status.checked && !status.current && (
            <div className="card p-7 mb-8 border-t-[3px] border-t-brand-gold/70 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-disp font-bold uppercase text-xl mb-1">Answers are a member benefit</h2>
                <p className="text-muted text-[14.5px] max-w-[56ch]">
                  Browse every question below. The full answers — distilled from educators across
                  the state — open with membership.
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/membership" className="btn-red !py-2.5 !px-5">
                  Join — $50/yr
                </Link>
                <Link to="/login" className="btn-outline !py-2.5 !px-5">
                  Member sign in
                </Link>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block">
              <span className="sr-only">Search the archive</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the archive — try “pass rate”, “clinical sites”, “accreditation”…"
                className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-[15px] outline-none focus:border-brand-blue shadow-[0_8px_30px_rgba(10,27,51,.06)]"
              />
            </label>
            <div className="flex flex-wrap gap-2 mt-4">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  aria-pressed={topic === t}
                  className={`text-[12.5px] font-bold tracking-[0.06em] uppercase px-3.5 py-1.5 rounded-full border transition-colors ${
                    topic === t
                      ? 'text-white bg-brand-blue border-brand-blue'
                      : 'text-muted bg-white border-line hover:border-brand-blue hover:text-brand-blue'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {!source.loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              Loading the archive…
            </div>
          ) : shown.length === 0 ? (
            <div className="card p-8 text-muted">
              {source.items.length === 0
                ? 'The archive is being seeded from real listserv threads — first entries post soon.'
                : 'Nothing matches that search — try fewer or different words.'}
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map((item) =>
                memberView ? (
                  <details key={item.id ?? item.question} className="card group open:shadow-[0_18px_50px_rgba(10,27,51,.1)]">
                    <summary className="cursor-pointer list-none px-7 py-5 flex items-start justify-between gap-4">
                      <span>
                        <span className="block text-[12px] font-bold tracking-[0.09em] uppercase text-muted mb-1">
                          {item.topic} · {item.date}
                        </span>
                        <b className="text-[16.5px] leading-snug">{item.question}</b>
                      </span>
                      <span className="flex-none mt-1 text-brand-blue font-bold transition-transform group-open:rotate-90" aria-hidden>
                        ›
                      </span>
                    </summary>
                    <div className="px-7 pb-6 -mt-1">
                      <p className="text-[15px] text-body leading-relaxed max-w-[75ch] whitespace-pre-line border-l-[3px] border-brand-gold/60 pl-5">
                        {item.answer}
                      </p>
                    </div>
                  </details>
                ) : (
                  <div key={item.id ?? item.question} className="card px-7 py-5 flex items-start justify-between gap-4">
                    <span>
                      <span className="block text-[12px] font-bold tracking-[0.09em] uppercase text-muted mb-1">
                        {item.topic} · {item.date}
                      </span>
                      <b className="text-[16.5px] leading-snug">{item.question}</b>
                    </span>
                    <Link
                      to={status.signedIn ? '/membership' : '/login'}
                      className="flex-none mt-1 text-[12.5px] font-bold text-brand-goldink bg-[#FBF3D9] px-3 py-1.5 rounded-full hover:bg-brand-gold/30"
                    >
                      🔒 Members
                    </Link>
                  </div>
                ),
              )}
            </div>
          )}

          <p className="text-muted text-[14px] mt-8 max-w-[75ch]">
            Have a question the archive doesn&apos;t cover? Ask it on the member listserv — the
            strongest threads get distilled and added here, so the next educator finds the answer
            instead of re-asking it.
          </p>
        </div>
      </section>
    </>
  );
}
