import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ErrorBoundary from './components/ErrorBoundary';

// ─── Public pages ──────────────────────────────────────────────────────────────
import Landing from './pages/Landing';
import StudentLogin from './pages/auth/StudentLogin';
import TeacherLogin from './pages/auth/TeacherLogin';
import AdminLogin from './pages/auth/AdminLogin';
import StudentSignup from './pages/auth/StudentSignup';

// ─── Student Dashboard shell ───────────────────────────────────────────────────
import StudentDashboard from './pages/student/Dashboard';
import StudentDashboardHome from './pages/student/DashboardHome';
import StudentClasses from './pages/student/MyClasses';
import StudentMaterials from './pages/student/StudyMaterials';
import StudentProgress from './pages/student/ExamProgress';
import StudentAttendance from './pages/student/Attendance';
import StudentChat from './pages/student/Chat';
import StudentLeave from './pages/student/Leave';
import StudentFees from './pages/student/Fees';
import StudentProfile from './pages/student/Profile';

// ─── Teacher Dashboard shell ───────────────────────────────────────────────────
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherDashboardHome from './pages/teacher/DashboardHome';
import TeacherLiveClass from './pages/teacher/LiveClass';
import TeacherTraining from './pages/teacher/TrainingVideos';
import TeacherStudents from './pages/teacher/MyStudents';
import TeacherMaterials from './pages/teacher/StudyMaterials';
import TeacherScores from './pages/teacher/ExamScores';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherChat from './pages/teacher/Chat';
import TeacherLeave from './pages/teacher/Leave';
import TeacherGrading from './pages/teacher/MonthlyGrading';
import TeacherProfile from './pages/teacher/Profile';

// ─── Admin Dashboard shell ─────────────────────────────────────────────────────
import AdminDashboard from './pages/admin/Dashboard';
import AdminDashboardHome from './pages/admin/DashboardHome';
import AdminStudents from './pages/admin/Students';
import AdminTeachers from './pages/admin/Teachers';
import AdminClassScheduler from './pages/admin/ClassScheduler';
import AdminLiveMonitor from './pages/admin/LiveMonitor';
import AdminTrainingVideos from './pages/admin/TrainingVideos';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminDemoBookings from './pages/admin/DemoBookings';
import AdminChatLogs from './pages/admin/ChatLogs';
import AdminTeacherPermissions from './pages/admin/TeacherPermissions';
import AdminLoginLogs from './pages/admin/LoginLogs';
import AdminFees from './pages/admin/Fees';
import AdminLeave from './pages/admin/LeaveApprovals';
import AdminBestTeacher from './pages/admin/BestTeacher';
import AdminEnquiries from './pages/admin/Enquiries';

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
  const { user, loading } = useAuth();

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

  if (!user) {
    const loginPath = allowedRole ? `/login/${allowedRole}` : '/login/student';
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    const roleHome = { student: '/student/dashboard', teacher: '/teacher/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

// ─── PWA Install Banner ───────────────────────────────────────────────────────
function PWABanner() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = window.__pwaPrompt
    ? [window.__pwaPrompt, () => {}]
    : [null, () => {}];
  const [show, setShow] = window.__showPWA !== undefined
    ? [window.__showPWA, (v) => { window.__showPWA = v; }]
    : [false, () => {}];

  if (!show || !deferredPrompt || user?.role !== 'student') return null;

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
      <Route path="/login/student" element={<StudentLogin />} />
      <Route path="/login/teacher" element={<TeacherLogin />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/signup" element={<StudentSignup />} />

      {/* ── Student ── */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardHome />} />
        <Route path="classes" element={<StudentClasses />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="scores" element={<StudentProgress />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="leave" element={<StudentLeave />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* ── Teacher ── */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboardHome />} />
        <Route path="live-class" element={<TeacherLiveClass />} />
        <Route path="training" element={<TeacherTraining />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="materials" element={<TeacherMaterials />} />
        <Route path="scores" element={<TeacherScores />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="chat" element={<TeacherChat />} />
        <Route path="leave" element={<TeacherLeave />} />
        <Route path="grading" element={<TeacherGrading />} />
        <Route path="report" element={<TeacherGrading />} />
        <Route path="profile" element={<TeacherProfile />} />
      </Route>

      {/* ── Admin ── */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardHome />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="classes" element={<AdminClassScheduler />} />
        <Route path="live-monitor" element={<AdminLiveMonitor />} />
        <Route path="training" element={<AdminTrainingVideos />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="demo-bookings" element={<AdminDemoBookings />} />
        <Route path="chat-logs" element={<AdminChatLogs />} />
        <Route path="permissions" element={<AdminTeacherPermissions />} />
        <Route path="login-logs" element={<AdminLoginLogs />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="leave" element={<AdminLeave />} />
        <Route path="best-teacher" element={<AdminBestTeacher />} />
        <Route path="enquiries" element={<AdminEnquiries />} />
        {/* Legacy routes */}
        <Route path="admissions" element={<AdminEnquiries />} />
        <Route path="leaves" element={<AdminLeave />} />
        <Route path="courses" element={<AdminStudents />} />
      </Route>

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
          <ErrorBoundary>
            <AppRoutes />
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
