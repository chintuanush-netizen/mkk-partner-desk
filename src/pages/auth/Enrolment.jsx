import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';
import { TopBar, Page } from '../../components/Shell.jsx';
import { Icon } from '../../components/Icons.jsx';
import { DESK, DESK_WA, errMsg } from '../../lib/format.js';

const LABELS = ['About you', 'Your business', 'Payout and terms'];
const SEGMENTS = ['Apartments', 'Villas', 'Plots', 'Commercial'];
const BUYERS = ['End-users', 'Investors', 'NRIs'];

function Picks({ name, options, value, onChange }) {
  return (
    <div className="pick">
      {options.map((o) => (
        <label key={o}>
          <input type="checkbox" name={name} checked={value.includes(o)}
            onChange={(e) => onChange(e.target.checked ? [...value, o] : value.filter((x) => x !== o))} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}

/** Shown after login until the partner has submitted an enrolment (or after a rejection). */
export function Enrolment() {
  const { who, user, refreshWho } = useAuth();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState({
    full_name: '', mobile: '', city: 'Hyderabad', experience: '', areas: '', cp_type: '', firm_name: '', rera: '',
    segments: [], buyers: [], team_size: '', closings: '', pan: '', gstin: '', source: '', notes: '', terms: false,
  });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const rejected = who?.role === 'partner' && who.status === 'rejected';

  async function next() {
    setErr('');
    if (step === 0) {
      if (!d.full_name.trim()) return setErr('Enter your full name.');
      if (!/^[6-9]\d{9}$/.test(d.mobile)) return setErr('Enter a 10-digit mobile number starting 6 to 9.');
      if (!d.areas.trim()) return setErr('Tell us the areas you work in.');
    }
    if (step === 1) {
      if (!d.cp_type) return setErr('Select how you are registering.');
      if (d.cp_type !== 'Individual agent' && !d.firm_name.trim()) return setErr('Enter your firm or company name.');
      if (!d.segments.length) return setErr('Pick at least one segment you sell.');
    }
    if (step < 2) return setStep(step + 1);
    const pan = d.pan.trim().toUpperCase();
    const gst = d.gstin.trim().toUpperCase();
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return setErr('PAN should look like ABCDE1234F.');
    if (gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) return setErr('Check the GSTIN. It has 15 characters.');
    if (!d.terms) return setErr('Accept the partner terms to submit.');
    setBusy(true);
    const r = await supabase.rpc('mk_submit_enrolment', { d: { ...d, pan, gstin: gst } });
    setBusy(false);
    if (r.error) return setErr(errMsg(r.error));
    refreshWho();
  }

  const fs = { border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 };
  return (
    <>
      <TopBar />
      <Page>
        <div><p className="eyebrow">Welcome</p><h1>Partner enrolment</h1></div>
        <p className="sub">Tell us about you and your business. Once the Milke Khareedo team approves your enrolment, your Partner Desk opens.</p>
        {rejected && <div className="notice bad">Your last enrolment was not approved{who.reject_reason ? `: ${who.reject_reason}` : ''}. Update your details and submit again.</div>}
        <div className="card">
          <div className="steps">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
          <p className="hint" style={{ margin: '10px 0 18px' }}>Step {step + 1} of 3 · {LABELS[step]}</p>
          <form className="form" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
            {step === 0 && (
              <fieldset style={fs}>
                <div className="f"><label htmlFor="e_name">Full name</label><input id="e_name" autoComplete="name" value={d.full_name} onChange={set('full_name')} /></div>
                <div className="two">
                  <div className="f"><label htmlFor="e_mobile">Mobile (WhatsApp)</label>
                    <input id="e_mobile" type="tel" inputMode="numeric" maxLength={10} placeholder="10 digits" value={d.mobile}
                      onChange={(e) => setD({ ...d, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></div>
                  <div className="f"><label htmlFor="e_email">Email</label><input id="e_email" value={user?.email || ''} disabled /></div>
                </div>
                <div className="two">
                  <div className="f"><label htmlFor="e_city">City</label><input id="e_city" value={d.city} onChange={set('city')} /></div>
                  <div className="f"><label htmlFor="e_exp">Experience</label>
                    <select id="e_exp" value={d.experience} onChange={set('experience')}>
                      <option value="">Select</option>{['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'].map((o) => <option key={o}>{o}</option>)}
                    </select></div>
                </div>
                <div className="f"><label htmlFor="e_areas">Areas you work in</label><input id="e_areas" placeholder="e.g. Shamshabad, Tukkuguda, Kokapet" value={d.areas} onChange={set('areas')} /></div>
              </fieldset>
            )}
            {step === 1 && (
              <fieldset style={fs}>
                <div className="f"><label htmlFor="e_type">You are registering as</label>
                  <select id="e_type" value={d.cp_type} onChange={set('cp_type')}>
                    <option value="">Select</option>{['Individual agent', 'Proprietorship', 'Partnership / LLP', 'Private limited company'].map((o) => <option key={o}>{o}</option>)}
                  </select></div>
                <div className="f"><label htmlFor="e_firm">Firm or company name <span className="opt">(if any)</span></label><input id="e_firm" autoComplete="organization" value={d.firm_name} onChange={set('firm_name')} /></div>
                <div className="f"><label htmlFor="e_rera">RERA agent registration no. <span className="opt">(optional)</span></label><input id="e_rera" placeholder="e.g. A02500001234" value={d.rera} onChange={set('rera')} /><p className="hint">Registered agents are approved faster.</p></div>
                <div className="f"><span className="flabel">Segments you sell</span><Picks name="seg" options={SEGMENTS} value={d.segments} onChange={(v) => setD({ ...d, segments: v })} /></div>
                <div className="f"><span className="flabel">Your buyers are mostly</span><Picks name="buy" options={BUYERS} value={d.buyers} onChange={(v) => setD({ ...d, buyers: v })} /></div>
                <div className="two">
                  <div className="f"><label htmlFor="e_team">Team size</label>
                    <select id="e_team" value={d.team_size} onChange={set('team_size')}><option value="">Select</option>{['Just me', '2–5', '6–15', '16–50', '50+'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label htmlFor="e_close">Deals closed a month</label>
                    <select id="e_close" value={d.closings} onChange={set('closings')}><option value="">Select</option>{['0–1', '2–5', '6–10', '10+'].map((o) => <option key={o}>{o}</option>)}</select></div>
                </div>
              </fieldset>
            )}
            {step === 2 && (
              <fieldset style={fs}>
                <div className="two">
                  <div className="f"><label htmlFor="e_pan">PAN</label><input id="e_pan" maxLength={10} placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} value={d.pan} onChange={set('pan')} /><p className="hint">Needed for commission payouts and TDS.</p></div>
                  <div className="f"><label htmlFor="e_gst">GSTIN <span className="opt">(if registered)</span></label><input id="e_gst" maxLength={15} style={{ textTransform: 'uppercase' }} value={d.gstin} onChange={set('gstin')} /></div>
                </div>
                <div className="f"><label htmlFor="e_src">How did you hear about us?</label>
                  <select id="e_src" value={d.source} onChange={set('source')}><option value="">Select</option>
                    {['EK SAATH partner meet', 'Referred by a partner', 'Instagram / Facebook', 'WhatsApp', 'Google', 'Other'].map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="f"><label htmlFor="e_notes">Anything we should know? <span className="opt">(optional)</span></label><textarea id="e_notes" placeholder="Clients you have ready, projects you are interested in" value={d.notes} onChange={set('notes')} /></div>
                <label className="check"><input type="checkbox" checked={d.terms} onChange={(e) => setD({ ...d, terms: e.target.checked })} />
                  <span>I agree to the Milke Khareedo partner terms. I will register every client on this desk before their site visit, and I understand a client is protected for me only after approval.</span></label>
              </fieldset>
            )}
            {err && <p className="err">{err}</p>}
            <div className="actions">
              {step > 0 && <button className="btn ghost" type="button" onClick={() => { setErr(''); setStep(step - 1); }}>Back</button>}
              <button className="btn" type="submit" style={{ flex: 1 }} disabled={busy}>{busy ? 'Submitting…' : step === 2 ? 'Submit enrolment' : 'Continue'}</button>
            </div>
          </form>
        </div>
      </Page>
    </>
  );
}

export function Waiting() {
  const { who, user, refreshWho } = useAuth();
  const susp = who?.status === 'suspended';
  return (
    <>
      <TopBar />
      <main>
        <div className="centerblock">
          <Icon id={susp ? 'i-lock' : 'i-clock'} className="bigicon" />
          <h1>{susp ? 'Account paused' : 'Enrolment under review'}</h1>
          <p className="sub">{susp
            ? `Your Partner Desk access is paused${who.reject_reason ? ': ' + who.reject_reason : ''}. Contact the partner desk to restore it.`
            : `Thanks, ${who?.name || ''}. The Milke Khareedo team is reviewing your details. Your Partner Desk opens here as soon as you're approved, usually within one working day.`}</p>
          <div className="card" style={{ width: '100%' }}>
            <div className="row-between"><span className="sub">Partner desk</span><b className="serif" style={{ fontSize: 22 }}>{DESK}</b></div>
          </div>
          <div className="actions">
            <a className="btn" target="_blank" rel="noopener noreferrer"
              href={`https://wa.me/${DESK_WA}?text=${encodeURIComponent(`Hi, I submitted my partner enrolment on the Anandam Villas Partner Desk (${user?.email || ''}).`)}`}>Message on WhatsApp</a>
            <button className="btn ghost" type="button" onClick={refreshWho}>Check again</button>
          </div>
        </div>
      </main>
    </>
  );
}
