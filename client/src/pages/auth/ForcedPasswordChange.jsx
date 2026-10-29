import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { changePassword } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ForcedPasswordChange() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return null;
  if (!user) return <Navigate to="/login/student" replace />;
  if (!user.mustChangePassword) return <Navigate to={`/${user.role}/dashboard`} replace />;
  const submit = async (event) => {
    event.preventDefault();
    if (newPassword.length < 6 || newPassword === currentPassword || newPassword !== confirmPassword) return toast.error('Enter matching new passwords of at least 6 characters.');
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      await logout();
      navigate(`/login/${user.role}`, { replace: true });
      toast.success('Password changed. Sign in with the new password.');
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to change password'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4 text-white"><form onSubmit={submit} className="glass-card p-6 w-full max-w-md space-y-4">
    <h1 className="text-2xl font-bold">Set your new password</h1><p className="text-white/60">Your account requires a password change before you continue.</p>
    <input required type="password" autoComplete="current-password" className="input-field" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
    <input required type="password" autoComplete="new-password" className="input-field" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
    <input required type="password" autoComplete="new-password" className="input-field" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
    <button disabled={busy} className="btn-primary px-4 py-2">{busy ? 'Saving…' : 'Change password'}</button>
  </form></main>;
}
