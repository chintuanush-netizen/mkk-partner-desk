import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';
import { useData } from '../../lib/data.jsx';
import { COUNTRY_CODES } from '../../lib/leads.js';
import { DESK, dfmt, errMsg, leadCode, titleCase } from '../../lib/format.js';
import { Page } from '../../components/Shell.jsx';
import { Icon } from '../../components/Icons.jsx';
import { LeadSheet } from './LeadSheet.jsx';

/** Phone first (with an instant protection check), then client details. */
export function Register() {
  const { isAdmin } = useAuth();
  const { settings, villas, refresh } = useData();
  const nav = useNavigate();
  const [step, setStep] = useState('phone'); // phone | details | done
  const [cc, setCc] = useState('+91');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [openLead, setOpenLead] = useState(null);
  const [d, setD] = useState({ name: '', email: '', budget: '', villas: [], visit_date: '', notes: '' });
  const [done, setDone] = useState(null);

  const digits = phone.replace(/\D/g, '');
  const valid = cc === '+91' ? /^[6-9]\d{9}$/.test(digits) : digits.length >= 6 && digits.length <= 14;
  const country = COUNTRY_CODES.find((c) => c[0] === cc);

  async function check(e) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true); setErr('');
    const r = await supabase.rpc('mk_check_phone', { p_cc: cc, p_phone: digits });
    setBusy(false);
    if (r.error) return setErr(errMsg(r.error));
    if (r.data.status === 'free') return setStep('details');
    if (r.data.status === 'yours') { await refresh(); setOpenLead(r.data.lead_id); return; }
    setErr(isAdmin ? 'This number is already registered and protected. Search for it in Leads.'
      : `This client is already registered with another partner. If you believe this is wrong, contact the partner desk at ${DESK}.`);
  }

  async function submit(e) {
    e.preventDefault();
    if (!d.name.trim()) return setErr("Enter the client's name.");
    setBusy(true); setErr('');
    const r = await supabase.rpc('mk_register_lead', { d: { cc, phone: digits, ...d, name: d.name.trim() } });
    setBusy(false);
    if (r.error) return setErr(errMsg(r.error));
    if (!r.data.ok) return setErr('This client was just registered by someone else.');
    await refresh();
    setDone({ id: r.data.id, name: d.name.trim() });
    setStep('done');
  }

  function reset() { setStep('phone'); setPhone(''); setErr(''); setDone(null); setD({ name: '', email: '', budget: '', villas: [], visit_date: '', notes: '' }); }

  if (step === 'done') {
    return (
      <main><div className="centerblock">
        <Icon id="i-check" className="bigicon" style={{ color: 'var(--ok)' }} />
        <h1>{isAdmin ? 'Lead added' : 'Client registered'}</h1>
        <div className="pill gold" style={{ fontSize: 16, padding: '8px 16px' }}>{leadCode(done.id)}</div>
        <p className="sub">{isAdmin
          ? `${done.name} is protected for Milke Khareedo for ${settings.protection_days} days.`
          : `${done.name} is waiting for approval from the Milke Khareedo team. Once approved, this client is protected for you until ${dfmt(Date.now() + settings.protection_days * 864e5)}.`}</p>
        <div className="actions"><button className="btn" type="button" onClick={reset}>Register another</button>
          <button className="btn ghost" type="button" onClick={() => nav('/leads')}>View {isAdmin ? 'leads' : 'my leads'}</button></div>
      </div></main>
    );
  }

  if (step === 'details') {
    const opts = villas.filter((v) => v.status !== 'booked');
    const toggleVilla = (no, on) => setD({ ...d, villas: on ? [...d.villas, String(no)] : d.villas.filter((x) => x !== String(no)) });
    return (
      <Page>
        <div><p className="eyebrow">{cc} {digits} · number is free</p><h1>Client details</h1></div>
        <div className="card">
          <form className="form" onSubmit={submit} noValidate>
            <div className="f"><label htmlFor="c_name">Client name</label><input id="c_name" autoComplete="off" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
            <div className="two">
              <div className="f"><label htmlFor="c_email">Email <span className="opt">(optional)</span></label><input id="c_email" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></div>
              <div className="f"><label htmlFor="c_budget">Budget</label>
                <select id="c_budget" value={d.budget} onChange={(e) => setD({ ...d, budget: e.target.value })}>
                  <option value="">Select</option>{['Under ₹3 Cr', '₹3–3.5 Cr', '₹3.5–4 Cr', '₹4–5 Cr', 'Above ₹5 Cr'].map((o) => <option key={o}>{o}</option>)}
                </select></div>
            </div>
            <div className="f"><span className="flabel">Preferred villas <span className="opt">(optional, from the live board)</span></span>
              <div className="pick" style={{ maxHeight: 180, overflow: 'auto' }}>
                {opts.length ? opts.map((v) => (
                  <label key={v.no}><input type="checkbox" checked={d.villas.includes(String(v.no))} onChange={(e) => toggleVilla(v.no, e.target.checked)} />
                    <span>{v.no} · {titleCase(v.facing)} · {v.plot} sq yd</span></label>
                )) : <p className="hint">Villa list unavailable right now.</p>}
              </div></div>
            <div className="f"><label htmlFor="c_visit">Expected site visit <span className="opt">(optional)</span></label>
              <input id="c_visit" type="date" min={new Date().toISOString().slice(0, 10)} value={d.visit_date} onChange={(e) => setD({ ...d, visit_date: e.target.value })} /></div>
            <div className="f"><label htmlFor="c_notes">Notes <span className="opt">(optional)</span></label>
              <textarea id="c_notes" placeholder="Family size, timeline, home loan, anything useful" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></div>
            {err && <p className="err">{err}</p>}
            <div className="actions">
              <button className="btn ghost" type="button" onClick={() => { setErr(''); setStep('phone'); }}>Back</button>
              <button className="btn" type="submit" style={{ flex: 1 }} disabled={busy}>{busy ? 'Registering…' : isAdmin ? 'Add lead' : 'Register client'}</button>
            </div>
          </form>
        </div>
      </Page>
    );
  }

  return (
    <main><div className="view"><div className="centerblock">
      <Icon id="i-phone" className="bigicon" />
      <h1>{isAdmin ? 'Add a direct lead' : 'Register lead'}</h1>
      <p className="sub">Select the country and enter the client's phone number to begin.</p>
      <form className="form" onSubmit={check} noValidate style={{ width: '100%' }}>
        <div className="phone">
          <select className="inp" value={cc} onChange={(e) => setCc(e.target.value)} aria-label="Country code">
            {COUNTRY_CODES.map(([c, iso]) => <option key={c} value={c}>{c} {iso}</option>)}
          </select>
          <input className="inp" type="tel" inputMode="numeric" placeholder="Phone number" aria-label="Phone number" autoComplete="off" autoFocus
            value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))} />
        </div>
        <p className="hint">{cc === '+91' ? 'India · 10 digits, starting 6 to 9' : `${country[2]} · enter the number without the country code`}</p>
        {err && <p className="err">{err}</p>}
        <button className="btn block" type="submit" disabled={!valid || busy}>{busy ? 'Checking…' : 'Continue'}</button>
      </form>
      <p className="hint">{isAdmin
        ? 'Direct leads are approved immediately and protected for Milke Khareedo.'
        : `Each client can be protected for one partner at a time. Once approved, your client is protected for you for ${settings.protection_days} days from today.`}</p>
    </div></div>
    <LeadSheet leadId={openLead} onClose={() => setOpenLead(null)} />
    </main>
  );
}
