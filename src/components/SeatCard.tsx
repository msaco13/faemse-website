// One board seat as a card: initials, name, position, and what the seat does.
// Shared by the Board of Directors page and the Foundation page (board,
// 2026-10-22: the Foundation page follows the board page's format). The
// President's card is the gold one; a staff seat gets a quieter badge.
export default function SeatCard({ name, role, blurb, tone = 'board' }: { name: string; role: string; blurb?: string; tone?: 'board' | 'staff' }) {
  const isPresident = role === 'President';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 3)
    .join('');
  return (
    <div
      className={
        isPresident
          ? 'relative rounded-2xl p-7 bg-white border-2 border-transparent [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(140deg,#F5CE5A,#B18516)_border-box] shadow-[0_24px_60px_rgba(177,133,22,.18)]'
          : 'card p-7'
      }
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex-none w-14 h-14 rounded-full grid place-items-center font-disp font-bold text-xl ${
            isPresident
              ? 'bg-gradient-to-br from-brand-goldsoft to-brand-golddeep text-ink2'
              : tone === 'staff'
                ? 'bg-paper border border-line text-body'
                : 'bg-gradient-to-br from-brand-blue to-brand-bluedeep text-white'
          }`}
          aria-hidden
        >
          {initials}
        </span>
        <div>
          <b className="block text-[16px]">{name}</b>
          <span className={`text-[13.5px] ${isPresident ? 'text-brand-goldink font-bold tracking-[0.08em] uppercase' : 'text-muted'}`}>{role}</span>
        </div>
      </div>
      {blurb && <p className="text-[13.5px] text-muted mt-4 leading-relaxed">{blurb}</p>}
    </div>
  );
}
