import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Salary() {
  const { user } = useAuth();
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  useEffect(() => {
    Promise.all([api.get('/teacher/salary/current-month'), api.get('/teacher/salary/history')]).then(([salary, past]) => {
      setCurrent(salary.data.salary || null);
      setHistory(past.data.salaryHistory || []);
    }).catch((error) => toast.error(error.response?.data?.message || 'Unable to load salary records'));
  }, []);
  const slip = async (monthYear) => {
    try {
      const { data } = await api.get(`/teacher/salary/${user._id}/${encodeURIComponent(monthYear)}/slip`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a'); link.href = url; link.download = `salary-${monthYear}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { toast.error(error.response?.data?.message || 'Slip unavailable'); }
  };
  return <div className="text-white space-y-5"><h1 className="text-2xl font-bold">My Salary</h1>
    <section className="glass-card p-5"><h2 className="font-semibold">Current month</h2>{current ? <div className="space-y-1 text-white/70"><p>{current.monthYear} · {current.paymentStatus}</p><p>Gross: ₹{Number(current.grossSalary || current.totalEarnings || 0).toLocaleString('en-IN')}</p><p>Net: ₹{Number(current.netSalary || 0).toLocaleString('en-IN')}</p><button className="text-gold" onClick={() => slip(current.monthYear)}>Download slip</button></div> : <p className="text-white/50">No salary record yet.</p>}</section>
    <section className="glass-card p-5 space-y-2"><h2 className="font-semibold">History</h2>{history.map((record, index) => <div key={record._id || index} className="border-t border-white/10 py-2 flex justify-between"><span>{record.monthYear || `${record.month}/${record.year}`} · {record.paymentStatus || record.status}</span>{record.monthYear && <button className="text-gold" onClick={() => slip(record.monthYear)}>Download slip</button>}</div>)}</section>
  </div>;
}
