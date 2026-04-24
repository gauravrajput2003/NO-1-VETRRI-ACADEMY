import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiMail } from 'react-icons/fi';

const STATUS_COLORS = { new: 'badge-blue', contacted: 'badge-gold', enrolled: 'badge-green', closed: 'badge-red' };

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState([]);

  const fetch = () => api.get('/admin/enquiries').then(r => { if (r.data.success) setEnquiries(r.data.enquiries); });
  useEffect(() => { fetch(); }, []);

  const update = async (id, status) => {
    try { await api.put(`/admin/enquiries/${id}`, { status }); toast.success('Status updated!'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Enquiries</h1><p className="text-white/40 text-sm mt-1">Landing page enquiry form submissions</p></div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Grade</th><th>Course</th><th>Message</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {enquiries.map(e => (
                <tr key={e._id}>
                  <td className="text-white font-medium">{e.name}</td>
                  <td className="text-white/60 font-mono">{e.phone}</td>
                  <td className="text-white/50 text-xs">{e.email || '—'}</td>
                  <td className="text-white/60">{e.grade || '—'}</td>
                  <td className="text-white/60 text-xs max-w-24 truncate">{e.course || '—'}</td>
                  <td className="text-white/40 text-xs max-w-32 truncate">{e.message || '—'}</td>
                  <td><span className={`badge text-xs ${STATUS_COLORS[e.status] || 'badge-gold'}`}>{e.status}</span></td>
                  <td>
                    <select value={e.status} onChange={ev => update(e._id, ev.target.value)} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1">
                      {['new','contacted','enrolled','closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {enquiries.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-white/30">No enquiries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
