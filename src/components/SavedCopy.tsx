import { T } from '../lib/text';

// What a listing page shows when the database can't be reached: the
// visitor's saved copy of the real listings, dated, with a caution (`note`),
// or a plain "can't load" card when this browser has no copy. Never samples
// (board, 2026-10-20). Text ids: <id>.saved.lead, <id>.saved.note, <id>.down.
export function SavedCopyNote({ id, savedAt, note }: { id: string; savedAt: string; note: string }) {
  return (
    <p className="mb-5 text-[14.5px] text-brand-goldink bg-[#FBF3D9] px-4 py-3 rounded-xl" role="status">
      <b>
        <T id={`${id}.saved.lead`}>Saved copy from</T>{' '}
        {new Date(savedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
      </b>{' '}
      <T id={`${id}.saved.note`}>{note}</T>
    </p>
  );
}

export function CantLoad({ id, what }: { id: string; what: string }) {
  return (
    <div className="card p-8 text-muted" role="status">
      <T id={`${id}.down`}>{`The ${what} can't load right now. Try again in a few minutes.`}</T>
    </div>
  );
}
