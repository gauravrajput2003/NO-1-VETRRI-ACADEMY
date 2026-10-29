import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COMPONENTS = ['baseSalary', 'groupTuitionSalary', 'individualTuitionSalary', 'hourlyTuitionSalary', 'weeklyTuitionSalary', 'performanceBonus', 'specialAllowance', 'providentFund', 'taxDeduction', 'otherDeductions', 'daysInMonth', 'daysPresent', 'deductionPerDay', 'paidLeaveBalance', 'casualLeaveBalance', 'medicalLeaveBalance'];
const BANK_FIELDS = ['bankAccount', 'bankName', 'ifscCode', 'accountHolder', 'paymentMode'];
const label = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const localDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function SalaryManagement() {
  const [month, setMonth] = useState(MONTHS[Number(new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' })) - 1]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({});

  const load = async () => {
    setError('');
    try {
      const { data } = await api.get('/admin/salaries', { params: { month, year } });
      setRows(data.teachers || []); setSummary(data.summary || {});
    } catch (cause) { setError(cause.response?.data?.message || 'Unable to load salary records'); }
  };
  useEffect(() => { setEditor(null); load(); }, [month, year]);
  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const mutate = async (action) => {
    setBusy(true);
    try { await action(); setEditor(null); toast.success('Salary record saved'); await load(); }
    catch (cause) { toast.error(cause.response?.data?.message || cause.message || 'Unable to save'); }
    finally { setBusy(false); }
  };
  const configure = async (row) => {
    setBusy(true);
    try {
      const { data } = await api.get('/admin/teachers', { params: { limit: 10000 } });
      const teacher = (data.teachers || []).find((value) => value._id === row.teacherId);
      if (!teacher) throw new Error('Teacher configuration could not be loaded');
      setForm({ ...(teacher.salary || {}), effectiveDate: teacher.salary?.effectiveDate?.slice(0, 10) || '' });
      setEditor({ type: 'config', row });
    } catch (cause) { toast.error(cause.message || 'Unable to load configuration'); }
    finally { setBusy(false); }
  };
  const payment = (row, existing) => {
    setForm(existing ? { ...existing, paidAt: existing.paidAt?.slice(0, 10) || localDate() } : {
      amount: Math.max(0, row.netSalary - row.paidAmount), method: row.paymentMethod || 'bank_transfer',
      paidAt: localDate(), processingDate: localDate(), salaryDate: localDate(), transactionId: '', remarks: '', proofImage: '',
    });
    setEditor({ type: 'payment', row, existing });
  };
  const save = (event) => {
    event.preventDefault();
    if (editor.type === 'config') return mutate(() => api.post(`/admin/teacher/${editor.row.teacherId}/salary-config`, form));
    if (!(Number(form.amount) > 0)) return toast.error('Enter a payment amount greater than zero');
    if (!window.confirm(`Record ${money(form.amount)} for ${editor.row.teacherName}, ${month} ${year}?`)) return;
    return mutate(() => editor.existing
      ? api.patch(`/admin/salary/${editor.row._id}/payment/${editor.existing._id}`, form)
      : api.post('/admin/salary/process', { ...editor.row, ...form, teacherId: editor.row.teacherId, month, year, payingAmount: Number(form.amount), paymentMethod: form.method, paymentDate: form.paidAt }));
  };
  const download = async (path, filename) => {
    try {
      const { data } = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(data); const link = document.createElement('a');
      link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error('Unable to download report'); }
  };
  const uploadProof = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const body = new FormData(); body.append('file', file); setBusy(true);
    try { const { data } = await api.post('/admin/salary/upload-proof', body, { headers: { 'Content-Type': 'multipart/form-data' } }); change('proofImage', data.url); toast.success('Proof uploaded'); }
    catch { toast.error('Proof upload failed'); }
    finally { setBusy(false); }
  };

  return <section className="text-white space-y-5">
    <h1 className="text-2xl font-bold">Salary Management</h1>
    <div className="flex flex-wrap gap-3 items-center">
      <label>Month <select className="input-field" value={month} onChange={(event) => setMonth(event.target.value)}>{MONTHS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Year <input className="input-field w-28" type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} /></label>
      <button className="text-gold" onClick={load}>Refresh</button>
      <button disabled={busy} className="text-gold" onClick={() => {
        if (!window.confirm(`Record remaining salary payments for all teachers for ${month} ${year}? Pending total: ${money(summary.pending)}. This records payments; it does not transfer money.`)) return;
        mutate(async () => { const { data } = await api.post('/admin/salary/process-all', { month, year }); if (data.failed) throw new Error(`${data.processed} saved, ${data.failed} failed. Refresh and inspect records before retrying.`); });
      }}>Record all remaining payments</button>
      <button className="text-gold" onClick={() => download(`/admin/salary/report/${encodeURIComponent(`${month} ${year}`)}/pdf`, `payroll-${month}-${year}.pdf`)}>Download payroll PDF</button>
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <div className="glass-card p-4 flex flex-wrap gap-6"><span>Payroll: {money(summary.totalPayroll)}</span><span>Paid: {money(summary.alreadyPaid)}</span><span>Pending: {money(summary.pending)}</span></div>
    {editor && <form onSubmit={save} className="glass-card p-5 space-y-4">
      <h2 className="font-bold">{editor.type === 'config' ? 'Salary configuration' : editor.existing ? 'Correct payment' : 'Record payment'} · {editor.row.teacherName}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {editor.type === 'config' ? <>
          {COMPONENTS.map((key) => <label key={key} className="text-sm">{label(key)}<input className="input-field" type="number" min="0" step="any" value={form[key] ?? ''} onChange={(event) => change(key, event.target.value)} /></label>)}
          {BANK_FIELDS.map((key) => <label key={key} className="text-sm">{label(key)}<input className="input-field" value={form[key] || ''} onChange={(event) => change(key, event.target.value)} /></label>)}
          <label>Effective date<input className="input-field" type="date" value={form.effectiveDate || ''} onChange={(event) => change('effectiveDate', event.target.value)} /></label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={Boolean(form.attendanceDeduction)} onChange={(event) => change('attendanceDeduction', event.target.checked)} />Apply attendance deduction</label>
        </> : <>
          <label>Amount<input className="input-field" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => change('amount', event.target.value)} /></label>
          {['method', 'transactionId', 'remarks'].map((key) => <label key={key}>{label(key)}<input className="input-field" value={form[key] || ''} onChange={(event) => change(key, event.target.value)} /></label>)}
          {['paidAt', 'processingDate', 'salaryDate'].map((key) => <label key={key}>{label(key)}<input className="input-field" type="date" value={form[key]?.slice(0, 10) || ''} onChange={(event) => change(key, event.target.value)} /></label>)}
          {!editor.existing && <label>Payment proof<input type="file" className="input-field" accept="image/*" disabled={busy} onChange={uploadProof} />{form.proofImage && <a href={form.proofImage} target="_blank" rel="noreferrer" className="text-gold">View uploaded proof</a>}</label>}
        </>}
      </div><div className="flex gap-4"><button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save'}</button><button type="button" disabled={busy} onClick={() => setEditor(null)}>Cancel</button></div>
    </form>}
    {rows.map((row) => <article className="glass-card p-4 space-y-3" key={row.teacherId}>
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{row.teacherName}</h2><p className="text-white/50 text-sm">{row.paymentStatus} · Net {money(row.netSalary)} · Paid {money(row.paidAmount)}</p></div>
        <div className="flex flex-wrap gap-3 text-sm text-gold"><button disabled={busy} onClick={() => configure(row)}>Configure</button><button disabled={busy} onClick={() => payment(row)}>Record payment</button><button onClick={() => download(`/teacher/salary/${row.teacherId}/${encodeURIComponent(row.monthYear)}/slip`, `salary-${row.teacherName}-${row.monthYear}.pdf`)}>Salary slip</button></div></div>
      {row.payments?.map((entry) => <div key={entry._id} className="border-t border-white/10 pt-2 flex flex-wrap gap-3 text-sm items-center"><span className="flex-1">{money(entry.amount)} · {entry.method} · {entry.paidAt ? new Date(entry.paidAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''} · {entry.transactionId}</span>{entry.proofImage && <a className="text-gold" href={entry.proofImage} target="_blank" rel="noreferrer">Proof</a>}<button disabled={busy} className="text-gold" onClick={() => payment(row, entry)}>Edit</button><button disabled={busy} className="text-red-300" onClick={() => { if (window.confirm(`Remove the ${money(entry.amount)} payment record?`)) mutate(() => api.delete(`/admin/salary/${row._id}/payment/${entry._id}`)); }}>Remove</button></div>)}
    </article>)}
    {!error && rows.length === 0 && <p className="text-white/50">No salary records found.</p>}
  </section>;
}
