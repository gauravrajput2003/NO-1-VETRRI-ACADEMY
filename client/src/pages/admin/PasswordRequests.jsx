import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function PasswordRequests() {
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState('');
  const [generated, setGenerated] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const load = async () => {
    try {
      const { data } = await api.get('/admin/password-resets', { params: { search, status } });
      setRequests(data.requests || []);
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load requests'); }
  };
  useEffect(() => { load(); }, [status]);
  useEffect(() => {
    const clear = () => setGenerated(null);
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);

  const action = async (id, name, body) => {
    setBusy(id);
    try {
      const { data } = await api.post(`/admin/password-resets/${id}/${name}`, body);
      if (name === 'generate') setGenerated({ id, password: data.password });
      else setGenerated(null);
      toast.success(name === 'generate' ? 'Temporary password generated. It is shown only now.' : 'Request updated');
      await load();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update request'); }
    finally { setBusy(''); }
  };

  return <section className="space-y-5 text-white">
    <div><h1 className="text-2xl font-bold">Password Requests</h1><p className="text-white/50 text-sm">Verify the account owner before handing over a temporary password.</p></div>
    <div className="flex flex-wrap gap-2"><input className="input-field max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or email" />
      <select className="input-field w-36" value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending">Pending</option><option value="sent">Sent</option><option value="closed">Closed</option></select>
      <button type="button" className="btn-primary px-4" onClick={load}>Search / refresh</button></div>
    {requests.map((request) => <article key={request._id} className="glass-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">{request.user?.name || 'Account'}</h2><p className="text-white/50 text-sm">{request.user?.role} · {request.user?.grade || '—'} · {request.user?.mobile || request.user?.email || '—'}</p></div><span className="text-gold">{request.status}</span></div>
      {generated?.id === request._id && <div className="border border-amber-500/50 rounded-lg p-3 text-amber-100"><p>Temporary password (shown once): <strong className="select-all">{generated.password}</strong></p><p className="text-xs mt-1">Keep this private. It expires 24 hours after delivery.</p></div>}
      {request.status === 'pending' && <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary px-3 py-2" disabled={Boolean(busy)} onClick={() => action(request._id, 'generate')}>Generate</button>
        {generated?.id === request._id && <>
          {request.hasVerifiedDevice && <button type="button" className="border border-gold px-3 py-2 rounded-lg" disabled={Boolean(busy)} onClick={() => action(request._id, 'send', { password: generated.password, channels: ['push', 'chat'] })}>Send to verified app</button>}
          <button type="button" className="border border-gold px-3 py-2 rounded-lg" disabled={Boolean(busy)} onClick={async () => {
            if (!window.confirm('Confirm that you independently verified the account owner and have copied the displayed password for private delivery. This activates the temporary password.')) return;
            await action(request._id, 'mark-copied', { password: generated.password, identityVerified: true });
          }}>Confirm verified handover</button>
        </>}
        <button type="button" className="text-red-300 px-3 py-2" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Reject this recovery request?')) action(request._id, 'reject'); }}>Reject</button>
      </div>}
    </article>)}
    {requests.length === 0 && <p className="text-white/50">No requests found.</p>}
  </section>;
}
