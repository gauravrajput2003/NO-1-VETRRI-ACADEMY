import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCalendar, FiClock, FiMonitor, FiUser, FiX, FiCheck } from 'react-icons/fi';
import { getMyLoginLogs, getStudentClassAttendanceData, manualAttendance } from '../../services/api';
import api from '../../services/api';
import AttendanceExportBar from '../../components/AttendanceExportBar';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = [2024, 2025, 2026, 2027];

function StatusBadge({ status }) {
  const map = { present: 'badge-green', late: 'badge-gold', absent: 'badge-red' };
  return <span className={`badge ${map[status] || 'bg-white/10 text-white/50'}`}>{status}</span>;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

// Manual Attendance Modal
function ManualModal({ student, onClose, onSave }) {
  const [status, setStatus] = useState('present');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    setSaving(true);
    try {
      await onSave({ studentId: student._id, status, reason });
      onClose();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0F1F35] border border-[#1E3A5F] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Mark Manual Attendance</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><FiX size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="input-label">Student</label>
            <input readOnly value={student.displayName || student.name} className="input-field opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="input-label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <div>
            <label className="input-label">Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input-field resize-none" placeholder="Reason for manual attendance..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 bg-gold text-navy font-semibold py-2.5 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('login');
  const [loginLogs, setLoginLogs] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [loginStats, setLoginStats] = useState({ days: 0, avgDuration: 0, streak: 0 });
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [manualModal, setManualModal] = useState(null);

  useEffect(() => { if (tab === 'login') loadLogin(); }, [tab, month, year]);
  useEffect(() => { if (tab === 'student') loadStudentAttendance(); }, [tab, classFilter]);

  const loadLogin = async () => {
    setLoading(true);
    try {
      const { data } = await getMyLoginLogs({ month: month + 1, year });
      if (data.success) {
        setLoginLogs(data.logs || []);
        setLoginStats({ days: data.stats?.daysPresent || 0, avgDuration: data.stats?.avgDuration || 0, streak: data.stats?.currentStreak || 0 });
      }
    } catch { toast.error('Failed to load login history'); }
    finally { setLoading(false); }
  };

  const loadStudentAttendance = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/class/teacher-students', { params: classFilter ? { class: classFilter } : {} });
      if (data.success) setStudentAttendance(data.attendance || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleManualSave = async ({ studentId, status, reason }) => {
    await manualAttendance({ studentId, status, reason, date: new Date().toISOString() });
    toast.success('Attendance marked');
    loadStudentAttendance();
  };

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const loginRows = loginLogs.map((l) => ({
    Date: new Date(l.loginTime).toLocaleDateString('en-IN'),
    'Login Time': new Date(l.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    'Logout Time': l.logoutTime ? new Date(l.logoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    Duration: formatDuration(l.duration),
    Device: l.device || '—',
  }));

  const studentRows = studentAttendance.map((a) => ({
    Student: a.student?.displayName || a.student?.name || '—',
    'Join Time': a.joinTime ? new Date(a.joinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    Duration: formatDuration(a.duration),
    Status: a.status,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Attendance</h1>
        <p className="text-white/40 text-sm mt-1">View login history and manage student attendance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {['login', 'student'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'}`}>
            {t === 'login' ? 'My Login History' : 'Student Attendance'}
          </button>
        ))}
      </div>

      {tab === 'login' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Days Logged In', value: loginStats.days, icon: FiCalendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Avg Duration', value: formatDuration(loginStats.avgDuration), icon: FiClock, color: 'text-green-400', bg: 'bg-green-500/10' },
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

          {/* Export Bar */}
          <AttendanceExportBar
            rows={loginRows}
            columns={['Date', 'Login Time', 'Logout Time', 'Duration', 'Device']}
            title="Teacher Login History"
            filename="teacher_login_history"
          >
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field py-1.5 text-xs">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field py-1.5 text-xs">
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </AttendanceExportBar>

          {/* Table */}
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
                        <td>{new Date(l.loginTime).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(l.loginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{l.logoutTime ? new Date(l.logoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span className="text-green-400 text-xs">Active</span>}</td>
                        <td>{formatDuration(l.duration)}</td>
                        <td className="text-white/40 flex items-center gap-1.5"><FiMonitor size={12} /> {l.device || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'student' && (
        <div className="space-y-4">
          <AttendanceExportBar
            rows={studentRows}
            columns={['Student', 'Join Time', 'Duration', 'Status']}
            title="Student Attendance"
            filename="student_attendance"
            colorRows
          >
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input-field py-1.5 text-xs">
              <option value="">All Classes</option>
              {['4th','5th','6th','7th','8th','9th','10th','11th','12th'].map((g) => (
                <option key={g} value={g}>{g} Grade</option>
              ))}
            </select>
          </AttendanceExportBar>

          <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Student Name</th><th>Join Time</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                    studentAttendance.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-white/30">No attendance data found</td></tr>
                    ) : studentAttendance.map((a, i) => (
                      <tr key={i} className={`hover:bg-white/5 transition-colors ${
                        a.status === 'present' ? 'bg-green-500/5' : a.status === 'absent' ? 'bg-red-500/5' : 'bg-yellow-500/5'
                      }`}>
                        <td className="font-medium">{a.student?.displayName || a.student?.name || '—'}</td>
                        <td>{a.joinTime ? new Date(a.joinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>{formatDuration(a.duration)}</td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>
                          <button
                            onClick={() => setManualModal(a.student)}
                            className="text-xs border border-gold/30 text-gold px-2.5 py-1 rounded-lg hover:bg-gold/10 transition-all"
                          >
                            Mark Manual
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Modal */}
      <AnimatePresence>
        {manualModal && (
          <ManualModal
            student={manualModal}
            onClose={() => setManualModal(null)}
            onSave={handleManualSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
