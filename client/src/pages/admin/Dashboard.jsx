import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import NotificationBell from '../../components/NotificationBell';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  FiHome, FiUsers, FiUserCheck, FiMonitor, FiDollarSign,
  FiFileText, FiMail, FiClock, FiAward, FiVideo,
  FiBook, FiUser, FiSettings, FiShield, FiGrid,
} from 'react-icons/fi';

// All Admin pages
import AdminDashboardHome from './DashboardHome';
import Students from './Students';
import Teachers from './Teachers';
import ClassScheduler from './ClassScheduler';
import LiveMonitor from './LiveMonitor';
import TrainingVideos from './TrainingVideos';
import Announcements from './Announcements';
import DemoBookings from './DemoBookings';
import ChatLogs from './ChatLogs';
import TeacherPermissions from './TeacherPermissions';
import LoginLogs from './LoginLogs';
import Fees from './Fees';
import LeaveApprovals from './LeaveApprovals';
import TeacherGrading from './TeacherGrading';
import Enquiries from './Enquiries';
import Admissions from './Admissions';
import Courses from './Courses';

const LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/admin/students', label: 'Students', icon: FiUsers },
  { href: '/admin/teachers', label: 'Teachers', icon: FiUserCheck },
  { href: '/admin/classes', label: 'Class Scheduler', icon: FiVideo },
  { href: '/admin/live-monitor', label: 'Live Monitor', icon: FiMonitor },
  { href: '/admin/training', label: 'Training Videos', icon: FiBook },
  { href: '/admin/announcements', label: 'Announcements', icon: FiMail },
  { href: '/admin/demo-bookings', label: 'Demo Bookings', icon: FiCalendar },
  { href: '/admin/fees', label: 'Fees', icon: FiDollarSign },
  { href: '/admin/leave', label: 'Leave Approvals', icon: FiClock },
  { href: '/admin/chat-logs', label: 'Chat Logs', icon: FiShield },
  { href: '/admin/permissions', label: 'Permissions', icon: FiSettings },
  { href: '/admin/login-logs', label: 'Login Logs', icon: FiGrid },
  { href: '/admin/grading', label: 'Teacher Grading', icon: FiAward },
];

// Mobile bottom nav for admin
const MOBILE_NAV = [
  { href: '/admin/dashboard', label: 'Home', icon: '🏠' },
  { href: '/admin/students', label: 'Users', icon: '👥' },
  { href: '/admin/live-monitor', label: 'Monitor', icon: '📺' },
  { href: '/admin/classes', label: 'Schedule', icon: '📋' },
  { href: '/admin/fees', label: 'More', icon: '⚙️' },
];

function MobileNav() {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1628]/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-around py-2">
        {MOBILE_NAV.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link key={item.href} to={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-gold' : 'text-white/40'}`}>
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] font-medium">{item.label}</span>
              {isActive && <span className="w-1 h-1 bg-gold rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function FiCalendar({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Admin joins monitor room for real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.emit('admin:join-monitor');
  }, [socket]);

  return (
    <div className="min-h-screen bg-[#0A1628] flex">
      <Sidebar links={LINKS} role="admin" />

      <main className="flex-1 overflow-auto min-h-screen pt-[72px] md:pt-0 pb-16 md:pb-0">
        {/* Top bar */}
        <div className="fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-40 bg-[#0A1628]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between no-print">
          <div className="ml-10 md:ml-0">
            <h2 className="text-white font-display font-semibold text-lg">Admin Panel</h2>
            <p className="text-gold text-xs">🛡️ Super Admin · No.1 Vettri Academy</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* Print header */}
        <div className="print-header px-6 pt-4">
          <h1>No.1 Vettri Academy — Admin Report</h1>
          <p>Tamil Nadu | +91 9047758389</p>
          <div className="print-meta">
            <span>Generated by: {user?.name}</span>
            <span>Date: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardHome />} />
            <Route path="students" element={<Students />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="classes" element={<ClassScheduler />} />
            <Route path="live-monitor" element={<LiveMonitor />} />
            <Route path="training" element={<TrainingVideos />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="demo-bookings" element={<DemoBookings />} />
            <Route path="chat-logs" element={<ChatLogs />} />
            <Route path="permissions" element={<TeacherPermissions />} />
            <Route path="login-logs" element={<LoginLogs />} />
            <Route path="fees" element={<Fees />} />
            <Route path="leave" element={<LeaveApprovals />} />
            <Route path="grading" element={<TeacherGrading />} />
            <Route path="enquiries" element={<Enquiries />} />
            {/* Legacy aliases */}
            <Route path="admissions" element={<Admissions />} />
            <Route path="leaves" element={<LeaveApprovals />} />
            <Route path="courses" element={<Courses />} />
          </Routes>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
