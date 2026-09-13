// Admin-editable site wording.
//
// Every piece of static copy on the public site is wrapped in <T id="...">,
// with the original words as its children. Those children are the default: if
// the site_text table is missing, unreachable, or simply has no row for that
// id, the page renders exactly what is written in the code. A saved override
// replaces it.
//
// Signed-in admins get an "Edit text" toggle (components/EditModeBar). With it
// on, every wrapped string becomes clickable and opens an editor; saving
// writes one row to site_text and the new wording is live for everyone.
//
// Viewing is untouched. With edit mode off, <T> renders a bare string with no
// wrapper element, so the public DOM is identical to hard-coded copy and
// nothing about layout, styling, or SEO changes for visitors.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { supabase } from './supabase';
import { useMemberStatus } from './useMemberStatus';

export type TextMap = Record<string, string>;

// Overrides are cached per browser so returning visitors never see the
// hard-coded wording flash and then swap. First-ever visit still shows the
// code's words for the moment the fetch takes.
const CACHE_KEY = 'faemse:site-text';
const MISSING_TABLE = 'PGRST205';

function readCache(): TextMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: TextMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeCache(map: TextMap): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* private windows and full quotas just lose the cache, not the site */
  }
}

function withTimeout<T>(p: PromiseLike<T>, ms = 5000): Promise<T> {
  let timer = 0;
  return Promise.race([
    Promise.resolve(p),
    new Promise<never>((_, rej) => {
      timer = window.setTimeout(() => rej(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * A stable key fragment for an item in a list. Ids built from an item's own
 * wording survive the list being reordered or a new item being inserted;
 * ids built from the array index would silently show an override on the
 * wrong card.
 */
export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/, '') || 'item'
  );
}

type Active = { id: string; fallback: string };

type SiteTextValue = {
  overrides: TextMap;
  resolve: (id: string, fallback: string) => string;
  canEdit: boolean;
  editing: boolean;
  setEditing: (on: boolean) => void;
  /** The site_text table has not been created yet (migration not run). */
  needsSetup: boolean;
  openEditor: (id: string, fallback: string) => void;
  /** Returns an error message, or null on success. */
  save: (id: string, value: string) => Promise<string | null>;
  reset: (id: string) => Promise<string | null>;
};

const SiteTextContext = createContext<SiteTextValue | null>(null);

export function useSiteText(): SiteTextValue {
  const ctx = useContext(SiteTextContext);
  if (!ctx) throw new Error('useSiteText must be used inside <SiteTextProvider>');
  return ctx;
}

export function SiteTextProvider({ children }: PropsWithChildren) {
  const status = useMemberStatus();
  const [overrides, setOverrides] = useState<TextMap>(readCache);
  const [editing, setEditingState] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [active, setActive] = useState<Active | null>(null);
  // Set by save/reset. If the initial fetch resolves after an admin has
  // already written, its snapshot is older than what is on screen and must
  // not replace it.
  const dirty = useRef(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.from('site_text').select('key, value'));
        if (error) {
          if (error.code === MISSING_TABLE && on) setNeedsSetup(true);
          return;
        }
        if (!data || !on || dirty.current) return;
        const map: TextMap = {};
        for (const row of data as { key: string; value: string }[]) map[row.key] = row.value;
        setOverrides(map);
        writeCache(map);
      } catch {
        /* keep the cached or hard-coded wording; never blank the site */
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const canEdit = status.admin;

  // Leaving edit mode (or losing admin) must also close any open editor.
  const setEditing = useCallback((on: boolean) => {
    setEditingState(on);
    if (!on) setActive(null);
  }, []);
  useEffect(() => {
    if (!canEdit) setEditing(false);
  }, [canEdit, setEditing]);

  const resolve = useCallback(
    (id: string, fallback: string) => {
      const v = overrides[id];
      return typeof v === 'string' && v !== '' ? v : fallback;
    },
    [overrides],
  );

  // Remember what had focus so closing the editor puts the keyboard back on
  // the phrase that opened it instead of dropping it on <body>.
  const opener = useRef<HTMLElement | null>(null);
  const openEditor = useCallback((id: string, fallback: string) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActive({ id, fallback });
  }, []);
  const closeEditor = useCallback(() => {
    setActive(null);
    const back = opener.current;
    opener.current = null;
    if (back && back.isConnected) back.focus({ preventScroll: true });
  }, []);

  const save = useCallback(async (id: string, value: string): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getSession();
    const { error } = await supabase.from('site_text').upsert(
      { key: id, value, updated_at: new Date().toISOString(), updated_by: auth.session?.user.id ?? null },
      { onConflict: 'key' },
    );
    if (error) return error.code === MISSING_TABLE ? 'The site_text table has not been created yet.' : error.message;
    dirty.current = true;
    setOverrides((m) => {
      const next = { ...m, [id]: value };
      writeCache(next);
      return next;
    });
    return null;
  }, []);

  const reset = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('site_text').delete().eq('key', id);
    if (error) return error.message;
    dirty.current = true;
    setOverrides((m) => {
      const next = { ...m };
      delete next[id];
      writeCache(next);
      return next;
    });
    return null;
  }, []);

  const value = useMemo<SiteTextValue>(
    () => ({ overrides, resolve, canEdit, editing, setEditing, needsSetup, openEditor, save, reset }),
    [overrides, resolve, canEdit, editing, setEditing, needsSetup, openEditor, save, reset],
  );

  return (
    <SiteTextContext.Provider value={value}>
      {children}
      {active && <EditorPanel active={active} onClose={closeEditor} />}
    </SiteTextContext.Provider>
  );
}

/**
 * One editable string. `children` is the wording that ships in the code and
 * stays the fallback; `id` is its stable key in the site_text table.
 *
 * With edit mode off this renders a bare string, adding nothing to the DOM.
 */
export function T({ id, children }: { id: string; children: string }) {
  const { resolve, editing } = useSiteText();
  const value = resolve(id, children);
  if (!editing) return <>{value}</>;
  return <EditableSpan id={id} fallback={children} value={value} />;
}

/**
 * The same string as a plain value, for places that cannot hold an element:
 * document titles, meta descriptions, alt text, aria-labels, placeholders.
 */
export function useText(id: string, fallback: string): string {
  return useSiteText().resolve(id, fallback);
}

function EditableSpan({ id, fallback, value }: { id: string; fallback: string; value: string }) {
  const { openEditor, overrides } = useSiteText();
  const custom = typeof overrides[id] === 'string';
  return (
    <span
      role="button"
      tabIndex={0}
      title={`Edit "${id}"`}
      onClick={(e) => {
        // Copy often sits inside a card that is itself a link.
        e.preventDefault();
        e.stopPropagation();
        openEditor(id, fallback);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        openEditor(id, fallback);
      }}
      className={`cursor-text rounded-[3px] underline decoration-dashed decoration-from-font underline-offset-4 transition-colors ${
        custom
          ? 'decoration-[#3ADB8F] bg-[#3ADB8F]/15 hover:bg-[#3ADB8F]/30'
          : 'decoration-[#F5CE5A] bg-[#F5CE5A]/15 hover:bg-[#F5CE5A]/30'
      }`}
    >
      {value}
    </span>
  );
}

function EditorPanel({ active, onClose }: { active: Active; onClose: () => void }) {
  const { resolve, overrides, save, reset } = useSiteText();
  const [draft, setDraft] = useState(() => resolve(active.id, active.fallback));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const custom = typeof overrides[active.id] === 'string';

  async function onSave() {
    const next = draft.trim();
    if (next === '') {
      setErr('Wording cannot be empty. Use "Restore original" to put the built-in words back.');
      return;
    }
    setBusy(true);
    setErr('');
    const error = next === active.fallback ? await reset(active.id) : await save(active.id, next);
    setBusy(false);
    if (error) setErr(error);
    else onClose();
  }

  async function onReset() {
    setBusy(true);
    setErr('');
    const error = await reset(active.id);
    setBusy(false);
    if (error) setErr(error);
    else onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink2/45 p-4 sm:items-center"
      // Escape is handled here, on the dialog itself, and stopped so it never
      // reaches the mobile menu's window-level Escape handler and closes both.
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        onClose();
      }}
    >
      {/* Click-away layer. Keyboard users close with Escape or the Cancel button. */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit wording"
        className="relative w-full max-w-[680px] rounded-2xl border border-line bg-white p-6 shadow-[0_40px_90px_rgba(4,10,22,.45)]"
      >
        <h2 className="font-disp text-xl font-bold uppercase">Edit wording</h2>
        <p className="mb-4 mt-1 break-all font-mono text-[12px] text-muted">{active.id}</p>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Text shown on the site</span>
          <textarea
            autoFocus
            rows={Math.min(12, Math.max(3, Math.ceil(draft.length / 60)))}
            value={draft}
            maxLength={8000}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-brand-blue"
          />
        </label>

        {custom && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-muted hover:text-ink">
              Show the original wording
            </summary>
            <p className="mt-2 max-w-[70ch] border-l-[3px] border-line pl-4 text-[14px] text-muted">
              {active.fallback}
            </p>
          </details>
        )}

        {err && (
          <p className="mt-3 text-[13.5px] font-semibold text-brand-red" role="alert">
            {err}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={onSave} disabled={busy} className="btn-red !px-5 !py-2.5 text-[14px] disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="btn-outline !px-5 !py-2.5 text-[14px]">
            Cancel
          </button>
          {custom && (
            <button
              onClick={onReset}
              disabled={busy}
              className="text-[13px] font-semibold text-muted hover:text-brand-red disabled:opacity-60"
            >
              Restore original
            </button>
          )}
          <span className="ml-auto text-[12.5px] text-muted">Saved changes are live for everyone.</span>
        </div>
      </div>
    </div>
  );
}
