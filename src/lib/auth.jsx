import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

/**
 * Session + role for the signed-in person.
 * who.role: 'anon' | 'new' (no enrolment yet) | 'partner' (with status) | 'admin'
 */
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [who, setWho] = useState(null);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState(null);

  const loadWho = useCallback(async (s) => {
    setError(null);
    if (!s) { setWho({ role: 'anon' }); return; }
    const r = await supabase.rpc('mk_whoami');
    if (r.error) { setError(r.error); setWho(null); return; }
    setWho(r.data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); loadWho(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setSession(s);
        loadWho(s);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadWho]);

  const value = {
    session, who, error, recovering,
    user: session?.user || null,
    isAdmin: who?.role === 'admin',
    refreshWho: () => loadWho(session),
    finishRecovery: () => setRecovering(false),
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
