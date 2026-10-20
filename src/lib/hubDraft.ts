// The board's standing rules for program hub text (CLAUDE.md, board
// decisions 2026-10-13), applied whenever an admin saves a hub in Admin →
// Program hubs, so a pasted draft comes out the way the board wants it:
//   * "famsy.org", "famse.org" and the like (voice-to-text) become faemse.org;
//   * the draft's "How to use this hub" section is left out;
//   * so is the italic "Companion hub to ..." line under the title;
//   * and the "Draft for faemse.org · <date> · @<name>" byline.
// The "Maintenance notes" section stays (the site shows it to admins only).
// No imports, so the tests run it directly.

const MISSPELLED_DOMAIN = /\bfam[sz][a-z]{0,3}\.org\b/gi;
const HOW_TO_USE = /^(#{1,6})\s*How to use this hub\b/i;
const COMPANION = /^\s*[*_]+\s*Companion hub to\b.*[*_]+\s*$/i;
const BYLINE = /^\s*[*_]*\s*Draft for faemse\.org\s*[·|•–—-]\s*.+[·|•–—-]\s*@\w[\w.-]*\s*[*_]*\s*$/i;

// The domain fix alone, for any text an admin saves (the bylaws too).
export function fixFaemseDomain(text: string): { text: string; note: string | null } {
  const fixes = text.match(MISSPELLED_DOMAIN)?.length ?? 0;
  return {
    text: text.replace(MISSPELLED_DOMAIN, 'faemse.org'),
    note: fixes ? `Corrected ${fixes === 1 ? 'one misspelling' : `${fixes} misspellings`} of faemse.org.` : null,
  };
}

export function cleanHubDraft(input: string): { body: string; notes: string[] } {
  const notes: string[] = [];
  const { text: fixed, note } = fixFaemseDomain(input);
  if (note) notes.push(note);

  const out: string[] = [];
  let skipLevel = 0; // inside a "How to use this hub" section of this heading level
  let removedHowTo = false;
  let removedCompanion = false;
  let removedByline = false;
  for (const line of fixed.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = /^(#{1,6})\s/.exec(line);
    if (skipLevel) {
      if (heading && heading[1].length <= skipLevel) skipLevel = 0;
      else continue;
    }
    const how = HOW_TO_USE.exec(line);
    if (how) {
      skipLevel = how[1].length;
      removedHowTo = true;
      continue;
    }
    if (COMPANION.test(line)) {
      removedCompanion = true;
      continue;
    }
    if (BYLINE.test(line)) {
      removedByline = true;
      continue;
    }
    out.push(line);
  }
  if (removedHowTo) notes.push('Left out the "How to use this hub" section.');
  if (removedCompanion) notes.push('Left out the "Companion hub to …" line.');
  if (removedByline) notes.push('Left out the draft byline.');

  const body = out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { body, notes };
}
