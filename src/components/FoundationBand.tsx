import { T } from '../lib/text';

// The FAEMSE Foundation's scholarship slide, as a gold band: on the portal's
// Home tab (board, 2026-10-20) and on the Foundation page (2026-10-22). It
// reads the same Spotlights row as the homepage slide, so the deadlines
// change in one place. Lines that start with "Deadline:" become the small
// date tags. `showText` off drops the slide's opening sentence, for the
// Foundation page, whose title already says it.
export default function FoundationBand({
  kicker,
  title,
  body,
  url,
  label,
  showText = true,
}: {
  kicker: string;
  title: string;
  body: string;
  url: string;
  label: string;
  showText?: boolean;
}) {
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const deadlines = paras.filter((p) => /^deadline:/i.test(p)).map((p) => {
    const m = p.match(/^deadline:\s*(.+?),\s*for\s+(?:the\s+)?(.+?)\.?$/i);
    return m ? { when: m[1], what: m[2] } : { when: p.replace(/^deadline:\s*/i, ''), what: '' };
  });
  const text = paras.filter((p) => !/^deadline:/i.test(p)).join(' ');
  return (
    <div className="rounded-[20px] p-8 md:px-9 flex flex-wrap items-center justify-between gap-x-8 gap-y-5 text-ink2 bg-[linear-gradient(120deg,#F8DC7A_0%,#EBBC42_50%,#C8961E_100%)] shadow-[0_18px_44px_rgba(177,133,22,.25)]">
      <div className="flex-[1_1_460px] min-w-0 flex flex-col gap-2">
        <span className="font-disp font-bold text-[14px] tracking-[0.22em] uppercase text-[#5A4206]">{kicker}</span>
        <b className="font-disp font-bold uppercase text-[clamp(28px,3.4vw,38px)] leading-none">{title.replace(/\.$/, '')}</b>
        {showText && text && <span className="text-[15px] text-[#3A2B04]">{text}</span>}
        {deadlines.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-1">
            {deadlines.map((d) => (
              <span key={d.when} className="flex flex-col rounded-xl border border-ink2/20 bg-ink2/10 px-3.5 py-2">
                <b className="text-[14.5px]"><T id="members.foundation.deadline">Deadline</T> {d.when}</b>
                {d.what && <span className="text-[13px] text-[#3A2B04] first-letter:uppercase">{d.what}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="font-bold text-[15.5px] text-brand-goldsoft bg-ink rounded-full px-6 py-3.5 whitespace-nowrap hover:brightness-125">
          {label || 'Visit the Foundation'}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
}
