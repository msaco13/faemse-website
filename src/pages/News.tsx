import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useSiteNews } from '../lib/content';
import { T } from '../lib/text';

const tagChip: Record<string, string> = {
  Awards: 'text-brand-goldink bg-[#FBF3D9]',
  Resources: 'text-[#1A47B8] bg-[#E7EEFF]',
  Board: 'text-[#0E7A4A] bg-[#E2F7EC]',
  Policy: 'text-brand-red bg-[#FDEAEB]',
};

export default function News() {
  // Public, real posts only (board, 2026-10-20): no sample posts for visitors.
  const { items, live, loaded } = useSiteNews();
  const news = live ? items : [];
  return (
    <>
      <PageHead
        id="news"
        eyebrow="Association news"
        title="The latest"
        sub="State policy updates in plain English, board news, awards, and resources for Florida's EMS education community."
      />
      <section className="py-20 bg-white">
        <div className="wrap max-w-[860px] space-y-6">
          {!loaded && (
            <div className="card p-8 text-muted" aria-busy="true">
              <T id="news.loading">Loading the latest…</T>
            </div>
          )}
          {news.map((n) => (
            <article
              key={n.id ?? n.title}
              id={n.id}
              className="card p-8 hover:shadow-[0_18px_50px_rgba(10,33,59,.1)] transition-shadow"
            >
              <p className="flex items-center gap-2.5 text-[12.5px] font-bold tracking-[0.08em] uppercase text-muted mb-3">
                {n.date}
                <span className={`px-2.5 py-1 rounded-full ${tagChip[n.tag] ?? 'text-muted bg-paper'}`}>
                  {n.tag}
                </span>
              </p>
              <h2 className="text-[22px] font-bold leading-snug mb-2">{n.title}</h2>
              <p className="text-muted">{n.excerpt}</p>
              {n.body && (
                <details className="mt-4 group">
                  <summary className="cursor-pointer list-none font-bold text-brand-blue text-[14.5px] hover:underline">
                    <span className="group-open:hidden"><T id="news.item.more">Read the full post →</T></span>
                    <span className="hidden group-open:inline"><T id="news.item.less">Collapse ↑</T></span>
                  </summary>
                  <div className="mt-4 text-[15.5px] text-body leading-relaxed whitespace-pre-line border-l-[3px] border-brand-gold/60 pl-5 max-w-[72ch]">
                    {n.body}
                  </div>
                </details>
              )}
            </article>
          ))}
          {loaded && news.length === 0 && (
            <div className="card p-8 text-muted">
              <T id="news.empty">No news has been posted yet. Upcoming meetings are on the calendar.</T>{' '}
              <Link to="/events" className="font-bold text-brand-blue hover:underline">
                <T id="news.empty.link">See the calendar →</T>
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
