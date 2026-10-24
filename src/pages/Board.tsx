import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import SeatCard from '../components/SeatCard';
import { contactPath } from '../content/data';
import { seatVotes } from '../lib/portal';
import { useBoardSeats } from '../lib/postings';
import { T } from '../lib/text';

// Grouped the way the bylaws group them: the three officers (Article 6), the
// directors (Article 5: the Immediate Past President and three
// Members-at-Large), the EMS Advisory Council representative, who sits with
// the board ex officio without a vote (5.02.01), and appointed staff (9.05),
// also not a voting seat. The ex officio seat had shared the Immediate Past
// President's card, which read as if it voted; it is its own group, and
// every card says whether its seat votes (board, 2026-10-22).
const groups = [
  { kind: 'officer', label: 'Officers', note: 'Elected by the membership in even-numbered years for two-year terms.' },
  { kind: 'director', label: 'Directors', note: 'The Immediate Past President and three Members-at-Large, elected in odd-numbered years.' },
  { kind: 'exofficio', label: 'Ex officio', note: 'Sits with the board under the bylaws (5.02.01): attends meetings and takes part in discussions and committees, without making motions or voting.' },
  { kind: 'staff', label: 'Staff', note: 'Appointed by the board to run day-to-day operations. Not a voting seat.' },
] as const;

const inGroup = (kind: (typeof groups)[number]['kind'], m: { section: string; ex_officio?: boolean }) =>
  kind === 'exofficio' ? !!m.ex_officio : m.section === kind && !m.ex_officio;

// The seats come from the Admin tab's board page editor (board_members),
// with the site's own copy standing in if the database can't be reached.
export default function Board() {
  const { items: seats } = useBoardSeats();
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
          {groups.filter((g) => seats.some((m) => inGroup(g.kind, m))).map((g) => (
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
                {seats
                  .filter((m) => inGroup(g.kind, m))
                  .map((m) => (
                    <SeatCard
                      key={m.id ?? m.role + m.name}
                      name={m.name}
                      role={m.role}
                      blurb={m.blurb}
                      tone={g.kind === 'staff' ? 'staff' : 'board'}
                      voting={seatVotes(m)}
                    />
                  ))}
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
                <T id="board.elections.run">Interested in running? Tell any board member or</T>{' '}
                <Link className="text-brand-blue font-semibold hover:underline" to={contactPath('Running for the board')}>
                  <T id="board.elections.link">send the board a message</T>
                </Link>
                .
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
                <T id="board.committees.serve">
                  Committees are seated as the board needs them. If you would like to serve,
                </T>{' '}
                <Link className="text-brand-blue font-semibold hover:underline" to={contactPath('Serving on a committee')}>
                  <T id="board.committees.link">send the board a message</T>
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
