import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { useAuth } from './auth.jsx';

/** Leads, partners, settings and villas for the signed-in desk, refreshed live. */
const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

export function DataProvider({ children }) {
  const { who, isAdmin } = useAuth();
  const [leads, setLeads] = useState([]);
  const [partners, setPartners] = useState([]);
  const [dupes, setDupes] = useState([]);
  const [settings, setSettings] = useState({ protection_days: 60, extension_days: 30 });
  const [villas, setVillas] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const active = isAdmin || (who?.role === 'partner' && who?.status === 'approved');

  const refresh = useCallback(async () => {
    if (!active) return;
    const sel = isAdmin ? '*, partner:mk_partners(user_id,full_name,firm_name,member_no,mobile)' : '*';
    const [l, s, v] = await Promise.all([
      supabase.from('mk_leads').select(sel).order('registered_at', { ascending: false }),
      supabase.from('mk_settings').select('protection_days,extension_days').eq('id', 1).maybeSingle(),
      supabase.from('kgr_villas').select('no,plot,facing,sft,status').order('no'),
    ]);
    if (!l.error) setLeads(l.data || []);
    if (s.data) setSettings(s.data);
    if (v.data) setVillas(v.data);
    if (isAdmin) {
      const [p, d] = await Promise.all([
        supabase.from('mk_partners').select('*').order('submitted_at', { ascending: false }),
        supabase.from('mk_dupe_attempts').select('*').order('at', { ascending: false }).limit(50),
      ]);
      if (p.data) setPartners(p.data);
      if (d.data) setDupes(d.data);
    }
    setLoaded(true);
  }, [active, isAdmin]);

  useEffect(() => { refresh(); }, [refresh]);

  // Live: refresh shortly after any lead changes.
  const timer = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const ch = supabase
      .channel('desk-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mk_leads' }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(refresh, 600);
      })
      .subscribe();
    return () => { clearTimeout(timer.current); supabase.removeChannel(ch); };
  }, [active, refresh]);

  return (
    <DataCtx.Provider value={{ leads, partners, dupes, settings, setSettings, villas, loaded, refresh }}>
      {children}
    </DataCtx.Provider>
  );
}
