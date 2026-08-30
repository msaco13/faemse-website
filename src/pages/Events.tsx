import PageHead from '../components/PageHead';
import { events } from '../content/data';

const tagStyles: Record<string, string> = {
  blue: 'text-[#1A47B8] bg-[#E7EEFF]',
  red: 'text-[#B8232D] bg-[#FDEAEB]',
  green: 'text-[#0E7A4A] bg-[#E2F7EC]',
  gold: 'text-brand-goldink bg-[#FBF3D9]',
};

export default function Events() {
  return (
    <>
      <PageHead
        eyebrow="Calendar"
        title="Upcoming across Florida"
        sub="Workshops, competitions, and quarterly meetings. Sample listings shown — the live calendar is maintained by the association."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          <div className="card overflow-hidden shadow-[0_18px_50px_rgba(10,27,51,.08)]">
            {events.map((e) => (
              <div
                key={e.title}
                className="grid md:grid-cols-[110px_1.6fr_1fr_140px] gap-4 items-center px-7 py-6 border-b border-line last:border-b-0 hover:bg-paper transition-colors"
              >
                <div className="font-disp uppercase leading-none">
                  <b className="block text-[32px] font-bold">{e.day}</b>
                  <span className="text-[13px] tracking-[0.16em] text-muted">
                    {e.month} {e.year}
                  </span>
                </div>
                <div>
                  <b className="block text-[16.5px]">{e.title}</b>
                  <span className="text-[13.5px] text-muted">{e.detail}</span>
                </div>
                <span className="text-[14px] text-muted hidden md:block">{e.location}</span>
                <span
                  className={`justify-self-start md:justify-self-end text-[11px] font-bold tracking-[0.09em] uppercase px-3 py-1.5 rounded-full ${tagStyles[e.tagColor]}`}
                >
                  {e.tag}
                </span>
              </div>
            ))}
          </div>
          <p className="text-muted text-[14px] mt-6">
            Registration and event questions:{' '}
            <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
              info@faemse.org
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
