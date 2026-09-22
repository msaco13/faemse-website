import { useEffect, useMemo, useState } from 'react';
import { todayISO } from '../lib/dates';
import { isLegacyExport, parseLegacyExport, type LegacyPlan } from '../lib/legacyExport';
import type { Payment } from '../lib/portal';
import { dollars, formatDate } from '../lib/portal';
import { toRows } from '../lib/roster';
import { fetchSettings, saveSettings } from '../lib/settings';
import { supabase } from '../lib/supabase';

// The dues side of the Board admin panel: the payment ledger, the "Online
// dues" and "Renewal reminders" switches, the listserv export, and the
// roster import. Every write is gated server-side (admin_* RPCs check
// is_admin(); the import function checks it too).

const methodLabel: Record<Payment['method'], string> = {
  stripe: 'Online (Stripe)',
  check: 'Check',
  cash: 'Cash',
  other: 'Other',
  waived: 'Waived',
};

export function DuesLedger({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Payment[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    supabase.rpc('admin_list_payments').then(({ data, error }) => {
      if (error) setErr(error.message);
      else setRows((data ?? []) as Payment[]);
    });
  }, [refreshKey]);
  return (
    <>
      <h3 className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-muted mb-3">Dues ledger</h3>
      {err && (
        <p className="text-brand-red font-semibold text-[13px] mb-3" role="alert">
          {err}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-muted text-[14.5px] mb-8">
          No payments recorded yet. Online payments land here automatically; checks and cash are recorded with the
          &ldquo;Record payment&rdquo; button on a member&apos;s row.
        </p>
      ) : (
        <div className="border border-line rounded-2xl overflow-x-auto mb-8">
          <table className="w-full text-[13.5px]">
            <thead className="bg-paper text-[11px] font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="text-left px-4 py-2.5">Paid</th>
                <th className="text-left px-4 py-2.5">Member</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-left px-4 py-2.5">How</th>
                <th className="text-left px-4 py-2.5">Paid through</th>
                <th className="text-left px-4 py-2.5">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(p.paid_on)}</td>
                  <td className="px-4 py-2.5">
                    <b>{p.organization_name ?? p.full_name ?? '—'}</b>
                    <span className="block text-muted text-[12.5px]">{p.organization_name ? 'organization' : p.email}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{dollars(p.amount_cents)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{methodLabel[p.method] ?? p.method}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {p.previous_expires ? `${formatDate(p.previous_expires)} → ` : ''}
                    <b>{formatDate(p.new_expires)}</b>
                  </td>
                  <td className="px-4 py-2.5 text-muted max-w-[28ch] truncate" title={p.note}>
                    {p.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function OnlineDuesSwitch() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetchSettings().then((s) => setOn(Boolean(s.online_dues)));
  }, []);
  async function toggle() {
    if (on === null) return;
    setBusy(true);
    setErr('');
    const error = await saveSettings({ online_dues: !on });
    setBusy(false);
    if (error) setErr(error);
    else setOn(!on);
  }
  return (
    <div className="border border-line rounded-2xl p-5 mb-8 flex flex-wrap items-start gap-4">
      <div className="flex-1 min-w-[260px]">
        <b className="block text-[14.5px]">Online dues (Stripe)</b>
        <p className="text-muted text-[13.5px] mt-1 max-w-[70ch]">
          When on, members see a <b>Pay dues online</b> button in the portal; a successful payment extends their
          paid-through date by a year and lands in the ledger above. Switch it on only after the Stripe keys are in
          place (README → &ldquo;Online dues&rdquo;).
        </p>
        <p className="text-muted text-[13.5px] mt-2 max-w-[70ch]">
          <b>Off means nobody can be charged.</b> The button disappears and the server refuses any checkout, so a
          stale page or a saved link cannot take a payment either. Nothing in Stripe changes — the keys stay set and
          past payments stay in the ledger. Flip this back to On whenever the board is ready to collect again.
        </p>
        {err && (
          <p className="text-brand-red font-semibold text-[13px] mt-2" role="alert">
            {err}
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={busy || on === null}
        aria-pressed={on ?? false}
        className={`rounded-full px-5 py-2 text-[13px] font-bold border transition-colors disabled:opacity-60 ${
          on ? 'bg-[#0E7A4A] border-[#0E7A4A] text-white' : 'bg-white border-line text-muted hover:border-ink'
        }`}
      >
        {on === null ? '…' : on ? 'On' : 'Off'}
      </button>
    </div>
  );
}

// The daily renewal-reminder emails, held or running. The board asked to hold
// them until it decides how the first renewal cycle on the new site should go.
export function RemindersSwitch() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetchSettings().then((s) => setPaused(Boolean(s.reminders_paused)));
  }, []);
  async function toggle() {
    if (paused === null) return;
    setBusy(true);
    setErr('');
    const error = await saveSettings({ reminders_paused: !paused });
    setBusy(false);
    if (error) setErr(error);
    else setPaused(!paused);
  }
  return (
    <div className="border border-line rounded-2xl p-5 mb-8 flex flex-wrap items-start gap-4">
      <div className="flex-1 min-w-[260px]">
        <b className="block text-[14.5px]">Renewal reminder emails</b>
        <p className="text-muted text-[13.5px] mt-1 max-w-[70ch]">
          When running, members get an email 90, 60, 30, and 7 days before their paid-through date; for an
          organization the email goes to its coordinator and billing contact. Each reminder is sent at most once.
          While held, nothing goes out, and a held reminder is not sent later — someone 30 days out when this is
          switched back on gets the 30-day email that day and the 7-day one on time.
        </p>
        {err && (
          <p className="text-brand-red font-semibold text-[13px] mt-2" role="alert">
            {err}
          </p>
        )}
      </div>
      <button
        onClick={toggle}
        disabled={busy || paused === null}
        aria-pressed={paused === false}
        className={`rounded-full px-5 py-2 text-[13px] font-bold border transition-colors disabled:opacity-60 ${
          paused === false ? 'bg-[#0E7A4A] border-[#0E7A4A] text-white' : 'bg-white border-line text-muted hover:border-ink'
        }`}
      >
        {paused === null ? '…' : paused ? 'Held' : 'Running'}
      </button>
    </div>
  );
}

// The listserv, as a CSV Gaggle Mail accepts as-is (an email column and a
// name column; Gaggle matches by header). Current members, the board, and the
// listserv-only contacts; opt-outs left off; a member's "special listserv
// email" used in place of their login email.
export function ListservExport() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  async function download() {
    setBusy(true);
    setErr('');
    setMsg('');
    const { data, error } = await supabase.rpc('get_listserv');
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const rows = (data ?? []) as { email: string; full_name: string | null; source: string }[];
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ['Email,Name', ...rows.map((r) => `${q(r.email)},${q(r.full_name ?? '')}`)].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `faemse-listserv-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    const by = (s: string) => rows.filter((r) => r.source === s).length;
    setMsg(`${rows.length} addresses: ${by('member')} members, ${by('board')} board, ${by('regulatory')} regulatory, ${by('honorary') + by('other')} other contacts.`);
  }
  return (
    <div className="border border-line rounded-2xl p-5 mb-8 flex flex-wrap items-start gap-4">
      <div className="flex-1 min-w-[260px]">
        <b className="block text-[14.5px]">Listserv export</b>
        <p className="text-muted text-[13.5px] mt-1 max-w-[70ch]">
          Downloads the current listserv as a CSV that Gaggle Mail imports directly (Members → Add members → upload).
          Everyone current in any membership, the board, and the listserv-only contacts; anyone who opted out is left
          off, and a member&apos;s special listserv address is used when they have one.
        </p>
        {msg && (
          <p className="text-[#0E7A4A] font-semibold text-[13px] mt-2" role="status">
            {msg}
          </p>
        )}
        {err && (
          <p className="text-brand-red font-semibold text-[13px] mt-2" role="alert">
            {err}
          </p>
        )}
      </div>
      <button onClick={download} disabled={busy} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
        {busy ? 'Building…' : 'Download listserv CSV'}
      </button>
    </div>
  );
}

// --- Roster import -----------------------------------------------------------
// Reading the paste is in lib/roster.ts and lib/legacyExport.ts (pure, and
// unit-tested there); this is just the panel around them. The old system's
// full export is recognised by its header row and imported as people,
// organizations, and contacts; anything simpler is a plain list of people.

type ImportResult = { email: string; status: 'created' | 'updated' | 'skipped' | 'error'; message?: string };
type Tally = Record<string, number>;
type ImportResponse = {
  dry_run: boolean;
  summary: Tally;
  results: ImportResult[];
  organizations?: { summary: Tally; results: ImportResult[] };
  contacts?: { summary: Tally; results: ImportResult[] };
};

function tallyText(t: Tally, dry: boolean): string {
  return `${dry ? 'would create' : 'created'} ${t.created}, ${dry ? 'would update' : 'updated'} ${t.updated}, skipped ${t.skipped}, errors ${t.errors}`;
}

function Problems({ rows }: { rows: ImportResult[] }) {
  const bad = rows.filter((r) => r.status === 'error' || r.status === 'skipped');
  if (bad.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-brand-red">
      {bad.map((r, i) => (
        <li key={i}>
          {r.email}: {r.message}
        </li>
      ))}
    </ul>
  );
}

export function MemberImport({ onImported }: { onImported: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'' | 'check' | 'import'>('');
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [err, setErr] = useState('');
  const legacy = useMemo(() => (text.trim() && isLegacyExport(text) ? parseLegacyExport(text) : null), [text]);
  const parsed = useMemo(() => (text.trim() && !legacy ? toRows(text) : null), [text, legacy]);
  const valid = parsed?.rows.filter((r) => r.email) ?? [];
  const ready = legacy ? legacy.people.length + legacy.organizations.length + legacy.contacts.length > 0 : valid.length > 0;

  async function run(dryRun: boolean) {
    if (!ready) return;
    setBusy(dryRun ? 'check' : 'import');
    setErr('');
    setResult(null);
    const body = legacy
      ? { people: legacy.people, organizations: legacy.organizations, contacts: legacy.contacts, dry_run: dryRun }
      : { rows: valid, dry_run: dryRun };
    const { data, error } = await supabase.functions.invoke('import-members', { body });
    setBusy('');
    if (error) {
      let msg = error.message;
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) msg = body.error;
      } catch {
        /* keep the generic message */
      }
      setErr(msg);
      return;
    }
    setResult(data);
    if (!dryRun) onImported();
  }

  const count = legacy ? legacy.people.length : valid.length;

  return (
    <details className="border border-line rounded-2xl p-5 mb-8 group">
      <summary className="cursor-pointer list-none">
        <b className="text-[14.5px]">Import a whole roster from a spreadsheet</b>
        <span className="block text-muted text-[13.5px] mt-1 max-w-[76ch]">
          For many people at once. Paste the old system&apos;s export (Excel → File → Save As → CSV, then open it and
          copy everything, or drop the .csv file below). A header row is matched by its column names; without one,
          each value is matched by what it looks like, so an email, a name and a date on one line work fine.
          Existing members are updated by email; new ones get a login and set their own password with
          &ldquo;Forgot password&rdquo; on the sign-in page. Board access is never granted here — add that with
          &ldquo;Add a person&rdquo; above, or the Role dropdown on their row.
        </span>
      </summary>
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="btn-outline !py-2 !px-4 text-[13px] cursor-pointer relative">
            Choose a .csv file
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) f.text().then(setText);
                e.target.value = '';
              }}
            />
          </label>
          <span className="text-[12.5px] text-muted">or paste below</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={'jane@example.org  Jane Doe  Active  June 30, 2027\n\n…or with a header row:\nEmail,Name,Membership level,Renewal due\njane@example.org,Jane Doe,Active,2027-03-01'}
          className="w-full rounded-xl border border-line px-4 py-3 font-mono text-[12.5px] outline-none focus:border-brand-blue"
        />
        {legacy && <LegacyPlanPreview plan={legacy} />}
        {parsed && (
          <div className="mt-3 text-[13.5px]">
            <p className="text-muted">
              {valid.length} member{valid.length === 1 ? '' : 's'} found. Columns: {parsed.columns.join(' · ') || 'none matched'}.
            </p>
            {parsed.problems.map((p) => (
              <p key={p} className="text-brand-goldink font-semibold mt-1">
                {p}
              </p>
            ))}
            {valid.length > 0 && (
              <div className="border border-line rounded-xl overflow-x-auto mt-3">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-paper text-[11px] font-bold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="text-left px-3 py-2">Email</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Tier</th>
                      <th className="text-left px-3 py-2">Paid through</th>
                      <th className="text-left px-3 py-2">Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valid.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">{r.full_name}</td>
                        <td className="px-3 py-1.5">{r.tier || <span className="text-muted">active</span>}</td>
                        <td className="px-3 py-1.5">{r.expires_at || <span className="text-muted">—</span>}</td>
                        <td className="px-3 py-1.5 text-muted">{r.agency}</td>
                      </tr>
                    ))}
                    {valid.length > 8 && (
                      <tr className="border-t border-line">
                        <td colSpan={5} className="px-3 py-1.5 text-muted">
                          … and {valid.length - 8} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button onClick={() => run(true)} disabled={busy !== '' || !ready} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
            {busy === 'check' ? 'Checking…' : 'Check (no changes)'}
          </button>
          <button onClick={() => run(false)} disabled={busy !== '' || !ready} className="btn-red !py-2 !px-4 text-[13px] disabled:opacity-60">
            {busy === 'import' ? 'Importing…' : `Import ${count || ''} ${legacy ? 'people + organizations' : `member${count === 1 ? '' : 's'}`}`}
          </button>
          <span className="text-[12.5px] text-muted">Check first: it reports what would be created or updated without writing anything.</span>
        </div>
        {err && (
          <p className="text-brand-red font-semibold text-[13.5px] mt-3" role="alert">
            {err}
          </p>
        )}
        {result && (
          <div className="mt-4 text-[13.5px] space-y-2">
            <div>
              <p className="font-semibold">People: {tallyText(result.summary, result.dry_run)}.</p>
              <Problems rows={result.results} />
            </div>
            {result.organizations && (
              <div>
                <p className="font-semibold">Organizations: {tallyText(result.organizations.summary, result.dry_run)}.</p>
                <Problems rows={result.organizations.results} />
              </div>
            )}
            {result.contacts && (
              <div>
                <p className="font-semibold">Contacts: {tallyText(result.contacts.summary, result.dry_run)}.</p>
                <Problems rows={result.contacts.results} />
              </div>
            )}
            {!result.dry_run && (
              <p className="text-muted">
                New logins have no password yet: tell people to use &ldquo;Forgot password&rdquo; on the sign-in page.
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

// What the old system's export will become, before anything is written.
function LegacyPlanPreview({ plan }: { plan: LegacyPlan }) {
  const own = plan.people.filter((p) => p.tier).length;
  const orgOnly = plan.people.length - own;
  return (
    <div className="mt-3 text-[13.5px] space-y-3">
      <p className="font-semibold">
        Recognised as the old system&apos;s export. It becomes {plan.people.length} people ({own} with a membership of their own,{' '}
        {orgOnly} through an organization only), {plan.organizations.length} organizations, and {plan.contacts.length} listserv-only
        contacts.
      </p>
      {plan.problems.map((p) => (
        <p key={p} className="text-brand-red font-semibold">
          {p}
        </p>
      ))}
      {plan.notes.length > 0 && (
        <ul className="list-disc pl-5 text-muted space-y-0.5">
          {plan.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="border border-line rounded-xl overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-paper text-[11px] font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="text-left px-3 py-2">Organization</th>
              <th className="text-left px-3 py-2">Kind</th>
              <th className="text-left px-3 py-2">Paid through</th>
              <th className="text-left px-3 py-2">Coordinator</th>
              <th className="text-left px-3 py-2">Seats</th>
            </tr>
          </thead>
          <tbody>
            {plan.organizations.map((o) => (
              <tr key={`${o.kind}:${o.name}`} className="border-t border-line">
                <td className="px-3 py-1.5">{o.name}</td>
                <td className="px-3 py-1.5 capitalize">{o.kind}</td>
                <td className="px-3 py-1.5">{o.expires_at || <span className="text-muted">—</span>}</td>
                <td className="px-3 py-1.5 text-muted">{o.coordinator_email}</td>
                <td className="px-3 py-1.5">
                  {o.member_emails.length} of {o.kind === 'institutional' ? 5 : 3}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
