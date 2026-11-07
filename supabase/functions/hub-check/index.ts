// The monthly program hub check's only door into the database (AJ,
// 2026-11-07). Same lock as the job and event sweeps: the session has no
// database login and sends the sweep key in the x-sweep-key header
// (JOB_SWEEP_KEY, already the cloud environment's network secret for this
// host). This function can do exactly two things:
//
//   GET   hub_check_state(): the pause switch, today's Florida date, the five
//         hubs' text, and everything the check found before.
//   POST  hub_check_apply(payload): leave proposed fixes and couldn't-verify
//         notes for an admin. It never changes a hub.
//         See supabase/migrations/20261107_hub_check.sql.
//
// The hub text is members-only: this answers only with the sweep key.
// Deploy with verify_jwt off: the check has no Supabase login; the key is
// the lock.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BODY = 1_000_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Same length and every character equal, without stopping early.
function sameKey(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const key = Deno.env.get('JOB_SWEEP_KEY') ?? '';
  if (key.length < 24) return json({ error: 'The sweep key is not set up on this project.' }, 503);
  if (!sameKey(req.headers.get('x-sweep-key') ?? '', key)) return json({ error: 'Wrong or missing x-sweep-key.' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (req.method === 'GET') {
    const { data, error } = await supabase.rpc('hub_check_state');
    if (error) return json({ error: error.message }, 500);
    return json(data);
  }

  if (req.method === 'POST') {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: 'Payload too large.' }, 413);
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: 'Body is not JSON.' }, 400);
    }
    const { data, error } = await supabase.rpc('hub_check_apply', { payload });
    if (error) return json({ error: error.message }, 400);
    console.log(`hub check applied: ${JSON.stringify(data)}`);
    return json(data);
  }

  return json({ error: 'GET or POST only.' }, 405);
});
