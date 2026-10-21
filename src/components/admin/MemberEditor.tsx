import { useEffect, useState } from 'react';
import type { Payment, Profile } from '../../lib/portal';
import { dollars, duesCents, formatDate, PAYMENT_METHODS } from '../../lib/portal';
import { supabase } from '../../lib/supabase';

// The editor that opens under a person's row in the People table: the same
// controls the old full-height member row carried (paid-through, tier, role,
// listserv, record a payment), now shown only for the row the admin clicked.
// Since Oct 2026 it can also change the person's login email (LoginEmail).

const small = 'rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue bg-white';

export default function MemberEditor({ member, onSaved }: { member: Profile; onSaved: () => void }) {
  const [expires, setExpires] = useState(member.expires_at ?? '');
  const [tier, setTier] = useState(member.tier ?? 'active');
  const [role, setRole] = useState<'member' | 'admin'>(member.role ?? 'member');
  const [onList, setOnList] = useState(!member.listserv_opt_out);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
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
    else {
      setSaved(true);
      onSaved();
    }
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

  const details = [
    member.job_title ? `Job title: ${member.job_title}` : '',
    member.agency ? `Organization: ${member.agency}` : '',
    member.county ? `County: ${member.county}` : '',
    member.phone ? `Phone: ${member.phone}` : '',
    member.cert_level ? `Certification: ${member.cert_level}` : '',
    member.listserv_email ? `Listserv address: ${member.listserv_email}` : '',
  ].filter(Boolean);

  return (
    <div className="bg-paper/70 border-t border-line px-5 py-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
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
        <label className="flex items-center gap-1.5 text-[13px] font-semibold pb-2 whitespace-nowrap">
          <input type="checkbox" checked={onList} onChange={(e) => setOnList(e.target.checked)} className="w-3.5 h-3.5 accent-brand-blue" />
          On the listserv
        </label>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && !err && (
            <span className="text-[#0E7A4A] text-[12.5px] font-semibold" role="status">
              Saved
            </span>
          )}
        </div>
      </div>
      {err && (
        <p className="text-brand-redink text-[12.5px] font-semibold mt-2" role="alert">
          {err}
        </p>
      )}

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
          className={`${small} w-[220px] max-w-full`}
          aria-label="Payment note"
        />
        <button onClick={recordPayment} disabled={paying} className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-60">
          {paying ? 'Recording…' : `Record ${method === 'waived' ? 'waiver' : dollars(duesCents(member.tier))} · +1 year`}
        </button>
        {payMsg && (
          <span className={`font-semibold ${payMsg.startsWith('Recorded') ? 'text-[#0E7A4A]' : 'text-brand-redink'}`} role="status">
            {payMsg}
          </span>
        )}
      </div>

      <LoginEmail member={member} onChanged={onSaved} />

      {details.length > 0 && (
        <p className="mt-3 text-[12.5px] text-muted flex flex-wrap gap-x-4 gap-y-1">
          {details.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </p>
      )}
    </div>
  );
}

// The login email is what the person signs in with. Changing it needs the
// service-role key, so it goes through the change-login-email function, which
// checks the caller is an admin. Optionally sends the usual set-password link
// (the sign-in page's "Forgot password" email) to the new address.
function LoginEmail({ member, onChanged }: { member: Profile; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sendLink, setSendLink] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function change() {
    const next = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) return setErr('Enter a full email address.');
    if (next === (member.email ?? '').toLowerCase()) return setErr('That is already their login email.');
    const who = member.full_name || member.email || 'this person';
    if (!window.confirm(`Change ${who}'s login from ${member.email} to ${next}? From now on they sign in with the new address only.`)) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const { data, error } = await supabase.functions.invoke('change-login-email', { body: { profile_id: member.id, email: next } });
    const failure = (data as { error?: string } | null)?.error ?? (error ? 'Could not change it. If this keeps happening, the change-login-email function may not be set up yet.' : '');
    if (failure) {
      setBusy(false);
      return setErr(failure);
    }
    let linkNote = '';
    if (sendLink) {
      const { error: linkErr } = await supabase.functions.invoke('password-link', { body: { email: next } });
      linkNote = linkErr ? ' The set-password email could not be sent; they can use "Forgot password".' : ' A set-password link is on its way to the new address.';
    }
    setBusy(false);
    setOpen(false);
    setEmail('');
    setMsg(`Login changed to ${next}.${linkNote}`);
    onChanged();
  }

  return (
    <div className="mt-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted font-semibold">Login email:</span>
        <span className="font-mono text-[12.5px]">{member.email ?? 'none'}</span>
        {!open && (
          <button onClick={() => setOpen(true)} className="font-semibold text-brand-blue hover:underline">
            Change
          </button>
        )}
        {msg && (
          <span className="text-[#0E7A4A] font-semibold" role="status">
            {msg}
          </span>
        )}
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="new.address@example.org"
            aria-label="New login email"
            className={`${small} w-[260px] max-w-full`}
            autoComplete="off"
          />
          <label className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <input type="checkbox" checked={sendLink} onChange={(e) => setSendLink(e.target.checked)} className="w-3.5 h-3.5 accent-brand-blue" />
            Email a set-password link to the new address
          </label>
          <button onClick={change} disabled={busy} className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-60">
            {busy ? 'Changing…' : 'Change login email'}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setErr('');
            }}
            className="text-[12.5px] font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}
      {err && (
        <p className="text-brand-redink font-semibold text-[12.5px] mt-1.5" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
