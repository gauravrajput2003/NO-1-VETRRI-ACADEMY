import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiRadio, FiStopCircle, FiUploadCloud, FiLink, FiUsers, FiClock,
  FiCheckCircle, FiAlertTriangle, FiChevronDown, FiChevronUp, FiBarChart2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getTodayClasses, getUpcomingClasses, goLive, endClass,
  getUploadSignature, uploadRecording, getClassAttendance,
} from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import UploadProgress from '../../components/UploadProgress';

// ─── Help Guide ───────────────────────────────────────────────────────────────
function HelpGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card rounded-xl border border-white/10 mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-white font-semibold text-sm">❓ How to conduct a class?</span>
        {open ? <FiChevronUp className="text-gold" /> : <FiChevronDown className="text-gold" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="px-5 py-5 grid md:grid-cols-2 gap-6 text-xs text-white/70 leading-relaxed">
              <div>
                <h4 className="text-gold font-semibold text-sm mb-3">🔴 LIVE CLASS</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-white/90 mb-1">Option A — Google Meet (up to 60 min, free):</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <span className="text-gold">meet.google.com</span></li>
                      <li>Click "New Meeting" → "Start an instant meeting"</li>
                      <li>Copy the meeting link</li>
                      <li>Paste in dashboard → Click <span className="text-red-400 font-semibold">GO LIVE</span></li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-white/90 mb-1">Option B — Jitsi Meet (unlimited time, no account needed):</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <span className="text-gold">meet.jit.si</span></li>
                      <li>Type room name: <span className="text-blue-400">VettriAcademy-[Subject]-[Grade]</span></li>
                      <li>Copy the link from browser</li>
                      <li>Paste in dashboard → Click <span className="text-red-400 font-semibold">GO LIVE</span></li>
                    </ol>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-gold font-semibold text-sm mb-3">📹 RECORDING (OBS Studio)</h4>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Download OBS Studio from <span className="text-gold">obsproject.com</span> (free, one time)</li>
                  <li>Open OBS before starting your class</li>
                  <li>Click <span className="font-semibold text-white">"Start Recording"</span> in OBS</li>
                  <li>Conduct your class normally on Google Meet / Jitsi</li>
                  <li>After class: click <span className="font-semibold text-white">"Stop Recording"</span> in OBS</li>
                  <li>File saves automatically on your computer</li>
                  <li>Come back to dashboard → Upload Recording → Select file</li>
                  <li>Wait for upload to complete (do not close browser)</li>
                  <li>Students will see recording automatically ✅</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────
function AttendanceModal({ classId, onClose }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClassAttendance(classId).then(({ data }) => {
      if (data.success) setAttendance(data.attendance);
      setLoading(false);
    });
  }, [classId]);

  const statusColor = { present: 'text-green-400', late: 'text-amber-400', absent: 'text-red-400' };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-navy border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold">Class Attendance</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <p className="text-center text-white/40 py-8">Loading...</p>
          ) : attendance.length === 0 ? (
            <p className="text-center text-white/40 py-8">No attendance records yet.</p>
          ) : (
            attendance.map((rec) => (
              <div key={rec._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <img
                  src={rec.studentId?.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.studentId?._id}`}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{rec.studentId?.displayName || rec.studentId?.name}</p>
                  <p className="text-white/40 text-xs">{rec.studentId?.grade}</p>
                </div>
                <span className={`text-xs font-semibold capitalize ${statusColor[rec.status] || 'text-white/40'}`}>
                  {rec.status}
                </span>
                {rec.joinTime && (
                  <span className="text-xs text-white/30">{new Date(rec.joinTime).toLocaleTimeString('en-IN')}</span>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Upload Recording Panel ───────────────────────────────────────────────────
function UploadRecordingPanel({ classId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      // Get Cloudinary signature from backend
      const { data: signData } = await getUploadSignature({ folder: 'vettri-academy/recordings' });

      // Direct upload to Cloudinary with XMLHttpRequest for progress
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder);
      formData.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      });

      await new Promise((resolve, reject) => {
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`);
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
          else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      }).then(async (result) => {
        // Save recording URL to backend
        await uploadRecording(classId, {
          recordingUrl: result.secure_url,
          recordingPublicId: result.public_id,
          recordingDuration: result.duration,
        });
        setDone(true);
        onSuccess?.();
      });
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!done && (
        <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-gold/40 transition-colors">
          <input
            type="file"
            accept="video/mp4,video/webm,video/mov,.mp4,.webm,.mov"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="recording-upload"
            disabled={uploading}
          />
          <label htmlFor="recording-upload" className="cursor-pointer">
            <FiUploadCloud size={32} className="mx-auto text-white/30 mb-2" />
            <p className="text-white/60 text-sm">
              {file ? file.name : 'Click to select MP4 / WebM recording'}
            </p>
            {file && (
              <p className="text-white/30 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            )}
          </label>
        </div>
      )}

      <UploadProgress
        progress={progress}
        fileName={file?.name}
        fileSize={file?.size}
        isUploading={uploading}
        isDone={done}
        error={error}
      />

      {file && !uploading && !done && (
        <button
          onClick={handleUpload}
          className="w-full btn-primary py-3"
        >
          <FiUploadCloud size={16} />
          Upload Recording to Cloudinary
        </button>
      )}
    </div>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────
function TeacherClassCard({ cls, onUpdate }) {
  const [meetLink, setMeetLink] = useState('');
  const [meetLinkType, setMeetLinkType] = useState('googlemeet');
  const [isValidLink, setIsValidLink] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [status, setStatus] = useState(cls.status);
  const [liveCount, setLiveCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const { socket } = useSocket();

  // Real-time student join count
  useEffect(() => {
    if (!socket || status !== 'live') return;
    const handler = ({ classId, count }) => {
      if (classId === cls._id) setLiveCount(count);
    };
    socket.on('student:joined', handler);
    return () => socket.off('student:joined', handler);
  }, [socket, status]);

  // Elapsed timer when live
  useEffect(() => {
    if (status !== 'live') return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const validateLink = (val) => {
    setMeetLink(val);
    try { new URL(val); setIsValidLink(true); } catch { setIsValidLink(false); }
  };

  const handleGoLive = async () => {
    if (!isValidLink) return;
    setIsGoingLive(true);
    try {
      await goLive(cls._id, { meetLink, meetLinkType });
      setStatus('live');
      toast.success('🔴 Class is now LIVE! Students can join.');
      onUpdate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to go live');
    } finally {
      setIsGoingLive(false);
    }
  };

  const handleEndClass = async () => {
    setIsEnding(true);
    try {
      await endClass(cls._id);
      setStatus('completed');
      setShowConfirmEnd(false);
      toast.success('Class ended. You can now upload the recording.');
      onUpdate?.();
    } catch (err) {
      toast.error('Failed to end class');
    } finally {
      setIsEnding(false);
    }
  };

  const elapsedStr = () => {
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  return (
    <motion.div
      layout
      className={`glass-card rounded-2xl p-5 border transition-all duration-300 ${
        status === 'live'
          ? 'border-red-500/40 shadow-lg shadow-red-500/10'
          : status === 'completed'
          ? 'border-green-500/20'
          : 'border-white/10'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-gold/20 text-gold text-xs font-bold px-2 py-0.5 rounded-full">{cls.course}</span>
            <span className="text-white/40 text-xs">Grade {cls.grade}</span>
          </div>
          <h3 className="text-white font-bold text-lg">{cls.subject}</h3>
          <p className="text-white/50 text-sm mt-0.5">
            Today at {cls.scheduledTime} · {cls.durationMinutes} min
          </p>
        </div>
        <div className="text-right">
          {status === 'live' ? (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-bold text-sm">LIVE</span>
            </div>
          ) : status === 'completed' ? (
            <span className="text-green-400 text-sm flex items-center gap-1"><FiCheckCircle size={14} /> Completed</span>
          ) : (
            <span className="text-white/40 text-xs">Scheduled</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
        <span className="flex items-center gap-1"><FiUsers size={12} />{cls.studentIds?.length || 0} students enrolled</span>
        {status === 'live' && <span className="text-green-400 font-semibold">{liveCount} joined</span>}
        {status === 'live' && <span className="flex items-center gap-1 text-amber-400"><FiClock size={12} />{elapsedStr()}</span>}
      </div>

      {/* Pre-live: show form 15 min before (or any time for demo) */}
      {status === 'scheduled' && (
        <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/70 text-xs font-medium">
            📝 Step 1: Create a meeting link (Google Meet or Jitsi) and paste it below
          </p>

          <select
            value={meetLinkType}
            onChange={(e) => setMeetLinkType(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="googlemeet">Google Meet</option>
            <option value="jitsi">Jitsi Meet</option>
            <option value="zoom">Zoom</option>
            <option value="other">Other</option>
          </select>

          <div className="relative">
            <FiLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="url"
              value={meetLink}
              onChange={(e) => validateLink(e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className={`w-full bg-white/10 border rounded-lg pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors ${
                meetLink ? (isValidLink ? 'border-green-500/50' : 'border-red-500/50') : 'border-white/20'
              }`}
            />
            {meetLink && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${isValidLink ? 'text-green-400' : 'text-red-400'}`}>
                {isValidLink ? '✓' : '✗'}
              </span>
            )}
          </div>

          <button
            onClick={handleGoLive}
            disabled={!isValidLink || isGoingLive}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            {isGoingLive ? 'Going Live...' : '🔴 GO LIVE'}
          </button>
        </div>
      )}

      {/* Live controls */}
      {status === 'live' && (
        <div className="space-y-3">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-red-300 text-sm font-semibold">🔴 Class is Live · {liveCount} student{liveCount !== 1 ? 's' : ''} joined</p>
            <p className="text-white/40 text-xs mt-0.5">Students can see "JOIN NOW" on their dashboard</p>
          </div>
          {!showConfirmEnd ? (
            <button
              onClick={() => setShowConfirmEnd(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all"
            >
              <FiStopCircle size={16} />
              End Class
            </button>
          ) : (
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <p className="text-white/60 text-xs text-center">⚠️ Are you sure you want to end the class?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowConfirmEnd(false)} className="flex-1 py-2 rounded-lg text-sm border border-white/20 text-white/40 hover:text-white">Cancel</button>
                <button onClick={handleEndClass} disabled={isEnding} className="flex-1 py-2 rounded-lg text-sm bg-red-600 text-white font-semibold hover:bg-red-500 disabled:opacity-40">
                  {isEnding ? 'Ending...' : 'Yes, End Class'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post-class: upload + attendance */}
      {status === 'completed' && (
        <div className="space-y-3">
          {!cls.recordingUrl && (
            <>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border border-gold/30 text-gold hover:bg-gold/10 transition-all"
              >
                <FiUploadCloud size={16} />
                📹 Upload Recording
              </button>
              {showUpload && <UploadRecordingPanel classId={cls._id} onSuccess={() => setShowUpload(false)} />}
            </>
          )}
          {cls.recordingUrl && (
            <div className="flex items-center gap-2 p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <FiCheckCircle className="text-green-400" size={16} />
              <p className="text-green-300 text-xs font-semibold">Recording available for students ✅</p>
            </div>
          )}
          <button
            onClick={() => setShowAttendance(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
          >
            <FiBarChart2 size={16} />
            📊 View Attendance
          </button>
        </div>
      )}

      {showAttendance && <AttendanceModal classId={cls._id} onClose={() => setShowAttendance(false)} />}
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherLiveClass() {
  const [todayClasses, setTodayClasses] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    try {
      const [todayRes, upcomingRes] = await Promise.all([
        getTodayClasses(),
        getUpcomingClasses(),
      ]);
      if (todayRes.data.success) setTodayClasses(todayRes.data.classes);
      if (upcomingRes.data.success) {
        setUpcomingClasses(upcomingRes.data.classes.filter((c) => {
          const d = new Date(c.scheduledDate);
          const today = new Date(); today.setHours(0,0,0,0);
          return d > today;
        }));
      }
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Live Classes</h1>
        <p className="text-white/50 text-sm mt-1">Manage your live sessions and recording uploads</p>
      </div>

      {/* Today's Classes */}
      <section>
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Today's Classes
        </h2>
        {loading ? (
          <div className="grid gap-4">{[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        ) : todayClasses.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10">
            <FiRadio size={32} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {todayClasses.map((cls) => (
              <TeacherClassCard key={cls._id} cls={cls} onUpdate={fetchClasses} />
            ))}
          </div>
        )}
        <HelpGuide />
      </section>

      {/* Upcoming */}
      {upcomingClasses.length > 0 && (
        <section>
          <h2 className="text-white font-semibold mb-3">📅 Upcoming Classes (Next 7 Days)</h2>
          <div className="grid gap-3">
            {upcomingClasses.slice(0, 5).map((cls) => (
              <div key={cls._id} className="glass-card rounded-xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-12 text-center">
                  <p className="text-gold font-bold text-sm">{new Date(cls.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric' })}</p>
                  <p className="text-white/40 text-xs">{new Date(cls.scheduledDate).toLocaleDateString('en-IN', { month: 'short' })}</p>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{cls.subject}</p>
                  <p className="text-white/40 text-xs">{cls.scheduledTime} · Grade {cls.grade} · {cls.studentIds?.length || 0} students</p>
                </div>
                <span className="bg-white/5 text-white/40 text-xs px-2 py-1 rounded-lg">{cls.course}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
