import PageHead from '../components/PageHead';
import { board } from '../content/data';

export default function Board() {
  return (
    <>
      <PageHead
        eyebrow="Leadership"
        title="Board of Directors"
        sub="Elected by the membership on a two-year cycle, the board guides the association's business between statewide meetings."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {board.map((m) => {
              const isPresident = m.role === 'President';
              return (
                <div
                  key={m.role + m.name}
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
                          : 'bg-gradient-to-br from-brand-blue to-brand-bluedeep text-white'
                      }`}
                      aria-hidden
                    >
                      {m.name
                        .split(' ')
                        .map((w) => w[0])
                        .join('')}
                    </span>
                    <div>
                      <b className="block text-[16px]">{m.name}</b>
                      <span
                        className={`text-[13.5px] ${
                          isPresident ? 'text-brand-goldink font-bold tracking-[0.08em] uppercase' : 'text-muted'
                        }`}
                      >
                        {m.role}
                      </span>
                    </div>
                  </div>
                  {m.blurb && <p className="text-[13.5px] text-muted mt-4 leading-relaxed">{m.blurb}</p>}
                </div>
              );
            })}
          </div>
          <div className="card p-8 mt-10">
            <h2 className="font-disp font-bold uppercase text-2xl mb-2">Elections</h2>
            <p className="text-muted max-w-[70ch]">
              Board positions are filled through elections held on a two-year cycle. Active members
              vote and may run for office. Interested in serving? Reach out to any current board
              member or contact the association at{' '}
              <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
                info@faemse.org
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
