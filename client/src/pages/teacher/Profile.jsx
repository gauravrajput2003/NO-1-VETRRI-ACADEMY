import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiCamera, FiSave, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import { getProfile, updateProfile, changePassword, updateAvatar } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge, PageHeader } from '../../design-system/components';
import './profile.css';

const profileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  bio: z.string().max(160, 'Max 160 chars').optional(),
  subjects: z.string().optional(),
  qualification: z.string().optional(),
  experienceYears: z.coerce.number().min(0).optional(),
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
  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 25 };
  if (score === 2) return { label: 'Medium', color: 'bg-yellow-500', width: 50 };
  if (score === 3) return { label: 'Good', color: 'bg-blue-500', width: 75 };
  return { label: 'Strong', color: 'bg-green-500', width: 100 };
}

export default function TeacherProfile() {
  const reducedMotion = useReducedMotion();
  const { user, updateUser, logout } = useAuth();
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [bioLen, setBioLen] = useState(0);
  const [newPw, setNewPw] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const { register: regPw, handleSubmit: handlePwSubmit, reset: resetPw, formState: { errors: pwErrors } } = useForm({
    resolver: zodResolver(pwSchema),
  });

  const bio = watch('bio', '');
  useEffect(() => setBioLen((bio || '').length), [bio]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await getProfile();
      if (data.success) {
        const p = data.profile;
        setProfilePic(p.profilePic || '');
        reset({
          name: p.name || '',
          bio: p.bio || '',
          subjects: Array.isArray(p.subjects) ? p.subjects.join(', ') : (p.subjects || ''),
          qualification: p.qualification || '',
          experienceYears: p.experienceYears || 0,
          mobile: p.mobile || '',
          email: p.email || '',
        });
      }
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5MB'); return; }
    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await updateAvatar(formData);
      if (data.success) {
        setProfilePic(data.profilePic);
        toast.success('Profile photo updated!');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async (vals) => {
    setSaving(true);
    try {
      const payload = {
        ...vals,
        subjects: vals.subjects ? vals.subjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      delete payload.name; delete payload.email; delete payload.mobile;
      const { data } = await updateProfile(payload);
      if (data.success) {
        toast.success('Profile saved!');
        updateUser(data.profile || {});
      }
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onPwSubmit = async (vals) => {
    setPwLoading(true);
    try {
      const { data } = await changePassword({ currentPassword: vals.currentPassword, newPassword: vals.newPassword });
      if (data.success) {
        toast.success('Password updated. Sign in again.'); await logout();
        resetPw();
        setNewPw('');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  };

  const avatarSrc = profilePic ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'T')}&backgroundColor=0A1628&textColor=F5A623`;

  const strength = getStrength(newPw);

  return (
    <div className="va-profile-page">
      <PageHeader title="My Profile" subtitle="Your teaching profile, account details and security in one place." />
      <div className="va-profile-layout">
      <aside className="va-profile-summary va-card">
        <div className="va-profile-identity">
          <img src={avatarSrc} alt="Your profile" className="va-profile-photo" />
          <div><Badge tone="teal">Teacher</Badge><h2>{user?.displayName || user?.name || 'Your profile'}</h2><p className="va-secondary">{watch('subjects') || 'Teaching profile'}</p></div>
        </div>
        <label className="va-profile-upload"><FiCamera size={18} /><span>{uploading ? 'Uploading photo…' : 'Change profile photo'}</span><input type="file" accept="image/*" aria-label="Change profile photo" disabled={uploading} onChange={handleAvatarChange} /></label>
        <p className="va-small va-secondary">Choose an image under 5 MB.</p>
        <nav className="va-profile-shortcuts" aria-label="Profile sections"><a href="#teaching-profile"><FiUser size={18} /> Profile details</a><a href="#profile-security"><FiLock size={18} /> Password & security</a></nav>
        <div className="va-profile-account-note"><FiLock size={18} /><p>Your name, email and mobile number are managed by the academy. Contact admin to update them.</p></div>
      </aside>
      <div className="va-profile-content">

      {/* Profile Card */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="va-card va-profile-details" id="teaching-profile"
      >
        <header className="va-profile-card-heading"><span className="va-icon-chip va-tone-teal"><FiUser size={20} /></span><div><h2>Profile details</h2><p className="va-secondary va-small">Help students get to know their teacher.</p></div></header>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="va-profile-fields">
            <div>
              <label className="input-label">Display Name *</label>
              <input {...register('name')} readOnly={user.role !== 'admin'} aria-description="Contact admin to change account identity" className="input-field" placeholder="Your name" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="input-label">Mobile</label>
              <input {...register('mobile')} readOnly={user.role !== 'admin'} aria-description="Contact admin to change account identity" className="input-field" placeholder="+91 XXXXXXXXXX" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input {...register('email')} readOnly={user.role !== 'admin'} aria-description="Contact admin to change account identity" type="email" className="input-field" placeholder="you@email.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="input-label">Qualification</label>
              <input {...register('qualification')} className="input-field" placeholder="e.g. B.Ed, M.Sc. Maths" />
            </div>
            <div>
              <label className="input-label">Experience (Years)</label>
              <input {...register('experienceYears')} type="number" min="0" className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="input-label">Subjects (comma-separated)</label>
              <input {...register('subjects')} className="input-field" placeholder="Maths, Physics, Chemistry" />
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
              placeholder="Tell students about yourself..."
              maxLength={160}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="va-profile-save va-button va-button--primary"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            ) : (
              <FiSave size={18} />
            )}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </motion.div>

      {/* Password Card */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="va-card va-profile-security" id="profile-security"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
            <FiLock className="text-gold" size={18} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Change Password</h3>
            <p className="text-white/40 text-xs">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handlePwSubmit(onPwSubmit)} className="space-y-4">
          <div className="va-profile-password-fields">
          <div>
            <label className="input-label">Current Password</label>
            <div className="relative">
              <input
                {...regPw('currentPassword')}
                type={showCurrent ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button type="button" aria-label={showCurrent ? 'Hide current password' : 'Show current password'} onClick={() => setShowCurrent(!showCurrent)} className="va-profile-eye absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {pwErrors.currentPassword && <p className="text-red-400 text-xs mt-1">{pwErrors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="input-label">New Password</label>
            <div className="relative">
              <input
                {...regPw('newPassword', { onChange: (e) => setNewPw(e.target.value) })}
                type={showNew ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Min 8 characters"
              />
              <button type="button" aria-label={showNew ? 'Hide new password' : 'Show new password'} onClick={() => setShowNew(!showNew)} className="va-profile-eye absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.width}%` }} />
                </div>
                <p className={`text-xs ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
              </div>
            )}
            {pwErrors.newPassword && <p className="text-red-400 text-xs mt-1">{pwErrors.newPassword.message}</p>}
          </div>

          <div>
            <label className="input-label">Confirm New Password</label>
            <div className="relative">
              <input
                {...regPw('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button type="button" aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirm(!showConfirm)} className="va-profile-eye absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {pwErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{pwErrors.confirmPassword.message}</p>}
          </div>
          </div>

          <button
            type="submit"
            disabled={pwLoading}
            className="va-button va-button--ghost va-profile-save"
          >
            {pwLoading ? (
              <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : (
              <FiLock size={16} />
            )}
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
      </div>
      </div>
    </div>
  );
}
