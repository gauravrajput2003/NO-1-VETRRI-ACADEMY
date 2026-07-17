import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import AdmissionFormModal from '../../components/AdmissionFormModal';

const COURSES = [
  'CBSE Tuition', 'Matriculation / State Board', 'Engineering Tuition',
  'Arts & Science College', 'Language Courses', 'Competitive Exams',
];

const GRADES = ['4th','5th','6th','7th','8th','9th','10th','11th','12th','UG','PG'];

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Valid mobile number required').max(12),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
  grade: z.string().min(1, 'Select your grade'),
  course: z.string().min(1, 'Select a course'),
  board: z.string().min(1, 'Select your board'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function StudentSignup() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showAdmission, setShowAdmission] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (formData) => {
    try {
      const { confirmPassword, ...userData } = formData;
      await authRegister(userData);
      toast.success('Account created! Welcome to No.1 Vettri Academy 🎓');
      setShowAdmission(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient opacity-50" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg">
        <div className="glass-card p-8 border border-gold/20">
          <div className="text-center mb-6">
            <Link to="/"><img src="/logo.jpg" alt="Logo" className="h-14 w-14 object-contain mx-auto mb-3" /></Link>
            <h1 className="font-display font-bold text-2xl text-white">Create Student Account</h1>
            <p className="text-white/50 text-sm mt-1">Join No.1 Vettri Academy today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="student-signup-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="input-label">Full Name *</label>
                <input {...register('name')} placeholder="Your full name" className="input-field" id="signup-name" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="input-label">Mobile Number *</label>
                <input {...register('mobile')} placeholder="9876543210" className="input-field" type="tel" id="signup-mobile" />
                {errors.mobile && <p className="text-red-400 text-xs mt-1">{errors.mobile.message}</p>}
              </div>
              <div>
                <label className="input-label">Email (optional)</label>
                <input {...register('email')} placeholder="email@example.com" className="input-field" type="email" id="signup-email" />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="input-label">Grade *</label>
                <select {...register('grade')} className="input-field" id="signup-grade">
                  <option value="">Select Grade</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.grade && <p className="text-red-400 text-xs mt-1">{errors.grade.message}</p>}
              </div>
              <div>
                <label className="input-label">Board *</label>
                <select {...register('board')} className="input-field" id="signup-board">
                  <option value="">Select Board</option>
                  {['CBSE','State Board','Arts College','Eng College','TNPSC','TRB','TET'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.board && <p className="text-red-400 text-xs mt-1">{errors.board.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="input-label">Course *</label>
                <select {...register('course')} className="input-field" id="signup-course">
                  <option value="">Select Course</option>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.course && <p className="text-red-400 text-xs mt-1">{errors.course.message}</p>}
              </div>
              <div>
                <label className="input-label">Password *</label>
                <div className="relative">
                  <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Min 6 chars" className="input-field pr-10" id="signup-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                    {showPw ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="input-label">Confirm Password *</label>
                <input {...register('confirmPassword')} type="password" placeholder="Repeat password" className="input-field" id="signup-confirm-password" />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} id="signup-btn" className="btn-primary w-full py-3.5 text-base mt-2 flex items-center justify-center gap-2">
              {isSubmitting ? <><div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />Creating account...</> : '🎓 Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-white/40 text-sm">Already have an account? <Link to="/login/student" className="text-gold hover:underline">Login here</Link></p>
            <Link to="/" className="block text-white/30 text-xs mt-2 hover:text-white/50">← Back to Home</Link>
          </div>
        </div>
      </motion.div>

      {showAdmission && (
        <AdmissionFormModal onClose={() => { setShowAdmission(false); navigate('/student/dashboard'); }} />
      )}
    </div>
  );
}
