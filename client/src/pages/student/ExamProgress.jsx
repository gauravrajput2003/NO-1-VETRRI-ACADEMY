import { useEffect, useState } from 'react';
import api from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiBarChart2, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

const SUBJECT_COLORS = {
  'Maths': '#F5A623',
  'Physics': '#3B82F6',
  'Chemistry': '#10B981',
  'English': '#8B5CF6',
};

export default function ExamProgress({ onScoresSeen }) {
  const [scores, setScores] = useState([]);
  const [bySubject, setBySubject] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/scores').then(r => {
      if (r.data.success) {
        setScores(r.data.scores);
        setBySubject(r.data.bySubject);
      }
    }).finally(() => { setLoading(false); onScoresSeen?.(); });
  }, []);

  // Calculate GPA
  const getGradePoint = (pct) => {
    if (pct >= 90) return 4.0;
    if (pct >= 80) return 3.7;
    if (pct >= 70) return 3.3;
    if (pct >= 60) return 3.0;
    if (pct >= 50) return 2.7;
    return 0.0;
  };

  let totalPoints = 0;
  let totalExams = 0;
  
  scores.forEach(s => {
    const pct = (s.marksObtained / s.maxMarks) * 100;
    totalPoints += getGradePoint(pct);
    totalExams++;
  });

  const overallGPA = totalExams > 0 ? (totalPoints / totalExams).toFixed(1) : '0.0';
  
  const getGPADetails = (gpa) => {
    const num = parseFloat(gpa);
    if (num >= 3.5) return { label: 'Excellent', color: '#F5A623' };
    if (num >= 3.0) return { label: 'Good', color: '#10B981' };
    if (num >= 2.5) return { label: 'Average', color: '#F59E0B' };
    if (num > 0) return { label: 'Needs Work', color: '#EF4444' };
    return { label: 'No Data', color: '#94A3B8' };
  };
  
  const gpaDetails = getGPADetails(overallGPA);
  const subjectsWithData = Object.keys(bySubject);

  // Group data by date for Recharts LineChart
  const dateMap = {};
  scores.forEach(s => {
    const dateStr = new Date(s.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
    if (!dateMap[dateStr]) dateMap[dateStr] = { date: dateStr, displayDate: dateStr };
    
    const pct = (s.marksObtained / s.maxMarks) * 100;
    dateMap[dateStr][s.subject] = pct;
  });
  
  const lineChartData = Object.values(dateMap).sort((a, b) => {
    // Simple sort by assuming formatting was consistent
    const [d1, m1] = a.date.split('/');
    const [d2, m2] = b.date.split('/');
    return new Date(`2024-${m1}-${d1}`) - new Date(`2024-${m2}-${d2}`); // approximate year for relative sort
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0A1628] border border-gold/30 rounded-xl p-3 shadow-xl">
          <p className="text-white/60 text-xs mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white font-medium text-sm">{entry.name}:</span>
              <span className="text-white font-bold" style={{ color: entry.color }}>{Number(entry.value).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Exam Progress</h1>
        <p className="text-white/40 text-sm mt-1">Track your academic performance over time</p>
      </div>

      {scores.length === 0 ? (
        <div className="glass-card p-12 text-center text-white/30">
          <FiBarChart2 size={48} className="mx-auto mb-4 opacity-30 text-gold" />
          <p className="text-lg">No exam scores yet.</p>
          <p className="text-sm mt-1">Your progress will appear here after your first exam.</p>
        </div>
      ) : (
        <>
          {/* GPA Card */}
          <div className="bg-[#0F1F35] border border-[#1E3A5F] rounded-2xl p-8 flex flex-col items-center text-center">
            <h3 className="text-white/60 font-semibold mb-2">Overall GPA</h3>
            <div className="text-6xl md:text-7xl font-bold font-display tracking-tight mb-2" style={{ color: gpaDetails.color }}>
              {overallGPA} <span className="text-white/20 text-4xl">/ 4.0</span>
            </div>
            <div 
              className="inline-flex px-4 py-1 rounded-full bg-white/5 border text-sm font-semibold mb-4"
              style={{ borderColor: `${gpaDetails.color}50`, color: gpaDetails.color }}
            >
              {gpaDetails.label}
            </div>
            <p className="text-white/40 text-sm">
              Based on {totalExams} exams across {subjectsWithData.length} subjects
            </p>
          </div>

          {/* Subject Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectsWithData.map(subject => {
              const subScores = bySubject[subject].map(s => s.percentage || ((s.marksObtained/s.maxMarks)*100));
              const avg = subScores.reduce((a, b) => a + b, 0) / subScores.length;
              const best = Math.max(...subScores);
              const first = subScores[0];
              const last = subScores[subScores.length - 1];
              
              let trendIcon = <FiMinus className="text-white/40" />;
              if (subScores.length > 1) {
                if (last > first) trendIcon = <FiTrendingUp className="text-green-500" />;
                if (last < first) trendIcon = <FiTrendingDown className="text-red-500" />;
              }

              return (
                <div key={subject} className="bg-[#0F1F35] border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[subject] || '#94A3B8' }} />
                      <h4 className="text-white font-medium">{subject}</h4>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center" title="Trend">
                      {trendIcon}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-white/40 text-xs mb-1">Average Score</p>
                      <p className="text-2xl font-bold text-white">{avg.toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-xs mb-1">Best Score</p>
                      <p className="text-gold font-bold">{best.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-right text-xs text-white/30">
                    {subScores.length} Exams taken
                  </div>
                </div>
              );
            })}
          </div>

          {/* Multi-Subject Line Chart */}
          <div className="glass-card p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <FiTrendingUp className="text-gold" /> Performance Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="displayDate" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                
                {subjectsWithData.map(subject => (
                  <Line 
                    key={subject}
                    type="monotone" 
                    dataKey={subject} 
                    name={subject}
                    stroke={SUBJECT_COLORS[subject] || '#94A3B8'} 
                    strokeWidth={3} 
                    dot={{ fill: SUBJECT_COLORS[subject] || '#94A3B8', r: 4, strokeWidth: 0 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Score Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FiBarChart2 className="text-gold" /> Detailed History
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Exam</th><th>Subject</th><th>Score</th><th>Percentage</th><th>Date</th><th>Remarks</th></tr></thead>
                <tbody>
                  {scores.map(s => {
                    const pct = ((s.marksObtained / s.maxMarks) * 100);
                    return (
                      <tr key={s._id}>
                        <td className="text-white font-medium">{s.examTitle}</td>
                        <td className="text-white/60">{s.subject}</td>
                        <td><span className="text-gold font-bold">{s.marksObtained}</span><span className="text-white/40">/{s.maxMarks}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-white/10 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-gold' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-gold' : 'text-red-400'}`}>{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="text-white/40">{new Date(s.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td className="text-white/40 text-xs">{s.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
