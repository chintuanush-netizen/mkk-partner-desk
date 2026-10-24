import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { DataProvider } from './lib/data.jsx';
import { IconSprite } from './components/Icons.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { Shell, Spinner, TopBar } from './components/Shell.jsx';
import { Forgot, Login, Recovery, Signup } from './pages/auth/AuthPages.jsx';
import { Enrolment, Waiting } from './pages/auth/Enrolment.jsx';
import { PartnerHome, PartnerStats } from './pages/partner/PartnerPages.jsx';
import { AdminHome, Approvals, Partners } from './pages/admin/AdminPages.jsx';
import { Leads } from './pages/shared/Leads.jsx';
import { Register } from './pages/shared/Register.jsx';
import { Board } from './board/Board.jsx';

/** Decides what a signed-in person sees: enrolment, waiting room, partner desk or admin desk. */
function Gate() {
  const { session, who, error, refreshWho, isAdmin } = useAuth();
  const loc = useLocation();
  if (session === undefined || (session && !who && !error)) return <Spinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (error) {
    return (
      <>
        <TopBar />
        <main><div className="centerblock"><h1>Can't reach the desk</h1><p className="sub">Check your internet connection and try again.</p>
          <button className="btn" type="button" onClick={refreshWho}>Try again</button></div></main>
      </>
    );
  }
  if (who.role === 'new' || (who.role === 'partner' && who.status === 'rejected')) return <Enrolment />;
  if (who.role === 'partner' && who.status !== 'approved') return <Waiting />;

  return (
    <DataProvider>
      <Routes>
        <Route element={<Shell />}>
          {isAdmin ? (
            <>
              <Route index element={<AdminHome />} />
              <Route path="approvals" element={<Approvals />} />
              <Route path="partners" element={<Partners />} />
            </>
          ) : (
            <>
              <Route index element={<PartnerHome />} />
              <Route path="stats" element={<PartnerStats />} />
            </>
          )}
          <Route path="leads" element={<Leads />} />
          <Route path="register" element={<Register />} />
          <Route path="board" element={<Board embedded />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

function PublicOnly({ children }) {
  const { session, recovering } = useAuth();
  if (recovering) return <Navigate to="/reset" replace />;
  if (session === undefined) return <Spinner />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { recovering } = useAuth();
  return (
    <ToastProvider>
      <IconSprite />
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
        <Route path="/forgot" element={<PublicOnly><Forgot /></PublicOnly>} />
        <Route path="/reset" element={recovering ? <Recovery /> : <Navigate to="/" replace />} />
        {/* Public inventory board: no login needed, shareable with partners and clients. */}
        <Route path="/inventory" element={<Board />} />
        <Route path="/*" element={<Gate />} />
      </Routes>
    </ToastProvider>
  );
}
