import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiClock, FiCheck, FiX } from 'react-icons/fi';

export default function LeaveApprovals() {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState('pending');

  const fetch = () => api.get(`/admin/leaves?status=${filter}`).then(r => { if (r.data.success) setLeaves(r.data.leaves); });
  useEffect(() => { fetch(); }, [filter]);

  const update = async (id, status) => {
    try { await api.put(`/admin/leaves/${id}`, { status }); toast.success(`Leave ${status}!`); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Leave Approvals</h1></div>

      <div className="flex gap-2">
        {['pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl text-sm capitalize font-medium transition-all ${filter===s?'bg-gold text-navy':'glass-card text-white/60 hover:text-white'}`}>{s}</button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Applicant</th><th>Role</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l._id}>
                  <td className="text-white font-medium">{l.applicant?.name}</td>
                  <td><span className={`badge text-xs ${l.applicantRole==='teacher'?'badge-blue':'badge-gold'}`}>{l.applicantRole}</span></td>
                  <td className="text-white/60 capitalize">{l.leaveType}</td>
                  <td className="text-white/60">{new Date(l.fromDate).toLocaleDateString('en-IN')}</td>
                  <td className="text-white/60">{new Date(l.toDate).toLocaleDateString('en-IN')}</td>
                  <td className="text-white/60">{l.totalDays}</td>
                  <td className="text-white/40 text-xs max-w-32 truncate">{l.reason}</td>
                  <td><span className={`badge ${l.status==='approved'?'badge-green':l.status==='rejected'?'badge-red':'badge-gold'}`}>{l.status}</span></td>
                  <td>
                    {l.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => update(l._id, 'approved')} className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 flex items-center justify-center hover:bg-green-500/20"><FiCheck size={13} /></button>
                        <button onClick={() => update(l._id, 'rejected')} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500/20"><FiX size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-white/30">No {filter} leaves</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
