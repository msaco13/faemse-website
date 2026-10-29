// Screens that edit a stored record must not let Save run until that record
// has loaded. A failed or slow read used to leave the hub editor with empty
// text, and the profile form with blank fields and a ticked "List me" box,
// and Save then wrote those over the real record (review, 2026-10-29). These
// helpers turn a read's answer into an explicit state the screens check
// before they show a form and again before they save. Tested in
// tests/loadGuard.test.ts.

export type Loaded<T> = { state: 'loading' } | { state: 'loaded'; value: T } | { state: 'error'; message: string };

type Read<T> = { data: T | null; error: { message: string } | null };

// One hub's text. A missing row counts as a failure: there is nothing to
// edit, and a save would only pretend to work.
export function hubBodyRead(read: Read<{ body: string | null }>): Loaded<string> {
  if (read.error) return { state: 'error', message: read.error.message };
  if (!read.data) return { state: 'error', message: "This hub's text wasn't found." };
  return { state: 'loaded', value: read.data.body ?? '' };
}

// The signed-in member's own profile. The portal reads it again after a save
// and while a payment lands; if one of those later reads fails, the profile
// already loaded stays, since the form on screen still matches it.
export function profileRead<T>(read: Read<T>, previous: Loaded<T>): Loaded<T> {
  if (read.data) return { state: 'loaded', value: read.data };
  if (previous.state === 'loaded') return previous;
  return { state: 'error', message: read.error?.message ?? "Your profile wasn't found." };
}

// get_directory lists only rows whose flag is true, so the box starts ticked
// only for a member who is listed now.
export function listedInDirectory(profile: { show_in_directory?: boolean | null }): boolean {
  return profile.show_in_directory === true;
}

export type ProfileSaveArgs = {
  p_full_name: string;
  p_cert_level: string;
  p_county: string;
  p_agency: string;
  p_show: boolean;
};

// What Save sends to update_my_profile, or null when it must not send
// anything. update_my_profile writes all five values as given: a blank is
// saved as blank and the directory flag is always written. So the values
// may only come from a form filled from the member's loaded record, and a
// member who clears a field or unticks the box on purpose gets exactly that.
export function profileSaveArgs(profile: Loaded<unknown>, form: Record<string, unknown>): ProfileSaveArgs | null {
  if (profile.state !== 'loaded') return null;
  return {
    p_full_name: String(form.full_name ?? ''),
    p_cert_level: String(form.cert_level ?? ''),
    p_county: String(form.county ?? ''),
    p_agency: String(form.agency ?? ''),
    p_show: form.show_in_directory === 'on',
  };
}
