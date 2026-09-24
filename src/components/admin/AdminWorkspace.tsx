import { useEffect, useState } from 'react';
import type { Application, ContactMessage, Profile } from '../../lib/portal';
import { useSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import ContactsAdmin from '../ContactsAdmin';
import ContentManager from '../ContentManager';
import { DuesLedger, ListservExport, MemberImport, OnlineDuesSwitch, RemindersSwitch } from '../DuesAdmin';
import OrganizationsAdmin from '../OrganizationsAdmin';
import PostingsManager from '../PostingsManager';
import InboxPane from './InboxPane';
import PeoplePane, { type SeatInfo } from './PeoplePane';

// The board's workspace on the Members page: five areas behind a rail of
// tabs instead of one very long card. Every control from the old Board
// admin, Site content and Boards & library cards is here under the same
// wording; only the arrangement changed (Sept 2026).

type Tab = 'inbox' | 'people' | 'orgs' | 'content' | 'tools';
const TABS: Tab[] = ['inbox', 'people', 'orgs', 'content', 'tools'];
const LABEL: Record<Tab, string> = { inbox: 'Inbox', people: 'People', orgs: 'Organizations', content: 'Site content', tools: 'Dues & tools' };

// The tab lives in the URL hash so links can point at an area
// (/members#people). "#boards" is the older anchor the homepage's edit-mode
// note uses for the spotlights panel; it opens Site content.
function tabFromHash(): Tab {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
  if (h === 'boards') return 'content';
  return (TABS as string[]).includes(h) ? (h as Tab) : 'inbox';
}

export default function AdminWorkspace() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [applications, setApplications] = useState<Application[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [seatsByProfile, setSeatsByProfile] = useState<Map<string, SeatInfo[]>>(new Map());
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  // Bumped after any change so the ledger, organizations and contacts refetch.
  const [refreshKey, setRefreshKey] = useState(0);
  const settings = useSettings();

  async function load() {
    const [apps, mems, msgs, seats, orgs] = await Promise.all([
      supabase.from('membership_applications').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.rpc('admin_list_members'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('organization_members').select('profile_id, organizations(name, expires_at)'),
      supabase.from('organizations').select('id'),
    ]);
    if (apps.error || mems.error) {
      setLoadError((apps.error ?? mems.error)?.message ?? 'Could not load admin data.');
      return;
    }
    setLoadError('');
    setApplications((apps.data ?? []) as Application[]);
    setMembers(((mems.data ?? []) as Profile[]).slice().sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')));
    if (!msgs.error) setMessages((msgs.data ?? []) as ContactMessage[]);
    if (!seats.error) {
      const map = new Map<string, SeatInfo[]>();
      type Row = { profile_id: string; organizations: SeatInfo | SeatInfo[] | null };
      for (const s of (seats.data ?? []) as Row[]) {
        const o = Array.isArray(s.organizations) ? s.organizations[0] : s.organizations;
        if (o?.name) map.set(s.profile_id, [...(map.get(s.profile_id) ?? []), { name: o.name, expires_at: o.expires_at ?? null }]);
      }
      setSeatsByProfile(map);
    }
    if (!orgs.error) setOrgCount((orgs.data ?? []).length);
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    load();
  }, []);

  // Follow the hash when it changes (the hero's "this slide is a spotlight"
  // note links to /members#boards from another page).
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function go(t: Tab) {
    setTab(t);
    try {
      window.history.replaceState(null, '', `#${t}`);
    } catch {
      /* the tab still switches */
    }
  }

  const inboxCount = applications.filter((a) => a.status === 'new').length + messages.filter((m) => !m.handled).length;
  const counts: Partial<Record<Tab, { n: number; alert?: boolean }>> = {
    inbox: { n: inboxCount, alert: inboxCount > 0 },
    people: { n: members.length },
    orgs: { n: orgCount ?? 0 },
  };

  return (
    <div className="card mb-10 border-t-[3px] border-t-brand-red/60 overflow-hidden">
      <div className="grid md:grid-cols-[210px_1fr]">
        <nav className="bg-ink text-[#AFC1E2] p-3 md:p-4 md:min-h-full flex md:flex-col flex-wrap gap-1" role="tablist" aria-label="Board admin areas">
          <div className="hidden md:block px-2.5 pb-3 mb-2 border-b border-white/10">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-brand-goldsoft">Board admin</span>
            <span className="text-[12px]">Admins only</span>
          </div>
          {TABS.map((t) => {
            const c = counts[t];
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                id={`admin-tab-${t}`}
                aria-selected={active}
                aria-controls={`admin-pane-${t}`}
                onClick={() => go(t)}
                className={`flex items-center justify-between gap-2 text-left font-semibold text-[13.5px] px-3 py-2 rounded-lg transition-colors ${
                  active ? 'bg-white/10 text-white shadow-[inset_3px_0_0_#F5CE5A] md:shadow-[inset_3px_0_0_#F5CE5A]' : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                {LABEL[t]}
                {c && (c.n > 0 || t !== 'inbox') && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.alert ? 'bg-brand-red text-white' : 'bg-white/15 text-white'}`}>{c.n}</span>
                )}
              </button>
            );
          })}
          <div className="hidden md:block mt-auto pt-3 border-t border-white/10 text-[11.5px] px-2.5">
            Online dues <b className="text-brand-goldsoft">{settings.online_dues ? 'On' : 'Off'}</b> · Reminders{' '}
            <b className="text-brand-goldsoft">{settings.reminders_paused ? 'Held' : 'Running'}</b>
          </div>
        </nav>

        <div className="p-5 md:p-7 min-w-0">
          {loadError && (
            <p className="text-brand-red font-semibold text-[14px] mb-4" role="alert">
              {loadError}
            </p>
          )}

          <section id="admin-pane-inbox" role="tabpanel" aria-labelledby="admin-tab-inbox" hidden={tab !== 'inbox'}>
            <InboxPane applications={applications} messages={messages} members={members} onChanged={load} onError={setLoadError} />
          </section>

          <section id="admin-pane-people" role="tabpanel" aria-labelledby="admin-tab-people" hidden={tab !== 'people'}>
            <PeoplePane members={members} seatsByProfile={seatsByProfile} onChanged={load} />
          </section>

          <section id="admin-pane-orgs" role="tabpanel" aria-labelledby="admin-tab-orgs" hidden={tab !== 'orgs'}>
            {tab === 'orgs' && <OrganizationsAdmin members={members} refreshKey={refreshKey} onChanged={load} />}
          </section>

          <section id="admin-pane-content" role="tabpanel" aria-labelledby="admin-tab-content" hidden={tab !== 'content'}>
            {tab === 'content' && (
              <div className="admin-embedded">
                <ContentManager />
                <PostingsManager />
              </div>
            )}
          </section>

          <section id="admin-pane-tools" role="tabpanel" aria-labelledby="admin-tab-tools" hidden={tab !== 'tools'}>
            {tab === 'tools' && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
                  <h3 className="font-disp font-bold uppercase text-2xl">Dues &amp; tools</h3>
                  <p className="text-muted text-[13px]">The things you touch a few times a year, out of the daily path.</p>
                </div>
                <p className="text-muted text-[13.5px] mb-6 max-w-[80ch]">
                  Membership runs twelve months from the later of today and the current paid-through date, whichever way a payment is
                  recorded.
                </p>
                <DuesLedger refreshKey={refreshKey} />
                <ListservExport />
                <ContactsAdmin refreshKey={refreshKey} />
                <MemberImport onImported={load} />
                <RemindersSwitch />
                <OnlineDuesSwitch />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
