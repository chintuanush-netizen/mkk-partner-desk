import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Icon, Logo } from './Icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useData } from '../lib/data.jsx';
import { SettingsSheet } from '../pages/admin/Settings.jsx';

export function TopBar({ subtitle = 'Partner Desk', showSettings, onSettings, showLogout = true }) {
  const { signOut } = useAuth();
  const nav = useNavigate();
  return (
    <header className="top">
      <div className="in">
        <Logo />
        <div className="brand"><b>Anandam Villas</b><span>{subtitle}</span></div>
        <span className="sp" />
        {showSettings && (
          <button className="iconbtn" type="button" aria-label="Settings" onClick={onSettings}><Icon id="i-settings" /></button>
        )}
        {showLogout && (
          <button className="iconbtn" type="button" aria-label="Log out" onClick={async () => { await signOut(); nav('/login'); }}>
            <Icon id="i-logout" />
          </button>
        )}
      </div>
    </header>
  );
}

function Tab({ to, icon, label, badge, end }) {
  return (
    <NavLink to={to} end={end} className="tab">
      <Icon id={icon} />
      {badge ? <span className="badge">{badge}</span> : null}
      <span>{label}</span>
    </NavLink>
  );
}
function Fab({ to, label }) {
  return (
    <NavLink to={to} className="tab fab">
      <span className="disc"><Icon id="i-plus" /></span>
      <span>{label}</span>
    </NavLink>
  );
}

/** Logged-in layout: brand bar, page, bottom tab bar. */
export function Shell() {
  const { isAdmin } = useAuth();
  const { leads, partners } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pending = leads.filter((l) => l.approval === 'pending').length + partners.filter((p) => p.status === 'pending').length;
  return (
    <>
      <TopBar subtitle={isAdmin ? 'Admin Desk' : 'Partner Desk'} showSettings={isAdmin} onSettings={() => setSettingsOpen(true)} />
      <Outlet />
      <nav className="tabs" aria-label="Main">
        <div className="in">
          {isAdmin ? (
            <>
              <Tab to="/" end icon="i-home" label="Home" />
              <Tab to="/approvals" icon="i-inbox" label="Approvals" badge={pending || null} />
              <Fab to="/register" label="Add lead" />
              <Tab to="/leads" icon="i-list" label="Leads" />
              <Tab to="/partners" icon="i-users" label="Partners" />
            </>
          ) : (
            <>
              <Tab to="/" end icon="i-home" label="Home" />
              <Tab to="/leads" icon="i-list" label="Leads" />
              <Fab to="/register" label="Register" />
              <Tab to="/board" icon="i-building" label="Board" />
              <Tab to="/stats" icon="i-chart" label="Stats" />
            </>
          )}
        </div>
      </nav>
      {isAdmin && <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}

export function Page({ children, className = 'view' }) {
  return <main><div className={className}>{children}</div></main>;
}

export function Spinner() {
  return <div className="spinner" aria-label="Loading" />;
}
