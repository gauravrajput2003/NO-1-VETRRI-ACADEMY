import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../services/api';
import AdmissionFormModal from '../../components/AdmissionFormModal';

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function FirstLoginSetup() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const role = user?.role || 'student';

  const canSubmit = useMemo(() => {
    if (!currentPassword || !newPassword || !confirmPassword) return false;
    if (role === 'teacher' && !acceptTerms) return false;
    return true;
  }, [currentPassword, newPassword, confirmPassword, role, acceptTerms]);

  const goToRoleHome = () => {
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (role === 'teacher') {
      navigate('/teacher/dashboard', { replace: true });
      return;
    }
    if (!user?.admissionFormFilled) {
      setShowAdmissionModal(true);
      return;
    }
    navigate('/student/dashboard', { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      toast.error('Password must be 8+ chars with uppercase, number and special char.');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password should be different from temporary password.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await changePassword({ currentPassword, newPassword });
      if (data.success) {
        updateUser({ firstLogin: false });
        toast.success('Password updated successfully.');
        goToRoleHome();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={styles.card}
      >
        <Link to="/" style={styles.backLink}>Back to Home</Link>
        <h1 style={styles.title}>Set Your Password</h1>
        <p style={styles.subtitle}>First login security setup is required before continuing.</p>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>Current (Temporary) Password</label>
          <div style={styles.inputWrap}>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter temporary password"
              style={styles.input}
            />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} style={styles.eyeBtn}>
              {showCurrent ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <label style={styles.label}>New Password</label>
          <div style={styles.inputWrap}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
              style={styles.input}
            />
            <button type="button" onClick={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
              {showNew ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <label style={styles.label}>Confirm New Password</label>
          <div style={styles.inputWrap}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              style={styles.input}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
              {showConfirm ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {role === 'teacher' && (
            <label style={styles.termsRow}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>I accept Terms & Conditions</span>
            </label>
          )}

          <button type="submit" disabled={!canSubmit || submitting} style={styles.submitBtn}>
            {submitting ? 'Updating...' : 'Set Password'}
          </button>
        </form>
      </motion.div>

      {showAdmissionModal && (
        <AdmissionFormModal
          onClose={() => {
            setShowAdmissionModal(false);
            navigate('/student/dashboard', { replace: true });
          }}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(135deg, #fff0f5 0%, #ffffff 100%)',
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    border: '1px solid rgba(10,22,40,0.1)',
    boxShadow: '0 14px 40px rgba(10,22,40,0.14)',
    background: '#ffffff',
    padding: 24,
  },
  backLink: {
    color: '#0A1628',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 13,
  },
  title: {
    margin: '12px 0 6px',
    color: '#0A1628',
    fontSize: 28,
    fontWeight: 800,
  },
  subtitle: {
    margin: '0 0 18px',
    color: 'rgba(10,22,40,0.72)',
    fontSize: 14,
  },
  form: {
    display: 'grid',
    gap: 12,
  },
  label: {
    color: '#0A1628',
    fontSize: 13,
    fontWeight: 600,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    border: '1px solid rgba(10,22,40,0.25)',
    borderRadius: 10,
    padding: '12px 42px 12px 12px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#0A1628',
  },
  termsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#0A1628',
    fontSize: 13,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 8,
    width: '100%',
    background: '#FF1493',
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
