import NotificationsInbox from '../common/NotificationsInbox';
import AnnouncementsInbox from '../common/AnnouncementsInbox';
import Exams from '../academic/Exams';
import AcademicReports from '../academic/Reports';
import { Routes, Route, Navigate } from 'react-router-dom';
import PortalNotFound from '../../components/PortalNotFound';
import PortalShell from '../../design-system/PortalShell';
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
import TeacherClassScheduler from './ClassScheduler';
import AdminDeskChat from '../common/AdminDeskChat';
import Support from '../common/Support';
import Downloads from '../common/Downloads';
import PdfAnalytics from './PdfAnalytics';
import Salary from './Salary';
import Doubts from '../common/Doubts';

const LINKS = [
  { href: '/teacher/exams', label: 'Exam Management', icon: FiFileText },
  { href: '/teacher/teacher-performance', label: 'My Performance', icon: FiAward },

  { href: '/teacher/dashboard', label: 'Dashboard', icon: FiHome },
  { href: '/teacher/live-class', label: 'Live Class', icon: FiVideo },
  { href: '/teacher/schedule', label: 'Class Scheduler', icon: FiClock },
  { href: '/teacher/training', label: 'Training', icon: FiPlay },
  { href: '/teacher/students', label: 'My Students', icon: FiUsers },
  { href: '/teacher/materials', label: 'Study Materials', icon: FiBook },
  { href: '/teacher/pdf-analytics', label: 'PDF Analytics', icon: FiBarChart2 },
  { href: '/teacher/salary', label: 'My Salary', icon: FiAward },
  { href: '/teacher/downloads', label: 'Download Center', icon: FiBook },
  { href: '/teacher/scores', label: 'Exam Scores', icon: FiBarChart2 },
  { href: '/teacher/attendance', label: 'Attendance', icon: FiClock },
  { href: '/teacher/chat', label: 'Chat', icon: FiMessageCircle },
  { href: '/teacher/support', label: 'Help Center', icon: FiMessageCircle },
  { href: '/teacher/doubts', label: 'Discussions', icon: FiMessageCircle },
  { href: '/teacher/leave', label: 'Leave', icon: FiFileText },
  { href: '/teacher/grading', label: 'Monthly Grading', icon: FiAward },
  { href: '/teacher/profile', label: 'Profile', icon: FiUser },
  { href: '/teacher/notifications', label: 'Notifications', icon: FiBook },
  { href: '/teacher/announcements', label: 'Announcements', icon: FiBook },
];

export default function TeacherDashboard() {
  const { user } = useAuth();

  return <PortalShell role="teacher" links={LINKS} >
    <div className="print-header px-6 pt-4">
          <h1>No.1 Vettri Academy</h1>
          <p>Tamil Nadu | +91 9047758389</p>
          <div className="print-meta">
            <span>Teacher: {user?.name}</span>
            <span>Generated: {new Date().toLocaleString('en-IN')}</span>
          </div>
        </div>
    <Routes>
            <Route path="exams" element={<Exams />} />
            <Route path="teacher-performance" element={<AcademicReports />} />

            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="live-class" element={<LiveClass />} />
            <Route path="live-monitor" element={<LiveClass />} />
            <Route path="schedule" element={<TeacherClassScheduler />} />
            <Route path="training" element={<TrainingVideos />} />
            <Route path="students" element={<MyStudents />} />
            <Route path="materials" element={<StudyMaterials />} />
            <Route path="pdf-analytics" element={<PdfAnalytics />} />
            <Route path="salary" element={<Salary />} />
            <Route path="downloads" element={<Downloads />} />
            <Route path="scores" element={<ExamScores />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="chat" element={<AdminDeskChat />} />
            <Route path="support" element={<Support />} />
            <Route path="doubts" element={<Doubts />} />
            <Route path="ai" element={<VettriAIPage />} />
            <Route path="leave" element={<Leave />} />
            <Route path="grading" element={<MonthlyGrading />} />
            <Route path="report" element={<MonthlyGrading />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<NotificationsInbox />} />
<Route path="announcements" element={<AnnouncementsInbox />} />
<Route path="settings" element={<Navigate to="/teacher/profile" replace />} />
<Route path="*" element={<PortalNotFound />} />
          </Routes>
  </PortalShell>;
}
