import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      toast.error('Use 8+ chars with uppercase, number and special char.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post(`/auth/password/reset/${token}`, { password });
      if (data.success) {
        toast.success('Password reset successful.');
        navigate('/login', { replace: true });
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
        <Link to="/login" style={styles.back}>Back to Login</Link>
        <h1 style={styles.title}>Reset Password</h1>
        <p style={styles.sub}>Enter your new password below.</p>

        <form onSubmit={onSubmit} style={styles.form}>
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
