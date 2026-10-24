import { useAuth } from '../../lib/auth.jsx';
import { useData } from '../../lib/data.jsx';
import { STAGE, STAGES, daysLeft, prot } from '../../lib/leads.js';
import { dfmt, leadCode, phoneFmt, shortNo } from '../../lib/format.js';

export function ProtPill({ lead }) {
  const p = prot(lead);
  const d = daysLeft(lead);
  const map = {
    pending: ['warn', 'Awaiting approval'], rejected: ['bad', 'Rejected'], released: ['', 'Released'],
    booked: ['gold', 'Booked'], closed: ['', 'Closed'], expired: ['bad', 'Protection expired'],
    protected: ['ok', `Protected · ${d} day${d === 1 ? '' : 's'}`],
  };
  const [cls, txt] = map[p];
  return <span className={`pill ${cls}`}>{txt}</span>;
}

export function ProtBar({ lead }) {
  const { settings } = useData();
  if (prot(lead) !== 'protected') return null;
  const total = settings.protection_days || 60;
  const d = Math.max(0, daysLeft(lead));
  const pct = Math.max(3, Math.min(100, (d / total) * 100));
  const cls = d <= 7 ? ' crit' : d <= 15 ? ' low' : '';
  return (
    <div className="prot">
      <div className="protline"><span>{STAGE[lead.stage]}</span><span>Protected till <b>{dfmt(lead.expires_at)}</b></span></div>
      <div className={`bar${cls}`}><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function LeadCard({ lead, onOpen }) {
  const { isAdmin } = useAuth();
  const pt = lead.partner;
  return (
    <button className="lead" type="button" onClick={() => onOpen(lead)}>
      <span className="nm">{lead.client_name}</span>
      <ProtPill lead={lead} />
      <span className="meta">
        <span>{leadCode(lead.id)}</span>
        <span>{phoneFmt(lead)}</span>
        {isAdmin && <span>{pt ? <><b>{pt.full_name}</b>{pt.member_no ? ' · ' + shortNo(pt.member_no) : ''}</> : <b>Direct · Milke Khareedo</b>}</span>}
        <span>Registered {dfmt(lead.registered_at)}</span>
        {lead.villas?.length ? <span>Villas {lead.villas.join(', ')}</span> : null}
      </span>
      <ProtBar lead={lead} />
    </button>
  );
}

export function Funnel({ leads }) {
  const counts = STAGES.map(([k, label]) => [label, leads.filter((l) => l.approval === 'approved' && l.stage === k).length]);
  const max = Math.max(1, ...counts.map((c) => c[1]));
  return (
    <div className="hbars">
      {counts.map(([label, n]) => (
        <div className="hb" key={label}><span>{label}</span><div className="track"><i style={{ width: `${(n / max) * 100}%` }} /></div><b>{n}</b></div>
      ))}
    </div>
  );
}

export function HBars({ rows, total }) {
  return (
    <div className="hbars">
      {rows.map(([label, n]) => (
        <div className="hb" key={label}><span>{label}</span><div className="track"><i style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div><b>{n}</b></div>
      ))}
    </div>
  );
}
