import { useEffect, useState } from 'react';
import type { Application, ContactMessage, Payment, Profile } from '../lib/portal';
import { dollars, duesCents, formatDate, PAYMENT_METHODS } from '../lib/portal';
import { supabase } from '../lib/supabase';
import AddPerson from './AddPerson';
import ContactsAdmin from './ContactsAdmin';
import { DuesLedger, ListservExport, MemberImport, OnlineDuesSwitch, RemindersSwitch } from './DuesAdmin';
import OrganizationsAdmin from './OrganizationsAdmin';

const statusChip: Record<Application['status'], string> = {
  new: 'text-[#1A47B8] bg-[#E7EEFF]',
  approved: 'text-[#0E7A4A] bg-[#E2F7EC]',
  declined: 'text-muted bg-paper',
};

function MemberRow({ member, orgs, onSaved }: { member: Profile; orgs: string[]; onSaved: () => void }) {
  const [expires, setExpires] = useState(member.expires_at ?? '');
  const [tier, setTier] = useState(member.tier ?? 'active');
  const [role, setRole] = useState<'member' | 'admin'>(member.role ?? 'member');
  const [onList, setOnList] = useState(!member.listserv_opt_out);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  // A recorded payment moves the date server-side; show the new one.
  useEffect(() => {
    setExpires(member.expires_at ?? '');
  }, [member.expires_at]);
  useEffect(() => {
    setOnList(!member.listserv_opt_out);
  }, [member.listserv_opt_out]);

  async function save() {
    setSaving(true);
    setErr('');
    const { error } = await supabase.rpc('admin_set_member', {
      p_target: member.id,
      p_expires: expires || null,
      p_tier: tier,
      p_role: role,
    });
    const { error: extraErr } = error
      ? { error }
      : await supabase.rpc('admin_update_profile', { p_target: member.id, p_patch: { listserv_opt_out: !onList } });
    setSaving(false);
    if (error || extraErr) setErr((error ?? extraErr)?.message ?? 'Could not save');
    else onSaved();
  }

  // "Record payment": one click extends the term twelve months from the later
  // of today and the current paid-through date, and writes the ledger row.
  const [method, setMethod] = useState<Payment['method']>('check');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  async function recordPayment() {
    setPaying(true);
    setPayMsg('');
    const { data, error } = await supabase.rpc('admin_record_payment', {
      p_target: member.id,
      p_method: method,
      // Priced from the tier on file, not an unsaved change in the dropdown.
      p_amount_cents: method === 'waived' ? 0 : duesCents(member.tier),
      p_note: note.trim(),
      p_months: 12,
    });
    setPaying(false);
    if (error) setPayMsg(error.message);
    else {
      setPayMsg(`Recorded — paid through ${formatDate(String(data))}.`);
      setNote('');
      onSaved();
    }
  }

  const small = 'rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue';

  return (
    <div className="px-5 py-4 border-b border-line last:border-b-0">
    <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-3 items-center">
      <div className="min-w-0">
        <b className="block text-[14.5px] truncate">{member.full_name ?? '—'}</b>
        <span className="text-[13px] text-muted truncate block">{member.email}</span>
        {(member.job_title || member.agency || member.phone) && (
          <span className="text-[12px] text-muted truncate block">
            {[member.job_title, member.agency, member.phone].filter(Boolean).join(' · ')}
          </span>
        )}
        {orgs.length > 0 && (
          <span className="text-[12px] text-[#1A47B8] truncate block" title={orgs.join(', ')}>
            Represents {orgs.join(', ')}
          </span>
        )}
        <label className="flex items-center gap-1.5 text-[12px] text-muted mt-1">
          <input type="checkbox" checked={onList} onChange={(e) => setOnList(e.target.checked)} className="w-3.5 h-3.5 accent-brand-blue" />
          On the listserv{member.listserv_email ? ` (as ${member.listserv_email})` : ''}
        </label>
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
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-muted font-semibold">Record a payment:</span>
      <select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])} className={small} aria-label="Payment method">
        {PAYMENT_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (check #, date received…)"
        maxLength={200}
        className={`${small} w-[220px]`}
        aria-label="Payment note"
      />
      <button onClick={recordPayment} disabled={paying} className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-60">
        {paying ? 'Recording…' : `Record ${method === 'waived' ? 'waiver' : dollars(duesCents(member.tier))} · +1 year`}
      </button>
      {payMsg && (
        <span className={`font-semibold ${payMsg.startsWith('Recorded') ? 'text-[#0E7A4A]' : 'text-brand-red'}`} role="status">
          {payMsg}
        </span>
      )}
    </div>
    </div>
  );
}

export default function AdminPanel() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  // Which organizations each member represents, for the badge on their row.
  const [orgsByProfile, setOrgsByProfile] = useState<Map<string, string[]>>(new Map());
  const [showHandled, setShowHandled] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [loadError, setLoadError] = useState('');
  // Bumped after any payment or import so the ledger and member list refetch.
  const [ledgerKey, setLedgerKey] = useState(0);

  async function load() {
    const [apps, mems, msgs, seats] = await Promise.all([
      supabase.from('membership_applications').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.rpc('admin_list_members'),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('organization_members').select('profile_id, organizations(name)'),
    ]);
    if (apps.error || mems.error) {
      setLoadError((apps.error ?? mems.error)?.message ?? 'Could not load admin data.');
      return;
    }
    setApplications((apps.data ?? []) as Application[]);
    setMembers(((mems.data ?? []) as Profile[]).slice().sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')));
    // Messages need the Sept 2026 migration; until it runs, just show none.
    if (!msgs.error) setMessages((msgs.data ?? []) as ContactMessage[]);
    if (!seats.error) {
      const map = new Map<string, string[]>();
      for (const s of (seats.data ?? []) as { profile_id: string; organizations: { name: string } | { name: string }[] | null }[]) {
        const o = Array.isArray(s.organizations) ? s.organizations[0] : s.organizations;
        if (o?.name) map.set(s.profile_id, [...(map.get(s.profile_id) ?? []), o.name]);
      }
      setOrgsByProfile(map);
    }
    setLedgerKey((k) => k + 1);
  }

  const visibleMembers = members.filter((m) => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return true;
    return [m.full_name, m.email, m.agency, m.job_title, ...(orgsByProfile.get(m.id) ?? [])].some((v) => (v ?? '').toLowerCase().includes(q));
  });

  // A renewal form from someone who already has a member record: one button
  // approves it and records the payment (the board clicks it once the check
  // or transfer is in hand).
  const memberByEmail = new Map(members.map((m) => [String(m.email ?? '').toLowerCase(), m]));
  async function approvePaid(a: Application) {
    const m = memberByEmail.get(a.email.toLowerCase());
    if (!m) return;
    const { error } = await supabase.rpc('admin_record_payment', {
      p_target: m.id,
      p_method: 'other',
      p_amount_cents: duesCents(m.tier),
      p_note: `Renewal form ${formatDate(a.created_at)}`,
      p_months: 12,
    });
    if (error) {
      setLoadError(error.message);
      return;
    }
    await setAppStatus(a.id, 'approved');
    load();
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
        Review applications, manage member records, and record dues. Approving an application does not
        create the member&apos;s login on its own — use &ldquo;Add a person&rdquo; below for that, then record
        their payment here. Membership runs twelve months from the later of today and the current
        paid-through date.
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
                    {a.kind === 'renew' && memberByEmail.has(a.email.toLowerCase()) && (
                      <button
                        onClick={() => approvePaid(a)}
                        className="btn-outline !py-1.5 !px-3.5 text-[12.5px]"
                        title="Records the dues payment and extends their membership a year"
                      >
                        Paid · +1 year
                      </button>
                    )}
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

      <AddPerson onAdded={load} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted">
          Members
          {members.length > 0 && <span className="ml-2 font-body normal-case tracking-normal text-[12.5px] font-normal">{members.length} logins</span>}
        </h3>
        {members.length > 8 && (
          <input
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            placeholder="Find by name, email, organization…"
            className="rounded-lg border border-line px-3 py-1.5 text-[13.5px] outline-none focus:border-brand-blue w-[280px]"
            aria-label="Filter members"
          />
        )}
      </div>
      {members.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-8">No member records yet.</p>
      ) : visibleMembers.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-8">Nobody matches &ldquo;{memberFilter}&rdquo;.</p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-8">
          {visibleMembers.map((m) => (
            <MemberRow key={m.id} member={m} orgs={orgsByProfile.get(m.id) ?? []} onSaved={load} />
          ))}
        </div>
      )}

      <OrganizationsAdmin members={members} refreshKey={ledgerKey} onChanged={load} />

      <ContactsAdmin refreshKey={ledgerKey} />

      <MemberImport onImported={load} />

      <DuesLedger refreshKey={ledgerKey} />

      <ListservExport />

      <RemindersSwitch />

      <OnlineDuesSwitch />
    </div>
  );
}
