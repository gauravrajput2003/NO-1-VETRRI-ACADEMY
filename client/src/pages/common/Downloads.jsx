import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Downloads() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    Promise.all([api.get('/downloads/ncert'), api.get('/downloads/resources')]).then(([ncert, resources]) => {
      setBooks(ncert.data.books || []);
      setMaterials(resources.data.materials || []);
    }).catch((error) => toast.error(error.response?.data?.message || 'Unable to load downloads'));
  }, []);
  const open = async (material) => {
    try {
      const url = user.role === 'student'
        ? (await api.get(`/student/materials/${material._id}/download`)).data.url
        : (await api.get(`/storage/download-url/${material._id}`)).data.downloadUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else toast.error('Download unavailable');
    } catch (error) { toast.error(error.response?.data?.message || 'Download unavailable'); }
  };
  const query = search.trim().toLowerCase();
  return <div className="space-y-6 text-white"><div><h1 className="text-2xl font-bold">Download Center</h1><p className="text-white/50">Study resources and NCERT textbooks.</p></div>
    <input className="input-field max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, subject or class" />
    <section className="glass-card p-5"><h2 className="font-semibold mb-3">Academy materials</h2><div className="grid md:grid-cols-2 gap-2">{materials.filter((item) => `${item.title} ${item.subject} ${item.grade}`.toLowerCase().includes(query)).map((item) => <button key={item._id} type="button" className="text-left border border-white/10 rounded-lg p-3 hover:border-gold" onClick={() => open(item)}>{item.title} <span className="text-white/50 text-sm">· {item.subject} · {item.grade}</span></button>)}</div></section>
    <section className="glass-card p-5"><h2 className="font-semibold mb-3">NCERT books</h2><div className="grid md:grid-cols-2 gap-2">{books.filter((item) => `${item.title} ${item.subject} ${item.class}`.toLowerCase().includes(query)).map((item, index) => <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="border border-white/10 rounded-lg p-3 hover:border-gold">Class {item.class}: {item.title} <span className="text-white/50 text-sm">· {item.subject}</span></a>)}</div></section>
  </div>;
}
