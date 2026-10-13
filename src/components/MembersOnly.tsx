import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PageHead from './PageHead';
import { useMemberStatus } from '../lib/useMemberStatus';

// Members-only pages (News, Q&A, Jobs, Resources since 2026-10-13, board
// decision). Visitors who aren't current members get the page's own banner
// and a sign-in / join notice; the page itself isn't rendered, so it fetches
// nothing for them. Current members (own dues, an organization seat, or the
// 90-day grace window) and admins get the page as before. The homepage keeps
// linking here on purpose: its headlines and cards are the teaser.
//
// This locks the page, not the data: news and job rows stay publicly
// readable in the database because the homepage shows news headlines to
// everyone.
//
// `head` must match the wrapped page's own PageHead so the banner (and any
// wording the board has edited under that id) doesn't change on sign-in.
export default function MembersOnly({
  head,
  what,
  children,
}: {
  head: { id: string; eyebrow: string; title: string; sub?: string };
  what: string;
  children: ReactNode;
}) {
  const status = useMemberStatus();
  if (status.checked && status.current) return <>{children}</>;
  return (
    <>
      <PageHead {...head} />
      <section className="py-20 bg-paper min-h-[40vh]">
        <div className="wrap max-w-[760px]">
          {!status.checked ? (
            <div className="card p-8 text-muted text-[15px]" role="status">
              Checking your membership…
            </div>
          ) : (
            <div className="card p-8 md:p-10 border-t-[3px] border-t-brand-gold/70">
              <p className="eyebrow mb-2">Members only</p>
              <h2 className="font-disp font-bold uppercase text-[clamp(26px,3.4vw,36px)] leading-none mb-3">
                {status.signedIn ? 'For current members' : 'Sign in to continue'}
              </h2>
              <p className="text-muted text-[16px] max-w-[60ch] mb-7">
                {status.signedIn
                  ? `${what} is for current FAEMSE members. Renew your membership to open it again.`
                  : `${what} is for FAEMSE members. Sign in with your member login, or join to get access.`}
              </p>
              <div className="flex flex-wrap gap-3">
                {status.signedIn ? (
                  <Link to="/membership" className="btn-red">
                    Renew your membership
                  </Link>
                ) : (
                  <>
                    <Link to="/login" className="btn-red">
                      Member sign in
                    </Link>
                    <Link to="/membership" className="btn-outline">
                      Join FAEMSE
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
