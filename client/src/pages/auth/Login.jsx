import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getLoginErrorMessage } from '../../utils/loginErrors';
import AdmissionFormModal from '../../components/AdmissionFormModal';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [admission, setAdmission] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy || !identifier.trim() || !password) return;
    setBusy(true); setError('');
    try {
      // Mobile uses unified login: the server resolves the account's actual role.
      const data = await login(null, identifier.trim(), password);
      if (data.user.mustChangePassword) navigate('/change-password', { replace: true });
      else if (data.user.role === 'student' && data.user.firstLogin && !data.user.admissionFormFilled) setAdmission(true);
      else navigate(`/${data.user.role}/dashboard`, { replace: true });
    } catch (cause) { setError(getLoginErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  return <main className="academy-login">
    <div className="academy-login__blob academy-login__blob--gold" aria-hidden="true" />
    <div className="academy-login__blob academy-login__blob--pink" aria-hidden="true" />
    <div className="academy-login__content">
      <Link to="/" className="academy-login__back" aria-label="Back to website"><FiArrowLeft size={20} /></Link>
      <header className="academy-login__hero">
        <div className="academy-login__mark" aria-hidden="true">
          <svg width="70" height="70" viewBox="0 0 24 24"><defs><linearGradient id="login-cap" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FFC93C" /><stop offset="100%" stopColor="#FF3D8E" /></linearGradient></defs><path d="M2 8L12 3L22 8L12 13L2 8Z" fill="url(#login-cap)" /><circle cx="20.5" cy="14" r="1.4" fill="#FFC93C" /></svg>
        </div>
        <h1>Welcome Back</h1>
        <p>Sign in to continue your learning journey</p>
      </header>
      <form className="academy-login__card" onSubmit={submit} onChange={() => error && setError('')} aria-label="Academy sign in">
        <label className="academy-login__field">
          <FiUser size={18} aria-hidden="true" />
          <span className="sr-only">Mobile or Email</span>
          <input name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Mobile or Email" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
        </label>
        <label className="academy-login__field">
          <FiLock size={18} aria-hidden="true" />
          <span className="sr-only">Password</span>
          <input name="password" aria-label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button className="academy-login__eye" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <FiEyeOff size={19} /> : <FiEye size={19} />}</button>
        </label>
        <Link className="academy-login__forgot" to="/forgot-password">Forgot Password?</Link>
        {error && <div className="academy-login__error" role="alert"><strong>Unable to sign in</strong><p>{error}</p></div>}
        <button className="academy-login__submit" disabled={busy || !identifier.trim() || !password} type="submit">
          <span>{busy ? 'Signing in…' : 'Sign In'}</span><span className="academy-login__arrow"><FiArrowRight size={18} /></span>
        </button>
        <p className="academy-login__account">Use the same mobile/email and password as your app.</p>
      </form>
    </div>
    {admission && <AdmissionFormModal onClose={() => { setAdmission(false); navigate('/student/dashboard', { replace: true }); }} />}
  </main>;
}
