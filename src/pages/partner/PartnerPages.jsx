import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { useData } from '../../lib/data.jsx';
import { daysLeft, prot } from '../../lib/leads.js';
import { DESK, memberNo } from '../../lib/format.js';
import { Page } from '../../components/Shell.jsx';
import { Icon } from '../../components/Icons.jsx';
import { Funnel, HBars, LeadCard } from '../shared/LeadParts.jsx';
import { LeadSheet } from '../shared/LeadSheet.jsx';

export function PartnerHome() {
  const { who } = useAuth();
  const { leads } = useData();
  const nav = useNavigate();
  const [open, setOpen] = useState(null);
  const active = leads.filter((l) => prot(l) === 'protected').length;
  const week = leads.filter((l) => Date.now() - new Date(l.registered_at) < 7 * 864e5).length;
  const booked = leads.filter((l) => l.stage === 'booked').length;
  const expiring = leads.filter((l) => prot(l) === 'protected' && daysLeft(l) <= 7).length;
  return (
    <Page>
      <div>
        <p className="eyebrow">Welcome back</p>
        <h1>{who?.name || 'Partner'}</h1>
        {who?.member_no ? <p className="sub" style={{ marginTop: 4, color: 'var(--gold)' }}>{memberNo(who.member_no)} · EK SAATH Fortune Circle</p> : null}
      </div>
      <div className="stats">
        <div className="stat good"><span className="n">{active}</span><span className="l">My protected leads</span></div>
        <div className="stat"><span className="n">{week}</span><span className="l">This week</span></div>
        <div className="stat"><span className="n">{booked}</span><span className="l">Bookings</span></div>
      </div>
      {expiring > 0 && <div className="notice warn">{expiring} of your clients' protection ends within 7 days. Move them to a site visit soon.</div>}
      <div className="tiles">
        <button className="tile primary" type="button" onClick={() => nav('/register')}><Icon id="i-plus" />Register lead</button>
        <button className="tile" type="button" onClick={() => nav('/board')}><Icon id="i-building" />Inventory board</button>
        <button className="tile" type="button" onClick={() => nav('/leads')}><Icon id="i-list" />My leads</button>
      </div>
      <div className="row-between">
        <h2>Recent leads</h2>
        <button className="link" type="button" onClick={() => nav('/leads')}>View all <Icon id="i-chev" style={{ width: 16, height: 16 }} /></button>
      </div>
      <div className="list">
        {leads.length ? leads.slice(0, 5).map((l) => <LeadCard key={l.id} lead={l} onOpen={(x) => setOpen(x.id)} />)
          : <p className="empty">No leads yet. Tap Register lead to add your first one.</p>}
      </div>
      <p className="foot-note">KGR Fortune × Milke Khareedo · Milke Khareedo Private Limited, Hyderabad<br />Partner desk {DESK} · Technology by Leadnest</p>
      <LeadSheet leadId={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

export function PartnerStats() {
  const { leads } = useData();
  const approved = leads.filter((l) => l.approval === 'approved');
  const rows = [['Awaiting approval', 'pending'], ['Protected', 'protected'], ['Booked', 'booked'], ['Expired', 'expired'], ['Rejected', 'rejected']]
    .map(([label, k]) => [label, leads.filter((l) => prot(l) === k).length]);
  return (
    <Page>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="stat"><span className="n">{leads.length}</span><span className="l">Total leads</span></div>
        <div className="stat"><span className="n">{leads.filter((l) => prot(l) === 'protected').length}</span><span className="l">In pipeline</span></div>
        <div className="stat good"><span className="n">{leads.filter((l) => l.stage === 'booked').length}</span><span className="l">Bookings</span></div>
      </div>
      <div className="card"><h3 style={{ marginBottom: 16 }}>Approval status</h3><HBars rows={rows} total={leads.length} /></div>
      <div className="card"><h3 style={{ marginBottom: 16 }}>Pipeline by stage</h3>
        {approved.length ? <Funnel leads={leads} /> : <p className="empty" style={{ padding: '16px 0' }}>No approved leads yet.</p>}</div>
    </Page>
  );
}
