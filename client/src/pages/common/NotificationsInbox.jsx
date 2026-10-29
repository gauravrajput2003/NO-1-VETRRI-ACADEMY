import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { notificationDestination } from '../../utils/notificationDestination';
export default function NotificationsInbox() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [items, setItems] = useState([]), [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false), [error, setError] = useState('');
  const load = async () => { try { const { data } = await api.get('/notifications', { params: { page, limit: 30 } }); setItems(data.notifications || []); setHasMore(Boolean(data.hasMore)); } catch { setError('Unable to load notifications'); } };
  useEffect(() => { load(); }, [page]);
  const open = async (item) => { await api.patch(`/notifications/${item._id}/read`); navigate(notificationDestination(item.link, user.role)); };
  return <section className="text-white space-y-4"><h1 className="text-2xl font-bold">Notifications</h1>{error && <p role="alert">{error}</p>}<button className="text-gold" onClick={async () => { await api.patch('/notifications/read-all'); await load(); }}>Mark all read</button>{items.map((item) => <button key={item._id} onClick={() => open(item)} className={`glass-card p-4 text-left block w-full ${item.isRead ? 'opacity-60' : ''}`}><strong>{item.title}</strong><p>{item.message}</p><time className="text-white/40 text-xs">{new Date(item.createdAt).toLocaleString('en-IN')}</time></button>)}<div className="flex gap-4"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button disabled={!hasMore} onClick={() => setPage(page + 1)}>Next</button></div></section>;
}

