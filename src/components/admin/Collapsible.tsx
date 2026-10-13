import { useId, useState, type ReactNode } from 'react';

// One section of the Site content panel (Events, News, Homepage spotlights,
// Job board, ...). Collapsed by default so the panel opens as a short list
// of titles (board request, Oct 2026); the title row toggles it, and the
// count says what is inside without opening it. `action` (the "+ Add"
// button) sits on the title row; anything that adds or edits should call
// the `open` it receives first, so the form never appears inside a closed
// section. The body stays mounted when closed (`hidden`), so a form being
// typed into survives a collapse.
export default function Collapsible({
  title,
  count,
  noun,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  count: number | null;
  noun: [string, string];
  defaultOpen?: boolean;
  action?: (open: () => void) => ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div className="mb-3 border border-line rounded-2xl">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
          className="flex flex-1 min-w-0 items-center gap-2.5 py-1.5 text-left"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            aria-hidden
            className={`flex-none text-muted transition-transform ${open ? 'rotate-90' : ''}`}
          >
            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-disp font-semibold uppercase text-[14px] tracking-[0.14em] text-body">{title}</span>
          {count !== null && (
            <span className="text-[12px] font-semibold text-muted">
              {count} {count === 1 ? noun[0] : noun[1]}
            </span>
          )}
        </button>
        {action?.(() => setOpen(true))}
      </div>
      <div id={bodyId} hidden={!open} className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}
