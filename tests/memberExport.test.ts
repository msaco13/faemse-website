// The member list export (Admin → People → Export to Excel).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, EXPORT_HEADER, membersCsv, type ExportRow } from '../src/lib/memberExport.ts';

const row: ExportRow = {
  name: 'Rochelle Goldberg',
  email: 'r@example.org',
  phone: '+1 305 555 0100',
  agency: 'Medical Career Academy',
  county: '',
  certification: 'Paramedic',
  tier: 'Active',
  position: 'Secretary',
  status: 'Current',
  paidThrough: '2027-10-31',
  renewalOpens: '2027-09-01',
  graceEnds: '2028-01-29',
  coveredBy: 'Own dues',
  listed: true,
  listserv: false,
  admin: false,
};

describe('the member list export', () => {
  test('starts with the Excel UTF-8 marker and the header row', () => {
    const csv = membersCsv([]);
    assert.ok(csv.startsWith('﻿'));
    assert.equal(csv.slice(1), EXPORT_HEADER.map((h) => `"${h}"`).join(','));
  });

  test('one line per person, every column in header order', () => {
    const lines = membersCsv([row]).split('\r\n');
    assert.equal(lines.length, 2);
    assert.equal(
      lines[1],
      [
        'Rochelle Goldberg',
        'r@example.org',
        "'+1 305 555 0100",
        'Medical Career Academy',
        '',
        'Paramedic',
        'Active',
        'Secretary',
        'Current',
        '2027-10-31',
        '2027-09-01',
        '2028-01-29',
        'Own dues',
        'Yes',
        'No',
        'No',
      ]
        .map((v) => `"${v}"`)
        .join(','),
    );
  });

  test('quotes and commas stay inside their cell', () => {
    assert.equal(csvCell('Smith, "Doc" Jr.'), '"Smith, ""Doc"" Jr."');
  });

  test('nothing can run as a spreadsheet formula', () => {
    for (const v of ['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)']) assert.ok(csvCell(v).startsWith(`"'`), v);
    assert.equal(csvCell('Paramedic'), '"Paramedic"');
  });
});
