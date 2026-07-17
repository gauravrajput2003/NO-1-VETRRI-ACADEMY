import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiBook, FiPlus } from 'react-icons/fi';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [adding, setAdding] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetch = () => api.get('/admin/courses').then(r => { if (r.data.success) setCourses(r.data.courses); });
  useEffect(() => { fetch(); }, []);

  const onSubmit = async (data) => {
    try {
      data.subjects = data.subjects.split(',').map(s => s.trim());
      data.grades = data.grades.split(',').map(g => g.trim());
      await api.post('/admin/courses', data);
      toast.success('Course added!'); reset(); fetch(); setAdding(false);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display font-bold text-2xl text-white">Courses</h1></div>
        <button onClick={() => setAdding(!adding)} className="btn-primary py-2 px-5 text-sm flex items-center gap-2"><FiPlus size={16} /> Add Course</button>
      </div>

      {adding && (
        <div className="glass-card p-6 border border-gold/20">
          <h3 className="text-white font-semibold mb-4">New Course</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="input-label">Title *</label><input {...register('title',{required:true})} className="input-field" placeholder="CBSE Tuition" /></div>
              <div><label className="input-label">Category *</label>
                <select {...register('category',{required:true})} className="input-field">
                  {['CBSE','State Board','Engineering','Arts & Science','Language','Competitive'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="input-label">Grades (comma-separated)</label><input {...register('grades')} className="input-field" placeholder="6th, 7th, 8th..." /></div>
              <div><label className="input-label">Subjects (comma-separated)</label><input {...register('subjects')} className="input-field" placeholder="Maths, Science..." /></div>
              <div className="col-span-2"><label className="input-label">Description</label><textarea {...register('description')} rows={2} className="input-field resize-none" /></div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="btn-primary py-2 px-5 text-sm">Add Course</button>
              <button type="button" onClick={() => setAdding(false)} className="btn-secondary py-2 px-5 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c._id} className="glass-card p-5 hover:border-gold/30 transition-all">
            <div className="text-3xl mb-3">{c.icon || '📚'}</div>
            <h3 className="text-white font-bold text-lg mb-1">{c.title}</h3>
            <p className="text-gold text-sm mb-2">{c.category}</p>
            <p className="text-white/40 text-xs mb-3">{c.subjects?.join(', ')}</p>
            <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
          </div>
        ))}
        {courses.length === 0 && <div className="col-span-3 text-center py-12 text-white/30"><FiBook size={40} className="mx-auto mb-3 opacity-30" /><p>Run seed script to add courses</p></div>}
      </div>
    </div>
  );
}
