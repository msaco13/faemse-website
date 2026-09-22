// Site-wide switches the board flips in the portal (site_settings.settings).
// Public and non-sensitive by design: `online_dues` shows or hides the "Pay
// dues online" button (and the server refuses checkout when it is off), and
// `reminders_paused` holds the daily renewal-reminder emails. Cached per
// browser so the button doesn't pop in after first paint.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type SiteSettings = {
  online_dues?: boolean;
  reminders_paused?: boolean;
};

const CACHE_KEY = 'faemse:settings';

function readCache(): SiteSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as SiteSettings) : {};
  } catch {
    return {};
  }
}

export async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.rpc('get_settings');
  if (error || !data || typeof data !== 'object') return readCache();
  const s = data as SiteSettings;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {
    /* fine without the cache */
  }
  return s;
}

export async function saveSettings(patch: SiteSettings): Promise<string | null> {
  const current = await fetchSettings();
  const next = { ...current, ...patch };
  const { error } = await supabase.rpc('admin_set_settings', { p_settings: next });
  if (error) return error.message;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* fine */
  }
  return null;
}

export function useSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(readCache);
  useEffect(() => {
    let on = true;
    fetchSettings().then((s) => on && setSettings(s));
    return () => {
      on = false;
    };
  }, []);
  return settings;
}
