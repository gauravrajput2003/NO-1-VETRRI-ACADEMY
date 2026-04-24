import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiList, FiCalendar, FiPlay, FiX } from 'react-icons/fi';
import { getSchedules } from '../../services/api';
import api from '../../services/api';
import VideoPlayer from '../../components/VideoPlayer';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatusBadge({ status }) {
  const map = {
    scheduled: 'badge-blue',
    live: 'badge-green',
    completed: 'bg-white/10 text-white/50',
    cancelled: 'badge-red',
  };
  return <span className={`badge ${map[status] || 'bg-white/10 text-white/50'} capitalize`}>{status}</span>;
}

function CalendarView({ classes }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const classMap = {};
  classes.forEach((cls) => {
    const d = new Date(cls.scheduledDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!classMap[key]) classMap[key] = [];
      classMap[key].push(cls);
    }
  });

  const dotColor = (cls) => {
    if (cls.status === 'completed') return 'bg-green-500';
    if (cls.status === 'cancelled') return 'bg-red-500';
    return 'bg-gold';
  };

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  const dayClasses = selectedDay ? (classMap[selectedDay] || []) : [];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-4">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">‹</button>
        <p className="text-white font-semibold">{MONTHS_SHORT[month]} {year}</p>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">›</button>
      </div>

      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <p key={d} className="text-center text-white/30 text-xs font-semibold py-2">{d}</p>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const hasClass = classMap[day]?.length > 0;
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-center h-10 w-full rounded-lg transition-all ${
                  isSelected ? 'bg-gold text-navy font-bold' :
                  isToday ? 'ring-1 ring-gold text-gold font-semibold' :
                  'hover:bg-white/10 text-white/70'
                }`}
              >
                <span className="text-sm">{day}</span>
                {hasClass && !isSelected && (
                  <div className="flex gap-0.5 mt-0.5">
                    {classMap[day].slice(0, 3).map((c, ci) => (
                      <span key={ci} className={`w-1 h-1 rounded-full ${dotColor(c)}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day details */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 border-t border-white/10 pt-4 space-y-2 overflow-hidden">
              <p className="text-white/60 text-sm font-medium">{selectedDay} {MONTHS_SHORT[month]}</p>
              {dayClasses.length === 0 ? (
                <p className="text-white/30 text-sm">No classes this day</p>
              ) : dayClasses.map((cls) => (
                <div key={cls._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{cls.subject}</p>
                    <p className="text-white/40 text-xs">{cls.teacher?.displayName || '—'} · {new Date(cls.scheduledTime || cls.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <StatusBadge status={cls.status} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MyClasses() {
  const [tab, setTab] = useState('schedule');
  const [view, setView] = useState('list');
  const [classes, setClasses] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [activeRecording, setActiveRecording] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({ attended: 0, total: 0 });

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data } = await getSchedules();
      if (data.success) {
        const all = data.classes || [];
        setClasses(all);
        const recs = all.filter((c) => c.status === 'completed' && c.recordingUrl);
        setRecordings(recs);
        const now = new Date();
        const thisMonth = all.filter((c) => {
          const d = new Date(c.scheduledDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const attended = thisMonth.filter((c) => c.myStatus === 'present').length;
        setAttendanceSummary({ attended, total: thisMonth.length });
      }
    } catch { toast.error('Failed to load classes'); }
    finally { setLoading(false); }
  };

  const subjects = [...new Set(classes.map((c) => c.subject).filter(Boolean))];
  const MONTHS_LIST = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const filteredClasses = classes.filter((c) => {
    if (subjectFilter && c.subject !== subjectFilter) return false;
    if (monthFilter) {
      const d = new Date(c.scheduledDate);
      if (d.getMonth() !== parseInt(monthFilter)) return false;
    }
    return true;
  });

  // Group by week
  const grouped = {};
  filteredClasses.forEach((cls) => {
    const d = new Date(cls.scheduledDate);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cls);
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  const attendancePct = attendanceSummary.total ? Math.round((attendanceSummary.attended / attendanceSummary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">My Classes</h1>
        <p className="text-white/40 text-sm mt-1">Schedule, recordings, and attendance overview</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {['schedule', 'recordings'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize transition-all -mb-px ${tab === t ? 'border-gold text-gold' : 'border-transparent text-white/40 hover:text-white/70'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Attendance summary */}
          <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/70 text-sm">
                You have attended <span className="text-white font-semibold">{attendanceSummary.attended}</span> of{' '}
                <span className="text-white font-semibold">{attendanceSummary.total}</span> classes this month ({attendancePct}%)
              </p>
              <span className={`text-xs font-bold ${attendancePct >= 75 ? 'text-green-400' : attendancePct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {attendancePct >= 75 ? 'Good 👍' : attendancePct >= 50 ? 'Average ⚠️' : 'Low ❗'}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${attendancePct >= 75 ? 'bg-green-500' : attendancePct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${attendancePct}%` }}
              />
            </div>
          </div>

          {/* View toggle + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-all ${view === 'list' ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white/70'}`}>
                <FiList size={14} /> List
              </button>
              <button onClick={() => setView('calendar')} className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-all ${view === 'calendar' ? 'bg-gold/20 text-gold' : 'text-white/40 hover:text-white/70'}`}>
                <FiCalendar size={14} /> Calendar
              </button>
            </div>
            {view === 'list' && (
              <>
                <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="input-field py-1.5 text-xs">
                  <option value="">All Subjects</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="input-field py-1.5 text-xs">
                  <option value="">All Months</option>
                  {MONTHS_LIST.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </>
            )}
          </div>

          {view === 'calendar' ? (
            <CalendarView classes={classes} />
          ) : loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).sort(([a], [b]) => new Date(b) - new Date(a)).map(([week, clsList]) => (
                <div key={week}>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
                    Week of {new Date(week).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                  <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
                    {clsList.map((cls, idx) => (
                      <div key={cls._id} className={`flex items-center justify-between p-4 hover:bg-white/5 transition-all ${idx !== 0 ? 'border-t border-white/5' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <FiCalendar className="text-gold" size={14} />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{cls.subject}</p>
                            <p className="text-white/40 text-xs">{cls.teacher?.displayName || '—'} · {formatDate(cls.scheduledDate)} · {formatTime(cls.scheduledTime)}</p>
                          </div>
                        </div>
                        <StatusBadge status={cls.status} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <div className="text-center py-16 text-white/30">
                  <FiCalendar size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No classes found for the selected filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'recordings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <FiPlay size={40} className="mx-auto mb-3 opacity-20" />
              <p>No recordings available yet</p>
              <p className="text-sm mt-1 text-white/20">Completed class recordings will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordings.map((cls) => (
                <motion.div
                  key={cls._id}
                  whileHover={{ y: -4 }}
                  className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden hover:border-gold/30 transition-all"
                >
                  <div className="relative bg-black/40 h-32 flex items-center justify-center">
                    <div className="w-14 h-14 bg-gold/10 rounded-full flex items-center justify-center border border-gold/20">
                      <FiPlay className="text-gold" size={22} />
                    </div>
                    {cls.duration && (
                      <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white/70 px-1.5 py-0.5 rounded">
                        {Math.floor(cls.duration / 60)}m
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-white font-semibold text-sm">{cls.subject}</p>
                    <p className="text-white/40 text-xs mt-1">{cls.teacher?.displayName || '—'}</p>
                    <p className="text-white/30 text-xs">{formatDate(cls.scheduledDate)}</p>
                    <button
                      onClick={() => setActiveRecording(cls)}
                      className="w-full mt-3 bg-gold/10 text-gold border border-gold/20 py-2 rounded-lg text-sm font-semibold hover:bg-gold/20 transition-all flex items-center justify-center gap-2"
                    >
                      <FiPlay size={14} /> Watch
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recording Modal */}
      <AnimatePresence>
        {activeRecording && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setActiveRecording(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                  <p className="text-white font-semibold">{activeRecording.subject}</p>
                  <p className="text-white/40 text-xs">{formatDate(activeRecording.scheduledDate)}</p>
                </div>
                <button onClick={() => setActiveRecording(null)} className="text-white/40 hover:text-white p-1"><FiX size={18} /></button>
              </div>
              <VideoPlayer src={activeRecording.recordingUrl} className="max-h-[60vh]" title={activeRecording.subject} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
