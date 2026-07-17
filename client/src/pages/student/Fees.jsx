import { useEffect, useState } from 'react';
import api from '../../services/api';
import { FiDollarSign, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/fees').then(r => { if (r.data.success) setFees(r.data.fees); }).finally(() => setLoading(false));
  }, []);

  const currentMonth = fees.find(f => {
    const now = new Date();
    return f.monthNumber === now.getMonth() + 1 && f.year === now.getFullYear();
  });

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Fees</h1><p className="text-white/40 text-sm mt-1">Your fee payment history</p></div>

      {/* Current Month Status */}
      {currentMonth && (
        <div className={`glass-card p-6 border ${currentMonth.status === 'paid' ? 'border-green-500/30' : currentMonth.status === 'overdue' ? 'border-red-500/30' : 'border-gold/30'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${currentMonth.status === 'paid' ? 'bg-green-500/10' : 'bg-gold/10'}`}>
              {currentMonth.status === 'paid' ? <FiCheckCircle className="text-green-400" size={24} /> : currentMonth.status === 'overdue' ? <FiAlertCircle className="text-red-400" size={24} /> : <FiClock className="text-gold" size={24} />}
            </div>
            <div>
              <p className="text-white/50 text-sm">Current Month Fee</p>
              <p className="text-white font-bold text-2xl">₹{currentMonth.amount}</p>
              <p className="text-white/50 text-sm">{currentMonth.month} · <span className={currentMonth.status === 'paid' ? 'text-green-400' : 'text-gold'}>{currentMonth.status.toUpperCase()}</span></p>
            </div>
            {currentMonth.status !== 'paid' && (
              <a href="https://wa.me/919047758389?text=I want to pay my course fee" target="_blank" rel="noreferrer" className="btn-primary ml-auto text-sm py-2 px-5">
                Pay Now
              </a>
            )}
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-2"><FiDollarSign className="text-gold" size={18} /><h3 className="text-white font-semibold">Payment History</h3></div>
        {fees.length === 0 ? (
          <div className="p-10 text-center text-white/30"><FiDollarSign size={40} className="mx-auto mb-3 opacity-30" /><p>No fee records yet.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Paid On</th><th>Method</th></tr></thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f._id}>
                    <td className="text-white font-medium">{f.month}</td>
                    <td className="text-gold font-bold">₹{f.amount}</td>
                    <td><span className={`badge ${f.status === 'paid' ? 'badge-green' : f.status === 'overdue' ? 'badge-red' : 'badge-gold'}`}>{f.status}</span></td>
                    <td className="text-white/50">{f.paidAt ? new Date(f.paidAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="text-white/40 capitalize">{f.paymentMethod || '—'}</td>
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
