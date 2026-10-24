import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useData } from '../../lib/data.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Page } from '../../components/Shell.jsx';
import { Icon } from '../../components/Icons.jsx';
import { Sheet, CloseButton } from '../../components/Sheet.jsx';
import { VISIT_PLUS, daysLeft, prot } from '../../lib/leads.js';
import { dfmt, dtfmt, errMsg, leadCode, memberNo, shortNo } from '../../lib/format.js';
import { Funnel, LeadCard } from '../shared/LeadParts.jsx';
import { LeadSheet } from '../shared/LeadSheet.jsx';

export function AdminHome() {
  const { leads: L, partners: P, dupes } = useData();
  const nav = useNavigate();
  const k = {
    pend: L.filter((l) => l.approval === 'pending').length,
    apps: P.filter((p) => p.status === 'pending').length,
    prot: L.filter((l) => prot(l) === 'protected').length,
    exp: L.filter((l) => prot(l) === 'protected' && daysLeft(l) <= 7).length,
    visits: L.filter((l) => l.approval === 'approved' && VISIT_PLUS.includes(l.stage)).length,
    booked: L.filter((l) => l.stage === 'booked').length,
  };
  const board = P.filter((p) => p.status === 'approved').map((p) => {
    const mine = L.filter((l) => l.partner_id === p.user_id);
    return { p, n: mine.length, v: mine.filter((l) => VISIT_PLUS.includes(l.stage)).length, b: mine.filter((l) => l.stage === 'booked').length };
  }).sort((a, b) => b.b - a.b || b.v - a.v || b.n - a.n).slice(0, 5);
  const pname = (id) => P.find((x) => x.user_id === id)?.full_name || 'A partner';
  const toLeads = (f) => nav(`/leads?f=${f}`);
  const th = { padding: '6px 0' };
  return (
    <Page>
      <div><p className="eyebrow">Command centre</p><h1>Anandam Villas · Phase 1</h1></div>
      <div className="stats four">
        <button className={`stat${k.pend ? ' alert' : ''}`} type="button" onClick={() => nav('/approvals')}><span className="n">{k.pend}</span><span className="l">Leads to approve</span></button>
        <button className={`stat${k.apps ? ' alert' : ''}`} type="button" onClick={() => nav('/approvals')}><span className="n">{k.apps}</span><span className="l">Partner applications</span></button>
        <button className="stat good" type="button" onClick={() => toLeads('protected')}><span className="n">{k.prot}</span><span className="l">Protected leads</span></button>
        <button className={`stat${k.exp ? ' alert' : ''}`} type="button" onClick={() => toLeads('expiring')}><span className="n">{k.exp}</span><span className="l">Expiring in 7 days</span></button>
        <div className="stat"><span className="n">{k.visits}</span><span className="l">Site visits and beyond</span></div>
        <button className="stat good" type="button" onClick={() => toLeads('booked')}><span className="n">{k.booked}</span><span className="l">Bookings</span></button>
        <div className="stat"><span className="n">{P.filter((p) => p.status === 'approved').length}</span><span className="l">Active partners</span></div>
        <div className="stat"><span className="n">{L.length}</span><span className="l">All leads</span></div>
      </div>
      <div className="tiles">
        <button className="tile primary" type="button" onClick={() => nav('/approvals')}><Icon id="i-inbox" />Review approvals</button>
        <button className="tile" type="button" onClick={() => nav('/board')}><Icon id="i-building" />Inventory board</button>
      </div>
      <div className="card"><h3 style={{ marginBottom: 16 }}>Pipeline by stage</h3><Funnel leads={L} /></div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Top partners</h3>
        {board.length ? (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
              <thead><tr style={{ color: 'var(--faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'left' }}>
                <th style={th}>Partner</th><th style={{ textAlign: 'right' }}>Leads</th><th style={{ textAlign: 'right' }}>Visits</th><th style={{ textAlign: 'right' }}>Booked</th></tr></thead>
              <tbody>{board.map((r) => (
                <tr key={r.p.user_id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 0' }}>{r.p.full_name} {r.p.member_no ? <span style={{ color: 'var(--faint)' }}>{shortNo(r.p.member_no)}</span> : null}</td>
                  <td style={{ textAlign: 'right' }}>{r.n}</td><td style={{ textAlign: 'right' }}>{r.v}</td><td style={{ textAlign: 'right', color: 'var(--gold)' }}>{r.b}</td>
                </tr>))}</tbody>
            </table>
          </div>
        ) : <p className="hint">No approved partners yet.</p>}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Duplicate attempts</h3>
        <p className="hint" style={{ marginBottom: 12 }}>Partners who tried to register a client already protected for someone else.</p>
        {dupes.length ? (
          <ul className="timeline">{dupes.slice(0, 8).map((d) => {
            const h = L.find((l) => l.id === d.holder_lead_id);
            return (<li key={d.id}><b>{pname(d.partner_id)}</b> tried {d.client_cc} {d.client_phone}
              {h ? <> · held by {h.partner ? h.partner.full_name : 'Milke Khareedo'} ({leadCode(h.id)})</> : null}<small>{dtfmt(d.at)}</small></li>);
          })}</ul>
        ) : <p className="hint">None so far.</p>}
      </div>
    </Page>
  );
}

const PARTNER_PILL = {
  pending: ['warn', 'Awaiting review'], approved: ['ok', 'Approved'], rejected: ['bad', 'Rejected'], suspended: ['bad', 'Suspended'],
};

function PartnerCard({ p, onAction }) {
  const { leads } = useData();
  const nav = useNavigate();
  const mine = leads.filter((l) => l.partner_id === p.user_id);
  const [cls, txt] = PARTNER_PILL[p.status];
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row-between">
        <div><h3>{p.full_name}</h3><p className="hint">{p.firm_name || p.cp_type || ''}{p.member_no ? ' · ' + memberNo(p.member_no) : ''}</p></div>
        <span className={`pill ${cls}`}>{txt}</span>
      </div>
      <div className="kv">
        <div><span>Mobile</span><b>+91 {p.mobile}</b></div>
        <div><span>Email</span><b>{p.email}</b></div>
        <div><span>City · areas</span><b>{p.city}{p.areas ? ' · ' + p.areas : ''}</b></div>
        <div><span>Experience · team</span><b>{p.experience || '—'} · {p.team_size || '—'}</b></div>
        <div><span>RERA agent no.</span><b>{p.rera || '—'}</b></div>
        <div><span>PAN · GSTIN</span><b>{p.pan || '—'}{p.gstin ? ' · ' + p.gstin : ''}</b></div>
        <div><span>Sells</span><b>{p.segments?.join(', ') || '—'}</b></div>
        <div><span>Buyers</span><b>{p.buyers?.join(', ') || '—'}</b></div>
        <div><span>Deals a month</span><b>{p.closings || '—'}</b></div>
        <div><span>Heard via</span><b>{p.source || '—'}</b></div>
        {p.notes && <div style={{ gridColumn: '1/-1' }}><span>Notes</span><b>{p.notes}</b></div>}
        <div><span>Applied</span><b>{dfmt(p.submitted_at)}</b></div>
        <div><span>Leads</span><b>{mine.length} · {mine.filter((l) => l.stage === 'booked').length} booked</b></div>
      </div>
      {p.reject_reason && p.status !== 'approved' && <div className="notice bad">{p.reject_reason}</div>}
      <div className="actions">
        {p.status !== 'approved' && <button className="btn ok sm" type="button" onClick={() => onAction(p, 'approve')}>Approve partner</button>}
        {p.status === 'pending' && <button className="btn danger sm" type="button" onClick={() => onAction(p, 'reject')}>Reject</button>}
        {p.status === 'approved' && <>
          <button className="btn danger sm" type="button" onClick={() => onAction(p, 'suspend')}>Suspend</button>
          <button className="btn ghost sm" type="button" onClick={() => nav(`/leads?p=${p.user_id}`)}>View leads</button>
        </>}
      </div>
    </div>
  );
}

function usePartnerActions() {
  const { refresh } = useData();
  const toast = useToast();
  const [ask, setAsk] = useState(null); // {p, action}
  const [reason, setReason] = useState('');
  async function run(p, action, why) {
    const r = await supabase.rpc('mk_admin_partner', { p_user: p.user_id, p_action: action, p_reason: why || null });
    if (r.error) return toast(errMsg(r.error));
    setAsk(null);
    toast({ approve: 'Partner approved', reject: 'Enrolment rejected', suspend: 'Partner suspended' }[action]);
    refresh();
  }
  function onAction(p, action) {
    if (action === 'approve') return run(p, action);
    setReason(action === 'reject' ? 'Details could not be verified' : '');
    setAsk({ p, action });
  }
  const sheet = (
    <Sheet open={!!ask} onClose={() => setAsk(null)}>
      {ask && <>
        <div className="sh-head"><h2>{ask.action === 'reject' ? 'Reject enrolment' : 'Suspend partner'}</h2><CloseButton onClick={() => setAsk(null)} /></div>
        <div className="f"><label htmlFor="pr">Reason (the partner sees this)</label><input className="inp" id="pr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <div className="actions">
          <button className="btn danger" type="button" onClick={() => run(ask.p, ask.action, reason.trim())}>{ask.action === 'reject' ? 'Reject' : 'Suspend'}</button>
          <button className="btn ghost" type="button" onClick={() => setAsk(null)}>Cancel</button>
        </div>
      </>}
    </Sheet>
  );
  return { onAction, sheet };
}

export function Approvals() {
  const { leads, partners, settings } = useData();
  const [open, setOpen] = useState(null);
  const { onAction, sheet } = usePartnerActions();
  const pl = leads.filter((l) => l.approval === 'pending').sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));
  const pp = partners.filter((p) => p.status === 'pending');
  return (
    <Page>
      <h1>Approvals</h1>
      <div className="row-between"><h2>Leads to approve</h2><span className={`pill${pl.length ? ' warn' : ''}`}>{pl.length}</span></div>
      <p className="hint" style={{ marginTop: -12 }}>Oldest first. Approving protects the client for {settings.protection_days} days from when the partner registered them.</p>
      <div className="list">{pl.length ? pl.map((l) => <LeadCard key={l.id} lead={l} onOpen={(x) => setOpen(x.id)} />) : <p className="empty">All caught up.</p>}</div>
      <div className="row-between"><h2>Partner applications</h2><span className={`pill${pp.length ? ' warn' : ''}`}>{pp.length}</span></div>
      <div className="list">{pp.length ? pp.map((p) => <PartnerCard key={p.user_id} p={p} onAction={onAction} />) : <p className="empty">No new applications.</p>}</div>
      <LeadSheet leadId={open} onClose={() => setOpen(null)} />
      {sheet}
    </Page>
  );
}

export function Partners() {
  const { partners } = useData();
  const nav = useNavigate();
  const [f, setF] = useState('approved');
  const { onAction, sheet } = usePartnerActions();
  const list = partners.filter((p) => f === 'all' || p.status === f);
  return (
    <Page>
      <div className="row-between"><h1>Partners</h1>
        <button className="btn ghost sm" type="button" onClick={() => nav('/board')}><Icon id="i-building" />Board</button></div>
      <div className="chips">
        {[['approved', 'Approved'], ['pending', 'Awaiting review'], ['suspended', 'Suspended'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, label]) => (
          <button key={k} className="chip" type="button" aria-pressed={f === k} onClick={() => setF(k)}>
            {label}<span className="c">({partners.filter((p) => k === 'all' || p.status === k).length})</span></button>
        ))}
      </div>
      <div className="list">{list.length ? list.map((p) => <PartnerCard key={p.user_id} p={p} onAction={onAction} />) : <p className="empty">No partners here yet.</p>}</div>
      {sheet}
    </Page>
  );
}
