// Applying a monthly hub check fix in the browser (AJ, 2026-11-07): the fix
// names the exact text now in the hub and its replacement. It applies only
// if that text appears exactly once, and the result goes through the hub
// editor's own rules (cleanHubDraft) before it is saved, the same as any
// edit in Admin → Program hubs. Undo puts the original text back the same
// way. Tested in tests/hubCheck.test.ts. The cleanup is passed in (the
// page passes cleanHubDraft) so this file has no imports and the tests run
// it directly.

type Clean = (text: string) => { body: string };

export function countOf(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

export type Swap = { body: string; used: string } | { problem: string };

// Replace `from` with `to` in `body`, once, then clean the result as the
// hub editor would. `used` is `to` as it reads after the cleanup.
export function swapOnce(body: string, from: string, to: string, clean: Clean): Swap {
  const n = countOf(body, from);
  if (n === 0) return { problem: 'That text is no longer in the hub, so this fix no longer fits. Edit the hub by hand if it still needs it.' };
  if (n > 1) return { problem: 'That text appears more than once in the hub, so it is not clear which to change. Edit the hub by hand.' };
  if (!to.trim()) return { problem: 'The new text is empty.' };
  const i = body.indexOf(from);
  const next = clean(body.slice(0, i) + to + body.slice(i + from.length)).body;
  return { body: next, used: clean(to).body };
}
