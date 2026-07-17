import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiUsers, FiVideo, FiDollarSign, FiCalendar,
  FiArrowRight, FiFileText, FiLink, FiAward,
} from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getAdminStats, getDemoBookings, getAllLeaves } from '../../services/api';
import api from '../../services/api';
import AnnouncementBanner from '../../components/AnnouncementBanner';

function StatCard({ label, value, icon: Icon, color, bg, href, loading }) {
  const inner = (
    <motion.div whileHover={{ y: -4 }}
      className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5 hover:border-gold/30 transition-all cursor-pointer">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={color} size={20} />
      </div>
      <p className={`text-3xl font-display font-bold ${color}`}>{loading ? '—' : value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </motion.div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#0F1F35] border border-[#1E3A5F] rounded-xl p-3 text-xs">
        <p className="text-white/60 mb-1">{label}</p>
        <p className="text-gold font-bold">₹{(payload[0]?.value || 0).toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

export default function AdminDashboardHome() {
  const [stats, setStats] = useState(null);
  const [liveMini, setLiveMini] = useState([]);
  const [bestTeacher, setBestTeacher] = useState(null);
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingDemos, setPendingDemos] = useState(0);
  const [loading, setLoading] = useState(true);

  // Quick announcement form
  const [annForm, setAnnForm] = useState({ title: '', content: '', targetRole: 'all' });
  const [annPosting, setAnnPosting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, demosRes, leavesRes] = await Promise.all([
        getAdminStats(),
        getDemoBookings({ status: 'pending' }),
        getAllLeaves(),
      ]);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (demosRes.data.success) setPendingDemos(demosRes.data.bookings?.length || 0);
      if (leavesRes.data.success) setPendingLeaves(leavesRes.data.leaves?.filter((l) => l.status === 'pending').length || 0);
    } catch {}

    try {
      const [btRes, enquiriesRes, revenueRes, liveRes] = await Promise.all([
        api.get('/teacher-grading/best-teacher'),
        api.get('/enquiries', { params: { limit: 5 } }),
        api.get('/fees/weekly-summary'),
        api.get('/classes/live-monitor', { params: { liveOnly: true } }),
      ]);
      if (btRes.data.success) setBestTeacher(btRes.data.teacher);
      if (enquiriesRes.data.success) setRecentEnquiries(enquiriesRes.data.enquiries || []);
      if (revenueRes.data.success) setRevenueChart(revenueRes.data.weekly || []);
      if (liveRes.data.success) {
        const allRows = liveRes.data.attendance || [];
        const live = allRows.filter((r) => r.classStatus === 'live');
        setLiveMini(live.slice(0, 5));
      }
    } catch {}

    setLoading(false);
  };

  const handleQuickAnn = async (e) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) { toast.error('Fill title and content'); return; }
    setAnnPosting(true);
    try {
      await api.post('/announcements', annForm);
      toast.success('Announcement posted!');
      setAnnForm({ title: '', content: '', targetRole: 'all' });
    } catch { toast.error('Failed to post'); }
    finally { setAnnPosting(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
  const avatarSrc = (u) =>
    u?.profilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u?.name || '?')}&backgroundColor=0A1628&textColor=F5A623`;

  const statCards = [
    { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: FiUsers, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/admin/students' },
    { label: 'Total Teachers', value: stats?.totalTeachers ?? 0, icon: FiUsers, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/admin/teachers' },
    { label: 'Classes Today', value: stats?.classesToday ?? 0, icon: FiVideo, color: 'text-green-400', bg: 'bg-green-500/10', href: '/admin/live-monitor' },
    { label: 'Pending Demos', value: pendingDemos, icon: FiCalendar, color: 'text-yellow-400', bg: 'bg-yellow-500/10', href: '/admin/demo-bookings' },
    { label: 'Pending Leaves', value: pendingLeaves, icon: FiFileText, color: 'text-red-400', bg: 'bg-red-500/10', href: '/admin/leave' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Admin Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Announcements */}
      <AnnouncementBanner />

      {/* 6 Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Live Monitor Preview + Best Teacher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Monitor Mini */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live Classes Now
            </h3>
            <Link to="/admin/live-monitor" className="text-gold text-xs flex items-center gap-1 hover:underline">
              Full Monitor <FiArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>
          ) : liveMini.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No live classes at the moment</div>
          ) : (
            <div className="space-y-2">
              {liveMini.map((row, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{row.student?.displayName || row.student?.name || '—'}</p>
                    <p className="text-white/40 text-xs">{row.class?.subject} · {row.class?.teacher?.displayName || '—'}</p>
                  </div>
                  <span className="badge badge-green text-[10px]">🟢 Live</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best Teacher */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FiAward className="text-gold" size={18} /> Best Teacher of the Month
          </h3>
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
            </div>
          ) : !bestTeacher ? (
            <div className="text-center py-10 text-white/30 text-sm">No grading data available yet</div>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-gold/10 border border-gold/20 rounded-xl">
              <img src={avatarSrc(bestTeacher)} alt={bestTeacher.name}
                className="w-16 h-16 rounded-full border-2 border-gold/40 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-lg">{bestTeacher.displayName || bestTeacher.name}</p>
                  <span className="text-xl">🏆</span>
                </div>
                <p className="text-white/50 text-sm">{bestTeacher.qualification}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge badge-gold text-sm font-bold">{bestTeacher.score || 0}/100</span>
                  <span className="text-gold text-xs">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart + Enquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Revenue Chart */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FiDollarSign className="text-gold" size={16} /> Weekly Revenue
            </h3>
            <Link to="/admin/fees" className="text-gold text-xs hover:underline">View All →</Link>
          </div>
          {revenueChart.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">No revenue data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueChart} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#F5A623" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Enquiries */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Enquiries</h3>
            <Link to="/admin/enquiries" className="text-gold text-xs hover:underline">View All →</Link>
          </div>
          {loading ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
              </table>
            </div>
          ) : recentEnquiries.length === 0 ? (
            <div className="text-center py-10 text-white/30 text-sm">No enquiries yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {recentEnquiries.map((e) => (
                    <tr key={e._id} className="hover:bg-white/5 transition-colors">
                      <td className="text-white font-medium text-sm">{e.name}</td>
                      <td className="text-white/60 text-xs">{e.course}</td>
                      <td className="text-white/40 text-xs">{formatDate(e.createdAt)}</td>
                      <td><span className={`badge text-[10px] ${e.status === 'new' ? 'badge-gold' : 'badge-green'}`}>{e.status || 'new'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions + Quick Announcement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <h3 className="text-white font-semibold mb-4">⚡ Pending Actions</h3>
          <div className="space-y-3">
            {[
              { label: 'Leave Requests', count: pendingLeaves, href: '/admin/leave', color: 'text-red-400', border: 'border-red-500/20' },
              { label: 'Demo Bookings', count: pendingDemos, href: '/admin/demo-bookings', color: 'text-yellow-400', border: 'border-yellow-500/20' },
            ].map((item) => (
              <Link key={item.href} to={item.href}
                className={`flex items-center justify-between p-4 bg-white/5 border ${item.border} rounded-xl hover:bg-white/10 transition-all`}>
                <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold font-display ${item.color}`}>{item.count}</span>
                  <FiArrowRight size={14} className={item.color} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Announcement */}
        <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">📢 Quick Announcement</h3>
            <Link to="/admin/announcements" className="text-gold text-xs hover:underline">Full Page →</Link>
          </div>
          <form onSubmit={handleQuickAnn} className="space-y-3">
            <input
              value={annForm.title}
              onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
              className="input-field text-sm"
              placeholder="Announcement title"
            />
            <textarea
              value={annForm.content}
              onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
              rows={3}
              className="input-field text-sm resize-none"
              placeholder="Write your message..."
            />
            <div className="flex gap-2">
              <select
                value={annForm.targetRole}
                onChange={(e) => setAnnForm({ ...annForm, targetRole: e.target.value })}
                className="input-field text-xs py-2 flex-1"
              >
                <option value="all">Everyone</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
              </select>
              <button type="submit" disabled={annPosting}
                className="bg-gold text-navy font-semibold px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60 text-sm flex items-center gap-1">
                {annPosting ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : null}
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
