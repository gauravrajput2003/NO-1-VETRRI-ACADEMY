import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PdfCanvas from '../../components/PdfCanvas';

export default function PdfReader() {
  const { id } = useParams();
  const { user } = useAuth();
  const [query] = useSearchParams();
  const fileEndpoint = user.role === 'student' ? `/student/materials/${id}/view` : `/pdf/signed-url/${id}`;
  const [url, setUrl] = useState('');
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('PDF');
  const [totalPages, setTotalPages] = useState(0);
  const session = useRef(null);
  const currentPage = useRef(1);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(fileEndpoint), api.get(`/pdf/progress/${id}`),
      api.get(`/pdf/bookmarks/${id}`), api.get(`/pdf/notes/${id}`),
    ]).then(async ([file, progress, savedBookmarks, savedNotes]) => {
      if (!active) return;
      setUrl(file.data.url);
      setTitle(file.data.material?.title || file.data.title || 'PDF');
      currentPage.current = Math.max(1, Number(query.get('page')) || progress.data.progress?.lastPage || 1);
      setPage(currentPage.current);
      setBookmarks(savedBookmarks.data.bookmarks || []);
      setNotes(savedNotes.data.notes || []);
      const opened = await api.post('/pdf/analytics/open', { materialId: id, deviceType: 'desktop' });
      session.current = opened.data.sessionId;
      openedAt.current = Date.now();
    }).catch((error) => toast.error(error.response?.data?.message || 'Unable to open PDF'));
    return () => {
      active = false;
      if (session.current) api.post('/pdf/analytics/close', { sessionId: session.current, lastPage: currentPage.current,
        totalTimeSpent: Math.round((Date.now() - openedAt.current) / 1000) }).catch(() => {});
    };
  }, [id]);

  useEffect(() => {
    const refresh = setInterval(() => api.get(fileEndpoint).then(({ data }) => setUrl(data.url)).catch(() => setUrl('')), 12 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [fileEndpoint]);

  const goTo = async (value) => {
    const next = Math.min(totalPages || Infinity, Math.max(1, Math.floor(Number(value) || 1)));
    currentPage.current = next;
    setPage(next);
    try { await api.post('/pdf/progress', { materialId: id, lastPage: next, totalPages }); }
    catch { toast.error('Reading position was not saved'); }
  };
  const toggleBookmark = async () => {
    const current = bookmarks.find((item) => item.pageNumber === page);
    try {
      if (current) { await api.delete(`/pdf/bookmarks/${current._id}`); setBookmarks((items) => items.filter((item) => item._id !== current._id)); }
      else { const { data } = await api.post('/pdf/bookmarks', { materialId: id, pageNumber: page }); setBookmarks((items) => [...items, data.bookmark]); }
    } catch (error) { toast.error(error.response?.data?.message || 'Bookmark could not be saved'); }
  };
  const addNote = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    try { const { data } = await api.post('/pdf/notes', { materialId: id, pageNumber: page, noteText: note.trim() }); setNotes((items) => [...items, data.note]); setNote(''); }
    catch (error) { toast.error(error.response?.data?.message || 'Note could not be saved'); }
  };
  return <div className="text-white space-y-4"><Link to={user.role === 'admin' ? '/admin/library' : `/${user.role}/materials`} className="text-gold">← Materials</Link>
    <h1 className="text-xl font-bold">{title}</h1>
    <div className="flex flex-wrap gap-2 items-center"><button className="btn-primary px-3 py-2" onClick={() => goTo(page - 1)} disabled={page <= 1}>Previous</button>
      <label>Page <input key={page} className="input-field w-20" type="number" min="1" max={totalPages || undefined} defaultValue={page} onBlur={(event) => goTo(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.target.blur(); }} /></label>
      <button className="btn-primary px-3 py-2" disabled={totalPages > 0 && page >= totalPages} onClick={() => goTo(page + 1)}>Next</button>
      <button className="border border-gold text-gold px-3 py-2 rounded-lg" onClick={toggleBookmark}>{bookmarks.some((item) => item.pageNumber === page) ? 'Remove bookmark' : 'Bookmark page'}</button></div>
    {url && <><a className="text-gold underline block" href={`${url}#page=${page}`} target="_blank" rel="noreferrer">Open PDF separately</a><button className="text-gold" onClick={() => api.get(fileEndpoint).then(({ data }) => setUrl(data.url)).catch(() => toast.error('Unable to refresh PDF link'))}>Refresh secure link</button><PdfCanvas url={url} page={page} onPageCount={(count) => { setTotalPages(count); if (currentPage.current > count) goTo(count); }} /></>}
    <div className="grid md:grid-cols-2 gap-4"><section className="glass-card p-4"><h2 className="font-semibold mb-2">Bookmarks</h2>{bookmarks.map((item) => <button key={item._id} className="text-gold mr-2" onClick={() => goTo(item.pageNumber)}>Page {item.pageNumber}</button>)}</section>
      <section className="glass-card p-4"><h2 className="font-semibold mb-2">Notes for page {page}</h2>{notes.filter((item) => item.pageNumber === page).map((item) => <p key={item._id} className="mb-2 text-sm">{item.noteText}</p>)}
        <form onSubmit={addNote} className="flex gap-2"><input className="input-field" maxLength="2000" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a note" /><button className="btn-primary px-3">Add</button></form></section></div>
  </div>;
}
