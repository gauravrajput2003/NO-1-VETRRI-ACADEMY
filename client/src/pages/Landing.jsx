import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  FiUsers, FiAward, FiVideo, FiMessageCircle, FiCheckCircle,
  FiStar, FiPhone, FiMail, FiMapPin, FiArrowRight, FiMenu, FiX,
  FiMonitor, FiFileText, FiTrendingUp, FiShield, FiChevronDown, FiTarget,
  FiFacebook, FiInstagram, FiYoutube, FiLinkedin, FiSend, FiArrowUp,
} from 'react-icons/fi';

// ─── Data ────────────────────────────────────────────────────────────────────
const COURSES = [
  {
    id: 1, icon: '📘', title: 'CBSE Tuition', grade: '6th – 12th', category: 'School',
    subjects: ['Mathematics', 'Science', 'English', 'Social Science'],
    accent: '#0d9488', tag: 'Most Popular',
  },
  {
    id: 2, icon: '📗', title: 'State Board', grade: '6th – 12th', category: 'School',
    subjects: ['Mathematics', 'Science', 'Tamil', 'English', 'Social Science'],
    accent: '#0f766e', tag: 'Tamil Nadu',
  },
  {
    id: 3, icon: '⚙️', title: 'Engineering', grade: 'B.E / B.Tech', category: 'College',
    subjects: ['Engineering Maths', 'Physics', 'Chemistry', 'Coding'],
    accent: '#0d9488', tag: 'High Demand',
  },
  {
    id: 4, icon: '🎨', title: 'Arts & Science', grade: 'UG / PG', category: 'College',
    subjects: ['B.Sc', 'M.Sc', 'B.Com', 'M.Com', 'B.A', 'M.A'],
    accent: '#0f766e', tag: 'UG / PG',
  },
  {
    id: 5, icon: '🗣️', title: 'Language Courses', grade: 'All Ages', category: 'Language',
    subjects: ['Tamil (Beginners–Advanced)', 'English Communication', 'Spoken English'],
    accent: '#0d9488', tag: 'All Ages',
  },
  {
    id: 6, icon: '🏆', title: 'Competitive Exams', grade: 'All Levels', category: 'Competitive',
    subjects: ['TNPSC Group 1–4', 'TRB Exam Prep', 'TET Primary & Upper'],
    accent: '#0f766e', tag: '🔥 Trending',
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
  { value: 500, suffix: '+', label: 'Happy Students', icon: FiUsers, color: '#d97706' },
  { value: 12, suffix: '+', label: 'Expert Teachers', icon: FiAward, color: '#0d9488' },
  { value: 20, suffix: '+', label: 'Years of Excellence', icon: FiTrendingUp, color: '#a855f7' },
  { value: 98, suffix: '%', label: 'Success Rate', icon: FiTarget, color: '#3b82f6' },
];

const WHY_CHOOSE = [
  { icon: FiVideo, title: 'Daily Live Classes', desc: 'Interactive 1-hour live sessions every day with real-time Q&A.', color: '#3b82f6' },
  { icon: FiFileText, title: 'Free Study Materials', desc: 'Comprehensive PDFs, PPTs and video lessons at no extra cost.', color: '#0d9488' },
  { icon: FiMessageCircle, title: 'WhatsApp Doubt Clearing', desc: 'Instant doubt resolution via WhatsApp — any time, any question.', color: '#16a34a' },
  { icon: FiCheckCircle, title: 'Weekly Tests', desc: 'Regular assessments to track progress and identify weak areas.', color: '#d97706' },
  { icon: FiMonitor, title: 'Virtual Science Lab', desc: 'Advanced virtual lab simulations for practical science experiments.', color: '#a855f7' },
  { icon: FiShield, title: 'Certified Teachers', desc: 'All teachers hold M.Sc/B.Ed with 2–10+ years of experience.', color: '#ef4444' },
];

const TESTIMONIALS = [
  { id: 1, name: 'Arun Kumar', grade: '12th CBSE', text: 'Scored 95% in Maths! The daily live classes and weekly tests made all the difference. Best coaching in Tamil Nadu!', rating: 5, avatar: 'AK', color: '#3b82f6' },
  { id: 2, name: 'Priya Devi', grade: '10th State Board', text: 'WhatsApp doubt clearing is amazing. Got answers at midnight before my exam. Thank you Vettri Academy!', rating: 5, avatar: 'PD', color: '#0d9488' },
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
    const particles = [];

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.35 + 0.08;
        this.color = Math.random() > 0.5 ? '#d97706' : '#0d9488';
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
    for (let i = 0; i < 90; i++) particles.push(new Particle());
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ loggedIn }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    fn();
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [['Courses', '#courses'], ['Teachers', '#teachers'], ['Why Us', '#why-us'], ['Contact', '#contact']];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 border-b bg-white transition-all duration-300 ${
        scrolled ? 'border-teal-800/10 shadow-md' : 'border-transparent shadow-sm'
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-10">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/landing-templates/assets/logo_playstore.png"
            alt="Vettri Academy"
            className="h-12 w-12 shrink-0 rounded-xl object-contain ring-1 ring-teal-900/10 sm:h-14 sm:w-14"
            onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
          />
          <div className="min-w-0">
            <p className="truncate font-jakarta text-[17px] font-extrabold leading-tight text-teal-950 sm:text-[20px]">
              No.1 Vettri Academy
            </p>
            <p className="hidden text-[13px] font-semibold text-amber-600 sm:block">Since 2003 · Tamil Nadu</p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="whitespace-nowrap font-jakarta text-[16px] font-bold text-teal-950 transition-colors hover:text-amber-600"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <Link
            to="/login/student"
            className="rounded-lg border-2 border-teal-700 px-3.5 py-2.5 font-jakarta text-[14px] font-bold text-teal-800 transition-colors hover:bg-teal-50 sm:rounded-xl sm:px-5 sm:text-[15px]"
          >
            Login
          </Link>
          <a
            href="#enquiry"
            className="hidden whitespace-nowrap rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 px-6 py-3 font-jakarta text-[15px] font-extrabold text-white shadow-md shadow-amber-500/30 transition-transform hover:scale-[1.03] sm:inline-block"
          >
            📅 Free Demo
          </a>

          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 text-teal-950 lg:hidden" aria-label="Toggle menu">
            {menuOpen ? <FiX size={26} /> : <FiMenu size={26} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-4 border-t border-teal-900/10 bg-white px-6 py-5 lg:hidden"
          >
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="border-b border-teal-950/10 py-2.5 text-[17px] font-bold text-teal-950">
                {label}
              </a>
            ))}
            <a href="#enquiry" onClick={() => setMenuOpen(false)} className="rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 py-3.5 text-center text-[16px] font-extrabold text-white">
              📅 Book Free Demo
            </a>
            <Link
              to={loggedIn ? '/student/dashboard' : '/login/student'}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl border-2 border-teal-700 py-3.5 text-center text-[16px] font-extrabold text-teal-800"
            >
              {loggedIn ? 'Go to Dashboard' : 'Login'}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ children, id, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref} id={id}
      initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Eyebrow label ─────────────────────────────────────────────────────────────
function Eyebrow({ children, dark = false }) {
  return (
    <p className={`mb-3 text-[14px] font-extrabold uppercase tracking-[0.25em] ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{children}</p>
  );
}

// Stagger container/item variants shared by grid reveals
const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 26, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ─── Main Landing ─────────────────────────────────────────────────────────────
export default function Landing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [teacherIdx, setTeacherIdx] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroImgScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);

  // Page-wide scroll progress, shown as a thin bar under the navbar
  const { scrollYProgress: pageProgress } = useScroll();
  const progressScaleX = useTransform(pageProgress, [0, 1], [0, 1]);

  const filteredCourses = activeTab === 'All' ? COURSES : COURSES.filter(c => c.category === activeTab);

  useEffect(() => {
    const t = setInterval(() => setTeacherIdx(i => (i + 1) % TEACHERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(enquirySchema) });

  const onSubmitEnquiry = async (data) => {
    try {
      const res = await api.post('/enquiries', data);
      if (res.data.success) { toast.success("Thank you! We'll contact you shortly 🎓"); reset(); }
    } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
  };

  const inputClass = "w-full rounded-lg border border-teal-900/15 bg-white px-4 py-3 text-[15px] text-teal-950 placeholder:text-teal-950/35 transition-colors focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-teal-50 via-emerald-50/60 to-teal-100/70 font-jakarta text-indigo-950">
      <Navbar loggedIn={!!user} />
      <motion.div
        style={{ scaleX: progressScaleX }}
        className="fixed left-0 right-0 top-[76px] z-50 h-[3px] origin-left bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 sm:top-20"
      />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(217,119,6,0.10)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(13,148,136,0.14)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(13,148,136,0.08)_0%,transparent_50%)]" />
        <ParticleCanvas />

        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.5, 0.25] }} transition={{ duration: 5, repeat: Infinity }}
          className="pointer-events-none absolute right-[8%] top-[15%] h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 7, repeat: Infinity, delay: 2 }}
          className="pointer-events-none absolute bottom-[20%] left-[4%] h-60 w-60 rounded-full bg-teal-500/15 blur-3xl" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10 xl:px-16">
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[14px] font-bold text-amber-700">🏆 Tamil Nadu's #1 Online Coaching</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
              className="mb-6 text-[clamp(2.7rem,5.5vw,4.5rem)] font-black leading-[1.06] tracking-tight">
              <span className="block text-teal-950">Transform Your</span>
              <span className="block bg-gradient-to-br from-amber-600 via-amber-500 to-amber-700 bg-clip-text italic text-transparent">Future With</span>
              <span className="block text-teal-950">Expert Coaching</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
              className="mb-9 max-w-lg text-[19px] leading-relaxed text-teal-950/70">
              Daily live classes · Free study materials · WhatsApp doubt clearing ·
              Weekly tests — all under one roof since <strong className="font-extrabold text-amber-600">2003</strong>.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
              className="mb-12 flex flex-wrap gap-4">
              <motion.a whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} href="#enquiry" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 px-8 py-4 text-[16px] font-extrabold text-white shadow-lg shadow-amber-500/30">
                📅 Book Free Demo <FiArrowRight />
              </motion.a>
              <motion.a whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} href="#courses" className="inline-flex items-center gap-2 rounded-xl border-2 border-teal-700 px-8 py-4 text-[16px] font-bold text-teal-800 transition-colors hover:bg-teal-100">
                🎓 Our Courses
              </motion.a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap gap-8">
              {[['500+', 'Students'], ['12+', 'Teachers'], ['20+', 'Years'], ['98%', 'Success']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-[26px] font-extrabold text-amber-600">{v}</p>
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-teal-950/50">{l}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — floating card stack */}
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45, duration: 0.7 }}
            className="relative hidden h-[560px] lg:block">
            <motion.div style={{ scale: heroImgScale }} className="absolute inset-0 overflow-hidden rounded-[28px] border border-amber-500/20 shadow-xl">
              <img
                src="https://cdn.prod.website-files.com/635b9e21a44669d00b2a98b3/635b9e21a4466985b02a990f_Home%20Hero.webp"
                alt="Students learning together"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-teal-950/10 to-teal-950/45" />
            </motion.div>

            <motion.div animate={{ y: [-6, 6, -6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-6 top-6 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-white/95 px-4 py-3.5 backdrop-blur-lg shadow-lg">
              <img
                src="/landing-templates/assets/logo_playstore.png"
                alt="Vettri Academy"
                className="h-10 w-10 object-contain"
                onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <div>
                <p className="text-[14px] font-bold text-teal-950">Top Rated Academy</p>
                <p className="text-[12px] font-semibold text-amber-600">4.9 / 5.0 Rating</p>
              </div>
            </motion.div>

            <motion.div animate={{ y: [6, -6, 6] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-8 right-6 flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-white/95 px-4 py-3.5 backdrop-blur-lg shadow-lg">
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_#22c55e]" />
              <div>
                <p className="text-[14px] font-bold text-teal-950">🎥 Live Now</p>
                <p className="text-[12px] font-semibold text-emerald-600">Daily Sessions Active</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="text-[13px] font-medium text-teal-950/40">Scroll to explore</span>
          <FiChevronDown className="text-amber-600/70" size={24} />
        </motion.div>
      </section>

      {/* ── STATS RIBBON ──────────────────────────────────────────────────── */}
      <section className="border-y border-teal-800/10 bg-teal-600/[0.06] px-4 py-10 sm:px-6 lg:px-10">
        <motion.div
          variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="mx-auto grid max-w-[1440px] grid-cols-2 gap-6 md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <motion.div key={stat.label} variants={gridItem} whileHover={{ y: -4 }}
              className="rounded-2xl border-2 bg-gradient-to-br from-teal-100 via-teal-50 to-white p-6 text-center shadow-sm" style={{ borderColor: `${stat.color}35` }}>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}40` }}>
                <stat.icon style={{ color: stat.color }} size={26} />
              </div>
              <p className="mb-1 text-4xl font-black" style={{ color: stat.color }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-[15px] font-semibold text-teal-950/60">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── ANNOUNCEMENT STRIP ────────────────────────────────────────────── */}
      <div className="overflow-hidden bg-gradient-to-r from-amber-700 via-amber-500 to-amber-600 py-4">
        <motion.div animate={{ x: [0, -1000] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex gap-20 whitespace-nowrap text-[16px] font-bold text-teal-950">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex gap-20">
              <span>🚀 Rapid Revision — 10th &amp; 12th Batch Starting Soon!</span>
              <span>🎓 TNPSC Group 4 New Batch Open — Limited Seats!</span>
              <span>📞 Call Now: 90477 58389 for Free Demo Class!</span>
              <span>🏆 98% Pass Rate in 2024 Board Exams!</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── COURSES ───────────────────────────────────────────────────────── */}
      <Section id="courses" className="bg-teal-50 px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 text-center">
            <Eyebrow>Our Programmes</Eyebrow>
            <h2 className="mb-4 text-[clamp(2.1rem,4vw,3.2rem)] font-black tracking-tight">
              Courses We <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Offer</span>
            </h2>
            <p className="mx-auto mb-9 max-w-xl text-[18px] text-teal-950/60">
              Comprehensive tuition across all levels and boards, taught by qualified experts.
            </p>

            <div className="flex flex-wrap justify-center gap-2.5">
              {COURSE_TABS.map(tab => (
                <motion.button key={tab} onClick={() => setActiveTab(tab)} whileTap={{ scale: 0.95 }}
                  className={`rounded-full px-6 py-2.5 text-[15px] font-bold transition-colors ${
                    activeTab === tab
                      ? 'bg-gradient-to-br from-teal-700 to-teal-600 text-white'
                      : 'border border-teal-900/15 bg-white text-teal-950/65 hover:border-teal-500/40'
                  }`}
                >
                  {tab}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.div layout variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredCourses.map((course) => (
                <motion.div
                  key={course.id} layout variants={gridItem}
                  exit={{ opacity: 0, scale: 0.92 }}
                  whileHover={{ y: -6, rotate: -0.4 }}
                  className="relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-teal-100 via-teal-50 to-teal-50 p-7 shadow-sm transition-shadow hover:shadow-xl"
                  style={{ borderColor: `${course.accent}55` }}
                >
                  <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full blur-2xl" style={{ background: `${course.accent}28` }} />

                  {course.tag && (
                    <span className="absolute right-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-wide text-white" style={{ background: course.accent }}>
                      {course.tag}
                    </span>
                  )}

                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: `${course.accent}28` }}>
                    {course.icon}
                  </div>
                  <h3 className="mb-1 text-[22px] font-extrabold text-teal-950">{course.title}</h3>
                  <p className="mb-4 text-[15px] font-bold" style={{ color: course.accent }}>{course.grade}</p>
                  <ul className="mb-6 flex flex-col gap-2.5">
                    {course.subjects.map(s => (
                      <li key={s} className="flex items-center gap-2.5 text-[15px] font-medium text-teal-950/75">
                        <FiCheckCircle className="shrink-0" style={{ color: course.accent }} size={15} />{s}
                      </li>
                    ))}
                  </ul>
                  <a href="#enquiry" className="inline-flex items-center gap-1.5 text-[15px] font-extrabold" style={{ color: course.accent }}>
                    Enroll Now <FiArrowRight size={16} />
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </Section>

      {/* ── TEACHERS ──────────────────────────────────────────────────────── */}
      <Section id="teachers" className="bg-teal-100/50 px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 text-center">
            <Eyebrow>Our Faculty</Eyebrow>
            <h2 className="mb-4 text-[clamp(2.1rem,4vw,3.2rem)] font-black tracking-tight">
              Meet Our <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Expert Teachers</span>
            </h2>
            <p className="text-[18px] text-teal-950/60">Qualified, passionate educators dedicated to your success.</p>
          </div>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <AnimatePresence mode="wait">
              <motion.div key={teacherIdx} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.35 }}
                className="flex items-start gap-6 rounded-3xl border-2 border-teal-700/25 bg-gradient-to-br from-teal-100 to-teal-50 p-8"
              >
                <img
                  src={TEACHERS[teacherIdx].img} alt={TEACHERS[teacherIdx].name}
                  className="h-[100px] w-[100px] shrink-0 rounded-full border-[3px] border-amber-500/50"
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${TEACHERS[teacherIdx].name}&background=d97706&color=fff&size=100`; }}
                />
                <div>
                  <h3 className="mb-1 text-[22px] font-extrabold text-teal-950">{TEACHERS[teacherIdx].name}</h3>
                  <p className="mb-2 text-[15px] font-semibold text-amber-600">{TEACHERS[teacherIdx].qual}</p>
                  <p className="mb-4 text-[16px] text-teal-950/70">{TEACHERS[teacherIdx].subjects}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3.5 py-1.5 text-[13px] font-bold text-amber-700">⏱ {TEACHERS[teacherIdx].exp} exp</span>
                    <span className="rounded-lg border border-teal-500/30 bg-teal-500/15 px-3.5 py-1.5 text-[13px] font-bold text-teal-700">⭐ {TEACHERS[teacherIdx].rating}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div>
              <p className="mb-5 text-[14px] font-semibold text-teal-950/50">Click to meet our teachers</p>
              <div className="grid grid-cols-2 gap-3">
                {TEACHERS.map((t, i) => (
                  <button
                    key={t.id} onClick={() => setTeacherIdx(i)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      teacherIdx === i ? 'border-amber-500/50 bg-amber-500/10' : 'border-teal-900/10 bg-white hover:border-amber-500/30'
                    }`}
                  >
                    <img
                      src={t.img} alt={t.name} className="h-10 w-10 shrink-0 rounded-full"
                      onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${t.name}&background=d97706&color=fff&size=40`; }}
                    />
                    <div className="min-w-0">
                      <p className={`truncate text-[14px] font-bold ${teacherIdx === i ? 'text-amber-600' : 'text-teal-950'}`}>{t.name}</p>
                      <p className="text-[12px] font-medium text-teal-950/50">{t.exp} exp</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── WHY CHOOSE US ─────────────────────────────────────────────────── */}
      <Section id="why-us" className="bg-teal-50 px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 text-center">
            <Eyebrow>Why Us</Eyebrow>
            <h2 className="text-[clamp(2.1rem,4vw,3.2rem)] font-black tracking-tight">
              Why Choose <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Vettri Academy?</span>
            </h2>
          </div>

          <motion.div variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_CHOOSE.map((item) => (
              <motion.div
                key={item.title} variants={gridItem}
                whileHover={{ y: -6, rotate: 0.4 }}
                className="rounded-2xl border-2 bg-gradient-to-br from-teal-100 via-teal-50 to-white p-7 shadow-sm transition-shadow hover:shadow-lg"
                style={{ borderColor: `${item.color}30` }}
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: `${item.color}18`, border: `1px solid ${item.color}35` }}>
                  <item.icon style={{ color: item.color }} size={28} />
                </div>
                <h3 className="mb-2 text-[19px] font-extrabold text-teal-950">{item.title}</h3>
                <p className="text-[15.5px] leading-relaxed text-teal-950/60">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <Section className="bg-teal-100/50 px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-14 text-center">
            <Eyebrow>Success Stories</Eyebrow>
            <h2 className="text-[clamp(2.1rem,4vw,3.2rem)] font-black tracking-tight">
              What Our <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Students Say</span>
            </h2>
          </div>
          <motion.div variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.id} variants={gridItem}
                whileHover={{ y: -6 }}
                className="relative overflow-hidden rounded-2xl border-2 border-teal-700/20 bg-gradient-to-br from-teal-100 via-teal-50 to-white p-7 shadow-sm"
              >
                <div className="absolute -right-4 -top-6 font-serif text-8xl italic leading-none text-teal-950/[0.06]">"</div>
                <div className="mb-4 flex gap-1">
                  {[...Array(t.rating)].map((_, j) => <FiStar key={j} className="fill-amber-500 text-amber-500" size={16} />)}
                </div>
                <p className="mb-5 text-[16.5px] italic leading-relaxed text-teal-950/80">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 text-[16px] font-extrabold" style={{ background: `${t.color}22`, borderColor: `${t.color}50`, color: t.color }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-teal-950">{t.name}</p>
                    <p className="text-[13.5px] font-semibold text-amber-600">{t.grade}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section className="border-y border-amber-500/15 bg-gradient-to-br from-amber-500/[0.12] via-amber-500/[0.05] to-teal-500/[0.12] px-4 py-20 sm:px-6 lg:px-10">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-2xl text-center">
          <div className="mb-4 text-5xl">🚀</div>
          <h2 className="mb-4 text-[clamp(2rem,4vw,3rem)] font-black tracking-tight">
            Start Your <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Learning Journey</span> Today
          </h2>
          <p className="mb-9 text-[18px] text-teal-950/65">Join 500+ students who are already transforming their future with expert coaching.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} href="#enquiry" className="rounded-2xl bg-gradient-to-br from-amber-700 to-amber-500 px-9 py-4 text-[17px] font-extrabold text-white shadow-lg shadow-amber-500/30">
              📅 Book Free Demo Class
            </motion.a>
            <motion.a whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} href="tel:9047758389" className="flex items-center gap-2 rounded-2xl border-2 border-teal-700 px-8 py-4 text-[17px] font-bold text-teal-800 hover:bg-teal-100">
              <FiPhone size={19} /> Call Now
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* ── ENQUIRY FORM ──────────────────────────────────────────────────── */}
      <Section id="enquiry" className="bg-teal-50 px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <Eyebrow>Get Started</Eyebrow>
            <h2 className="mb-3 text-[clamp(2.1rem,4vw,3.2rem)] font-black tracking-tight">
              Book Your <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Free Demo</span>
            </h2>
            <p className="text-[16.5px] text-teal-950/60">Fill the form and we'll contact you within 24 hours.</p>
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-white p-9 shadow-xl shadow-teal-950/5 sm:p-10">
            <form onSubmit={handleSubmit(onSubmitEnquiry)} className="grid grid-cols-1 gap-5 sm:grid-cols-2" id="enquiry-form">
              <div>
                <label className="mb-2 block text-[14px] font-bold text-teal-950/70">Full Name *</label>
                <input {...register('name')} placeholder="Your name" className={inputClass} id="enquiry-name" />
                {errors.name && <p className="mt-1 text-[13px] text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-bold text-teal-950/70">Phone *</label>
                <input {...register('phone')} placeholder="+91 98765 43210" type="tel" className={inputClass} id="enquiry-phone" />
                {errors.phone && <p className="mt-1 text-[13px] text-red-500">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-bold text-teal-950/70">Email (optional)</label>
                <input {...register('email')} placeholder="your@email.com" type="email" className={inputClass} id="enquiry-email" />
              </div>
              <div>
                <label className="mb-2 block text-[14px] font-bold text-teal-950/70">Grade / Class</label>
                <select {...register('grade')} className={inputClass} id="enquiry-grade">
                  <option value="">Select Grade</option>
                  {['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'UG', 'PG'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-[14px] font-bold text-teal-950/70">Course Interested In</label>
                <select {...register('course')} className={inputClass} id="enquiry-course">
                  <option value="">Select Course</option>
                  {COURSES.map(c => <option key={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-[14px] font-bold text-teal-950/70">Message (optional)</label>
                <textarea {...register('message')} rows={3} placeholder="Tell us your requirements, preferred timings, etc." className={`${inputClass} resize-none`} />
              </div>
              <div className="sm:col-span-2">
                <motion.button
                  type="submit" disabled={isSubmitting} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-gradient-to-br from-amber-700 to-amber-500 py-4 text-[17px] font-extrabold text-white shadow-lg shadow-amber-500/30 disabled:opacity-70"
                >
                  {isSubmitting ? '⏳ Sending...' : '🎓 Book Free Demo Class'}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </Section>

      {/* ── CONTACT ───────────────────────────────────────────────────────── */}
      <Section id="contact" className="bg-teal-100/50 px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-14 lg:grid-cols-2">
          <div>
            <h2 className="mb-5 text-[clamp(2rem,3vw,2.7rem)] font-black tracking-tight">
              Get In <span className="bg-gradient-to-br from-amber-600 to-amber-400 bg-clip-text text-transparent">Touch</span>
            </h2>
            <p className="mb-8 text-[16.5px] leading-relaxed text-teal-950/65">
              Have questions? We're happy to help! Reach out and our team will get back to you.
            </p>
            {[
              { icon: FiPhone, label: 'Phone', val: '90477 58389', href: 'tel:9047758389', color: '#0d9488' },
              { icon: FiMail, label: 'Email', val: 'vettrieducationalinstitutions@gmail.com', href: 'mailto:vettrieducationalinstitutions@gmail.com', color: '#3b82f6' },
              { icon: FiMapPin, label: 'Location', val: 'Tamil Nadu, India', href: '#', color: '#d97706' },
            ].map(c => (
              <a key={c.label} href={c.href} className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                  <c.icon style={{ color: c.color }} size={22} />
                </div>
                <div>
                  <p className="mb-0.5 text-[13px] font-semibold text-teal-950/45">{c.label}</p>
                  <p className="text-[17px] font-bold text-teal-950">{c.val}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="h-[360px] overflow-hidden rounded-2xl border-2 border-teal-700/20">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d253682.46824000927!2d79.9864087!3d11.9139819!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a5361a498a4e97b%3A0x44b6e6f6f7f6f6f6!2sVellore%2C+Tamil+Nadu!5e0!3m2!1sen!2sin!4v1713300000000"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Location"
            />
          </div>
        </div>
      </Section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-gradient-to-b from-teal-950 to-[#0a1f2b] px-4 pb-10 pt-20 text-white sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1440px]">
          {/* Newsletter / CTA strip */}
          <div className="mb-16 flex flex-col items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-10 lg:flex-row">
            <div className="text-center lg:text-left">
              <h3 className="mb-2 text-[24px] font-extrabold sm:text-[28px]">Ready to boost your scores?</h3>
              <p className="text-[15.5px] text-white/60">Get a free demo class and see why 500+ students trust us.</p>
            </div>
            <motion.a whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} href="#enquiry" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 px-7 py-3.5 text-[16px] font-extrabold text-white shadow-lg shadow-amber-500/25">
              <FiSend size={18} /> Book Free Demo
            </motion.a>
          </div>

          <div className="mb-14 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <img
                  src="/landing-templates/assets/logo_playstore.png"
                  alt="Logo"
                  className="h-14 w-14 rounded-xl bg-white/95 object-contain p-1"
                  onError={e => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                />
                <div>
                  <p className="text-[19px] font-extrabold text-white">No.1 Vettri Academy</p>
                  <p className="text-[13.5px] font-semibold text-amber-400">Since 2003 · Tamil Nadu</p>
                </div>
              </div>
              <p className="mb-6 max-w-xs text-[15px] leading-relaxed text-white/55">
                Bringing world-class education to your screen. Tamil Nadu's #1 online coaching institute for 20+ years.
              </p>
              <div className="flex gap-3">
                {[FiFacebook, FiInstagram, FiYoutube, FiLinkedin].map((Icon, i) => (
                  <a key={i} href="#" aria-label="Social link" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-amber-400 hover:text-amber-400">
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: 'Courses', links: ['CBSE Tuition', 'State Board', 'Engineering', 'Arts & Science', 'Language', 'Competitive'] },
              { title: 'Quick Links', links: ['About Us', 'Teachers', 'Why Us', 'Testimonials', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="mb-5 text-[13.5px] font-extrabold uppercase tracking-[0.15em] text-amber-400">{col.title}</h4>
                <ul className="flex flex-col gap-3">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-[15px] font-medium text-white/60 transition-colors hover:text-white">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="mb-5 text-[13.5px] font-extrabold uppercase tracking-[0.15em] text-amber-400">Get In Touch</h4>
              <ul className="flex flex-col gap-4">
                <li className="flex items-center gap-3">
                  <FiPhone className="shrink-0 text-teal-300" size={17} />
                  <a href="tel:9047758389" className="text-[15px] font-semibold text-white/80 hover:text-white">90477 58389</a>
                </li>
                <li className="flex items-center gap-3">
                  <FiMail className="shrink-0 text-teal-300" size={17} />
                  <a href="mailto:vettrieducationalinstitutions@gmail.com" className="text-[15px] font-semibold text-white/80 hover:text-white">vettrieducationalinstitutions@gmail.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <FiMapPin className="shrink-0 text-teal-300" size={17} />
                  <span className="text-[15px] font-semibold text-white/80">Tamil Nadu, India</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-7">
            <p className="text-[14px] text-white/40">© 2024 No.1 Vettri Academy. All rights reserved.</p>
            <div className="flex items-center gap-7">
              {['Login', 'Sign Up', 'Privacy'].map(l => (
                <Link key={l} to={l === 'Login' ? '/login/student' : l === 'Sign Up' ? '/signup' : '#'} className="text-[14px] font-medium text-white/40 hover:text-amber-400">
                  {l}
                </Link>
              ))}
              <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-amber-400 hover:text-amber-400" aria-label="Back to top">
                <FiArrowUp size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {!user && (
        <a
          href="https://wa.me/919047758389?text=Hi%20Vettri%20Academy%2C%20I%20need%20course%20details"
          target="_blank" rel="noreferrer" aria-label="WhatsApp Support"
          className="fixed bottom-[18px] right-[18px] z-[1200] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/75 bg-gradient-to-br from-emerald-500 to-emerald-400 shadow-xl shadow-emerald-500/40"
        >
          <svg viewBox="0 0 24 24" className="h-[30px] w-[30px] fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
        </a>
      )}
    </div>
  );
}