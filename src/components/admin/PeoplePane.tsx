import { useMemo, useState } from 'react';
import type { MembershipState, Profile } from '../../lib/portal';
import { dateState, GRACE_DAYS } from '../../lib/portal';
import { matchesQuery } from '../../lib/search';
import AddPerson from '../AddPerson';
import MemberEditor from './MemberEditor';

// One compact line per person, with the editor opening under the row the
// admin clicks. Replaces the old list that rendered every login as a full
// form (162 people came to roughly twenty thousand pixels of page).

export type SeatInfo = { name: string; expires_at: string | null };

type Status = 'current' | 'due' | 'grace' | 'lapsed' | 'pending' | 'honorary';
type Filter = 'all' | 'current' | 'due' | 'behind' | 'honorary' | 'admins' | 'offlist';
type Sort = 'name' | 'paid';

const PAGE = 25;

const statusLabel: Record<Status, string> = {
  current: 'Current',
  due: 'Due soon',
  grace: 'Past due',
  lapsed: 'Lapsed',
  pending: 'No date',
  honorary: 'Honorary',
};
const statusCls: Record<Status, string> = {
  current: 'text-[#0E7A4A] bg-[#E2F7EC]',
  due: 'text-[#8A5A00] bg-[#FFF1D6]',
  grace: 'text-brand-red bg-[#FDEAEB]',
  lapsed: 'text-brand-red bg-[#FDEAEB]',
  pending: 'text-muted bg-paper',
  honorary: 'text-brand-goldink bg-[#FBF3D9]',
};

// A person is as current as the best of their memberships: their own date or
// any organization they represent (same rule as is_current_member()).
const RANK: Record<MembershipState, number> = { current: 3, grace: 2, lapsed: 1, pending: 0 };
function bestDate(p: Profile, seats: SeatInfo[]): { state: MembershipState; date: string | null } {
  const candidates: { state: MembershipState; date: string | null }[] = [
    { state: dateState(p.expires_at), date: p.expires_at },
    ...seats.map((s) => ({ state: dateState(s.expires_at), date: s.expires_at })),
  ];
  return candidates.sort((a, b) => RANK[b.state] - RANK[a.state])[0];
}

function statusOf(p: Profile, seats: SeatInfo[]): Status {
  if (p.tier === 'honorary') return 'honorary';
  const best = bestDate(p, seats);
  if (best.state === 'current' && best.date) {
    const d = new Date(`${best.date.slice(0, 10)}T00:00:00`);
    const soon = new Date();
    soon.setHours(0, 0, 0, 0);
    soon.setDate(soon.getDate() + GRACE_DAYS);
    if (d <= soon) return 'due';
  }
  return best.state;
}

function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const tierLabel: Record<string, string> = { active: 'Active', institutional: 'Institutional', corporate: 'Corporate', honorary: 'Honorary' };

export default function PeoplePane({
  members,
  seatsByProfile,
  onChanged,
}: {
  members: Profile[];
  seatsByProfile: Map<string, SeatInfo[]>;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const rows = useMemo(
    () =>
      members.map((m) => {
        const seats = seatsByProfile.get(m.id) ?? [];
        return { m, seats, status: statusOf(m, seats), best: bestDate(m, seats) };
      }),
    [members, seatsByProfile],
  );

  const counts = useMemo(
    () => ({
      current: rows.filter((r) => r.status === 'current' || r.status === 'due' || r.status === 'honorary').length,
      due: rows.filter((r) => r.status === 'due').length,
      behind: rows.filter((r) => r.status === 'grace' || r.status === 'lapsed').length,
      admins: rows.filter((r) => r.m.role === 'admin').length,
    }),
    [rows],
  );

  const q = query.trim();
  const visible = rows
    .filter((r) => {
      switch (filter) {
        case 'current':
          return r.status === 'current' || r.status === 'due' || r.status === 'honorary';
        case 'due':
          return r.status === 'due';
        case 'behind':
          return r.status === 'grace' || r.status === 'lapsed';
        case 'honorary':
          return r.status === 'honorary';
        case 'admins':
          return r.m.role === 'admin';
        case 'offlist':
          return !!r.m.listserv_opt_out;
        default:
          return true;
      }
    })
    // Every word typed must appear somewhere on the person, in any order:
    // "perez valencia", "orange paramedic", a phone number, a listserv address.
    .filter((r) =>
      matchesQuery(q, [
        r.m.full_name,
        r.m.email,
        r.m.alt_email,
        r.m.listserv_email,
        r.m.agency,
        r.m.job_title,
        r.m.county,
        r.m.cert_level,
        r.m.phone,
        r.m.tier,
        r.m.role,
        ...r.seats.map((s) => s.name),
      ]),
    )
    .sort((a, b) => {
      if (sort === 'paid') return (a.best.date ?? '9999').localeCompare(b.best.date ?? '9999') || (a.m.full_name ?? '').localeCompare(b.m.full_name ?? '');
      return (a.m.full_name ?? '').localeCompare(b.m.full_name ?? '');
    });

  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pages);
  const slice = visible.slice((current - 1) * PAGE, current * PAGE);

  function pick(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  const chip = (f: Filter, label: string) => (
    <button
      key={f}
      onClick={() => pick(f)}
      aria-pressed={filter === f}
      className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-ink text-white border-ink' : 'border-line text-muted hover:text-ink bg-white'}`}
    >
      {label}
    </button>
  );

  const tile = (f: Filter, n: number, label: string, cls: string) => (
    <button
      onClick={() => pick(filter === f ? 'all' : f)}
      aria-pressed={filter === f}
      className={`text-left rounded-xl border px-3.5 py-2.5 bg-white transition-shadow ${filter === f ? 'border-brand-blue shadow-[0_0_0_2px_#E7EEFF]' : 'border-line'}`}
    >
      <b className={`block font-disp text-[26px] leading-none tabular-nums ${cls}`}>{n}</b>
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-disp font-bold uppercase text-2xl">
          People <span className="ml-2 font-body normal-case tracking-normal text-[13px] font-normal text-muted">{members.length} logins</span>
        </h3>
        <button onClick={() => setAdding(!adding)} className={`${adding ? 'btn-outline' : 'btn-red'} !py-2 !px-4 text-[13px]`}>
          {adding ? 'Close' : '+ Add a person'}
        </button>
      </div>

      {adding && (
        <div className="mb-6">
          <AddPerson
            onAdded={() => {
              setAdding(false);
              onChanged();
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4" role="group" aria-label="Quick filters">
        {tile('current', counts.current, 'Current', 'text-[#0E7A4A]')}
        {tile('due', counts.due, `Due within ${GRACE_DAYS} days`, 'text-[#8A5A00]')}
        {tile('behind', counts.behind, 'Past due or lapsed', 'text-brand-red')}
        {tile('admins', counts.admins, 'Board admins', '')}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex-1 min-w-[240px] relative">
          <input
            id="people-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                setPage(1);
              }
            }}
            placeholder="Find by name, email, organization, county, phone…"
            className="w-full rounded-lg border border-line pl-3 pr-16 py-1.5 text-[13.5px] outline-none focus:border-brand-blue"
            aria-label="Find a person"
          />
          {q && (
            <button
              onClick={() => {
                setQuery('');
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filters">
          {chip('all', 'All')}
          {chip('current', 'Current')}
          {chip('due', 'Due soon')}
          {chip('behind', 'Past due')}
          {chip('honorary', 'Honorary')}
          {chip('admins', 'Admins')}
          {chip('offlist', 'Not on listserv')}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted text-[14.5px] border border-dashed border-line rounded-2xl px-4 py-5">
          {members.length === 0 ? 'No member records yet.' : 'Nobody matches. Clear the filter or the search box.'}
        </p>
      ) : (
        <div className="border border-line rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-[13.5px]">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr className="bg-paper text-[11px] uppercase tracking-[0.08em] text-muted">
                <th className="text-left font-bold px-4 py-2.5">
                  <button onClick={() => setSort('name')} className={sort === 'name' ? 'text-ink' : ''}>
                    Name {sort === 'name' ? '▲' : ''}
                  </button>
                </th>
                <th className="text-left font-bold px-3 py-2.5">Status</th>
                <th className="text-left font-bold px-3 py-2.5">Tier</th>
                <th className="text-left font-bold px-3 py-2.5">
                  <button onClick={() => setSort('paid')} className={sort === 'paid' ? 'text-ink' : ''}>
                    Paid through {sort === 'paid' ? '▲' : ''}
                  </button>
                </th>
                <th className="text-left font-bold px-3 py-2.5">Represents</th>
                <th className="text-left font-bold px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5" aria-label="Edit"></th>
              </tr>
            </thead>
            <tbody>
              {slice.map(({ m, seats, status }) => {
                const isOpen = open === m.id;
                return [
                  <tr
                    key={m.id}
                    onClick={() => setOpen(isOpen ? null : m.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen(isOpen ? null : m.id);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={isOpen}
                    className={`border-t border-line cursor-pointer outline-none focus-visible:bg-[#E7EEFF] ${isOpen ? 'bg-paper' : 'hover:bg-paper/60'}`}
                  >
                    <td className="px-4 py-2.5 min-w-0">
                      <b className="block text-[14px] truncate">{m.full_name ?? '—'}</b>
                      <span className="block text-[12.5px] text-muted truncate">{m.email}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block text-[10.5px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${statusCls[status]}`}>{statusLabel[status]}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block text-[10.5px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full text-[#1A47B8] bg-[#E7EEFF] whitespace-nowrap">
                        {tierLabel[m.tier ?? ''] ?? m.tier ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{m.expires_at ? shortDate(m.expires_at) : <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-[#1A47B8] min-w-0">
                      {seats.length ? <span className="block truncate" title={seats.map((s) => s.name).join(', ')}>{seats.map((s) => s.name).join(', ')}</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {m.role === 'admin' ? (
                        <span className="inline-block text-[10.5px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full text-brand-red bg-[#FDEAEB]">Admin</span>
                      ) : (
                        'Member'
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-[12px] text-muted whitespace-nowrap text-right">{isOpen ? 'Close' : 'Edit'}</td>
                  </tr>,
                  isOpen ? (
                    <tr key={`${m.id}-editor`}>
                      <td colSpan={7} className="p-0">
                        <MemberEditor member={m} onSaved={onChanged} />
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[12.5px] text-muted">
        <span>
          {visible.length === 0 ? '' : `Showing ${(current - 1) * PAGE + 1} to ${Math.min(current * PAGE, visible.length)} of ${visible.length}`}
          {filter !== 'all' || q ? ` (of ${members.length} logins)` : ''}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-1" role="navigation" aria-label="Pages">
            <button onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} className="px-2.5 py-1 rounded-lg border border-line bg-white font-bold disabled:opacity-40">
              ‹
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1)
              .reduce<(number | '…')[]>((acc, n) => {
                const prev = acc[acc.length - 1];
                if (typeof prev === 'number' && n - prev > 1) acc.push('…');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === '…' ? (
                  <span key={`gap-${i}`} className="px-1">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    aria-current={n === current ? 'page' : undefined}
                    className={`min-w-[30px] px-2 py-1 rounded-lg border font-bold ${n === current ? 'bg-ink text-white border-ink' : 'border-line bg-white'}`}
                  >
                    {n}
                  </button>
                ),
              )}
            <button onClick={() => setPage(Math.min(pages, current + 1))} disabled={current === pages} className="px-2.5 py-1 rounded-lg border border-line bg-white font-bold disabled:opacity-40">
              ›
            </button>
          </div>
        )}
        <span>{PAGE} per page</span>
      </div>
    </div>
  );
}
