import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiSearch, FiSave, FiAward, FiStar, FiEdit2, FiCheckCircle } from 'react-icons/fi';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import api from '../../services/api';

const PARAMETERS = [
  { key: 'loginPunctuality', label: '1. Login Punctuality', max: 20, hint: 'Did teacher join on time?' },
  { key: 'questionPaperDistribution', label: '2. Question Paper Distribution', max: 15, hint: 'Papers sent before deadline?' },
  { key: 'answerSheetReturn', label: '3. Answer Sheet Return', max: 15, hint: 'Corrected sheets returned within 48 hours?' },
  { key: 'leaveManagement', label: '4. Leave Management', max: 10, hint: 'Minimal unplanned leaves?' },
  { key: 'professionalAppearance', label: '5. Professional Appearance', max: 10, hint: 'Neat presentation in class?' },
  { key: 'networkIssues', label: '6. Network Issues', max: 10, hint: 'Classes conducted without connectivity problems?' },
  { key: 'parentRating', label: '7. Parent Rating', max: 20, hint: 'Average parent feedback score this month?' },
];

export default function TeacherGrading() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [scores, setScores] = useState({
    loginPunctuality: 0,
    questionPaperDistribution: 0,
    answerSheetReturn: 0,
    leaveManagement: 0,
    professionalAppearance: 0,
    networkIssues: 0,
    parentRating: 0,
  });

  const [scorecards, setScorecards] = useState([]);
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeachers();
    fetchScorecards();
  }, [filterMonth]);

  const fetchTeachers = async () => {
    try {
      const { data } = await api.get('/users?role=teacher');
      if (data.success) setTeachers(data.users);
    } catch {}
  };

  const fetchScorecards = async () => {
    try {
      const { data } = await api.get(`/teacher-grading/all?month=${filterMonth}`);
      if (data.success) setScorecards(data.gradings);
    } catch (err) {
      toast.error('Failed to load scorecards');
    }
  };

  const handleScoreChange = (key, val, max) => {
    let num = parseInt(val) || 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    setScores(prev => ({ ...prev, [key]: num }));
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const getScoreColor = (score) => {
    if (score >= 75) return '#10B981'; // Green
    if (score >= 50) return '#F5A623'; // Yellow
    return '#EF4444'; // Red
  };

  const handleSave = async (publish = false) => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }
    
    if (publish) {
      if (!window.confirm('Publishing will make this scorecard visible to the teacher. Continue?')) return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/teacher-grading', {
        teacherId: selectedTeacher,
        month,
        scores
      });

      if (data.success) {
        if (publish) {
          await api.patch(`/teacher-grading/${data.grading._id}/publish`);
        }
        toast.success(publish ? 'Scorecard published ✅' : 'Draft saved 💾');
        fetchScorecards();
        
        // Reset form
        setSelectedTeacher('');
        setScores({
          loginPunctuality: 0,
          questionPaperDistribution: 0,
          answerSheetReturn: 0,
          leaveManagement: 0,
          professionalAppearance: 0,
          networkIssues: 0,
          parentRating: 0,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (card) => {
    setSelectedTeacher(card.teacher._id || card.teacher);
    setMonth(`${card.year}-${String(card.monthNumber).padStart(2, '0')}`);
    setScores({ ...card.scores });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublishFromTable = async (id) => {
    if (!window.confirm('Publishing will make this scorecard visible to the teacher. Continue?')) return;
    try {
      const { data } = await api.patch(`/teacher-grading/${id}/publish`);
      if (data.success) {
        toast.success('Published successfully');
        fetchScorecards();
      }
    } catch {
      toast.error('Failed to publish');
    }
  };

  const chartData = [{ name: 'Total', value: totalScore, fill: getScoreColor(totalScore) }];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Monthly Teacher Grading</h1>
        <p className="text-white/40 text-sm mt-1">Evaluate teachers for performance ranking</p>
      </div>

      {/* SECTION A: Grade a Teacher */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Create / Edit Scorecard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="input-label">📝 Select Teacher</label>
            <select 
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="input-field"
            >
              <option value="">-- Choose a Teacher --</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.qualification || 'Teacher'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">📅 Evaluation Month</label>
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {selectedTeacher && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {PARAMETERS.map(param => (
                <div key={param.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-gold/30 transition-all">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{param.label} <span className="text-gold">/{param.max}</span></p>
                    <p className="text-white/40 text-xs mt-1">{param.hint}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input 
                      type="number"
                      min={0}
                      max={param.max}
                      value={scores[param.key]}
                      onChange={(e) => handleScoreChange(param.key, e.target.value, param.max)}
                      className="bg-[#0A1628] border border-white/20 text-white rounded-lg px-3 py-2 w-20 text-center focus:border-gold focus:outline-none"
                    />
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(scores[param.key] / param.max) * 100}%` }}
                        className="h-full bg-gold rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Display */}
            <div className="flex flex-col items-center justify-center p-6 border border-white/10 rounded-2xl bg-[#0A1628]/50">
              <RadialBarChart 
                width={180} 
                height={180} 
                cx="50%" 
                cy="50%" 
                innerRadius="70%" 
                outerRadius="100%" 
                barSize={10} 
                data={chartData} 
                startAngle={90} 
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
              </RadialBarChart>
              
              <div className="text-center -mt-24 mb-10">
                <span className="text-4xl font-bold font-display" style={{ color: getScoreColor(totalScore) }}>
                  {totalScore}
                </span>
                <span className="text-white/40 text-lg">/100</span>
              </div>
              
              <div className="flex flex-col gap-3 w-full mt-8">
                <button 
                  onClick={() => handleSave(false)}
                  disabled={submitting}
                  className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <FiSave /> Save Draft
                </button>
                <button 
                  onClick={() => handleSave(true)}
                  disabled={submitting}
                  className="bg-gold hover:bg-yellow-400 text-navy font-bold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <FiCheckCircle /> Save & Publish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: All Teacher Scorecards */}
      <div className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] overflow-hidden">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <FiAward className="text-gold" /> Teacher Rankings
          </h3>
          <input 
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="input-field w-auto min-w-[200px]"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0A1628]/50 text-white/50 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Rank</th>
                <th className="px-5 py-4">Teacher Name</th>
                <th title="Login Punctuality (20)" className="px-5 py-4">L.Punc</th>
                <th title="Question Paper (15)" className="px-5 py-4">Q.Papr</th>
                <th title="Answer Sheet (15)" className="px-5 py-4">A.Shet</th>
                <th title="Leave Management (10)" className="px-5 py-4">Leave</th>
                <th title="Professional Appearance (10)" className="px-5 py-4">Appr</th>
                <th title="Network Issues (10)" className="px-5 py-4">Net</th>
                <th title="Parent Rating (20)" className="px-5 py-4">PRate</th>
                <th className="px-5 py-4 text-gold font-bold">Total</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 whitespace-nowrap">
              {scorecards.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-white/40">No scorecards found for this month</td>
                </tr>
              ) : (
                scorecards.map((card) => {
                  const isRank1 = card.rank === 1 && card.isPublished;
                  return (
                    <tr key={card._id} className={`hover:bg-white/5 transition-colors ${isRank1 ? 'bg-gold/5 border-l-4 border-l-gold' : ''}`}>
                      <td className="px-5 py-4">
                        {card.isPublished ? (
                          card.rank === 1 ? <span className="text-2xl" title="Rank 1">🏆</span> :
                          card.rank === 2 ? <span className="text-2xl" title="Rank 2">🥈</span> :
                          card.rank === 3 ? <span className="text-2xl" title="Rank 3">🥉</span> :
                          <span className="text-white/60 font-semibold pl-2">{card.rank}</span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={card.teacher?.profilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${card.teacher?._id}`} alt="avatar" className="w-8 h-8 rounded-full bg-white/10" />
                          <span className="text-white font-medium">{card.teacher?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.loginPunctuality}</td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.questionPaperDistribution}</td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.answerSheetReturn}</td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.leaveManagement}</td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.professionalAppearance}</td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.networkIssues}</td>
                      <td className="px-5 py-4 text-white/70 text-sm">{card.scores.parentRating}</td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-base" style={{ color: getScoreColor(card.totalScore) }}>
                          {card.totalScore}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {card.isPublished 
                          ? <span className="badge badge-green">Published</span> 
                          : <span className="badge bg-white/10 text-white/60">Draft</span>
                        }
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(card)}
                            className="p-1.5 text-white/40 hover:text-white rounded bg-white/5 transition-all"
                            title="Edit Scorecard"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          {!card.isPublished && (
                            <button 
                              onClick={() => handlePublishFromTable(card._id)}
                              className="px-2 py-1 bg-gold/20 text-gold text-xs font-semibold rounded hover:bg-gold/30 transition-all"
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
