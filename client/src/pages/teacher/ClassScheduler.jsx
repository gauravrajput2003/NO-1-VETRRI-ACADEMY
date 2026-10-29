import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { cancelSchedule, createSchedule, getSchedules, updateSchedule } from '../../services/api';

const EMPTY = { title: '', course: 'CBSE', board: 'CBSE', subject: '', grade: '10th', scheduledDate: '', scheduledTime: '', durationMinutes: 60, repeatType: 'once' };

export default function TeacherClassScheduler() {
  const [form, setForm] = useState(EMPTY);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [classes, setClasses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const reload = async () => {
    try {
      const [studentResponse, scheduleResponse] = await Promise.all([
        api.get('/teacher/students'), getSchedules(),
      ]);
      setStudents(studentResponse.data.students || []);
      setClasses(scheduleResponse.data.schedules || scheduleResponse.data.classes || []);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load schedules'); }
  };
  useEffect(() => { reload(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (selected.length === 0) return toast.error('Select at least one student');
    setBusy(true);
    try {
      const payload = { ...form, studentIds: selected, durationMinutes: Number(form.durationMinutes) };
      if (editingId) await updateSchedule(editingId, payload);
      else await createSchedule(payload);
      toast.success(editingId ? 'Class updated' : 'Class scheduled');
      setForm(EMPTY);
      setSelected([]);
      setEditingId(null);
      await reload();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to schedule class'); }
    finally { setBusy(false); }
  };

  const cancel = async (entry) => {
    const reason = window.prompt(`Reason for cancelling ${entry.title}?`);
    if (!reason?.trim()) return;
    try { await cancelSchedule(entry._id, { reason: reason.trim() }); await reload(); toast.success('Class cancelled'); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to cancel class'); }
  };
  const edit = (entry) => {
    setEditingId(entry._id);
    setForm({ title: entry.title || '', course: entry.course || 'CBSE', board: entry.board || 'CBSE',
      subject: entry.subject || '', grade: entry.grade || '10th',
      scheduledDate: String(entry.scheduledDate || '').slice(0, 10), scheduledTime: entry.scheduledTime || '',
      durationMinutes: entry.durationMinutes || 60, repeatType: entry.repeatType || 'once' });
    setSelected((entry.studentIds || []).map((student) => student._id || student));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <div className="space-y-6 text-white">
    <div><h1 className="text-2xl font-bold">Class Scheduler</h1><p className="text-white/50">Schedule classes for your assigned students.</p></div>
    <form onSubmit={submit} className="glass-card p-5 space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        {['title', 'subject'].map((field) => <label key={field} className="text-sm capitalize">{field}<input required className="input-field mt-1" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}
        {['course', 'board', 'grade'].map((field) => <label key={field} className="text-sm capitalize">{field}<select className="input-field mt-1" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })}>{(field === 'course' ? ['CBSE', 'Matric', 'Engineering', 'Arts', 'Language', 'Competitive'] : field === 'board' ? ['CBSE', 'State Board', 'Arts College', 'Eng College', 'TNPSC', 'TRB', 'TET'] : [...new Set(['4th','5th','6th','7th','8th','9th','10th','11th','12th', ...students.map((student) => student.grade).filter(Boolean)])]).map((item) => <option key={item}>{item}</option>)}</select></label>)}
        <label className="text-sm">Date<input required type="date" className="input-field mt-1" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} /></label>
        <label className="text-sm">Time (IST)<input required type="time" className="input-field mt-1" value={form.scheduledTime} onChange={(event) => setForm({ ...form, scheduledTime: event.target.value })} /></label>
        <label className="text-sm">Duration in minutes<input min="15" type="number" className="input-field mt-1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></label>
        <label className="text-sm">Repeat<select className="input-field mt-1" value={form.repeatType} onChange={(event) => setForm({ ...form, repeatType: event.target.value })}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
      </div>
      <fieldset className="border border-white/10 p-3 rounded-lg max-h-52 overflow-y-auto"><legend className="px-2">Students ({selected.length})</legend>
        {students.map((student) => <label key={student._id} className="inline-flex items-center gap-2 mr-4 mb-2 text-sm"><input type="checkbox" checked={selected.includes(student._id)} onChange={() => setSelected((ids) => ids.includes(student._id) ? ids.filter((id) => id !== student._id) : [...ids, student._id])} />{student.displayName || student.name} ({student.grade})</label>)}
      </fieldset>
      <button className="btn-primary px-4 py-2" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Create class'}</button>
      {editingId && <button type="button" className="text-white/70 ml-3" onClick={() => { setEditingId(null); setForm(EMPTY); setSelected([]); }}>Discard edits</button>}
    </form>
    <section className="glass-card p-5"><h2 className="font-semibold mb-3">Your classes</h2><div className="space-y-2">{classes.map((entry) => <div key={entry._id} className="flex items-center justify-between gap-4 border-b border-white/10 py-2"><span>{entry.title} · {entry.subject} · {new Date(entry.scheduledDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} {entry.scheduledTime} · {entry.status}</span>{entry.status === 'scheduled' && <span className="flex gap-3"><button type="button" onClick={() => edit(entry)} className="text-gold">Edit</button><button type="button" onClick={() => cancel(entry)} className="text-red-300">Cancel</button></span>}</div>)}</div></section>
  </div>;
}
