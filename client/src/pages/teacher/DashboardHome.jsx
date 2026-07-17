import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiUsers, FiVideo, FiAlertTriangle, FiArrowRight,
  FiCalendar, FiAward, FiBook, FiEdit3,
} from 'react-icons/fi';
import {
  getTeacherDashboard, getUpcomingClasses, getMyStudents,
  getIncompleteMandatoryCount, getMonthlyGrading, getRecentTeacherScores,
} from '../../services/api';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import LiveClass from './LiveClass';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, icon: Icon, color, bg, loading }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5 transition-all hover:border-gold/30">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={color} size={20} />
      </div>
      <p className={`text-3xl font-display font-bold ${color}`}>{loading ? '—' : value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </motion.div>
  );
}

function SkeletonRow() {
  return <div className="h-12 bg-white/5 rounded-xl animate-pulse" />;
}

export default function TeacherDashboardHome() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentScores, setRecentScores] = useState([]);
  const [grading, setGrading] = useState(null);
  const [mandatoryPending, setMandatoryPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dashRes, upcomingRes, studentsRes, pendingRes] = await Promise.all([
        getTeacherDashboard(),
        getUpcomingClasses(),
        getMyStudents(),
        getIncompleteMandatoryCount(),
      ]);
      if (dashRes.data.success) setDash(dashRes.data.dashboard);
      if (upcomingRes.data.success) setUpcoming(upcomingRes.data.classes?.slice(0, 5) || []);
      if (studentsRes.data.success) setStudents(studentsRes.data.students?.slice(0, 6) || []);
      if (pendingRes.data.success) setMandatoryPending(pendingRes.data.count || 0);
    } catch { toast.error('Failed to load dashboard'); }

    // Recent scores
    try {
      const scoresRes = await getRecentTeacherScores({ limit: 5 });
      if (scoresRes.data.success) setRecentScores(scoresRes.data.scores || []);
    } catch {}

    // Current month grading
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const gradingRes = await getMonthlyGrading(month, year);
      if (gradingRes.data.success) setGrading(gradingRes.data.grading);
    } catch {}

    setLoading(false);
  };

  const stats = [
    { label: 'My Students', value: dash?.totalStudents ?? 0, icon: FiUsers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: "Today's Classes", value: dash?.todayClasses?.length ?? 0, icon: FiVideo, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Pending Corrections', value: dash?.pendingCorrections ?? 0, icon: FiEdit3, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Monthly Score', value: grading ? `${grading.total}/100` : '—', icon: FiAward, color: 'text-gold', bg: 'bg-gold/10' },
  ];

  const formatTime = (t) => {
    if (!t) return '—';
    if (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? t : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

  const gradingParams = grading?.parameters || [];
  const gradingTotal = grading?.total || 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDash = circumference - (gradingTotal / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          Welcome back, {user?.name?.split(' ')[0] || 'Teacher'}! 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Mandatory Training Banner */}
      {mandatoryPending > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="text-yellow-400 flex-shrink-0" size={20} />
            <p className="text-yellow-300 text-sm font-medium">
              ⚠️ You have <strong>{mandatoryPending}</strong> mandatory training {mandatoryPending === 1 ? 'video' : 'videos'} pending.
            </p>
          </div>
          <Link to="/teacher/training" className="flex-shrink-0 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1.5 rounded-lg hover:bg-yellow-500/30 transition-all">
            Watch Now →
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Announcements */}
      <AnnouncementBanner />

      {/* Today's Live Class */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Today's Live Class
          </h3>
          <Link to="/teacher/live-class" className="text-gold text-sm flex items-center gap-1 hover:gap-2 transition-all">
            Manage <FiArrowRight size={14} />
          </Link>
        </div>
        <LiveClass embedded />
      </div>

      {/* Upcoming Classes + Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Classes */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FiCalendar className="text-gold" size={16} /> Upcoming Classes
            </h3>
            <Link to="/teacher/live-class" className="text-gold text-xs hover:underline">View All →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <FiCalendar size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming classes in next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((cls) => (
                <div key={cls._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                  <div>
                    <p className="text-white text-sm font-medium">{cls.subject}</p>
                    <p className="text-white/40 text-xs">{cls.grade} · {formatDate(cls.scheduledDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold text-sm font-semibold">{formatTime(cls.scheduledTime)}</p>
                    <p className="text-white/30 text-xs">{cls.enrolledStudents?.length || 0} students</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Students */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FiUsers className="text-gold" size={16} /> My Students
            </h3>
            <Link to="/teacher/students" className="text-gold text-xs hover:underline">View All →</Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <FiUsers size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No students assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {students.map((s) => {
                const avatar = s.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name || s.displayName)}&backgroundColor=0A1628&textColor=F5A623`;
                return (
                  <div key={s._id} className="flex flex-col items-center gap-1 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <img src={avatar} alt={s.name} className="w-10 h-10 rounded-full border border-gold/20" />
                    <p className="text-white text-xs font-medium text-center line-clamp-1">{s.displayName || s.name}</p>
                    <span className="text-white/30 text-[10px]">{s.grade}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Exam Scores + Monthly Grading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scores */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FiBook className="text-gold" size={16} /> Recent Exam Scores
            </h3>
            <Link to="/teacher/scores" className="text-gold text-xs bg-gold/10 border border-gold/20 px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-all">
              + Enter New Score
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : recentScores.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <FiBook size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No scores entered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Student</th><th>Subject</th><th>Score</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {recentScores.map((sc) => (
                    <tr key={sc._id}>
                      <td className="text-white/80">{sc.student?.displayName || sc.student?.name || '—'}</td>
                      <td className="text-white/60">{sc.subject}</td>
                      <td><span className="badge badge-gold">{sc.marksObtained}/{sc.totalMarks}</span></td>
                      <td className="text-white/40 text-xs">{formatDate(sc.examDate || sc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly Grading */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <FiAward className="text-gold" size={16} /> Monthly Grading
          </h3>
          {!grading ? (
            <div className="text-center py-8 text-white/30">
              <FiAward size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No grading data this month</p>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              {/* Circular progress */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="#F5A623" strokeWidth="8"
                    strokeDasharray={circumference} strokeDashoffset={strokeDash}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <text x="50" y="54" textAnchor="middle" fill="#F5A623" fontSize="16" fontWeight="bold">{gradingTotal}</text>
                  <text x="50" y="66" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">/100</text>
                </svg>
                <p className="text-white/50 text-xs">Total Score</p>
              </div>

              {/* Parameter bars */}
              <div className="flex-1 space-y-2">
                {gradingParams.slice(0, 5).map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">{p.name}</span>
                      <span className="text-gold font-semibold">{p.score}/{p.maxScore}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold/70 rounded-full transition-all"
                        style={{ width: `${(p.score / p.maxScore) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
