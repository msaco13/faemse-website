import PageHead from '../components/PageHead';
import { bylawsSummary } from '../content/data';
import { T } from '../lib/text';

export default function Bylaws() {
  return (
    <>
      <PageHead
        id="bylaws"
        eyebrow="Governance"
        title="Bylaws"
        sub="How the association is organized and governed. Summary shown — the full bylaws document is available from the association."
      />
      <section className="py-20 bg-white">
        <div className="wrap max-w-[860px]">
          <ol className="space-y-5">
            {bylawsSummary.map((b) => (
              <li key={b.article} className="card p-7">
                <p className="font-disp font-semibold text-[13px] tracking-[0.22em] uppercase text-brand-blue mb-1">
                  {b.article}
                </p>
                <h2 className="font-bold text-xl mb-1.5">
                  <T id={`bylaws.${b.article.toLowerCase().replace(/\s+/g, '-')}.title`}>{b.title}</T>
                </h2>
                <p className="text-muted text-[15px]">
                  <T id={`bylaws.${b.article.toLowerCase().replace(/\s+/g, '-')}.text`}>{b.text}</T>
                </p>
              </li>
            ))}
          </ol>
          <p className="text-muted text-[14px] mt-8">
            <T id="bylaws.note.a">For the complete, current bylaws document, contact</T>{' '}
            <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
              info@faemse.org
            </a>
            <T id="bylaws.note.b">.</T>
          </p>
        </div>
      </section>
    </>
  );
}
