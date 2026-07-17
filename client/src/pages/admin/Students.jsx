import { useEffect, useState } from 'react';
import api from '../../services/api';
import { FiUsers, FiSearch, FiFilter, FiDownload, FiEye, FiEdit2, FiMoreVertical, FiPlus, FiBell, FiRefreshCw, FiTrendingUp, FiCreditCard, FiCheckCircle, FiUserPlus, FiHome, FiSettings } from 'react-icons/fi';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get(`/admin/students${search ? `?search=${search}` : ''}`).then(r => { 
        if (r.data.success) setStudents(r.data.students); 
      }).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Derived dummy stats for UI demonstration as requested
  const totalStudents = students.length;
  const pendingFees = Math.floor(totalStudents * 0.2); // dummy derived
  const todayAttendance = totalStudents > 0 ? '92%' : '0%'; // dummy derived
  const newAdmissions = Math.floor(totalStudents * 0.05); // dummy derived

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
          <p className="text-[#6B7280] text-[15px] mt-1 font-medium">Manage student accounts, fee records and academic information.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:shadow-md transition-all duration-200 flex items-center justify-center">
            <FiBell size={18} />
          </button>
          <button 
            onClick={() => setLoading(true)}
            className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:shadow-md transition-all duration-200 flex items-center justify-center"
          >
            <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:shadow-md transition-all duration-200 flex items-center justify-center">
            <FiFilter size={18} />
          </button>
          <button className="bg-[#FF4F8B] hover:bg-[#ff3b7c] text-white px-5 py-2.5 rounded-[14px] shadow-[0_4px_14px_rgba(255,79,139,0.3)] hover:shadow-[0_6px_20px_rgba(255,79,139,0.4)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 font-semibold text-[15px] ml-2">
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
        <div className="flex w-full lg:w-auto items-center gap-3 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          <select className="px-4 py-3 rounded-[12px] bg-[#F5F7FB] text-[#111827] text-[14px] font-semibold border border-transparent outline-none focus:border-[#20C7C9] focus:ring-2 focus:ring-[#20C7C9]/20 transition-all cursor-pointer hover:bg-[#E5E7EB]/50">
            <option value="">Class Filter</option>
            <option value="10">10th Grade</option>
            <option value="12">12th Grade</option>
          </select>
          <select className="px-4 py-3 rounded-[12px] bg-[#F5F7FB] text-[#111827] text-[14px] font-semibold border border-transparent outline-none focus:border-[#20C7C9] focus:ring-2 focus:ring-[#20C7C9]/20 transition-all cursor-pointer hover:bg-[#E5E7EB]/50">
            <option value="">Board Filter</option>
            <option value="cbse">CBSE</option>
            <option value="state">State Board</option>
          </select>
          <select className="px-4 py-3 rounded-[12px] bg-[#F5F7FB] text-[#111827] text-[14px] font-semibold border border-transparent outline-none focus:border-[#20C7C9] focus:ring-2 focus:ring-[#20C7C9]/20 transition-all cursor-pointer hover:bg-[#E5E7EB]/50">
            <option value="">Sort</option>
            <option value="name">Name A-Z</option>
            <option value="recent">Recently Added</option>
          </select>
          <button className="px-5 py-3 rounded-[12px] bg-white hover:bg-[#F5F7FB] text-[#111827] text-[14px] font-semibold transition-all flex items-center gap-2 border border-[#E5E7EB] hover:border-[#D1D5DB] whitespace-nowrap shadow-sm hover:shadow">
            <FiDownload size={16} /> Export
          </button>
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

            {/* CENTER (BADGES) */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-[35%] justify-start lg:justify-center">
               <span className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold border ${s.feePaid !== false ? 'bg-[#20C7C9]/10 text-[#149596] border-[#20C7C9]/20' : 'bg-[#F6C453]/10 text-[#b58b29] border-[#F6C453]/20'}`}>
                 {s.feePaid !== false ? 'Paid' : 'Pending'}
               </span>
               <span className="px-3.5 py-1.5 rounded-full text-[13px] font-bold bg-[#FF4F8B]/10 text-[#d93a6e] border border-[#FF4F8B]/20">
                 Attendance
               </span>
               <span className="px-3.5 py-1.5 rounded-full text-[13px] font-bold bg-[#F5F7FB] text-[#6B7280] border border-[#E5E7EB] flex items-center gap-2">
                 <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-[#20C7C9]' : 'bg-[#6B7280]'}`}></span>
                 {s.isActive ? 'Online' : 'Offline'}
               </span>
            </div>

            {/* RIGHT (BUTTONS) */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
               <button className="w-[42px] h-[42px] rounded-full border-2 border-[#20C7C9] text-[#20C7C9] flex items-center justify-center hover:bg-[#20C7C9] hover:text-white hover:scale-105 hover:shadow-[0_4px_12px_rgba(32,199,201,0.3)] transition-all duration-200">
                 <FiEye size={18} strokeWidth={2.5} />
               </button>
               <button className="w-[42px] h-[42px] rounded-full bg-[#FF4F8B] text-white flex items-center justify-center hover:bg-[#ff3b7c] hover:scale-105 hover:shadow-[0_4px_14px_rgba(255,79,139,0.4)] transition-all duration-200">
                 <FiEdit2 size={18} strokeWidth={2.5} />
               </button>
               <div className="relative ml-1">
                 <button className="w-[42px] h-[42px] rounded-full text-[#6B7280] hover:bg-[#F5F7FB] hover:text-[#111827] flex items-center justify-center transition-colors">
                   <FiMoreVertical size={20} strokeWidth={2.5} />
                 </button>
               </div>
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

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[22px] px-8 py-3.5 flex items-center gap-10 z-50 animate-fade-up" style={{ animationDelay: '800ms' }}>
         <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="w-[46px] h-[46px] rounded-[16px] bg-gradient-to-br from-[#FF4F8B] to-[#20C7C9] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(255,79,139,0.3)] group-hover:scale-105 transition-transform duration-200">
               <FiUsers size={22} />
            </div>
            <span className="text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF4F8B] to-[#20C7C9]">Students</span>
         </div>
         <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="w-[46px] h-[46px] rounded-[16px] text-[#6B7280] flex items-center justify-center group-hover:bg-[#F5F7FB] group-hover:text-[#111827] transition-all duration-200">
               <FiHome size={22} />
            </div>
         </div>
         <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="w-[46px] h-[46px] rounded-[16px] text-[#6B7280] flex items-center justify-center group-hover:bg-[#F5F7FB] group-hover:text-[#111827] transition-all duration-200">
               <FiSearch size={22} />
            </div>
         </div>
         <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="w-[46px] h-[46px] rounded-[16px] text-[#6B7280] flex items-center justify-center group-hover:bg-[#F5F7FB] group-hover:text-[#111827] transition-all duration-200">
               <FiSettings size={22} />
            </div>
         </div>
      </div>
    </div>
  );
}
