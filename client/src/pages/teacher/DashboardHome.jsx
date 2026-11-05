import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getTeacherDashboard, getUpcomingClasses, getMyStudents, getIncompleteMandatoryCount, getMonthlyGrading, getRecentTeacherScores } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TeacherDashboardContent from './TeacherDashboardContent';
import api from '../../services/api';

export default function TeacherDashboardHome() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [students, setStudents] = useState([]);
  const [recentScores, setRecentScores] = useState([]);
  const [grading, setGrading] = useState(null);
  const [mandatoryPending, setMandatoryPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);
  const [performanceError, setPerformanceError] = useState(false);

  useEffect(() => {
    let active = true;
    const now = new Date();
    api.get('/academic-reports/teacher-performance', { params: { month: now.getMonth() + 1, year: now.getFullYear() }, timeout: 120000 })
      .then(({ data }) => { if (active) setPerformance(data.reports?.find((report) => String(report.teacher?._id) === String(user?._id)) || null); })
      .catch(() => { if (active) setPerformanceError(true); });
    return () => { active = false; };
  }, [user?._id]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dashRes, upcomingRes, studentsRes, pendingRes] = await Promise.all([
        getTeacherDashboard(),
        getUpcomingClasses(),
        getMyStudents(),
        getIncompleteMandatoryCount(),
      ]);
      if (dashRes.data.success) setDash(dashRes.data.dashboard);
      if (upcomingRes.data.success) setUpcoming(upcomingRes.data.classes?.slice(0, 5) || []);
      if (studentsRes.data.success) setStudents(studentsRes.data.students?.slice(0, 6) || []);
      if (pendingRes.data.success) setMandatoryPending(pendingRes.data.count || 0);
    } catch { toast.error('Failed to load dashboard'); }

    // Recent scores
    try {
      const scoresRes = await getRecentTeacherScores({ limit: 5 });
      if (scoresRes.data.success) setRecentScores(scoresRes.data.scores || []);
    } catch {}

    // Current month grading
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const gradingRes = await getMonthlyGrading(month, year);
      if (gradingRes.data.success) setGrading(gradingRes.data.grading);
    } catch {}

    setLoading(false);
  };

  return <TeacherDashboardContent {...{ user, dash, upcoming, students, recentScores, grading, mandatoryPending, loading, performance, performanceError }} />;
}
