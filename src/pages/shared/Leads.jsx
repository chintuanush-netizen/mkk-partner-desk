import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { useData } from '../../lib/data.jsx';
import { FILTERS, exportCsv, matches } from '../../lib/leads.js';
import { leadCode } from '../../lib/format.js';
import { Page } from '../../components/Shell.jsx';
import { Icon } from '../../components/Icons.jsx';
import { LeadCard } from './LeadParts.jsx';
import { LeadSheet } from './LeadSheet.jsx';

export function Leads() {
  const { isAdmin } = useAuth();
  const { leads, partners } = useData();
  const [params, setParams] = useSearchParams();
  const filter = params.get('f') || 'all';
  const pfilter = params.get('p') || 'all';
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const setParam = (k, v) => { const n = new URLSearchParams(params); if (v === 'all') n.delete(k); else n.set(k, v); setParams(n, { replace: true }); };

  const rows = useMemo(() => {
    const qq = q.toLowerCase().replace(/\s/g, '');
    return leads.filter((l) => {
      if (!matches(l, filter)) return false;
      if (isAdmin && pfilter !== 'all') {
        if (pfilter === 'direct') { if (l.partner_id) return false; } else if (l.partner_id !== pfilter) return false;
      }
      if (!qq) return true;
      const hay = (l.client_name + l.client_cc + l.client_phone + leadCode(l.id) + (l.partner ? l.partner.full_name + (l.partner.firm_name || '') : ''))
        .toLowerCase().replace(/\s/g, '');
      return hay.includes(qq);
    });
  }, [leads, filter, pfilter, q, isAdmin]);

  return (
    <Page>
      <div className="row-between">
        <h1>{isAdmin ? 'All leads' : 'Leads'}</h1>
        <button className="btn ghost sm" type="button" onClick={() => exportCsv(rows, isAdmin)}><Icon id="i-download" />Export</button>
      </div>
      <div className="search"><Icon id="i-search" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads"
          placeholder={`Search name, phone${isAdmin ? ', partner' : ''} or code`} />
      </div>
      {isAdmin && (
        <select className="inp" style={{ maxWidth: 280 }} value={pfilter} onChange={(e) => setParam('p', e.target.value)} aria-label="Filter by partner">
          <option value="all">All partners</option>
          <option value="direct">Direct · Milke Khareedo</option>
          {partners.filter((p) => p.status === 'approved').map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
        </select>
      )}
      <div className="chips">
        {FILTERS.map(([k, label]) => (
          <button key={k} className="chip" type="button" aria-pressed={filter === k} onClick={() => setParam('f', k)}>
            {label}<span className="c">({leads.filter((l) => matches(l, k)).length})</span>
          </button>
        ))}
      </div>
      <div className="list">
        {rows.length ? rows.map((l) => <LeadCard key={l.id} lead={l} onOpen={(x) => setOpen(x.id)} />) : <p className="empty">No leads found.</p>}
      </div>
      <LeadSheet leadId={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
