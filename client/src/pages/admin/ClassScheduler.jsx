import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiPlus, FiCalendar, FiEdit2, FiXCircle, FiUsers, FiX, FiCheck } from 'react-icons/fi';
import {
  createSchedule, getSchedules, cancelSchedule, generateYearSchedule,
  updateSchedule,
} from '../../services/api';
import api from '../../services/api';

const COURSES = ['CBSE', 'Matric', 'Engineering', 'Arts', 'Language', 'Competitive'];
const BOARDS = ['CBSE', 'State Board', 'Arts College', 'Eng College', 'TNPSC', 'TRB', 'TET'];
const GRADES = ['4th','5th','6th','7th','8th','9th','10th','11th','12th'];
const REPEAT_TYPES = ['once', 'weekly', 'daily'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const scheduleSchema = z.object({
  title: z.string().min(2, 'Title required'),
  course: z.string().min(1, 'Course required'),
  board: z.string().min(1, 'Board required'),
  subject: z.string().min(1, 'Subject required'),
  grade: z.string().min(1, 'Grade required'),
  teacher: z.string().min(1, 'Teacher required'),
  scheduledDate: z.string().min(1, 'Date required'),
  scheduledTime: z.string().min(1, 'Time required'),
  duration: z.coerce.number().min(15, 'Min 15 minutes').default(60),
  repeatType: z.enum(['once', 'weekly', 'daily']).default('once'),
  dayOfWeek: z.coerce.number().optional(),
});

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="py-3 px-4"><div className="h-3 bg-white/10 rounded w-3/4" /></td>
      ))}
    </tr>
  );
}

function CancelModal({ schedule, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) { toast.error('Reason required'); return; }
    setLoading(true);
    try { await onConfirm(reason); onClose(); }
    catch { toast.error('Failed to cancel'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0F1F35] border border-[#1E3A5F] rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Cancel Class</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white"><FiX size={18} /></button>
        </div>
        <p className="text-white/60 text-sm mb-4">Cancel: <span className="text-white font-medium">{schedule.title}</span></p>
        <div className="mb-4">
          <label className="input-label">Reason for Cancellation *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input-field resize-none" placeholder="e.g. Teacher unavailable, Holiday..." />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-white/20 text-white/60 py-2.5 rounded-xl hover:bg-white/5 transition-all">Back</button>
          <button onClick={confirm} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-60">
            {loading ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ClassScheduler() {
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { duration: 60, repeatType: 'once' },
  });

  const repeatType = watch('repeatType');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [teachersRes, studentsRes, schedulesRes] = await Promise.all([
        api.get('/admin/teachers', { params: { limit: 100 } }),
        api.get('/admin/students', { params: { limit: 500 } }),
        getSchedules(),
      ]);
      if (teachersRes.data.success) setTeachers(teachersRes.data.teachers || []);
      if (studentsRes.data.success) setStudents(studentsRes.data.students || []);
      if (schedulesRes.data.success) {
        setSchedules(schedulesRes.data.schedules || schedulesRes.data.classes || []);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const onSubmit = async (vals) => {
    if (selectedStudents.length === 0) { toast.error('Select at least one student'); return; }
    setSubmitting(true);
    try {
      const payload = {
        title: vals.title,
        course: vals.course,
        board: vals.board,
        subject: vals.subject,
        grade: vals.grade,
        teacherId: vals.teacher,
        studentIds: selectedStudents,
        scheduledDate: vals.scheduledDate,
        scheduledTime: vals.scheduledTime,
        durationMinutes: vals.duration || 60,
        repeatType: vals.repeatType,
        dayOfWeek: vals.repeatType === 'weekly' ? vals.dayOfWeek : undefined,
      };
      const { data } = await createSchedule(payload);
      if (data.success) {
        toast.success('Class scheduled successfully!');
        reset();
        setSelectedStudents([]);
        fetchAll();
      }
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to schedule class'); }
    finally { setSubmitting(false); }
  };

  const handleGenerateYear = async () => {
    const vals = watch();
    if (!vals.teacher || !vals.subject || !vals.scheduledTime) { toast.error('Fill teacher, subject, and time first'); return; }
    setGenerating(true);
    try {
      const { data } = await generateYearSchedule({
        teacherId: vals.teacher,
        subject: vals.subject,
        grade: vals.grade,
        course: vals.course,
        board: vals.board,
        startDate: vals.scheduledDate,
        scheduledTime: vals.scheduledTime,
        durationMinutes: vals.duration || 60,
        repeatType: vals.repeatType,
        dayOfWeek: vals.dayOfWeek,
        studentIds: selectedStudents,
      });
      if (data.success) {
        toast.success(`✅ Generated ${data.created || data.count || 0} classes for the year!`);
        fetchAll();
      }
    } catch { toast.error('Failed to generate schedule'); }
    finally { setGenerating(false); }
  };

  const handleCancel = async (schedule, reason) => {
    await cancelSchedule(schedule._id, { reason });
    toast.success('Class cancelled');
    fetchAll();
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const filteredStudents = students.filter((s) =>
    (s.displayName || s.name || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredTeachers = teachers.filter((t) =>
    (t.displayName || t.name || '').toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const filteredSchedules = schedules.filter((s) => {
    if (filterTeacher && s.teacherId?._id !== filterTeacher) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterGrade && s.grade !== filterGrade) return false;
    return true;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (t) => {
    if (!t) return '—';
    if (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? t : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Class Scheduler</h1>
        <p className="text-white/40 text-sm mt-1">Create and manage class schedules for teachers and students</p>
      </div>

      {/* CREATE FORM */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <h3 className="text-white font-semibold text-lg mb-5 flex items-center gap-2">
          <FiPlus className="text-gold" size={18} /> Create New Class
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Title *</label>
              <input {...register('title')} className="input-field" placeholder="e.g. Maths Chapter 5" />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="input-label">Course *</label>
              <select {...register('course')} className="input-field">
                <option value="">Select Course</option>
                {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.course && <p className="text-red-400 text-xs mt-1">{errors.course.message}</p>}
            </div>
            <div>
              <label className="input-label">Board *</label>
              <select {...register('board')} className="input-field">
                <option value="">Select Board</option>
                {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.board && <p className="text-red-400 text-xs mt-1">{errors.board.message}</p>}
            </div>
            <div>
              <label className="input-label">Subject *</label>
              <input {...register('subject')} className="input-field" placeholder="e.g. Mathematics" />
              {errors.subject && <p className="text-red-400 text-xs mt-1">{errors.subject.message}</p>}
            </div>
            <div>
              <label className="input-label">Grade *</label>
              <select {...register('grade')} className="input-field">
                <option value="">Select Grade</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.grade && <p className="text-red-400 text-xs mt-1">{errors.grade.message}</p>}
            </div>
            <div>
              <label className="input-label">Date *</label>
              <input {...register('scheduledDate')} type="date" className="input-field" />
              {errors.scheduledDate && <p className="text-red-400 text-xs mt-1">{errors.scheduledDate.message}</p>}
            </div>
            <div>
              <label className="input-label">Time *</label>
              <input {...register('scheduledTime')} type="time" className="input-field" />
              {errors.scheduledTime && <p className="text-red-400 text-xs mt-1">{errors.scheduledTime.message}</p>}
            </div>
            <div>
              <label className="input-label">Duration (minutes)</label>
              <input {...register('duration')} type="number" min="15" className="input-field" placeholder="60" />
            </div>
            <div>
              <label className="input-label">Repeat</label>
              <select {...register('repeatType')} className="input-field">
                {REPEAT_TYPES.map((r) => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            {repeatType === 'weekly' && (
              <div>
                <label className="input-label">Day of Week</label>
                <select {...register('dayOfWeek')} className="input-field">
                  {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Teacher selector */}
          <div>
            <label className="input-label">Teacher *</label>
            <div className="space-y-2">
              <input
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher..."
                className="input-field"
              />
              <div className="max-h-36 overflow-y-auto bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                {filteredTeachers.slice(0, 20).map((t) => (
                  <label key={t._id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-all">
                    <input {...register('teacher')} type="radio" value={t._id} className="accent-gold" />
                    <span className="text-white text-sm">{t.displayName || t.name}</span>
                    <span className="text-white/30 text-xs ml-auto">{t.qualification}</span>
                  </label>
                ))}
              </div>
            </div>
            {errors.teacher && <p className="text-red-400 text-xs mt-1">{errors.teacher.message}</p>}
          </div>

          {/* Student multi-select */}
          <div>
            <label className="input-label">Students * ({selectedStudents.length} selected)</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="input-field flex-1"
                />
                <button type="button" onClick={() => setSelectedStudents(filteredStudents.slice(0, 50).map((s) => s._id))}
                  className="text-xs border border-gold/30 text-gold px-3 py-2 rounded-xl hover:bg-gold/10 transition-all whitespace-nowrap">
                  Select All
                </button>
                <button type="button" onClick={() => setSelectedStudents([])}
                  className="text-xs border border-white/20 text-white/60 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
                  Clear
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                {filteredStudents.slice(0, 50).map((s) => {
                  const sel = selectedStudents.includes(s._id);
                  return (
                    <label key={s._id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-all ${sel ? 'bg-gold/5' : ''}`}>
                      <div onClick={() => toggleStudent(s._id)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 ${sel ? 'bg-gold border-gold' : 'border-white/20'}`}>
                        {sel && <FiCheck size={10} className="text-navy" />}
                      </div>
                      <span className="text-white text-sm flex-1">{s.displayName || s.name}</span>
                      <span className="text-white/30 text-xs">{s.grade}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {(repeatType === 'weekly' || repeatType === 'daily') && (
              <button type="button" onClick={handleGenerateYear} disabled={generating}
                className="border border-gold/40 text-gold px-5 py-2.5 rounded-xl hover:bg-gold/10 transition-all disabled:opacity-60 text-sm font-medium flex items-center gap-2">
                {generating ? <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /> : <FiCalendar size={14} />}
                {generating ? 'Generating...' : 'Generate Year Schedule'}
              </button>
            )}
            <button type="submit" disabled={submitting}
              className="bg-gold text-navy font-semibold px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60 flex items-center gap-2 text-sm">
              {submitting ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : <FiPlus size={14} />}
              {submitting ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>

      {/* EXISTING SCHEDULE TABLE */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <FiCalendar className="text-gold" size={18} /> Existing Schedule ({filteredSchedules.length})
            </h3>
            <div className="flex gap-2 flex-wrap">
              <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="input-field py-1.5 text-xs">
                <option value="">All Teachers</option>
                {teachers.map((t) => <option key={t._id} value={t._id}>{t.displayName || t.name}</option>)}
              </select>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="input-field py-1.5 text-xs">
                <option value="">All Grades</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field py-1.5 text-xs">
                <option value="">All Status</option>
                {['scheduled','live','completed','cancelled'].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Subject</th><th>Teacher</th><th>Date</th>
                <th>Time</th><th>Students</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />) :
                filteredSchedules.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-white/30">No classes found</td></tr>
                ) : filteredSchedules.map((cls) => (
                  <tr key={cls._id} className="hover:bg-white/5 transition-colors">
                    <td className="font-medium text-white">{cls.title}</td>
                    <td className="text-white/70">{cls.subject}</td>
                    <td className="text-white/70">{cls.teacherId?.displayName || cls.teacherId?.name || '—'}</td>
                    <td className="text-white/60 text-xs">{formatDate(cls.scheduledDate)}</td>
                    <td className="text-white/60">{formatTime(cls.scheduledTime)}</td>
                    <td><span className="flex items-center gap-1 text-white/50"><FiUsers size={12} />{cls.studentIds?.length || cls.enrolledStudents?.length || 0}</span></td>
                    <td>
                      <span className={`badge capitalize ${cls.status === 'live' ? 'badge-green' : cls.status === 'completed' ? 'bg-white/10 text-white/40' : cls.status === 'cancelled' ? 'badge-red' : 'badge-blue'}`}>
                        {cls.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {cls.status === 'scheduled' && (
                          <button
                            onClick={() => setCancelModal(cls)}
                            className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all flex items-center gap-1"
                          >
                            <FiXCircle size={11} /> Cancel
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

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelModal && (
          <CancelModal
            schedule={cancelModal}
            onClose={() => setCancelModal(null)}
            onConfirm={(reason) => handleCancel(cancelModal, reason)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
