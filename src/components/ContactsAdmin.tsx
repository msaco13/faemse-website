import { useEffect, useState } from 'react';
import type { Contact } from '../lib/portal';
import { supabase } from '../lib/supabase';

// People on the listserv who have no login: the state regulators who are not
// members (board decision, Sept 2026: listserv only), and members whose
// email the board is still tracking down. Once a member's email turns up,
// add them with "Add a person" and delete the contact.

const kindLabel: Record<Contact['kind'], string> = { regulatory: 'Regulatory', honorary: 'Honorary member', other: 'Other' };
const small = 'rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue';

function ContactRow({ c, onChanged }: { c: Contact; onChanged: () => void }) {
  const [email, setEmail] = useState(c.email ?? '');
  const [optOut, setOptOut] = useState(c.listserv_opt_out);
  const [err, setErr] = useState('');
  useEffect(() => {
    setEmail(c.email ?? '');
    setOptOut(c.listserv_opt_out);
  }, [c.email, c.listserv_opt_out]);

  async function save() {
    setErr('');
    const { error } = await supabase.from('contacts').update({ email: email.trim().toLowerCase() || null, listserv_opt_out: optOut }).eq('id', c.id);
    if (error) setErr(error.message);
    else onChanged();
  }
  async function remove() {
    if (!window.confirm(`Remove ${c.full_name} from the contacts list?`)) return;
    const { error } = await supabase.from('contacts').delete().eq('id', c.id);
    if (error) setErr(error.message);
    else onChanged();
  }
  const dirty = (email.trim().toLowerCase() || null) !== (c.email ?? null) || optOut !== c.listserv_opt_out;

  return (
    <div className="px-5 py-3 border-b border-line last:border-b-0 grid md:grid-cols-[1.3fr_1.4fr_auto_auto] gap-3 items-center">
      <div className="min-w-0">
        <b className="block text-[14px] truncate">{c.full_name}</b>
        <span className="block text-[12.5px] text-muted truncate">
          {kindLabel[c.kind]}
          {c.organization ? ` · ${c.organization}` : ''}
          {c.job_title ? ` · ${c.job_title}` : ''}
        </span>
        {c.notes && <span className="block text-[12px] text-muted truncate">{c.notes}</span>}
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="No email yet" className={`${small} w-full`} aria-label={`Email for ${c.full_name}`} />
      <label className="flex items-center gap-2 text-[13px] whitespace-nowrap">
        <input type="checkbox" checked={!optOut} onChange={(e) => setOptOut(!e.target.checked)} className="w-4 h-4 accent-brand-blue" />
        On listserv
      </label>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={!dirty} className="btn-outline !py-1.5 !px-3.5 text-[12.5px] disabled:opacity-40">
          Save
        </button>
        <button onClick={remove} className="text-muted font-semibold text-[12.5px] hover:text-brand-red">
          Remove
        </button>
      </div>
      {err && (
        <p className="md:col-span-4 text-brand-red text-[12.5px] font-semibold" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

export default function ContactsAdmin({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Contact[]>([]);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [kind, setKind] = useState<Contact['kind']>('other');

  useEffect(() => {
    supabase
      .from('contacts')
      .select('*')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setRows((data ?? []) as Contact[]);
      });
  }, [refreshKey, tick]);

  async function add() {
    if (!name.trim()) return;
    setErr('');
    const { error } = await supabase.from('contacts').insert({
      full_name: name.trim(),
      email: email.trim().toLowerCase() || null,
      organization: org.trim() || null,
      kind,
    });
    if (error) setErr(error.message);
    else {
      setName('');
      setEmail('');
      setOrg('');
      setTick((t) => t + 1);
    }
  }

  return (
    <details className="border border-line rounded-2xl p-5 mb-8 group">
      <summary className="cursor-pointer list-none">
        <b className="text-[14.5px]">Listserv-only contacts{rows.length ? ` (${rows.length})` : ''}</b>
        <span className="block text-muted text-[13.5px] mt-1 max-w-[76ch]">
          People who get the listserv but have no portal login: the state EMS office contacts, and members whose email
          is still missing. Fill in an email here to put someone on the listserv export; when a member&apos;s email
          turns up, add them with &ldquo;Add a person&rdquo; and remove them from this list.
        </span>
      </summary>
      <div className="mt-4">
        {err && (
          <p className="text-brand-red font-semibold text-[13px] mb-3" role="alert">
            {err}
          </p>
        )}
        {rows.length > 0 && (
          <div className="border border-line rounded-2xl overflow-hidden mb-4">
            {rows.map((c) => (
              <ContactRow key={c.id} c={c} onChanged={() => setTick((t) => t + 1)} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={200} className={`${small} w-[200px]`} aria-label="Contact name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" maxLength={254} className={`${small} w-[240px]`} aria-label="Contact email" />
          <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organization" maxLength={200} className={`${small} w-[220px]`} aria-label="Contact organization" />
          <select value={kind} onChange={(e) => setKind(e.target.value as Contact['kind'])} className={small} aria-label="Contact kind">
            <option value="regulatory">Regulatory</option>
            <option value="honorary">Honorary member</option>
            <option value="other">Other</option>
          </select>
          <button onClick={add} disabled={!name.trim()} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
            Add contact
          </button>
        </div>
      </div>
    </details>
  );
}
