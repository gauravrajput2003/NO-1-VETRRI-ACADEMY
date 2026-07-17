import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
import { FaGoogle, FaFacebookF, FaApple } from 'react-icons/fa';

const schema = z.object({
  identifier: z.string().min(1, 'Email or Username required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 + 0.5, dx: (Math.random() - 0.5) * 0.4, dy: (Math.random() - 0.5) * 0.4, opacity: Math.random() * 0.6 + 0.1 });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(245,166,35,${p.opacity})`; ctx.fill(); p.x += p.dx; p.y += p.dy; if (p.x < 0 || p.x > canvas.width) p.dx *= -1; if (p.y < 0 || p.y > canvas.height) p.dy *= -1; });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

export default function TeacherLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ identifier, password }) => {
    try {
      const data = await login('teacher', identifier, password);
      toast.success(`Welcome, ${data.user.name}! 👩‍🏫`);
      navigate('/teacher/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgRadial1} />
      <div style={styles.bgRadial2} />
      <div style={styles.bgRadial3} />
      <Particles />
      <div style={{ ...styles.corner, ...styles.cornerTL }} />
      <div style={{ ...styles.corner, ...styles.cornerTR }} />
      <div style={{ ...styles.corner, ...styles.cornerBL }} />
      <div style={{ ...styles.corner, ...styles.cornerBR }} />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, margin: '0 auto', padding: '16px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.img
            src="/logo.jpg"
            alt="No.1 Vettri Academy"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ width: 140, height: 140, objectFit: 'contain', margin: '0 auto', display: 'block', filter: 'drop-shadow(0 0 20px rgba(245,166,35,0.5))' }}
          />
        </div>

        <div style={styles.card}>
          {/* Teacher badge */}
          <div style={styles.roleBadge}>👩‍🏫 Teacher Portal</div>
          <h1 style={styles.cardTitle}>Login to Your Account</h1>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={styles.inputWrap}>
              <FiMail style={styles.inputIcon} size={16} />
              <input {...register('identifier')} placeholder="Email or Username" id="teacher-identifier" style={styles.input} />
              <span style={styles.inputArrow}>›</span>
              {errors.identifier && <p style={styles.errTxt}>{errors.identifier.message}</p>}
            </div>

            <div style={styles.inputWrap}>
              <FiLock style={styles.inputIcon} size={16} />
              <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Password" id="teacher-password" style={{ ...styles.input, paddingRight: 80 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={styles.eyeBtn} tabIndex={-1}>
                {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
              <span style={styles.forgotLink}>
                <Link to="/forgot-password" style={{ color: '#F5A623', fontSize: 11, textDecoration: 'none' }}>Forgot Password?</Link>
              </span>
              {errors.password && <p style={styles.errTxt}>{errors.password.message}</p>}
            </div>

            <motion.button type="submit" disabled={isSubmitting} id="teacher-login-btn" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={styles.loginBtn}>
              {isSubmitting ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><div style={styles.spinner} /> Logging in...</span> : 'Login'}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 16 }}>
            New teacher? Contact admin for your login credentials.
          </p>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>Or log in with</span>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.socialRow}>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} style={styles.socialBtn} id="teacher-google-login"><FaGoogle size={18} /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} style={styles.socialBtn} id="teacher-facebook-login"><FaFacebookF size={18} /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} style={styles.socialBtn} id="teacher-apple-login"><FaApple size={18} /></motion.button>
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link to="/login/student" style={styles.roleLink}>Student Login</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <Link to="/login/admin" style={styles.roleLink}>Admin Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at center, #1a100a 0%, #110c02 40%, #0a0800 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', fontFamily: "'Inter', sans-serif",
  },
  bgRadial1: { position: 'absolute', borderRadius: '50%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)', top: '-10%', left: '-10%', pointerEvents: 'none' },
  bgRadial2: { position: 'absolute', borderRadius: '50%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)', bottom: '-5%', right: '-5%', pointerEvents: 'none' },
  bgRadial3: { position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 80%, rgba(245,120,10,0.07) 0%, transparent 60%)', pointerEvents: 'none' },
  corner: { position: 'absolute', width: 80, height: 80, border: '2px solid rgba(245,166,35,0.4)', pointerEvents: 'none' },
  cornerTL: { top: 16, left: 16, borderRight: 'none', borderBottom: 'none' },
  cornerTR: { top: 16, right: 16, borderLeft: 'none', borderBottom: 'none' },
  cornerBL: { bottom: 16, left: 16, borderRight: 'none', borderTop: 'none' },
  cornerBR: { bottom: 16, right: 16, borderLeft: 'none', borderTop: 'none' },
  card: {
    background: 'rgba(18,12,4,0.82)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(245,166,35,0.25)', borderRadius: 20,
    padding: '28px 28px 24px',
    boxShadow: '0 8px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,166,35,0.15)',
  },
  roleBadge: {
    display: 'inline-block', background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.35)',
    borderRadius: 20, color: '#F5A623', fontSize: 11, fontWeight: 600, padding: '4px 12px',
    marginBottom: 10, letterSpacing: 0.5,
  },
  cardTitle: { textAlign: 'center', color: '#fff', fontSize: 20, fontWeight: 600, marginBottom: 22, letterSpacing: 0.3 },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, color: '#fff', fontSize: 14, padding: '13px 14px 13px 38px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  inputArrow: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,166,35,0.6)', fontSize: 20, pointerEvents: 'none' },
  eyeBtn: { position: 'absolute', right: 38, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  forgotLink: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' },
  errTxt: { color: '#f87171', fontSize: 11, marginTop: 4, position: 'absolute', bottom: -18, left: 0 },
  loginBtn: { width: '100%', background: 'linear-gradient(135deg, #d4881a 0%, #F5A623 50%, #c97a10 100%)', color: '#1a0e00', fontWeight: 700, fontSize: 16, letterSpacing: 1, border: 'none', borderRadius: 10, padding: '14px', cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 20px rgba(245,166,35,0.4)', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' },
  spinner: { width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#1a0e00', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.35)', fontSize: 12, whiteSpace: 'nowrap' },
  socialRow: { display: 'flex', gap: 14, justifyContent: 'center' },
  socialBtn: { width: 48, height: 48, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 12, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  roleLink: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', transition: 'color 0.2s' },
};
