import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiDollarSign } from 'react-icons/fi';

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]), [studentId, setStudentId] = useState(''), [history, setHistory] = useState([]);
  const [payment, setPayment] = useState({ amount: '', month: new Date().toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' }), year: new Date().getFullYear(), status: 'paid', paymentMethod: 'cash', remarks: '' });
  const [settings, setSettings] = useState({ feeAmount: 0, feeFrequency: 'monthly', feeDueDate: 1, feeNotes: '' });
  const [saving, setSaving] = useState(false);

  const fetchFees = () => api.get('/admin/fees').then(r => { if (r.data.success) { setFees(r.data.fees); setSummary(r.data.summary); } }).finally(() => setLoading(false));
  useEffect(() => { fetchFees(); }, []);
  useEffect(() => { api.get('/admin/students', { params: { limit: 1000 } }).then(({ data }) => setStudents(data.students || [])).catch(() => toast.error('Unable to load students')); }, []);
  useEffect(() => {
    if (!studentId) { setHistory([]); return; }
    api.get(`/admin/fees/history/${studentId}`).then(({ data }) => setHistory(data.history || [])).catch(() => toast.error('Unable to load payment history'));
    const student = students.find((item) => item._id === studentId);
    if (student) setSettings({ feeAmount: student.feeAmount || 0, feeFrequency: student.feeFrequency || 'monthly', feeDueDate: student.feeDueDate || 1, feeNotes: student.feeNotes || '' });
  }, [studentId, students]);

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
      <section className="glass-card p-5 text-white space-y-4"><label>Student<select className="input-field" value={studentId} onChange={(event) => setStudentId(event.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student._id} value={student._id}>{student.name} · {student.grade}</option>)}</select></label>
        {studentId && <><form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { await api.post('/admin/fees/record-payment', { ...payment, studentId, amount: Number(payment.amount), year: Number(payment.year) }); toast.success('Payment recorded'); await fetchFees(); const { data } = await api.get(`/admin/fees/history/${studentId}`); setHistory(data.history || []); } catch (error) { toast.error(error.response?.data?.message || 'Unable to record payment'); } finally { setSaving(false); } }}><h2 className="font-bold">Record payment</h2><div className="grid sm:grid-cols-3 gap-3">{['amount', 'month', 'year', 'remarks'].map((key) => <label key={key}>{key}<input className="input-field" required={key !== 'remarks'} min={key === 'amount' ? '0.01' : undefined} step={key === 'amount' ? '0.01' : undefined} type={['amount', 'year'].includes(key) ? 'number' : 'text'} value={payment[key]} onChange={(event) => setPayment({ ...payment, [key]: event.target.value })} /></label>)}<label>Status<select className="input-field" value={payment.status} onChange={(event) => setPayment({ ...payment, status: event.target.value })}>{['paid', 'partial', 'pending', 'overdue'].map((status) => <option key={status}>{status}</option>)}</select></label><label>Method<select className="input-field" value={payment.paymentMethod} onChange={(event) => setPayment({ ...payment, paymentMethod: event.target.value })}>{['cash', 'online', 'upi', 'bank_transfer', 'cheque', 'card', 'other'].map((method) => <option key={method}>{method}</option>)}</select></label></div><button disabled={saving} className="btn-primary">Save payment record</button></form>
          <form className="space-y-3 border-t border-white/10 pt-3" onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { await api.put(`/admin/students/${studentId}`, settings); toast.success('Fee settings saved'); } catch (error) { toast.error(error.response?.data?.message || 'Unable to update settings'); } finally { setSaving(false); } }}><h2 className="font-bold">Fee settings</h2><div className="grid sm:grid-cols-3 gap-3"><label>Fee amount<input className="input-field" type="number" min="0" value={settings.feeAmount} onChange={(event) => setSettings({ ...settings, feeAmount: Number(event.target.value) })} /></label><label>Frequency<select className="input-field" value={settings.feeFrequency} onChange={(event) => setSettings({ ...settings, feeFrequency: event.target.value })}>{['monthly', 'quarterly', 'yearly', 'one-time'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Due day<input className="input-field" type="number" min="1" max="28" value={settings.feeDueDate} onChange={(event) => setSettings({ ...settings, feeDueDate: Number(event.target.value) })} /></label><label>Notes<input className="input-field" value={settings.feeNotes} onChange={(event) => setSettings({ ...settings, feeNotes: event.target.value })} /></label></div><button className="text-gold" disabled={saving}>Save fee settings</button></form>
          <h2 className="font-bold">Student payment history</h2>{history.map((record) => <p key={record._id} className="text-white/60">{record.month} {record.year} · ₹{record.amount} · {record.status} · {record.paymentMethod}</p>)}
        </>}
      </section>

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
                      {f.status !== 'paid' && <button className="text-gold text-xs" onClick={() => sendReminder(f._id)}>Send reminder</button>}
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
