import BylawsText from '../components/BylawsText';
import PageHead from '../components/PageHead';
import { bylawsHistory, bylawsOutline } from '../content/data';
import { T } from '../lib/text';

// The bylaws: the complete current text first (public since the board's
// 2026-09-23 decision), then a one-card-per-article summary, the revision
// history, and how amendments work.
export default function Bylaws() {
  return (
    <>
      <PageHead
        id="bylaws"
        eyebrow="Governance"
        title="Bylaws"
        sub="How the association is organized and governed. The complete current text, and a summary article by article."
      />
      <section className="py-20 bg-white">
        <div className="wrap max-w-[860px]">
          <div className="card p-7 mb-8 bg-paper">
            <p className="font-disp font-semibold text-[13px] tracking-[0.22em] uppercase text-brand-blue mb-1">
              <T id="bylaws.edition.label">Current edition</T>
            </p>
            <p className="font-bold text-[17px]">
              <T id="bylaws.edition.text">Revised September 10, 2021</T>
            </p>
            <p className="text-muted text-[14px] mt-1 mb-5">
              <T id="bylaws.edition.note">
                Fifteen articles. Adopted May 23, 1998; revised five times since. The summary below
                is for orientation; where it and the bylaws differ, the bylaws control.
              </T>
            </p>
            <BylawsText />
          </div>

          <h2 className="font-disp font-bold uppercase text-xl mb-4 text-muted">
            <T id="bylaws.outline.h2">Article by article</T>
          </h2>
          <ol className="space-y-5">
            {bylawsOutline.map((b) => {
              const key = b.article.toLowerCase().replace(/\s+/g, '-');
              return (
                <li key={b.article} className="card p-7">
                  <p className="font-disp font-semibold text-[13px] tracking-[0.22em] uppercase text-brand-blue mb-1">
                    {b.article}
                  </p>
                  <h2 className="font-bold text-xl mb-1.5">
                    <T id={`bylaws.${key}.title`}>{b.title}</T>
                  </h2>
                  <p className="text-muted text-[15px]">
                    <T id={`bylaws.${key}.text`}>{b.text}</T>
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <div className="card p-7">
              <h2 className="font-disp font-bold uppercase text-xl mb-3">
                <T id="bylaws.history.h2">Revision history</T>
              </h2>
              <ul className="space-y-2 text-[15px]">
                {bylawsHistory.map((h) => (
                  <li key={h.date} className="flex justify-between gap-4 border-b border-line pb-2 last:border-b-0">
                    <span className="text-muted">{h.event}</span>
                    <span className="font-semibold whitespace-nowrap">{h.date}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-7">
              <h2 className="font-disp font-bold uppercase text-xl mb-3">
                <T id="bylaws.amend.h2">Amending the bylaws</T>
              </h2>
              <p className="text-muted text-[15px] mb-3">
                <T id="bylaws.amend.text">
                  A proposed amendment is submitted in writing and posted for the membership to review
                  for 30 days before any vote. Adoption takes a two-thirds majority of the Active
                  members voting. Proposals under review are announced here and in the news feed.
                </T>
              </p>
              <p className="text-muted text-[14px]">
                <T id="bylaws.amend.note.a">Questions about governance go to</T>{' '}
                <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
                  info@faemse.org
                </a>
                <T id="bylaws.amend.note.b">.</T>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
