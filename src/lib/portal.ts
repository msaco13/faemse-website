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
};

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

export function membershipState(p: Profile | null): MembershipState {
  if (!p?.expires_at) return 'pending';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${p.expires_at}T00:00:00`) >= today) return 'current';
  return graceEnd(p.expires_at) >= today ? 'grace' : 'lapsed';
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
