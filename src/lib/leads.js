// Lead stages and the 60-day protection rules, shared by partner and admin screens.
export const STAGES = [
  ['registered', 'Registered'],
  ['contacted', 'Contacted'],
  ['site_visit', 'Site visit done'],
  ['negotiation', 'Negotiation'],
  ['eoi', 'EOI received'],
  ['cheque', 'Cheque collected'],
  ['booked', 'Booking confirmed'],
  ['lost', 'Lost'],
  ['lost_other', 'Lost to another partner'],
];
export const STAGE = Object.fromEntries(STAGES);
export const VISIT_PLUS = ['site_visit', 'negotiation', 'eoi', 'cheque', 'booked'];

export const daysLeft = (l) => (l.expires_at ? Math.ceil((new Date(l.expires_at) - Date.now()) / 864e5) : null);

/** pending · rejected · released · booked · closed · expired · protected */
export function prot(l) {
  if (l.approval === 'pending') return 'pending';
  if (l.approval === 'rejected') return 'rejected';
  if (l.approval === 'released') return 'released';
  if (l.stage === 'booked') return 'booked';
  if (l.stage === 'lost' || l.stage === 'lost_other') return 'closed';
  if (l.expires_at && new Date(l.expires_at) < new Date()) return 'expired';
  return 'protected';
}

export const FILTERS = [
  ['all', 'All'],
  ['pending', 'Awaiting approval'],
  ['protected', 'Protected'],
  ['expiring', 'Expiring in 7 days'],
  ['contacted', 'Contacted'],
  ['site_visit', 'Site visit done'],
  ['negotiation', 'Negotiation'],
  ['eoi', 'EOI received'],
  ['cheque', 'Cheque collected'],
  ['booked', 'Booked'],
  ['lost', 'Lost'],
  ['expired', 'Expired'],
  ['rejected', 'Rejected'],
];

export function matches(l, f) {
  const p = prot(l);
  if (f === 'all') return true;
  if (['pending', 'protected', 'expired', 'rejected'].includes(f)) return p === f;
  if (f === 'expiring') return p === 'protected' && daysLeft(l) <= 7;
  if (f === 'booked') return l.stage === 'booked';
  if (f === 'lost') return l.stage === 'lost' || l.stage === 'lost_other';
  return l.stage === f && p === 'protected';
}

export const REJECT_REASONS = [
  'Already a direct Milke Khareedo client',
  'Registered by another partner',
  'Invalid or unreachable number',
  'Incomplete details',
];

export const COUNTRY_CODES = [
  ['+91', 'IN', 'India'], ['+971', 'AE', 'UAE'], ['+1', 'US', 'USA / Canada'], ['+44', 'GB', 'UK'],
  ['+65', 'SG', 'Singapore'], ['+966', 'SA', 'Saudi Arabia'], ['+974', 'QA', 'Qatar'], ['+968', 'OM', 'Oman'],
  ['+965', 'KW', 'Kuwait'], ['+973', 'BH', 'Bahrain'], ['+61', 'AU', 'Australia'], ['+64', 'NZ', 'New Zealand'],
  ['+49', 'DE', 'Germany'],
];

export function exportCsv(rows, admin) {
  const head = ['Code', 'Client', 'Phone', 'Email', 'Budget', 'Villas', 'Expected visit', 'Stage', 'Approval', 'Protected till', 'Registered']
    .concat(admin ? ['Partner', 'Partner firm', 'Partner no.'] : []);
  const fmt = (ts) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');
  const lines = [head].concat(rows.map((l) => [
    'KGR-' + String(l.id).padStart(4, '0'), l.client_name, `${l.client_cc} ${l.client_phone}`, l.client_email || '', l.budget || '',
    (l.villas || []).join(' '), l.visit_date || '', STAGE[l.stage], l.approval, fmt(l.expires_at), fmt(l.registered_at),
  ].concat(admin ? [l.partner ? l.partner.full_name : 'Direct', l.partner?.firm_name || '', l.partner?.member_no || ''] : [])));
  const csv = lines.map((r) => r.map((c) => { c = String(c); return /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c; }).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `anandam-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
