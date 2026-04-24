import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiFileText, FiCheck, FiX } from 'react-icons/fi';

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => api.get('/admin/admissions').then(r => { if (r.data.success) setAdmissions(r.data.admissions); }).finally(() => setLoading(false));
  useEffect(() => { fetch(); }, []);

  const update = async (id, admissionStatus) => {
    try { await api.put(`/admin/admissions/${id}`, { admissionStatus }); toast.success(`Application ${admissionStatus}!`); fetch(); }
    catch { toast.error('Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Admission Forms</h1><p className="text-white/40 text-sm mt-1">{admissions.length} total applications</p></div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Student</th><th>Parent</th><th>Grade</th><th>Board</th><th>District</th><th>Demo</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {admissions.map(a => (
                <tr key={a._id}>
                  <td className="text-white font-medium">{a.studentName}<div className="text-white/40 text-xs">{a.mobileNumber}</div></td>
                  <td className="text-white/60">{a.parentName}</td>
                  <td className="text-white/60">{a.grade}</td>
                  <td className="text-white/60">{a.board}</td>
                  <td className="text-white/50">{a.district}, {a.state}</td>
                  <td><span className={`badge text-xs ${a.demoClassStatus==='Completed'?'badge-green':'badge-gold'}`}>{a.demoClassStatus}</span></td>
                  <td><span className={`badge ${a.admissionStatus==='approved'?'badge-green':a.admissionStatus==='rejected'?'badge-red':'badge-gold'}`}>{a.admissionStatus}</span></td>
                  <td>
                    {a.admissionStatus === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => update(a._id, 'approved')} className="w-7 h-7 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center hover:bg-green-500/20 border border-green-500/30"><FiCheck size={13} /></button>
                        <button onClick={() => update(a._id, 'rejected')} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 border border-red-500/30"><FiX size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && admissions.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-white/30">No admissions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
