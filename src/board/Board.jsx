import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { DESK, crore, dshort, rupees, titleCase, todayIST } from '../lib/format.js';
import { Sheet } from '../components/Sheet.jsx';

const CloseButton = ({ onClick }) => <button className="x" type="button" aria-label="Close" onClick={onClick}>×</button>;
import { LABEL, PLAN_H, PLAN_W, PT, asset, costLines } from './plan.js';
import { brand } from '../lib/brand.js';
import '../styles/board.css';

const PROJECT = 'KGR Fortune Anandam Villas';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtUpdated(ts) {
  if (!ts) return 'Loading live availability…';
  const d = new Date(new Date(ts).getTime() + 330 * 60000).toISOString();
  const p = d.slice(0, 10).split('-');
  return `Updated ${Number(p[2])} ${MON[Number(p[1]) - 1]} ${p[0]} · ${d.slice(11, 16)} IST`;
}
const sizeBucket = (p) => (p < 267 ? 's' : p === 267 ? 'm' : 'l');
const FILTERS = {
  status: [['all', 'All'], ['available', 'Available'], ['hold', 'On hold'], ['booked', 'Booked']],
  facing: [['all', 'All'], ['EAST', 'East'], ['WEST', 'West'], ['SOUTH', 'South']],
  size: [['all', 'All'], ['s', 'Under 267'], ['m', '267'], ['l', 'Above 267']],
};

/** Live Phase 1 inventory. Admins can edit statuses, hold dates and pricing. */
export function Board({ embedded = false }) {
  const { isAdmin } = useAuth();
  const [villas, setVillas] = useState([]);
  const [settings, setSettings] = useState({ rate: 0, charges: [], note: '' });
  const [updated, setUpdated] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [f, setF] = useState({ status: 'all', facing: 'all', size: 'all', q: '' });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [draftSettings, setDraftSettings] = useState(null);
  const [sheet, setSheet] = useState(null); // {mode, no}
  const [zoom, setZoom] = useState(false);
  const [focusNo, setFocusNo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const editingRef = useRef(false);
  editingRef.current = editing;

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      supabase.from('kgr_villas').select('no,plot,facing,sft,status,hold_until,updated_at').order('no'),
      supabase.from('kgr_settings').select('rate,charges,note,updated_at').eq('id', 1).maybeSingle(),
    ]);
    if (r1.error) { setLoadErr('Could not load availability. Check your connection and refresh.'); return; }
    setLoadErr('');
    setVillas(r1.data || []);
    if (r2.data) setSettings({ rate: Number(r2.data.rate) || 0, charges: r2.data.charges || [], note: r2.data.note || '' });
    const ts = [...(r1.data || []).map((v) => v.updated_at), r2.data?.updated_at].filter(Boolean).sort();
    setUpdated(ts[ts.length - 1] || '');
  }, []);

  useEffect(() => {
    load();
    let t;
    const ch = supabase.channel('kgr-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kgr_villas' }, () => { if (!editingRef.current) { clearTimeout(t); t = setTimeout(load, 400); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kgr_settings' }, () => { if (!editingRef.current) { clearTimeout(t); t = setTimeout(load, 400); } })
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [load]);

  const cur = (v) => draft[v.no] || v;
  const statusOf = (v) => cur(v).status;
  const holdOf = (v) => (cur(v).status === 'hold' ? cur(v).hold_until || '' : '');
  const lapsed = (v) => { const h = holdOf(v); return !!h && h < todayIST(); };
  const st = draftSettings || settings;

  const counts = useMemo(() => {
    const c = { available: 0, hold: 0, booked: 0 };
    villas.forEach((v) => { c[statusOf(v)] += 1; });
    return c;
  }, [villas, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = villas.filter((v) => {
    const s = statusOf(v);
    if (f.status !== 'all' && s !== f.status) return false;
    if (f.facing !== 'all' && v.facing !== f.facing) return false;
    if (f.size !== 'all' && sizeBucket(v.plot) !== f.size) return false;
    if (f.q && !String(v.no).startsWith(f.q)) return false;
    return true;
  });

  function statusLine(v) {
    const s = statusOf(v); const h = holdOf(v);
    if (s === 'hold' && h) return lapsed(v) ? <>Hold lapsed <em>{dshort(h)}</em></> : <>On hold <em>till {dshort(h)}</em></>;
    return LABEL[s];
  }
  const open = (v) => setSheet({ mode: editing ? 'edit' : 'view', no: v.no });
  const changes = Object.keys(draft).length + (draftSettings ? 1 : 0);

  async function save() {
    setSaving(true); setMsg('');
    let errs = 0;
    for (const d of Object.values(draft)) {
      const r = await supabase.from('kgr_villas').update({ status: d.status, hold_until: d.hold_until || null }).eq('no', d.no).select('no');
      if (r.error || !r.data?.length) errs += 1;
    }
    if (draftSettings) {
      const r = await supabase.from('kgr_settings').update({ rate: draftSettings.rate, charges: draftSettings.charges, note: draftSettings.note }).eq('id', 1).select('id');
      if (r.error || !r.data?.length) errs += 1;
    }
    setSaving(false);
    if (errs) { setMsg('Some changes were not saved. Your login may have expired: log out, log in again and retry.'); return; }
    setDraft({}); setDraftSettings(null); setEditing(false);
    load();
  }

  function showOnPlan(no) {
    setSheet(null);
    document.getElementById('bp-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFocusNo(no);
    setTimeout(() => {
      const fr = document.getElementById('bp-frame');
      const m = fr?.querySelector(`[data-no="${no}"]`);
      if (fr && m) fr.scrollTo({ left: m.offsetLeft - fr.clientWidth / 2, top: m.offsetTop - fr.clientHeight / 2, behavior: 'smooth' });
    }, 400);
    setTimeout(() => setFocusNo(null), 6000);
  }

  const villa = sheet ? villas.find((v) => v.no === sheet.no) : null;
  return (
    <div className="bp" style={embedded ? { paddingBottom: 90 } : undefined}>
      <header className="hero pad">
        <div className="plan" aria-hidden="true" />
        <img className="kgr" src={brand('kgr-fortune-logo.png')} alt="KGR Fortune Infra Builders LLP" />
        <div className="inner">
          <div className="eyebrow"><span className="phase-pill">Phase 1 · Launch</span><i />Channel Partner Inventory · Live</div>
          <h1 style={{ margin: 0 }}><img className="logo" src={brand('anandam-logo.png')} alt="KGR Fortune Anandam Villas" /></h1>
          <p className="tagline">Find your inner peace and absolute serenity</p>
          <p className="lede">Every villa open for sale, in one place. Tap any villa to see where it sits on the plan, share it with a client or build a cost sheet.</p>
          <div className="presented"><span>Sales mandate <b>Milke Khareedo</b></span><span>Technology <b>Leadnest</b></span></div>
          <span className="updated">{fmtUpdated(updated)}</span>
        </div>
      </header>

      <main className="pad">
        <div className="inner">
          <section className="tally" aria-label="Inventory summary">
            <div className="t a"><span className="n">{counts.available}</span><span className="l">Available</span></div>
            <div className="t h"><span className="n">{counts.hold}</span><span className="l">On hold</span></div>
            <div className="t s"><span className="n">{counts.booked}</span><span className="l">Booked</span></div>
            <div className="t"><span className="n">{villas.length}</span><span className="l">Phase 1 villas</span></div>
          </section>

          <section className="board" id="board">
            {editing && (
              <div className="editbar">
                <p>{msg || (changes ? <><em>{changes} change{changes > 1 ? 's' : ''} waiting.</em> Save to update the board for every partner.</> : <><em>Owner mode.</em> Tap a villa to set its status and hold date.</>)}</p>
                <div className="actions">
                  <button className="btn ghost sm" type="button" onClick={() => setSheet({ mode: 'pricing' })}>Pricing</button>
                  <button className="btn ghost sm" type="button" onClick={() => { setDraft({}); setDraftSettings(null); setEditing(false); setMsg(''); }}>Discard</button>
                  <button className="btn sm" type="button" disabled={!changes || saving} onClick={save}>{saving ? 'Saving…' : 'Save for everyone'}</button>
                </div>
              </div>
            )}
            <div className="controls" aria-label="Filters">
              {Object.entries(FILTERS).map(([key, opts]) => (
                <div className="group" key={key}><span className="gl">{key === 'size' ? 'Plot' : titleCase(key)}</span>
                  <div className="seg" role="group" aria-label={key}>
                    {opts.map(([val, label]) => (
                      <button key={val} className="chip" type="button" aria-pressed={f[key] === val} onClick={() => setF({ ...f, [key]: val })}>{label}</button>
                    ))}
                  </div></div>
              ))}
              <div className="group search"><span className="gl">Villa no.</span>
                <input id="q" type="search" inputMode="numeric" placeholder="Search, e.g. 208" aria-label="Search villa number"
                  value={f.q} onChange={(e) => setF({ ...f, q: e.target.value.replace(/\D/g, '') })} /></div>
              {isAdmin && !editing && (
                <div className="group"><span className="owner-tag">Owners only</span>
                  <button className="btn ghost" type="button" onClick={() => setEditing(true)}>Edit availability</button></div>
              )}
            </div>
            {loadErr && <p className="note" style={{ color: 'var(--hold)' }}>{loadErr}</p>}
            <div className="grid" aria-live="polite">
              {shown.map((v, i) => {
                const s = statusOf(v);
                return (
                  <button key={v.no} type="button" onClick={() => open(v)} style={{ animationDelay: `${Math.min(i * 28, 600)}ms` }}
                    className={`tile enter st-${s}${lapsed(v) ? ' lapsed' : ''}${draft[v.no] ? ' changed' : ''}`}
                    aria-label={`Villa ${v.no}, ${LABEL[s]}. ${editing ? 'Tap to edit.' : 'Tap for details.'}`}>
                    <div className="top"><span className="vno"><small>VILLA</small>{v.no}</span><span className="face">{v.facing}</span></div>
                    <div className="spec">
                      <div><b>{v.plot}</b><span>sq yd plot</span></div>
                      <div><b>{v.sft.toLocaleString('en-IN')}</b><span>sft built-up</span></div>
                    </div>
                    <span className="status">{statusLine(v)}</span>
                  </button>
                );
              })}
            </div>
            {villas.length > 0 && shown.length === 0 && <p className="empty">No villas match these filters.</p>}
          </section>

          <section className="phases" aria-label="Project phases">
            <div className="phase"><span className="tag">Phase 1 · Launch</span><h3>Now selling</h3><p>The villas on this board are the Phase 1 inventory, open for bookings today.</p></div>
            <div className="phase soon"><span className="tag">Phase 2</span><h3>Opening soon</h3><p>Phase 2 villas will be released shortly. Tell the partner desk which clients are waiting and you'll hear first when it opens.</p></div>
          </section>

          <section className="residence" aria-label="Villa elevations">
            <div className="section-head"><h2><small>The residence</small>Elevations</h2>
              <PackButton villas={villas} statusOf={statusOf} holdOf={holdOf} /></div>
            <div className="elev">
              <figure><img src={asset('elevation-a.jpg')} alt="KGR Fortune Anandam villa elevation with vertical wooden fins, stone-clad panel, glass balconies and rooftop palms" /><figcaption>Elevation A</figcaption></figure>
              <figure><img src={asset('elevation-b.jpg')} alt="KGR Fortune Anandam villa elevation with cantilevered white frame, wooden screen, double-height balconies and gated porch" /><figcaption>Elevation B</figcaption></figure>
            </div>
            <p className="res-copy">Contemporary villas with timber-fin facades, stone feature walls, glass balconies and landscaped terraces. Elevations are artist's impressions. The partner pack bundles both elevations, the master layout and today's availability.</p>
          </section>

          <section className={`layout${zoom ? ' zoom' : ''}`} id="bp-layout">
            <div className="section-head"><h2><small>The community</small>Master layout</h2>
              <button className="btn ghost" type="button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? 'Fit to width' : 'Zoom in'}</button></div>
            <div className="planlegend" aria-hidden="true"><span style={{ '--c': '#2f8f5b' }}>Available</span><span style={{ '--c': '#d08a1c' }}>On hold</span><span style={{ '--c': '#6f645a' }}>Booked</span></div>
            <div className="frame" id="bp-frame">
              <div className="planwrap">
                <img src={asset('layout.jpg')} alt="KGR Fortune Anandam Villas master layout plan with numbered villa plots, clubhouse, parks and internal roads" />
                {villas.filter((v) => PT[v.no]).map((v) => (
                  <button key={v.no} type="button" data-no={v.no} title={`Villa ${v.no}`} onClick={() => open(v)}
                    className={`mk ${statusOf(v)}${focusNo === v.no ? ' focus' : ''}`}
                    style={{ left: `${(PT[v.no][0] / PLAN_W) * 100}%`, top: `${(PT[v.no][1] / PLAN_H) * 100}%` }}
                    aria-label={`Villa ${v.no}, ${LABEL[statusOf(v)]}`} />
                ))}
              </div>
            </div>
            <p className="note">Coloured markers show every Phase 1 villa on the plan; tap one to open it. The layout is the developer's conceptual plan for all 276 villas.</p>
          </section>

          <section className="contact">
            <div><h3>Block a villa for your client</h3><p>Register your client on the Partner Desk, then call or WhatsApp the Milke Khareedo partner desk with the villa number. A hold is confirmed only once it shows on this board.</p></div>
            <div className="desk"><span className="gl">Partner desk</span><span className="phone">{DESK}</span>
              {!embedded && <Link className="btn ghost" to="/">Open Partner Desk</Link>}</div>
          </section>
        </div>
      </main>
      <footer className="pad"><div className="inner"><img src={brand('kgr-fortune-logo-dark.png')} alt="KGR Fortune Infra Builders LLP" /><span>Plot in sq yd · built-up in sft</span><span>Sales mandate: Milke Khareedo · Powered by Leadnest</span></div></footer>

      <Sheet open={!!sheet} onClose={() => setSheet(null)}>
        {sheet?.mode === 'pricing' && (
          <PricingForm settings={st} onClose={() => setSheet(null)} onApply={(s) => { setDraftSettings(s); setSheet(null); }} />
        )}
        {villa && sheet?.mode === 'view' && (
          <VillaView v={villa} st={st} statusLine={statusLine(villa)} status={statusOf(villa)} lapsed={lapsed(villa)} onClose={() => setSheet(null)}
            onCost={() => setSheet({ mode: 'cost', no: villa.no })} onPlan={() => showOnPlan(villa.no)} />
        )}
        {villa && sheet?.mode === 'cost' && (
          <CostView v={villa} st={st} onBack={() => setSheet({ mode: 'view', no: villa.no })} onClose={() => setSheet(null)} />
        )}
        {villa && sheet?.mode === 'edit' && (
          <VillaEditor v={villa} current={cur(villa)} onClose={() => setSheet(null)}
            onApply={(next) => {
              const same = next.status === villa.status && (next.hold_until || '') === (villa.hold_until || '');
              const d = { ...draft };
              if (same) delete d[villa.no]; else d[villa.no] = { ...villa, ...next };
              setDraft(d); setSheet(null);
            }} />
        )}
      </Sheet>
    </div>
  );
}

function PackButton({ villas, statusOf, holdOf }) {
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn ghost" type="button" disabled={busy || !villas.length}
      onClick={async () => { setBusy(true); try { const { partnerPackPdf } = await import('./pdf.js'); await partnerPackPdf(villas, statusOf, holdOf); } finally { setBusy(false); } }}>
      {busy ? 'Preparing…' : 'Download partner pack (PDF)'}
    </button>
  );
}

function SheetHead({ v, status, statusLine, lapsed, onClose }) {
  const col = lapsed ? 'lapsed' : status === 'available' ? 'avail' : status === 'hold' ? 'hold' : 'sold';
  return (
    <>
      <div className="sh-top"><div><span className="vno"><small>VILLA · {v.facing} FACING</small>{v.no}</span></div><CloseButton onClick={onClose} /></div>
      <span className="status" style={{ color: `var(--${col})` }}>{statusLine}</span>
    </>
  );
}

function MiniPlan({ no }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const [pin, setPin] = useState(null);
  useEffect(() => {
    const el = ref.current; const p = PT[no];
    if (!el || !p) return undefined;
    const raf = requestAnimationFrame(() => {
    const w = el.clientWidth; const h = el.clientHeight; const IW = w * 3.2; const IH = (IW * PLAN_H) / PLAN_W;
    const fx = p[0] / PLAN_W; const fy = p[1] / PLAN_H;
    const bx = Math.min(0, Math.max(w - IW, w / 2 - fx * IW)); const by = Math.min(0, Math.max(h - IH, h / 2 - fy * IH));
    setStyle({ backgroundSize: `${IW}px ${IH}px`, backgroundPosition: `${bx}px ${by}px` });
    setPin({ left: fx * IW + bx, top: fy * IH + by });
    });
    return () => cancelAnimationFrame(raf);
  }, [no]);
  if (!PT[no]) return null;
  return (
    <div className="mini" ref={ref} style={style} role="img" aria-label={`Villa ${no} marked on the master layout`}>
      {pin && <span className="pin" style={pin} />}
      <span className="tag">Location on master plan</span>
    </div>
  );
}

function clientMsg(v, st, withPrice) {
  const lines = [`*${PROJECT}*`, `Villa ${v.no} · ${titleCase(v.facing)} facing`, `Plot: ${v.plot} sq yd`, `Built-up area: ${v.sft.toLocaleString('en-IN')} sft`];
  if (withPrice && st.rate > 0) lines.push(`Indicative price: ${crore(costLines(v, st).total)}`);
  lines.push('', 'Contemporary villas with a clubhouse, landscaped parks and sports courts. Shall I arrange a site visit?');
  return lines.join('\n');
}

function VillaView({ v, st, status, statusLine, lapsed, onClose, onCost, onPlan }) {
  const [withPrice, setWithPrice] = useState(false);
  const [copied, setCopied] = useState('Copy message');
  const hasPrice = (st.rate || 0) > 0;
  const text = clientMsg(v, st, withPrice);
  return (
    <>
      <SheetHead v={v} status={status} statusLine={statusLine} lapsed={lapsed} onClose={onClose} />
      <MiniPlan no={v.no} />
      <div className="facts">
        <div><b>{v.plot}</b><span>sq yd plot</span></div>
        <div><b>{v.sft.toLocaleString('en-IN')}</b><span>sft built-up</span></div>
        <div><b>{hasPrice ? crore(costLines(v, st).total) : '—'}</b><span>{hasPrice ? 'indicative price' : 'price on request'}</span></div>
      </div>
      <label className="check"><input type="checkbox" disabled={!hasPrice} checked={withPrice} onChange={(e) => setWithPrice(e.target.checked)} /> Include indicative price in the client message</label>
      <div className="actions">
        <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>Share with client</a>
        <button className="btn ghost" type="button" onClick={onCost}>Cost sheet</button>
        <button className="btn ghost" type="button" onClick={onPlan}>Show on full plan</button>
      </div>
      <p className="msg">Opens WhatsApp with a ready message.{' '}
        <button className="btn ghost sm" type="button" onClick={() => {
          navigator.clipboard?.writeText(text).then(() => { setCopied('Copied'); setTimeout(() => setCopied('Copy message'), 1600); }, () => setCopied('Copy unavailable'));
        }}>{copied}</button></p>
    </>
  );
}

function CostView({ v, st, onBack, onClose }) {
  if (!(st.rate > 0)) {
    return (
      <>
        <div className="sh-top"><div><span className="vno"><small>VILLA</small>{v.no}</span></div><CloseButton onClick={onClose} /></div>
        <p className="msg">Pricing is not published on the board yet. Call the partner desk at {DESK} for this villa's cost sheet.</p>
        <div className="actions"><button className="btn ghost" type="button" onClick={onBack}>Back</button></div>
      </>
    );
  }
  const c = costLines(v, st);
  const txt = [`*${PROJECT} · Cost sheet*`, `Villa ${v.no} · ${titleCase(v.facing)} facing · ${v.plot} sq yd · ${v.sft.toLocaleString('en-IN')} sft`, '',
    ...c.lines.map((l) => `${l.label}: ${rupees(l.amt)}`), `*Total: ${rupees(c.total)}*`, '', `Indicative as of ${dshort(todayIST())}. Final cost confirmed at booking.`].join('\n');
  return (
    <>
      <div className="sh-top"><div><span className="vno"><small>VILLA · {v.facing} FACING</small>{v.no}</span></div><CloseButton onClick={onClose} /></div>
      <div><span className="gl">Cost sheet · {v.plot} sq yd · {v.sft.toLocaleString('en-IN')} sft</span></div>
      <table className="cost"><tbody>
        {c.lines.map((l) => <tr key={l.label}><td>{l.label}{l.sub && <small>{l.sub}</small>}</td><td>{rupees(l.amt)}</td></tr>)}
        <tr className="total"><td>Total</td><td>{rupees(c.total)}</td></tr>
      </tbody></table>
      {st.note && <p className="msg" style={{ whiteSpace: 'pre-line' }}>{st.note}</p>}
      <p className="fine">Indicative cost as of {dshort(todayIST())}. Final cost sheet, taxes and payment schedule are confirmed by the sales desk at booking.</p>
      <div className="actions">
        <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(txt)}`}>Send on WhatsApp</a>
        <button className="btn ghost" type="button" onClick={async () => { const { costSheetPdf } = await import('./pdf.js'); costSheetPdf(v, st); }}>Download PDF</button>
        <button className="btn ghost" type="button" onClick={onBack}>Back</button>
      </div>
    </>
  );
}

function VillaEditor({ v, current, onApply, onClose }) {
  const [pick, setPick] = useState(current.status);
  const [hold, setHold] = useState(current.hold_until || '');
  return (
    <>
      <div className="sh-top"><div><span className="vno"><small>VILLA · {v.facing} FACING</small>{v.no}</span></div><CloseButton onClick={onClose} /></div>
      <div className="group"><span className="gl">Status</span>
        <div className="seg" role="group" aria-label="Status">
          {['available', 'hold', 'booked'].map((k) => <button key={k} className="chip" type="button" aria-pressed={pick === k} onClick={() => setPick(k)}>{LABEL[k]}</button>)}
        </div></div>
      {pick === 'hold' && (
        <div className="field"><label htmlFor="holdUntil">Hold until</label>
          <input type="date" id="holdUntil" min={todayIST()} value={hold} onChange={(e) => setHold(e.target.value)} /></div>
      )}
      <p className="fine">Partners see "On hold till" this date on the card. After the date passes, the card shows "Hold lapsed" until you release or book it.</p>
      <div className="actions">
        <button className="btn" type="button" onClick={() => onApply({ status: pick, hold_until: pick === 'hold' ? hold || null : null })}>Apply</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

function PricingForm({ settings, onApply, onClose }) {
  const [rate, setRate] = useState(settings.rate || '');
  const [note, setNote] = useState(settings.note || '');
  const [charges, setCharges] = useState((settings.charges || []).map((c) => ({ ...c })));
  const upd = (i, k, val) => setCharges(charges.map((c, j) => (j === i ? { ...c, [k]: val } : c)));
  return (
    <>
      <div className="sh-top"><h2><small>Owners only</small>Pricing</h2><CloseButton onClick={onClose} /></div>
      <div className="field"><label htmlFor="rate">Partner price per sft (built-up)</label><input id="rate" type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
      <div className="chg">
        {charges.map((c, i) => (
          <div className="row" key={i}>
            <div className="field"><label htmlFor={`cl${i}`}>Charge</label><input id={`cl${i}`} value={c.label} placeholder="e.g. Clubhouse membership" onChange={(e) => upd(i, 'label', e.target.value)} /></div>
            <div className="field"><label htmlFor={`ck${i}`}>Type</label>
              <select id={`ck${i}`} value={c.kind} onChange={(e) => upd(i, 'kind', e.target.value)}>
                <option value="fixed">Fixed ₹</option><option value="persft">₹ per sft</option><option value="pct">% of base</option></select></div>
            <div className="field"><label htmlFor={`ca${i}`}>Amount</label><input id={`ca${i}`} type="number" min="0" step="any" value={c.amount} onChange={(e) => upd(i, 'amount', e.target.value)} /></div>
            <button className="x" type="button" aria-label="Remove charge" onClick={() => setCharges(charges.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
      </div>
      <div><button className="btn ghost sm" type="button" onClick={() => setCharges([...charges, { label: '', kind: 'fixed', amount: '' }])}>Add charge</button></div>
      <div className="field"><label htmlFor="pnote">Payment plan or notes on the cost sheet</label>
        <textarea id="pnote" placeholder="e.g. 20% at booking, balance on construction milestones" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <p className="fine">Set the price per sft to 0 to hide prices from partners. Changes go live when you press Save for everyone.</p>
      <div className="actions">
        <button className="btn" type="button" onClick={() => onApply({
          rate: Number(rate) || 0, note,
          charges: charges.filter((c) => c.label && Number(c.amount) > 0).map((c) => ({ label: c.label, kind: c.kind, amount: Number(c.amount) })),
        })}>Apply</button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}

