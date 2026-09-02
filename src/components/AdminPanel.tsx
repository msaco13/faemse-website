import { useEffect, useState } from 'react';
import type { Application, ContactMessage, Profile } from '../lib/portal';
import { formatDate } from '../lib/portal';
import { supabase } from '../lib/supabase';

const statusChip: Record<Application['status'], string> = {
  new: 'text-[#1A47B8] bg-[#E7EEFF]',
  approved: 'text-[#0E7A4A] bg-[#E2F7EC]',
  declined: 'text-muted bg-paper',
};

function MemberRow({ member, onSaved }: { member: Profile; onSaved: () => void }) {
  const [expires, setExpires] = useState(member.expires_at ?? '');
  const [tier, setTier] = useState(member.tier ?? 'active');
  const [role, setRole] = useState<'member' | 'admin'>(member.role ?? 'member');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true);
    setErr('');
    const { error } = await supabase.rpc('admin_set_member', {
      p_target: member.id,
      p_expires: expires || null,
      p_tier: tier,
      p_role: role,
    });
    setSaving(false);
    if (error) setErr(error.message);
    else onSaved();
  }

  const small = 'rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue';

  return (
    <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 border-b border-line last:border-b-0">
      <div className="min-w-0">
        <b className="block text-[14.5px] truncate">{member.full_name ?? '—'}</b>
        <span className="text-[13px] text-muted truncate block">{member.email}</span>
      </div>
      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Paid through</span>
        <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${small} w-full`} />
      </label>
      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Tier</span>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className={`${small} w-full`}>
          <option value="active">Active</option>
          <option value="institutional">Institutional</option>
          <option value="corporate">Corporate</option>
          <option value="participant">Participant</option>
          <option value="honorary">Honorary</option>
        </select>
      </label>
      <label className="block">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Role</span>
        <select value={role} onChange={(e) => setRole(e.target.value as 'member' | 'admin')} className={`${small} w-full`}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div>
        <button onClick={save} disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {err && (
          <p className="text-brand-red text-[12px] font-semibold mt-1" role="alert">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [showHandled, setShowHandled] = useState(false);
  const [loadError, setLoadError] = useState('');

  async function load() {
    const [apps, mems, msgs] = await Promise.all([
      supabase.from('membership_applications').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.rpc('admin_list_members'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (apps.error || mems.error) {
      setLoadError((apps.error ?? mems.error)?.message ?? 'Could not load admin data.');
      return;
    }
    setApplications((apps.data ?? []) as Application[]);
    setMembers((mems.data ?? []) as Profile[]);
    // Messages need the Sept 2026 migration; until it runs, just show none.
    if (!msgs.error) setMessages((msgs.data ?? []) as ContactMessage[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function setHandled(id: string, handled: boolean) {
    const { error } = await supabase.from('contact_messages').update({ handled }).eq('id', id);
    if (!error) setMessages((list) => list.map((m) => (m.id === id ? { ...m, handled } : m)));
  }

  async function setAppStatus(id: string, status: Application['status']) {
    const { error } = await supabase.from('membership_applications').update({ status }).eq('id', id);
    if (!error) setApplications((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <div className="card p-8 mb-10 border-t-[3px] border-t-brand-red/60">
      <div className="flex items-baseline gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Board admin</h2>
        <span className="text-[11px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full text-brand-red bg-[#FDEAEB]">
          Admins only
        </span>
      </div>
      <p className="text-muted text-[14px] mb-6">
        Review applications and manage member records. Approving an application does not create the
        member&apos;s login — add their account under Authentication → Users in Supabase, then set
        their record here.
      </p>
      {loadError && (
        <p className="text-brand-red font-semibold text-[14px] mb-4" role="alert">
          {loadError}
        </p>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted">
          Contact-form messages
          {messages.filter((m) => !m.handled).length > 0 && (
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full text-brand-red bg-[#FDEAEB]">
              {messages.filter((m) => !m.handled).length} new
            </span>
          )}
        </h3>
        {messages.some((m) => m.handled) && (
          <button onClick={() => setShowHandled(!showHandled)} className="text-muted font-semibold text-[12.5px] hover:text-ink">
            {showHandled ? 'Hide handled' : 'Show handled'}
          </button>
        )}
      </div>
      {messages.filter((m) => showHandled || !m.handled).length === 0 ? (
        <p className="text-muted text-[14.5px] mb-8">
          {messages.length === 0 ? 'No messages yet — anything sent through the Contact page lands here.' : 'All caught up — every message is handled.'}
        </p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-8">
          {messages
            .filter((m) => showHandled || !m.handled)
            .map((m) => (
              <div key={m.id} className={`px-5 py-4 border-b border-line last:border-b-0 ${m.handled ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <b className="text-[14.5px]">
                    {m.subject || '(no subject)'}
                    <span className="ml-2 font-normal text-muted text-[13px]">
                      from {m.name} · {m.email}
                    </span>
                  </b>
                  <span className="text-[13px] text-muted">{formatDate(m.created_at)}</span>
                </div>
                <p className="text-[14px] text-body whitespace-pre-line max-w-[80ch] mb-2">{m.message}</p>
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'your message to FAEMSE'}`)}`}
                    className="btn-outline !py-1.5 !px-3.5 text-[12.5px]"
                  >
                    Reply by email
                  </a>
                  <button onClick={() => setHandled(m.id, !m.handled)} className="text-muted font-semibold text-[12.5px] hover:text-ink">
                    {m.handled ? 'Mark as new' : 'Mark handled'}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-3">
        Applications
      </h3>
      {applications.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-8">No applications yet — they&apos;ll appear here as people apply.</p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-8">
          {applications.map((a) => (
            <div key={a.id} className="grid md:grid-cols-[1.5fr_1fr_auto] gap-3 items-center px-5 py-4 border-b border-line last:border-b-0">
              <div className="min-w-0">
                <b className="block text-[14.5px]">
                  {a.full_name}
                  <span className="ml-2 font-normal text-muted text-[13px]">
                    {a.kind === 'renew' ? 'renewal' : 'new'} · {a.tier}
                  </span>
                </b>
                <span className="text-[13px] text-muted block truncate">
                  {a.email}
                  {a.organization ? ` · ${a.organization}` : ''}
                  {a.county ? ` · ${a.county}` : ''}
                </span>
                {a.note && <span className="text-[13px] text-muted block truncate">&ldquo;{a.note}&rdquo;</span>}
              </div>
              <span className="text-[13px] text-muted">{formatDate(a.created_at)}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold tracking-[0.09em] uppercase px-2.5 py-1 rounded-full ${statusChip[a.status]}`}>
                  {a.status}
                </span>
                {a.status === 'new' && (
                  <>
                    <button onClick={() => setAppStatus(a.id, 'approved')} className="btn-outline !py-1.5 !px-3.5 text-[12.5px]">
                      Approve
                    </button>
                    <button onClick={() => setAppStatus(a.id, 'declined')} className="text-muted font-semibold text-[12.5px] hover:text-ink">
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-3">
        Members
      </h3>
      {members.length === 0 ? (
        <p className="text-muted text-[14.5px]">No member records yet.</p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}
