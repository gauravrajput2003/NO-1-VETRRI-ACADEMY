import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';

export default function AnnouncementsInbox() {
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const load = async () => {
    try { const { data } = await api.get('/announcements/active', { params: { includeRead: true } }); setItems(data.announcements || []); setError(''); }
    catch (cause) { setError(cause.response?.data?.message || 'Unable to load announcements'); }
  };
  useEffect(() => { load(); socket?.on('announcement:new', load); window.addEventListener('focus', load); return () => { socket?.off('announcement:new', load); window.removeEventListener('focus', load); }; }, [socket]);
  const read = async (item) => {
    try { await api.post(`/announcements/${item._id}/read`); await load(); }
    catch { toast.error('Unable to mark announcement read'); }
  };
  return <section className="text-white space-y-4"><h1 className="text-2xl font-bold">Announcements</h1>{error && <p role="alert" className="text-red-300">{error}</p>}
    {items.map((item) => <article key={item._id} className="glass-card p-5 space-y-3"><h2 className="font-bold">{item.isPinned ? '📌 ' : ''}{item.title}</h2><p className="whitespace-pre-wrap text-white/70">{item.content}</p>
      <div className="flex flex-wrap gap-3">{item.media?.map((asset, index) => <div key={asset.publicId || index} className="max-w-lg">
        {asset.type === 'image' ? <img src={asset.url} alt={asset.originalFilename || 'Announcement attachment'} className="rounded-lg max-h-72" /> : asset.type === 'video' ? <video src={asset.url} controls className="max-h-72" /> : asset.type === 'audio' ? <audio src={asset.url} controls /> : <a className="text-gold underline" href={asset.url} target="_blank" rel="noreferrer">{asset.originalFilename || 'Open attachment'}</a>}
      </div>)}</div>
      <button className="text-gold" disabled={item.isRead} onClick={() => read(item)}>{item.isRead ? 'Read' : 'Mark read'}</button>
    </article>)}{!error && !items.length && <p className="text-white/50">No announcements available.</p>}
  </section>;
}
