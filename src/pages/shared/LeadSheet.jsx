import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';
import { useData } from '../../lib/data.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Sheet, CloseButton } from '../../components/Sheet.jsx';
import { REJECT_REASONS, STAGE, STAGES, prot } from '../../lib/leads.js';
import { PROJECT, dfmt, dtfmt, errMsg, leadCode, phoneFmt, shortNo } from '../../lib/format.js';
import { ProtBar, ProtPill } from './LeadParts.jsx';

const EVENT_NAMES = {
  registered: 'Registered', approved: 'Approved', rejected: 'Rejected', released: 'Released',
  extended: 'Protection extended', stage: 'Stage changed', reassigned: 'Reassigned', note: 'Note',
};
const TOASTS = {
  approve: 'Approved · client protected', reject: 'Lead rejected', release: 'Client released', extend: 'Protection extended',
  stage: 'Stage updated', reassign: 'Lead reassigned', note: 'Note saved',
};

/** Lead detail with history; partners can move early stages, admins get every action. */
export function LeadSheet({ leadId, onClose }) {
  const { isAdmin, who } = useAuth();
  const { leads, partners, settings, refresh } = useData();
  const toast = useToast();
  const lead = leads.find((l) => l.id === leadId);
  const [events, setEvents] = useState(null);
  const [mode, setMode] = useState(null); // reject | note | reassign | release
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(null);
    if (!leadId) return;
    setEvents(null);
    supabase.from('mk_lead_events').select('at,action,detail,actor_role').eq('lead_id', leadId).order('at')
      .then((r) => setEvents(r.data || []));
  }, [leadId, lead?.updated_at]);

  if (!lead) return <Sheet open={false} onClose={onClose} />;
  const p = prot(lead);
  const pt = lead.partner;

  async function adminAct(action, value) {
    setBusy(true);
    const r = await supabase.rpc('mk_admin_lead', { p_lead: lead.id, p_action: action, p_value: value == null ? null : String(value) });
    setBusy(false);
    if (r.error) return toast(errMsg(r.error));
    toast(TOASTS[action]);
    setMode(null);
    setText('');
    refresh();
  }
  async function partnerStage(stage) {
    setBusy(true);
    const r = await supabase.rpc('mk_partner_stage', { p_lead: lead.id, p_stage: stage });
    setBusy(false);
    if (r.error) return toast(errMsg(r.error));
    toast('Stage updated');
    refresh();
  }

  const history = lead.approval === 'pending' && isAdmin
    ? leads.filter((x) => x.id !== lead.id && x.client_cc === lead.client_cc && x.client_phone === lead.client_phone)
    : [];

  let actions = null;
  if (mode === 'reject') {
    actions = (
      <div className="form">
        <p className="sub">The partner sees this reason.</p>
        <div className="pick">
          {REJECT_REASONS.map((r) => (
            <label key={r}><input type="radio" name="rr" checked={text === r} onChange={() => setText(r)} /><span>{r}</span></label>
          ))}
        </div>
        <div className="f"><label htmlFor="rro">Or write a reason</label><input className="inp" id="rro" onChange={(e) => setText(e.target.value)} /></div>
        <div className="actions"><button className="btn danger" type="button" disabled={busy || !text.trim()} onClick={() => adminAct('reject', text.trim())}>Reject lead</button>
          <button className="btn ghost" type="button" onClick={() => setMode(null)}>Cancel</button></div>
      </div>
    );
  } else if (mode === 'note') {
    actions = (
      <div className="form">
        <div className="f"><label htmlFor="nt">Note</label><textarea className="inp" id="nt" style={{ minHeight: 100 }} onChange={(e) => setText(e.target.value)} /></div>
        <div className="actions"><button className="btn" type="button" disabled={busy || !text.trim()} onClick={() => adminAct('note', text.trim())}>Save note</button>
          <button className="btn ghost" type="button" onClick={() => setMode(null)}>Cancel</button></div>
      </div>
    );
  } else if (mode === 'reassign') {
    const ap = partners.filter((x) => x.status === 'approved' && x.user_id !== lead.partner_id);
    actions = (
      <div className="form">
        <p className="sub">Use this to settle a dispute. Protection dates stay the same.</p>
        {ap.length ? (
          <>
            <select className="inp" defaultValue="" onChange={(e) => setText(e.target.value)}>
              <option value="" disabled>Pick a partner</option>
              {ap.map((x) => <option key={x.user_id} value={x.user_id}>{x.full_name}{x.firm_name ? ' · ' + x.firm_name : ''}</option>)}
            </select>
            <div className="actions"><button className="btn" type="button" disabled={busy || !text} onClick={() => adminAct('reassign', text)}>Reassign lead</button>
              <button className="btn ghost" type="button" onClick={() => setMode(null)}>Cancel</button></div>
          </>
        ) : <p className="hint">No other approved partners yet.</p>}
      </div>
    );
  } else if (mode === 'release') {
    actions = (
      <div className="form">
        <p className="sub">The client stops being protected and any partner can register them again.</p>
        <div className="actions"><button className="btn danger" type="button" disabled={busy} onClick={() => adminAct('release', null)}>Release client</button>
          <button className="btn ghost" type="button" onClick={() => setMode(null)}>Cancel</button></div>
      </div>
    );
  } else if (isAdmin) {
    actions = lead.approval === 'pending' ? (
      <>
        {history.length > 0 && (
          <div className="notice warn" style={{ marginBottom: 12 }}>
            This number has {history.length} earlier registration{history.length > 1 ? 's' : ''}:{' '}
            {history.map((h) => `${leadCode(h.id)} (${h.partner ? h.partner.full_name : 'Direct'}, ${prot(h)})`).join('; ')}
          </div>
        )}
        <div className="actions">
          <button className="btn ok" type="button" disabled={busy} onClick={() => adminAct('approve')}>Approve · protect {settings.protection_days} days</button>
          <button className="btn danger" type="button" onClick={() => { setText(REJECT_REASONS[0]); setMode('reject'); }}>Reject</button>
        </div>
      </>
    ) : (
      <div className="form">
        <div className="f"><label htmlFor="stg">Stage</label>
          <select id="stg" className="inp" value={lead.stage} disabled={busy} onChange={(e) => adminAct('stage', e.target.value)}>
            {STAGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select></div>
        <div className="actions">
          {lead.approval === 'approved' ? (
            <>
              <button className="btn ghost sm" type="button" disabled={busy} onClick={() => adminAct('extend', settings.extension_days)}>Extend {settings.extension_days} days</button>
              <button className="btn ghost sm" type="button" onClick={() => { setText(''); setMode('reassign'); }}>Reassign</button>
              <button className="btn danger sm" type="button" onClick={() => setMode('release')}>Release client</button>
            </>
          ) : <button className="btn ghost sm" type="button" disabled={busy} onClick={() => adminAct('approve')}>Approve</button>}
          <button className="btn ghost sm" type="button" onClick={() => { setText(''); setMode('note'); }}>Add note</button>
        </div>
      </div>
    );
  } else if (p === 'protected') {
    const allowed = ['registered', 'contacted', 'negotiation'].includes(lead.stage)
      ? [['contacted', 'Contacted'], ['negotiation', 'Negotiation'], ['lost', 'Mark lost']].filter(([k]) => k !== lead.stage) : [];
    const pass = `Hello ${lead.client_name}, your visit to ${PROJECT} is registered through ${who?.name || 'your partner'} with Milke Khareedo. Please show code ${leadCode(lead.id)} at the site office when you arrive.`;
    actions = (
      <>
        {allowed.length > 0 && (
          <div className="f">
            <span className="flabel">Update stage</span>
            <div className="actions">{allowed.map(([k, label]) => <button key={k} className="btn ghost sm" type="button" disabled={busy} onClick={() => partnerStage(k)}>{label}</button>)}</div>
            <p className="hint">Site visits, EOI, cheques and bookings are confirmed by the Milke Khareedo team.</p>
          </div>
        )}
        <div className="actions" style={{ marginTop: 12 }}>
          <a className="btn" target="_blank" rel="noopener noreferrer"
            href={`https://wa.me/${(lead.client_cc + lead.client_phone).replace(/\D/g, '')}?text=${encodeURIComponent(pass)}`}>Send visit pass on WhatsApp</a>
        </div>
      </>
    );
  } else if (p === 'pending') {
    actions = (
      <div className="notice info">Waiting for the Milke Khareedo team to approve. Once approved, this client is protected for you until{' '}
        {dfmt(new Date(lead.registered_at).getTime() + settings.protection_days * 864e5)}.</div>
    );
  }

  return (
    <Sheet open={!!leadId} onClose={onClose}>
      <div className="sh-head"><div><p className="eyebrow">{leadCode(lead.id)}</p><h2>{lead.client_name}</h2></div><CloseButton onClick={onClose} /></div>
      <div className="actions"><ProtPill lead={lead} /><span className="pill">{STAGE[lead.stage]}</span></div>
      <ProtBar lead={lead} />
      {lead.approval === 'rejected' && lead.reject_reason && <div className="notice bad">Rejected: {lead.reject_reason}</div>}
      <div className="kv">
        <div><span>Phone</span><b>{phoneFmt(lead)}</b></div>
        <div><span>Email</span><b>{lead.client_email || '—'}</b></div>
        <div><span>Budget</span><b>{lead.budget || '—'}</b></div>
        <div><span>Preferred villas</span><b>{lead.villas?.join(', ') || '—'}</b></div>
        <div><span>Expected visit</span><b>{lead.visit_date ? dfmt(lead.visit_date) : '—'}</b></div>
        <div><span>Registered</span><b>{dtfmt(lead.registered_at)}</b></div>
        {isAdmin && <div><span>Partner</span><b>{pt ? <>{pt.full_name}{pt.member_no ? ' · ' + shortNo(pt.member_no) : ''}{pt.mobile && <><br />+91 {pt.mobile}</>}</> : 'Direct · Milke Khareedo'}</b></div>}
        {lead.notes && <div style={{ gridColumn: '1/-1' }}><span>Notes</span><b>{lead.notes}</b></div>}
      </div>
      {actions && <div>{actions}</div>}
      <hr className="divider" />
      <h3>History</h3>
      <ul className="timeline">
        {events === null ? <li>Loading…</li> : events.length === 0 ? <li>No history yet.</li> : events.map((e, i) => {
          let det = e.detail;
          if (e.action === 'stage') det = STAGE[det] || det;
          if (e.action === 'reassigned') { const pp = partners.find((x) => x.user_id === det); det = pp ? 'to ' + pp.full_name : ''; }
          return (
            <li key={i}><b>{EVENT_NAMES[e.action] || e.action}</b>{det ? ' · ' + det : ''}
              <small>{dtfmt(e.at)} · {e.actor_role === 'admin' ? 'Milke Khareedo' : 'Partner'}</small></li>
          );
        })}
      </ul>
    </Sheet>
  );
}
