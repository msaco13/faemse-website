# Notes for Claude

## Standing corrections

- **"famsy.org" means faemse.org.** The board drafts by voice, and
  voice-to-text turns the domain into "famsy.org", "famse.org" and similar.
  Wherever a misspelled version appears (site text, drafts the board hands
  over, the program hubs in the `admin_documents` table), correct it to
  faemse.org without asking, and mention the fix in your reply. Board
  request, 2026-10-13.

## Program hubs (`admin_documents`, shown at /hubs)

- Members-only content; admins edit. The hub text lives only in the
  database, never in this public repository.
- Leave out each draft's "How to use this hub" section when loading or
  updating a hub (board decision, 2026-10-13). Section numbers on the site
  are generated, so nothing needs renumbering by hand.
- Each draft's "Maintenance notes" section stays in the text: the site shows
  it to admins only (`forViewer` in `src/lib/hubs.ts`).
