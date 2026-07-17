import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  FiBook, FiUsers, FiAward, FiVideo, FiMessageCircle, FiCheckCircle,
  FiStar, FiPhone, FiMail, FiMapPin, FiArrowRight, FiMenu, FiX,
  FiMonitor, FiFileText, FiTrendingUp, FiZap, FiShield, FiPlay,
  FiChevronDown, FiClock, FiGlobe, FiTarget,
} from 'react-icons/fi';

// ─── Data ────────────────────────────────────────────────────────────────────
const COURSES = [
  {
    id: 1, icon: '📘', title: 'CBSE Tuition', grade: '6th – 12th', category: 'School',
    subjects: ['Mathematics', 'Science', 'English', 'Social Science'],
    accentColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)',
    iconBg: 'linear-gradient(135deg,rgba(59,130,246,0.3),rgba(37,99,235,0.15))',
    tag: 'Most Popular',
  },
  {
    id: 2, icon: '📗', title: 'State Board', grade: '6th – 12th', category: 'School',
    subjects: ['Mathematics', 'Science', 'Tamil', 'English', 'Social Science'],
    accentColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.4)',
    iconBg: 'linear-gradient(135deg,rgba(34,197,94,0.3),rgba(22,163,74,0.15))',
    tag: 'Tamil Nadu',
  },
  {
    id: 3, icon: '⚙️', title: 'Engineering', grade: 'B.E / B.Tech', category: 'College',
    subjects: ['Engineering Maths', 'Physics', 'Chemistry', 'Coding'],
    accentColor: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.4)',
    iconBg: 'linear-gradient(135deg,rgba(168,85,247,0.3),rgba(147,51,234,0.15))',
    tag: 'High Demand',
  },
  {
    id: 4, icon: '🎨', title: 'Arts & Science', grade: 'UG / PG', category: 'College',
    subjects: ['B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'B.A', 'M.A'],
    accentColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.4)',
    iconBg: 'linear-gradient(135deg,rgba(236,72,153,0.3),rgba(219,39,119,0.15))',
    tag: 'UG / PG',
  },
  {
    id: 5, icon: '🗣️', title: 'Language Courses', grade: 'All Ages', category: 'Language',
    subjects: ['Tamil (Beginners–Advanced)', 'English Communication', 'Spoken English'],
    accentColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.4)',
    iconBg: 'linear-gradient(135deg,rgba(249,115,22,0.3),rgba(234,88,12,0.15))',
    tag: 'All Ages',
  },
  {
    id: 6, icon: '🏆', title: 'Competitive Exams', grade: 'All Levels', category: 'Competitive',
    subjects: ['TNPSC Group 1–4', 'TRB Exam Prep', 'TET Primary & Upper'],
    accentColor: 'rgba(245,166,35,0.15)', borderColor: 'rgba(245,166,35,0.5)',
    iconBg: 'linear-gradient(135deg,rgba(245,166,35,0.35),rgba(202,138,4,0.15))',
    tag: '🔥 Trending',
  },
];

const COURSE_TABS = ['All', 'School', 'College', 'Language', 'Competitive'];

const TEACHERS = [
  { id: 1, name: 'B. Preetha', qual: 'B.E Computer Science', subjects: 'English, Maths, Computer', exp: '3+ yrs', img: 'https://i.pravatar.cc/300?img=1', rating: 4.9 },
  { id: 2, name: 'Farhana B A', qual: 'M.Sc, B.Ed Mathematics', subjects: 'Mathematics (Till 10th)', exp: '5 yrs', img: 'https://i.pravatar.cc/300?img=2', rating: 5.0 },
  { id: 3, name: 'Venkatalakshmi K', qual: 'M.Sc Mathematics', subjects: 'Maths CBSE Curriculum', exp: '7 yrs', img: 'https://i.pravatar.cc/300?img=3', rating: 4.8 },
  { id: 4, name: 'S. Srividhya', qual: 'M.Sc, B.Ed', subjects: 'Tamil, English, Science, Social', exp: '4 yrs', img: 'https://i.pravatar.cc/300?img=4', rating: 4.9 },
  { id: 5, name: 'M. Uthrakalyani', qual: 'M.Sc, B.Ed Chemistry', subjects: 'Chemistry (10th–12th)', exp: '6 yrs', img: 'https://i.pravatar.cc/300?img=5', rating: 5.0 },
  { id: 6, name: 'P. Manisha', qual: 'M.Sc', subjects: 'Tamil, English, Maths, Science', exp: '3 yrs', img: 'https://i.pravatar.cc/300?img=6', rating: 4.7 },
  { id: 7, name: 'Ranjitha Devi', qual: 'M.Sc, B.Ed Physics', subjects: 'Physics', exp: '4 yrs', img: 'https://i.pravatar.cc/300?img=7', rating: 4.8 },
  { id: 8, name: 'Swathi', qual: 'M.Sc, M.Ed, M.Phil', subjects: 'Mathematics', exp: '5 yrs', img: 'https://i.pravatar.cc/300?img=8', rating: 4.9 },
];

const STATS = [
  { value: 500, suffix: '+', label: 'Happy Students', icon: FiUsers, color: '#F5A623' },
  { value: 12, suffix: '+', label: 'Expert Teachers', icon: FiAward, color: '#22c55e' },
  { value: 20, suffix: '+', label: 'Years of Excellence', icon: FiTrendingUp, color: '#a855f7' },
  { value: 98, suffix: '%', label: 'Success Rate', icon: FiTarget, color: '#3b82f6' },
];

const WHY_CHOOSE = [
  { icon: FiVideo, title: 'Daily Live Classes', desc: 'Interactive 1-hour live sessions every day with real-time Q&A', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { icon: FiFileText, title: 'Free Study Materials', desc: 'Comprehensive PDFs, PPTs and video lessons at no extra cost', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { icon: FiMessageCircle, title: 'WhatsApp Doubt Clearing', desc: 'Instant doubt resolution via WhatsApp — any time, any question', color: '#25d366', bg: 'rgba(37,211,102,0.1)' },
  { icon: FiCheckCircle, title: 'Weekly Tests', desc: 'Regular assessments to track progress and identify weak areas', color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
  { icon: FiMonitor, title: 'Virtual Science Lab', desc: 'Advanced virtual lab simulations for practical science experiments', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  { icon: FiShield, title: 'Certified Teachers', desc: 'All teachers hold M.Sc/B.Ed with 2–10+ years of experience', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
];

const TESTIMONIALS = [
  { id: 1, name: 'Arun Kumar', grade: '12th CBSE', text: 'Scored 95% in Maths! The daily live classes and weekly tests made all the difference. Best coaching in Tamil Nadu!', rating: 5, avatar: 'AK', color: '#3b82f6' },
  { id: 2, name: 'Priya Devi', grade: '10th State Board', text: 'WhatsApp doubt clearing is amazing. Got answers at midnight before my exam. Thank you Vettri Academy!', rating: 5, avatar: 'PD', color: '#22c55e' },
  { id: 3, name: 'Mohammed Rizwan', grade: 'Engineering', text: 'Best online tuition for Engineering Maths. Very experienced teachers who explain concepts clearly.', rating: 5, avatar: 'MR', color: '#a855f7' },
];

const enquirySchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  grade: z.string().optional(),
  course: z.string().optional(),
  message: z.string().optional(),
});

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.color = Math.random() > 0.5 ? '#F5A623' : '#ffffff';
      }
      update() {
        this.x += this.speedX; this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        ctx.save(); ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color; ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    for (let i = 0; i < 100; i++) particles.push(new Particle());
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ loggedIn }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(245,166,35,0.2)' : 'none',
        transition: 'all 0.4s ease',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Vettri Academy" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(245,166,35,0.6))' }} />
          <div>
            <p style={{ color: '#251b4f', fontWeight: 800, fontSize: 15, margin: 0, lineHeight: 1.2, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>No.1 Vettri Academy</p>
            <p style={{ color: '#F5A623', fontSize: 11, margin: 0 }}>Since 2003 · Tamil Nadu</p>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="nav-desktop">
          {[['Courses', '#courses'], ['Teachers', '#teachers'], ['Why Us', '#why-us'], ['Contact', '#contact']].map(([l, h]) => (
            <a key={h} href={h} style={{ color: 'rgba(39,29,78,0.74)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              onMouseEnter={e => e.target.style.color = '#F5A623'}
              onMouseLeave={e => e.target.style.color = 'rgba(39,29,78,0.74)'}
            >{l}</a>
          ))}
          <a href="#enquiry" style={{ background: 'linear-gradient(135deg,#d4881a,#F5A623)', color: '#2d2457', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            📅 Free Demo
          </a>
          <Link to="/login/student" style={{ border: '1.5px solid rgba(245,166,35,0.6)', color: '#F5A623', fontWeight: 600, fontSize: 13, padding: '9px 18px', borderRadius: 10, textDecoration: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Login
          </Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: '#251b4f', cursor: 'pointer' }} className="nav-mobile-btn">
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ background: 'rgba(255,255,255,0.96)', borderTop: '1px solid rgba(245,166,35,0.2)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {[['Courses', '#courses'], ['Teachers', '#teachers'], ['Why Us', '#why-us'], ['Contact', '#contact']].map(([l, h]) => (
              <a key={h} href={h} onClick={() => setMenuOpen(false)} style={{ color: 'rgba(39,29,78,0.82)', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid rgba(120,98,190,0.18)' }}>{l}</a>
            ))}
            <a href="#enquiry" onClick={() => setMenuOpen(false)} style={{ background: 'linear-gradient(135deg,#d4881a,#F5A623)', color: '#2d2457', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, textDecoration: 'none', textAlign: 'center' }}>📅 Book Free Demo</a>
            {loggedIn ? (
              <Link to="/student/dashboard" onClick={() => setMenuOpen(false)} style={{ border: '1.5px solid rgba(245,166,35,0.6)', color: '#F5A623', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, textDecoration: 'none', textAlign: 'center' }}>
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/login/student" onClick={() => setMenuOpen(false)} style={{ border: '1.5px solid rgba(245,166,35,0.6)', color: '#F5A623', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 10, textDecoration: 'none', textAlign: 'center' }}>
                Login
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@media(max-width:768px){.nav-desktop{display:none!important}.nav-mobile-btn{display:flex!important}}`}</style>
    </motion.nav>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ children, id, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} id={id} initial={{ opacity: 0, y: 50 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease: 'easeOut' }} style={style}>
      {children}
    </motion.section>
  );
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export default function Landing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [teacherIdx, setTeacherIdx] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const filteredCourses = activeTab === 'All' ? COURSES : COURSES.filter(c => c.category === activeTab);

  // Auto-rotate teachers
  useEffect(() => {
    const t = setInterval(() => setTeacherIdx(i => (i + 1) % TEACHERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(enquirySchema) });

  const onSubmitEnquiry = async (data) => {
    try {
      const res = await api.post('/enquiries', data);
      if (res.data.success) { toast.success("Thank you! We'll contact you shortly 🎓"); reset(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#eef8f3 0%, #f2f8ff 45%, #f5efff 100%)', color: '#251b4f', overflowX: 'hidden', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      <Navbar loggedIn={!!user} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* BG layers */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(245,166,35,0.12) 0%,transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 50%,rgba(168,85,247,0.08) 0%,transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 80%,rgba(59,130,246,0.06) 0%,transparent 50%)' }} />
        <ParticleCanvas />

        {/* Decorative orbs */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 5, repeat: Infinity }}
          style={{ position: 'absolute', top: '15%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,166,35,0.15),transparent)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 7, repeat: Infinity, delay: 2 }}
          style={{ position: 'absolute', bottom: '20%', left: '5%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.12),transparent)', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity, position: 'relative', zIndex: 10, width: '100%', maxWidth: 1280, margin: '0 auto', padding: '100px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}
          className="hero-grid">

          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 50, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#F5A623', fontSize: 13, fontWeight: 600 }}>🏆 Tamil Nadu's #1 Online Coaching</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1 }}>
              <span style={{ display: 'block', color: '#251b4f' }}>Transform Your</span>
              <span style={{ display: 'block', background: 'linear-gradient(135deg,#F5A623,#fbbf24,#d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Future With</span>
              <span style={{ display: 'block', color: '#251b4f' }}>Expert Coaching</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              style={{ color: 'rgba(39,29,78,0.66)', fontSize: 17, lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>
              Daily live classes · Free study materials · WhatsApp doubt clearing ·
              Weekly tests — all under one roof since <strong style={{ color: '#F5A623' }}>2003</strong>.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
              <a href="#enquiry" style={{ background: 'linear-gradient(135deg,#c97a10,#F5A623)', color: '#2d2457', fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 30px rgba(245,166,35,0.4)' }}>
                📅 Book Free Demo <FiArrowRight />
              </a>
              <a href="#courses" style={{ background: 'transparent', color: '#F5A623', fontWeight: 600, fontSize: 15, padding: '13px 28px', borderRadius: 12, textDecoration: 'none', border: '1.5px solid rgba(245,166,35,0.5)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                🎓 Our Courses
              </a>
            </motion.div>

            {/* Mini stats row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[['500+', 'Students'], ['50+', 'Teachers'], ['20+', 'Years'], ['98%', 'Success']].map(([v, l]) => (
                <div key={l}>
                  <p style={{ color: '#F5A623', fontWeight: 800, fontSize: 22, margin: 0 }}>{v}</p>
                  <p style={{ color: 'rgba(39,29,78,0.48)', fontSize: 12, margin: 0 }}>{l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — floating card stack */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
            style={{ position: 'relative', height: 520 }} className="hero-right">

            {/* Main image */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(245,166,35,0.2)' }}>
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=700&auto=format&fit=crop&q=80"
                alt="Students" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => e.target.src = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=700'} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(55,34,104,0.1) 0%,rgba(55,34,104,0.48) 100%)' }} />
            </div>

            <motion.div animate={{ y: [-6, 6, -6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: 24, left: 24, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⭐</span>
              <div>
                <p style={{ color: '#251b4f', fontWeight: 700, fontSize: 13, margin: 0 }}>Top Rated Academy</p>
                <p style={{ color: '#F5A623', fontSize: 11, margin: 0 }}>4.9 / 5.0 Rating</p>
              </div>
            </motion.div>

            {/* Live class badge */}
            <motion.div animate={{ y: [6, -6, 6] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{ position: 'absolute', bottom: 32, right: 24, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e', animation: 'pulse 2s infinite' }} />
              <div>
                <p style={{ color: '#251b4f', fontWeight: 700, fontSize: 13, margin: 0 }}>🎥 Live Now</p>
                <p style={{ color: '#22c55e', fontSize: 11, margin: 0 }}>Daily Sessions Active</p>
              </div>
            </motion.div>

            {/* Students online */}
            <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              style={{ position: 'absolute', bottom: 32, left: 24, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 16, padding: '12px 16px' }}>
              <p style={{ color: '#251b4f', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>👨‍🎓 Students Online</p>
              <div style={{ display: 'flex', gap: -4 }}>
                {[1,2,3,4,5].map(i => (
                  <img key={i} src={`https://i.pravatar.cc/32?img=${i + 10}`} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #f4edff', marginLeft: i === 1 ? 0 : -8 }} />
                ))}
                <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600, marginLeft: 8, alignSelf: 'center' }}>+120 today</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(39,29,78,0.32)', fontSize: 12 }}>Scroll to explore</span>
          <FiChevronDown style={{ color: '#F5A623', opacity: 0.7 }} size={22} />
        </motion.div>
      </section>

      {/* ── STATS RIBBON ──────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(90deg,rgba(245,166,35,0.08),rgba(245,166,35,0.04),rgba(245,166,35,0.08))', borderTop: '1px solid rgba(245,166,35,0.2)', borderBottom: '1px solid rgba(245,166,35,0.2)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }} className="stats-grid">
          {STATS.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              style={{ textAlign: 'center', padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(120,98,190,0.18)' }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: `${stat.color}18`, border: `1px solid ${stat.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <stat.icon style={{ color: stat.color }} size={22} />
              </div>
              <p style={{ fontSize: 32, fontWeight: 900, color: stat.color, margin: '0 0 4px' }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </p>
              <p style={{ color: 'rgba(39,29,78,0.56)', fontSize: 13, margin: 0 }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ANNOUNCEMENT STRIP ────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(90deg,#c97a10,#F5A623,#d97706)', padding: '14px 24px', overflow: 'hidden' }}>
        <motion.div animate={{ x: [0, -1000] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 80, whiteSpace: 'nowrap', color: '#2d2457', fontWeight: 700, fontSize: 14 }}>
          {[...Array(4)].map((_, i) => (
            <span key={i} style={{ display: 'flex', gap: 80 }}>
              <span>🚀 Rapid Revision — 10th &amp; 12th Batch Starting Soon!</span>
              <span>🎓 TNPSC Group 4 New Batch Open — Limited Seats!</span>
              <span>📞 Call Now: 90477 58389 for Free Demo Class!</span>
              <span>🏆 98% Pass Rate in 2024 Board Exams!</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── COURSES ───────────────────────────────────────────────────────── */}
      <Section id="courses" style={{ padding: '100px 24px', background: '#f4edff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ color: '#F5A623', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>
              Our Programmes
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, marginBottom: 16, letterSpacing: -0.5 }}>
              Courses We <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Offer</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} style={{ color: 'rgba(39,29,78,0.56)', fontSize: 16, maxWidth: 500, margin: '0 auto 36px' }}>
              Comprehensive tuition across all levels and boards, taught by qualified experts.
            </motion.p>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {COURSE_TABS.map(tab => (
                <motion.button key={tab} onClick={() => setActiveTab(tab)} whileTap={{ scale: 0.95 }}
                  style={{ padding: '8px 20px', borderRadius: 50, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.2s',
                    background: activeTab === tab ? 'linear-gradient(135deg,#c97a10,#F5A623)' : 'rgba(255,255,255,0.72)',
                    color: activeTab === tab ? '#2d2457' : 'rgba(39,29,78,0.66)',
                    border: activeTab === tab ? 'none' : '1px solid rgba(120,98,190,0.25)',
                  }}>
                  {tab}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24 }}>
            <AnimatePresence mode="popLayout">
              {filteredCourses.map((course, i) => (
                <motion.div key={course.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, delay: i * 0.06 }}
                  whileHover={{ y: -8, boxShadow: `0 20px 60px ${course.accentColor}` }}
                  style={{ background: `linear-gradient(135deg,rgba(255,255,255,0.95),${course.accentColor})`, border: `1px solid ${course.borderColor}`, borderRadius: 20, padding: 28, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>

                  {/* Glare */}
                  <div style={{ position: 'absolute', top: -60, right: -60, width: 150, height: 150, borderRadius: '50%', background: course.accentColor, filter: 'blur(40px)', pointerEvents: 'none' }} />

                  {/* Tag */}
                  {course.tag && (
                    <span style={{ position: 'absolute', top: 16, right: 16, background: course.borderColor, color: '#251b4f', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 50, letterSpacing: 0.5 }}>
                      {course.tag}
                    </span>
                  )}

                  <div style={{ width: 56, height: 56, borderRadius: 16, background: course.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 18 }}>
                    {course.icon}
                  </div>
                  <h3 style={{ color: '#251b4f', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{course.title}</h3>
                  <p style={{ color: '#F5A623', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{course.grade}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {course.subjects.map(s => (
                      <li key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(39,29,78,0.66)', fontSize: 13 }}>
                        <FiCheckCircle style={{ color: '#F5A623', flexShrink: 0 }} size={13} />{s}
                      </li>
                    ))}
                  </ul>
                  <a href="#enquiry" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F5A623', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                    Enroll Now <FiArrowRight size={14} />
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </Section>

      {/* ── TEACHERS ──────────────────────────────────────────────────────── */}
      <Section id="teachers" style={{ padding: '100px 24px', background: 'linear-gradient(180deg,rgba(245,166,35,0.03) 0%,transparent 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: '#F5A623', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Our Faculty</p>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, marginBottom: 16 }}>
              Meet Our <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Expert Teachers</span>
            </h2>
            <p style={{ color: 'rgba(39,29,78,0.56)', fontSize: 16 }}>Qualified, passionate educators dedicated to your success.</p>
          </div>

          {/* Featured teacher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', marginBottom: 52 }} className="teacher-featured">
            <AnimatePresence mode="wait">
              <motion.div key={teacherIdx} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.4 }}
                style={{ background: 'linear-gradient(135deg,rgba(245,166,35,0.08),rgba(245,166,35,0.02))', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 24, padding: 36, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <img src={TEACHERS[teacherIdx].img} alt={TEACHERS[teacherIdx].name} style={{ width: 90, height: 90, borderRadius: '50%', border: '3px solid rgba(245,166,35,0.5)', flexShrink: 0 }}
                  onError={e => e.target.src = `https://ui-avatars.com/api/?name=${TEACHERS[teacherIdx].name}&background=F5A623&color=0A1628&size=90`} />
                <div>
                  <h3 style={{ color: '#251b4f', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{TEACHERS[teacherIdx].name}</h3>
                  <p style={{ color: '#F5A623', fontSize: 13, marginBottom: 8 }}>{TEACHERS[teacherIdx].qual}</p>
                  <p style={{ color: 'rgba(39,29,78,0.66)', fontSize: 14, marginBottom: 16 }}>{TEACHERS[teacherIdx].subjects}</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 8, color: '#F5A623', fontSize: 12, fontWeight: 600, padding: '4px 12px' }}>⏱ {TEACHERS[teacherIdx].exp} exp</span>
                    <span style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', fontSize: 12, fontWeight: 600, padding: '4px 12px' }}>⭐ {TEACHERS[teacherIdx].rating}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots selector */}
            <div>
              <p style={{ color: 'rgba(39,29,78,0.42)', fontSize: 13, marginBottom: 20 }}>Click to meet our teachers</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {TEACHERS.map((t, i) => (
                  <button key={t.id} onClick={() => setTeacherIdx(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: teacherIdx === i ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.82)', border: `1px solid ${teacherIdx === i ? 'rgba(245,166,35,0.5)' : 'rgba(120,98,190,0.2)'}`, borderRadius: 14, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}>
                    <img src={t.img} alt={t.name} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
                      onError={e => e.target.src = `https://ui-avatars.com/api/?name=${t.name}&background=F5A623&color=0A1628&size=36`} />
                    <div>
                      <p style={{ color: teacherIdx === i ? '#F5A623' : '#fff', fontSize: 12, fontWeight: 600, margin: 0 }}>{t.name}</p>
                      <p style={{ color: 'rgba(39,29,78,0.42)', fontSize: 11, margin: 0 }}>{t.exp} exp</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── WHY CHOOSE US ─────────────────────────────────────────────────── */}
      <Section id="why-us" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: '#F5A623', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Why Us</p>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, marginBottom: 16 }}>
              Why Choose <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vettri Academy?</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 24 }}>
            {WHY_CHOOSE.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, borderColor: `${item.color}60` }}
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(120,98,190,0.2)', borderRadius: 20, padding: 28, transition: 'all 0.3s', cursor: 'default' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: item.bg, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <item.icon style={{ color: item.color }} size={24} />
                </div>
                <h3 style={{ color: '#251b4f', fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{item.title}</h3>
                <p style={{ color: 'rgba(39,29,78,0.56)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <Section style={{ padding: '100px 24px', background: '#f4edff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <p style={{ color: '#F5A623', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Success Stories</p>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900 }}>
              What Our <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Students Say</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(120,98,190,0.2)', borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.04, lineHeight: 1 }}>"</div>
                <div style={{ display: 'flex', marginBottom: 16, gap: 3 }}>
                  {[...Array(t.rating)].map((_, j) => <FiStar key={j} style={{ color: '#F5A623', fill: '#F5A623' }} size={14} />)}
                </div>
                <p style={{ color: 'rgba(39,29,78,0.74)', fontSize: 15, lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${t.color}25`, border: `2px solid ${t.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color, fontWeight: 800, fontSize: 14 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p style={{ color: '#251b4f', fontWeight: 700, fontSize: 14, margin: 0 }}>{t.name}</p>
                    <p style={{ color: '#F5A623', fontSize: 12, margin: 0 }}>{t.grade}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg,rgba(245,166,35,0.12),rgba(245,166,35,0.05),rgba(168,85,247,0.06))', borderTop: '1px solid rgba(245,166,35,0.15)', borderBottom: '1px solid rgba(245,166,35,0.15)' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900, marginBottom: 16 }}>
            Start Your <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Learning Journey</span> Today
          </h2>
          <p style={{ color: 'rgba(39,29,78,0.62)', fontSize: 17, marginBottom: 36 }}>Join 500+ students who are already transforming their future with expert coaching.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#enquiry" style={{ background: 'linear-gradient(135deg,#c97a10,#F5A623)', color: '#2d2457', fontWeight: 800, fontSize: 16, padding: '16px 36px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 10px 40px rgba(245,166,35,0.4)' }}>
              📅 Book Free Demo Class
            </a>
            <a href="tel:9047758389" style={{ border: '1.5px solid rgba(245,166,35,0.5)', color: '#F5A623', fontWeight: 600, fontSize: 16, padding: '15px 32px', borderRadius: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiPhone size={18} /> Call Now
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── ENQUIRY FORM ──────────────────────────────────────────────────── */}
      <Section id="enquiry" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: '#F5A623', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 }}>Get Started</p>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, marginBottom: 12 }}>
              Book Your <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Free Demo</span>
            </h2>
            <p style={{ color: 'rgba(39,29,78,0.56)', fontSize: 15 }}>Fill the form and we'll contact you within 24 hours.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 24, padding: '40px 36px', boxShadow: '0 20px 80px rgba(0,0,0,0.4)' }}>
            <form onSubmit={handleSubmit(onSubmitEnquiry)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} id="enquiry-form">
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input {...register('name')} placeholder="Your name" style={inputStyle} id="enquiry-name" />
                {errors.name && <p style={errStyle}>{errors.name.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input {...register('phone')} placeholder="+91 98765 43210" type="tel" style={inputStyle} id="enquiry-phone" />
                {errors.phone && <p style={errStyle}>{errors.phone.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email (optional)</label>
                <input {...register('email')} placeholder="your@email.com" type="email" style={inputStyle} id="enquiry-email" />
              </div>
              <div>
                <label style={labelStyle}>Grade / Class</label>
                <select {...register('grade')} style={inputStyle} id="enquiry-grade">
                  <option value="">Select Grade</option>
                  {['4th','5th','6th','7th','8th','9th','10th','11th','12th','UG','PG'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Course Interested In</label>
                <select {...register('course')} style={inputStyle} id="enquiry-course">
                  <option value="">Select Course</option>
                  {COURSES.map(c => <option key={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Message (optional)</label>
                <textarea {...register('message')} rows={3} placeholder="Tell us your requirements, preferred timings, etc." style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <motion.button type="submit" disabled={isSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#c97a10,#F5A623)', color: '#2d2457', fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 12, padding: '16px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', boxShadow: '0 8px 30px rgba(245,166,35,0.4)' }}>
                  {isSubmitting ? '⏳ Sending...' : '🎓 Book Free Demo Class'}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </Section>

      {/* ── CONTACT ───────────────────────────────────────────────────────── */}
      <Section id="contact" style={{ padding: '80px 24px', background: 'rgba(245,166,35,0.02)', borderTop: '1px solid rgba(255,255,255,0.72)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }} className="contact-grid">
          <div>
            <h2 style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 900, marginBottom: 20 }}>
              Get In <span style={{ background: 'linear-gradient(135deg,#F5A623,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Touch</span>
            </h2>
            <p style={{ color: 'rgba(39,29,78,0.62)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
              Have questions? We're happy to help! Reach out and our team will get back to you.
            </p>
            {[
              { icon: FiPhone, label: 'Phone', val: '90477 58389', href: 'tel:9047758389', color: '#22c55e' },
              { icon: FiMail, label: 'Email', val: 'contactus@no1vettriacademy.com', href: 'mailto:contactus@no1vettriacademy.com', color: '#3b82f6' },
              { icon: FiMapPin, label: 'Location', val: 'Tamil Nadu, India', href: '#', color: '#F5A623' },
            ].map(c => (
              <a key={c.label} href={c.href} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, textDecoration: 'none' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <c.icon style={{ color: c.color }} size={20} />
                </div>
                <div>
                  <p style={{ color: 'rgba(39,29,78,0.42)', fontSize: 12, margin: '0 0 2px' }}>{c.label}</p>
                  <p style={{ color: '#251b4f', fontWeight: 600, fontSize: 15, margin: 0 }}>{c.val}</p>
                </div>
              </a>
            ))}
          </div>
          <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(120,98,190,0.2)', height: 360 }}>
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d253682.46824000927!2d79.9864087!3d11.9139819!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5361a498a4e97b%3A0x44b6e6f6f7f6f6f6!2sVellore%2C+Tamil+Nadu!5e0!3m2!1sen!2sin!4v1713300000000"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Location" />
          </div>
        </div>
      </Section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(120,98,190,0.22)', padding: '60px 24px 32px', background: '#f4edff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }} className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <img src="/logo.jpg" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(245,166,35,0.5))' }} />
                <div>
                  <p style={{ color: '#251b4f', fontWeight: 800, fontSize: 16, margin: 0 }}>No.1 Vettri Academy</p>
                  <p style={{ color: '#F5A623', fontSize: 12, margin: 0 }}>Since 2003 · Tamil Nadu</p>
                </div>
              </div>
              <p style={{ color: 'rgba(39,29,78,0.48)', fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>
                Bringing world-class education to your screen. Tamil Nadu's #1 online coaching institute for 20+ years.
              </p>
            </div>
            {[
              { title: 'Courses', links: ['CBSE Tuition', 'State Board', 'Engineering', 'Arts & Science', 'Language', 'Competitive'] },
              { title: 'Quick Links', links: ['About Us', 'Teachers', 'Why Us', 'Testimonials', 'Contact'] },
              { title: 'Connect', links: ['📞 90477 58389', '📧 Email Us', '📍 Tamil Nadu'] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ color: '#F5A623', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>{col.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(l => (
                    <li key={l}><a href="#" style={{ color: 'rgba(39,29,78,0.48)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = '#F5A623'} onMouseLeave={e => e.target.style.color = 'rgba(39,29,78,0.48)'}>{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(120,98,190,0.18)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: 'rgba(39,29,78,0.32)', fontSize: 13, margin: 0 }}>© 2024 No.1 Vettri Academy. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Login', 'Sign Up', 'Privacy'].map(l => (
                <Link key={l} to={l === 'Login' ? '/login/student' : l === 'Sign Up' ? '/signup' : '#'} style={{ color: 'rgba(39,29,78,0.32)', fontSize: 13, textDecoration: 'none' }}>{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {!user && (
        <a
          href="https://wa.me/919047758389?text=Hi%20Vettri%20Academy%2C%20I%20need%20course%20details"
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp Support"
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            zIndex: 1200,
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg,#20c75a,#25d366)',
            boxShadow: '0 12px 30px rgba(37,211,102,0.45)',
            border: '2px solid rgba(255,255,255,0.75)',
            textDecoration: 'none',
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 30, height: 30, fill: '#fff' }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
        </a>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
        @media(max-width:1024px){
          .hero-grid{grid-template-columns:1fr!important}
          .hero-right{display:none!important}
          .teacher-featured{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .contact-grid{grid-template-columns:1fr!important}
          .footer-grid{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:640px){
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .footer-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:768px){
          #enquiry-form { grid-template-columns: 1fr !important; }
        }
        input:focus, select:focus, textarea:focus {
          border-color: rgba(245,166,35,0.6)!important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(245,166,35,0.1);
        }
        select option { background: #2d2457; color: #fff; }
      `}</style>
    </div>
  );
}

// ─── Form styles ──────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(120,98,190,0.25)',
  borderRadius: 10, color: '#251b4f', fontSize: 14, padding: '13px 16px', fontFamily: 'Plus Jakarta Sans, sans-serif',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const labelStyle = { display: 'block', color: 'rgba(39,29,78,0.66)', fontSize: 13, fontWeight: 600, marginBottom: 8, fontFamily: 'Plus Jakarta Sans, sans-serif' };
const errStyle = { color: '#f87171', fontSize: 12, marginTop: 4 };
