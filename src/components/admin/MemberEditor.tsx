import { useEffect, useState } from 'react';
import type { Payment, Profile } from '../../lib/portal';
import { dollars, duesCents, formatDate, PAYMENT_METHODS } from '../../lib/portal';
import { supabase } from '../../lib/supabase';

// The editor that opens under a person's row in the People table: the same
// controls the old full-height member row carried (paid-through, tier, role,
// listserv, record a payment), now shown only for the row the admin clicked.

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
        <p className="text-brand-red text-[12.5px] font-semibold mt-2" role="alert">
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
          <span className={`font-semibold ${payMsg.startsWith('Recorded') ? 'text-[#0E7A4A]' : 'text-brand-red'}`} role="status">
            {payMsg}
          </span>
        )}
      </div>

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
