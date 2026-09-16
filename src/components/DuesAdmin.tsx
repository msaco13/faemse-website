import { useEffect, useMemo, useState } from 'react';
import type { Payment } from '../lib/portal';
import { dollars, formatDate } from '../lib/portal';
import { toRows } from '../lib/roster';
import { fetchSettings, saveSettings } from '../lib/settings';
import { supabase } from '../lib/supabase';

// The dues side of the Board admin panel: the payment ledger, the "Online
// dues" switch, and the roster import. Every write is gated server-side
// (admin_* RPCs check is_admin(); the import function checks it too).

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
                    <b>{p.full_name ?? '—'}</b>
                    <span className="block text-muted text-[12.5px]">{p.email}</span>
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
          place (README → &ldquo;Online dues&rdquo;); until then the button would show an error.
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

// --- Roster import -----------------------------------------------------------
// Reading the paste is in lib/roster.ts (pure, and unit-tested there); this is
// just the panel around it.

type ImportResult = { email: string; status: 'created' | 'updated' | 'skipped' | 'error'; message?: string };

export function MemberImport({ onImported }: { onImported: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'' | 'check' | 'import'>('');
  const [result, setResult] = useState<{ dry_run: boolean; summary: Record<string, number>; results: ImportResult[] } | null>(null);
  const [err, setErr] = useState('');
  const parsed = useMemo(() => (text.trim() ? toRows(text) : null), [text]);
  const valid = parsed?.rows.filter((r) => r.email) ?? [];

  async function run(dryRun: boolean) {
    if (!parsed || valid.length === 0) return;
    setBusy(dryRun ? 'check' : 'import');
    setErr('');
    setResult(null);
    const { data, error } = await supabase.functions.invoke('import-members', { body: { rows: valid, dry_run: dryRun } });
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
          <button onClick={() => run(true)} disabled={busy !== '' || valid.length === 0} className="btn-outline !py-2 !px-4 text-[13px] disabled:opacity-60">
            {busy === 'check' ? 'Checking…' : 'Check (no changes)'}
          </button>
          <button onClick={() => run(false)} disabled={busy !== '' || valid.length === 0} className="btn-red !py-2 !px-4 text-[13px] disabled:opacity-60">
            {busy === 'import' ? 'Importing…' : `Import ${valid.length || ''} member${valid.length === 1 ? '' : 's'}`}
          </button>
          <span className="text-[12.5px] text-muted">Check first: it reports what would be created or updated without writing anything.</span>
        </div>
        {err && (
          <p className="text-brand-red font-semibold text-[13.5px] mt-3" role="alert">
            {err}
          </p>
        )}
        {result && (
          <div className="mt-4 text-[13.5px]">
            <p className="font-semibold">
              {result.dry_run ? 'Would create' : 'Created'} {result.summary.created}, {result.dry_run ? 'would update' : 'updated'}{' '}
              {result.summary.updated}, skipped {result.summary.skipped}, errors {result.summary.errors}.
            </p>
            {result.results.filter((r) => r.status === 'error' || r.status === 'skipped').length > 0 && (
              <ul className="mt-2 space-y-1 text-brand-red">
                {result.results
                  .filter((r) => r.status === 'error' || r.status === 'skipped')
                  .map((r, i) => (
                    <li key={i}>
                      {r.email}: {r.message}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
