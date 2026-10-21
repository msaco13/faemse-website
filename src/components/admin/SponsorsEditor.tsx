import { useEffect, useState } from 'react';
import { sponsorLogoSrc, type Sponsor } from '../../lib/postings';
import { supabase } from '../../lib/supabase';

// Admin → Sponsors (board, 2026-10-20): the corporate sponsors shown in the
// homepage band, the member portal (band and Corporate sponsors tab) and on
// the Sponsors page, in this order. A sponsor without a logo shows by name
// (with its initials in the band and portal). Logos upload to the site's
// media storage.

type Row = Sponsor & { id: string };

const field = 'w-full rounded-lg border border-line px-2.5 py-1.5 text-[13.5px] outline-none focus:border-brand-blue bg-white';
const label = 'block text-[11px] font-bold uppercase tracking-wide text-muted mb-1';

function explain(message: string): string {
  return /sponsors|does not exist|schema cache/i.test(message) && !/row-level/i.test(message)
    ? "The sponsors list isn't in the database yet: it arrives with this update's database change. Until then the site shows the list built into it."
    : message;
}

async function uploadLogo(file: File): Promise<{ url?: string; error?: string }> {
  if (!/^image\//.test(file.type)) return { error: 'Pick an image file (PNG, JPG, WebP or SVG).' };
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const stem = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'logo';
  const path = `sponsors/${Date.now()}-${stem}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false });
  if (error) return { error: error.message };
  return { url: supabase.storage.from('media').getPublicUrl(path).data.publicUrl };
}

const okUrl = (u: string) => !u.trim() || /^https?:\/\/\S+\.\S+/.test(u.trim());

export default function SponsorsEditor() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data, error } = await supabase.from('sponsors').select('id, name, url, logo, sort_order').order('sort_order', { ascending: true });
    if (error) {
      setErr(explain(error.message));
      setRows([]);
      return;
    }
    setErr('');
    setRows((data ?? []) as Row[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function move(row: Row, dir: -1 | 1) {
    const list = rows ?? [];
    const i = list.findIndex((r) => r.id === row.id);
    const other = list[i + dir];
    if (!other) return;
    const a = other.sort_order === row.sort_order ? row.sort_order + dir : other.sort_order;
    const now = new Date().toISOString();
    const results = await Promise.all([
      supabase.from('sponsors').update({ sort_order: a, updated_at: now }).eq('id', row.id),
      supabase.from('sponsors').update({ sort_order: row.sort_order, updated_at: now }).eq('id', other.id),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) setErr(failed.error.message);
    load();
  }

  async function remove(row: Row) {
    if (!window.confirm(`Remove ${row.name} from the sponsors? This publishes right away.`)) return;
    const { error } = await supabase.from('sponsors').delete().eq('id', row.id);
    if (error) setErr(error.message);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-disp font-bold uppercase text-2xl">
          Sponsors {rows && rows.length > 0 && <span className="ml-2 font-body normal-case tracking-normal text-[13px] font-normal text-muted">{rows.length}</span>}
        </h2>
        <a href={`${import.meta.env.BASE_URL}sponsors`} target="_blank" rel="noreferrer" className="text-[13.5px] font-bold text-brand-blue hover:underline">
          View the sponsors page ↗
        </a>
      </div>
      <p className="text-muted text-[13.5px] mb-5 max-w-[78ch]">
        The corporate sponsors in the homepage band, the member portal (the band across the bottom and the Corporate sponsors tab) and
        on the Sponsors page, in this order. A sponsor without a logo shows its initials in the band and the portal, and its name on the
        Sponsors page; one without a website shows without a link. Changes publish when you save.
      </p>

      {err && (
        <p className="text-brand-redink font-semibold text-[13.5px] mb-4" role="alert">
          {err}
        </p>
      )}
      {rows === null ? (
        <p className="text-muted text-[14px]" role="status">
          Loading the sponsors…
        </p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-3 mb-5">
          {rows.map((row, i) => (
            <SponsorRow key={row.id} row={row} first={i === 0} last={i === rows.length - 1} onMove={(d) => move(row, d)} onRemove={() => remove(row)} onSaved={load} />
          ))}
        </ul>
      )}

      {adding ? (
        <AddSponsor
          after={Math.max(0, ...(rows ?? []).map((r) => r.sort_order))}
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="btn-red !py-2 !px-4 text-[13px]">
          + Add a sponsor
        </button>
      )}
    </div>
  );
}

function LogoPicker({ logo, setLogo, name }: { logo: string; setLogo: (l: string) => void; name: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const src = sponsorLogoSrc(logo);
  return (
    <div className="flex items-center gap-3">
      <span className="flex-none w-[96px] h-[56px] rounded-lg border border-line bg-white grid place-items-center overflow-hidden">
        {src ? (
          <img src={src} alt={`${name || 'Sponsor'} logo`} className="max-h-[44px] max-w-[84px] object-contain" />
        ) : (
          <span className="text-[11px] text-muted text-center px-1">Name shown</span>
        )}
      </span>
      <div className="flex flex-col gap-1">
        <label className="text-[13px] font-semibold text-brand-blue cursor-pointer hover:underline">
          {busy ? 'Uploading…' : src ? 'Upload a new logo' : 'Upload a logo'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setBusy(true);
              setErr('');
              const r = await uploadLogo(f);
              setBusy(false);
              if (r.error) setErr(r.error);
              else if (r.url) setLogo(r.url);
            }}
          />
        </label>
        {src && (
          <button type="button" onClick={() => setLogo('')} className="text-left text-[12.5px] font-semibold text-muted hover:text-ink">
            Remove logo (show the name)
          </button>
        )}
        {err && (
          <span className="text-brand-redink text-[12px] font-semibold" role="alert">
            {err}
          </span>
        )}
      </div>
    </div>
  );
}

function SponsorRow({ row, first, last, onMove, onRemove, onSaved }: { row: Row; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onRemove: () => void; onSaved: () => void }) {
  const [name, setName] = useState(row.name);
  const [url, setUrl] = useState(row.url);
  const [logo, setLogo] = useState(row.logo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const dirty = name !== row.name || url !== row.url || logo !== row.logo;

  async function save() {
    if (!name.trim()) return setErr('A sponsor needs a name.');
    if (!okUrl(url)) return setErr('The website should start with https://');
    setBusy(true);
    setErr('');
    setMsg('');
    const { error } = await supabase.from('sponsors').update({ name: name.trim(), url: url.trim(), logo, updated_at: new Date().toISOString() }).eq('id', row.id);
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setMsg('Saved');
      onSaved();
    }
  }

  return (
    <li className="border border-line rounded-xl bg-white px-4 py-4">
      <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr] items-end">
        <LogoPicker logo={logo} setLogo={setLogo} name={name} />
        <label className="block">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>Website</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={field} placeholder="https://…" maxLength={300} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy || !dirty} className="btn-outline !py-1.5 !px-4 text-[13px] disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => onMove(-1)} disabled={first} className="btn-outline !py-1.5 !px-3 text-[13px] disabled:opacity-40" aria-label={`Move ${row.name} up`}>
          ↑
        </button>
        <button onClick={() => onMove(1)} disabled={last} className="btn-outline !py-1.5 !px-3 text-[13px] disabled:opacity-40" aria-label={`Move ${row.name} down`}>
          ↓
        </button>
        <button onClick={onRemove} className="ml-auto text-[13px] font-semibold text-brand-redink hover:underline">
          Remove sponsor
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

function AddSponsor({ after, onDone, onCancel }: { after: number; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function add() {
    if (!name.trim()) return setErr('A sponsor needs a name.');
    if (!okUrl(url)) return setErr('The website should start with https://');
    setBusy(true);
    setErr('');
    const { error } = await supabase.from('sponsors').insert({ name: name.trim(), url: url.trim(), logo, sort_order: after + 10 });
    setBusy(false);
    if (error) setErr(explain(error.message));
    else onDone();
  }

  return (
    <div className="border border-brand-blue/40 rounded-xl bg-white px-4 py-4">
      <b className="block text-[14.5px] mb-3">New sponsor</b>
      <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr] items-end">
        <LogoPicker logo={logo} setLogo={setLogo} name={name} />
        <label className="block">
          <span className={label}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} maxLength={120} />
        </label>
        <label className="block">
          <span className={label}>Website</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={field} placeholder="https://…" maxLength={300} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={add} disabled={busy} className="btn-red !py-1.5 !px-4 text-[13px] disabled:opacity-60">
          {busy ? 'Adding…' : 'Add to the end of the list'}
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
