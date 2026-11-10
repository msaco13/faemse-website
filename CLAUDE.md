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
- Once a month (the 1st) a scheduled session follows
  `.claude/skills/hub-check/SKILL.md`: it checks every fact in the five hubs
  against the official sources and leaves each fix, with its source, in
  Admin → Program hubs → Monthly hub check (AJ, 2026-11-07). It never
  changes a hub: an admin applies, edits or dismisses each fix, and a
  dismissed one never comes back. Apply builds the new text with the hub
  editor's rules (`swapOnce()` in `src/lib/hubCheck.ts`, tested in
  `tests/hubCheck.test.ts`) and refuses if the hub changed since it was
  read. The check reads and writes only through the `hub-check` edge
  function (same key as the sweeps), which calls only `hub_check_state()`
  and `hub_check_apply()` (`supabase/migrations/20261107_hub_check.sql`);
  those write only `hub_check_items` and `hub_check_runs`, both in
  locked-doors' PRIVATE list. Keep it that way.
- Admins edit hubs themselves in Admin → Program hubs, which applies the two
  rules above and the faemse.org spelling fix on every save
  (`src/lib/hubDraft.ts`, tested in `tests/hubDraft.test.ts`). A change to
  these rules changes that file and its tests too.

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
- Seats per organization, the coordinator included: institutional 5,
  corporate 3 (board, 2026-11-04: the person who pays plus two; corporate
  seats never vote). The database enforces them (`org_seat_cap()`); the same
  numbers are in `seatCap()`/`repRows()` in `src/lib/portal.ts` (pinned in
  `tests/membership.test.ts`), `stripe-webhook` and `renewal-reminders`. A
  change to a seat count changes all four.

## Editors never save a record that didn't load

- The hub editor and the member profile form show their fields, and Save
  sends anything, only after that record has loaded (`src/lib/loadGuard.ts`,
  tested in `tests/loadGuard.test.ts`). A failed or missing read shows an
  error with Try again; nothing is saved. `update_my_profile` writes all
  five values as given, so the page is the only guard. `scripts/save-guards.mjs`
  drives both screens with the database played (nightly, in the site audit).
  A new editor that loads one record before saving follows the same rule.

## Database access rules

- `scripts/locked-doors.mjs` (run nightly by the site audit) checks that an
  outsider gets nothing from the private tables. When a migration adds a
  table or function that holds member data, add it to that script's PRIVATE
  list in the same change.

## Weekly job sweep (Job board)

- Every job on the board has a link to apply, whoever adds it: the sweep, a
  member, or the board by hand in Admin (board, 2026-11-06). The database
  refuses a job without one (`jobs_apply_url_check`); the forms say so
  (`applyLinkProblem()` in `src/lib/jobs.ts`, tested in `tests/jobs.test.ts`).

- Once a week a scheduled session follows `.claude/skills/job-sweep/SKILL.md`:
  it finds Fire/EMS, EMS and EMS education jobs in Florida and posts them on
  the Job board by itself (board, 2026-11-06). Jobs that closed come down.
- The sweep never gets database access. It writes only through the
  `job-sweep` edge function (its own key, header `x-sweep-key`), which calls
  only `job_sweep_state()` and `job_sweep_apply()`
  (`supabase/migrations/20261106_job_sweep.sql`). Those touch only jobs with
  source = sweep and the `job_sweep_runs` log. Keep it that way.
- It reads pages only through `scripts/job-sweep/fetch.mjs`, which obeys
  robots.txt (`scripts/job-sweep/robots.mjs`, tested in
  `tests/robots.test.ts`) and never reads job aggregators or
  governmentjobs.com. Never add a way around a block.
- The Job board has three tabs, Fire/EMS first, then EMS and Education, and
  no All tab. On each tab an employer's openings share one card with a
  dropdown, matched by employer name (`groupByEmployer()` in
  `src/lib/jobs.ts`, tested in `tests/jobs.test.ts`), so the sweep writes one
  name per employer. Members reach it from Jobs in the main menu; visitors
  don't see that link, and the portal has no jobs tab (board, 2026-11-06).
- Hiring announcements count (AJ, 2026-11-10): a department that announces
  the day its next hiring window opens goes on the board before it opens,
  with `jobs.opens_on`; the card says "Applications open <date>" until then
  (`opensLater()` in `src/lib/jobs.ts`, tested in `tests/jobs.test.ts`). The
  sweep posts one only when the employer's page, or the testing-service
  posting it names (National Testing Network), gives that day; the board
  can set it by hand in Admin. Job fairs and hiring events stay off both
  the Job board and the calendar for now (AJ, 2026-11-10).
- Admins hide a sweep job in Admin → Site content → Weekly job sweep; the
  sweep never posts a hidden job again. Jobs the board posts by hand
  (source = board) are never touched by the sweep.
- Signed-in current members add jobs from the Job board themselves
  (`member_add_job()`, five a day, source = member) with the link to apply,
  the title and the employer; the type is optional. They post right away as
  "Shared by a member", marked "details coming"; the weekly sweep reads each
  link, fills in the details and type (`member_updates`), and takes closed
  ones down. Who added each one is in `job_submissions`, admins only (in
  locked-doors' PRIVATE list), and never shown on the board.

## Weekly event sweep (calendar)

- Events can run several days: `events.ends_on` is the last day (optional).
  The Events page and the "On the board" strip show the range ("04–08 JAN
  2027") and keep an event upcoming until its last day (`eventDates()` in
  `src/lib/eventDates.ts`, tested in `tests/eventDates.test.ts`; board,
  2026-11-06).
- The same Sunday session runs `.claude/skills/event-sweep/SKILL.md` after
  the job sweep (board, 2026-11-06). By itself it fills in dates and places
  that were TBA and moves past events to next year's dates once posted. New
  events only become suggestions that an admin adds, edits first or
  dismisses in Admin → Site content → Weekly event sweep. Conferences people
  can go to, educator conferences first; never courses, classes, webinars
  or exams on their own (AJ, 2026-11-06). The one exception is CoAEMSP: its
  in-person accreditation workshops count, as does ACCREDITCON.
- Every change it makes is in `event_sweep_changes` with what it replaced;
  admins undo one with `admin_undo_event_sweep_change()`, which refuses if
  the event was edited since, and the sweep never makes an undone change
  again. It never changes an event tagged "Meeting" (a FAEMSE membership
  meeting is the board's call).
- Like the job sweep it has no database access: it writes only through the
  `event-sweep` edge function (same key and header as the job sweep), which
  calls only `event_sweep_state()` and `event_sweep_apply()`
  (`supabase/migrations/20261106_event_sweep.sql`). Those touch only events'
  dates, place, wording and title, `event_suggestions`, the change log and
  `event_sweep_runs`. Keep it that way. Its tables are in locked-doors'
  PRIVATE list.
