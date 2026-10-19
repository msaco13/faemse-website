// Locked-doors check: reads the database the way any outsider could, with
// the public key the website itself ships, and confirms the private tables
// give nothing back. Database changes here are pasted into Supabase by hand,
// and one wrong access rule could open member emails or payments to the
// world; this catches that the next night.
//
//   node scripts/locked-doors.mjs
//
// Read-only: plain GET requests, plus GETs of database functions that only
// read. It never calls a function that writes and never sends a POST, PATCH
// or DELETE. Exit code 1 when a private table answers with rows, 2 when the
// database could not be reached.

import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
const URL_ = process.env.LOCKED_DOORS_URL ?? src.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
const KEY = process.env.LOCKED_DOORS_KEY ?? src.match(/'(eyJ[\w-]+\.[\w-]+\.[\w-]+)'/)?.[1];
if (!URL_ || !KEY) {
  console.log('Could not find the database address or public key in src/lib/supabase.ts.');
  process.exit(2);
}

// Must give an outsider nothing. Each entry: label, REST path.
const PRIVATE = [
  ['member profiles', 'profiles?select=id&limit=1'],
  ['payments', 'membership_payments?select=id&limit=1'],
  ['organizations', 'organizations?select=id&limit=1'],
  ['organization members', 'organization_members?select=organization_id&limit=1'],
  ['contacts', 'contacts?select=id&limit=1'],
  ['contact messages', 'contact_messages?select=id&limit=1'],
  ['membership applications', 'membership_applications?select=id&limit=1'],
  ['members-only documents', 'documents?select=slug&slug=neq.bylaws&limit=1'],
  ['program hubs', 'admin_documents?select=slug&limit=1'],
  ['member library', 'library_resources?select=id&limit=1'],
  ['Q&A answers', 'qa_entries?select=id&limit=1'],
  ['teaching videos', 'teaching_videos?select=id&limit=1'],
  ['reminder log', 'reminder_log?select=*&limit=1'],
  ['site settings', 'site_settings?select=*&limit=1'],
  ['password link log', 'password_link_log?select=*&limit=1'],
  // Read-only functions that must return nothing to an outsider.
  ['admin member list', 'rpc/admin_list_members'],
  ['admin payment list', 'rpc/admin_list_payments'],
  ['listserv emails', 'rpc/get_listserv'],
  ['voting roll', 'rpc/get_voting_roll'],
  ['member directory', 'rpc/get_directory'],
];

// Meant to be public. If one of these stops answering, the site's public
// pages lose their content, so it is reported too. An empty table is fine
// (news has no posts yet); a refusal is not.
const PUBLIC = [
  ['events', 'events?select=id&limit=1'],
  ['news', 'news_posts?select=id&limit=1'],
  ['site text', 'site_text?select=key&limit=1'],
  ['bylaws', 'documents?select=slug&slug=eq.bylaws'],
];

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' };

async function get(path) {
  try {
    const res = await fetch(`${URL_}/rest/v1/${path}`, { method: 'GET', headers });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON */
    }
    return { status: res.status, body, text };
  } catch (e) {
    return { status: 0, body: null, text: String(e.message ?? e) };
  }
}

const rows = (r) => (Array.isArray(r.body) ? r.body.length : 0);

let open = 0;
let unreachable = 0;
let publicDown = 0;

console.log('Private (an outsider must get nothing):');
for (const [label, path] of PRIVATE) {
  const r = await get(path);
  if (r.status === 0) {
    unreachable++;
    console.log(`  ??    ${label.padEnd(26)} could not reach the database: ${r.text.slice(0, 120)}`);
  } else if (rows(r) > 0) {
    open++;
    console.log(`  OPEN  ${label.padEnd(26)} answered an outsider with data (HTTP ${r.status})`);
  } else {
    console.log(`  ok    ${label.padEnd(26)} nothing (HTTP ${r.status})`);
  }
}

console.log('Public (should answer):');
for (const [label, path] of PUBLIC) {
  const r = await get(path);
  if (r.status === 0) {
    unreachable++;
    console.log(`  ??    ${label.padEnd(26)} could not reach the database: ${r.text.slice(0, 120)}`);
  } else if (r.status !== 200 || !Array.isArray(r.body)) {
    publicDown++;
    console.log(`  DOWN  ${label.padEnd(26)} refused (HTTP ${r.status})`);
  } else {
    console.log(`  ok    ${label.padEnd(26)} answers (${rows(r) ? 'has rows' : 'empty'})`);
  }
}

console.log('');
console.log(`Locked doors: ${PRIVATE.length - open - unreachable} of ${PRIVATE.length} private checks closed; ${open} open; ${PUBLIC.length - publicDown - unreachable} of ${PUBLIC.length} public checks answering.`);
process.exit(unreachable ? 2 : open || publicDown ? 1 : 0);
