import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { data } = await api.post('/auth/password-reset/request', { identifier: email.trim() });
      if (data.success) {
        toast.success('Request submitted. Contact the academy admin for a temporary password.');
        navigate(`/reset-password?identifier=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/login/student" style={styles.back}>Back</Link>
        <h1 style={styles.title}>Forgot Password?</h1>
        <p style={styles.sub}>Enter your registered phone or email. The academy admin will help you obtain a temporary password.</p>

        <form onSubmit={onSubmit} style={styles.form}>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Registered phone or email"
            style={styles.input}
            required
          />
          <button type="submit" disabled={submitting} style={styles.btn}>
            {submitting ? 'Submitting...' : 'Request Temporary Password'}
          </button>
        </form>

        <div style={styles.contactBox}>
          <p style={styles.contactTitle}>Need help immediately?</p>
          <p style={styles.contactText}>WhatsApp: +91-9047758389</p>
          <p style={styles.contactText}>Email: contactus@no1vettriacademy.com</p>
        </div>
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
  contactBox: {
    marginTop: 16,
    borderTop: '1px solid rgba(10,22,40,0.1)',
    paddingTop: 12,
  },
  contactTitle: { margin: '0 0 6px', color: '#0A1628', fontWeight: 700, fontSize: 13 },
  contactText: { margin: '0 0 4px', color: 'rgba(10,22,40,0.72)', fontSize: 13 },
};
