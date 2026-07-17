import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCalendar, FiClock, FiUser, FiMonitor } from 'react-icons/fi';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { getMyLoginLogs } from '../../services/api';
import api from '../../services/api';
import AttendanceExportBar from '../../components/AttendanceExportBar';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = [2024, 2025, 2026, 2027];

function CircularProgress({ value, size = 120, label, color = '#F5A623' }) {
  const data = [{ name: label, value, fill: color }];
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="90%" barSize={10} data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'rgba(255,255,255,0.05)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xl">{value}%</span>
        </div>
      </div>
      {label && <p className="text-white/50 text-xs text-center">{label}</p>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

function StatusBadge({ status }) {
  const map = { present: 'badge-green', late: 'badge-gold', absent: 'badge-red' };
  return <span className={`badge ${map[status] || 'bg-white/10 text-white/50'} capitalize`}>{status}</span>;
}

export default function StudentAttendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('login');
  const [loginLogs, setLoginLogs] = useState([]);
  const [classAttendance, setClassAttendance] = useState([]);
  const [overallPct, setOverallPct] = useState(0);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [loginStats, setLoginStats] = useState({ days: 0, avgDuration: 0, streak: 0 });
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [subjectFilter, setSubjectFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (tab === 'login') loadLoginHistory(); }, [tab, month, year]);
  useEffect(() => { if (tab === 'class') loadClassAttendance(); }, [tab, subjectFilter, monthFilter]);

  const loadLoginHistory = async () => {
    setLoading(true);
    try {
      const { data } = await getMyLoginLogs({ month: month + 1, year });
      if (data.success) {
        setLoginLogs(data.logs || []);
        setLoginStats({
          days: data.stats?.daysPresent || 0,
          avgDuration: data.stats?.avgDuration || 0,
          streak: data.stats?.currentStreak || 0,
        });
      }
    } catch { toast.error('Failed to load login history'); }
    finally { setLoading(false); }
  };

  const loadClassAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (subjectFilter) params.subject = subjectFilter;
      if (monthFilter) params.month = parseInt(monthFilter) + 1;
      const { data } = await api.get('/attendance/my-class', { params });
      if (data.success) {
        setClassAttendance(data.attendance || []);
        setOverallPct(data.overallPercent || 0);
        setSubjectBreakdown(data.subjectBreakdown || []);
      }
    } catch { toast.error('Failed to load class attendance'); }
    finally { setLoading(false); }
  };

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const loginRows = loginLogs.map((l) => ({
    Date: formatDate(l.loginTime),
    'Login Time': formatTime(l.loginTime),
    'Logout Time': l.logoutTime ? formatTime(l.logoutTime) : '—',
    Duration: formatDuration(l.duration),
    Device: l.device || '—',
  }));

  const classRows = classAttendance.map((a) => ({
    Date: formatDate(a.date || a.scheduledDate),
    Subject: a.subject || '—',
    Scheduled: formatTime(a.scheduledTime),
    Joined: a.joinTime ? formatTime(a.joinTime) : '—',
    Duration: formatDuration(a.duration),
    Status: a.status,
  }));

  const subjects = [...new Set(classAttendance.map((a) => a.subject).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Attendance</h1>
        <p className="text-white/40 text-sm mt-1">Track your login history and class attendance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {['login', 'class'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'}`}>
            {t === 'login' ? 'Login History' : 'Class Attendance'}
          </button>
        ))}
      </div>

      {/* LOGIN HISTORY TAB */}
      {tab === 'login' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Days Logged In', value: loginStats.days, icon: FiCalendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Avg Session', value: formatDuration(loginStats.avgDuration), icon: FiClock, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Current Streak 🔥', value: `${loginStats.streak} days`, icon: FiUser, color: 'text-gold', bg: 'bg-gold/10' },
            ].map((s) => (
              <div key={s.label} className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={s.color} size={18} />
                </div>
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                <p className="text-white/40 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <AttendanceExportBar
            rows={loginRows}
            columns={['Date', 'Login Time', 'Logout Time', 'Duration', 'Device']}
            title="Student Login History"
            filename="student_login_history"
          >
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field py-1.5 text-xs">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field py-1.5 text-xs">
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </AttendanceExportBar>

          <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Login Time</th><th>Logout Time</th><th>Duration</th><th>Device</th></tr></thead>
                <tbody>
                  {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                    loginLogs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-white/30">No login history found</td></tr>
                    ) : loginLogs.map((l, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td>{formatDate(l.loginTime)}</td>
                        <td>{formatTime(l.loginTime)}</td>
                        <td>{l.logoutTime ? formatTime(l.logoutTime) : <span className="text-green-400 text-xs">Active</span>}</td>
                        <td>{formatDuration(l.duration)}</td>
                        <td className="text-white/40 flex items-center gap-1.5"><FiMonitor size={12} />{l.device || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CLASS ATTENDANCE TAB */}
      {tab === 'class' && (
        <div className="space-y-6">
          {/* Overall + Subject Breakdown */}
          <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
            <h3 className="text-white font-semibold mb-5">Attendance Overview</h3>
            <div className="flex flex-wrap items-center justify-around gap-6">
              {/* Overall */}
              <div className="flex flex-col items-center gap-2">
                <CircularProgress value={overallPct} size={140} color={overallPct >= 75 ? '#10B981' : overallPct >= 50 ? '#F5A623' : '#EF4444'} />
                <p className="text-white font-semibold text-sm">Overall Attendance</p>
              </div>

              {/* Subject breakdown */}
              {subjectBreakdown.length > 0 && (
                <div className="flex flex-wrap justify-center gap-6">
                  {subjectBreakdown.slice(0, 4).map((s) => (
                    <div key={s.subject} className="flex flex-col items-center gap-2">
                      <CircularProgress value={Math.round(s.percent)} size={90} color="#F5A623" />
                      <div className="text-center">
                        <p className="text-white text-xs font-medium">{s.subject}</p>
                        <p className="text-white/40 text-[10px]">{s.attended}/{s.total} classes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filters + Export */}
          <AttendanceExportBar
            rows={classRows}
            columns={['Date', 'Subject', 'Scheduled', 'Joined', 'Duration', 'Status']}
            title="Class Attendance Report"
            filename="class_attendance"
            colorRows
          >
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="input-field py-1.5 text-xs">
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="input-field py-1.5 text-xs">
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </AttendanceExportBar>

          {/* Detail Table */}
          <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Subject</th><th>Scheduled</th><th>Joined</th><th>Duration</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                    classAttendance.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-white/30">No attendance records found</td></tr>
                    ) : classAttendance.map((a, i) => (
                      <tr key={i} className={`hover:brightness-110 transition-all ${
                        a.status === 'present' ? 'bg-green-500/5' :
                        a.status === 'absent' ? 'bg-red-500/5' :
                        a.status === 'late' ? 'bg-yellow-500/5' : ''
                      }`}>
                        <td>{formatDate(a.date || a.scheduledDate)}</td>
                        <td className="font-medium">{a.subject || '—'}</td>
                        <td>{formatTime(a.scheduledTime)}</td>
                        <td>{a.joinTime ? formatTime(a.joinTime) : <span className="text-red-400 text-xs">—</span>}</td>
                        <td>{formatDuration(a.duration)}</td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
