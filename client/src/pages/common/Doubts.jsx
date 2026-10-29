import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MediaRecorderInput from '../../components/MediaRecorderInput';

export default function Doubts() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [doubts, setDoubts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [people, setPeople] = useState([]);
  const [reply, setReply] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [createFile, setCreateFile] = useState(null);
  const [retention, setRetention] = useState(180);
  const reload = async () => {
    try { const { data } = await api.get('/doubts', { params: { page, status, limit: 20 } }); setDoubts(data.doubts || []); setPages(data.pagination?.pages || 1); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to load discussions'); }
  };
  useEffect(() => {
    reload();
    if (user?.role === 'teacher') api.get('/teacher/students').then(({ data }) => setPeople(data.students || [])).catch(() => {});
    if (user?.role === 'student') api.get('/doubts/teachers/search').then(({ data }) => setPeople(data.teachers || [])).catch(() => {});
    if (user?.role === 'admin') {
      api.get('/admin/teachers').then(({ data }) => setPeople(data.teachers || [])).catch(() => {});
      api.get('/doubts/admin/retention').then(({ data }) => setRetention(data.retentionDays)).catch(() => {});
    }
  }, [user?.role]);
  useEffect(() => { reload(); }, [page, status]);
  useEffect(() => {
    if (!socket) return;
    const refresh = (event) => { reload(); if (selected && (!event?.doubtId || String(event.doubtId) === selected._id)) detail(selected); };
    socket.on('doubt:reply', refresh); socket.on('doubt:status', refresh); socket.on('connect', refresh);
    if (selected) socket.emit('join:room', { room: `doubt:${selected._id}` });
    return () => { socket.off('doubt:reply', refresh); socket.off('doubt:status', refresh); socket.off('connect', refresh); if (selected) socket.emit('leave:room', { room: `doubt:${selected._id}` }); };
  }, [socket, selected?._id, page, status]);
  const detail = async (item) => {
    try { const { data } = await api.get(`/doubts/${item._id}`); setSelected(data.doubt); setReplies(data.replies || []); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to open discussion'); }
  };
  const upload = async (attachmentFile) => {
    if (!attachmentFile) return [];
    const form = new FormData(); form.append('file', attachmentFile);
    const { data } = await api.post('/doubts/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.attachment ? [data.attachment] : [];
  };
  const create = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const attachments = await upload(createFile);
      const payload = { title, description, attachments,
        ...(user.role === 'student' ? { assignedTeachers: recipient ? [recipient] : [] } : { targetStudentId: recipient }) };
      const { data } = await api.post('/doubts', payload);
      setTitle(''); setDescription(''); setCreateFile(null); setRecipient(''); await reload(); await detail(data.doubt); toast.success('Discussion started');
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to start discussion'); }
    finally { setBusy(false); }
  };
  const addReply = async (event) => {
    event.preventDefault(); if (!selected) return; setBusy(true);
    try { const attachments = await upload(file); await api.post(`/doubts/${selected._id}/replies`, { message: reply.trim(), attachments });
      setReply(''); setFile(null); await detail(selected); await reload(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to reply'); }
    finally { setBusy(false); }
  };
  const updateStatus = async (next) => {
    try { await api.patch(`/doubts/${selected._id}/status`, { status: next }); await detail(selected); await reload(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update status'); }
  };
  const remove = async (replyId) => {
    const reason = window.prompt('Reason for removing this content'); if (!reason) return;
    try { await api.delete(`/doubts/${selected._id}/content`, { data: { type: replyId ? 'reply' : 'doubt', replyId, reason } }); if (replyId) await detail(selected); else setSelected(null); await reload(); }
    catch { toast.error('Unable to remove content'); }
  };
  const attachments = (items, replyId) => (items || []).map((attachment, index) => <div key={attachment._id || index} className="space-y-1">
    {attachment.attachmentType === 'image' && <img src={attachment.url} alt={attachment.originalFilename || 'Discussion image'} className="max-w-xs max-h-56 rounded-lg" />}
    {attachment.attachmentType === 'voice' && <audio controls src={attachment.url} />}
    <button className="text-gold underline text-sm" onClick={async () => {
      if (attachment.attachmentType !== 'pdf' && attachment.mimeType !== 'application/pdf') { window.open(attachment.url, '_blank', 'noopener,noreferrer'); return; }
      const popup = window.open('', '_blank'); if (popup) popup.opener = null;
      try { const { data } = await api.get(replyId ? `/doubts/${selected._id}/replies/${replyId}/attachments/${index}/download` : `/doubts/${selected._id}/attachments/${index}/download`); if (popup) popup.location.href = data.url; else toast.error('Allow popups to open this PDF'); }
      catch { popup?.close(); toast.error('Attachment unavailable'); }
    }}>{attachment.originalFilename || 'Open attachment'}</button>
  </div>);
  const resolve = async () => {
    try { await api.patch(`/doubts/${selected._id}/status`, { status: 'resolved' }); await detail(selected); await reload(); }
    catch (error) { toast.error(error.response?.data?.message || 'Unable to update status'); }
  };
  return <div className="space-y-5 text-white"><div><h1 className="text-2xl font-bold">Academic Discussions</h1><p className="text-white/50">Ask and answer questions about lessons.</p></div>
    {user?.role !== 'admin' && <form onSubmit={create} className="glass-card p-4 space-y-3"><h2 className="font-semibold">Start a discussion</h2><input required className="input-field" placeholder="Title" maxLength="150" value={title} onChange={(event) => setTitle(event.target.value)} />
      <textarea required className="input-field min-h-24" maxLength="5000" placeholder="Explain your question" value={description} onChange={(event) => setDescription(event.target.value)} />
      <select className="input-field" value={recipient} onChange={(event) => setRecipient(event.target.value)} required={user?.role === 'teacher'}><option value="">{user?.role === 'teacher' ? 'Select student' : 'Select teacher (optional)'}</option>{people.map((person) => <option key={person._id} value={person._id}>{person.displayName || person.name}</option>)}</select>
      <input className="input-field" type="file" accept="image/*,.pdf,audio/*" onChange={(event) => setCreateFile(event.target.files?.[0] || null)} />
      <button className="btn-primary px-4 py-2" disabled={busy}>Create</button></form>}
    {user?.role !== 'admin' && <MediaRecorderInput onFile={setCreateFile} />}
    <select className="input-field max-w-xs" aria-label="Discussion status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{['open', 'teacher_responded', 'waiting_for_student', 'resolved', 'closed'].map((value) => <option key={value}>{value}</option>)}</select>
    {user.role === 'admin' && <div className="glass-card p-4 flex flex-wrap gap-3 items-center"><label>Retention days<input className="input-field w-28" type="number" min="30" max="3650" value={retention} onChange={(event) => setRetention(event.target.value)} /></label><button className="text-gold" onClick={async () => { try { await api.put('/doubts/admin/retention', { retentionDays: Number(retention) }); toast.success('Retention saved'); } catch { toast.error('Unable to update retention'); } }}>Save retention</button><button className="text-gold" onClick={async () => { try { const { data } = await api.get('/doubts/admin/export', { params: { format: 'csv', status }, responseType: 'blob' }); const url = URL.createObjectURL(data); const link = document.createElement('a'); link.href = url; link.download = 'discussions.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch { toast.error('Export failed'); } }}>Export discussions</button></div>}
    <div className="grid md:grid-cols-[280px_1fr] gap-4"><aside className="glass-card p-3 space-y-2"><h2 className="font-semibold">Discussions</h2>{doubts.map((item) => <button type="button" key={item._id} className={`block w-full text-left p-2 rounded-lg ${selected?._id === item._id ? 'bg-gold/20' : 'hover:bg-white/5'}`} onClick={() => detail(item)}>{item.title}<span className="text-white/50 text-xs block">{item.status} · {item.unreadRepliesCount || 0} unread</span></button>)}<div className="flex justify-between"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page}/{pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></aside>
      <section className="glass-card p-4 space-y-3">{selected ? <><div className="flex justify-between gap-3"><h2 className="font-semibold">{selected.title}</h2>{user?.role === 'student' && selected.status !== 'resolved' && <button className="text-gold" onClick={resolve}>Mark resolved</button>}</div><p className="text-white/70 whitespace-pre-wrap">{selected.description}</p>
        {attachments(selected.attachments)}
        {user.role !== 'student' && <select aria-label="Update discussion status" className="input-field" value={selected.status} onChange={(event) => updateStatus(event.target.value)}>{['open', 'teacher_responded', 'waiting_for_student', ...(user.role === 'admin' ? ['resolved'] : []), 'closed'].map((value) => <option key={value}>{value}</option>)}</select>}
        {user.role === 'admin' && <div className="space-y-2"><label>Assigned teachers<select multiple aria-label="Assigned teachers" className="input-field" value={(selected.assignedTeachers || []).map((person) => person._id || person)} onChange={async (event) => { try { await api.patch(`/doubts/${selected._id}/assign`, { assignedTeachers: [...event.target.selectedOptions].map((option) => option.value) }); await detail(selected); } catch { toast.error('Unable to reassign'); } }}>{people.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}</select></label><button className="text-red-300" onClick={() => remove()}>Remove abusive discussion</button></div>}
        {replies.map((item) => <div key={item._id} className="border-t border-white/10 pt-2"><p className="text-gold text-sm">{item.senderId?.displayName || item.senderId?.name || item.senderRole}</p><p className="whitespace-pre-wrap">{item.message}</p>{attachments(item.attachments, item._id)}{user.role === 'admin' && <button className="text-red-300 text-xs" onClick={() => remove(item._id)}>Remove abusive reply</button>}</div>)}
        <form onSubmit={addReply} className="space-y-2"><textarea className="input-field min-h-20" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply" /><input type="file" className="input-field" accept="image/*,.pdf,audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button disabled={busy || (!reply.trim() && !file)} className="btn-primary px-4 py-2">Reply</button></form></> : <p className="text-white/50">Select a discussion.</p>}</section></div>
  </div>;
}
