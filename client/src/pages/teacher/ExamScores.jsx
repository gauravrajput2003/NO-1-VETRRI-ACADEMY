import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiBarChart2 } from 'react-icons/fi';

export default function ExamScores() {
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => { api.get('/teacher/students').then(r => { if (r.data.success) setStudents(r.data.students); }); }, []);

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/teacher/scores', data);
      if (res.data.success) { toast.success('Score entered! Student notified.'); setScores(p => [res.data.score, ...p]); reset(); }
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Exam Scores</h1><p className="text-white/40 text-sm mt-1">Enter scores — auto-published to student dashboard</p></div>

      <div className="glass-card p-6 border border-gold/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FiBarChart2 className="text-gold" /> Enter Score</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="score-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="input-label">Student *</label>
              <select {...register('student', { required: true })} className="input-field" id="score-student">
                <option value="">Select student</option>
                {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="input-label">Subject *</label><input {...register('subject', { required: true })} className="input-field" placeholder="Mathematics" id="score-subject" /></div>
            <div><label className="input-label">Exam Title *</label><input {...register('examTitle', { required: true })} className="input-field" placeholder="Week 1 Test / Monthly Exam" id="score-title" /></div>
            <div><label className="input-label">Exam Type</label>
              <select {...register('examType')} className="input-field" id="score-type">
                {['weekly','monthly','unit','revision'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div><label className="input-label">Max Marks *</label><input {...register('maxMarks', { required: true, valueAsNumber: true })} type="number" className="input-field" defaultValue={100} id="score-max" /></div>
            <div><label className="input-label">Marks Obtained *</label><input {...register('marksObtained', { required: true, valueAsNumber: true })} type="number" className="input-field" placeholder="e.g., 85" id="score-marks" /></div>
            <div><label className="input-label">Exam Date *</label><input {...register('examDate', { required: true })} type="date" className="input-field" id="score-date" /></div>
            <div><label className="input-label">Remarks</label><input {...register('remarks')} className="input-field" placeholder="Optional" id="score-remarks" /></div>
          </div>
          <button type="submit" disabled={isSubmitting} id="score-submit" className="btn-primary py-2.5 px-6 flex items-center gap-2">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : <FiBarChart2 size={16} />} Save Score
          </button>
        </form>
      </div>

      {scores.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/10"><h3 className="text-white font-semibold">Recently Entered</h3></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Student</th><th>Subject</th><th>Exam</th><th>Score</th></tr></thead>
              <tbody>{scores.map(s => <tr key={s._id}><td className="text-white font-medium">{students.find(st => st._id === s.student)?.name || 'Student'}</td><td className="text-white/60">{s.subject}</td><td className="text-white/60">{s.examTitle}</td><td className="text-gold font-bold">{s.marksObtained}/{s.maxMarks}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
