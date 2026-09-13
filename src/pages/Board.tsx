import PageHead from '../components/PageHead';
import { board } from '../content/data';
import { slug, T } from '../lib/text';

// Grouped the way the bylaws group them: the three officers (Article 6), the
// directors (Article 5: the Immediate Past President and three
// Members-at-Large), and appointed staff (9.05), which is not a voting seat.
const groups = [
  { kind: 'officer', label: 'Officers', note: 'Elected by the membership in even-numbered years for two-year terms.' },
  { kind: 'director', label: 'Directors', note: 'The Immediate Past President and three Members-at-Large, elected in odd-numbered years.' },
  { kind: 'staff', label: 'Staff', note: 'Appointed by the board to run day-to-day operations. Not a voting seat.' },
] as const;

export default function Board() {
  return (
    <>
      <PageHead
        id="board"
        eyebrow="Leadership"
        title="Board of Directors"
        sub="Seven voting seats, all held by Active members in good standing: three officers, the Immediate Past President, and three Members-at-Large. The board guides the association's business between membership meetings."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {groups.map((g) => (
            <div key={g.kind} className="mb-10">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
                <h2 className="font-disp font-bold uppercase text-2xl">
                  <T id={`board.group.${g.kind}.label`}>{g.label}</T>
                </h2>
                <p className="text-muted text-[14px]">
                  <T id={`board.group.${g.kind}.note`}>{g.note}</T>
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {board
                  .filter((m) => m.kind === g.kind)
                  .map((m) => {
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
                                : g.kind === 'staff'
                                  ? 'bg-paper border border-line text-body'
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
                        {m.blurb && (
                          <p className="text-[13.5px] text-muted mt-4 leading-relaxed">
                            <T id={`board.${slug(m.name)}.${slug(m.role)}.blurb`}>{m.blurb}</T>
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-8">
              <h2 className="font-disp font-bold uppercase text-2xl mb-2">
                <T id="board.elections.h2">Elections</T>
              </h2>
              <p className="text-muted text-[15px] mb-3">
                <T id="board.elections.p1">
                  Every seat is held by an Active member in good standing: current in dues, with no
                  pending action under the bylaws. Terms are two years.
                </T>
              </p>
              <p className="text-muted text-[15px] mb-3">
                <T id="board.elections.p2">
                  Members-at-Large are elected in odd-numbered years. After the first meeting of the
                  year the Secretary sends every Active member a ballot, by mail, email, or the web,
                  with room for write-in candidates. Ballots are due 20 days before the second meeting,
                  and the winners take office at the annual meeting.
                </T>
              </p>
              <p className="text-muted text-[15px] mb-3">
                <T id="board.elections.p3">
                  The President-Elect and Secretary are elected in even-numbered years at the second
                  regular meeting and take office at the annual meeting. The President is not elected
                  directly: the President-Elect succeeds to the office.
                </T>
              </p>
              <p className="text-muted text-[15px]">
                <T id="board.elections.p4">Interested in running? Tell any board member or write to</T>{' '}
                <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
                  info@faemse.org
                </a>
                <T id="board.elections.p5">.</T>
              </p>
            </div>
            <div className="card p-8">
              <h2 className="font-disp font-bold uppercase text-2xl mb-2">
                <T id="board.committees.h2">Committees</T>
              </h2>
              <p className="text-muted text-[15px] mb-3">
                <T id="board.committees.p1">
                  The bylaws provide for three standing committees, Primary Education, Continuing
                  Education, and Preceptor / Training Officer, plus ad hoc committees the board
                  creates as needed. Chairs are Active members in good standing, appointed by the
                  President for two-year terms.
                </T>
              </p>
              <p className="text-muted text-[15px]">
                <T id="board.committees.p2">
                  Committees are seated as the board needs them. If you would like to serve, write to
                </T>{' '}
                <a className="text-brand-blue font-semibold" href="mailto:info@faemse.org">
                  info@faemse.org
                </a>
                <T id="board.committees.p3">.</T>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
