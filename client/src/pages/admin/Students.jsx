import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiUsers, FiSearch, FiFilter, FiDownload, FiEye, FiEdit2, FiTrash2, FiPlus, FiBell, FiRefreshCw, FiTrendingUp, FiCreditCard, FiCheckCircle, FiUserPlus, FiHome, FiSettings, FiX, FiUser } from 'react-icons/fi';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [addForm, setAddForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    grade: '',
    board: '',
    assignedTeacher: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    email: '',
    grade: '',
    board: '',
    assignedTeacher: '',
    isActive: true,
  });

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/students${search ? `?search=${search}` : ''}`);
      if (data.success) setStudents(data.students || []);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data } = await api.get('/admin/teachers');
      if (data.success) setTeachers(data.teachers || []);
    } catch {}
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Handle Add Student
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.mobile.trim() || !addForm.password) {
      toast.error('Name, mobile and password are required');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', {
        role: 'student',
        name: addForm.name.trim(),
        mobile: addForm.mobile.trim(),
        email: addForm.email.trim() || undefined,
        password: addForm.password,
        grade: addForm.grade.trim() || undefined,
        board: addForm.board.trim() || undefined,
        assignedTeacher: addForm.assignedTeacher || undefined,
      });

      if (data.success) {
        toast.success('✅ Student account created successfully');
        setShowAddModal(false);
        setAddForm({ name: '', mobile: '', email: '', password: '', grade: '', board: '', assignedTeacher: '' });
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Student
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    setSubmitting(true);
    try {
      const { data } = await api.put(`/admin/students/${editStudent._id}`, editForm);
      if (data.success) {
        toast.success('✅ Student updated');
        setEditStudent(null);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Student
  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}? This will remove all their records from the database.`)) {
      return;
    }
    try {
      const { data } = await api.delete(`/admin/students/${student._id}`);
      if (data.success) {
        toast.success('Student deleted');
        fetchStudents();
      }
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const openEdit = (s) => {
    setEditStudent(s);
    setEditForm({
      name: s.name || '',
      mobile: s.mobile || '',
      email: s.email || '',
      grade: s.grade || '',
      board: s.board || '',
      assignedTeacher: s.assignedTeacher?._id || s.assignedTeacher || '',
      isActive: s.isActive !== false,
    });
  };

  // Stats
  const totalStudents = students.length;
  const pendingFees = Math.floor(totalStudents * 0.2);
  const todayAttendance = totalStudents > 0 ? '92%' : '0%';
  const newAdmissions = Math.floor(totalStudents * 0.05);

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-4 md:p-8 font-sans text-[#111827] pb-32">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .search-expanded {
          width: 100%;
        }
        @media (min-width: 1024px) {
          .search-expanded {
            width: 400px !important;
          }
        }
      `}</style>

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-up" style={{ animationDelay: '0ms' }}>
        <div>
          <h1 className="text-[30px] font-bold flex items-center gap-3 tracking-tight">
            <span className="text-2xl">👨‍🎓</span> Students
          </h1>
          <p className="text-[#6B7280] text-[15px] mt-1 font-medium">Manage student accounts, teacher assignments, and academic records.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:shadow-md transition-all duration-200 flex items-center justify-center">
            <FiBell size={18} />
          </button>
          <button 
            onClick={() => fetchStudents()}
            className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:shadow-md transition-all duration-200 flex items-center justify-center"
          >
            <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#FF4F8B] hover:bg-[#ff3b7c] text-white px-5 py-2.5 rounded-[14px] shadow-[0_4px_14px_rgba(255,79,139,0.3)] hover:shadow-[0_6px_20px_rgba(255,79,139,0.4)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 font-semibold text-[15px] ml-2"
          >
            <FiPlus size={20} strokeWidth={2.5} /> Add Student
          </button>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Students', value: totalStudents, icon: <FiUsers size={22} />, color: '#20C7C9', bg: 'rgba(32, 199, 201, 0.12)', grad: 'from-[#20C7C9]/10 to-transparent', trend: '+12% this month' },
          { label: 'Pending Fees', value: pendingFees, icon: <FiCreditCard size={22} />, color: '#F6C453', bg: 'rgba(246, 196, 83, 0.12)', grad: 'from-[#F6C453]/10 to-transparent', trend: 'Needs attention' },
          { label: 'Today\'s Attendance', value: todayAttendance, icon: <FiCheckCircle size={22} />, color: '#20C7C9', bg: 'rgba(32, 199, 201, 0.12)', grad: 'from-[#20C7C9]/10 to-transparent', trend: 'Consistent' },
          { label: 'New Admissions', value: newAdmissions, icon: <FiUserPlus size={22} />, color: '#FF4F8B', bg: 'rgba(255, 79, 139, 0.12)', grad: 'from-[#FF4F8B]/10 to-transparent', trend: '+5 this week' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#E5E7EB] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-200 cursor-default animate-fade-up bg-gradient-to-br ${stat.grad}`} style={{ animationDelay: `${(i+1)*100}ms` }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[#6B7280] text-[14px] font-medium mb-1.5">{stat.label}</p>
                <h3 className="text-[28px] font-bold text-[#111827] leading-none">{stat.value}</h3>
              </div>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: stat.bg, color: stat.color }}>
                {stat.icon}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4">
              <FiTrendingUp size={14} className="text-[#20C7C9]" />
              <p className="text-[#6B7280] text-[13px] font-medium">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH AREA */}
      <div className="bg-white p-4 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between border border-[#E5E7EB] animate-fade-up" style={{ animationDelay: '500ms' }}>
        <div className={`relative transition-all duration-300 w-full lg:w-1/3 ${isSearchFocused ? 'search-expanded' : ''}`}>
          <FiSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isSearchFocused ? 'text-[#20C7C9]' : 'text-[#6B7280]'}`} size={18} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search students by name, mobile or email..." 
            className="w-full pl-11 pr-4 py-3.5 rounded-[14px] bg-[#F5F7FB] border border-transparent focus:bg-white focus:border-[#20C7C9] focus:ring-4 focus:ring-[#20C7C9]/10 outline-none text-[15px] transition-all duration-200 font-medium placeholder:text-[#6B7280]/70"
          />
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="flex flex-col gap-[20px]">
        {students.map((s, idx) => (
          <div key={s._id} className="group bg-white rounded-[20px] p-[20px] border border-[#E5E7EB] shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:-translate-y-1 hover:border-[#FF4F8B] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col lg:flex-row items-center justify-between gap-6 animate-fade-up" style={{ animationDelay: `${600 + (idx * 50)}ms` }}>
            
            {/* LEFT */}
            <div className="flex items-center gap-4 w-full lg:w-[40%]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF4F8B] to-[#F6C453] text-white flex items-center justify-center text-[22px] font-bold shadow-[0_4px_10px_rgba(255,79,139,0.3)] shrink-0">
                {s.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-[18px] font-semibold text-[#111827] truncate">{s.name}</h4>
                <p className="text-[#6B7280] text-[14px] mt-0.5 font-medium">{s.grade || 'Grade N/A'} • {s.board || 'Board N/A'}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[13px] text-[#6B7280] font-medium">
                  <span className="flex items-center gap-1.5"><span className="text-[#111827]/40">📞</span> {s.mobile || 'N/A'}</span>
                  {s.email && <span className="flex items-center gap-1.5 truncate"><span className="text-[#111827]/40">✉️</span> {s.email}</span>}
                </div>
              </div>
            </div>

            {/* CENTER (TEACHER & BADGES) */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-[35%] justify-start lg:justify-center">
              <span className="px-3.5 py-1.5 rounded-full text-[13px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1.5">
                <FiUser size={13} />
                {s.assignedTeacher?.name || 'Unassigned'}
              </span>
              <span className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold border ${s.feePaid !== false ? 'bg-[#20C7C9]/10 text-[#149596] border-[#20C7C9]/20' : 'bg-[#F6C453]/10 text-[#b58b29] border-[#F6C453]/20'}`}>
                {s.feePaid !== false ? 'Paid' : 'Pending'}
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-[13px] font-bold bg-[#F5F7FB] text-[#6B7280] border border-[#E5E7EB] flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.isActive !== false ? 'bg-[#20C7C9]' : 'bg-[#6B7280]'}`}></span>
                {s.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* RIGHT (ACTIONS) */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <button 
                onClick={() => setViewStudent(s)}
                className="w-[42px] h-[42px] rounded-full border-2 border-[#20C7C9] text-[#20C7C9] flex items-center justify-center hover:bg-[#20C7C9] hover:text-white hover:scale-105 transition-all duration-200"
                title="View details"
              >
                <FiEye size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => openEdit(s)}
                className="w-[42px] h-[42px] rounded-full bg-[#FF4F8B] text-white flex items-center justify-center hover:bg-[#ff3b7c] hover:scale-105 transition-all duration-200"
                title="Edit student & assigned teacher"
              >
                <FiEdit2 size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => handleDelete(s)}
                className="w-[42px] h-[42px] rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-200"
                title="Delete student"
              >
                <FiTrash2 size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
        {!loading && students.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[20px] border border-[#E5E7EB] shadow-sm animate-fade-up">
            <div className="w-16 h-16 bg-[#F5F7FB] rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSearch size={24} className="text-[#6B7280]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#111827] mb-1">No students found</h3>
            <p className="text-[#6B7280] text-[14px]">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* ─── ADD STUDENT MODAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                <FiUserPlus className="text-[#FF4F8B]" /> Add New Student
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile / Reg No. *</label>
                  <input
                    type="text"
                    required
                    value={addForm.mobile}
                    onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                    placeholder="Mobile Number"
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="Email (Optional)"
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Login Password *</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Set Password"
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Grade / Class</label>
                  <input
                    type="text"
                    value={addForm.grade}
                    onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })}
                    placeholder="e.g. 10th"
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Board</label>
                  <input
                    type="text"
                    value={addForm.board}
                    onChange={(e) => setAddForm({ ...addForm, board: e.target.value })}
                    placeholder="e.g. CBSE / State Board"
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B]"
                  />
                </div>
              </div>

              {/* ASSIGNED TEACHER DROPDOWN */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Teacher *</label>
                <select
                  value={addForm.assignedTeacher}
                  onChange={(e) => setAddForm({ ...addForm, assignedTeacher: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#FF4F8B] cursor-pointer"
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.mobile || t.email || 'Teacher'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#FF4F8B] text-white font-semibold hover:bg-[#ff3b7c] disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT STUDENT MODAL ─── */}
      {editStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                <FiEdit2 className="text-[#20C7C9]" /> Edit Student: {editStudent.name}
              </h2>
              <button onClick={() => setEditStudent(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile / Reg No.</label>
                  <input
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Grade / Class</label>
                  <input
                    type="text"
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Board</label>
                  <input
                    type="text"
                    value={editForm.board}
                    onChange={(e) => setEditForm({ ...editForm, board: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9]"
                  />
                </div>
              </div>

              {/* ASSIGNED TEACHER DROPDOWN */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned Teacher</label>
                <select
                  value={editForm.assignedTeacher}
                  onChange={(e) => setEditForm({ ...editForm, assignedTeacher: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9] cursor-pointer"
                >
                  <option value="">-- Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.mobile || t.email || 'Teacher'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={editForm.isActive ? 'true' : 'false'}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F7FB] border border-gray-200 outline-none focus:border-[#20C7C9] cursor-pointer"
                >
                  <option value="true">Active Student</option>
                  <option value="false">Inactive / Discontinued</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#20C7C9] text-white font-semibold hover:bg-[#1bb3b5] disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── VIEW STUDENT MODAL ─── */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl animate-fade-up">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-[#111827]">Student Profile</h2>
              <button onClick={() => setViewStudent(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#FF4F8B] text-white font-bold flex items-center justify-center text-lg">
                  {viewStudent.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">{viewStudent.name}</h3>
                  <p className="text-xs text-gray-500">Grade: {viewStudent.grade || 'N/A'} • Board: {viewStudent.board || 'N/A'}</p>
                </div>
              </div>
              <p><strong>Mobile:</strong> {viewStudent.mobile || 'N/A'}</p>
              <p><strong>Email:</strong> {viewStudent.email || 'N/A'}</p>
              <p><strong>Assigned Teacher:</strong> {viewStudent.assignedTeacher?.name || 'Unassigned'}</p>
              <p><strong>Status:</strong> {viewStudent.isActive !== false ? 'Active' : 'Discontinued / Inactive'}</p>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t">
              <button
                onClick={() => {
                  const s = viewStudent;
                  setViewStudent(null);
                  handleDelete(s);
                }}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100"
              >
                Delete Student
              </button>
              <button
                onClick={() => setViewStudent(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
