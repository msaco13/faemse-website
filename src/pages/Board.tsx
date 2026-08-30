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
            {board.map((m) => (
              <div key={m.role + m.name} className="card p-7 flex items-center gap-4">
                <span className="flex-none w-14 h-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-bluedeep text-white grid place-items-center font-disp font-bold text-xl">
                  {m.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </span>
                <div>
                  <b className="block text-[16px]">{m.name}</b>
                  <span className="text-[13.5px] text-muted">{m.role}</span>
                </div>
              </div>
            ))}
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
