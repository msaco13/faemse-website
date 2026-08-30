// Dark page banner shared by every inner page.
export default function PageHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <section className="bg-ink text-white relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1px, transparent 1.4px)',
          backgroundSize: '26px 26px',
        }}
      />
      <div className="wrap relative py-16 md:py-20">
        <p className="eyebrow !text-brand-bluesoft">{eyebrow}</p>
        <h1 className="font-disp font-bold uppercase leading-[0.95] text-[clamp(40px,6vw,72px)] mt-3">
          {title}
        </h1>
        {sub && <p className="text-[#BCCBE7] text-lg max-w-[60ch] mt-4">{sub}</p>}
      </div>
    </section>
  );
}
