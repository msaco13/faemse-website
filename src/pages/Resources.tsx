import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { mailto, resourceCategories } from '../content/data';
import { T } from '../lib/text';

const faemseResources = [
  {
    title: 'Q&A archive',
    text: 'Real questions from Florida educators, answered once and kept. Questions are public; answers open with membership.',
    to: '/qa',
    tag: 'Searchable',
  },
  {
    title: 'Teaching videos',
    text: 'Short segments on the craft of teaching EMS — skills labs, lectures, clinical coaching.',
    to: '/videos',
    tag: 'Members',
  },
  {
    title: 'Director starter guide',
    text: 'The compliance clocks already running and your first 90 days, Florida-specific.',
    to: '/program-directors',
    tag: 'Free',
  },
  {
    title: 'Member library',
    text: 'Documents and references shelved by the board, organized by tag, on your portal page.',
    to: '/login',
    tag: 'Members',
  },
];

export default function Resources() {
  return (
    <>
      <PageHead
        id="resources"
        eyebrow="The reference shelf"
        title="Resources"
        sub="What FAEMSE has built for educators, plus the organizations, standards, and references every Florida EMS educator should have bookmarked."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          <p className="eyebrow mb-4">
            <T id="resources.faemse.eyebrow">From FAEMSE</T>
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {faemseResources.map((r, i) => (
              <Link
                key={r.title}
                to={r.to}
                className="card p-6 flex flex-col border-t-[3px] border-t-brand-blue/60 transition-all hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(47,107,255,.14)]"
              >
                <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-brand-blue mb-1.5">
                  <T id={`resources.faemse.${i + 1}.tag`}>{r.tag}</T>
                </span>
                <b className="font-disp font-bold uppercase text-[19px] leading-tight mb-1.5">
                  <T id={`resources.faemse.${i + 1}.title`}>{r.title}</T>
                </b>
                <span className="text-muted text-[13.5px] flex-1">
                  <T id={`resources.faemse.${i + 1}.text`}>{r.text}</T>
                </span>
                <span className="mt-3 font-bold text-brand-blue text-[13.5px]">
                  <T id="resources.faemse.cta">Open →</T>
                </span>
              </Link>
            ))}
          </div>

          <p className="eyebrow mb-4">
            <T id="resources.standards.eyebrow">Standards &amp; organizations</T>
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {resourceCategories.map((cat, i) => (
              <div key={cat.category} className="card p-8">
                <h2 className="font-disp font-bold uppercase text-xl mb-4">
                  <T id={`resources.cat.${i + 1}.name`}>{cat.category}</T>
                </h2>
                <ul className="space-y-3">
                  {cat.links.map((l) => (
                    <li key={l.name}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand-blue hover:underline"
                      >
                        {l.name} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="card p-8 md:col-span-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-disp font-bold uppercase text-xl mb-1">
                  <T id="resources.suggest.h2">Know a resource we&apos;re missing?</T>
                </h2>
                <p className="text-muted text-[15px]">
                  <T id="resources.suggest.text">Suggest an addition and we&apos;ll review it for the library.</T>
                </p>
              </div>
              <a href={mailto('Resource%20suggestion')} className="btn-red">
                <T id="resources.suggest.cta">Suggest a resource</T>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
