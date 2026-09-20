import { useState } from 'react';
import { toISODate } from '../lib/dates';
import type { Profile } from '../lib/portal';
import { formatDate } from '../lib/portal';
import { supabase } from '../lib/supabase';

// "Add a person" — the one-at-a-time way to give somebody a member-portal
// login. The spreadsheet import below it is for a whole roster at once; this
// is for the single person the board just approved.
//
// No password is set here, by design: the new account has none, and the
// person sets their own with "Forgot password" on the sign-in page. That way
// a password is never typed by one person and emailed to another.
//
// Two server calls, both admin-gated: import-members (checks is_admin(),
// creates the login with the service role) and, only when Board admin is
// chosen, admin_set_member (checks is_admin() in the database). Access level
// is never granted by the import path itself, so a bulk roster paste can
// never hand out board access by accident.

const TIERS = [
  { value: 'active', label: 'Active' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'honorary', label: 'Honorary' },
] as const;

const ACCESS = [
  { value: 'member', label: 'Member', hint: 'Sees the member portal: bylaws, library, directory, Q&A, videos.' },
  { value: 'admin', label: 'Board admin', hint: 'Everything a member sees, plus editing the site, managing members, and recording payments.' },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function oneYearOut(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toISODate(d);
}

function pill(on: boolean): string {
  return `px-4 py-2 rounded-full font-bold text-[13.5px] border transition-colors ${
    on ? 'bg-ink text-white border-ink' : 'bg-white text-muted border-line hover:border-ink'
  }`;
}

export default function AddPerson({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<string>('active');
  const [expires, setExpires] = useState('');
  const [access, setAccess] = useState<'member' | 'admin'>('member');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  function reset() {
    setName('');
    setEmail('');
    setTier('active');
    setExpires('');
    setAccess('member');
  }

  async function add() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    setErr('');
    setDone('');
    if (!cleanName) {
      setErr('Enter their name.');
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setErr('That email address does not look right. Check for a typo.');
      return;
    }

    setBusy(true);
    // 1. Create the login and the profile row (or update it if the email is
    //    already on file).
    const { data, error } = await supabase.functions.invoke('import-members', {
      body: { rows: [{ email: cleanEmail, full_name: cleanName, tier, expires_at: expires }], dry_run: false },
    });
    if (error) {
      let msg = error.message;
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) msg = body.error;
      } catch {
        /* keep the generic message */
      }
      setBusy(false);
      setErr(msg);
      return;
    }
    const row = (data?.results ?? [])[0] as { status?: string; message?: string } | undefined;
    if (!row || row.status === 'error') {
      setBusy(false);
      setErr(row?.message ?? 'Could not add that person.');
      return;
    }

    // 2. Board admin is a second, deliberate step through the database's own
    //    admin gate. Find the profile the import just created or updated.
    let accessNote = '';
    if (access === 'admin') {
      const { data: members } = await supabase.rpc('admin_list_members');
      const found = ((members ?? []) as Profile[]).find((m) => String(m.email ?? '').toLowerCase() === cleanEmail);
      if (!found) {
        setBusy(false);
        setErr('Added, but the account could not be found to grant board access. Set Role to Admin on their row below.');
        onAdded();
        return;
      }
      const { error: roleErr } = await supabase.rpc('admin_set_member', {
        p_target: found.id,
        p_expires: expires || found.expires_at || null,
        p_tier: tier,
        p_role: 'admin',
      });
      if (roleErr) {
        setBusy(false);
        setErr(`Added as a member, but board access failed: ${roleErr.message}. Set Role to Admin on their row below.`);
        onAdded();
        return;
      }
      accessNote = ' with board admin access';
    }

    setBusy(false);
    const wasNew = row.status === 'created';
    setDone(
      `${cleanName} ${wasNew ? 'added' : 'was already on file and has been updated'}${accessNote}` +
        `${expires ? `, paid through ${formatDate(expires)}` : ', with no paid-through date yet'}. ` +
        `Tell them to go to faemse.org/login and click “Forgot password” to set their password.`,
    );
    reset();
    onAdded();
  }

  const input = 'mt-1.5 w-full rounded-xl border border-line px-4 py-3 text-[15px] outline-none focus:border-brand-blue';
  const label = 'text-[12px] font-bold uppercase tracking-wide text-muted';

  return (
    <div className="border border-line rounded-2xl p-6 mb-8">
      <h3 className="font-disp font-bold uppercase text-xl mb-1">Add a person</h3>
      <p className="text-muted text-[14px] mb-5 max-w-[76ch]">
        Creates their member-portal login. You do not set a password: they choose their own from the sign-in
        page. To add a whole roster at once, use the spreadsheet import further down.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <label className="block">
          <span className={label}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter the name here"
            maxLength={200}
            autoComplete="off"
            className={input}
          />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter the email here"
            type="email"
            maxLength={254}
            autoComplete="off"
            className={input}
          />
        </label>
      </div>

      <div className="mb-5">
        <span className={label}>Membership type</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {TIERS.map((t) => (
            <button key={t.value} type="button" aria-pressed={tier === t.value} onClick={() => setTier(t.value)} className={pill(tier === t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <span className={label}>Paid through</span>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            aria-label="Paid-through date"
            className="rounded-xl border border-line px-4 py-2.5 text-[15px] outline-none focus:border-brand-blue"
          />
          <button type="button" onClick={() => setExpires(oneYearOut())} className="text-[13px] font-semibold text-muted hover:text-ink underline">
            One year from today
          </button>
          {expires && (
            <button type="button" onClick={() => setExpires('')} className="text-[13px] font-semibold text-muted hover:text-ink">
              Clear
            </button>
          )}
          <span className="text-[12.5px] text-muted">Leave it blank if dues are not paid yet.</span>
        </div>
      </div>

      <div className="mb-6">
        <span className={label}>Access level</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {ACCESS.map((a) => (
            <button
              key={a.value}
              type="button"
              aria-pressed={access === a.value}
              onClick={() => setAccess(a.value)}
              className={pill(access === a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-muted mt-2 max-w-[76ch]">{ACCESS.find((a) => a.value === access)?.hint}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={add} disabled={busy} className="btn-red !py-2.5 !px-5 text-[14px] disabled:opacity-60">
          {busy ? 'Adding…' : 'Add person'}
        </button>
      </div>

      {err && (
        <p className="mt-4 text-brand-red font-semibold text-[14px]" role="alert">
          {err}
        </p>
      )}
      {done && (
        <p className="mt-4 text-[#0E7A4A] font-semibold text-[14px] max-w-[80ch]" role="status">
          {done}
        </p>
      )}
    </div>
  );
}
