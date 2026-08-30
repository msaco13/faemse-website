import PageHead from '../components/PageHead';
import { news } from '../content/data';

const tagChip: Record<string, string> = {
  Awards: 'text-brand-goldink bg-[#FBF3D9]',
  Resources: 'text-[#1A47B8] bg-[#E7EEFF]',
  Board: 'text-[#0E7A4A] bg-[#E2F7EC]',
};

export default function News() {
  return (
    <>
      <PageHead
        eyebrow="Association news"
        title="The latest"
        sub="Awards, board updates, and resources for Florida's EMS education community."
      />
      <section className="py-20 bg-white">
        <div className="wrap max-w-[860px] space-y-6">
          {news.map((n) => (
            <article key={n.title} className="card p-8 hover:shadow-[0_18px_50px_rgba(10,27,51,.1)] transition-shadow">
              <p className="flex items-center gap-2.5 text-[12.5px] font-bold tracking-[0.08em] uppercase text-muted mb-3">
                {n.date}
                <span className={`px-2.5 py-1 rounded-full ${tagChip[n.tag] ?? 'text-muted bg-paper'}`}>
                  {n.tag}
                </span>
              </p>
              <h2 className="text-[22px] font-bold leading-snug mb-2">{n.title}</h2>
              <p className="text-muted">{n.excerpt}</p>
            </article>
          ))}
          <p className="text-muted text-[14px]">
            Sample posts shown for the concept — real association news will populate this page.
          </p>
        </div>
      </section>
    </>
  );
}
