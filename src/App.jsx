import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './components/auth/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import CreateAuction from './components/create/CreateAuction';
import JoinRoom from './components/room/JoinRoom';
import Lobby from './components/room/Lobby';
import AuctionRoom from './components/auction/AuctionRoom';
import ResultsPage from './components/results/ResultsPage';
import Best11Page from './components/best11/Best11Page';
import PublicAuctions from './components/public/PublicAuctions';
import Leaderboard from './components/leaderboard/Leaderboard';
import Profile from './components/profile/Profile';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#050505', flexDirection: 'column', gap: 20
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid rgba(123,97,255,0.2)',
          borderTop: '2px solid #7B61FF',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem'
        }}>🏆</div>
      </div>
      <p style={{
        color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem',
        fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
        fontFamily: "'Orbitron', sans-serif"
      }}>Loading Auction Arena...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreateAuction /></ProtectedRoute>} />
      <Route path="/join" element={<ProtectedRoute><JoinRoom /></ProtectedRoute>} />
      <Route path="/public" element={<PublicAuctions />} />
      <Route path="/lobby/:roomId" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
      <Route path="/auction/:roomId" element={<AuctionRoom />} />
      <Route path="/results/:roomId" element={<ResultsPage />} />
      <Route path="/best11/:roomId"  element={<Best11Page />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
