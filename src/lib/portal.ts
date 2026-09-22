// Shapes of the member-portal data in the FAEMSE WEBSITE Supabase project.

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  cert_level: string | null;
  county: string | null;
  agency: string | null;
  tier: string | null;
  role: 'member' | 'admin' | null;
  expires_at: string | null; // ISO date
  show_in_directory: boolean | null;
  // The old system tracked these; the profile carries them since Sept 2026.
  phone?: string | null;
  job_title?: string | null;
  org_type?: string | null;
  alt_email?: string | null;
  website?: string | null;
  listserv_opt_out?: boolean | null;
  listserv_email?: string | null;
};

// An institutional or corporate membership, held by the organization rather
// than a person. Its representatives are current members while it is.
export type Organization = {
  id: string;
  name: string;
  kind: 'institutional' | 'corporate';
  expires_at: string | null;
  coordinator_id: string | null;
  contact_email: string | null;
  website: string | null;
  notes: string;
  created_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  profile_id: string;
  role: 'coordinator' | 'representative';
};

// my_organizations(): what a member sees about the organizations they represent.
export type MyOrganization = {
  id: string;
  name: string;
  kind: 'institutional' | 'corporate';
  expires_at: string | null;
  role: 'coordinator' | 'representative';
  coordinator_name: string | null;
  seats_used: number;
  seat_cap: number;
};

// Someone on the listserv without a login: the state regulators who are not
// members, and members whose email the board is still tracking down.
export type Contact = {
  id: string;
  full_name: string;
  email: string | null;
  organization: string | null;
  job_title: string | null;
  kind: 'regulatory' | 'honorary' | 'other';
  listserv_opt_out: boolean;
  notes: string;
  created_at: string;
};

export function seatCap(kind: Organization['kind']): number {
  return kind === 'institutional' ? 5 : 3;
}

export type DirectoryEntry = {
  full_name: string | null;
  cert_level: string | null;
  county: string | null;
  agency: string | null;
};

export type Application = {
  id: string;
  created_at: string;
  kind: 'join' | 'renew';
  tier: string;
  full_name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  county: string | null;
  cert_level: string | null;
  note: string | null;
  status: 'new' | 'approved' | 'declined';
};

// One dues payment (membership_payments). Written only by the Stripe webhook
// and the admin "Record payment" button; the paid-through date moves with it.
export type Payment = {
  id: string;
  profile_id: string | null;
  organization_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  organization_name?: string | null;
  amount_cents: number;
  method: 'stripe' | 'check' | 'cash' | 'other' | 'waived';
  paid_on: string;
  term_months: number;
  previous_expires: string | null;
  new_expires: string;
  note: string;
  created_at: string;
};

export const PAYMENT_METHODS: { value: Payment['method']; label: string }[] = [
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other (Zelle, PO, …)' },
  { value: 'waived', label: 'Waived' },
];

export function dollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 });
}

// Dues by tier, in cents. Mirrors public.dues_cents() in the database.
export function duesCents(tier: string | null | undefined): number {
  switch ((tier ?? 'active').toLowerCase()) {
    case 'institutional':
      return 25000;
    case 'corporate':
      return 20000;
    case 'honorary':
      return 0;
    default:
      return 5000;
  }
}

export type ContactMessage = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  handled: boolean;
};

// Bylaws 2.05: a membership may be revoked only once dues are 90 days past
// due, so access continues for 90 days after the paid-through date ("grace").
// The database gate (is_current_member) applies the same window.
export const GRACE_DAYS = 90;

export type MembershipState = 'current' | 'grace' | 'lapsed' | 'pending';

export function graceEnd(iso: string): Date {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + GRACE_DAYS);
  return d;
}

// The state of one paid-through date: a person's own, or an organization's.
export function dateState(expires: string | null | undefined): MembershipState {
  if (!expires) return 'pending';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // slice(0, 10) like graceEnd and formatDate: expires_at is a `date` column
  // so it arrives as YYYY-MM-DD today, but a full timestamp here would parse
  // as Invalid Date and silently read as lapsed.
  if (new Date(`${expires.slice(0, 10)}T00:00:00`) >= today) return 'current';
  return graceEnd(expires) >= today ? 'grace' : 'lapsed';
}

export function membershipState(p: Profile | null): MembershipState {
  return dateState(p?.expires_at);
}

// A person is as current as the best of their memberships: their own, or any
// organization they represent. Mirrors is_current_member() in the database.
const RANK: Record<MembershipState, number> = { current: 3, grace: 2, lapsed: 1, pending: 0 };
export function overallState(p: Profile | null, orgs: MyOrganization[]): MembershipState {
  return [membershipState(p), ...orgs.map((o) => dateState(o.expires_at))].sort((a, b) => RANK[b] - RANK[a])[0];
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
