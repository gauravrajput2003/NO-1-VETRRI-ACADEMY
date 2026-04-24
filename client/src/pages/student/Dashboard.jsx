import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import NotificationBell from '../../components/NotificationBell';
import VettriAIButton from '../../components/VettriAIButton';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import {
  FiHome, FiCalendar, FiBook, FiBarChart2, FiMessageCircle,
  FiClock, FiDollarSign, FiUser, FiList,
} from 'react-icons/fi';

// Sub-pages
import DashboardHome from './DashboardHome';
import MyClasses from './MyClasses';
import StudyMaterials from './StudyMaterials';
import ExamProgress from './ExamProgress';
import Attendance from './Attendance';
import Chat from './Chat';
import Leave from './Leave';
import Fees from './Fees';
import Profile from './Profile';
import VettriAIPage from '../common/VettriAIPage';

const LINKS = [
  { href: '/student/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/student/classes', label: 'My Classes', icon: FiCalendar },
  { href: '/student/materials', label: 'Study Materials', icon: FiBook },
  { href: '/student/progress', label: 'Exam Progress', icon: FiBarChart2 },
  { href: '/student/attendance', label: 'Attendance', icon: FiList },
  { href: '/student/chat', label: 'Chat', icon: FiMessageCircle },
  { href: '/student/leave', label: 'Leave', icon: FiClock },
  { href: '/student/fees', label: 'Fees', icon: FiDollarSign },
  { href: '/student/profile', label: 'Profile', icon: FiUser },
];

// Mobile bottom nav for student
const MOBILE_NAV = [
  { href: '/student/dashboard', label: 'Home', icon: '🏠' },
  { href: '/student/classes', label: 'Classes', icon: '📅' },
  { href: '/student/chat', label: 'Chat', icon: '💬' },
  { href: '/student/materials', label: 'Materials', icon: '📚' },
  { href: '/student/profile', label: 'Profile', icon: '👤' },
];

function MobileNav() {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1628]/95 backdrop-blur-xl border-t border-white/10 safe-area-pb">
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifCount((c) => c + 1);
      toast(`🔔 ${notif.title}`, { icon: '📣' });
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  const sidebarLinks = LINKS.map((l) =>
    l.href === '/student/progress' && notifCount > 0
      ? { ...l, badge: notifCount }
      : l
  );

  return (
    <div className="min-h-screen bg-[#0A1628] flex">
      <Sidebar links={sidebarLinks} role="student" />

      <main className="flex-1 overflow-auto min-h-screen pt-[72px] md:pt-0 pb-16 md:pb-0">
        {/* Top header */}
        <div className="fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-40 bg-[#0A1628]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between no-print">
          <div className="ml-10 md:ml-0">
            <h2 className="text-white font-display font-semibold text-lg">Student Portal</h2>
            <p className="text-white/40 text-xs">{user?.grade} {user?.board ? `· ${user.board}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <VettriAIButton />
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>
          </div>
        </div>

        {/* Print header */}
        <div className="print-header px-6 pt-4">
          <h1>No.1 Vettri Academy</h1>
          <p>Tamil Nadu | +91 9047758389</p>
          <div className="print-meta">
            <span>Student: {user?.displayName || user?.name}</span>
            <span>Generated: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="classes" element={<MyClasses />} />
            <Route path="materials" element={<StudyMaterials />} />
            <Route path="progress" element={<ExamProgress onScoresSeen={() => setNotifCount(0)} />} />
            <Route path="scores" element={<ExamProgress onScoresSeen={() => setNotifCount(0)} />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="chat" element={<Chat />} />
            <Route path="ai" element={<VettriAIPage />} />
            <Route path="leave" element={<Leave />} />
            <Route path="fees" element={<Fees />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
