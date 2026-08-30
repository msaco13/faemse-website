import { useEffect } from 'react';

// Dark page banner shared by every inner page. Also owns the document title
// and meta description for its route.
export default function PageHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  useEffect(() => {
    document.title = `${title} · FAEMSE`;
    if (sub) document.querySelector('meta[name="description"]')?.setAttribute('content', sub);
  }, [title, sub]);

  return (
    <section className="bg-ink text-white relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1px, transparent 1.4px)',
          backgroundSize: '26px 26px',
        }}
      />
      <div
        className="absolute -right-40 -top-44 w-[560px] h-[560px] rounded-full opacity-[.13] blur-[85px] pointer-events-none bg-[radial-gradient(circle,rgba(245,206,90,.95),transparent_62%)]"
        aria-hidden
      />
      <div className="wrap relative py-16 md:py-20">
        <p className="eyebrow !text-brand-goldsoft">{eyebrow}</p>
        <h1 className="font-disp font-bold uppercase leading-[0.95] text-[clamp(40px,6vw,72px)] mt-3">
          {title}
        </h1>
        {sub && <p className="text-[#BCCBE7] text-lg max-w-[60ch] mt-4">{sub}</p>}
      </div>
    </section>
  );
}
