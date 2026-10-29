import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationAcknowledgement from './components/NotificationAcknowledgement';

// ─── Public pages ──────────────────────────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing'));
import StudentLogin from './pages/auth/StudentLogin';
import TeacherLogin from './pages/auth/TeacherLogin';
import AdminLogin from './pages/auth/AdminLogin';
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
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
          <p className="text-white/60 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (sessionError) return <div className="min-h-screen bg-[#0A1628] text-white flex flex-col gap-4 items-center justify-center p-6"><p role="alert">{sessionError}</p><button className="btn-primary" onClick={fetchMe}>Retry connection</button></div>;

  if (!user) {
    const loginPath = allowedRole ? `/login/${allowedRole}` : '/login/student';
    return <Navigate to={loginPath} replace />;
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

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-[#0F1F35] border border-gold/30 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">📱</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Add to Home Screen</p>
          <p className="text-white/50 text-xs">Quick access to Vettri Academy</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => { setShow(false); localStorage.setItem('pwa-dismissed', 'true'); }}
            className="text-white/30 hover:text-white/60 text-xs px-2 py-1"
          >
            Later
          </button>
          <button
            onClick={() => { deferredPrompt?.prompt(); setShow(false); }}
            className="bg-gold text-navy font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-yellow-400 transition-all"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App Routes ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/student" element={<StudentLogin />} />
      <Route path="/login/teacher" element={<TeacherLogin />} />
      <Route path="/login/admin" element={<AdminLogin />} />
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
            <Suspense fallback={<div className="min-h-screen bg-[#0A1628] text-white flex items-center justify-center" role="status">Loading portal…</div>}><AppRoutes /></Suspense>
            <PWABanner />
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#0A1628',
                color: '#fff',
                border: '1px solid rgba(245,166,35,0.3)',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
              },
              success: { iconTheme: { primary: '#F5A623', secondary: '#0A1628' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0A1628' } },
            }}
          />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
