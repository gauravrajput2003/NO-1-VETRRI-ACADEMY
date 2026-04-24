import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiMonitor } from 'react-icons/fi';
import { getAllLoginLogs, getTodayLogins } from '../../services/api';
import AttendanceExportBar from '../../components/AttendanceExportBar';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = [2024, 2025, 2026, 2027];

function StatCard({ label, value, color, bg, loading }) {
  return (
    <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5">
      <p className={`text-3xl font-display font-bold ${color}`}>{loading ? '—' : value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    student: 'badge-blue',
    teacher: 'badge-gold',
    admin: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  };
  return <span className={`badge capitalize ${map[role] || 'bg-white/10 text-white/50'}`}>{role}</span>;
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

export default function LoginLogs() {
  const [logs, setLogs] = useState([]);
  const [todayStats, setTodayStats] = useState({ total: 0, students: 0, teachers: 0, avgDuration: 0 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchLogs(); }, [month, year, roleFilter]);
  useEffect(() => { fetchTodayStats(); }, []);

  const fetchTodayStats = async () => {
    try {
      const { data } = await getTodayLogins();
      if (data.success) {
        const all = data.logs || [];
        const durations = all.filter((l) => l.duration).map((l) => l.duration);
        setTodayStats({
          total: all.length,
          students: all.filter((l) => l.role === 'student').length,
          teachers: all.filter((l) => l.role === 'teacher').length,
          avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        });
      }
    } catch {}
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { month: month + 1, year };
      if (roleFilter) params.role = roleFilter;
      const { data } = await getAllLoginLogs(params);
      if (data.success) setLogs(data.logs || []);
    } catch { toast.error('Failed to load login logs'); }
    finally { setLoading(false); }
  };

  const formatDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const name = l.user?.displayName || l.user?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const exportRows = filtered.map((l) => ({
    'User Name': l.user?.displayName || l.user?.name || '—',
    Role: l.role || '—',
    'Login Time': formatTime(l.loginTime),
    'Logout Time': l.logoutTime ? formatTime(l.logoutTime) : '—',
    Duration: formatDuration(l.duration),
    Device: l.device || '—',
    'IP Address': l.ipAddress || '—',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Login Logs</h1>
        <p className="text-white/40 text-sm mt-1">Track all user login activity across the platform</p>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Logins Today" value={todayStats.total} color="text-white" bg="bg-white/10" loading={false} />
        <StatCard label="Students Online" value={todayStats.students} color="text-blue-400" bg="bg-blue-500/10" loading={false} />
        <StatCard label="Teachers Online" value={todayStats.teachers} color="text-gold" bg="bg-gold/10" loading={false} />
        <StatCard label="Avg Session" value={formatDuration(todayStats.avgDuration)} color="text-green-400" bg="bg-green-500/10" loading={false} />
      </div>

      {/* Filters + Export */}
      <AttendanceExportBar
        rows={exportRows}
        columns={['User Name', 'Role', 'Login Time', 'Logout Time', 'Duration', 'Device', 'IP Address']}
        title="Login Logs Report"
        filename="login_logs"
      >
        {/* Role filter */}
        <div className="flex gap-2 flex-wrap">
          {['', 'student', 'teacher', 'admin'].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${roleFilter === r ? 'bg-gold text-navy font-semibold' : 'border border-white/20 text-white/50 hover:border-white/40'}`}>
              {r || 'All Roles'}
            </button>
          ))}
        </div>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field py-1.5 text-xs">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field py-1.5 text-xs">
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="input-field pl-8 py-1.5 text-xs"
          />
        </div>
      </AttendanceExportBar>

      {/* Table */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Role</th>
                <th>Login Time</th>
                <th>Logout Time</th>
                <th>Duration</th>
                <th>Device</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />) :
                filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-white/30">No login records found</td></tr>
                ) : filtered.map((l, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="font-medium text-white">{l.user?.displayName || l.user?.name || '—'}</td>
                    <td><RoleBadge role={l.role} /></td>
                    <td className="text-white/60">{formatTime(l.loginTime)}</td>
                    <td className="text-white/60">
                      {l.logoutTime ? formatTime(l.logoutTime) : <span className="text-green-400 text-xs">Still Active</span>}
                    </td>
                    <td className="text-white/60">{formatDuration(l.duration)}</td>
                    <td className="text-white/40 text-sm flex items-center gap-1.5">
                      <FiMonitor size={12} />{l.device || '—'}
                    </td>
                    <td className="text-white/30 text-xs font-mono">{l.ipAddress || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
