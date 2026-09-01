import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { embedUrl, useVideoIndex, useVideos } from '../lib/postings';
import { useMemberStatus } from '../lib/useMemberStatus';

// The differentiator: nobody teaches EMS instructors how to teach. Short
// segments (3-4 minutes) from strong instructors, hosted on YouTube/Vimeo and
// embedded — video never touches this stack. Titles are public; playback is a
// member benefit enforced server-side (the index RPC has no video URLs).
export default function Videos() {
  const status = useMemberStatus();
  const index = useVideoIndex();
  const full = useVideos(status.checked && status.current);

  const memberView = status.current && full.loaded && full.live;
  const items = memberView ? full.items : index.items;
  const loaded = memberView ? full.loaded : index.loaded;

  return (
    <>
      <PageHead
        eyebrow="Teaching the teachers"
        title="Teaching videos"
        sub="Short, specific segments from Florida's strongest instructors — the craft of teaching EMS, not just the content."
      />
      <section className="py-20 bg-paper">
        <div className="wrap">
          {index.loaded && !index.live && (
            <p className="mb-5 inline-block text-[12px] font-bold tracking-[0.12em] uppercase text-brand-goldink bg-[#FBF3D9] px-3.5 py-1.5 rounded-full">
              Sample titles — the launch set is in production
            </p>
          )}

          {status.checked && !status.current && (
            <div className="card p-7 mb-8 border-t-[3px] border-t-brand-gold/70 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-disp font-bold uppercase text-xl mb-1">Watching is a member benefit</h2>
                <p className="text-muted text-[14.5px] max-w-[56ch]">
                  Most programs get no instructional training beyond the minimum course. This
                  library is FAEMSE closing that gap — every video opens with membership.
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/membership" className="btn-red !py-2.5 !px-5">
                  Join — $50/yr
                </Link>
                <Link to="/login" className="btn-outline !py-2.5 !px-5">
                  Member sign in
                </Link>
              </div>
            </div>
          )}

          {!loaded ? (
            <div className="card p-8 text-muted" aria-busy="true">
              Loading the library…
            </div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-muted">
              The first videos are in production with our launch instructors — they post here the
              moment they&apos;re ready.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((v) => {
                const src = memberView && v.videoUrl ? embedUrl(v.videoUrl) : null;
                return (
                  <article key={v.id ?? v.title} className="card overflow-hidden flex flex-col">
                    {memberView && src ? (
                      <div className="aspect-video bg-ink">
                        <iframe
                          src={src}
                          title={v.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="aspect-video grid place-items-center bg-[radial-gradient(400px_240px_at_50%_0%,#12315E_0%,#0A1B33_70%)] text-white">
                        {memberView && v.videoUrl ? (
                          <a href={v.videoUrl} target="_blank" rel="noreferrer" className="btn-glass !py-2.5 !px-5">
                            Watch ↗
                          </a>
                        ) : (
                          <span role="img" className="w-14 h-14 grid place-items-center rounded-full border border-brand-gold/50 bg-brand-gold/10 text-brand-goldsoft text-xl" aria-label="Members only">
                            🔒
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <p className="text-[12px] font-bold tracking-[0.09em] uppercase text-muted mb-1.5">
                        {v.topic}
                        {v.minutes ? ` · ${v.minutes} min` : ''}
                      </p>
                      <h2 className="text-[17px] font-bold leading-snug mb-1">{v.title}</h2>
                      {v.presenter && <p className="text-[13.5px] text-muted">{v.presenter}</p>}
                      {memberView && v.description && (
                        <p className="text-[14px] text-muted mt-2">{v.description}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="text-muted text-[14px] mt-8 max-w-[75ch]">
            Good at a specific piece of teaching — a skill station, a hard lecture topic, a way of
            running scenarios? The library grows one 3–4 minute segment at a time.{' '}
            <a className="text-brand-blue font-semibold hover:underline" href="mailto:info@faemse.org?subject=Teaching%20video%20contribution">
              Volunteer a segment →
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
