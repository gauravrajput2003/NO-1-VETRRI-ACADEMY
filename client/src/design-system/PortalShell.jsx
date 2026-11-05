import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Award, BarChart3, Bell, BookOpen, CalendarDays, Clock3, FileText, Home, Library, LifeBuoy, MessageCircle, Play, Settings2, ShieldCheck, UserRound, Users, Video, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import VettriAIButton from '../components/VettriAIButton';
import { AppShell, Sidebar, Topbar } from './components';
import './portal.css';

const iconFor = (href) => {
  const key = href.split('/').pop();
  return ({ dashboard: Home, 'live-class': Video, 'live-monitor': Video, classes: CalendarDays, schedule: Clock3, training: Play,
    students: Users, teachers: Users, materials: BookOpen, library: Library, downloads: BookOpen, 'pdf-analytics': BarChart3,
    exams: FileText, scores: BarChart3, progress: BarChart3, attendance: CalendarDays, chat: MessageCircle, messages: MessageCircle,
    support: LifeBuoy, doubts: MessageCircle, salary: Wallet, salaries: Wallet, fees: Wallet, grading: Award, 'teacher-performance': Award,
    profile: UserRound, permissions: Settings2, 'password-requests': ShieldCheck, notifications: Bell, announcements: Bell,
  })[key] || FileText;
};
const order = ['Overview', 'Students', 'Resources', 'Community', 'Finance', 'Management', 'Account'];
const groupFor = (href) => {
  const key = href.split('/').pop();
  if (['dashboard', 'live-class', 'live-monitor', 'classes', 'schedule', 'training'].includes(key)) return 'Overview';
  if (['students', 'exams', 'scores', 'attendance', 'chat', 'progress', 'class-marks'].includes(key)) return 'Students';
  if (['materials', 'downloads', 'pdf-analytics', 'bookmarks', 'notes', 'library', 'material-review'].includes(key)) return 'Resources';
  if (['salary', 'salaries', 'fees'].includes(key)) return 'Finance';
  if (['support', 'doubts', 'notifications', 'announcements', 'messages'].includes(key)) return 'Community';
  if (['profile', 'settings', 'permissions', 'password-requests', 'login-logs'].includes(key)) return 'Account';
  return 'Management';
};

export default function PortalShell({ role, links, children, mobileNav }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const title = { teacher: 'Teacher Portal', student: 'Student Portal', admin: 'Admin Panel' }[role];
  const groups = order.map((label) => ({ label, items: links.filter((item) => groupFor(item.href) === label).map((item) => ({ ...item, icon: iconFor(item.href) })) })).filter((group) => group.items.length);
  const studentGroup = groups.find((group) => group.label === 'Students');
  if (studentGroup) studentGroup.items.sort((first, second) => Number(second.href.endsWith('/students')) - Number(first.href.endsWith('/students')));
  const active = links.find((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`));
  const handleLogout = async () => { await logout(); navigate(`/login/${role}`); };
  const sidebar = <Sidebar role={role} user={user} groups={groups} activeHref={active?.href} collapsed={collapsed && !mobileOpen} linkComponent={Link} onCollapse={() => setCollapsed(!collapsed)} onNavigate={() => setMobileOpen(false)} onLogout={handleLogout} />;
  const matches = search.trim() ? links.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())) : [];
  return <div className={`va-portal va-portal--${role}`}><AppShell collapsed={collapsed} mobileOpen={mobileOpen} onCloseMenu={() => setMobileOpen(false)} wide={role === 'admin'} sidebar={sidebar} topbar={<Topbar title={title} subtitle={(user?.displayName || user?.name || '').replace(/\s*\(([^)]+)\)/g, ' · $1')} user={user} role={role} onMenu={() => setMobileOpen(true)} search={search} onSearchChange={(event) => setSearch(event.target.value)} actions={<>{role !== 'admin' && <VettriAIButton />}<NotificationBell variant="academy" /></>} />}>{search.trim() && <nav className="va-global-search-results" aria-label="Academy page search">{matches.length ? matches.map((item) => <Link key={item.href} to={item.href} onClick={() => setSearch('')}>{item.label}</Link>) : <p>No matching pages.</p>}</nav>}{children}</AppShell>{mobileNav}</div>;
}
