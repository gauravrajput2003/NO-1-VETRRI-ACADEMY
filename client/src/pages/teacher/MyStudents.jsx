import { useEffect, useState } from 'react';
import api from '../../services/api';
import { FiUsers, FiMail, FiPhone } from 'react-icons/fi';

export default function MyStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/teacher/students').then(r => { if (r.data.success) setStudents(r.data.students); }).finally(() => setLoading(false)); }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">My Students</h1><p className="text-white/40 text-sm mt-1">{students.length} students assigned to you</p></div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Grade</th><th>Board</th><th>Course</th><th>Admission Status</th></tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">{s.name[0]}</div>
                      <span className="text-white font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-white/60">{s.grade || '—'}</td>
                  <td className="text-white/60">{s.board || '—'}</td>
                  <td className="text-white/60">{s.course?.title || '—'}</td>
                  <td><span className={`badge ${s.admissionFormFilled ? 'badge-green' : 'badge-gold'}`}>{s.admissionFormFilled ? 'Form Filled' : 'Pending'}</span></td>
                </tr>
              ))}
              {students.length === 0 && !loading && (
                <tr><td colSpan={5} className="text-center py-10 text-white/30">No students assigned yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
