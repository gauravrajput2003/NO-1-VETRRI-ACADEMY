import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiSearch, FiCheck, FiAlertTriangle, FiPlay, FiClock } from 'react-icons/fi';
import { getTrainingVideos, markVideoComplete, updateVideoProgress, getIncompleteMandatoryCount } from '../../services/api';

const formatDuration = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

function SkeletonCard() {
  return (
    <div className="p-3 rounded-xl border border-white/5 space-y-2 animate-pulse">
      <div className="h-16 bg-white/10 rounded-lg" />
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2 bg-white/10 rounded w-1/2" />
      <div className="h-1.5 bg-white/10 rounded-full" />
    </div>
  );
}

export default function TrainingVideos() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mandatoryPending, setMandatoryPending] = useState(0);
  const [progress, setProgress] = useState({});
  const [markingDone, setMarkingDone] = useState(false);
  const [showMarkBtn, setShowMarkBtn] = useState(false);
  const videoRef = useRef(null);
  const progressSaveTimer = useRef(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [videosRes, pendingRes] = await Promise.all([
        getTrainingVideos(),
        getIncompleteMandatoryCount(),
      ]);
      if (videosRes.data.success) {
        const vids = videosRes.data.videos || [];
        setVideos(vids);
        if (vids.length && !selected) setSelected(vids[0]);
        // Build progress map
        const map = {};
        vids.forEach((v) => {
          map[v._id] = {
            percent: v.progress?.percentWatched || 0,
            completed: v.progress?.completed || false,
          };
        });
        setProgress(map);
      }
      if (pendingRes.data.success) {
        setMandatoryPending(pendingRes.data.count || 0);
      }
    } catch {
      toast.error('Failed to load training videos');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !selected) return;
    const pct = (video.currentTime / video.duration) * 100;
    setShowMarkBtn(pct >= 90 && !progress[selected._id]?.completed);

    // Debounce progress save
    clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = setTimeout(async () => {
      if (pct > (progress[selected._id]?.percent || 0)) {
        try {
          await updateVideoProgress(selected._id, {
            currentTime: video.currentTime,
            duration: video.duration,
            percentWatched: Math.floor(pct),
          });
          setProgress((p) => ({
            ...p,
            [selected._id]: { ...p[selected._id], percent: Math.floor(pct) },
          }));
        } catch {}
      }
    }, 3000);
  }, [selected, progress]);

  const handleMarkComplete = async () => {
    if (!selected || markingDone) return;
    setMarkingDone(true);
    try {
      await markVideoComplete(selected._id, {
        currentTime: videoRef.current?.currentTime,
        duration: videoRef.current?.duration,
        percentWatched: 100,
      });
      setProgress((p) => ({
        ...p,
        [selected._id]: { percent: 100, completed: true },
      }));
      setVideos((vs) =>
        vs.map((v) =>
          v._id === selected._id
            ? { ...v, progress: { completed: true, percentWatched: 100 } }
            : v
        )
      );
      if (selected.isMandatory) {
        setMandatoryPending((n) => Math.max(0, n - 1));
      }
      setShowMarkBtn(false);
      toast.success('✅ Marked as complete!');
    } catch {
      toast.error('Failed to mark complete');
    } finally {
      setMarkingDone(false);
    }
  };

  const filtered = videos.filter(
    (v) =>
      v.title?.toLowerCase().includes(search.toLowerCase()) ||
      v.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColor = (cat) => {
    const map = {
      'platform-tutorial': 'bg-blue-500/20 text-blue-400',
      'teaching-methods': 'bg-purple-500/20 text-purple-400',
      'technical-setup': 'bg-teal-500/20 text-teal-400',
      other: 'bg-white/10 text-white/50',
    };
    return map[cat] || map.other;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Training Videos</h1>
        <p className="text-white/40 text-sm mt-1">Complete all mandatory training to unlock full platform access</p>
      </div>

      {/* Warning Banner */}
      {mandatoryPending > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10"
        >
          <FiAlertTriangle className="text-yellow-400 flex-shrink-0" size={20} />
          <p className="text-yellow-300 text-sm font-medium">
            ⚠️ You have <span className="font-bold">{mandatoryPending}</span> mandatory training{' '}
            {mandatoryPending === 1 ? 'video' : 'videos'} pending. Please complete{' '}
            {mandatoryPending === 1 ? 'it' : 'them'} to ensure full platform access.
          </p>
        </motion.div>
      )}

      {/* Split Panel */}
      <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[500px]">
        {/* Left Panel — Video List */}
        <div className="w-[35%] flex flex-col gap-3 overflow-hidden">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              placeholder="Search videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : filtered.map((v) => {
                  const prog = progress[v._id] || {};
                  const isMandatoryIncomplete = v.isMandatory && !prog.completed;
                  const isSelected = selected?._id === v._id;
                  return (
                    <motion.div
                      key={v._id}
                      onClick={() => {
                        setSelected(v);
                        setShowMarkBtn(false);
                      }}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-gold/50 bg-gold/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative h-16 rounded-lg overflow-hidden mb-2 bg-black/30">
                        {v.thumbnailUrl ? (
                          <img
                            src={v.thumbnailUrl}
                            alt={v.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPlay className="text-white/20" size={24} />
                          </div>
                        )}
                        {prog.completed && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <FiCheck size={10} className="text-white" />
                          </div>
                        )}
                        {isMandatoryIncomplete && (
                          <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            MANDATORY
                          </div>
                        )}
                      </div>

                      <p className="text-white text-xs font-semibold line-clamp-2 mb-1">{v.title}</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${categoryColor(v.category)}`}>
                          {v.category?.replace('-', ' ')}
                        </span>
                        <span className="text-white/30 text-[10px] flex items-center gap-1">
                          <FiClock size={9} />
                          {formatDuration(v.duration)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${prog.completed ? 'bg-green-500' : 'bg-gold'}`}
                          style={{ width: `${prog.percent || 0}%` }}
                        />
                      </div>
                      <p className="text-white/30 text-[10px] mt-0.5">{prog.percent || 0}% watched</p>
                    </motion.div>
                  );
                })}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-white/30">
                <FiPlay size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No videos found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Player */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {selected ? (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl">
                <video
                  ref={videoRef}
                  key={selected._id}
                  src={selected.cloudinaryUrl}
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full rounded-xl max-h-[420px]"
                  playsInline
                />
              </div>

              <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-white text-xl font-semibold">{selected.title}</h2>
                    <a href={selected.cloudinaryUrl} download target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-sm text-gold hover:text-yellow-400 hover:underline">
                      Download Video ↓
                    </a>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColor(selected.category)}`}>
                        {selected.category?.replace('-', ' ')}
                      </span>
                      {selected.isMandatory && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-medium">
                          Mandatory
                        </span>
                      )}
                      {progress[selected._id]?.completed && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 font-medium flex items-center gap-1">
                          <FiCheck size={10} /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                  {showMarkBtn && !progress[selected._id]?.completed && (
                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={handleMarkComplete}
                      disabled={markingDone}
                      className="flex-shrink-0 bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center gap-2"
                    >
                      {markingDone ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiCheck size={16} />
                      )}
                      Mark as Complete
                    </motion.button>
                  )}
                  {progress[selected._id]?.completed && (
                    <div className="flex-shrink-0 flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-xl text-sm font-semibold">
                      <FiCheck size={16} /> Completed ✅
                    </div>
                  )}
                </div>

                {selected.description && (
                  <p className="text-white/60 text-sm leading-relaxed">{selected.description}</p>
                )}

                <div className="flex items-center gap-4 pt-2 border-t border-white/10 text-xs text-white/40">
                  <span>Duration: {formatDuration(selected.duration)}</span>
                  <span>Order: #{selected.orderNumber || '—'}</span>
                  <span>Progress: {progress[selected._id]?.percent || 0}%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20">
              <div className="text-center">
                <FiPlay size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-lg">Select a video to begin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
