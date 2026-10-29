import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function TopPerformers() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/student/dashboard').then(({ data }) => setRows((data.dashboard?.leaderboard || []).slice(0, 5)))
      .catch((cause) => setError(cause.response?.data?.message || 'Unable to load rankings'));
  }, []);
  return <section className="text-white space-y-5">
    <div><h1 className="text-2xl font-bold">Top Performers</h1><p className="text-white/50">This week's exam score leaders</p></div>
    {error && <p className="text-red-300">{error}</p>}
    {!error && rows.length === 0 && <p className="text-white/50">No scores have been published this week.</p>}
    {rows.map((row, index) => <div key={row._id?._id || index} className="glass-card p-4 flex items-center gap-4">
      <span className="text-gold text-xl font-bold w-12">#{index + 1}</span>
      <div className="flex-1"><p className="font-semibold">{row._id?.name || 'Student'}</p><p className="text-white/40 text-sm">{row._id?.grade || ''} · {row.count || 0} exams</p></div>
      <strong>{row.totalScore || 0} points</strong>
    </div>)}
  </section>;
}
