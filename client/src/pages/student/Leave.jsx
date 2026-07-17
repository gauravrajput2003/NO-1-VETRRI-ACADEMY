import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiClock } from 'react-icons/fi';

export default function Leave() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchLeaves = () => api.get('/student/leave').then(r => { if (r.data.success) setLeaves(r.data.leaves); }).finally(() => setLoading(false));
  useEffect(() => { fetchLeaves(); }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/student/leave', data);
      toast.success('Leave application submitted!');
      reset();
      fetchLeaves();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to submit'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Leave Application</h1><p className="text-white/40 text-sm mt-1">Apply for leave — admin approval required</p></div>

      {/* Form */}
      <div className="glass-card p-6 border border-gold/20">
        <h3 className="text-white font-semibold mb-4">Apply for Leave</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="leave-form">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Leave Type</label>
              <select {...register('leaveType')} className="input-field" id="leave-type">
                {['sick','personal','emergency','other'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">From Date</label>
              <input {...register('fromDate', { required: true })} type="date" className="input-field" id="leave-from" />
            </div>
            <div>
              <label className="input-label">To Date</label>
              <input {...register('toDate', { required: true })} type="date" className="input-field" id="leave-to" />
            </div>
          </div>
          <div>
            <label className="input-label">Reason *</label>
            <textarea {...register('reason', { required: true })} rows={3} className="input-field resize-none" placeholder="Reason for leave..." id="leave-reason" />
          </div>
          <button type="submit" disabled={isSubmitting} id="leave-submit" className="btn-primary py-2.5 px-6 flex items-center gap-2">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : <FiClock size={16} />}
            Submit Application
          </button>
        </form>
      </div>

      {/* History */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10"><h3 className="text-white font-semibold">My Leave Applications</h3></div>
        {leaves.length === 0 ? (
          <div className="p-10 text-center text-white/30"><p>No leave applications submitted yet.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l._id}>
                    <td className="capitalize text-white/70">{l.leaveType}</td>
                    <td className="text-white/60">{new Date(l.fromDate).toLocaleDateString('en-IN')}</td>
                    <td className="text-white/60">{new Date(l.toDate).toLocaleDateString('en-IN')}</td>
                    <td className="text-white/60">{l.totalDays}</td>
                    <td className="text-white/50 max-w-xs truncate">{l.reason}</td>
                    <td>
                      <span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
