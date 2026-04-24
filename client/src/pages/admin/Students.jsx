import { useEffect, useState } from 'react';
import api from '../../services/api';
import { FiUsers, FiSearch } from 'react-icons/fi';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get(`/admin/students${search ? `?search=${search}` : ''}`).then(r => { if (r.data.success) setStudents(r.data.students); }).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div><h1 className="font-display font-bold text-2xl text-white">Students</h1><p className="text-white/40 text-sm mt-1">{students.length} total students</p></div>
        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="input-field pl-9 w-56 py-2.5 text-sm" id="student-search" /></div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Mobile</th><th>Grade</th><th>Board</th><th>Course</th><th>Teacher</th><th>Status</th></tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 font-bold text-sm flex items-center justify-center">{s.name[0]}</div>
                      <span className="text-white font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-white/60 font-mono">{s.mobile}</td>
                  <td className="text-white/60">{s.grade || '—'}</td>
                  <td className="text-white/60">{s.board || '—'}</td>
                  <td className="text-white/60">{s.course?.title || '—'}</td>
                  <td className="text-white/60">{s.assignedTeacher?.name || <span className="text-white/30 italic">Unassigned</span>}</td>
                  <td><span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!loading && students.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-white/30">No students found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
