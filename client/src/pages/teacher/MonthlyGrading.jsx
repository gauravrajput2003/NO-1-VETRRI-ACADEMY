import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { FiAward } from 'react-icons/fi';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlyReport() {
  const { user } = useAuth();
  const [grading, setGrading] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/teacher/grading/${month}/${year}`).then(r => { if (r.data.success) setGrading(r.data.grading); }).finally(() => setLoading(false));
  }, [month, year]);

  const scoreBreakdown = grading ? [
    { subject: 'Login Punctuality', A: grading.loginPunctuality, fullMark: 20 },
    { subject: 'Question Paper', A: grading.questionPaperOnTime, fullMark: 15 },
    { subject: 'Answer Sheet', A: grading.answerSheetReturn, fullMark: 15 },
    { subject: 'Leave Score', A: grading.leaveScore, fullMark: 10 },
    { subject: 'Appearance', A: grading.professionalAppearance, fullMark: 10 },
    { subject: 'Network', A: grading.networkIssues, fullMark: 10 },
    { subject: 'Parent Rating', A: grading.parentRating, fullMark: 20 },
  ] : [];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-white">Monthly Grading Report</h1><p className="text-white/40 text-sm mt-1">Auto-calculated 100-point performance score</p></div>

      <div className="flex gap-3">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field w-40">
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field w-28">
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <div className="skeleton h-64 rounded-xl" /> : grading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score breakdown */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Score Breakdown</h3>
              <div className={`text-4xl font-display font-black ${grading.totalScore >= 80 ? 'text-green-400' : grading.totalScore >= 60 ? 'text-gold' : 'text-red-400'}`}>
                {grading.totalScore}<span className="text-lg text-white/40">/100</span>
              </div>
            </div>
            <div className="space-y-3">
              {scoreBreakdown.map(s => (
                <div key={s.subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">{s.subject}</span>
                    <span className="text-white font-medium">{s.A}/{s.fullMark}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${(s.A / s.fullMark) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {grading.isBestTeacher && (
              <div className="mt-5 p-3 bg-gold/10 border border-gold/30 rounded-xl flex items-center gap-3">
                <FiAward className="text-gold" size={24} />
                <div>
                  <p className="text-gold font-bold">🏆 Best Teacher of the Month!</p>
                  <p className="text-white/50 text-xs">Congratulations, {user?.name?.split(' ')[0]}!</p>
                </div>
              </div>
            )}
          </div>

          {/* Radar Chart */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-4">Performance Radar</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={scoreBreakdown}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <Radar name="Score" dataKey="A" stroke="#F5A623" fill="#F5A623" fillOpacity={0.2} />
                <Tooltip contentStyle={{ background: '#0A1628', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '12px', color: 'white' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center text-white/30">
          <FiAward size={48} className="mx-auto mb-4 opacity-30" />
          <p>No grading data for {MONTHS[month-1]} {year}.</p>
          <p className="text-xs mt-1">Admin will submit your monthly grading.</p>
        </div>
      )}
    </div>
  );
}
