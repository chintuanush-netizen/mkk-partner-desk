import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useData } from '../../lib/data.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Sheet, CloseButton } from '../../components/Sheet.jsx';
import { errMsg } from '../../lib/format.js';

export function SettingsSheet({ open, onClose }) {
  const { settings, setSettings } = useData();
  const toast = useToast();
  const [pd, setPd] = useState(settings.protection_days);
  const [ed, setEd] = useState(settings.extension_days);
  const [err, setErr] = useState('');
  useEffect(() => { if (open) { setPd(settings.protection_days); setEd(settings.extension_days); setErr(''); } }, [open, settings]);
  async function save() {
    const r = await supabase.rpc('mk_admin_settings', { p_protection: Number(pd), p_extension: Number(ed) });
    if (r.error) return setErr(errMsg(r.error));
    setSettings({ protection_days: Number(pd), extension_days: Number(ed) });
    toast('Settings saved');
    onClose();
  }
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sh-head"><div><p className="eyebrow">Admin</p><h2>Settings</h2></div><CloseButton onClick={onClose} /></div>
      <div className="two">
        <div className="f"><label htmlFor="spd">Protection period (days)</label><input className="inp" id="spd" type="number" min="1" max="365" value={pd} onChange={(e) => setPd(e.target.value)} /></div>
        <div className="f"><label htmlFor="sed">Extension length (days)</label><input className="inp" id="sed" type="number" min="1" max="365" value={ed} onChange={(e) => setEd(e.target.value)} /></div>
      </div>
      <p className="hint">A new protection period applies to leads approved from now on.</p>
      {err && <p className="err">{err}</p>}
      <div className="actions">
        <button className="btn" type="button" onClick={save}>Save settings</button>
        <Link className="btn ghost" to="/board" onClick={onClose}>Edit inventory and pricing</Link>
      </div>
    </Sheet>
  );
}
