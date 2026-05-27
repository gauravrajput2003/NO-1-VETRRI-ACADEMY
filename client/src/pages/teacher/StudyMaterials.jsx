import { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiUpload, FiToggleLeft, FiToggleRight, FiFileText, FiVideo } from 'react-icons/fi';
import { performDirectUploadFlow } from '../../services/directUpload';

export default function StudyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState('');
  const fileRef = useRef();
  const [form, setForm] = useState({ title: '', subject: '', grade: '', lockedForAll: true });

  useEffect(() => {
    api.get('/teacher/materials').then(r => { if (r.data.success) setMaterials(r.data.materials); });
    api.get('/teacher/students').then(r => { if (r.data.success) setStudents(r.data.students); });
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) { toast.error('Select a file'); return; }
    setLoading(true);
    setUploadProgress(0);
    try {
      const material = await performDirectUploadFlow(file, form, 'cloudinary', (progress) => {
        setUploadProgress(progress);
      });
      toast.success('Material uploaded!');
      setMaterials(prev => [material, ...prev]);
      fileRef.current.value = '';
      setForm({ title: '', subject: '', grade: '', lockedForAll: true });
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };


  const toggleLock = async (matId, studentId, unlock) => {
    try {
      await api.put(`/teacher/materials/${matId}/lock`, { studentId, unlock });
      toast.success(`Material ${unlock ? 'unlocked' : 'locked'} for student`);
    } catch (e) { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Study Materials</h1><p className="text-white/40 text-sm mt-1">Upload and manage materials — control student access</p></div>

      <div className="glass-card p-6 border border-purple-500/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FiUpload className="text-purple-400" /> Upload Material</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="input-label">Title *</label><input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} className="input-field" placeholder="e.g., Chapter 5 Notes" required /></div>
            <div><label className="input-label">Subject *</label><input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} className="input-field" placeholder="Mathematics" required /></div>
            <div><label className="input-label">Grade</label><select value={form.grade} onChange={e => setForm(p => ({...p, grade: e.target.value}))} className="input-field"><option value="">All</option>{['6th','7th','8th','9th','10th','11th','12th'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div className="flex items-center gap-3">
            <label className="input-label mb-0">Locked by default:</label>
            <button type="button" onClick={() => setForm(p => ({...p, lockedForAll: !p.lockedForAll}))} className={`flex items-center gap-2 text-sm ${form.lockedForAll ? 'text-red-400' : 'text-green-400'}`}>
              {form.lockedForAll ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />} {form.lockedForAll ? 'Locked' : 'Unlocked'}
            </button>
          </div>
          <div>
            <label className="input-label">File (PDF/PPT/Video/Image)</label>
            <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx,.mp4,.webm,.jpg,.png,.jpeg" className="input-field py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-gold/20 file:text-gold file:text-sm cursor-pointer" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary py-2.5 px-6 flex items-center gap-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading {uploadProgress}%</span>
              </>
            ) : (
              <>
                <FiUpload size={16} />
                <span>Upload Material</span>
              </>
            )}
          </button>

        </form>
      </div>

      {/* Materials list */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-semibold">My Materials ({materials.length})</h3>
          <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="input-field py-1.5 text-sm w-48">
            <option value="">Select student to manage access</option>
            {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Default Lock</th>{selectedStudent && <th>Student Access</th>}</tr></thead>
            <tbody>
              {materials.map(m => (
                <tr key={m._id}>
                  <td className="text-white font-medium">{m.title}</td>
                  <td className="text-white/60">{m.subject}</td>
                  <td><span className={`badge ${m.type === 'video' ? 'badge-blue' : m.type === 'pdf' ? 'badge-red' : 'badge-gold'}`}>{m.type.toUpperCase()}</span></td>
                  <td><span className={`badge ${m.lockedForAll ? 'badge-red' : 'badge-green'}`}>{m.lockedForAll ? 'Locked' : 'Open'}</span></td>
                  {selectedStudent && (
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => toggleLock(m._id, selectedStudent, true)} className="text-green-400 text-xs hover:underline">Unlock</button>
                        <button onClick={() => toggleLock(m._id, selectedStudent, false)} className="text-red-400 text-xs hover:underline">Lock</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {materials.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-white/30">No materials uploaded yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
