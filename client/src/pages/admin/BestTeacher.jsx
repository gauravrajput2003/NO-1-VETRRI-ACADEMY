import { useEffect, useState } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { FiAward, FiStar } from 'react-icons/fi';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BestTeacher() {
  const [gradings, setGradings] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get(`/admin/best-teacher?month=${month}&year=${year}`).then(r => { if (r.data.success) setGradings(r.data.gradings); });
  }, [month, year]);

  const best = gradings[0];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Best Teacher of the Month</h1><p className="text-white/40 text-sm mt-1">Auto-ranked by monthly grading score</p></div>

      <div className="flex gap-3">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field w-36">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field w-28">
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Best Teacher Card */}
      {best && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 border-2 border-gold/40 bg-gradient-to-r from-gold/5 to-transparent text-center relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 text-gold/20 text-6xl font-bold">🏆</div>
          <FiAward className="text-gold mx-auto mb-4" size={48} />
          <p className="text-gold font-bold text-sm uppercase tracking-widest mb-2">🏆 Best Teacher — {MONTHS[month-1]} {year}</p>
          <img src={best.teacher?.profileImage || `https://i.pravatar.cc/150?u=${best.teacher?._id}`} alt={best.teacher?.name} className="w-24 h-24 rounded-full object-cover border-4 border-gold mx-auto mb-4" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${best.teacher?.name}&background=F5A623&color=0A1628&size=96`; }} />
          <h2 className="text-white font-display font-bold text-2xl">{best.teacher?.name}</h2>
          <p className="text-gold text-sm mt-1">{best.teacher?.qualification}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-6 py-2">
            <FiStar className="text-gold" size={18} />
            <span className="text-gold font-bold text-xl">{best.totalScore}/100</span>
            <span className="text-white/50 text-sm">points</span>
          </div>
          <p className="text-white/40 text-xs mt-3">Ranked #1 out of {gradings.length} teachers</p>
        </motion.div>
      )}

      {/* Rankings Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10"><h3 className="text-white font-semibold">All Teacher Rankings</h3></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>#</th><th>Teacher</th><th>Login</th><th>Papers</th><th>Sheets</th><th>Leave</th><th>Appearance</th><th>Network</th><th>Parent Rating</th><th>Total</th></tr></thead>
            <tbody>
              {gradings.map((g, i) => (
                <tr key={g._id} className={i === 0 ? 'bg-gold/5' : ''}>
                  <td className={i === 0 ? 'text-gold font-bold' : 'text-white/40'}>{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <img src={g.teacher?.profileImage || `https://i.pravatar.cc/32?u=${g.teacher?._id}`} alt="" className="w-7 h-7 rounded-full" />
                      <span className={`font-medium ${i === 0 ? 'text-gold' : 'text-white'}`}>{g.teacher?.name}</span>
                    </div>
                  </td>
                  <td className="text-white/60">{g.loginPunctuality}/20</td>
                  <td className="text-white/60">{g.questionPaperOnTime}/15</td>
                  <td className="text-white/60">{g.answerSheetReturn}/15</td>
                  <td className="text-white/60">{g.leaveScore}/10</td>
                  <td className="text-white/60">{g.professionalAppearance}/10</td>
                  <td className="text-white/60">{g.networkIssues}/10</td>
                  <td className="text-white/60">{g.parentRating}/20</td>
                  <td className={`font-bold text-lg ${i === 0 ? 'text-gold' : 'text-white'}`}>{g.totalScore}</td>
                </tr>
              ))}
              {gradings.length === 0 && <tr><td colSpan={10} className="py-10 text-center text-white/30">No grading data for this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
