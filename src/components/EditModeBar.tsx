import { useState } from 'react';
import { useSiteText } from '../lib/text';

// The admin-only control for in-page text editing. Renders nothing at all for
// visitors and for signed-in members who are not board admins, so the public
// site is unchanged. Writes are gated server-side by RLS (is_admin()) — this
// bar only decides what an admin is shown.

export default function EditModeBar() {
  const { canEdit, editing, setEditing, overrides, reset, needsSetup } = useSiteText();
  const [openList, setOpenList] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  if (!canEdit) return null;

  const ids = Object.keys(overrides).sort();

  async function onReset(id: string) {
    setBusy(id);
    setErr('');
    const error = await reset(id);
    setBusy('');
    if (error) setErr(error);
  }

  return (
    <div className="fixed bottom-4 left-4 z-[150] max-w-[min(420px,calc(100vw-2rem))] print:hidden">
      <div className="rounded-2xl border border-white/15 bg-ink2/95 text-white shadow-[0_24px_60px_rgba(4,10,22,.55)] backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="font-disp text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-goldsoft">
            Board tools
          </span>
          <button
            onClick={() => setEditing(!editing)}
            aria-pressed={editing}
            disabled={needsSetup}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              editing
                ? 'bg-gradient-to-br from-brand-goldsoft to-brand-golddeep text-ink2'
                : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {editing ? 'Editing text' : 'Edit text'}
          </button>
          {ids.length > 0 && (
            <button
              onClick={() => setOpenList(!openList)}
              aria-expanded={openList}
              className="ml-auto text-[12.5px] font-semibold text-[#AFC1E2] hover:text-white"
            >
              {ids.length} edited
            </button>
          )}
        </div>

        {needsSetup && (
          <p className="border-t border-white/10 px-4 py-3 text-[12.5px] leading-relaxed text-brand-goldsoft">
            One-time setup needed: in the Supabase dashboard, open SQL Editor and run{' '}
            <code className="text-white">supabase/migrations/20260912_site_text.sql</code> from the
            website repository. This bar starts working immediately after.
          </p>
        )}

        {editing && !needsSetup && (
          <p className="border-t border-white/10 px-4 py-3 text-[12.5px] leading-relaxed text-[#AFC1E2]">
            Highlighted words are editable — click one to change it. Gold is the original wording,
            green has already been changed. Saving publishes it for everyone.
          </p>
        )}

        {openList && ids.length > 0 && (
          <div className="max-h-[240px] overflow-y-auto border-t border-white/10">
            {ids.map((id) => (
              <div key={id} className="flex items-center gap-2 px-4 py-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate font-mono text-[#AFC1E2]" title={overrides[id]}>
                  {id}
                </span>
                <button
                  onClick={() => onReset(id)}
                  disabled={busy === id}
                  className="flex-none font-semibold text-[#93A6C9] hover:text-brand-redhot disabled:opacity-50"
                >
                  {busy === id ? '…' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        )}

        {err && (
          <p className="border-t border-white/10 px-4 py-2 text-[12.5px] font-semibold text-brand-redhot" role="alert">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
