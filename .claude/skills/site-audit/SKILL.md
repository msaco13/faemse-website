---
name: site-audit
description: Daily audit of the FAEMSE website. Builds a copy of the site, checks every page like a visitor at desktop and phone widths, fixes small bugs on a branch, opens one pull request for AJ to review, and ends with a short summary. Use for the scheduled daily audit, or when AJ says "audit the site" or "/site-audit".
---

# Site audit

You are checking faemse.org for bugs and fixing the small ones. AJ (Jorge Anzardo, board President) reviews and merges every fix. Nothing you do goes live on its own.

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

1. **Start clean.** Fetch the latest `main` and branch from it. Run `npm ci`.

2. **Build.** Run `npm run build` (type check plus build). If it fails, stop here and report the error.

3. **Visit every page.** Start a local copy and run the audit script:

   ```
   npx vite preview --port 4173 &
   AUDIT_CHROME=/opt/pw-browsers/chromium npm run audit
   ```

   It visits every route at desktop (1280px) and phone (390px) widths and reports: pages that fail to load or show the error card, console errors, missing images, internal links to pages that do not exist, pages wider than the screen, forms without a submit button or with unlabeled fields, and pages slower than 3 seconds. Outside links are listed as "not checked" because the network blocks most outside sites. Do not report those as broken.

   Members-only pages are checked signed in only when `AUDIT_EMAIL` and `AUDIT_PASSWORD` are set. Otherwise the report says they were skipped. That is expected until the test account exists.

   If the routes in `src/App.tsx` no longer match the list at the top of `scripts/audit.mjs`, update the list. That is part of the fix, not a finding.

4. **Accessibility.** Run `A11Y_SITE=http://localhost:4173 A11Y_CHROME=/opt/pw-browsers/chromium npm run a11y`. Fix violations that are clearly bugs (a missing label, a missing alt text). Color-contrast findings that would mean changing the palette are design choices: report them, do not change colors.

5. **Look at a few pages yourself.** The script cannot judge looks. Take phone-width screenshots of the home page, Membership, and any page the last day's commits touched, and look for overlapping text, cut-off buttons, or anything plainly broken. Sections fade in as they scroll into view, so scroll the whole page top to bottom before a full-page screenshot; otherwise those sections show up as empty space and look broken when they are not.

6. **Review the last day's commits.** Several people and Claude sessions push to this repo. Read the diff of everything merged to `main` in the last 24 hours (`git log --since="26 hours ago" origin/main`) and look for bugs: broken logic, typos in code, a page or link removed by accident.

7. **Dependencies.** Run `npm audit`. Apply `npm audit fix` (no `--force`) only if it changes something, then rebuild. Report anything it could not fix and how serious it is.

8. **Standing corrections.** Search the code for the misspellings listed in CLAUDE.md (such as "famsy.org" and "famse.org") and correct them. Misspellings in database text (hubs, edited site text) you can only report.

9. **Fix.** For each real bug: find the cause, make the smallest fix, rebuild, and rerun whatever check found it to prove it is gone. One commit per fix, with a plain message saying what was broken.

10. **Pull request.** If you fixed anything:
    - Look for an open pull request whose title starts with "Site audit". If one exists, add your fixes to it rather than opening a second one: push to its branch if you can, otherwise merge its branch into yours, open the new one, and close the old one with a comment pointing to the new one.
    - Title: `Site audit YYYY-MM-DD: <short list of fixes>`.
    - Body: what was broken, how you fixed it, and how you checked it, one short paragraph per fix. Do not request a reviewer: the pull request is opened under AJ's own GitHub account (`jlanzardo-code`), and GitHub does not allow requesting review from the author. The summary's link is how AJ finds it.
    - Use the GitHub MCP tools; there is no `gh` CLI.

11. **Clean up.** Stop the preview server.

## The summary

Your last message is the summary. AJ gets it as a phone notification and by email, so it must stand on its own. Plain words, short sentences, no jargon, no bullet lists. Keep it under about 200 words.

Say, in this order:

- What you checked, in one sentence.
- What you found and fixed, with the pull request link.
- Anything you found but could not or should not fix, and what AJ needs to do about it.
- Anything you could not check (members-only pages skipped, outside links not checked).

If nothing was wrong, the whole summary is one line: "The site is clean. Checked all pages at desktop and phone widths; no fixes needed."

If the build failed on `main`, lead with that: what failed, the error in a code block, and that nothing else was checked.
