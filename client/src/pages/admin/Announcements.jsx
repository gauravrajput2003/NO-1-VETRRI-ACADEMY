import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiPaperclip, FiTrash2, FiPlus, FiVolume2 } from 'react-icons/fi';
import {
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from '../../services/api';

const GRADES = ['4th','5th','6th','7th','8th','9th','10th','11th','12th'];
const COURSES = ['CBSE', 'Matric', 'Engineering', 'Arts', 'Language', 'Competitive'];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetRole: 'all',
    targetCourse: '',
    targetGrade: '',
    isPinned: false,
    expiresAt: '',
  });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await getAnnouncements();
      if (data.success) setAnnouncements(data.announcements || []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return; }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.expiresAt) delete payload.expiresAt;
      if (!payload.targetCourse) delete payload.targetCourse;
      if (!payload.targetGrade) delete payload.targetGrade;

      const { data } = await createAnnouncement(payload);
      if (data.success) {
        toast.success('✅ Announcement posted!');
        setForm({ title: '', content: '', targetRole: 'all', targetCourse: '', targetGrade: '', isPinned: false, expiresAt: '' });
        fetchAnnouncements();
      }
    } catch { toast.error('Failed to post announcement'); }
    finally { setSubmitting(false); }
  };

  const handlePin = async (ann) => {
    try {
      const { data } = await updateAnnouncement(ann._id, { isPinned: !ann.isPinned });
      if (data.success) {
        setAnnouncements((as) => as.map((a) => a._id === ann._id ? { ...a, isPinned: !a.isPinned } : a));
        toast.success(ann.isPinned ? 'Unpinned' : '📌 Pinned!');
      }
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      const { data } = await deleteAnnouncement(id);
      if (data.success) {
        setAnnouncements((as) => as.filter((a) => a._id !== id));
        toast.success('Deleted');
      }
    } catch { toast.error('Failed to delete'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const roleBadge = (role) => {
    const map = { all: 'bg-purple-500/20 text-purple-400', student: 'badge-blue', teacher: 'badge-gold' };
    return <span className={`badge capitalize ${map[role] || 'badge-blue'}`}>{role}</span>;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Announcements</h1>
        <p className="text-white/40 text-sm mt-1">Post and manage announcements for students and teachers</p>
      </div>

      {/* Create Form */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <h3 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
          <FiPlus className="text-gold" size={18} /> Post Announcement
        </h3>
        <form onSubmit={handlePost} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="input-label">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="Announcement title"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="input-label">Content *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="input-field resize-none"
                placeholder="Write your announcement here..."
                required
              />
            </div>

            <div>
              <label className="input-label">Target Audience</label>
              <select value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })} className="input-field">
                <option value="all">Everyone</option>
                <option value="student">Students Only</option>
                <option value="teacher">Teachers Only</option>
              </select>
            </div>

            <div>
              <label className="input-label">Target Course (optional)</label>
              <select value={form.targetCourse} onChange={(e) => setForm({ ...form, targetCourse: e.target.value })} className="input-field">
                <option value="">All Courses</option>
                {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Target Grade (optional)</label>
              <select value={form.targetGrade} onChange={(e) => setForm({ ...form, targetGrade: e.target.value })} className="input-field">
                <option value="">All Grades</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Pin Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, isPinned: !form.isPinned })}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none ${form.isPinned ? 'bg-gold' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transform transition-transform ${form.isPinned ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className="text-white/70 text-sm">{form.isPinned ? '📌 Pinned announcement' : 'Regular announcement'}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-gold text-navy font-semibold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            ) : <FiVolume2 size={16} />}
            {submitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </form>
      </div>

      {/* Announcements Table */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="text-white font-semibold text-lg">Active Announcements ({announcements.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Target</th>
                <th>Pinned</th>
                <th>Expires</th>
                <th>Posted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />) :
                announcements.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-white/30">No announcements yet</td></tr>
                ) : announcements.map((ann) => (
                  <tr key={ann._id} className={`hover:bg-white/5 transition-colors ${ann.isPinned ? 'bg-gold/5' : ''}`}>
                    <td>
                      <div className="flex items-start gap-2">
                        {ann.isPinned && <FiPaperclip className="text-gold flex-shrink-0 mt-0.5" size={12} />}
                        <div>
                          <p className="text-white font-medium text-sm">{ann.title}</p>
                          <p className="text-white/40 text-xs line-clamp-1 max-w-xs">{ann.content}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        {roleBadge(ann.targetRole)}
                        {ann.targetCourse && <span className="block text-white/30 text-xs">{ann.targetCourse}</span>}
                        {ann.targetGrade && <span className="block text-white/30 text-xs">Grade {ann.targetGrade}</span>}
                      </div>
                    </td>
                    <td>
                      {ann.isPinned
                        ? <span className="text-gold text-sm">📌 Yes</span>
                        : <span className="text-white/30 text-sm">—</span>
                      }
                    </td>
                    <td className="text-white/40 text-xs">{ann.expiresAt ? formatDate(ann.expiresAt) : '—'}</td>
                    <td className="text-white/40 text-xs">{formatDate(ann.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePin(ann)}
                          className={`p-1.5 rounded-lg border transition-all ${ann.isPinned ? 'border-gold/30 text-gold hover:bg-gold/10' : 'border-white/20 text-white/40 hover:text-gold hover:border-gold/30'}`}
                          title={ann.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <FiPaperclip size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(ann._id)}
                          className="p-1.5 rounded-lg border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/50 transition-all"
                          title="Delete"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
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
