import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy-load screens so the initial bundle is small
const LoginScreen = lazy(() => import('./screens/LoginScreen'));
const RegisterScreen = lazy(() => import('./screens/RegisterScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const LobbyScreen = lazy(() => import('./screens/LobbyScreen'));
const GameScreen = lazy(() => import('./screens/GameScreen'));
const WalletScreen = lazy(() => import('./screens/WalletScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));

function LoadingFallback() {
  return <div className="loading-center"><div className="spinner" /></div>;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (user) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<GuestRoute><LoginScreen /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterScreen /></GuestRoute>} />
            <Route path="/" element={<HomeScreen />} />
            <Route path="/lobby" element={<ProtectedRoute><LobbyScreen /></ProtectedRoute>} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/wallet" element={<ProtectedRoute><WalletScreen /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
