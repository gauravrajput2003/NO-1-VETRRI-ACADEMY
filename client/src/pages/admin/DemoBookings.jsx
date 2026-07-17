import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCalendar, FiCheck, FiX, FiLink, FiUser, FiMail } from 'react-icons/fi';
import { getDemoBookings, updateDemoBooking } from '../../services/api';
import api from '../../services/api';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

function StatCard({ label, value, color, bg, loading }) {
  return (
    <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5">
      <p className={`text-3xl font-display font-bold ${color}`}>{loading ? '—' : value}</p>
      <p className="text-white/50 text-sm mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'badge-gold',
    confirmed: 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
  };
  return <span className={`badge capitalize ${map[status] || 'bg-white/10 text-white/50'}`}>{status}</span>;
}

function AssignModal({ booking, teachers, onClose, onSave }) {
  const [teacherId, setTeacherId] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!teacherId) { toast.error('Select a teacher'); return; }
    if (!meetLink.trim()) { toast.error('Enter a meet link'); return; }
    setSaving(true);
    try {
      await onSave({ teacherId, meetLink });
      onClose();
    } catch { toast.error('Failed to update booking'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0F1F35] border border-[#1E3A5F] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Assign Teacher & Send Link</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><FiX size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-white/50 text-xs mb-1">Booking for</p>
            <p className="text-white font-medium">{booking.name} — {booking.course}</p>
          </div>
          <div>
            <label className="input-label">Assign Teacher *</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="input-field">
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>{t.displayName || t.name} — {t.qualification}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Google Meet / Jitsi Link *</label>
            <div className="relative">
              <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                className="input-field pl-9"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </div>
          </div>
          <p className="text-white/30 text-xs flex items-center gap-1">
            <FiMail size={12} /> A confirmation email with the meet link will be sent to the student.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-gold text-navy font-semibold py-2.5 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60">
              {saving ? 'Sending...' : 'Assign & Send Link'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

export default function DemoBookings() {
  const [bookings, setBookings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, completed: 0, thisWeek: 0 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bookingsRes, teachersRes] = await Promise.all([
        getDemoBookings(statusFilter ? { status: statusFilter } : {}),
        api.get('/admin/teachers', { params: { limit: 100 } }),
      ]);
      if (bookingsRes.data.success) {
        const all = bookingsRes.data.bookings || [];
        setBookings(all);
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        setStats({
          pending: all.filter((b) => b.status === 'pending').length,
          confirmed: all.filter((b) => b.status === 'confirmed').length,
          completed: all.filter((b) => b.status === 'completed').length,
          thisWeek: all.filter((b) => new Date(b.createdAt) >= weekStart).length,
        });
      }
      if (teachersRes.data.success) setTeachers(teachersRes.data.teachers || []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const handleAssign = async ({ teacherId, meetLink }) => {
    const { data } = await updateDemoBooking(assignModal._id, {
      assignedTeacher: teacherId,
      meetLink,
      status: 'confirmed',
    });
    if (data.success) {
      toast.success('✅ Teacher assigned and email sent!');
      fetchAll();
    }
  };

  const handleStatus = async (id, status) => {
    try {
      const { data } = await updateDemoBooking(id, { status });
      if (data.success) {
        toast.success(`Booking ${status}`);
        fetchAll();
      }
    } catch { toast.error('Failed to update status'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Demo Bookings</h1>
        <p className="text-white/40 text-sm mt-1">Manage incoming demo class requests from prospective students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.pending} color="text-yellow-400" bg="bg-yellow-500/10" loading={loading} />
        <StatCard label="Confirmed" value={stats.confirmed} color="text-blue-400" bg="bg-blue-500/10" loading={loading} />
        <StatCard label="Completed" value={stats.completed} color="text-green-400" bg="bg-green-500/10" loading={loading} />
        <StatCard label="This Week Total" value={stats.thisWeek} color="text-gold" bg="bg-gold/10" loading={loading} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-white/50 text-sm font-medium">Filter by status:</p>
        <div className="flex gap-2 flex-wrap">
          {['', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${statusFilter === s ? 'bg-gold text-navy font-semibold' : 'border border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Grade</th><th>Course</th>
                <th>Preferred Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                bookings.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-white/30">No bookings found</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-white/5 transition-colors">
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                          <FiUser size={12} className="text-gold" />
                        </div>
                        <span className="text-white font-medium">{b.name}</span>
                      </div>
                    </td>
                    <td className="text-white/60">{b.phone}</td>
                    <td className="text-white/60">{b.grade}</td>
                    <td><span className="badge badge-blue text-[10px]">{b.course}</span></td>
                    <td className="text-white/60 text-xs">{formatDate(b.preferredDate)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.status === 'pending' && (
                          <button onClick={() => setAssignModal(b)}
                            className="text-xs bg-gold/10 text-gold border border-gold/30 px-2.5 py-1 rounded-lg hover:bg-gold/20 transition-all flex items-center gap-1">
                            <FiLink size={10} /> Assign Teacher
                          </button>
                        )}
                        {b.status === 'confirmed' && (
                          <button onClick={() => handleStatus(b._id, 'completed')}
                            className="text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-lg hover:bg-green-500/20 transition-all flex items-center gap-1">
                            <FiCheck size={10} /> Mark Done
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <button onClick={() => handleStatus(b._id, 'cancelled')}
                            className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all">
                            <FiX size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {assignModal && (
          <AssignModal
            booking={assignModal}
            teachers={teachers}
            onClose={() => setAssignModal(null)}
            onSave={handleAssign}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
