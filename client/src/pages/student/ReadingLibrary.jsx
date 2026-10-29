import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
export default function ReadingLibrary({ kind = 'bookmarks' }) {
  const [items, setItems] = useState([]), [error, setError] = useState('');
  const load = async () => { try { const { data } = await api.get(`/pdf/${kind}/all`); setItems(data[kind] || []); } catch { setError('Unable to load saved reading items'); } };
  useEffect(() => { load(); }, [kind]);
  return <section className="text-white space-y-4"><h1 className="text-2xl font-bold">{kind === 'notes' ? 'My Notes' : 'My Bookmarks'}</h1>{error && <p role="alert">{error}</p>}{items.map((item) => <article key={item._id} className="glass-card p-4 space-y-2"><p className="font-bold">{item.materialId?.title || 'Unavailable material'} · Page {item.pageNumber}</p>{item.materialId && <Link className="text-gold" to={`/student/materials/pdf/${item.materialId._id}?page=${item.pageNumber}`}>Open page</Link>}<p className="text-white/70">{item.noteText || item.label}</p><button className="text-red-300 text-sm" onClick={async () => { try { await api.delete(`/pdf/${kind}/${item._id}`); await load(); } catch { toast.error('Unable to remove item'); } }}>Remove</button>{kind === 'notes' && <button className="text-gold text-sm ml-3" onClick={async () => { const noteText = window.prompt('Edit note', item.noteText); if (!noteText?.trim()) return; try { await api.put(`/pdf/notes/${item._id}`, { noteText }); await load(); } catch { toast.error('Unable to edit note'); } }}>Edit note</button>}</article>)}{!items.length && !error && <p className="text-white/50">No saved items yet.</p>}</section>;
}
