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
- Leave out each draft's "How to use this hub" section, the italic
  "Companion hub to ..." paragraph under the title, and the "Draft for
  faemse.org · <date> · @<name>" byline when loading or updating a hub
  (board decisions, 2026-10-13). Section numbers on the site are
  generated, so nothing needs renumbering by hand.
- Each draft's "Maintenance notes" section stays in the text: the site shows
  it to admins only (`forViewer` in `src/lib/hubs.ts`).

## Membership rules have tests

- `tests/membership.test.ts` pins down the membership date rules the
  portal shows: the paid-through date, the 90-day grace window (bylaws 2.05),
  and current / grace / lapsed. Any change to a membership term updates
  those tests in the same change, and `npm test` must pass before it is
  pushed. The nightly site audit runs them; a failing test means the code or
  the rule is wrong, never that the test should be loosened to pass.
- The same rules also live in the database (`is_current_member()`) and the
  renewal reminders (`supabase/functions/renewal-reminders`). A change to a
  term changes all three.
- `is_current_member()` also requires the member portal to be open for
  anyone but admins (`site_settings.settings.portal_open`, the Member portal
  switch in Dues & tools; closed until the launch email, board 2026-10-20).
  That is a launch switch, not a membership term: the date tests don't cover
  it, and the site, the reminders and the payment emails all read it through
  `get_settings()`.

## Database access rules

- `scripts/locked-doors.mjs` (run nightly by the site audit) checks that an
  outsider gets nothing from the private tables. When a migration adds a
  table or function that holds member data, add it to that script's PRIVATE
  list in the same change.
