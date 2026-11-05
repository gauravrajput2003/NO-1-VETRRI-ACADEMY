import { motion, useReducedMotion } from 'framer-motion';
import { Award, BarChart3, BookOpenCheck, CheckCheck, Clock3, FileCheck2, MessageCircle, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Badge, Card, EmptyState, ProgressBar, ProgressRing } from './components';

const icons = [Clock3, FileCheck2, CheckCheck, BookOpenCheck, MessageCircle];
export function PerformanceOverview({ report }) {
  const reduced = useReducedMotion();
  return <motion.div className="va-performance-overview" initial={false} whileHover={reduced ? undefined : { y: -3 }} transition={{ duration: reduced ? 0 : .3 }}>
    <div className="va-performance-ring">{report.totalScore == null ? <EmptyState icon={Award} title="Score not available yet" /> : <ProgressRing value={Number(report.totalScore)} label="Score / 100" />}</div>
    <div className="va-performance-coverage"><span className="va-icon-chip va-tone-gold"><ShieldCheck size={22} /></span><h3>Evidence behind your score</h3><ProgressBar value={Number(report.coverage) || 0} label="Evidence coverage" detail={`${report.coverage ?? 0}%`} /><p className="va-secondary va-small">{report.rank ? `Overall rank ${report.rank}` : 'Unranked · more evidence needed'}{report.isBestTeacher ? ' · Best teacher' : ''}</p></div>
  </motion.div>;
}
export function PerformanceMetric({ component, index }) {
  const Icon = icons[index % icons.length];
  return <div className="va-performance-metric"><span className={`va-icon-chip va-tone-${index % 2 ? 'pink' : 'teal'}`}><Icon size={20} /></span><div><ProgressBar label={component.label} value={component.score == null ? 0 : Number(component.score)} detail={component.score == null ? 'N/A · no evidence' : `${Number(component.score).toFixed(1)} / 100 · ${component.effectiveWeight}% weight`} /></div></div>;
}
export function PerformanceChart({ report, error }) {
  const data = (report?.components || []).map(c => ({ name: ({ classes: 'Classes', papers: 'Papers', completion: 'Evaluation', results: 'Results', responsiveness: 'Discussions' })[c.key] || c.label, label: c.label, score: c.score == null ? null : Number(c.score) })).filter(c => c.score != null);
  return <Card title="The shape of your month" eyebrow="Recorded activity · current month" className="va-performance-chart">
    {!data.length ? <EmptyState icon={BarChart3} title={error ? 'Performance report unavailable' : 'No scored activity yet'} description="Your chart appears when the monthly report has recorded evidence." /> : <><div className="va-performance-chart__canvas" role="img" aria-label={`Category scores out of 100: ${data.map(c => `${c.label}: ${c.score}`).join(', ')}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#efe8da" strokeDasharray="3 5" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#526f6d', fontSize: 11 }} interval={0} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#526f6d', fontSize: 11 }} /><Tooltip cursor={{ fill: '#ddf1ef', fillOpacity: .35 }} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} formatter={value => [`${value} / 100`, 'Score']} contentStyle={{ border: '1px solid #efe8da', borderRadius: 12 }} /><Bar dataKey="score" radius={[7, 7, 0, 0]} maxBarSize={44} isAnimationActive={false}>{data.map((c, index) => <Cell key={c.label} fill={['#0f6f6a', '#d4b15f', '#c42a63'][index % 3]} />)}</Bar></BarChart></ResponsiveContainer></div><p className="va-secondary va-small">Available category scores, not a time trend. Categories without evidence are excluded.</p></>}
  </Card>;
}
export function GrowthCard({ report, error }) {
  return <Card title="A rhythm for growth" eyebrow="Your monthly performance" className="va-growth-card">{report ? <><PerformanceOverview report={report} /><Badge tone="gold">Current month · provisional</Badge><p className="va-secondary">Your score reflects recorded teaching activity. Keep evidence coverage in view alongside the score.</p></> : <EmptyState icon={Award} title={error ? 'Could not load your report' : 'Your report is being prepared'} description="Open My Performance to review or refresh your monthly evidence." />}</Card>;
}
