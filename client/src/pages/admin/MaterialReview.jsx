import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function MaterialReview() {
  const [materials, setMaterials] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [busy, setBusy] = useState('');
  const reload = async () => {
    try {
      const [pending, access] = await Promise.all([api.get('/admin/materials/pending'), api.get('/admin/library-access')]);
      setMaterials(pending.data.materials || []);
      setTeachers(access.data.libraryAccessList || []);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load material review'); }
  };
  useEffect(() => { reload(); }, []);
  const act = async (id, operation, body) => {
    setBusy(id);
    try { await api.post(`/admin/materials/${id}/${operation}`, body); toast.success('Material review updated'); await reload(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update material'); }
    finally { setBusy(''); }
  };
  const preview = async (id) => {
    try { const { data } = await api.get(`/admin/materials/${id}/preview`); if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer'); }
    catch (error) { toast.error(error.response?.data?.message || 'Preview unavailable'); }
  };
  const access = async (id, operation) => {
    setBusy(id);
    try { await api.post(`/admin/library-access/${id}/${operation}`); toast.success('Library access updated'); await reload(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update access'); }
    finally { setBusy(''); }
  };
  return <div className="space-y-6 text-white"><div><h1 className="text-2xl font-bold">Material Review</h1><p className="text-white/50">Approve study resources and manage teacher library access.</p></div>
    <section className="glass-card p-5 space-y-3"><h2 className="font-semibold">Pending materials</h2>{materials.length === 0 && <p className="text-white/50">No pending materials.</p>}{materials.map((item) => <div key={item._id} className="border-t border-white/10 py-3 flex flex-wrap gap-3 items-center justify-between"><div><p>{item.title}</p><p className="text-white/50 text-sm">{item.subject} · {item.teacher?.name || item.teacherId?.name || 'Teacher'}</p></div><div className="flex gap-2"><button type="button" onClick={() => preview(item._id)} className="text-gold">Preview</button><button disabled={Boolean(busy)} type="button" onClick={() => act(item._id, 'approve')} className="text-green-300">Approve</button><button disabled={Boolean(busy)} type="button" onClick={() => { const notes = window.prompt('Reason for rejection?'); if (notes?.trim()) act(item._id, 'reject', { reviewNotes: notes.trim() }); }} className="text-red-300">Reject</button></div></div>)}</section>
    <section className="glass-card p-5 space-y-3"><h2 className="font-semibold">Teacher library access</h2>{teachers.map((teacher) => { const allowed = teacher.libraryAccess?.approved; return <div key={teacher._id} className="border-t border-white/10 py-2 flex justify-between"><span>{teacher.name || teacher.displayName}</span><button disabled={Boolean(busy)} type="button" className={allowed ? 'text-red-300' : 'text-green-300'} onClick={() => access(teacher._id, allowed ? 'revoke' : 'approve')}>{allowed ? 'Revoke' : 'Approve'}</button></div>; })}</section>
  </div>;
}
