import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDeskChat from '../common/AdminDeskChat';

export default function AdminMessages() {
  const [users, setUsers] = useState([]), [selected, setSelected] = useState(null), [search, setSearch] = useState('');
  useEffect(() => {
    api.get('/chat/users', { params: { limit: 1000 } }).then(({ data }) => setUsers(data.users || []))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load users'));
  }, []);
  const filtered = users.filter((item) => `${item.displayName || item.name} ${item.grade || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="text-white space-y-4"><h1 className="text-2xl font-bold">Messages</h1>
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <aside className="glass-card p-3 overflow-y-auto max-h-[75vh]"><input className="input-field mb-2" placeholder="Search students or teachers" value={search} onChange={(event) => setSearch(event.target.value)} />
        {filtered.map((item) => <button key={item._id} type="button" className={`w-full text-left p-2 rounded-lg ${selected?._id === item._id ? 'bg-gold/20' : 'hover:bg-white/5'}`} onClick={() => setSelected(item)}>{item.displayName || item.name} <span className="text-white/50 text-xs">{item.role} {item.grade}</span>{item.unreadCount > 0 && <span className="text-gold ml-2">{item.unreadCount}</span>}</button>)}</aside>
      {selected ? <AdminDeskChat key={selected._id} contact={selected} /> : <section className="glass-card p-6 text-white/50">Select a person to open messages.</section>}
    </div>
  </div>;
}
