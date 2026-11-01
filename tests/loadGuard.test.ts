// Save must never write a record that didn't load (review, 2026-10-29). The
// hub editor and the profile form read through these helpers; the browser
// check scripts/save-guards.mjs drives the real screens with the same cases.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { hubBodyRead, listedInDirectory, profileRead, profileSaveArgs, type Loaded } from '../src/lib/loadGuard.ts';

const failed = { message: 'Failed to fetch' };

describe('hub text', () => {
  test('a failed read is an error, not empty text', () => {
    assert.deepEqual(hubBodyRead({ data: null, error: failed }), { state: 'error', message: 'Failed to fetch' });
  });

  test('a missing row is an error, not empty text', () => {
    const r = hubBodyRead({ data: null, error: null });
    assert.equal(r.state, 'error');
  });

  test('a loaded body is kept exactly, including a deliberately empty one', () => {
    assert.deepEqual(hubBodyRead({ data: { body: '# Hub\n\n## Pillar' }, error: null }), { state: 'loaded', value: '# Hub\n\n## Pillar' });
    assert.deepEqual(hubBodyRead({ data: { body: '' }, error: null }), { state: 'loaded', value: '' });
    assert.deepEqual(hubBodyRead({ data: { body: null }, error: null }), { state: 'loaded', value: '' });
  });
});

type P = { id: string; full_name: string | null; county: string | null; show_in_directory: boolean | null };
const optedOut: P = { id: 'u1', full_name: 'Pat Member', county: 'Leon', show_in_directory: false };
const loading: Loaded<P> = { state: 'loading' };

describe('profile read', () => {
  test('a first read that fails is an error', () => {
    assert.deepEqual(profileRead<P>({ data: null, error: failed }, loading), { state: 'error', message: 'Failed to fetch' });
  });

  test('a first read with no row is an error', () => {
    assert.equal(profileRead<P>({ data: null, error: null }, loading).state, 'error');
  });

  test('a later read that fails keeps the profile already loaded', () => {
    const loaded: Loaded<P> = { state: 'loaded', value: optedOut };
    assert.equal(profileRead<P>({ data: null, error: failed }, loaded), loaded);
  });

  test('a read after a failure loads the profile (Try again)', () => {
    const r = profileRead<P>({ data: optedOut, error: null }, { state: 'error', message: 'x' });
    assert.deepEqual(r, { state: 'loaded', value: optedOut });
  });
});

describe('directory box', () => {
  test('ticked only for a member listed now', () => {
    assert.equal(listedInDirectory({ show_in_directory: true }), true);
    assert.equal(listedInDirectory({ show_in_directory: false }), false);
    // get_directory skips a null flag, so the box must not claim otherwise.
    assert.equal(listedInDirectory({ show_in_directory: null }), false);
  });
});

describe('profile save', () => {
  const form = { full_name: '', cert_level: '', county: '', agency: '', show_in_directory: 'on' };

  test('nothing is sent while the profile is loading', () => {
    assert.equal(profileSaveArgs(loading, form), null);
  });

  test('nothing is sent after the profile failed to load', () => {
    assert.equal(profileSaveArgs({ state: 'error', message: 'x' }, form), null);
  });

  test('an opted-out member who changes only the county stays unlisted', () => {
    // The form was filled from the loaded record: box unticked, so FormData has no show_in_directory.
    const filled = { full_name: 'Pat Member', cert_level: 'Paramedic', county: 'Wakulla', agency: 'TCC' };
    const args = profileSaveArgs({ state: 'loaded', value: optedOut }, filled);
    assert.deepEqual(args, { p_full_name: 'Pat Member', p_cert_level: 'Paramedic', p_county: 'Wakulla', p_agency: 'TCC', p_show: false });
  });

  test('a listed member saving a change stays listed', () => {
    const args = profileSaveArgs({ state: 'loaded', value: { ...optedOut, show_in_directory: true } }, { full_name: 'Pat Member', cert_level: 'EMT', county: 'Leon', agency: 'TCC', show_in_directory: 'on' });
    assert.equal(args?.p_show, true);
    assert.equal(args?.p_cert_level, 'EMT');
  });

  test('deliberate edits go through: clearing a field, opting in', () => {
    const args = profileSaveArgs({ state: 'loaded', value: optedOut }, { full_name: 'Pat Member', cert_level: 'Paramedic', county: '', agency: 'TCC', show_in_directory: 'on' });
    assert.equal(args?.p_county, '');
    assert.equal(args?.p_show, true);
  });
});
