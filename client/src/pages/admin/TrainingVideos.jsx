import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiUpload, FiTrash2, FiChevronDown, FiChevronUp, FiCheck, FiX, FiUsers, FiPlay, FiDownload } from 'react-icons/fi';
import {
  getTrainingVideos, getTrainingProgress, deleteTrainingVideo, uploadTrainingVideo,
} from '../../services/api';
import UploadProgress from '../../components/UploadProgress';

const CATEGORIES = ['platform-tutorial', 'teaching-methods', 'technical-setup', 'other'];

function CategoryLabel(cat) {
  const map = {
    'platform-tutorial': 'Platform Tutorial',
    'teaching-methods': 'Teaching Methods',
    'technical-setup': 'Technical Setup',
    other: 'Other',
  };
  return map[cat] || cat;
}

function categoryColor(cat) {
  const map = {
    'platform-tutorial': 'bg-blue-500/20 text-blue-400',
    'teaching-methods': 'bg-purple-500/20 text-purple-400',
    'technical-setup': 'bg-teal-500/20 text-teal-400',
    other: 'bg-white/10 text-white/50',
  };
  return map[cat] || map.other;
}

function formatDuration(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function DeleteModal({ video, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    catch { toast.error('Failed to delete'); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0F1F35] border border-[#1E3A5F] rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-white font-semibold mb-2">Delete Training Video</h3>
        <p className="text-white/60 text-sm mb-5">Are you sure you want to delete <strong className="text-white">{video.title}</strong>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={confirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-60">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminTrainingVideos() {
  const [videos, setVideos] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [summaryStats, setSummaryStats] = useState({ completed: 0, total: 0 });

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', category: 'platform-tutorial',
    isMandatory: false, orderNumber: 1,
  });
  const [videoFile, setVideoFile] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [videosRes, progressRes] = await Promise.all([
        getTrainingVideos(),
        getTrainingProgress(),
      ]);
      if (videosRes.data.success) {
        const vids = videosRes.data.videos || [];
        setVideos(vids);
        
        if (progressRes.data.success) {
          const rawMatrix = progressRes.data.matrix || [];
          const aggregatedProgress = vids.map(v => {
            const watchedBy = [];
            rawMatrix.forEach(t => {
              const stat = t.videoStatus.find(vs => vs.videoId.toString() === v._id.toString());
              if (stat) {
                watchedBy.push({ teacher: t.teacher, completed: stat.isCompleted });
              }
            });
            return { videoId: v._id, watchedBy };
          });
          
          setProgressData(aggregatedProgress);
          setSummaryStats({
            completed: progressRes.data.summary?.allDone || 0,
            total: progressRes.data.summary?.total || 0,
          });
        }
      }
    } catch { toast.error('Failed to load training videos'); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!videoFile) { toast.error('Please select a video file'); return; }
    if (!form.title) { toast.error('Title is required'); return; }

    if (videoFile.size > 500 * 1024 * 1024) { toast.error('File must be under 500MB'); return; }

    setUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('video', videoFile);
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('isMandatory', form.isMandatory);
    fd.append('orderNumber', form.orderNumber);

    try {
      const { data } = await uploadTrainingVideo(fd, {
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      if (data.success) {
        toast.success('Video uploaded successfully!');
        setForm({ title: '', description: '', category: 'platform-tutorial', isMandatory: false, orderNumber: 1 });
        setVideoFile(null);
        setUploadProgress(0);
        fetchAll();
      }
    } catch { toast.error('Upload failed. Check file size.'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (video) => {
    await deleteTrainingVideo(video._id);
    toast.success('Video deleted');
    fetchAll();
  };

  const completedPct = summaryStats.total > 0
    ? Math.round((summaryStats.completed / summaryStats.total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Training Videos</h1>
        <p className="text-white/40 text-sm mt-1">Upload and manage teacher training content</p>
      </div>

      {/* Progress Summary */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold">
            <span className="text-gold">{summaryStats.completed}</span> of{' '}
            <span className="text-white">{summaryStats.total}</span> teachers completed all mandatory training
          </p>
          <span className={`text-sm font-bold ${completedPct >= 75 ? 'text-green-400' : completedPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {completedPct}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completedPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${completedPct >= 75 ? 'bg-green-500' : completedPct >= 50 ? 'bg-gold' : 'bg-red-500'}`}
          />
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <h3 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
          <FiUpload className="text-gold" size={18} /> Upload Training Video
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. How to go live" required />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{CategoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Order Number</label>
              <input type="number" min="1" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: parseInt(e.target.value) || 1 })} className="input-field" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <button type="button" onClick={() => setForm({ ...form, isMandatory: !form.isMandatory })}
                className={`relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none ${form.isMandatory ? 'bg-gold' : 'bg-white/20'}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transform transition-transform ${form.isMandatory ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className="text-white/70 text-sm">{form.isMandatory ? '🔴 Mandatory' : '⚪ Optional'}</span>
            </div>
          </div>

          <div>
            <label className="input-label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-field resize-none" placeholder="Brief description of this video..." />
          </div>

          {/* Video File Upload */}
          <div>
            <label className="input-label">Video File (MP4/WebM, max 500MB)</label>
            {!videoFile ? (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-all">
                <FiUpload className="text-white/30 mb-2" size={28} />
                <p className="text-white/50 text-sm">Click to select video file</p>
                <p className="text-white/20 text-xs mt-1">MP4 or WebM format · Max 500MB</p>
                <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                <FiUpload className="text-gold" size={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{videoFile.name}</p>
                  <p className="text-white/40 text-xs">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button type="button" onClick={() => setVideoFile(null)} className="text-white/30 hover:text-red-400 transition-colors"><FiX size={16} /></button>
              </div>
            )}
          </div>

          {uploading && <UploadProgress progress={uploadProgress} />}

          <button type="submit" disabled={uploading || !videoFile}
            className="bg-gold text-navy font-semibold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60 flex items-center gap-2">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            ) : <FiUpload size={16} />}
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
          </button>
        </form>
      </div>

      {/* Videos Table */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="text-white font-semibold text-lg">All Training Videos ({videos.length})</h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-white/30">
            <FiUpload size={40} className="mx-auto mb-3 opacity-20" />
            <p>No training videos yet. Upload the first one!</p>
          </div>
        ) : (
          <div>
            {videos.map((video) => {
              const progress = progressData.find((p) => p.videoId === video._id);
              const watchedCount = progress?.watchedBy?.length || 0;
              const totalTeachers = summaryStats.total || 1;
              const isExpanded = expandedRow === video._id;

              return (
                <div key={video._id} className="border-b border-white/5 last:border-0">
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : video._id)}
                    className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                      {video.thumbnailUrl
                        ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/20 text-xs">No thumb</div>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{video.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${categoryColor(video.category)}`}>{CategoryLabel(video.category)}</span>
                        {video.isMandatory && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">Mandatory</span>}
                      </div>
                    </div>

                    <div className="text-center flex-shrink-0">
                      <p className="text-white/60 text-xs">{formatDuration(video.duration)}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <FiUsers className="text-white/30" size={12} />
                      <span className="text-white/60 text-sm">{watchedCount}/{totalTeachers}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={video.cloudinaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400/60 hover:text-blue-400 border border-blue-500/20 hover:border-blue-500/40 p-1.5 rounded-lg transition-all"
                        title="Play in browser"
                        onClick={e => e.stopPropagation()}
                      >
                        <FiPlay size={13} />
                      </a>
                      <a
                        href={video.cloudinaryUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400/60 hover:text-green-400 border border-green-500/20 hover:border-green-500/40 p-1.5 rounded-lg transition-all"
                        title="Download Video"
                        onClick={e => e.stopPropagation()}
                      >
                        <FiDownload size={13} />
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteModal(video); }}
                        className="text-red-400/60 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 p-1.5 rounded-lg transition-all"
                        title="Delete"
                      >
                        <FiTrash2 size={13} />
                      </button>
                      {isExpanded ? <FiChevronUp size={16} className="text-white/30" /> : <FiChevronDown size={16} className="text-white/30" />}
                    </div>
                  </div>

                  {/* Expanded: Teacher grid */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 pt-4">
                          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Teacher Progress</p>
                          {progress?.watchedBy ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                              {progress.watchedBy.map((entry) => (
                                <div key={entry.teacher?._id} className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${entry.completed ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-white/5'}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${entry.completed ? 'bg-green-500/20' : 'bg-white/10'}`}>
                                    {entry.completed ? <FiCheck size={10} className="text-green-400" /> : <FiX size={10} className="text-white/30" />}
                                  </div>
                                  <span className="text-white/70 truncate">{entry.teacher?.displayName || entry.teacher?.name || '—'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-white/30 text-sm">No progress data available</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteModal
            video={deleteModal}
            onClose={() => setDeleteModal(null)}
            onConfirm={() => handleDelete(deleteModal)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
