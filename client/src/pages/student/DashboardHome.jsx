import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCalendar, FiTrendingUp, FiVideoOff, FiArrowRight } from 'react-icons/fi';
import {
  getTodayClasses, getUpcomingClasses,
} from '../../services/api';
import api from '../../services/api';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import CountdownTimer from '../../components/CountdownTimer';
import VideoPlayer from '../../components/VideoPlayer';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

function StatCard({ label, value, icon: Icon, color, bg, loading }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5 hover:border-gold/30 transition-all">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={color} size={20} />
      </div>
      <p className={`text-3xl font-display font-bold ${color}`}>{loading ? '—' : value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </motion.div>
  );
}

function MedalIcon({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-white/40 font-bold text-lg">#{rank}</span>;
}

export default function StudentDashboardHome() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [todayClass, setTodayClass] = useState(null);
  const [classStatus, setClassStatus] = useState('upcoming');
  const [meetLink, setMeetLink] = useState('');
  const [joinedClass, setJoinedClass] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [recentScores, setRecentScores] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joiningClass, setJoiningClass] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [showRecording, setShowRecording] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [todayRes, upcomingRes, statsRes] = await Promise.all([
        getTodayClasses(),
        getUpcomingClasses(),
        api.get('/student/dashboard'),
      ]);
      if (todayRes.data.success && todayRes.data.classes?.length) {
        const cls = todayRes.data.classes[0];
        setTodayClass(cls);
        setClassStatus(cls.status || 'upcoming');
        if (cls.recordingUrl) setRecordingUrl(cls.recordingUrl);
      }
      if (upcomingRes.data.success) setUpcoming(upcomingRes.data.classes?.slice(0, 3) || []);
      if (statsRes.data.success) {
        const dashboard = statsRes.data.dashboard || {};
        const normalizedLeaderboard = (dashboard.leaderboard || []).map((row) => ({
          student: row._id,
          totalPoints: row.totalScore,
        }));
        setLeaderboard(normalizedLeaderboard.slice(0, 3));
        setMyRank(normalizedLeaderboard.find((entry) => entry.student?._id === user?._id) || null);
        setRecentScores((dashboard.recentScores || []).slice(0, 3));
        setDashStats(dashboard);
      }
    } catch {}

    setLoading(false);
  };

  // Socket events for class
  useEffect(() => {
    if (!socket) return;

    const onClassStarted = ({ classId }) => {
      if (todayClass?._id === classId) {
        setClassStatus('live');
      }
    };
    const onClassEnded = ({ classId }) => {
      if (todayClass?._id === classId) setClassStatus('completed');
    };
    const onRecording = ({ classId, recordingUrl: url }) => {
      if (todayClass?._id === classId) { setRecordingUrl(url); setClassStatus('completed'); }
    };

    socket.on('class:started', onClassStarted);
    socket.on('class:ended', onClassEnded);
    socket.on('recording:available', onRecording);

    return () => {
      socket.off('class:started', onClassStarted);
      socket.off('class:ended', onClassEnded);
      socket.off('recording:available', onRecording);
    };
  }, [socket, todayClass?._id]);

  const handleJoinClass = async () => {
    if (!todayClass || joiningClass) return;
    setJoiningClass(true);
    try {
      const { data } = await api.post(`/classes/${todayClass._id}/join`);
      if (data.success) {
        const link = data.meetLink || data.class?.meetLink;
        if (link) {
          window.open(link, '_blank');
          if (navigator.vibrate) navigator.vibrate(50);
        }
        setJoinedClass(true);
        toast.success('Joined class! Opening meeting...');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to join class');
    }
    setJoiningClass(false);
  };

  const stats = [
    {
      label: 'Attendance %',
      value: dashStats?.attendancePercent ? `${dashStats.attendancePercent}%` : '—',
      icon: FiCalendar,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Classes This Month',
      value: dashStats?.classesThisMonth ?? '—',
      icon: FiVideoOff,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Avg Score',
      value: dashStats?.avgScore ? `${dashStats.avgScore}%` : '—',
      icon: FiTrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Current Streak 🔥',
      value: dashStats?.currentStreak ? `${dashStats.currentStreak} days` : '—',
      icon: ({ className, size }) => <span className={className} style={{ fontSize: size }}>🔥</span>,
      color: 'text-gold',
      bg: 'bg-gold/10',
    },
  ];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
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

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white">
          Welcome back, {user?.displayName || user?.name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Announcements */}
      <AnnouncementBanner />

      {/* TODAY'S LIVE CLASS — Most Important */}
      {todayClass && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-[#0F1F35] rounded-2xl border-2 p-6 transition-all duration-500 ${
            classStatus === 'live'
              ? 'border-green-500 shadow-lg shadow-green-500/20'
              : classStatus === 'completed'
              ? 'border-white/10'
              : 'border-[#1E3A5F]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Today's Live Class</h3>
            {classStatus === 'live' && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> LIVE NOW
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-xl mb-1">{todayClass.subject}</p>
              <p className="text-white/60 text-sm">{todayClass.title}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-white/40">
                <span>Teacher: {todayClass.teacherId?.displayName || todayClass.teacherId?.name || todayClass.teacher?.displayName || todayClass.teacher?.name || '—'}</span>
                <span>Grade: {todayClass.grade}</span>
                <span>Time: {formatTime(todayClass.scheduledTime)}</span>
              </div>
            </div>

            <div className="flex-shrink-0">
              {classStatus === 'upcoming' && (
                <div className="text-center">
                  <p className="text-white/40 text-xs mb-2">Class starts in</p>
                  <CountdownTimer targetDate={todayClass.scheduledTime || todayClass.scheduledDate} />
                </div>
              )}

              {classStatus === 'live' && (
                <motion.button
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={handleJoinClass}
                  disabled={joiningClass || joinedClass}
                  className={`w-full sm:w-48 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                    joinedClass
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/30'
                  } disabled:opacity-80`}
                >
                  {joiningClass ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : joinedClass ? (
                    <>Joined ✅</>
                  ) : (
                    <>🟢 JOIN NOW</>
                  )}
                </motion.button>
              )}

              {classStatus === 'completed' && (
                <div className="text-center space-y-2">
                  <span className="inline-block text-white/40 text-sm">Class Ended</span>
                  {recordingUrl ? (
                    <button
                      onClick={() => setShowRecording(true)}
                      className="block w-full bg-gold/10 text-gold border border-gold/30 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gold/20 transition-all"
                    >
                      ▶ Watch Recording
                    </button>
                  ) : (
                    <p className="text-white/30 text-xs">Recording will be available soon</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recording Modal */}
      {showRecording && recordingUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowRecording(false)}>
          <div className="w-full max-w-3xl bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-white font-semibold">Class Recording</span>
              <button onClick={() => setShowRecording(false)} className="text-white/40 hover:text-white p-1"><FiVideoOff size={18} /></button>
            </div>
            <VideoPlayer src={recordingUrl} className="max-h-[60vh]" />
          </div>
        </div>
      )}

      {/* Leaderboard + Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Leaderboard */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <h3 className="text-white font-semibold mb-4">🏆 Weekly Leaderboard</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">No leaderboard data yet</div>
          ) : (
            <div className="space-y-3">
              {leaderboard.slice(0, 3).map((entry, idx) => (
                <motion.div
                  key={entry.student?._id || idx}
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${idx === 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 bg-white/5'}`}
                >
                  <MedalIcon rank={idx + 1} />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${entry.student?._id === user?._id ? 'text-gold' : 'text-white'}`}>
                      {entry.student?.displayName || entry.student?.name || '—'}
                      {entry.student?._id === user?._id && ' (You)'}
                    </p>
                    <p className="text-white/40 text-xs">{entry.student?.grade}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold font-bold">{entry.totalPoints}</p>
                    <p className="text-white/30 text-xs">pts</p>
                  </div>
                </motion.div>
              ))}
              {myRank && !leaderboard.slice(0, 3).find((e) => e.student?._id === user?._id) && (
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-gold/20 bg-gold/5">
                    <span className="text-white/60 font-bold">#{myRank.rank}</span>
                    <div className="flex-1">
                      <p className="text-gold text-sm font-semibold">{user?.displayName || user?.name} (You)</p>
                    </div>
                    <p className="text-gold font-bold">{myRank.totalPoints} pts</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Scores */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Exam Scores</h3>
            <Link to="/student/scores" className="text-gold text-xs hover:underline">View All →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : recentScores.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">No scores recorded yet</div>
          ) : (
            <div className="space-y-3">
              {recentScores.map((sc) => {
                const pct = Math.round((sc.marksObtained / sc.totalMarks) * 100);
                return (
                  <div key={sc._id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-medium">{sc.subject}</p>
                      <span className={`badge ${pct >= 75 ? 'badge-green' : pct >= 50 ? 'badge-gold' : 'badge-red'}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-gold' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-white/30 text-xs mt-1">{sc.marksObtained}/{sc.totalMarks} · {formatDate(sc.examDate)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Classes */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <FiCalendar className="text-gold" size={16} /> Upcoming Classes
          </h3>
          <Link to="/student/classes" className="text-gold text-xs flex items-center gap-1 hover:underline">
            View All <FiArrowRight size={12} />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="text-center py-6 text-white/30 text-sm">No upcoming classes scheduled</div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            {upcoming.map((cls) => (
              <div key={cls._id} className="flex-1 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-gold/20 transition-all">
                <p className="text-white font-semibold">{cls.subject}</p>
                <p className="text-white/50 text-xs mt-1">{formatDate(cls.scheduledDate)} · {formatTime(cls.scheduledTime)}</p>
                <span className="badge badge-blue mt-2 text-[10px]">{cls.grade}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
