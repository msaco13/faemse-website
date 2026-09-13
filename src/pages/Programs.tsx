import { useState } from 'react';
import FloridaNetwork from '../components/FloridaNetwork';
import PageHead from '../components/PageHead';
import { programCities, programs } from '../content/programs';
import { T, useText } from '../lib/text';

// The constituency, drawn and then listed. Every EMT and paramedic program in
// the state appears whether or not it is a member: the page is the
// association's claim to speak for all of them, and the list underneath is
// what a director looking for a neighbor to call actually needs.
const cities = programCities();

export default function Programs() {
  const [query, setQuery] = useState('');
  const placeholder = useText('programs.search.placeholder', 'Search a school or city…');

  const q = query.trim().toLowerCase();
  const shown = q
    ? cities.filter(
        (c) => c.name.toLowerCase().includes(q) || c.programs.some((p) => p.name.toLowerCase().includes(q)),
      )
    : cities;

  return (
    <>
      <PageHead
        id="programs"
        eyebrow="The network"
        title="Where Florida trains its EMS workforce"
        sub={`${programs.length} EMT and paramedic programs in ${cities.length} cities, from Pensacola to Key West. Every one of them is FAEMSE's constituency.`}
      />

      {/* The map at full size. It draws its own caption 56px below itself
          (absolutely positioned), so the deep bottom padding is what keeps
          the caption inside the dark stage instead of over the directory. */}
      {/* overflow-hidden: the map's drawing area bleeds 9% past its box on
          purpose (comets and halos near the coast), which on a phone is a few
          pixels past the viewport and a sideways scroll. The deep bottom
          padding keeps the caption inside the clip. */}
      <section className="overflow-hidden bg-[radial-gradient(1000px_620px_at_50%_-20%,#14284C_0%,#0A1B33_55%,#060F20_100%)] py-20 pb-32">
        <div className="wrap">
          <FloridaNetwork className="w-full max-w-[900px] aspect-[700/683] mx-auto" labels="dense" />
        </div>
      </section>

      <section className="bg-paper py-20">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-9">
            <div>
              <p className="eyebrow">
                <T id="programs.directory.eyebrow">Every program, by city</T>
              </p>
              <h2 className="h-sec">
                <T id="programs.directory.h2">Find a program near you</T>
              </h2>
              <p className="text-muted text-[16px] max-w-[60ch]">
                <T id="programs.directory.sub">Schools without a listed website appear by name only.</T>
              </p>
            </div>
            <label className="block w-full md:w-[360px]">
              <span className="sr-only">
                <T id="programs.search.label">Search programs</T>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full rounded-2xl border border-line bg-white px-5 py-4 text-[15px] outline-none focus:border-brand-blue shadow-[0_8px_30px_rgba(10,27,51,.06)]"
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="text-muted text-center p-6 rounded-2xl border border-dashed border-line">
              <T id="programs.directory.empty">No program matches that search.</T>
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shown.map((c) => (
                <article key={c.name} className="card p-5 flex flex-col gap-2.5">
                  <header className="flex items-baseline justify-between gap-2.5">
                    <h3 className="font-disp font-bold uppercase text-[21px] tracking-[0.04em]">{c.name}</h3>
                    <span className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-brand-goldink bg-[#FBF3D9] px-2.5 py-1 rounded-full whitespace-nowrap">
                      {c.programs.length}{' '}
                      {c.programs.length === 1 ? (
                        <T id="programs.card.count.one">program</T>
                      ) : (
                        <T id="programs.card.count.many">programs</T>
                      )}
                    </span>
                  </header>
                  <ul className="space-y-1.5 text-[14.5px] leading-snug">
                    {c.programs.map((p) => (
                      <li key={p.name}>
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-brand-blue hover:underline"
                          >
                            {p.name} ↗
                          </a>
                        ) : (
                          <span className="text-muted">{p.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
