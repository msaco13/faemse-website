import { useEffect } from 'react';
import { T, useText } from '../lib/text';

// Dark page banner shared by every inner page. Also owns the document title
// and meta description for its route.
//
// `id` is the page's wording prefix (e.g. "about"): the eyebrow, title, and
// subtitle become editable as <id>.eyebrow / <id>.title / <id>.sub, and the
// document title and meta description follow the edited wording too.
// `dynamicTitle` opts the title out of editing when it is computed per
// visitor (the member portal's "Welcome, <name>").
export default function PageHead({
  id,
  eyebrow,
  title,
  sub,
  dynamicTitle = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  dynamicTitle?: boolean;
}) {
  const editedTitle = useText(`${id}.title`, title);
  const liveTitle = dynamicTitle ? title : editedTitle;
  const liveSub = useText(`${id}.sub`, sub ?? '');

  useEffect(() => {
    document.title = `${liveTitle} · FAEMSE`;
    // Keep the share-card tags in step with the page, not stuck on the
    // homepage values from index.html.
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${liveTitle} · FAEMSE`);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', `${liveTitle} · FAEMSE`);
    if (liveSub) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', liveSub);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', liveSub);
    }
  }, [liveTitle, liveSub]);

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
        <p className="eyebrow !text-brand-goldsoft">
          <T id={`${id}.eyebrow`}>{eyebrow}</T>
        </p>
        <h1 className="font-disp font-bold uppercase leading-[0.95] text-[clamp(40px,6vw,72px)] mt-3">
          {dynamicTitle ? title : <T id={`${id}.title`}>{title}</T>}
        </h1>
        {sub && (
          <p className="text-[#BCCBE7] text-lg max-w-[60ch] mt-4">
            <T id={`${id}.sub`}>{sub}</T>
          </p>
        )}
      </div>
    </section>
  );
}
