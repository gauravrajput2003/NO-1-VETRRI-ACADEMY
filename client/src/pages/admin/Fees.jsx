import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiDollarSign } from 'react-icons/fi';

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFees = () => api.get('/admin/fees').then(r => { if (r.data.success) { setFees(r.data.fees); setSummary(r.data.summary); } }).finally(() => setLoading(false));
  useEffect(() => { fetchFees(); }, []);

  const updateStatus = async (id, status) => {
    try { await api.put(`/admin/fees/${id}`, { status }); toast.success(`Fee marked as ${status}`); fetchFees(); }
    catch { toast.error('Update failed'); }
  };

  const sendReminder = async (id) => {
    try { await api.post(`/admin/fees/${id}/reminder`); toast.success('Reminder sent!'); }
    catch { toast.error('Failed to send reminder'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Fees Tracker</h1><p className="text-white/40 text-sm mt-1">Monthly fee collection management</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid', value: summary.paid || 0, color: 'text-green-400' },
          { label: 'Pending', value: summary.pending || 0, color: 'text-gold' },
          { label: 'Overdue', value: summary.overdue || 0, color: 'text-red-400' },
          { label: 'Monthly Revenue', value: `₹${(summary.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Month</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Actions</th></tr></thead>
            <tbody>
              {fees.map(f => (
                <tr key={f._id}>
                  <td className="text-white font-medium">{f.student?.name}<div className="text-white/40 text-xs">{f.student?.mobile}</div></td>
                  <td className="text-white/60">{f.month}</td>
                  <td className="text-gold font-bold">₹{f.amount}</td>
                  <td><span className={`badge ${f.status==='paid'?'badge-green':f.status==='overdue'?'badge-red':'badge-gold'}`}>{f.status}</span></td>
                  <td className="text-white/40">{f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <div className="flex gap-2">
                      {f.status !== 'paid' && <button onClick={() => updateStatus(f._id, 'paid')} className="text-green-400 text-xs border border-green-500/30 px-2 py-1 rounded hover:bg-green-500/10">Mark Paid</button>}
                      {f.status === 'pending' && <button onClick={() => updateStatus(f._id, 'overdue')} className="text-red-400 text-xs border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10">Overdue</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && fees.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-white/30">No fee records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
