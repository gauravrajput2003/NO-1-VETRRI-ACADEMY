import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Button, InstallCard, Skeleton } from './design-system/components';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationAcknowledgement from './components/NotificationAcknowledgement';

// ─── Public pages ──────────────────────────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing'));
import Login from './pages/auth/Login';
import StudentSignup from './pages/auth/StudentSignup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ForcedPasswordChange from './pages/auth/ForcedPasswordChange';

const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

// ─── 404 page ─────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center text-center px-4">
      <p className="text-8xl font-display font-bold text-gold/30 mb-4">404</p>
      <h1 className="text-white font-bold text-2xl mb-2">Page Not Found</h1>
      <p className="text-white/40 mb-8">The page you're looking for doesn't exist.</p>
      <a href="/" className="bg-gold text-navy font-semibold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-all">
        Go Home
      </a>
    </div>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading, sessionError, fetchMe } = useAuth();

  if (loading) {
    return (
      <div className="va-theme va-session-loading">
        <div className="flex flex-col items-center gap-4">
          <Skeleton label="Loading your academy" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (sessionError) return <div className="va-theme va-session-loading"><p role="alert">{sessionError}</p><Button onClick={fetchMe}>Retry connection</Button></div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  if (allowedRole && user.role !== allowedRole) {
    const roleHome = { student: '/student/dashboard', teacher: '/teacher/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

// ─── PWA Install Banner ───────────────────────────────────────────────────────
function PWABanner() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(window.__pwaPrompt);
  const [show, setShow] = useState(Boolean(window.__showPWA));

  useEffect(() => {
    const ready = () => { setDeferredPrompt(window.__pwaPrompt); setShow(Boolean(window.__showPWA)); };
    window.addEventListener('pwa-ready', ready);
    return () => window.removeEventListener('pwa-ready', ready);
  }, []);

  if (!show || !deferredPrompt || !user) return null;

  return <div className="va-theme va-floating-install"><InstallCard onDismiss={() => { setShow(false); localStorage.setItem('pwa-dismissed', 'true'); }} onInstall={() => { deferredPrompt?.prompt(); setShow(false); }} /></div>;
}

// ─── App Routes ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/student" element={<Navigate to="/login" replace />} />
      <Route path="/login/teacher" element={<Navigate to="/login" replace />} />
      <Route path="/login/admin" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<StudentSignup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ForcedPasswordChange />} />

      {/* ── Student ── */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── Teacher ── */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── Admin ── */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ── 404 ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <NotificationAcknowledgement />
          <ErrorBoundary>
            <Suspense fallback={<div className="va-theme va-session-loading"><Skeleton label="Loading portal" /></div>}><AppRoutes /></Suspense>
            <PWABanner />
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--va-white)',
                color: 'var(--va-text)',
                border: '1px solid var(--va-border)',
                borderRadius: 'var(--va-radius-control)',
                fontFamily: 'var(--va-font-body)',
              },
              success: { iconTheme: { primary: 'var(--va-teal-700)', secondary: 'var(--va-white)' } },
              error: { iconTheme: { primary: 'var(--va-pink-600)', secondary: 'var(--va-white)' } },
            }}
          />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
