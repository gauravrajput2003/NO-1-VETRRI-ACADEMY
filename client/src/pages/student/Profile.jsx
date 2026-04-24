import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCamera, FiSave, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { getProfile, updateProfile, changePassword, updateAvatar } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const profileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  bio: z.string().max(160).optional(),
  mobile: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function getStrength(pw) {
  if (!pw) return { label: '', color: '', width: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', width: 25 };
  if (score === 2) return { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400', width: 50 };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-400', width: 75 };
  return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400', width: 100 };
}

export default function StudentProfile() {
  const { user, setUser } = useAuth();
  const [profilePic, setProfilePic] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [bioLen, setBioLen] = useState(0);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const { register: regPw, handleSubmit: handlePwSubmit, reset: resetPw, formState: { errors: pwErrors } } = useForm({
    resolver: zodResolver(pwSchema),
  });

  const bio = watch('bio', '');
  useEffect(() => setBioLen((bio || '').length), [bio]);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data } = await getProfile();
      if (data.success) {
        const p = data.profile;
        setProfilePic(p.profilePic || '');
        setProfileData(p);
        reset({
          name: p.displayName || p.name || '',
          bio: p.bio || '',
          mobile: p.mobile || '',
          email: p.email || '',
        });
      }
    } catch { toast.error('Failed to load profile'); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5MB'); return; }
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await updateAvatar(fd);
      if (data.success) { setProfilePic(data.profilePic); toast.success('Profile photo updated!'); }
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const onSave = async (vals) => {
    setSaving(true);
    try {
      const { data } = await updateProfile(vals);
      if (data.success) {
        toast.success('Profile saved!');
        if (setUser) setUser((u) => ({ ...u, name: vals.name }));
      }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const onPwSubmit = async (vals) => {
    setPwLoading(true);
    try {
      const { data } = await changePassword({ currentPassword: vals.currentPassword, newPassword: vals.newPassword });
      if (data.success) { toast.success('Password updated!'); resetPw(); setNewPw(''); }
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update password'); }
    finally { setPwLoading(false); }
  };

  const avatarSrc = profilePic ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'S')}&backgroundColor=0A1628&textColor=F5A623`;
  const strength = getStrength(newPw);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">My Profile</h1>
        <p className="text-white/40 text-sm mt-1">Manage your personal information and security settings</p>
      </div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gold/30 bg-navy">
              {uploading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
              ) : (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <FiCamera className="text-white" size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        {/* Read-only badges */}
        {profileData && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {profileData.grade && (
              <span className="badge badge-blue text-xs">📚 Grade: {profileData.grade}</span>
            )}
            {(profileData.course?.title || profileData.course) && (
              <span className="badge badge-gold text-xs">🎓 {profileData.course?.title || profileData.course}</span>
            )}
            {profileData.board && (
              <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">📋 {profileData.board}</span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Display Name *</label>
              <input {...register('name')} className="input-field" placeholder="Your name" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="input-label">Mobile</label>
              <input {...register('mobile')} className="input-field" placeholder="+91 XXXXXXXXXX" />
            </div>
            <div className="sm:col-span-2">
              <label className="input-label">Email</label>
              <input {...register('email')} type="email" className="input-field" placeholder="you@email.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <label className="input-label flex justify-between">
              <span>Bio</span>
              <span className={`text-xs ${bioLen > 140 ? 'text-yellow-400' : 'text-white/30'}`}>{bioLen}/160</span>
            </label>
            <textarea
              {...register('bio')}
              rows={3}
              className="input-field resize-none"
              placeholder="Tell us about yourself..."
              maxLength={160}
            />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-gold text-navy font-semibold py-3 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /> : <FiSave size={18} />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </motion.div>

      {/* Password Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-[#0F1F35] rounded-2xl border border-[#1E3A5F] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <FiLock className="text-gold" size={18} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Change Password</h3>
            <p className="text-white/40 text-xs">Keep your account secure</p>
          </div>
        </div>

        <form onSubmit={handlePwSubmit(onPwSubmit)} className="space-y-4">
          <div>
            <label className="input-label">Current Password</label>
            <div className="relative">
              <input {...regPw('currentPassword')} type={showCurrent ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {pwErrors.currentPassword && <p className="text-red-400 text-xs mt-1">{pwErrors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="input-label">New Password</label>
            <div className="relative">
              <input {...regPw('newPassword')} type={showNew ? 'text' : 'password'} className="input-field pr-10" placeholder="Min 8 characters"
                onChange={(e) => setNewPw(e.target.value)} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.width}%` }} />
                </div>
                <p className={`text-xs ${strength.textColor}`}>{strength.label}</p>
              </div>
            )}
            {pwErrors.newPassword && <p className="text-red-400 text-xs mt-1">{pwErrors.newPassword.message}</p>}
          </div>

          <div>
            <label className="input-label">Confirm New Password</label>
            <div className="relative">
              <input {...regPw('confirmPassword')} type={showConfirm ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {pwErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{pwErrors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={pwLoading}
            className="w-full border border-gold/50 text-gold font-semibold py-3 rounded-xl hover:bg-gold hover:text-navy transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {pwLoading ? <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /> : <FiLock size={16} />}
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
