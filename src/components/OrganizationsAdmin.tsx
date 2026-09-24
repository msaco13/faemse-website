import { useEffect, useMemo, useState } from 'react';
import type { Organization, OrganizationMember, Payment, Profile } from '../lib/portal';
import { dateState, dollars, duesCents, formatDate, PAYMENT_METHODS, seatCap } from '../lib/portal';
import { matchesQuery } from '../lib/search';
import { supabase } from '../lib/supabase';

// Institutional and corporate memberships, which belong to an organization
// rather than a person. Each has a paid-through date, a coordinator (who gets
// the renewal reminders), and seats for representatives: five for
// institutional, three for corporate. A representative is a current member
// while the organization is, whether or not they hold a membership of their
// own. The seat cap is enforced in the database, not here.

const kindLabel: Record<Organization['kind'], string> = { institutional: 'Institutional', corporate: 'Corporate' };
const stateChip: Record<string, string> = {
  current: 'text-[#0E7A4A] bg-[#E2F7EC]',
  grace: 'text-brand-goldink bg-[#FBF3D9]',
  lapsed: 'text-brand-red bg-[#FDEAEB]',
  pending: 'text-muted bg-paper',
};
const stateText: Record<string, string> = { current: 'current', grace: 'renewal due', lapsed: 'lapsed', pending: 'no date' };

const small = 'rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue';

function OrgRow({
  org,
  seats,
  members,
  onChanged,
}: {
  org: Organization;
  seats: OrganizationMember[];
  members: Profile[];
  onChanged: () => void;
}) {
  const [expires, setExpires] = useState(org.expires_at ?? '');
  const [contact, setContact] = useState(org.contact_email ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [method, setMethod] = useState<Payment['method']>('check');
  const [note, setNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setExpires(org.expires_at ?? '');
    setContact(org.contact_email ?? '');
  }, [org.expires_at, org.contact_email]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const byEmail = useMemo(() => new Map(members.map((m) => [String(m.email ?? '').toLowerCase(), m])), [members]);
  const cap = seatCap(org.kind);
  const state = dateState(org.expires_at);

  async function save() {
    setSaving(true);
    setErr('');
    setMsg('');
    const { error } = await supabase.from('organizations').update({ expires_at: expires || null, contact_email: contact.trim().toLowerCase() || null }).eq('id', org.id);
    setSaving(false);
    if (error) setErr(error.message);
    else {
      setMsg('Saved.');
      onChanged();
    }
  }

  async function addSeat() {
    const m = byEmail.get(addEmail.trim().toLowerCase());
    setErr('');
    if (!m) {
      setErr('No member with that email yet. Add them with "Add a person" first, then seat them here.');
      return;
    }
    const { error } = await supabase.from('organization_members').insert({ organization_id: org.id, profile_id: m.id, role: seats.length === 0 ? 'coordinator' : 'representative' });
    if (error) setErr(error.message);
    else {
      setAddEmail('');
      onChanged();
    }
  }

  async function setRole(seat: OrganizationMember, role: OrganizationMember['role']) {
    const { error } = await supabase.from('organization_members').update({ role }).eq('id', seat.id);
    if (error) setErr(error.message);
    else onChanged();
  }

  async function removeSeat(seat: OrganizationMember) {
    const who = byId.get(seat.profile_id)?.full_name ?? 'this person';
    if (!window.confirm(`Remove ${who} from ${org.name}? They keep their login; they just stop being a representative.`)) return;
    const { error } = await supabase.from('organization_members').delete().eq('id', seat.id);
    if (error) setErr(error.message);
    else onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete ${org.name}'s ${org.kind} membership? Its representatives keep their logins. This cannot be undone.`)) return;
    const { error } = await supabase.from('organizations').delete().eq('id', org.id);
    if (error) setErr(error.message);
    else onChanged();
  }

  async function recordPayment() {
    setPaying(true);
    setMsg('');
    setErr('');
    const { data, error } = await supabase.rpc('admin_record_org_payment', {
      p_org: org.id,
      p_method: method,
      p_amount_cents: method === 'waived' ? 0 : duesCents(org.kind),
      p_note: note.trim(),
      p_months: 12,
    });
    setPaying(false);
    if (error) setErr(error.message);
    else {
      setMsg(`Recorded — paid through ${formatDate(String(data))}.`);
      setNote('');
      onChanged();
    }
  }

  return (
    <div className="px-5 py-4 border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setOpen(!open)} className="text-left min-w-0 flex-1" aria-expanded={open}>
          <b className="text-[14.5px]">{org.name}</b>
          <span className="ml-2 text-[11px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-full text-[#1A47B8] bg-[#E7EEFF]">{kindLabel[org.kind]}</span>
          <span className={`ml-2 text-[11px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-full ${stateChip[state]}`}>{stateText[state]}</span>
          <span className="block text-[13px] text-muted mt-0.5">
            {org.expires_at ? `Paid through ${formatDate(org.expires_at)}` : 'No paid-through date'} · {seats.length} of {cap} seats ·{' '}
            {seats.find((s) => s.role === 'coordinator') ? `coordinator ${byId.get(seats.find((s) => s.role === 'coordinator')!.profile_id)?.full_name ?? '—'}` : 'no coordinator'}
            <span className="ml-2 underline">{open ? 'hide' : 'manage'}</span>
          </span>
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid md:grid-cols-[1fr_1.4fr_auto] gap-3 items-end">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Paid through</span>
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${small} w-full`} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Billing contact email</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Gets the renewal reminders along with the coordinator" className={`${small} w-full`} />
            </label>
            <button onClick={save} disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Representatives</span>
            {seats.length === 0 && <p className="text-muted text-[13.5px] mb-2">Nobody seated yet.</p>}
            <ul className="space-y-1.5 mb-2">
              {seats.map((s) => {
                const p = byId.get(s.profile_id);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 text-[13.5px]">
                    <span>
                      <b>{p?.full_name ?? '—'}</b> <span className="text-muted">{p?.email}</span>
                    </span>
                    {s.role === 'coordinator' ? (
                      <span className="text-[11px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-full text-brand-goldink bg-[#FBF3D9]">Coordinator</span>
                    ) : (
                      <button onClick={() => setRole(s, 'coordinator')} className="text-muted font-semibold text-[12.5px] hover:text-ink underline">
                        make coordinator
                      </button>
                    )}
                    <button onClick={() => removeSeat(s)} className="text-muted font-semibold text-[12.5px] hover:text-brand-red">
                      remove
                    </button>
                  </li>
                );
              })}
            </ul>
            {seats.length < cap ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  list={`members-${org.id}`}
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="Member's email"
                  className={`${small} w-[260px]`}
                  aria-label="Email of the member to seat"
                />
                <datalist id={`members-${org.id}`}>
                  {members.map((m) => (
                    <option key={m.id} value={m.email ?? ''}>
                      {m.full_name ?? ''}
                    </option>
                  ))}
                </datalist>
                <button onClick={addSeat} disabled={!addEmail.trim()} className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-60">
                  Seat this member
                </button>
                <span className="text-[12.5px] text-muted">{cap - seats.length} seat{cap - seats.length === 1 ? '' : 's'} open</span>
              </div>
            ) : (
              <p className="text-[12.5px] text-muted">All {cap} seats are filled (the {org.kind} limit).</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted font-semibold">Record a payment:</span>
            <select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])} className={small} aria-label="Payment method">
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (check #, PO…)" maxLength={200} className={`${small} w-[220px]`} aria-label="Payment note" />
            <button onClick={recordPayment} disabled={paying} className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-60">
              {paying ? 'Recording…' : `Record ${method === 'waived' ? 'waiver' : dollars(duesCents(org.kind))} · +1 year`}
            </button>
            <button onClick={remove} className="ml-auto text-muted font-semibold text-[12.5px] hover:text-brand-red">
              Delete organization
            </button>
          </div>

          {msg && (
            <p className="text-[#0E7A4A] font-semibold text-[13px]" role="status">
              {msg}
            </p>
          )}
          {err && (
            <p className="text-brand-red font-semibold text-[13px]" role="alert">
              {err}
            </p>
          )}
          {org.notes && <p className="text-muted text-[12.5px]">Note: {org.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function OrganizationsAdmin({ members, refreshKey, onChanged }: { members: Profile[]; refreshKey: number; onChanged: () => void }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [seats, setSeats] = useState<OrganizationMember[]>([]);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Organization['kind']>('institutional');
  const [expires, setExpires] = useState('');
  const [adding, setAdding] = useState(false);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([supabase.from('organizations').select('*').order('name'), supabase.from('organization_members').select('*')]).then(([o, s]) => {
      if (o.error) setErr(o.error.message);
      else setOrgs((o.data ?? []) as Organization[]);
      if (!s.error) setSeats((s.data ?? []) as OrganizationMember[]);
    });
  }, [refreshKey, tick]);

  function changed() {
    setTick((t) => t + 1);
    onChanged();
  }

  async function add() {
    if (!name.trim()) return;
    setAdding(true);
    setErr('');
    const { error } = await supabase.from('organizations').insert({ name: name.trim(), kind, expires_at: expires || null });
    setAdding(false);
    if (error) setErr(error.message.includes('duplicate') ? `${name.trim()} already has a ${kind} membership.` : error.message);
    else {
      setName('');
      setExpires('');
      changed();
    }
  }

  const seatsFor = (id: string) => seats.filter((s) => s.organization_id === id);
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.full_name ?? '';
  // Search by organization name, kind, billing contact, coordinator, or any seated representative.
  const visible = orgs.filter((o) =>
    matchesQuery(query, [o.name, o.kind, o.contact_email, o.website, memberName(o.coordinator_id), ...seatsFor(o.id).map((s) => memberName(s.profile_id))]),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-disp font-bold uppercase text-2xl">
          Organizations
          <span className="ml-2 font-body normal-case tracking-normal text-[13px] font-normal text-muted">
            {orgs.length ? `${orgs.length} institutional and corporate memberships` : 'institutional and corporate memberships'}
          </span>
        </h3>
        {orgs.length > 5 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find by organization, coordinator, representative…"
            className={`${small} w-[300px] max-w-full`}
            aria-label="Find an organization"
          />
        )}
      </div>
      <p className="text-muted text-[13.5px] mb-3 max-w-[76ch]">
        An institutional membership seats up to five representatives, a corporate one up to three. Everyone seated is a
        current member while the organization is paid up, on top of any membership of their own. Renewal reminders go to
        the coordinator and the billing contact.
      </p>
      {err && (
        <p className="text-brand-red font-semibold text-[13px] mb-3" role="alert">
          {err}
        </p>
      )}
      {orgs.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-4">No organizations yet.</p>
      ) : visible.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-4">No organization matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="border border-line rounded-2xl overflow-hidden mb-4">
          {visible.map((o) => (
            <OrgRow key={o.id} org={o} seats={seatsFor(o.id)} members={members} onChanged={changed} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 mb-8">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">New organization</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name" maxLength={200} className={`${small} w-[260px]`} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Organization['kind'])} className={small}>
            <option value="institutional">Institutional — $250, 5 seats</option>
            <option value="corporate">Corporate — $200, 3 seats</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Paid through</span>
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={small} />
        </label>
        <button onClick={add} disabled={adding || !name.trim()} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
          {adding ? 'Adding…' : 'Add organization'}
        </button>
      </div>
    </>
  );
}
