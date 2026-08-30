import { createClient } from '@supabase/supabase-js';

// FAEMSE WEBSITE project (owned by the association's Supabase organization).
// The anon key is a public client key by design; row-level security governs access.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://iybsnqcffrhzhdpyoaqt.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5YnNucWNmZnJoemhkcHlvYXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzg4NDcsImV4cCI6MjEwMzYxNDg0N30.2hOdsxw9ja-TFVV64v7tI31MukUqgeAPqYnkU_Kb-Ts';

export const supabase = createClient(url, anonKey);
