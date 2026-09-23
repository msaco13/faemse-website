import { parseDocument, useDocument } from '../lib/documents';
import { T } from '../lib/text';

// The complete bylaws, rendered from the plain text in the documents table
// with the document's own numbering turned into headings. Public since the
// board's 2026-09-23 decision; the same block serves the Bylaws page and the
// member portal.
export default function BylawsText({ open = false }: { open?: boolean }) {
  const doc = useDocument('bylaws', true);
  const blocks = doc.status === 'ready' ? parseDocument(doc.doc.body) : [];
  const current = blocks.filter((b) => b.kind === 'date').map((b) => (b.kind === 'date' ? b.text : '')).pop();

  if (doc.status === 'loading') {
    return <p className="text-muted text-[14.5px]" aria-busy="true"><T id="bylaws.full.loading">Loading the bylaws…</T></p>;
  }
  if (doc.status === 'missing') {
    return <p className="text-muted text-[14.5px]"><T id="bylaws.full.missing">The bylaws text has not been loaded yet.</T></p>;
  }
  if (doc.status === 'error') {
    return <p className="text-brand-red text-[14.5px] font-semibold" role="alert">{doc.message}</p>;
  }
  return (
    <>
      <p className="text-muted text-[14px] mb-4">
        <T id="bylaws.full.text">The complete, current bylaws of the association.</T>
        {current ? ` ${current.replace(/^Date /, '')}.` : ''}
      </p>
      <details className="group" open={open}>
        <summary className="cursor-pointer list-none inline-flex items-center gap-2 font-bold text-brand-blue hover:underline text-[15px]">
          <span className="group-open:hidden"><T id="bylaws.full.open">Read the full text ↓</T></span>
          <span className="hidden group-open:inline"><T id="bylaws.full.close">Collapse ↑</T></span>
        </summary>
        <div className="mt-5 max-h-[70vh] overflow-y-auto pr-3 border-t border-line pt-5 text-[15px] leading-relaxed">
          <h3 className="font-disp font-bold uppercase text-xl mb-4">{doc.doc.title}</h3>
          {blocks.map((b, i) => {
            if (b.kind === 'article')
              return (
                <h4 key={i} className="font-disp font-bold uppercase text-lg mt-7 mb-2 text-brand-bluedeep">
                  Article {b.number}{b.title ? `: ${b.title}` : ''}
                </h4>
              );
            if (b.kind === 'section') return <h5 key={i} className="font-bold mt-4 mb-1">{b.text}</h5>;
            if (b.kind === 'date') return <p key={i} className="text-muted text-[14px] my-0.5">{b.text}</p>;
            return <p key={i} className="text-body mb-3">{b.text}</p>;
          })}
        </div>
      </details>
    </>
  );
}
