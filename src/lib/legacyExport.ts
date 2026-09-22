// Reading the old membership system's export.
//
// The board's previous system exported one row per membership, not per
// person, with "bundles" for institutional and corporate memberships: a
// coordinator row plus one row per representative, all pointing at the
// coordinator's email in "Member bundle ID or email". A person who held two
// memberships appeared twice under the same email. This turns that sheet
// into what the site stores: one person per login, organizations with their
// representatives, and listserv-only contacts.
//
// Pure functions, no React and no network, so the real export can be run
// through it in a test. Recognised by its header row; anything else falls
// back to the simpler roster reader in roster.ts.

import { normDate, parseCsv } from './roster';

export type LegacyPerson = {
  email: string;
  full_name: string;
  // The person's OWN membership (individual or honorary); blank when their
  // only membership is through an organization.
  tier: string;
  expires_at: string;
  agency: string;
  cert_level: string;
  job_title: string;
  org_type: string;
  phone: string;
  website: string;
  alt_email: string;
  listserv_opt_out: boolean;
  listserv_email: string;
  notes: string;
};

export type LegacyOrganization = {
  name: string;
  kind: 'institutional' | 'corporate';
  expires_at: string;
  contact_email: string;
  website: string;
  coordinator_email: string;
  member_emails: string[];
  notes: string;
};

export type LegacyContact = {
  full_name: string;
  email: string;
  organization: string;
  job_title: string;
  kind: 'regulatory' | 'honorary' | 'other';
  listserv_opt_out: boolean;
  notes: string;
};

export type LegacyPlan = {
  people: LegacyPerson[];
  organizations: LegacyOrganization[];
  contacts: LegacyContact[];
  // Things a person should read before importing.
  notes: string[];
  // Rows that could not be placed; each says why.
  problems: string[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Is this the old system's export? It has bundle columns nothing else has. */
export function isLegacyExport(text: string): boolean {
  const first = parseCsv(text)[0] ?? [];
  const h = first.map((c) => c.trim().toLowerCase());
  return h.includes('membership level') && h.some((c) => c.startsWith('member bundle')) && h.includes('bundle role');
}

function yes(v: string): boolean {
  return /^(y|yes|true|1)$/i.test(v.trim());
}

function seatCap(kind: 'institutional' | 'corporate'): number {
  return kind === 'institutional' ? 5 : 3;
}

export function parseLegacyExport(text: string): LegacyPlan {
  const table = parseCsv(text);
  const headers = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name.toLowerCase());
  const at = (r: string[], name: string) => (r[col(name)] ?? '').trim();

  const people = new Map<string, LegacyPerson>();
  const orgs = new Map<string, LegacyOrganization>();
  const contacts: LegacyContact[] = [];
  const notes: string[] = [];
  const problems: string[] = [];

  const ensurePerson = (r: string[], email: string): LegacyPerson => {
    let p = people.get(email);
    if (!p) {
      p = {
        email,
        full_name: [at(r, 'First name'), at(r, 'Last name')].filter(Boolean).join(' '),
        tier: '',
        expires_at: '',
        agency: at(r, 'Organization'),
        cert_level: at(r, 'Certifications/Credentials'),
        job_title: at(r, 'Job Title'),
        org_type: at(r, 'Organization/Affiliation Type'),
        phone: at(r, 'Phone') || at(r, 'Mobile Phone'),
        website: at(r, 'Website'),
        alt_email: at(r, 'Alternate Email').toLowerCase(),
        listserv_opt_out: yes(at(r, 'Exclude from Listserv')),
        listserv_email: at(r, 'Special Listserv Email').toLowerCase(),
        notes: '',
      };
      people.set(email, p);
    } else {
      // A second row for the same person: keep anything the first row lacked.
      p.agency ||= at(r, 'Organization');
      p.job_title ||= at(r, 'Job Title');
      p.phone ||= at(r, 'Phone') || at(r, 'Mobile Phone');
      p.website ||= at(r, 'Website');
      p.alt_email ||= at(r, 'Alternate Email').toLowerCase();
      p.listserv_opt_out ||= yes(at(r, 'Exclude from Listserv'));
      p.listserv_email ||= at(r, 'Special Listserv Email').toLowerCase();
    }
    return p;
  };

  for (const r of table.slice(1)) {
    const name = [at(r, 'First name'), at(r, 'Last name')].filter(Boolean).join(' ');
    const email = at(r, 'Email').toLowerCase();
    const level = at(r, 'Membership level');
    const status = at(r, 'Membership status');
    const renewal = normDate(at(r, 'Renewal Date'));
    const lv = level.toLowerCase();
    const bundleId = at(r, 'Member bundle ID or email').toLowerCase();
    const bundleRole = at(r, 'Bundle role').toLowerCase();

    if (!name && !email) continue;

    // Regulators are on the listserv, not members (board decision, Sept 2026).
    if (lv.includes('regulatory')) {
      contacts.push({
        full_name: name,
        email,
        organization: at(r, 'Organization'),
        job_title: at(r, 'Job Title'),
        kind: 'regulatory',
        listserv_opt_out: yes(at(r, 'Exclude from Listserv')),
        notes: level,
      });
      continue;
    }

    // No email means no login. Kept as a contact until the board finds one.
    if (!email) {
      contacts.push({
        full_name: name,
        email: '',
        organization: at(r, 'Organization'),
        job_title: at(r, 'Job Title'),
        kind: lv.includes('honor') ? 'honorary' : 'other',
        listserv_opt_out: yes(at(r, 'Exclude from Listserv')),
        notes: `${level}${renewal ? ` · paid through ${renewal}` : ''} · no email in the old system`,
      });
      continue;
    }
    if (!EMAIL.test(email)) {
      problems.push(`${name}: "${email}" is not a valid email address, so the row was skipped.`);
      continue;
    }

    const isOrgLevel = lv.includes('instit') || lv.includes('corp');
    if (isOrgLevel && bundleId) {
      // One organization per (name, kind); the coordinator's row names it.
      const kind: 'institutional' | 'corporate' = lv.includes('instit') ? 'institutional' : 'corporate';
      const orgName = at(r, 'Organization') || name;
      const key = `${kind}:${bundleId}`;
      let o = orgs.get(key);
      if (!o) {
        o = {
          name: orgName,
          kind,
          expires_at: '',
          contact_email: bundleId,
          website: '',
          coordinator_email: '',
          member_emails: [],
          notes: status && status.toLowerCase() !== 'active' ? `Old system status: ${status}` : '',
        };
        orgs.set(key, o);
      }
      if (bundleRole.includes('coordinator')) {
        o.coordinator_email = email;
        o.name = orgName;
        o.expires_at = renewal;
        o.website ||= at(r, 'Website');
      } else {
        o.expires_at ||= renewal;
      }
      if (!o.member_emails.includes(email)) o.member_emails.push(email);
      ensurePerson(r, email);
      continue;
    }

    // Everything else is the person's own membership.
    const p = ensurePerson(r, email);
    const tier = lv.includes('honor') ? 'honorary' : 'active';
    if (p.tier && p.expires_at && renewal && renewal !== p.expires_at) {
      problems.push(`${name} (${email}) has two individual rows with different dates (${p.expires_at} and ${renewal}); the later one was kept.`);
    }
    p.tier = tier;
    p.expires_at = [p.expires_at, renewal].filter(Boolean).sort().pop() ?? '';
    const extra: string[] = [];
    if (lv.includes('group paid')) extra.push('Individual membership paid by their organization');
    if (lv.includes('executive director')) extra.push('Executive Director (old system level)');
    if (status && status.toLowerCase() !== 'active') extra.push(`Old system status: ${status}`);
    if (extra.length) p.notes = [p.notes, ...extra].filter(Boolean).join(' · ');
  }

  // Sanity checks a person should see before clicking Import.
  for (const o of orgs.values()) {
    if (!o.coordinator_email) {
      o.coordinator_email = o.member_emails[0] ?? '';
      notes.push(`${o.name} (${o.kind}) had no coordinator row; ${o.coordinator_email || 'nobody'} will be the coordinator.`);
    }
    if (o.member_emails.length > seatCap(o.kind)) {
      problems.push(`${o.name} (${o.kind}) lists ${o.member_emails.length} people but the cap is ${seatCap(o.kind)}; the extra representatives will be refused.`);
    }
    if (!o.expires_at) notes.push(`${o.name} (${o.kind}) has no paid-through date in the old system.`);
  }
  const twoHats = [...people.values()].filter((p) => p.tier && [...orgs.values()].some((o) => o.member_emails.includes(p.email)));
  if (twoHats.length) {
    notes.push(`${twoHats.length} people hold their own membership and represent an organization: ${twoHats.map((p) => p.full_name).join(', ')}.`);
  }
  const noDate = [...people.values()].filter((p) => p.tier && !p.expires_at);
  if (noDate.length) notes.push(`${noDate.length} individual members have no paid-through date (unpaid in the old system): ${noDate.map((p) => p.full_name).join(', ')}.`);
  const noEmail = contacts.filter((c) => !c.email);
  if (noEmail.length) notes.push(`${noEmail.length} people have no email and are kept as contacts until one is found: ${noEmail.map((c) => c.full_name).join(', ')}.`);

  return {
    people: [...people.values()],
    organizations: [...orgs.values()].sort((a, b) => a.name.localeCompare(b.name)),
    contacts,
    notes,
    problems,
  };
}
