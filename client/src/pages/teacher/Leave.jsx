// Teacher Leave — same interface as student leave but uses teacher API
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiClock } from 'react-icons/fi';

export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetch = () => api.get('/teacher/leave').then(r => { if (r.data.success) setLeaves(r.data.leaves); });
  useEffect(() => { fetch(); }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/teacher/leave', data);
      toast.success('Leave applied. Awaiting admin approval.');
      reset(); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Leave Application</h1><p className="text-white/40 text-sm mt-1">Teacher leaves require admin approval</p></div>
      <div className="glass-card p-6">
        <h3 className="text-white font-semibold mb-4">Apply for Leave</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><label className="input-label">Type</label><select {...register('leaveType')} className="input-field">{['sick','personal','emergency','other'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label className="input-label">From</label><input {...register('fromDate',{required:true})} type="date" className="input-field" /></div>
            <div><label className="input-label">To</label><input {...register('toDate',{required:true})} type="date" className="input-field" /></div>
          </div>
          <div><label className="input-label">Reason *</label><textarea {...register('reason',{required:true})} rows={3} className="input-field resize-none" /></div>
          <button type="submit" disabled={isSubmitting} className="btn-primary py-2.5 px-6 flex items-center gap-2"><FiClock size={16} /> Submit</button>
        </form>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10"><h3 className="text-white font-semibold">My Applications</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {leaves.map(l=><tr key={l._id}><td className="capitalize text-white/70">{l.leaveType}</td><td className="text-white/60">{new Date(l.fromDate).toLocaleDateString('en-IN')}</td><td className="text-white/60">{new Date(l.toDate).toLocaleDateString('en-IN')}</td><td className="text-white/60">{l.totalDays}</td><td><span className={`badge ${l.status==='approved'?'badge-green':l.status==='rejected'?'badge-red':'badge-gold'}`}>{l.status}</span></td></tr>)}
              {!leaves.length && <tr><td colSpan={5} className="text-center py-8 text-white/30">No applications</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
