// Admin-editable pictures and logos.
//
// The counterpart of text.tsx for images. A picture that the board should be
// able to resize or swap is rendered through <Pic id="..." src={...} size={n}>;
// the src and size written in the code are the defaults. An override is one
// site_text row (key `media.<id>`, value a small JSON object) so it rides on
// the same table, RLS, cache, and "N edited" list as the wording — no second
// table or migration.
//
// With edit mode on, every <Pic> gets a dashed gold frame (green once changed)
// and opens an editor on click: a size slider, an Upload button that puts the
// file in the public `media` bucket, and Restore original. With edit mode off
// it renders a bare <img>, so visitors get the same DOM as a hard-coded image.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type PropsWithChildren,
} from 'react';
import { supabase } from './supabase';
import { useSiteText } from './text';

export type MediaDefault = { src: string; size: number };
export type MediaValue = MediaDefault & { custom: boolean };

const KEY_PREFIX = 'media.';
const MIN_PX = 8;
const MAX_PX = 2000;

function parse(raw: string | undefined, fallback: MediaDefault): MediaValue {
  if (typeof raw !== 'string' || raw === '') return { ...fallback, custom: false };
  try {
    const o: unknown = JSON.parse(raw);
    if (!o || typeof o !== 'object') return { ...fallback, custom: false };
    const { src, size } = o as { src?: unknown; size?: unknown };
    const okSrc = typeof src === 'string' && /^https?:\/\//.test(src) ? src : fallback.src;
    const okSize =
      typeof size === 'number' && Number.isFinite(size) ? Math.min(MAX_PX, Math.max(MIN_PX, Math.round(size))) : fallback.size;
    const custom = okSrc !== fallback.src || okSize !== fallback.size;
    return { src: okSrc, size: okSize, custom };
  } catch {
    return { ...fallback, custom: false };
  }
}

/**
 * The picture and size to show for a slot: the saved override when there is
 * one, otherwise the defaults from the code. For places that draw the image
 * themselves (the hero crest) rather than through <Pic>.
 */
export function useMedia(id: string, fallback: MediaDefault): MediaValue {
  const { overrides } = useSiteText();
  const raw = overrides[KEY_PREFIX + id];
  // Callers memoize `fallback`, so this only re-parses when the row changes.
  return useMemo(() => parse(raw, fallback), [raw, fallback]);
}

type Active = { id: string; fallback: MediaDefault; label: string; square: boolean };

type MediaCtx = {
  openEditor: (active: Active) => void;
};

const MediaContext = createContext<MediaCtx | null>(null);

export function useMediaEditor(): MediaCtx {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error('useMediaEditor must be used inside <MediaProvider>');
  return ctx;
}

/** Owns the picture editor dialog. Mount once, inside <SiteTextProvider>. */
export function MediaProvider({ children }: PropsWithChildren) {
  const [active, setActive] = useState<Active | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openEditor = useCallback((a: Active) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActive(a);
  }, []);
  const close = useCallback(() => {
    setActive(null);
    const back = opener.current;
    opener.current = null;
    if (back && back.isConnected) back.focus({ preventScroll: true });
  }, []);
  const value = useMemo(() => ({ openEditor }), [openEditor]);
  return (
    <MediaContext.Provider value={value}>
      {children}
      {active && <MediaEditor active={active} onClose={close} />}
    </MediaContext.Provider>
  );
}

type PicProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'id'> & {
  /** Stable slot name, e.g. "seal.header". Becomes the site_text key `media.<id>`. */
  id: string;
  /** The image shipped with the code; stays the fallback. */
  src: string;
  /** Rendered width in CSS pixels. Height follows (square when `square`). */
  size: number;
  /** Square pictures (seals, avatars) lock height to width. */
  square?: boolean;
  /** Shown in the editor's title so the board knows which placement this is. */
  label?: string;
  /** Upgrade to a larger source file above this rendered width. */
  srcLarge?: string;
  largeAbove?: number;
};

/**
 * One editable picture. Renders a plain <img> for visitors; in edit mode it
 * becomes clickable and opens the picture editor. Size is applied as inline
 * width/height so the board's choice wins over any Tailwind width class.
 */
export function Pic({ id, src, size, square = false, label, srcLarge, largeAbove = 96, className = '', alt = '', style, ...rest }: PicProps) {
  const { editing } = useSiteText();
  const fallback = useMemo(() => ({ src, size }), [src, size]);
  const media = useMedia(id, fallback);
  const { openEditor } = useMediaEditor();
  // The default seal comes in two files; pick the sharp one for big renders.
  const shown = media.src === src && srcLarge && media.size > largeAbove ? srcLarge : media.src;
  const dims: CSSProperties = { width: media.size, height: square ? media.size : 'auto', ...style };

  if (!editing) {
    return <img src={shown} alt={alt} aria-hidden={alt === '' || undefined} decoding="async" className={className} style={dims} {...rest} />;
  }

  const open = () => openEditor({ id, fallback, label: label ?? id, square });
  return (
    <img
      src={shown}
      alt={alt || label || id}
      role="button"
      tabIndex={0}
      title={`Edit picture "${id}"`}
      decoding="async"
      onClick={(e) => {
        // Logos usually sit inside a link (header, footer).
        e.preventDefault();
        e.stopPropagation();
        open();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        open();
      }}
      className={`${className} cursor-pointer rounded-[4px] outline outline-2 outline-dashed outline-offset-2 transition-shadow hover:shadow-[0_0_0_6px_rgba(245,206,90,.25)] ${
        media.custom ? 'outline-[#3ADB8F]' : 'outline-[#F5CE5A]'
      }`}
      style={dims}
      {...rest}
    />
  );
}

export function mediaKey(id: string): string {
  return KEY_PREFIX + id;
}

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const LIMIT = 50 * 1024 * 1024;

function MediaEditor({ active, onClose }: { active: Active; onClose: () => void }) {
  const { overrides, save, reset } = useSiteText();
  const key = mediaKey(active.id);
  const current = parse(overrides[key], active.fallback);
  const [src, setSrc] = useState(current.src);
  const [size, setSize] = useState(current.size);
  const [busy, setBusy] = useState<'' | 'upload' | 'save'>('');
  const [err, setErr] = useState('');
  const def = active.fallback;
  const lo = Math.max(MIN_PX, Math.round(def.size / 3));
  const hi = Math.min(MAX_PX, def.size * 4);
  const pct = Math.round((size / def.size) * 100);

  async function upload(file: File) {
    setErr('');
    if (!file.type.startsWith('image/')) {
      setErr('Choose an image file (PNG, JPG, WebP, or GIF).');
      return;
    }
    if (file.size > LIMIT) {
      setErr('That file is over the 50 MB limit — compress it and try again.');
      return;
    }
    setBusy('upload');
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const stem = active.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const path = `site/${stem}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '31536000', upsert: false });
    if (error) setErr(error.message);
    else setSrc(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
    setBusy('');
  }

  async function onSave() {
    const px = Math.min(MAX_PX, Math.max(MIN_PX, Math.round(size)));
    setBusy('save');
    setErr('');
    const unchanged = src === def.src && px === def.size;
    const error = unchanged
      ? current.custom
        ? await reset(key)
        : null
      : await save(key, JSON.stringify({ ...(src !== def.src ? { src } : {}), ...(px !== def.size ? { size: px } : {}) }));
    setBusy('');
    if (error) setErr(error);
    else onClose();
  }

  async function onReset() {
    setBusy('save');
    setErr('');
    const error = await reset(key);
    setBusy('');
    if (error) setErr(error);
    else onClose();
  }

  const previewSize = Math.min(size, 320);
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-ink2/45 p-4 sm:items-center"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit picture"
        className="relative w-full max-w-[680px] rounded-2xl border border-line bg-white p-6 shadow-[0_40px_90px_rgba(4,10,22,.45)]"
      >
        <h2 className="font-disp text-xl font-bold uppercase">Edit picture</h2>
        <p className="mb-4 mt-1 text-[13px] text-muted">
          {active.label} <span className="break-all font-mono text-[12px]">· {key}</span>
        </p>

        {/* Preview on the site's navy, where most logos live; shown at the
            chosen size (capped so a huge crest still fits the dialog). */}
        <div className="velvet grid place-items-center overflow-auto rounded-xl bg-ink2 p-6" style={{ minHeight: 180 }}>
          <img
            src={src}
            alt=""
            style={{ width: previewSize, height: active.square ? previewSize : 'auto' }}
            className="drop-shadow-[0_8px_30px_rgba(0,0,0,.5)]"
            onError={(e) => ((e.currentTarget.style.opacity = '0.25'))}
          />
        </div>
        {size > 320 && <p className="mt-1 text-[12px] text-muted">Preview capped at 320px; the site shows it at {size}px.</p>}

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Size — {size}px ({pct}% of the default {def.size}px)
            </span>
            <input
              type="range"
              min={lo}
              max={hi}
              step={1}
              value={Math.min(hi, Math.max(lo, size))}
              onChange={(e) => setSize(Number(e.target.value))}
              className="mt-2 w-full accent-brand-red"
              aria-label="Picture size in pixels"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Pixels</span>
            <input
              type="number"
              min={MIN_PX}
              max={MAX_PX}
              value={size}
              onChange={(e) => setSize(Number(e.target.value) || def.size)}
              className="mt-1 w-28 rounded-xl border border-line px-3 py-2 text-[15px] outline-none focus:border-brand-blue"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={`btn-outline relative !px-5 !py-2.5 text-[14px] ${busy ? 'opacity-60' : 'cursor-pointer'}`}>
            {busy === 'upload' ? 'Uploading…' : 'Upload new image'}
            <input
              type="file"
              accept={ACCEPT}
              disabled={busy !== ''}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = '';
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Upload new image"
            />
          </span>
          {src !== def.src && (
            <button onClick={() => setSrc(def.src)} className="text-[13px] font-semibold text-muted hover:text-ink">
              Use the original image
            </button>
          )}
          <span className="text-[12.5px] text-muted">PNG, JPG, WebP, or GIF, up to 50 MB. A transparent PNG or WebP works best for logos.</span>
        </div>

        {err && (
          <p className="mt-3 text-[13.5px] font-semibold text-brand-red" role="alert">
            {err}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={onSave} disabled={busy !== ''} className="btn-red !px-5 !py-2.5 text-[14px] disabled:opacity-60">
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="btn-outline !px-5 !py-2.5 text-[14px]">
            Cancel
          </button>
          {current.custom && (
            <button
              onClick={onReset}
              disabled={busy !== ''}
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
