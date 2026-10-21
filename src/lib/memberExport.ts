// The member list export (board, 2026-10-20): every person in the People
// list as a spreadsheet, with membership status and dates. A CSV file, which
// Excel, Numbers and Google Sheets all open. No imports, so the tests run it
// directly; the People pane works out each row's status and dates.

export type ExportRow = {
  name: string;
  email: string;
  phone: string;
  agency: string;
  county: string;
  certification: string;
  tier: string;
  position: string;
  status: string;
  paidThrough: string; // YYYY-MM-DD, or '' when there is no date on file
  renewalOpens: string;
  graceEnds: string;
  coveredBy: string;
  listed: boolean;
  listserv: boolean;
  admin: boolean;
};

export const EXPORT_HEADER = [
  'Name',
  'Email',
  'Phone',
  'Agency',
  'County',
  'Certification',
  'Tier',
  'FAEMSE position',
  'Status',
  'Paid through',
  'Renewal opens',
  'Grace ends',
  'Covered by',
  'Listed in directory',
  'On listserv',
  'Admin',
];

// Quoted, with a leading apostrophe on anything a spreadsheet would run as a
// formula (=, +, -, @): a name or note typed into a public form must never
// become a live formula in the board's copy of Excel.
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function membersCsv(rows: ExportRow[]): string {
  const yes = (b: boolean) => (b ? 'Yes' : 'No');
  const lines = rows.map((r) =>
    [
      r.name,
      r.email,
      r.phone,
      r.agency,
      r.county,
      r.certification,
      r.tier,
      r.position,
      r.status,
      r.paidThrough,
      r.renewalOpens,
      r.graceEnds,
      r.coveredBy,
      yes(r.listed),
      yes(r.listserv),
      yes(r.admin),
    ]
      .map(csvCell)
      .join(','),
  );
  // The byte-order mark tells Excel the file is UTF-8, so accented names
  // come through intact.
  return '﻿' + [EXPORT_HEADER.map(csvCell).join(','), ...lines].join('\r\n');
}
