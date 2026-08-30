import PageHead from '../components/PageHead';
import { bylawsSummary } from '../content/data';

export default function Bylaws() {
  return (
    <>
      <PageHead
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
                <h2 className="font-bold text-xl mb-1.5">{b.title}</h2>
                <p className="text-muted text-[15px]">{b.text}</p>
              </li>
            ))}
          </ol>
          <p className="text-muted text-[14px] mt-8">
            For the complete, current bylaws document, contact{' '}
            <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
              info@faemse.org
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
