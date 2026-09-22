// Member import: the board pastes a roster into the portal; this creates the
// login for anyone who doesn't have one and sets each profile's name, tier,
// paid-through date, and contact fields. Existing members are updated, never
// duplicated; the admin role is never touched. Members set their own
// password from the sign-in page's "Forgot password" link, so no passwords
// are ever handled here.
//
// Two shapes of request, both from src/lib:
//   * { rows: [...] }                            a simple roster (roster.ts)
//   * { people, organizations, contacts }        the old system's full export
//                                               (legacyExport.ts): people
//                                               first, then organizations
//                                               with their representatives,
//                                               then listserv-only contacts.
// Either can carry dry_run: true, which reports what would happen and
// writes nothing.
//
// Only board admins can call it: the caller's own session must pass
// is_admin(); the service-role key is used after that to create auth users.
//
// Deploy: supabase functions deploy import-members --project-ref iybsnqcffrhzhdpyoaqt

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SITE = 'https://faemse.org';
const MAX_ROWS = 500;
const TIERS = ['active', 'institutional', 'corporate', 'honorary'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const cors = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

type Row = {
  email?: string;
  full_name?: string;
  tier?: string;
  expires_at?: string; // YYYY-MM-DD
  county?: string;
  agency?: string;
  cert_level?: string;
  // The old export's extra fields; all optional.
  job_title?: string;
  org_type?: string;
  phone?: string;
  website?: string;
  alt_email?: string;
  listserv_opt_out?: boolean;
  listserv_email?: string;
  notes?: string;
};

type OrgRow = {
  name?: string;
  kind?: string;
  expires_at?: string;
  contact_email?: string;
  website?: string;
  coordinator_email?: string;
  member_emails?: string[];
  notes?: string;
};

type ContactRow = {
  full_name?: string;
  email?: string;
  organization?: string;
  job_title?: string;
  kind?: string;
  listserv_opt_out?: boolean;
  notes?: string;
};

type Result = { email: string; status: 'created' | 'updated' | 'skipped' | 'error'; message?: string };

function clean(v: unknown): string {
  return String(v ?? '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_admin');
  if (adminErr || !isAdmin) return json({ error: 'Admins only.' }, 403);

  let body: { rows?: Row[]; people?: Row[]; organizations?: OrgRow[]; contacts?: ContactRow[]; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad payload' }, 400);
  }
  const people = Array.isArray(body.people) ? body.people : Array.isArray(body.rows) ? body.rows : [];
  const organizations = Array.isArray(body.organizations) ? body.organizations : [];
  const contacts = Array.isArray(body.contacts) ? body.contacts : [];
  if (people.length === 0 && organizations.length === 0 && contacts.length === 0) return json({ error: 'No rows.' }, 400);
  if (people.length > MAX_ROWS || organizations.length > MAX_ROWS || contacts.length > MAX_ROWS) {
    return json({ error: `At most ${MAX_ROWS} of each per import.` }, 400);
  }
  const dryRun = Boolean(body.dry_run);

  const admin: SupabaseClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  // Every existing login, by email. Small association; one or two pages.
  const byEmail = new Map<string, string>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return json({ error: `Could not list users: ${error.message}` }, 500);
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }

  // --- People ---------------------------------------------------------------
  const results: Result[] = [];
  const seen = new Set<string>();
  for (const r of people) {
    const email = clean(r.email).toLowerCase();
    if (!email || !EMAIL.test(email)) {
      results.push({ email: email || '(blank)', status: 'error', message: 'Not a valid email address' });
      continue;
    }
    if (seen.has(email)) {
      results.push({ email, status: 'skipped', message: 'Duplicate row' });
      continue;
    }
    seen.add(email);
    const tier = clean(r.tier).toLowerCase();
    if (tier && !TIERS.includes(tier)) {
      results.push({ email, status: 'error', message: `Unknown tier "${r.tier}" (use active, institutional, corporate, or honorary)` });
      continue;
    }
    const expires = clean(r.expires_at);
    if (expires && !ISO_DATE.test(expires)) {
      results.push({ email, status: 'error', message: `Paid-through date "${expires}" is not YYYY-MM-DD` });
      continue;
    }

    let id = byEmail.get(email);
    const existed = Boolean(id);
    if (dryRun) {
      results.push({ email, status: existed ? 'updated' : 'created', message: 'dry run' });
      continue;
    }
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: clean(r.full_name), tier: tier || 'active' },
      });
      if (error || !data.user) {
        results.push({ email, status: 'error', message: error?.message ?? 'Could not create the login' });
        continue;
      }
      id = data.user.id;
      byEmail.set(email, id);
    }

    // Only the columns the row provides; blank cells leave the profile as is.
    const patch: Record<string, unknown> = { id, email };
    const text = (key: keyof Row, column = key as string) => {
      const v = clean(r[key]);
      if (v) patch[column] = v;
    };
    text('full_name');
    if (tier) patch.tier = tier;
    if (expires) patch.expires_at = expires;
    text('county');
    text('agency');
    text('cert_level');
    text('job_title');
    text('org_type');
    text('phone');
    text('website');
    if (clean(r.alt_email)) patch.alt_email = clean(r.alt_email).toLowerCase();
    if (typeof r.listserv_opt_out === 'boolean') patch.listserv_opt_out = r.listserv_opt_out;
    if (clean(r.listserv_email)) patch.listserv_email = clean(r.listserv_email).toLowerCase();
    const { error: upErr } = await admin.from('profiles').upsert(patch, { onConflict: 'id' });
    if (upErr) {
      results.push({ email, status: 'error', message: upErr.message });
      continue;
    }
    results.push({ email, status: existed ? 'updated' : 'created' });
  }

  // --- Organizations --------------------------------------------------------
  // Matched by (name, kind). Representatives must already have a login, which
  // they do if they were in the people list above; anyone who is not is
  // reported rather than silently dropped.
  const orgResults: Result[] = [];
  for (const o of organizations) {
    const name = clean(o.name);
    const kind = clean(o.kind).toLowerCase();
    const label = `${name} (${kind})`;
    if (!name || !['institutional', 'corporate'].includes(kind)) {
      orgResults.push({ email: label, status: 'error', message: 'Needs a name and a kind of institutional or corporate' });
      continue;
    }
    const expires = clean(o.expires_at);
    if (expires && !ISO_DATE.test(expires)) {
      orgResults.push({ email: label, status: 'error', message: `Paid-through date "${expires}" is not YYYY-MM-DD` });
      continue;
    }
    const memberEmails = [...new Set((o.member_emails ?? []).map((e) => clean(e).toLowerCase()).filter(Boolean))];
    const coordinator = clean(o.coordinator_email).toLowerCase();
    const missing = memberEmails.filter((e) => !byEmail.has(e));

    const { data: existing } = await admin.from('organizations').select('id').ilike('name', name).eq('kind', kind).maybeSingle();
    if (dryRun) {
      orgResults.push({
        email: label,
        status: existing ? 'updated' : 'created',
        message: `dry run · ${memberEmails.length} representative${memberEmails.length === 1 ? '' : 's'}${missing.length ? ` · no login for ${missing.join(', ')}` : ''}`,
      });
      continue;
    }

    const orgPatch: Record<string, unknown> = { name, kind };
    if (expires) orgPatch.expires_at = expires;
    if (clean(o.contact_email)) orgPatch.contact_email = clean(o.contact_email).toLowerCase();
    if (clean(o.website)) orgPatch.website = clean(o.website);
    if (clean(o.notes)) orgPatch.notes = clean(o.notes);
    let orgId = existing?.id as string | undefined;
    if (orgId) {
      const { error } = await admin.from('organizations').update(orgPatch).eq('id', orgId);
      if (error) {
        orgResults.push({ email: label, status: 'error', message: error.message });
        continue;
      }
    } else {
      const { data, error } = await admin.from('organizations').insert(orgPatch).select('id').single();
      if (error || !data) {
        orgResults.push({ email: label, status: 'error', message: error?.message ?? 'Could not create the organization' });
        continue;
      }
      orgId = data.id;
    }

    // Representatives: coordinator first so the seat cap never blocks them.
    const problems: string[] = [];
    const ordered = [coordinator, ...memberEmails.filter((e) => e !== coordinator)].filter((e) => e && byEmail.has(e));
    for (const e of ordered) {
      const { error } = await admin
        .from('organization_members')
        .upsert({ organization_id: orgId, profile_id: byEmail.get(e), role: e === coordinator ? 'coordinator' : 'representative' }, { onConflict: 'organization_id,profile_id' });
      if (error) problems.push(`${e}: ${error.message}`);
    }
    for (const e of missing) problems.push(`${e}: no login, so not seated`);
    orgResults.push({
      email: label,
      status: problems.length ? 'error' : existing ? 'updated' : 'created',
      message: problems.length ? problems.join('; ') : `${ordered.length} representative${ordered.length === 1 ? '' : 's'}`,
    });
  }

  // --- Contacts -------------------------------------------------------------
  // Listserv-only people. Matched by email, or by name when there is none.
  const contactResults: Result[] = [];
  for (const c of contacts) {
    const name = clean(c.full_name);
    const email = clean(c.email).toLowerCase();
    const kind = ['regulatory', 'honorary', 'other'].includes(clean(c.kind)) ? clean(c.kind) : 'other';
    const label = email || name || '(blank)';
    if (!name) {
      contactResults.push({ email: label, status: 'error', message: 'A contact needs a name' });
      continue;
    }
    if (email && !EMAIL.test(email)) {
      contactResults.push({ email: label, status: 'error', message: 'Not a valid email address' });
      continue;
    }
    const q = admin.from('contacts').select('id');
    const { data: existing } = email ? await q.eq('email', email).maybeSingle() : await q.is('email', null).ilike('full_name', name).maybeSingle();
    if (dryRun) {
      contactResults.push({ email: label, status: existing ? 'updated' : 'created', message: 'dry run' });
      continue;
    }
    const patch: Record<string, unknown> = {
      full_name: name,
      email: email || null,
      organization: clean(c.organization) || null,
      job_title: clean(c.job_title) || null,
      kind,
      listserv_opt_out: Boolean(c.listserv_opt_out),
      notes: clean(c.notes),
    };
    const { error } = existing ? await admin.from('contacts').update(patch).eq('id', existing.id) : await admin.from('contacts').insert(patch);
    contactResults.push(error ? { email: label, status: 'error', message: error.message } : { email: label, status: existing ? 'updated' : 'created' });
  }

  const tally = (list: Result[]) => ({
    created: list.filter((r) => r.status === 'created').length,
    updated: list.filter((r) => r.status === 'updated').length,
    skipped: list.filter((r) => r.status === 'skipped').length,
    errors: list.filter((r) => r.status === 'error').length,
  });
  return json({
    dry_run: dryRun,
    summary: tally(results),
    results,
    organizations: { summary: tally(orgResults), results: orgResults },
    contacts: { summary: tally(contactResults), results: contactResults },
  });
});
