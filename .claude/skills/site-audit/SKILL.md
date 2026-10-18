---
name: site-audit
description: Daily audit of the FAEMSE website. Builds a copy of the site, checks every page like a visitor at desktop and phone widths, fixes small bugs on a branch, opens one pull request for AJ to review, and ends with a short summary. Use for the scheduled daily audit, or when AJ says "audit the site" or "/site-audit".
---

# Site audit

You are checking faemse.org for bugs and fixing the small ones. AJ (Jorge Anzardo, board President) reviews and merges every fix. Nothing you do goes live on its own.

## The rule that matters most

Run every step below, every time, in this session. Nothing replaces running the checks yourself: not an audit that already ran today, not a recent "Site audit" pull request, not a quiet commit history. Never say a check passed unless you ran it in this session and saw it pass. The summary reports what this session actually did, with the numbers from `scripts/site-audit.sh`. If a step failed or was skipped, the summary says so plainly, first. A false "clean" is the worst outcome this audit can have; an honest "could not finish" is fine.

## Hard limits

These hold no matter what you find.

- Fix bugs only. No redesigns, no new features, no changes to the site's wording or content. The one wording exception is the standing corrections in CLAUDE.md (for example "famsy.org" becomes faemse.org).
- Keep each fix small and limited to that one bug.
- Never touch the database or member data. Do not run SQL, do not apply migrations, do not edit `supabase/migrations/`, do not use Supabase tools to write anything. Do not change `site_text` overrides or hub text.
- Never submit a form. Check forms by looking at them; `scripts/audit.mjs` blocks write requests as a safety net.
- Never push to `main` and never merge. Fixes go on a branch with a pull request.
- If the build fails on `main` before you change anything, stop. Do not try to force it through. Report what failed.
- Dependency updates: only what `npm audit fix` does without `--force`, and only if the build still passes afterward. Anything needing `--force` or a major version is reported, not done.
- When unsure whether something is a bug or a choice someone made on purpose, report it and leave it alone.

## Steps

1. **Start clean.** Fetch the latest `main` and make sure your working branch starts from it.

2. **Run the automatic checks.** One command does the install, the build, every page, accessibility, and the dependency scan:

   ```
   bash scripts/site-audit.sh
   ```

   It takes a few minutes. Let it finish; do not stop it early or run only part of it. It ends with a block headed `SITE AUDIT REPORT` and a `RESULT:` line. Keep that block: the summary is built from it.

   - `RESULT: INCOMPLETE` means a check could not run. Read the output above the report to see why, fix the cause if it is in this environment (for example a missing browser path) and run the script again. If it still cannot finish, stop and report exactly which checks did not run and the error.
   - If the build failed, stop. Report the error. Nothing else counts as checked.

   What the page check looks for: pages that fail to load or show the error card, console errors, missing images, internal links to pages that do not exist, pages wider than the screen, forms without a submit button or with unlabeled fields, and pages slower than 3 seconds, at desktop (1280px) and phone (390px) widths. Outside links are listed as "not checked" because the network blocks most outside sites; do not report those as broken. Members-only pages are checked signed in only when `AUDIT_EMAIL` and `AUDIT_PASSWORD` are set; otherwise the report says they were skipped, which is expected until the test account exists.

   If the routes in `src/App.tsx` no longer match the list at the top of `scripts/audit.mjs`, update the list. That is part of the fix, not a finding.

   Accessibility: fix violations that are clearly bugs (a missing label, a missing alt text). Color-contrast findings that would mean changing the palette are design choices: report them, do not change colors.

3. **Look at a few pages yourself.** The script cannot judge looks. Start a local copy (`npm run build && node node_modules/vite/bin/vite.js preview --port 4173 &`), take phone-width screenshots of the home page, Membership, and any page the last day's commits touched, and look for overlapping text, cut-off buttons, or anything plainly broken. Sections fade in as they scroll into view, so scroll the whole page top to bottom before a full-page screenshot; otherwise those sections show up as empty space and look broken when they are not. Stop the preview server when done.

4. **Review the last day's commits.** Several people and Claude sessions push to this repo. Read the diff of everything merged to `main` in the last 24 hours (`git log --since="26 hours ago" -p origin/main`) and look for bugs: broken logic, typos in code, a page or link removed by accident. If there were none, say so in the summary.

5. **Dependencies.** The report gives the advisory count. Run `npm audit fix` (no `--force`). If it changes `package-lock.json`, rebuild; keep the change only if the build passes. Report what is left and how serious it is. If the count is the same as the last audit pull request reported, say "no new advisories".

6. **Standing corrections.** Search the code for the misspellings listed in CLAUDE.md (such as "famsy.org" and "famse.org") and correct them. Misspellings in database text (hubs, edited site text) you can only report.

7. **Fix.** For each real bug: find the cause, make the smallest fix, and prove it is gone by running `bash scripts/site-audit.sh` again. One commit per fix, with a plain message saying what was broken.

8. **Pull request.** If you fixed anything:
   - Look for an open pull request whose title starts with "Site audit". If one exists, add your fixes to it rather than opening a second one: push to its branch if you can, otherwise merge its branch into yours, open the new one, and close the old one with a comment pointing to the new one.
   - Title: `Site audit YYYY-MM-DD: <short list of fixes>`.
   - Body: what was broken, how you fixed it, and how you checked it, one short paragraph per fix, then the final `SITE AUDIT REPORT` block in a code block. Do not request a reviewer: the pull request is opened under AJ's own GitHub account (`jlanzardo-code`), and GitHub does not allow requesting review from the author. The summary's link is how AJ finds it.
   - Use the GitHub MCP tools; there is no `gh` CLI.

## The summary

Your last message is the summary. AJ gets it as a phone notification and by email, so it must stand on its own. Plain words, short sentences, no jargon, no bullet lists. Keep it under about 200 words. Every number in it comes from the report block of a run in this session.

Say, in this order:

- If any check failed or did not run: that first, naming the check and the error.
- What was checked, with the numbers: pages and widths, issues found, accessibility pages passed, advisories.
- What you found and fixed, with the pull request link.
- Anything you found but could not or should not fix, and what AJ needs to do about it.
- What was not checked (members-only pages skipped, outside links not checked).

Only when the report's last line was `RESULT: ALL CHECKS RAN. Nothing found.` and steps 3 to 6 found nothing either, the summary is these two sentences, with the numbers from the report filled in:

"The site is clean. Build passed, <N> pages checked at desktop and phone widths with 0 issues, accessibility passed on <A> of <A> pages, <D> dependency advisories (no new ones), <C> new commits reviewed."

If the build failed on `main`, lead with that: what failed, the error in a code block, and that nothing else was checked.
