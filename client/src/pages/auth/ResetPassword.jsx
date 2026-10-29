import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('identifier') || '');
  const [tempPassword, setTempPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 6 || password === tempPassword.trim()) {
      toast.error('Use a different password of at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post('/auth/password-reset/complete', { identifier: identifier.trim(), tempPassword: tempPassword.trim(), newPassword: password, confirmPassword });
      if (data.success) {
        toast.success('Password reset successful.');
        navigate('/login/student', { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/login/student" style={styles.back}>Back to Login</Link>
        <h1 style={styles.title}>Reset Password</h1>
        <p style={styles.sub}>Enter the temporary password received from the academy admin, then choose a new password.</p>

        <form onSubmit={onSubmit} style={styles.form}>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Registered phone or email" style={styles.input} required />
          <input type="password" autoComplete="off" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Temporary password" style={styles.input} required />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            style={styles.input}
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            style={styles.input}
            required
          />
          <button type="submit" disabled={submitting} style={styles.btn}>
            {submitting ? 'Updating...' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fff0f5 0%, #ffffff 100%)',
    padding: 16,
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid rgba(10,22,40,0.1)',
    boxShadow: '0 14px 36px rgba(10,22,40,0.14)',
    padding: 24,
  },
  back: { color: '#0A1628', textDecoration: 'none', fontSize: 13, fontWeight: 600 },
  title: { margin: '10px 0 6px', color: '#0A1628', fontWeight: 800, fontSize: 28 },
  sub: { margin: '0 0 14px', color: 'rgba(10,22,40,0.7)', fontSize: 14 },
  form: { display: 'grid', gap: 10 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(10,22,40,0.25)',
    borderRadius: 10,
    padding: '12px',
    fontSize: 14,
  },
  btn: {
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    background: '#FF1493',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
