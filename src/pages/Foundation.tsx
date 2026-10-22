import FoundationBand from '../components/FoundationBand';
import PageHead from '../components/PageHead';
import SeatCard from '../components/SeatCard';
import { useFoundationBoard, useSpotlights } from '../lib/postings';
import { T } from '../lib/text';

// The FAEMSE Foundation on faemse.org (board, 2026-10-22): the header's
// Foundation link opens this page, which follows the Board of Directors
// page's format. The Foundation's board comes from Admin → Foundation page;
// the scholarship band is the Foundation slide in the Spotlights panel, the
// same one the member portal shows, so its deadlines change in one place.
// The About wording is editable with Edit page; the board asked the
// Foundation President for the Foundation's own words, which replace it
// when they arrive. Nothing here is written for the Foundation in the
// meantime: the page says only what the association knows.
const FOUNDATION_URL = 'https://www.faemsefoundation.org';

export default function Foundation() {
  const { items: board } = useFoundationBoard();
  const spotlights = useSpotlights();
  const scholarship = spotlights.items.find((s) => /faemsefoundation\.org/i.test(s.linkUrl));
  return (
    <>
      <PageHead
        id="foundation"
        eyebrow="Our companion charity"
        title="The FAEMSE Foundation"
        sub="The association's companion 501(c)(3), awarding scholarships to the next generation of EMTs and paramedics."
      />
      <section className="py-20 bg-paper">
        <div className="wrap flex flex-col gap-14">
          <div className={`grid gap-6 items-stretch ${scholarship ? 'lg:grid-cols-2' : ''}`}>
            <div className="card p-8 flex flex-col gap-3">
              <h2 className="font-disp font-bold uppercase text-2xl">
                <T id="foundation.about.h2">About the Foundation</T>
              </h2>
              <p className="text-muted text-[15.5px]">
                <T id="foundation.about.text">The Foundation has its own board, listed below, and its own website.</T>
              </p>
              <a
                href={FOUNDATION_URL}
                target="_blank"
                rel="noreferrer"
                className="self-start mt-1 inline-flex items-center min-h-6 font-bold text-[15px] text-brand-blue hover:underline"
              >
                <T id="foundation.about.link">Visit faemsefoundation.org ↗</T>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            {scholarship && (
              <FoundationBand
                kicker={scholarship.kicker}
                title={scholarship.title}
                body={scholarship.body}
                url={scholarship.linkUrl}
                label={scholarship.linkLabel}
                showText={false}
              />
            )}
          </div>

          <section aria-labelledby="foundation-board">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
              <h2 id="foundation-board" className="font-disp font-bold uppercase text-2xl">
                <T id="foundation.board.h2">Foundation Board</T>
              </h2>
              <p className="text-muted text-[14px]">
                <T id="foundation.board.note">The Foundation&apos;s own board, separate from the FAEMSE Board of Directors.</T>
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {board.map((m) => (
                <SeatCard key={m.id ?? m.role + m.name} name={m.name} role={m.role} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
