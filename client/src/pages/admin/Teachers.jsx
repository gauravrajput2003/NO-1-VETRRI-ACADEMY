import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiPhone, FiMail, FiPlus, FiX, FiEye, FiEyeOff, FiCopy, FiUserCheck } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  mobile: z.string().min(10, 'Valid phone required'),
  password: z.string().min(6, 'Password required'),
  subjects: z.string().min(2, 'At least one subject required (comma separated)'),
  qualification: z.string().min(2, 'Qualification required'),
  experience: z.coerce.number().min(0, 'Must be positive number'),
  teacherBio: z.string().optional(),
});

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { experience: 0 }
  });

  const fetchTeachers = () => api.get('/admin/teachers').then(r => { if (r.data.success) setTeachers(r.data.teachers); }).finally(() => setLoading(false));
  useEffect(() => { fetchTeachers(); }, []);

  const approve = async (id, isApproved) => {
    try {
      await api.put(`/admin/teachers/${id}/approve`, { isApproved });
      toast.success(`Teacher ${isApproved ? 'approved' : 'suspended'}!`);
      fetchTeachers();
    } catch { toast.error('Failed to update status'); }
  };

  const generatePassword = () => {
    const randomPass = Math.random().toString(36).slice(-10);
    setValue('password', randomPass);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        role: 'teacher',
        ...data,
        subjects: data.subjects.split(',').map(s => s.trim()).filter(s => s)
      };
      const res = await api.post('/auth/register', payload);
      if (res.data.success) {
        setIsAddOpen(false);
        setCredentials({
          name: data.name,
          email: data.email,
          password: data.password
        });
        reset();
        fetchTeachers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create teacher');
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `No.1 Vettri Academy Login\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin: no1vettriacademy.com/login/teacher`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Teachers</h1>
          <p className="text-white/40 text-sm mt-1">Admin can manage all teacher accounts</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <FiPlus /> Add New Teacher
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Qualification</th><th>Subjects</th><th>Approved</th><th>Action</th></tr></thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <img src={t.profileImage || `https://i.pravatar.cc/40?u=${t._id}`} alt={t.name} className="w-8 h-8 rounded-full object-cover" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${t.name}&background=7c3aed&color=fff&size=32`; }} />
                      <span className="text-white font-medium">{t.name}</span>
                    </div>
                  </td>
                  <td className="text-white/60 font-mono flex items-center gap-1"><FiPhone size={12} className="text-white/30" /> {t.mobile}</td>
                  <td className="text-white/60"><div className="flex items-center gap-1"><FiMail size={12} className="text-white/30" /> <span className="truncate max-w-[150px]">{t.email || '—'}</span></div></td>
                  <td className="text-white/60">{t.qualification || '—'}</td>
                  <td className="text-white/50 text-xs max-w-32 truncate">{t.subjects?.join(', ') || '—'}</td>
                  <td><span className={`badge ${t.isApproved ? 'badge-green' : 'badge-gold'}`}>{t.isApproved ? 'Approved' : 'Pending'}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {!t.isApproved && <button onClick={() => approve(t._id, true)} className="text-green-400 text-xs border border-green-500/30 px-2 py-1 rounded-lg hover:bg-green-500/10">Approve</button>}
                      {t.isApproved && <button onClick={() => approve(t._id, false)} className="text-red-400 text-xs border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10">Suspend</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && teachers.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-white/30">No teachers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Teacher Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a2332] border border-white/10 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New Teacher</h2>
                <button onClick={() => { setIsAddOpen(false); reset(); }} className="text-white/50 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Full Name *</label>
                    <input {...register('name')} className="input-field w-full" placeholder="e.g. John Doe" />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Email *</label>
                    <input type="email" {...register('email')} className="input-field w-full" placeholder="e.g. john@example.com" />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Mobile *</label>
                    <input {...register('mobile')} className="input-field w-full" placeholder="10-digit number" />
                    {errors.mobile && <p className="text-red-400 text-xs mt-1">{errors.mobile.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Qualification *</label>
                    <input {...register('qualification')} className="input-field w-full" placeholder="e.g. M.Sc Mathematics" />
                    {errors.qualification && <p className="text-red-400 text-xs mt-1">{errors.qualification.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Subjects * (Comma separated)</label>
                    <input {...register('subjects')} className="input-field w-full" placeholder="Math, Physics" />
                    {errors.subjects && <p className="text-red-400 text-xs mt-1">{errors.subjects.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Experience (Years)</label>
                    <input type="number" {...register('experience')} className="input-field w-full" placeholder="e.g. 5" />
                    {errors.experience && <p className="text-red-400 text-xs mt-1">{errors.experience.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Temporary Password *</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type={showPw ? 'text' : 'password'} 
                        {...register('password')} 
                        className="input-field w-full pr-10" 
                        placeholder="Enter or generate" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPw(!showPw)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                    <button type="button" onClick={generatePassword} className="btn-secondary whitespace-nowrap text-sm px-3">
                      Generate
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-1">Short Bio (Optional)</label>
                  <textarea {...register('teacherBio')} className="input-field w-full" rows="3" placeholder="A brief description of the teacher..."></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                  <button type="button" onClick={() => { setIsAddOpen(false); reset(); }} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary">
                    {isSubmitting ? 'Creating...' : 'Create Teacher'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credentials Success Modal */}
      <AnimatePresence>
        {credentials && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0A1628] border border-[#F5A623]/30 rounded-2xl p-8 w-full max-w-sm shadow-[0_0_40px_rgba(245,166,35,0.1)] text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <FiUserCheck size={28} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Teacher Created!</h2>
              <p className="text-white/50 text-sm mb-6">Share these details privately with the teacher. They will not be shown again.</p>

              <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-left space-y-3 mb-6 relative group select-all">
                <div>
                  <div className="text-white/40 text-xs mb-1 uppercase tracking-wider font-semibold">Name</div>
                  <div className="text-white font-medium">{credentials.name}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs mb-1 uppercase tracking-wider font-semibold">Login Email</div>
                  <div className="text-gold font-mono">{credentials.email}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs mb-1 uppercase tracking-wider font-semibold">Temporary Password</div>
                  <div className="text-white font-mono bg-white/5 px-2 py-1 rounded inline-block">{credentials.password}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={copyCredentials} className="btn-primary flex items-center justify-center gap-2 w-full py-3">
                  <FiCopy size={18} /> Copy Credentials
                </button>
                <button onClick={() => setCredentials(null)} className="btn-secondary w-full py-3 border-transparent bg-white/5 hover:bg-white/10">
                  Close Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
