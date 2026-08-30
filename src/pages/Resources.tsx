import PageHead from '../components/PageHead';
import { resourceCategories } from '../content/data';

export default function Resources() {
  return (
    <>
      <PageHead
        eyebrow="The reference shelf"
        title="Resources"
        sub="The organizations, standards, and references every Florida EMS educator should have bookmarked."
      />
      <section className="py-20 bg-paper">
        <div className="wrap grid md:grid-cols-2 gap-6">
          {resourceCategories.map((cat) => (
            <div key={cat.category} className="card p-8">
              <h2 className="font-disp font-bold uppercase text-xl mb-4">{cat.category}</h2>
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
              <h2 className="font-disp font-bold uppercase text-xl mb-1">Know a resource we&apos;re missing?</h2>
              <p className="text-muted text-[15px]">Suggest an addition and we&apos;ll review it for the library.</p>
            </div>
            <a href="mailto:info@faemse.org?subject=Resource%20suggestion" className="btn-red">
              Suggest a resource
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
