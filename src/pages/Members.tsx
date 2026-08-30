import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import PageHead from '../components/PageHead';
import { resourceCategories } from '../content/data';
import { supabase } from '../lib/supabase';

export default function Members() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
      if (!data.session) navigate('/login', { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) navigate('/login', { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!checked || !session) return null;

  const firstName =
    (session.user.user_metadata?.first_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'member';

  return (
    <>
      <PageHead
        eyebrow="Member portal"
        title={`Welcome, ${firstName}`}
        sub="Your member home — resources, meetings, and association business in one place."
      />
      <section className="py-16 bg-paper">
        <div className="wrap">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <p className="text-muted text-[15px]">
              Signed in as <b className="text-body">{session.user.email}</b>
              <span className="ml-3 inline-block align-middle text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-brand-goldink bg-[#FBF3D9]">
                Member
              </span>
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="btn-outline !py-2.5 !px-5 text-[14px]"
            >
              Sign out
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: 'Quarterly meetings',
                text: 'Agendas, minutes, and Zoom links for statewide membership meetings will post here.',
                cta: { label: 'See the calendar →', to: '/events' },
              },
              {
                title: 'Member documents',
                text: 'Bylaws, committee rosters, and association business — the file library is being stocked now.',
                cta: { label: 'Read the bylaws →', to: '/bylaws' },
              },
              {
                title: 'Educator of the Year',
                text: 'Nominations for the seven award categories open to Active members each cycle.',
                cta: { label: 'About the award →', to: '/about' },
              },
            ].map((c) => (
              <div key={c.title} className="card p-7 border-t-[3px] border-t-brand-gold/70">
                <h2 className="font-disp font-bold uppercase text-xl mb-2">{c.title}</h2>
                <p className="text-muted text-[14.5px] mb-4">{c.text}</p>
                <Link to={c.cta.to} className="font-bold text-brand-blue hover:underline text-[14.5px]">
                  {c.cta.label}
                </Link>
              </div>
            ))}
          </div>

          <div className="card p-8">
            <h2 className="font-disp font-bold uppercase text-2xl mb-5">The reference shelf</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-7">
              {resourceCategories.map((cat) => (
                <div key={cat.category}>
                  <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-3">
                    {cat.category}
                  </h3>
                  <ul className="space-y-2 text-[14.5px]">
                    {cat.links.map((l) => (
                      <li key={l.name}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-brand-blue hover:underline"
                        >
                          {l.name} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
