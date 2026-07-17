import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import NotificationBell from '../../components/NotificationBell';
import VettriAIButton from '../../components/VettriAIButton';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome, FiUsers, FiVideo, FiBook, FiBarChart2,
  FiClock, FiMessageCircle, FiFileText, FiAward, FiUser, FiPlay,
} from 'react-icons/fi';

// Sub pages
import DashboardHome from './DashboardHome';
import MyStudents from './MyStudents';
import LiveClass from './LiveClass';
import TrainingVideos from './TrainingVideos';
import StudyMaterials from './StudyMaterials';
import ExamScores from './ExamScores';
import Attendance from './Attendance';
import Leave from './Leave';
import Chat from './Chat';
import MonthlyGrading from './MonthlyGrading';
import Profile from './Profile';
import VettriAIPage from '../common/VettriAIPage';

const LINKS = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/teacher/live-class', label: 'Live Class', icon: FiVideo },
  { href: '/teacher/training', label: 'Training', icon: FiPlay },
  { href: '/teacher/students', label: 'My Students', icon: FiUsers },
  { href: '/teacher/materials', label: 'Study Materials', icon: FiBook },
  { href: '/teacher/scores', label: 'Exam Scores', icon: FiBarChart2 },
  { href: '/teacher/attendance', label: 'Attendance', icon: FiClock },
  { href: '/teacher/chat', label: 'Chat', icon: FiMessageCircle },
  { href: '/teacher/leave', label: 'Leave', icon: FiFileText },
  { href: '/teacher/grading', label: 'Monthly Grading', icon: FiAward },
  { href: '/teacher/profile', label: 'Profile', icon: FiUser },
];

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A1628] flex">
      <Sidebar links={LINKS} role="teacher" />

      <main className="flex-1 overflow-auto min-h-screen pt-[72px] md:pt-0">
        {/* Top bar */}
        <div className="fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-40 bg-[#0A1628]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between no-print">
          <div className="ml-10 md:ml-0">
            <h2 className="text-white font-display font-semibold text-lg">Teacher Portal</h2>
            <p className="text-white/40 text-xs">{user?.qualification || user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <VettriAIButton />
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'T'}
            </div>
          </div>
        </div>

        {/* Print header (hidden on screen) */}
        <div className="print-header px-6 pt-4">
          <h1>No.1 Vettri Academy</h1>
          <p>Tamil Nadu | +91 9047758389</p>
          <div className="print-meta">
            <span>Teacher: {user?.name}</span>
            <span>Generated: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-6">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="live-class" element={<LiveClass />} />
            <Route path="training" element={<TrainingVideos />} />
            <Route path="students" element={<MyStudents />} />
            <Route path="materials" element={<StudyMaterials />} />
            <Route path="scores" element={<ExamScores />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="chat" element={<Chat />} />
            <Route path="ai" element={<VettriAIPage />} />
            <Route path="leave" element={<Leave />} />
            <Route path="grading" element={<MonthlyGrading />} />
            <Route path="report" element={<MonthlyGrading />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
