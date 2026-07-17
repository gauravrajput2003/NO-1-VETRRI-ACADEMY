import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiUsers, FiVideo, FiUserCheck, FiAlertCircle, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import { getTodayClasses, getLiveMonitor } from '../../services/api';
import api from '../../services/api';
import AttendanceExportBar from '../../components/AttendanceExportBar';

function StatCard({ label, value, icon: Icon, color, bg, loading }) {
  return (
    <div className={`bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5`}>
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={color} size={20} />
      </div>
      <p className={`text-3xl font-display font-bold ${color}`}>{loading ? '—' : value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    joined: { cls: 'badge-green', label: '🟢 Joined' },
    live: { cls: 'badge-gold', label: '🟡 In Progress' },
    absent: { cls: 'badge-red', label: '🔴 Absent' },
    late: { cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', label: '⏰ Late' },
    scheduled: { cls: 'badge-blue', label: '📅 Upcoming' },
    completed: { cls: 'bg-white/10 text-white/40', label: '✅ Completed' },
  };
  const c = config[status] || config.scheduled;
  return <span className={`badge text-xs ${c.cls}`}>{c.label}</span>;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

export default function LiveMonitor() {
  const { socket } = useSocket();
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({ scheduled: 0, live: 0, joined: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchData();
    api.get('/admin/teachers', { params: { limit: 100 } }).then((r) => {
      if (r.data.success) setTeachers(r.data.teachers || []);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await getLiveMonitor({ all: true });
      if (data.success) {
        const attendanceRows = data.attendance || [];
        setRows(attendanceRows);
        computeStats(attendanceRows);
      }
    } catch {
      // Fallback to today's classes
      try {
        const { data } = await getTodayClasses();
        if (data.success) {
          const flat = [];
          (data.classes || []).forEach((cls) => {
            (cls.attendance || []).forEach((att) => {
              flat.push({ ...att, class: cls });
            });
          });
          setRows(flat);
          computeStats(flat);
        }
      } catch { toast.error('Failed to load monitor data'); }
    }
    setLastRefresh(new Date());
    setLoading(false);
  };

  const computeStats = (data) => {
    setStats({
      scheduled: data.length,
      live: data.filter((r) => r.classStatus === 'live').length,
      joined: data.filter((r) => r.status === 'joined' || r.joinTime).length,
      absent: data.filter((r) => r.status === 'absent').length,
    });
  };

  // Socket real-time updates
  useEffect(() => {
    if (!socket) return;

    const onStudentJoined = ({ classId, studentId, joinTime }) => {
      setRows((rs) => rs.map((r) =>
        r.student?._id === studentId && r.class?._id === classId
          ? { ...r, status: 'joined', joinTime }
          : r
      ));
    };

    const onClassStarted = ({ classId }) => {
      setRows((rs) => rs.map((r) =>
        r.class?._id === classId ? { ...r, classStatus: 'live' } : r
      ));
    };

    const onClassEnded = ({ classId }) => {
      setRows((rs) => rs.map((r) =>
        r.class?._id === classId
          ? { ...r, classStatus: 'completed', status: r.joinTime ? r.status : 'absent' }
          : r
      ));
    };

    const onAttendanceUpdated = () => fetchData();

    socket.on('student:joined', onStudentJoined);
    socket.on('class:started', onClassStarted);
    socket.on('class:ended', onClassEnded);
    socket.on('attendance:updated', onAttendanceUpdated);

    return () => {
      socket.off('student:joined', onStudentJoined);
      socket.off('class:started', onClassStarted);
      socket.off('class:ended', onClassEnded);
      socket.off('attendance:updated', onAttendanceUpdated);
    };
  }, [socket]);

  const filtered = rows.filter((r) => {
    if (filterCourse && r.class?.course !== filterCourse) return false;
    if (filterGrade && r.class?.grade !== filterGrade) return false;
    if (filterTeacher && r.class?.teacher?._id !== filterTeacher) return false;
    return true;
  });

  const exportRows = filtered.map((r) => ({
    Student: r.student?.displayName || r.student?.name || '—',
    'Course + Grade': `${r.class?.course || ''} ${r.class?.grade || ''}`.trim(),
    Teacher: r.class?.teacher?.displayName || r.class?.teacher?.name || '—',
    'Scheduled Time': r.class?.scheduledTime ? new Date(r.class.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    'Join Time': r.joinTime ? new Date(r.joinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not joined',
    Duration: r.duration ? `${r.duration} min` : '—',
    Status: r.status || 'scheduled',
  }));

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDuration = (m) => m ? `${m}m` : '—';

  const getRowStatus = (r) => {
    if (r.status === 'joined') return 'joined';
    if (r.status === 'absent') return 'absent';
    if (r.joinTime && r.lateThreshold) return 'late';
    if (r.classStatus === 'live') return 'live';
    return 'scheduled';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Live Class Monitor</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-white/40 text-sm">
              Real-time · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            <span className="text-white/20 text-xs">Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 border border-white/20 text-white/60 hover:text-white hover:border-white/40 px-4 py-2 rounded-xl text-sm transition-all">
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scheduled Today" value={stats.scheduled} icon={FiCalendar} color="text-blue-400" bg="bg-blue-500/10" loading={loading} />
        <StatCard label="Currently Live" value={stats.live} icon={FiVideo} color="text-green-400" bg="bg-green-500/10" loading={loading} />
        <StatCard label="Total Joined" value={stats.joined} icon={FiUserCheck} color="text-gold" bg="bg-gold/10" loading={loading} />
        <StatCard label="Absent Count" value={stats.absent} icon={FiAlertCircle} color="text-red-400" bg="bg-red-500/10" loading={loading} />
      </div>

      {/* Filters + Export */}
      <AttendanceExportBar
        rows={exportRows}
        columns={['Student', 'Course + Grade', 'Teacher', 'Scheduled Time', 'Join Time', 'Duration', 'Status']}
        title="Live Class Attendance Monitor"
        filename="live_monitor_export"
        colorRows
      >
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="input-field py-1.5 text-xs">
          <option value="">All Courses</option>
          {['CBSE','Matric','Engineering','Arts','Language','Competitive'].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="input-field py-1.5 text-xs">
          <option value="">All Grades</option>
          {['4th','5th','6th','7th','8th','9th','10th','11th','12th'].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="input-field py-1.5 text-xs">
          <option value="">All Teachers</option>
          {teachers.map((t) => <option key={t._id} value={t._id}>{t.displayName || t.name}</option>)}
        </select>
      </AttendanceExportBar>

      {/* Main Table */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Course + Grade</th>
                <th>Teacher</th>
                <th>Scheduled</th>
                <th>Joined</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />) :
                filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-white/30">No attendance data for today</td></tr>
                ) : filtered.map((r, idx) => {
                  const rowStatus = getRowStatus(r);
                  const isLiveRow = r.classStatus === 'live';
                  const isAbsent = rowStatus === 'absent';
                  return (
                    <tr key={idx} className={`transition-colors hover:bg-white/5 ${
                      isLiveRow ? 'border-l-2 border-l-gold' : isAbsent ? 'bg-red-500/5' : ''
                    }`}>
                      <td className="font-medium">{r.student?.displayName || r.student?.name || '—'}</td>
                      <td className="text-white/60">
                        <div className="flex flex-col">
                          <span>{r.class?.course || '—'}</span>
                          <span className="text-white/30 text-xs">{r.class?.grade}</span>
                        </div>
                      </td>
                      <td className="text-white/70">{r.class?.teacher?.displayName || r.class?.teacher?.name || '—'}</td>
                      <td className="text-white/60">{formatTime(r.class?.scheduledTime)}</td>
                      <td>
                        {r.joinTime
                          ? <span className="text-green-400 font-medium">{formatTime(r.joinTime)}</span>
                          : <span className="text-white/20 text-xs">Not joined yet</span>
                        }
                      </td>
                      <td className="text-white/60">{formatDuration(r.duration)}</td>
                      <td><StatusBadge status={rowStatus} /></td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

