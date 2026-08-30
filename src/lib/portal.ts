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

export function membershipState(p: Profile | null): 'current' | 'lapsed' | 'pending' {
  if (!p?.expires_at) return 'pending';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${p.expires_at}T00:00:00`) >= today ? 'current' : 'lapsed';
}

export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
