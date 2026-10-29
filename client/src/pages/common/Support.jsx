import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  ['fee_issue', 'Fees'], ['study_material', 'Study material'], ['live_class', 'Live class'],
  ['leave_attendance', 'Leave and attendance'], ['exam_scores', 'Exam and scores'],
  ['technical_app', 'Technical issue'], ['other', 'Other'],
];

export default function Support() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [tickets, setTickets] = useState([]);
  const [category, setCategory] = useState('other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    try { const { data } = await api.get(admin ? '/support/admin/tickets' : '/support/my-tickets'); setTickets(data.tickets || []); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to load support tickets'); }
  };
  useEffect(() => { reload(); }, [admin]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const attachments = [];
      if (file) { const form = new FormData(); form.append('file', file); const { data } = await api.post('/support/upload-attachment', form, { headers: { 'Content-Type': 'multipart/form-data' } }); if (data.attachment) attachments.push(data.attachment); }
      await api.post('/support/tickets', { category, subject, description, attachments });
      setSubject(''); setDescription(''); setFile(null); await reload(); toast.success('Support ticket sent');
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to send ticket'); }
    finally { setBusy(false); }
  };
  const update = async (ticket) => {
    const adminReply = window.prompt(`Reply to ${ticket.ticketId}`, ticket.adminReply || '');
    if (adminReply === null) return;
    const status = window.prompt('Status: open, in_progress, resolved or closed', ticket.status);
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return toast.error('Invalid status');
    try { await api.patch(`/support/admin/tickets/${ticket._id}`, { adminReply, status }); await reload(); toast.success('Ticket updated'); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update ticket'); }
  };
  return <div className="text-white space-y-6"><div><h1 className="text-2xl font-bold">Help Center</h1><p className="text-white/50">{admin ? 'Respond to student and teacher queries.' : 'Send a query to the academy and track its reply.'}</p></div>
    {!admin && <form onSubmit={submit} className="glass-card p-5 space-y-3"><h2 className="font-semibold">New support ticket</h2><select className="input-field" value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input className="input-field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" maxLength="200" />
      <textarea required className="input-field min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your issue" maxLength="5000" />
      <input type="file" className="input-field" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      <button className="btn-primary px-4 py-2" disabled={busy}>{busy ? 'Sending…' : 'Send query'}</button></form>}
    <section className="space-y-3"><h2 className="font-semibold">{admin ? 'All queries' : 'My queries'}</h2>{tickets.map((ticket) => <article key={ticket._id} className="glass-card p-4 space-y-1"><div className="flex justify-between"><h3 className="font-semibold">{ticket.ticketId} · {ticket.subject}</h3><span className="text-gold">{ticket.status}</span></div>
      {admin && <p className="text-white/50 text-sm">{ticket.userId?.name} · {ticket.role}</p>}
      <p className="text-white/70 text-sm whitespace-pre-wrap">{ticket.description}</p>{ticket.attachments?.map((attachment) => <a key={attachment._id || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="text-gold text-sm block underline">{attachment.fileName || 'Attachment'}</a>)}
      {ticket.adminReply && <p className="border-l-2 border-gold pl-3 text-sm">Admin: {ticket.adminReply}</p>}
      {admin && <button className="text-gold mt-2" onClick={() => update(ticket)}>Reply / update</button>}</article>)}</section>
  </div>;
}
