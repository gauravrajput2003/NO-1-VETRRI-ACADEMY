import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function PdfAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  useEffect(() => {
    api.get('/pdf/analytics/teacher', { params: { period } }).then(({ data }) => setAnalytics(data.analytics))
      .catch((error) => toast.error(error.response?.data?.message || 'Unable to load reading analytics'));
  }, [period]);
  return <div className="space-y-5 text-white"><div><h1 className="text-2xl font-bold">PDF Reading Analytics</h1><p className="text-white/50">How students use your study materials.</p></div>
    <select className="input-field max-w-xs" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="all">All time</option></select>
    {analytics && <><div className="grid sm:grid-cols-3 gap-3">{[['Opens', analytics.totalOpens], ['Students', analytics.uniqueStudents], ['Average completion', `${analytics.avgCompletion || 0}%`]].map(([label, value]) => <div key={label} className="glass-card p-4"><p className="text-white/50 text-sm">{label}</p><strong className="text-xl">{value || 0}</strong></div>)}</div>
      <div className="glass-card p-4 space-y-2"><h2 className="font-semibold">By material</h2>{analytics.materialBreakdown?.map((entry) => <div key={entry.material?._id} className="border-t border-white/10 py-2 flex justify-between"><span>{entry.material?.title || 'Material'}</span><span className="text-white/60">{entry.totalOpens} opens · {entry.uniqueStudentCount} students · {entry.avgCompletion || 0}%</span></div>)}</div></>}
  </div>;
}
