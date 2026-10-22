import { useEffect, useState } from 'react';
import type { FoundationSeat } from '../../lib/postings';
import { supabase } from '../../lib/supabase';

// Admin → Foundation page (board, 2026-10-22): the FAEMSE Foundation's board
// as the Foundation page shows it, in this order. The page's wording (the
// About text, headings) is changed on the page itself with Edit page; the
// scholarship band is the Foundation slide in Site content → Spotlights.

type Seat = FoundationSeat & { id: string };

const field = 'w-full rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue bg-white';
const label = 'block text-[11px] font-bold uppercase tracking-wide text-muted mb-1';

function explain(message: string): string {
  return /foundation_board|does not exist|schema cache/i.test(message)
    ? "The Foundation board isn't in the database yet: it arrives with this update's database change. Until then the page shows the list built into the site."
    : message;
}

export default function FoundationEditor() {
  const [seats, setSeats] = useState<Seat[] | null>(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('foundation_board').select('id, role, name, sort_order').order('sort_order', { ascending: true });
    if (error) {
      setErr(explain(error.message));
      setSeats([]);
      return;
    }
    setErr('');
    setSeats((data ?? []) as Seat[]);
  }
  useEffect(() => {
    load();
  }, []);

  // Swap places with the neighbour.
  async function move(seat: Seat, dir: -1 | 1) {
    const list = seats ?? [];
    const i = list.findIndex((s) => s.id === seat.id);
    const other = list[i + dir];
    if (!other) return;
    // Equal orders would never swap; spread them first.
    const a = other.sort_order === seat.sort_order ? seat.sort_order + dir : other.sort_order;
    const now = new Date().toISOString();
    const results = await Promise.all([
      supabase.from('foundation_board').update({ sort_order: a, updated_at: now }).eq('id', seat.id),
      supabase.from('foundation_board').update({ sort_order: seat.sort_order, updated_at: now }).eq('id', other.id),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) setErr(failed.error.message);
    load();
  }

  async function remove(seat: Seat) {
    if (!window.confirm(`Remove ${seat.name} (${seat.role}) from the Foundation page? This publishes right away.`)) return;
    const { error } = await supabase.from('foundation_board').delete().eq('id', seat.id);
    if (error) setErr(error.message);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">Foundation page</h2>
        <a href={`${import.meta.env.BASE_URL}foundation`} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-brand-blue hover:underline">
          View the Foundation page ↗
        </a>
      </div>
      <p className="text-muted text-[13.5px] mb-5 max-w-[78ch]">
        The FAEMSE Foundation&apos;s board, in the order the Foundation page shows it. Changes publish when you save. The page&apos;s
        wording is changed on the page itself (Edit page), and the scholarship deadlines come from the Foundation slide in Site
        content.
      </p>

      {err && (
        <p className="text-brand-redink font-semibold text-[13.5px] mb-4" role="alert">
          {err}
        </p>
      )}
      {seats === null ? (
        <p className="text-muted text-[14px]" role="status">
          Loading the Foundation board…
        </p>
      ) : seats.length === 0 ? (
        <p className="text-muted text-[13.5px] border border-dashed border-line rounded-xl px-4 py-3 mb-5">No one listed yet.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-3 mb-5">
          {seats.map((seat, i) => (
            <SeatRow key={seat.id} seat={seat} first={i === 0} last={i === seats.length - 1} onMove={(dir) => move(seat, dir)} onRemove={() => remove(seat)} onSaved={load} />
          ))}
        </ul>
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
          + Add someone
        </button>
      )}
    </div>
  );
}

function SeatRow({
  seat,
  first,
  last,
  onMove,
  onRemove,
  onSaved,
}: {
  seat: Seat;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(seat.name);
  const [role, setRole] = useState(seat.role);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const dirty = name !== seat.name || role !== seat.role;

  async function save() {
    if (!name.trim() || !role.trim()) {
      setErr('Each person needs a name and a position.');
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    const { error } = await supabase
      .from('foundation_board')
      .update({ name: name.trim(), role: role.trim(), updated_at: new Date().toISOString() })
      .eq('id', seat.id);
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg('Saved');
      onSaved();
    }
  }

  return (
    <li className="border border-line rounded-xl bg-white px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>Position</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className={field} maxLength={80} />
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
          Remove
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function add() {
    if (!name.trim() || !role.trim()) {
      setErr('Each person needs a name and a position.');
      return;
    }
    setBusy(true);
    setErr('');
    // New people go to the end of the list.
    const last = Math.max(0, ...seats.map((s) => s.sort_order));
    const { error } = await supabase.from('foundation_board').insert({ name: name.trim(), role: role.trim(), sort_order: last + 10 });
    setBusy(false);
    if (error) setErr(explain(error.message));
    else onDone();
  }

  return (
    <div className="border border-brand-blue/40 rounded-xl bg-white px-4 py-4">
      <b className="block text-[14.5px] mb-3">Add someone to the Foundation board</b>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>Position</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} className={field} maxLength={80} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={add} disabled={busy} className="btn-red !py-1.5 !px-4 text-[13px] disabled:opacity-60">
          {busy ? 'Adding…' : 'Add to the Foundation page'}
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
