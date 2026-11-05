import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CalendarDays, PencilLine, TriangleAlert, Users, Video } from 'lucide-react';
import { AlertBanner, Avatar, Badge, Button, Card, DataTable, EmptyState, HeroCard, ProgressBar, ProgressRing, Skeleton, StatCard } from '../../design-system/components';
import NotificationBell from '../../components/NotificationBell';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import LiveClass from './LiveClass';
import { GrowthCard, PerformanceChart } from '../../design-system/PerformanceVisuals';
import DashboardMotion from '../../design-system/DashboardMotion';

const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'NA';
const formatTime = (value) => {
  if (!value) return 'NA';
  if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date(); date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// Presentation only. Dashboard fetching/state remains in DashboardHome; class
// mutations remain in the existing LiveClass component.
export default function TeacherDashboardContent({ user, dash, upcoming, students, recentScores, grading, mandatoryPending, loading, performance, performanceError }) {
  const name = (user?.displayName || user?.name || 'Teacher').split(/[\s(]/)[0];
  const count = dash?.todayClasses?.length ?? 0;
  const firstSubject = dash?.todayClasses?.[0]?.subject;
  const stats = [
    { label: 'My Students', value: dash?.totalStudents ?? 0, icon: Users, tone: 'teal', href: '/teacher/students' },
    { label: "Today's Classes", value: count, icon: Video, tone: 'pink', href: '/teacher/live-class' },
    { label: 'Pending Corrections', value: dash?.pendingCorrections ?? 0, icon: PencilLine, tone: 'gold', href: '/teacher/exams' },
    { label: 'Monthly Score', value: performance?.totalScore != null ? `${Number(performance.totalScore).toFixed(1)}/100` : '—', detail: performance ? `${performance.coverage}% evidence coverage` : performanceError ? 'Report unavailable' : 'Awaiting monthly report', icon: Award, tone: 'teal', href: '/teacher/teacher-performance' },
  ];
  const scoreColumns = [
    { key: 'student', label: 'Student', render: (score) => score.student?.displayName || score.student?.name || 'NA' },
    { key: 'subject', label: 'Subject' },
    { key: 'score', label: 'Score', render: (score) => <Badge tone="gold">{score.marksObtained}/{score.maxMarks ?? score.totalMarks ?? 'NA'}</Badge> },
    { key: 'date', label: 'Date', render: (score) => formatDate(score.examDate || score.createdAt) },
  ];
  return <DashboardMotion>
    <HeroCard headingLevel={1} actionsAside className="va-dashboard-hero" eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} title={`Welcome back, ${name}`} description={loading ? 'Your classes, your students, and your day at a glance.' : `You have ${count}${firstSubject ? ` ${firstSubject}` : ''} session${count === 1 ? '' : 's'} today and ${dash?.totalStudents ?? 0} students counting on you. Here is your day at a glance.`} actions={<><Button variant="gold" href="/teacher/live-class" linkComponent={Link}>View today’s class</Button><Button variant="inverse" href="/teacher/schedule" linkComponent={Link}>Class scheduler</Button></>} />
    {mandatoryPending > 0 && <AlertBanner icon={TriangleAlert} title={`You have ${mandatoryPending} mandatory training video${mandatoryPending === 1 ? '' : 's'} pending.`} action={<Button variant="danger" href="/teacher/training" linkComponent={Link}>Watch now</Button>} />}
    <div className="va-dashboard-stats">{stats.map((stat) => <StatCard key={stat.label} {...stat} loading={loading} linkComponent={Link} />)}</div>
    <AnnouncementBanner />
    <div className="va-dashboard-insights"><PerformanceChart report={performance} error={performanceError} /><GrowthCard report={performance} error={performanceError} /></div>
    <div className="va-dashboard-primary-grid">
      <Card title="Today's live class" action={<Button variant="ghost" href="/teacher/live-class" linkComponent={Link} trailingIcon={ArrowRight}>Manage</Button>}><LiveClass embedded /></Card>
      <Card className="va-dashboard-notifications"><NotificationBell variant="panel" /></Card>
    </div>
    <div className="va-dashboard-secondary-grid">
      <Card title="Upcoming Classes" action={<Button variant="ghost" href="/teacher/live-class" linkComponent={Link} trailingIcon={ArrowRight}>View All</Button>}>
        {loading ? <Skeleton /> : !upcoming.length ? <EmptyState icon={CalendarDays} title="No upcoming classes" description="No upcoming classes in the next 7 days." /> : <div className="va-upcoming-list">{upcoming.map((item) => <div key={item._id} className="va-upcoming-item"><div><strong>{item.subject}</strong><p>{item.grade} · {formatDate(item.scheduledDate)}</p></div><div><strong>{formatTime(item.scheduledTime)}</strong><p>{(item.studentIds || item.enrolledStudents || []).length} students</p></div></div>)}</div>}
      </Card>
      <Card title="My Students" action={<Button variant="ghost" href="/teacher/students" linkComponent={Link} trailingIcon={ArrowRight}>View All</Button>}>
        {loading ? <Skeleton /> : !students.length ? <EmptyState icon={Users} title="No students assigned yet" /> : <div className="va-dashboard-students">{students.map((student, index) => <div className="va-person-cell" key={student._id}><Avatar name={student.displayName || student.name} src={student.profilePic} tone={index % 2 ? 'pink' : 'teal'} /><div><strong>{student.displayName || student.name}</strong><span className="va-secondary va-small">{student.grade || 'NA'}</span></div></div>)}</div>}
      </Card>
    </div>
    <div className="va-dashboard-secondary-grid">
      <div className="va-dashboard-score-panel"><div className="va-dashboard-panel-actions"><Button variant="ghost" href="/teacher/scores" linkComponent={Link} icon={PencilLine}>Enter New Score</Button></div><DataTable title="Recent Exam Scores" columns={scoreColumns} rows={recentScores} getRowKey={(score) => score._id} pageSize={5} searchKeys={['subject', 'examTitle']} loading={loading} searchPlaceholder="Search scores…" emptyTitle="No scores entered yet" /></div>
      <Card title="Monthly Grading">{!grading ? <EmptyState icon={Award} title="No grading data this month" /> : <div className="va-grading-summary"><ProgressRing value={grading.total || 0} label="Total score" /><div className="va-grading-bars">{(grading.parameters || []).slice(0, 5).map((parameter) => <ProgressBar key={parameter.name} label={parameter.name} value={parameter.maxScore ? parameter.score / parameter.maxScore * 100 : 0} detail={`${parameter.score}/${parameter.maxScore}`} />)}</div></div>}</Card>
    </div>
  </DashboardMotion>;
}
