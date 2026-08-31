import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationProvider } from './hooks/useNotifications';
import BottomNav from './components/BottomNav';
import Splash from './pages/Splash';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import AccountSetup from './pages/AccountSetup';
import Home from './pages/Home';
import TournamentDetail from './pages/TournamentDetail';
import HallOfFame from './pages/HallOfFame';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import AddFunds from './pages/AddFunds';
import Withdraw from './pages/Withdraw';
import TransactionHistory from './pages/TransactionHistory';
import Terms from './pages/Terms';
import HowItWorks from './pages/HowItWorks';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import CreateTournament from './admin/CreateTournament';
import MatchResults from './admin/MatchResults';
import AdminHallOfFame from './admin/AdminHallOfFame';
import Withdrawals from './admin/Withdrawals';
import UserManagement from './admin/UserManagement';
import AdminReports from './admin/AdminReports';
import Reviews from './components/Reviews';

function UserShell({ children }) {
  return (
    <div className="mobile-app-shell">
      {children}
    </div>
  );
}

function NavLayout({ children }) {
  return (
    <div style={{ paddingTop: '56px', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      {children}
      <BottomNav />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { currentUser, userProfile, loading, profileError } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #F0E6D8',
            borderTop: '3px solid #FF6B4A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  // Profile fetch failed due to network error — retry instead of redirecting to account-setup
  if (profileError && !userProfile) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#2E2A26', marginBottom: '8px' }}>Connection issue</p>
          <p style={{ fontSize: '13px', color: '#8A8078', marginBottom: '20px' }}>Could not load your profile. Check your internet.</p>
          <button onClick={() => window.location.reload()} style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none',
            background: '#FF6B4A', color: '#FFFFFF', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer',
          }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!userProfile) return <Navigate to="/account-setup" replace />;

  return children;
}

function AccountSetupRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #F0E6D8',
            borderTop: '3px solid #FF6B4A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #F0E6D8',
            borderTop: '3px solid #FF6B4A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <p style={{ marginTop: '16px', fontSize: '13px', color: '#8A8078', fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser && userProfile) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <Routes>
        {/* Splash */}
        <Route path="/splash" element={<UserShell><Splash /></UserShell>} />

        {/* Auth routes (no bottom nav) */}
        <Route path="/login" element={<PublicRoute><UserShell><Login /></UserShell></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><UserShell><SignUp /></UserShell></PublicRoute>} />
        <Route path="/account-setup" element={
          <AccountSetupRoute>
            <UserShell><AccountSetup /></UserShell>
          </AccountSetupRoute>
        } />

        {/* Main app routes (with bottom nav, protected) */}
        <Route path="/" element={<ProtectedRoute><UserShell><NavLayout><Home /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/tournament/:id" element={<ProtectedRoute><UserShell><NavLayout><TournamentDetail /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/hall-of-fame" element={<ProtectedRoute><UserShell><NavLayout><HallOfFame /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><UserShell><NavLayout><Rewards /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserShell><NavLayout><Profile /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/add-funds" element={<ProtectedRoute><UserShell><NavLayout><AddFunds /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/withdraw" element={<ProtectedRoute><UserShell><NavLayout><Withdraw /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><UserShell><NavLayout><TransactionHistory /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/terms" element={<ProtectedRoute><UserShell><NavLayout><Terms /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/how-it-works" element={<ProtectedRoute><UserShell><NavLayout><HowItWorks /></NavLayout></UserShell></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute><UserShell><NavLayout><Reviews /></NavLayout></UserShell></ProtectedRoute>} />

        {/* Admin routes (no mobile shell constraint - full desktop responsive) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/tournaments" element={<CreateTournament />} />
        <Route path="/admin/match-results" element={<MatchResults />} />
        <Route path="/admin/hall-of-fame" element={<AdminHallOfFame />} />
        <Route path="/admin/withdrawals" element={<Withdrawals />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/reports" element={<AdminReports />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}
