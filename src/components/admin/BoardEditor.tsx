import { useEffect, useState } from 'react';
import { FAEMSE_POSITIONS, type Profile } from '../../lib/portal';
import { BOARD_SECTIONS, sortSeats, type BoardSeat, type BoardSection } from '../../lib/postings';
import { supabase } from '../../lib/supabase';

// Admin → Board page (board, 2026-10-20): the Board of Directors page's
// seats, in the order they show, and which member account holds each one.
// The linked account shows the seat's position next to its name in the
// member directory, listed ahead of everyone else in this order. After an
// election this is the one place to update: page and directory together.

type Seat = BoardSeat & { id: string };

const SECTION_LABEL: Record<BoardSection, string> = { officer: 'Officers', director: 'Directors', staff: 'Staff' };
const field = 'w-full rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue bg-white';
const label = 'block text-[11px] font-bold uppercase tracking-wide text-muted mb-1';

function explain(message: string): string {
  return /board_members|does not exist|schema cache/i.test(message)
    ? "The board page isn't in the database yet: it arrives with this update's database change. Until then the page shows the list built into the site."
    : message;
}

export default function BoardEditor({ members, onChanged }: { members: Profile[]; onChanged: () => void }) {
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('board_members').select('id, section, role, name, blurb, sort_order');
    if (error) {
      setErr(explain(error.message));
      setSeats([]);
      return;
    }
    setErr('');
    setSeats(sortSeats((data ?? []) as Seat[]) as Seat[]);
  }
  useEffect(() => {
    load();
  }, []);

  // Swap places with the neighbour in the same section.
  async function move(seat: Seat, dir: -1 | 1) {
    const same = (seats ?? []).filter((s) => s.section === seat.section);
    const i = same.findIndex((s) => s.id === seat.id);
    const other = same[i + dir];
    if (!other) return;
    // Equal orders would never swap; spread them first.
    const a = other.sort_order === seat.sort_order ? seat.sort_order + dir : other.sort_order;
    const results = await Promise.all([
      supabase.from('board_members').update({ sort_order: a, updated_at: new Date().toISOString() }).eq('id', seat.id),
      supabase.from('board_members').update({ sort_order: seat.sort_order, updated_at: new Date().toISOString() }).eq('id', other.id),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) setErr(failed.error.message);
    load();
  }

  async function remove(seat: Seat) {
    if (!window.confirm(`Remove ${seat.name} (${seat.role}) from the board page? This publishes right away.`)) return;
    const { error } = await supabase.from('board_members').delete().eq('id', seat.id);
    if (error) setErr(error.message);
    load();
    onChanged();
  }

  const byName = [...members].sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Board page</h2>
        <a href={`${import.meta.env.BASE_URL}board`} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-brand-blue hover:underline">
          View the board page ↗
        </a>
      </div>
      <p className="text-muted text-[13.5px] mb-5 max-w-[78ch]">
        Who sits on the board, in the order the Board of Directors page shows them. Link each seat to the person&apos;s member
        account and the member directory shows their position next to their name, listed first. Changes publish when you save.
      </p>
      <datalist id="board-positions">
        {FAEMSE_POSITIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {err && (
        <p className="text-brand-redink font-semibold text-[13.5px] mb-4" role="alert">
          {err}
        </p>
      )}
      {seats === null ? (
        <p className="text-muted text-[14px]" role="status">
          Loading the board…
        </p>
      ) : (
        BOARD_SECTIONS.map((section) => {
          const list = seats.filter((s) => s.section === section);
          return (
            <div key={section} className="mb-7">
              <h3 className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-brand-bluedeep mb-2">{SECTION_LABEL[section]}</h3>
              {list.length === 0 ? (
                <p className="text-muted text-[13.5px] border border-dashed border-line rounded-xl px-4 py-3">No seats in this section.</p>
              ) : (
                <ul className="list-none p-0 m-0 flex flex-col gap-3">
                  {list.map((seat, i) => (
                    <SeatRow
                      key={seat.id}
                      seat={seat}
                      members={byName}
                      linkedId={members.find((m) => m.board_seat_id === seat.id)?.id ?? ''}
                      first={i === 0}
                      last={i === list.length - 1}
                      onMove={(dir) => move(seat, dir)}
                      onRemove={() => remove(seat)}
                      onSaved={() => {
                        load();
                        onChanged();
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}

      {adding ? (
        <AddSeat
          seats={seats ?? []}
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="btn-red !py-2 !px-4 text-[13px]">
          + Add a seat
        </button>
      )}
    </div>
  );
}

function SeatRow({
  seat,
  members,
  linkedId,
  first,
  last,
  onMove,
  onRemove,
  onSaved,
}: {
  seat: Seat;
  members: Profile[];
  linkedId: string;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(seat.name);
  const [role, setRole] = useState(seat.role);
  const [section, setSection] = useState<BoardSection>(seat.section);
  const [blurb, setBlurb] = useState(seat.blurb);
  const [linked, setLinked] = useState(linkedId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => setLinked(linkedId), [linkedId]);

  const dirty = name !== seat.name || role !== seat.role || section !== seat.section || blurb !== seat.blurb || linked !== linkedId;

  async function save() {
    if (!name.trim() || !role.trim()) {
      setErr('A seat needs a name and a position.');
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    const { error } = await supabase
      .from('board_members')
      .update({ name: name.trim(), role: role.trim(), section, blurb: blurb.trim(), updated_at: new Date().toISOString() })
      .eq('id', seat.id);
    const linkErr =
      !error && linked !== linkedId ? (await supabase.rpc('admin_link_board_seat', { p_seat: seat.id, p_profile: linked || null })).error : null;
    setBusy(false);
    if (error || linkErr) setErr((error ?? linkErr)?.message ?? 'Could not save');
    else {
      setMsg('Saved');
      onSaved();
    }
  }

  return (
    <li className="border border-line rounded-xl bg-white px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.5fr_0.8fr_1.6fr]">
        <label className="block">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>Position</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className={field} list="board-positions" maxLength={80} />
        </label>
        <label className="block">
          <span className={label}>Section</span>
          <select value={section} onChange={(e) => setSection(e.target.value as BoardSection)} className={field}>
            {BOARD_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Member account (for the directory)</span>
          <select value={linked} onChange={(e) => setLinked(e.target.value)} className={field}>
            <option value="">Not linked</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {(m.full_name || m.email || 'No name') + (m.email && m.full_name ? ` (${m.email})` : '')}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className={label}>What this seat does (shown on the board page)</span>
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} className={`${field} min-h-[64px]`} maxLength={600} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy || !dirty} className="btn-outline !py-1.5 !px-4 text-[13px] disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => onMove(-1)} disabled={first} className="btn-outline !py-1.5 !px-3 text-[13px] disabled:opacity-40" aria-label={`Move ${seat.name} up`}>
          ↑
        </button>
        <button onClick={() => onMove(1)} disabled={last} className="btn-outline !py-1.5 !px-3 text-[13px] disabled:opacity-40" aria-label={`Move ${seat.name} down`}>
          ↓
        </button>
        <button onClick={onRemove} className="ml-auto text-[13px] font-semibold text-brand-redink hover:underline">
          Remove seat
        </button>
        {msg && !err && (
          <span className="text-[#0E7A4A] text-[12.5px] font-semibold" role="status">
            {msg}
          </span>
        )}
        {err && (
          <span className="text-brand-redink text-[12.5px] font-semibold" role="alert">
            {err}
          </span>
        )}
      </div>
    </li>
  );
}

function AddSeat({ seats, onDone, onCancel }: { seats: Seat[]; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [section, setSection] = useState<BoardSection>('director');
  const [blurb, setBlurb] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function add() {
    if (!name.trim() || !role.trim()) {
      setErr('A seat needs a name and a position.');
      return;
    }
    setBusy(true);
    setErr('');
    // New seats go to the end of their section.
    const last = Math.max(0, ...seats.filter((s) => s.section === section).map((s) => s.sort_order));
    const { error } = await supabase.from('board_members').insert({ name: name.trim(), role: role.trim(), section, blurb: blurb.trim(), sort_order: last + 10 });
    setBusy(false);
    if (error) setErr(explain(error.message));
    else onDone();
  }

  return (
    <div className="border border-brand-blue/40 rounded-xl bg-white px-4 py-4">
      <b className="block text-[14.5px] mb-3">New seat</b>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>Position</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className={field} list="board-positions" maxLength={80} />
        </label>
        <label className="block">
          <span className={label}>Section</span>
          <select value={section} onChange={(e) => setSection(e.target.value as BoardSection)} className={field}>
            {BOARD_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-3">
          <span className={label}>What this seat does (shown on the board page)</span>
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} className={`${field} min-h-[64px]`} maxLength={600} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={add} disabled={busy} className="btn-red !py-1.5 !px-4 text-[13px] disabled:opacity-60">
          {busy ? 'Adding…' : 'Add to the board page'}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 text-[13px]">
          Cancel
        </button>
        {err && (
          <span className="text-brand-redink text-[12.5px] font-semibold" role="alert">
            {err}
          </span>
        )}
      </div>
    </div>
  );
}
