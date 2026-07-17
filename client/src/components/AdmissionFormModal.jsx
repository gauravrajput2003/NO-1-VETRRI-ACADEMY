import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiX } from 'react-icons/fi';

const schema = z.object({
  studentName: z.string().min(2),
  parentName: z.string().min(2),
  grade: z.string().min(1),
  board: z.string().min(1),
  dateOfBirth: z.string().min(1),
  subject: z.string().min(1),
  demoClassStatus: z.string(),
  district: z.string().min(1),
  state: z.string().min(1),
  mobileNumber: z.string().min(10),
});

export default function AdmissionFormModal({ onClose }) {
  const { user, updateUser } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      studentName: user?.name || '',
      mobileNumber: user?.mobile || '',
      grade: user?.grade || '',
      board: user?.board || '',
      demoClassStatus: 'Pending',
      state: 'Tamil Nadu',
    },
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/student/admission-form', data);
      updateUser({ admissionFormFilled: true });
      toast.success('Admission form submitted! 🎉');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="glass-card border border-gold/30 rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-xl text-white">Complete Your Admission Form</h2>
              <p className="text-white/50 text-sm mt-0.5">Please fill in your details to proceed</p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
              <FiX size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="admission-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Student Name *</label>
                <input {...register('studentName')} className="input-field" placeholder="Full name" id="adm-student-name" />
                {errors.studentName && <p className="text-red-400 text-xs mt-1">{errors.studentName.message}</p>}
              </div>
              <div>
                <label className="input-label">Parent / Guardian Name *</label>
                <input {...register('parentName')} className="input-field" placeholder="Parent name" id="adm-parent-name" />
                {errors.parentName && <p className="text-red-400 text-xs mt-1">{errors.parentName.message}</p>}
              </div>
              <div>
                <label className="input-label">Grade *</label>
                <select {...register('grade')} className="input-field" id="adm-grade">
                  <option value="">Select</option>
                  {['4th','5th','6th','7th','8th','9th','10th','11th','12th','UG','PG'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {errors.grade && <p className="text-red-400 text-xs mt-1">{errors.grade.message}</p>}
              </div>
              <div>
                <label className="input-label">Board *</label>
                <select {...register('board')} className="input-field" id="adm-board">
                  <option value="">Select</option>
                  {['CBSE','State Board','Arts College','Eng College','TNPSC','TRB','TET'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {errors.board && <p className="text-red-400 text-xs mt-1">{errors.board.message}</p>}
              </div>
              <div>
                <label className="input-label">Date of Birth *</label>
                <input {...register('dateOfBirth')} type="date" className="input-field" id="adm-dob" />
                {errors.dateOfBirth && <p className="text-red-400 text-xs mt-1">{errors.dateOfBirth.message}</p>}
              </div>
              <div>
                <label className="input-label">Subject *</label>
                <input {...register('subject')} className="input-field" placeholder="e.g., Mathematics, Physics" id="adm-subject" />
                {errors.subject && <p className="text-red-400 text-xs mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="input-label">Demo Class Status</label>
                <div className="flex gap-4 mt-2">
                  {['Completed', 'Not Necessary', 'Pending'].map(s => (
                    <label key={s} className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
                      <input {...register('demoClassStatus')} type="radio" value={s} className="accent-gold" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Mobile Number *</label>
                <input {...register('mobileNumber')} type="tel" className="input-field" placeholder="10-digit mobile" id="adm-mobile" />
                {errors.mobileNumber && <p className="text-red-400 text-xs mt-1">{errors.mobileNumber.message}</p>}
              </div>
              <div>
                <label className="input-label">District *</label>
                <input {...register('district')} className="input-field" placeholder="Your district" id="adm-district" />
                {errors.district && <p className="text-red-400 text-xs mt-1">{errors.district.message}</p>}
              </div>
              <div>
                <label className="input-label">State *</label>
                <input {...register('state')} className="input-field" placeholder="Tamil Nadu" id="adm-state" />
                {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state.message}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
                Skip for Now
              </button>
              <button type="submit" disabled={isSubmitting} id="adm-submit" className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : '✅ Submit Form'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
